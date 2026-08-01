/* ============================================================
   SÍŤ – hraní přes internet na tři písmenka
   ============================================================

   Tohle je HOTOVÁ KRABIČKA na spojení dvou (až osmi) počítačů.
   Nic se neinstaluje, nepotřebuje to server ani knihovnu – stačí
   soubor přilinkovat:

       <script src="multiplayer/sit.js"></script>

   Je to stejný kód, jaký běží v Zemi Ňuňísků, jen vytažený zvlášť
   a okomentovaný. Tam přes něj hrajeme ve čtyřech na čtyřech
   počítačích, takže víme, že funguje.

   ------------------------------------------------------------
   JAK SE TO POUŽÍVÁ (celé!)

     SIT.jmeno = "flo";              // jmenovka hry, ať se kódy nepletou
     SIT.verze = "v1";               // ať se nespojí dvě různé verze hry

     // ten, kdo zakládá:
     const kod = await SIT.zaloz();  // vrátí třeba "K7A" – to řekneš kamarádovi
     // ten, kdo se přidává:
     await SIT.pripoj("K7A");

     // posílání
     SIT.posli({co:"gol", kdo:1});   // spolehlivě (nic se neztratí)
     SIT.rychle({x:12, y:40});       // rychle, ale smí se to ztratit

     // příjem – prostě si nastav vlastní funkci
     SIT.kdyzPrijde = (z, od) => { ... };
     SIT.kdyzSePripoji = (kdo) => { ... };
     SIT.kdyzSeOdpoji  = (kdo) => { ... };

   `od` / `kdo` je číslo hráče: hostitel je 0, kamarádi 1, 2, 3…

   ------------------------------------------------------------
   JEDNO DŮLEŽITÉ PRAVIDLO

   Svět počítá VŽDYCKY JEN HOSTITEL. Kamarád neposílá, kde jeho
   panáček je – posílá jen, KTERÉ KLÁVESY MÁ ZMÁČKNUTÉ. Hostitel to
   spočítá a pošle zpátky obrázek stavu.

   Kdyby si každý počítal svoje, po půl minutě mají každý jiný svět
   (jinak rychlý počítač = jinak zaokrouhlená čísla) a míč je pak
   u každého jinde. Tohle je ta jediná věc, na které multiplayer
   vždycky spadne, tak se jí radši vyhni rovnou.
   ============================================================ */

const SIT = {

  /* ---- co si můžeš nastavit ---- */
  jmeno: "hra",     // jmenovka: kód "K7A" v ohlašovně žije jako "hra-K7A"
  verze: "v1",      // kdo má jinou verzi, toho to nepustí (a řekne proč)
  maxHracu: 8,      // hostitel + 7 kamarádů

  /* ---- co si můžeš přečíst ---- */
  jsemHost: false,
  zapnuto: false,
  kod: null,
  mojeCislo: 0,     // hostitel 0, kamarádi 1..7

  /* ---- události: přepiš si je vlastní funkcí ---- */
  kdyzPrijde:    function(zprava, od){},
  kdyzSePripoji: function(kdo){},
  kdyzSeOdpoji:  function(kdo){},
  kdyzChyba:     function(text){},

  /* ================= vnitřnosti ================= */
  spoje: [],        // hostitel: seznam kamarádů
  moje: null,       // kamarád: moje jediné spojení k hostiteli
  _ws: null, _tep: null, _hlidac: null,

  LEDOVCE: {iceServers:[{urls:[
    "stun:stun.l.google.com:19302","stun:stun1.l.google.com:19302",
    "stun:stun2.l.google.com:19302","stun:stun3.l.google.com:19302"]}]},

  /* ------------------------------------------------------------
     ZALOŽ HRU – vrátí tříznakový kód
     ------------------------------------------------------------ */
  async zaloz(){
    this.zavri();
    this.jsemHost = true; this.zapnuto = true; this.mojeCislo = 0;
    for(let pokus = 0; pokus < 6; pokus++){
      const kod = this._novyKod();
      try{
        await this._ohlasovna(this.jmeno + "-" + kod, m => this._hostSlysi(m));
        this.kod = kod;
        this._spustTep();
        return kod;
      }catch(e){
        if(e.message === "OBSAZENO") continue;   // ten kód už někdo má
        throw e;
      }
    }
    throw new Error("Nepovedlo se zabrat žádný kód, zkus to za chvilku.");
  },

  /* ------------------------------------------------------------
     PŘIPOJ SE KE KAMARÁDOVI
     ------------------------------------------------------------ */
  pripoj(kod){
    kod = (kod || "").trim().toUpperCase();
    return new Promise(async (hotovo, chyba) => {
      try{
        this.zavri();
        this.jsemHost = false; this.zapnuto = true; this.kod = kod;
        const cil = this.jmeno + "-" + kod;
        const spojId = "dc" + Math.floor(Math.random()*1e9);

        const pc = new RTCPeerConnection(this.LEDOVCE);
        const spoj = {pc, kanal:null, kanalRychly:null, stav:"ceka", peer:cil, cislo:-1};
        this.moje = spoj;
        this._udelejKanaly(pc, spoj);
        pc.onicecandidate = ev => { if(ev.candidate) this._posliOhlasovne(cil,"CANDIDATE",{candidate:ev.candidate},spojId); };

        let odpovezeno = false, pripraven = false;
        const fronta = [];

        await this._ohlasovna("h" + Math.floor(Math.random()*1e9), m => {
          if(m.type === "ANSWER" && !odpovezeno){
            /* Hostitel může místo spojení poslat důvod, proč to nejde.
               Bez tohohle by kamarád jen koukal na „připojuji…“. */
            if(m.payload && m.payload.chyba === "PLNO"){
              chyba(new Error("U kamaráda je plno.")); return;
            }
            if(m.payload && m.payload.chyba === "VERZE"){
              chyba(new Error("Každý máte jinou verzi hry (ty " + this.verze +
                ", kamarád " + (m.payload.v || "?") + "). Dejte oba Ctrl+F5.")); return;
            }
            odpovezeno = true;
            if(typeof m.payload.cislo === "number") this.mojeCislo = m.payload.cislo;
            pc.setRemoteDescription(m.payload.sdp).then(() => {
              pripraven = true;
              for(const c of fronta) pc.addIceCandidate(c).catch(()=>{});
              fronta.length = 0;
            }).catch(()=>{});
          }
          if(m.type === "CANDIDATE" && m.payload && m.payload.candidate){
            /* Adresa umí dorazit dřív než odpověď. Zahodit ji = spojení se
               občas vůbec nenaváže, tak si ji schováme na potom. */
            if(pripraven) pc.addIceCandidate(m.payload.candidate).catch(()=>{});
            else fronta.push(m.payload.candidate);
          }
          if(m.type === "EXPIRE"){
            chyba(new Error("Hru s kódem " + kod + " jsem nenašel. Zkontroluj " +
                            "písmenka a ať kamarád nezavřel okno se zakládáním."));
          }
        });

        await pc.setLocalDescription(await pc.createOffer());
        this._posliOhlasovne(cil, "OFFER", {sdp: pc.localDescription, v: this.verze}, spojId);

        const zacatek = Date.now();
        const cekam = setInterval(() => {
          if(spoj.stav === "spojeno"){ clearInterval(cekam); this._spustTep(); hotovo(true); }
          else if(Date.now() - zacatek > 20000){
            clearInterval(cekam);
            chyba(new Error(odpovezeno
              ? "Spojení se nepodařilo navázat. Zkuste to znovu, a jestli jste na mobilních datech, tak radši na wi-fi."
              : "Hru s tímhle kódem jsem nenašel."));
          }
        }, 250);
      }catch(e){ chyba(e); }
    });
  },

  /* ------------------------------------------------------------
     POSÍLÁNÍ
     posli()  = spolehlivě, v pořadí (rozkazy, góly, start)
     rychle() = smí se ztratit (stav světa 20–30× za vteřinu)
     ------------------------------------------------------------ */
  /* Obojí vrací true/false = jestli to opravdu odešlo.
     Zprávu poslanou dřív, než se kanál otevře, nemá kdo vzít – prostě
     zmizí. Když si posíláš něco jen „při změně“, MUSÍŠ si to pohlídat:
        if(SIT.rychle(...)) posledni = ted;      // zapamatuj až po odeslání
     Jinak se ta jediná změna ztratí a kamarád se ti pak nehýbe. */
  posli(zprava){ return this._ven(zprava, false); },
  rychle(zprava){ return this._ven(zprava, true); },

  /* Poslat jen jednomu (hostitel → konkrétní kamarád) */
  posliKomu(cislo, zprava){
    const s = this.spoje.find(s => s.cislo === cislo);
    if(s) this._doKanalu(s, JSON.stringify(zprava), false);
  },

  pocetHracu(){
    return 1 + (this.jsemHost ? this.spoje.filter(s => s.stav === "spojeno").length : 0);
  },

  zavri(){
    if(this._tep){ clearInterval(this._tep); this._tep = null; }
    if(this._hlidac){ clearInterval(this._hlidac); this._hlidac = null; }
    for(const s of this.spoje){ try{ s.pc.close(); }catch(e){} }
    if(this.moje){ try{ this.moje.pc.close(); }catch(e){} }
    this.spoje = []; this.moje = null;
    this._zavriOhlasovnu();
    this.zapnuto = false; this.kod = null; this.jsemHost = false; this.mojeCislo = 0;
  },

  /* ============================================================
     Odsud dolů už to číst nemusíš – jsou to trubky.
     ============================================================ */

  _novyKod(){
    // bez I, O, 0, 1 – ať se to dá nadiktovat do telefonu
    const zn = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let s = ""; for(let i=0;i<3;i++) s += zn[Math.floor(Math.random()*zn.length)];
    return s;
  },

  _ven(zprava, rychle){
    const txt = JSON.stringify(zprava);
    let doslo = false;
    if(this.jsemHost){ for(const s of this.spoje) doslo = this._doKanalu(s, txt, rychle) || doslo; }
    else if(this.moje) doslo = this._doKanalu(this.moje, txt, rychle);
    return doslo;
  },

  _doKanalu(spoj, txt, rychle){
    const k = (rychle && spoj.kanalRychly && spoj.kanalRychly.readyState === "open")
            ? spoj.kanalRychly : spoj.kanal;
    if(k && k.readyState === "open"){
      try{ k.send(txt); return true; }catch(e){ return false; }
    }
    return false;
  },

  _udelejKanaly(pc, spoj){
    this._zapoj(spoj, pc.createDataChannel("rozkazy"));
    this._zapoj(spoj, pc.createDataChannel("stav", {ordered:false, maxRetransmits:0}));
  },

  _zapoj(spoj, kanal){
    if(kanal.label === "stav") spoj.kanalRychly = kanal; else spoj.kanal = kanal;
    kanal.onopen = () => {
      if(spoj.kanal && spoj.kanal.readyState === "open" && spoj.stav !== "spojeno"){
        spoj.stav = "spojeno";
        spoj.slyseno = Date.now();
        try{ this.kdyzSePripoji(spoj.cislo); }catch(e){}
      }
    };
    kanal.onclose = () => {
      if(kanal.label !== "stav" && spoj.stav !== "odpojeno"){
        spoj.stav = "odpojeno";
        try{ this.kdyzSeOdpoji(spoj.cislo); }catch(e){}
      }
    };
    kanal.onmessage = ev => {
      spoj.slyseno = Date.now();
      let z; try{ z = JSON.parse(ev.data); }catch(e){ return; }
      if(z && z.__tep) return;                   // „žiju“ – posloužilo tím, že dorazilo
      try{ this.kdyzPrijde(z, this.jsemHost ? spoj.cislo : 0); }catch(e){}
    };
  },

  /* ---- hostitel poslouchá ohlašovnu ---- */
  _hostSlysi(m){
    if(m.type === "OFFER"){
      const src = m.src;
      const spojId = (m.payload && m.payload.connectionId) || "dc";
      if(this.spoje.some(s => s.peer === src && s.stav !== "odpojeno")) return;
      if(this.spoje.filter(s => s.stav !== "odpojeno").length >= this.maxHracu - 1){
        this._posliOhlasovne(src, "ANSWER", {chyba:"PLNO"}, spojId); return;
      }
      if(m.payload && m.payload.v && m.payload.v !== this.verze){
        this._posliOhlasovne(src, "ANSWER", {chyba:"VERZE", v:this.verze}, spojId); return;
      }
      const pc = new RTCPeerConnection(this.LEDOVCE);
      const spoj = {pc, kanal:null, kanalRychly:null, stav:"ceka", peer:src, spojId,
                    cislo:this._volneCislo(), fronta:[], pripraven:false, slyseno:Date.now()};
      this.spoje.push(spoj);
      pc.ondatachannel = ev => this._zapoj(spoj, ev.channel);
      pc.onicecandidate = ev => { if(ev.candidate) this._posliOhlasovne(src,"CANDIDATE",{candidate:ev.candidate},spojId); };
      pc.onconnectionstatechange = () => {
        if(pc.connectionState === "failed" || pc.connectionState === "disconnected"){
          if(spoj.stav !== "odpojeno"){ spoj.stav = "odpojeno"; try{ this.kdyzSeOdpoji(spoj.cislo); }catch(e){} }
        }
      };
      (async () => {
        try{
          await pc.setRemoteDescription(m.payload.sdp);
          await pc.setLocalDescription(await pc.createAnswer());
          this._posliOhlasovne(src, "ANSWER", {sdp:pc.localDescription, cislo:spoj.cislo}, spojId);
          spoj.pripraven = true;
          for(const c of spoj.fronta) pc.addIceCandidate(c).catch(()=>{});
          spoj.fronta.length = 0;
        }catch(e){ spoj.stav = "odpojeno"; }
      })();
    }
    if(m.type === "CANDIDATE"){
      const spoj = this.spoje.find(s => s.peer === m.src);
      if(spoj && m.payload && m.payload.candidate){
        if(spoj.pripraven) spoj.pc.addIceCandidate(m.payload.candidate).catch(()=>{});
        else spoj.fronta.push(m.payload.candidate);
      }
    }
  },

  _volneCislo(){
    for(let c = 1; c < this.maxHracu; c++)
      if(!this.spoje.some(s => s.cislo === c && s.stav !== "odpojeno")) return c;
    return this.spoje.length + 1;
  },

  /* ---- tep: bez něj se výpadek pozná až za minuta a půl ----
     Datový kanál sám o sobě nemlčí nahlas: když někdo zavře notebook,
     spojení se nezavře, jen ztichne. Tak si každou vteřinu a půl
     řekneme „žiju“ a kdo mlčí deset vteřin, ten spadl. */
  _spustTep(){
    if(this._tep) clearInterval(this._tep);
    this._tep = setInterval(() => {
      if(!this.zapnuto) return;
      this._ven({__tep:1}, false);
    }, 1500);

    if(this._hlidac) clearInterval(this._hlidac);
    this._hlidac = setInterval(() => {
      if(!this.zapnuto) return;
      const ted = Date.now();
      const koukni = this.jsemHost ? this.spoje : (this.moje ? [this.moje] : []);
      for(const s of koukni){
        if(!s || s.stav !== "spojeno") continue;
        if(!s.slyseno){ s.slyseno = ted; continue; }
        if(ted - s.slyseno < 10000) continue;
        s.stav = "odpojeno";
        try{ this.kdyzSeOdpoji(s.cislo); }catch(e){}
      }
    }, 2000);
  },

  /* ---- ohlašovna: cizí server, který jen předá adresy ----
     Používáme veřejnou ohlašovnu PeerJS. Neteče přes ni hra, jen
     „tady jsem, kde jsi ty“. Potom si počítače povídají přímo. */
  _ohlasovna(id, naZpravu){
    this._zavriOhlasovnu();
    return new Promise((hotovo, chyba) => {
      let vyrizeno = false, ws;
      const token = "t" + Math.floor(Math.random()*1e9);
      try{
        ws = new WebSocket("wss://0.peerjs.com/peerjs?key=peerjs&id=" +
             encodeURIComponent(id) + "&token=" + token + "&version=1.5.4");
      }catch(e){ return chyba(new Error("Nejde se připojit k internetu.")); }
      this._ws = ws;
      const cas = setTimeout(() => {
        if(!vyrizeno){ vyrizeno = true; try{ws.close();}catch(e){} chyba(new Error("Ohlašovna neodpovídá.")); }
      }, 12000);
      ws.onmessage = ev => {
        let m; try{ m = JSON.parse(ev.data); }catch(e){ return; }
        if(m.type === "OPEN"){
          if(!vyrizeno){ vyrizeno = true; clearTimeout(cas);
            this._wsTep = setInterval(() => { try{ ws.send(JSON.stringify({type:"HEARTBEAT"})); }catch(e){} }, 5000);
            hotovo(true); }
          return;
        }
        if(m.type === "ID-TAKEN"){ if(!vyrizeno){ vyrizeno = true; clearTimeout(cas); chyba(new Error("OBSAZENO")); } return; }
        if(m.type === "ERROR"){ if(!vyrizeno){ vyrizeno = true; clearTimeout(cas);
          chyba(new Error((m.payload && m.payload.msg) || "Chyba ohlašovny")); } return; }
        naZpravu(m);
      };
      ws.onerror = () => { if(!vyrizeno){ vyrizeno = true; clearTimeout(cas); chyba(new Error("Ohlašovna je nedostupná.")); } };
    });
  },

  /* Ohlašovna přijímá jen zprávy přesně v tomhle tvaru. Když něco chybí,
     bez varování zavře spojení – a to se hledá špatně. */
  _posliOhlasovne(dst, typ, payload, spojId){
    if(!this._ws || this._ws.readyState !== 1) return;
    const p = Object.assign({
      type:"data", connectionId: spojId || "dc",
      label:"hra", reliable:false, serialization:"binary", browser:"chrome"
    }, payload);
    try{ this._ws.send(JSON.stringify({type:typ, dst, payload:p})); }catch(e){}
  },

  _zavriOhlasovnu(){
    if(this._wsTep){ clearInterval(this._wsTep); this._wsTep = null; }
    if(this._ws){ try{ this._ws.close(); }catch(e){} this._ws = null; }
  }
};

/* Aby to šlo použít i z modulu, kdyby to někdy bylo potřeba. */
if(typeof window !== "undefined") window.SIT = SIT;
