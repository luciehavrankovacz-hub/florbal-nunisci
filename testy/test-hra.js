<script>
/* Odsimuluje zapas bez hrace (jen boti) a spocita, co se v nem deje.
   ?obt=0|1|2  ?zapasu=N */
window.__ch=[]; window.onerror=function(m,s,l){window.__ch.push(m+" @"+l);};
window.addEventListener("load", function(){
  var Q=new URLSearchParams(location.search), v=[];
  try{
    var OBT=parseInt(Q.get("obt")||"1",10), N=parseInt(Q.get("zapasu")||"3",10);
    var souhrn={goly:0,krade:0,fauly:0,najezdy:0,zakroky:0,strely:0,drzeniA:0,drzeniB:0,nikdo:0};
    // napocitame udalosti obalenim funkci
    souhrn.strelyVse=0; souhrn.zakrokyVse=0; souhrn.mimo=0;
    var shotPuv=SFX.shot, savePuv=SFX.save;
    SFX.shot=function(p){ souhrn.strelyVse++; return shotPuv(p); };
    SFX.save=function(){ souhrn.zakrokyVse++; return savePuv(); };
    var foulPuv=foul, sayPuv=say;
    foul=function(t){ souhrn.fauly++; return foulPuv(t); };
    var startPensPuv=startPens;
    startPens=function(x){ souhrn.najezdy++; return startPensPuv(x); };

    for(var m=0;m<N;m++){
      diff=OBT;
      document.getElementById('play').onclick();   // spusti zapas
      // hrac nic nedela: presuneme "me" mimo a nehybeme s nim
      var kroku=0, maxKroku=180*60+600;
      while(running && kroku<maxKroku){
        var majitel=ball.owner;
        /* VIRTUALNI HRAC: chova se jako dite u pocitace - bezi za mickem,
           s mickem miri na branku a z dalky vystreli. */
        if(me && mode==='match'){
          var cilX, cilY;
          if(ball.owner===me){ cilX=GL_R; cilY=CY+(me.y-CY)*0.3; }
          else { cilX=ball.x; cilY=ball.y; }
          var dx=cilX-me.x, dy=cilY-me.y, d=Math.hypot(dx,dy)||1;
          me.vx+=dx/d*0.7; me.vy+=dy/d*0.7;
          if(ball.owner===me && Math.abs(GL_R-me.x)<430 && Math.random()<0.03) shoot(0.9);
        }
        step(); kroku++;
        if(ball.owner && ball.owner!==majitel && majitel) souhrn.krade++;
        if(ball.owner) (ball.owner.team==='A'?souhrn.drzeniA++:souhrn.drzeniB++); else souhrn.nikdo++;
      }
      souhrn.goly+=scoreA+scoreB;
      souhrn.strely+=stats.shots; souhrn.zakroky+=stats.saves;
      running=false; over=false; mode='match';
    }
    var minut=N*3;
    v.push("obtiznost "+OBT+", "+N+" zapasu po 3 minutach");
    v.push("golu celkem "+souhrn.goly+" ("+(souhrn.goly/minut).toFixed(1)+" za minutu)");
    v.push("strel "+souhrn.strelyVse+", zakroku brankaru "+souhrn.zakrokyVse
           +", uspesnost strely "+(souhrn.strelyVse?Math.round(100*souhrn.goly/souhrn.strelyVse):0)+" %");
    v.push("zmen drzeni "+souhrn.krade+" ("+(souhrn.krade/minut).toFixed(1)+" za minutu)");
    v.push("faulu "+souhrn.fauly+" ("+(souhrn.fauly/minut).toFixed(1)+" za minutu) -> najezdu "+souhrn.najezdy);
    var celk=souhrn.drzeniA+souhrn.drzeniB+souhrn.nikdo;
    v.push("drzeni: tvuj tym "+Math.round(100*souhrn.drzeniA/celk)+" %, soupel "
           +Math.round(100*souhrn.drzeniB/celk)+" %, volny micek "+Math.round(100*souhrn.nikdo/celk)+" %");
    document.title="FLORBAL chyb="+window.__ch.length+" | "+v.join(" | ")
      +(window.__ch.length?" | CHYBA: "+window.__ch[0]:"");
  }catch(e){ document.title="VYJIMKA: "+e.message+" | "+v.join(" | "); }
});
</script>
