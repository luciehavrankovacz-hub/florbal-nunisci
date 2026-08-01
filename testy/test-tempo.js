<script>
/* Bezi hra stejne rychle na kazdem monitoru?
   Driv se delal jeden krok hry na jeden snimek monitoru, takze na 144 Hz
   notebooku bezel zapas 2,4x rychleji nez na 60 Hz. Tenhle test krmi
   smycku vlastnim casem (rAF je vypnuty) a pocita, kolik kroku hry z toho
   vyleze. Spravne je vzdycky ~60 kroku na vterinu, at monitor kresli
   kolikrat chce. */
window.__ch=[]; window.onerror=function(m,s,l){window.__ch.push(m+" @"+l);};
window.addEventListener("load", function(){
  var v=[];
  try{
    window.requestAnimationFrame=function(){return 0;};
    diff=1;
    document.getElementById('play').onclick();

    var kroku=0;
    var stepPuv=step; step=function(){kroku++;return stepPuv();};

    function zkus(jmeno, hz, vterin){
      kroku=0;
      // smycka si pamatuje cas z minula, tak ji dame cistou tabuli
      casPosledne=0; zbytekCasu=0;
      var dt=1000/hz, n=Math.round(hz*vterin), t=1e6;
      for(var i=0;i<n;i++){ t+=dt; loop(t); }
      var naVterinu=kroku/vterin;
      v.push(jmeno+"="+naVterinu.toFixed(1));
      return naVterinu;
    }

    var a=zkus("monitor_60Hz", 60, 4);
    var b=zkus("monitor_144Hz", 144, 4);
    var c=zkus("monitor_30Hz", 30, 4);
    var d=zkus("slaby_stroj_20Hz", 20, 4);

    var nej=Math.max(a,b,c,d), nejm=Math.min(a,b,c,d);
    v.push("rozptyl=" + Math.round(100*(nej-nejm)/60) + "%");
    v.push("STEJNE_TEMPO=" + ((nej-nejm) < 3 ? "ANO" : "NE"));
    v.push("chyb=" + window.__ch.length + (window.__ch.length ? " PRVNI:"+window.__ch[0] : ""));
  }catch(e){ v.push("VYJIMKA: " + e.message); }
  var txt=v.join(" | ");
  document.title="TEMPO "+txt;
  try{ fetch("/vysledek", {method:"POST", body:"florbal-tempo "+txt}); }catch(e){}
});
</script>
