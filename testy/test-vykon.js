<script>
/* Kolik stoji jeden snimek? Meri se kazda cast kresleni zvlast.
   rAF se vypne, funkce se volaji rucne - jinak by se merilo cekani na
   monitor, ne prace.  Vysledek jde POSTem na /vysledek (--dump-dom by
   stranku vypsal hned po nacteni, tedy driv, nez se vubec neco zmeri). */
window.__ch=[]; window.onerror=function(m,s,l){window.__ch.push(m+" @"+l);};
window.addEventListener("load", function(){
  var v=[];
  try{
    window.requestAnimationFrame=function(){return 0;};
    diff=1;
    document.getElementById('play').onclick();

    function zmer(jm, fn, kolik){
      var t0=performance.now();
      for(var i=0;i<kolik;i++) fn();
      var ms=(performance.now()-t0)/kolik;
      v.push(jm+"="+ms.toFixed(3));
      return ms;
    }

    var N=150;
    var celkem=0;
    celkem += zmer("hriste",  function(){ drawField(); }, N);
    celkem += zmer("panacci", function(){ players.forEach(drawPlush); if(referee)drawPlush(referee); }, N);
    celkem += zmer("micek",   function(){ drawBall(); drawEffects(); }, N);
    celkem += zmer("hud",     function(){ drawHud(); drawExtras(); drawMinimap(); }, N);
    celkem += zmer("krok",    function(){ step(); }, N);

    v.push("SNIMEK_CELKEM=" + celkem.toFixed(2) + "ms");
    v.push("fps=" + Math.round(1000/celkem));
    v.push("panacku=" + players.length);
    v.push("chyb=" + window.__ch.length + (window.__ch.length ? " PRVNI:"+window.__ch[0] : ""));
  }catch(e){ v.push("VYJIMKA: " + e.message); }
  var txt = v.join(" | ");
  document.title = "VYKON " + txt;
  try{ fetch("/vysledek", {method:"POST", body:"florbal " + txt}); }catch(e){}
});
</script>
