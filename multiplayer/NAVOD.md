# Jak do florbalu přidat hraní přes internet

Tahle složka je **připravená krabička**, ne hotová funkce ve hře. Nic
v `index.html` zatím neměníme — až budeš chtít, projdeš tenhle návod
a je to. Odhadem hodina práce, když to půjde hladce.

Co tu je:

| soubor | k čemu |
|---|---|
| `sit.js` | celé spojení dvou počítačů. Používat, ne číst. |
| `ukazka.html` | funkční mini-hra (dvě kolečka a míček) — otevři si ji dřív, než sáhneš na florbal |
| `zkouska.py` | zkouška, že spojení jede (spustí dva prohlížeče proti sobě) |

Je to stejný kód, jaký běží v Zemi Ňuňísků, takže víme, že to funguje.

---

## Než začneš: otevři si ukázku

Otevři `ukazka.html` na dvou počítačích (nebo ve dvou oknech), na jednom
dej **Založit hru**, na druhém opiš ta tři písmenka. Když se ti kolečka
hýbou na obou obrazovkách, spojení funguje a můžeš stavět florbal.
Když ne, nemá cenu pokračovat — nefunguje síť, ne tvůj kód.

---

## Jediné pravidlo, které nesmíš porušit

**Svět počítá jenom ten, kdo hru založil.** Kamarád neposílá, kde je jeho
hráč. Posílá jen, které klávesy drží.

Kdyby počítal každý svoje, po půl minuty hry má každý míček někde jinde —
i když je kód úplně stejný. Stačí, že jeden počítač počítá o chlup jinak
zaokrouhlená čísla, a rozdíl se nabaluje. Tohle je jediná věc, na které
multiplayer vždycky spadne.

Takže:

```
kamarád  ──  „držím šipku doleva a mezerník“  ──►  hostitel
hostitel ──  „hráči jsou tady, míček tady, skóre 2:1“ ──►  kamarád
```

---

## Krok 1 – přilinkuj modul

Do `index.html`, těsně před `<script>` s hrou:

```html
<script src="multiplayer/sit.js"></script>
```

A hned na začátku svého skriptu:

```js
SIT.jmeno = "flo";     // ať se kódy nepletou s ostatními hrami
SIT.verze = "f1";      // změň, když uděláš změnu, po které se staré verze nesmí spojit
```

## Krok 2 – dvě tlačítka do menu

```html
<button id="btnZaloz">Hrát s kamarádem (založit)</button>
<input id="poleKod" maxlength="3" placeholder="K7A">
<button id="btnPripoj">Připojit se</button>
```

```js
btnZaloz.onclick = async () => {
  const kod = await SIT.zaloz();
  alert("Řekni kamarádovi kód: " + kod);
  startMatch();                     // tvoje funkce, co rozjede zápas
};
btnPripoj.onclick = async () => {
  await SIT.pripoj(poleKod.value);
  startMatch();
};
```

Pozor: **oba musí mít stejný tým, stejnou obtížnost a stejné hřiště.**
Nejjednodušší je, že hostitel po spojení pošle svoje nastavení:

```js
SIT.kdyzSePripoji = () => SIT.posli({t:"nastaveni", keyA, keyB, diff});
```

a kamarád si ho převezme v `SIT.kdyzPrijde` dřív, než spustí zápas.

## Krok 3 – kamarád nesmí počítat

Ve funkci `loop()` je řádek:

```js
if(!paused)step();
```

Změň ho na:

```js
if(!paused && !(SIT.zapnuto && !SIT.jsemHost)) step();
```

Tím kamarádovi zůstane kreslení, konfety i kamera, ale svět mu bude
přicházet po síti.

## Krok 4 – kamarád posílá klávesy

Do `loop()` přidej:

```js
let poslKlavesy = "";
function posliKlavesy(){
  if(!SIT.zapnuto || SIT.jsemHost) return;
  const s = [keys['arrowleft']||keys['a'], keys['arrowright']||keys['d'],
             keys['arrowup']||keys['w'],   keys['arrowdown']||keys['s'],
             keys[' '], keys['v'], keys['n'], keys['b'], keys['shift']]
            .map(x => x?1:0).join("");
  if(s === poslKlavesy) return;
  if(SIT.rychle({t:"k", s})) poslKlavesy = s;    // ← zapamatovat AŽ po odeslání!
}
```

To `if(SIT.rychle(...))` tam **musí** být. Dokud se spojení otvírá, zpráva
se ztratí, a kdybys si ji odškrtl dopředu, kamarád by se ti pak vůbec
nehnul — protože „změna už přece byla poslaná“. Přesně na tohle jsme při
psaní ukázky naletěli.

## Krok 5 – hostitel klávesy použije

Hostitel si drží `ciziKlavesy` a ve `step()` je použije pro druhého
hráče. Nejjednodušší je dát kamarádovi jednoho konkrétního hráče z týmu B:

```js
let ciziKlavesy = "000000000";
let kamarad = null;        // nastav při startu: players.find(p=>p.team==='B' && !p.goalie)

SIT.kdyzPrijde = (z, od) => {
  if(z.t === "k") ciziKlavesy = z.s;
};
```

A ve `step()` tam, kde se řídí hráči týmu B botem, dej pro `kamarad`
výjimku a použij `ciziKlavesy` úplně stejně, jako se pro `me` používá
`keys`.

## Krok 6 – hostitel rozesílá obrázek stavu

Do `loop()` u hostitele, dvacetkrát za vteřinu (ne šedesátkrát, je to
zbytečné):

```js
let posilaniT = 0;
function rozesliStav(){
  if(!SIT.zapnuto || !SIT.jsemHost) return;
  if(++posilaniT % 3) return;                 // 60/3 = 20× za vteřinu
  SIT.rychle({t:"s",
    p: players.map(p => [Math.round(p.x), Math.round(p.y),
                         Math.round(p.dx*100), Math.round(p.dy*100)]),
    b: [Math.round(ball.x), Math.round(ball.y),
        ball.owner ? players.indexOf(ball.owner) : -1],
    sk: [scoreA, scoreB], t: Math.round(timeLeft)});
}
```

**`ball.owner` posílej jako pořadové číslo, ne jako celého hráče.**
Kdybys poslal objekt, přijde na druhé straně jako kopie, která se pak
nikdy nerovná žádnému hráči ze `players` — a `ball.owner===p` přestane
platit, takže se přestane kreslit, kdo má míček.

## Krok 7 – kamarád stav přijme, ale nedosadí ho natvrdo

```js
if(z.t === "s"){
  z.p.forEach((q,i) => { const p = players[i]; if(!p) return;
    p.cx = q[0]; p.cy = q[1]; p.dx = q[2]/100; p.dy = q[3]/100; });
  ball.cx = z.b[0]; ball.cy = z.b[1];
  ball.owner = z.b[2] >= 0 ? players[z.b[2]] : null;
  scoreA = z.sk[0]; scoreB = z.sk[1]; timeLeft = z.t;
}
```

a v `loop()` (u kamaráda, každý snímek):

```js
const k = 0.25;
players.forEach(p => { if(p.cx===undefined) return;
  p.x += (p.cx-p.x)*k; p.y += (p.cy-p.y)*k; p.anim += 0.2; });
if(ball.cx!==undefined){ ball.x += (ball.cx-ball.x)*k; ball.y += (ball.cy-ball.y)*k; }
```

Kdybys dosadil polohy natvrdo, hráči by dvacetkrát za vteřinu poskočili.
Takhle k nim plynule dojedou a vypadá to úplně stejně jako doma.

Ještě jedna věc: u kamaráda musí `me` ukazovat na **jeho** hráče, jinak
mu kamera pojede za soupeřem.

---

## Co nechat na potom

- **góly a zvuky**: ať je hlásí hostitel zvláštní zprávou (`{t:"gol", kdo}`),
  ne aby si je kamarád odvozoval ze změny skóre — jinak se občas přehraje
  dvakrát nebo vůbec
- **rozstřel**: hostitel prostě pošle `{t:"rozstrel", ...}` a kamarád
  jen překlopí obrazovku
- **víc než dva lidi**: `sit.js` to umí (až 8), jen si musíš u každého
  kamaráda pamatovat jeho `ciziKlavesy[od]` a přiřadit mu vlastního hráče

---

## Až to budeš zkoušet

Nejrychlejší způsob, jak se přesvědčit, že se svět nerozchází: hostitel
pošle „kde mám míček“ a kamarád si hned spočítá, jak daleko ho má on.
Do 30 px je všechno v pořádku (to je jen zpoždění internetu), stovky px
znamenají, že někde počítá i kamarád — vrať se ke kroku 3.
