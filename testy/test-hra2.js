<script>
/* Oprava tatova harnessu: smycka bezi do konce ZAPASU (over), ne jen dokud
   running=true - goal() i foul() totiz nastavuji running=false (pauza),
   takze puvodni smycka konci prvnim golem/faulem a mereni je uriznute. */
window.__ch=[]; window.onerror=function(m,s,l){window.__ch.push(m+" @"+l);};
window.addEventListener("load", function(){
  var Q=new URLSearchParams(location.search), v=[];
  try{
    var OBT=parseInt(Q.get("obt")||"1",10), N=parseInt(Q.get("zapasu")||"3",10);
    var S={golyA:0,golyB:0,fauly:0,najezdy:0,strely:0,zakroky:0,drzA:0,drzB:0,nikdo:0,kroku:0,stuck:0};
    var shotPuv=SFX.shot, savePuv=SFX.save;
    SFX.shot=function(p){S.strely++;return shotPuv(p);};
    SFX.save=function(){S.zakroky++;return savePuv();};
    var foulPuv=foul; foul=function(t){S.fauly++;return foulPuv(t);};
    var spPuv=startPens; startPens=function(x){S.najezdy++;return spPuv(x);};
    for(var m=0;m<N;m++){
      diff=OBT;
      document.getElementById('play').onclick();
      var kroku=0, maxKroku=180*60+15000;
      while(!over && kroku<maxKroku){
        if(me && running){
          var utoci=(mode==='match') || (mode==='shootout'&&pen&&pen.turn==='A'&&!me.goalie);
          if(utoci){
            var cilX,cilY;
            if(ball.owner===me){cilX=GL_R;cilY=CY+(me.y-CY)*0.3;}
            else{cilX=ball.x;cilY=ball.y;}
            var dx=cilX-me.x,dy=cilY-me.y,d=Math.hypot(dx,dy)||1;
            me.vx+=dx/d*0.7;me.vy+=dy/d*0.7;
            if(ball.owner===me&&Math.abs(GL_R-me.x)<430&&Math.random()<0.03)shoot(0.9);
          }
        }
        step(); kroku++;
        if(mode==='match'&&running){
          if(ball.owner)(ball.owner.team==='A'?S.drzA++:S.drzB++);else S.nikdo++;
        }
      }
      if(kroku>=maxKroku)S.stuck++;
      S.kroku+=kroku;
      S.golyA+=scoreA;S.golyB+=scoreB;
      running=false;over=false;mode='match';paused=false;
    }
    var minut=S.kroku/3600;
    v.push("obt "+OBT+", "+N+" zapasu, simulovano "+minut.toFixed(1)+" min"+(S.stuck?" POZOR zaseknuto "+S.stuck+"x":""));
    v.push("goly TY "+S.golyA+" : BOT "+S.golyB+" = "+((S.golyA+S.golyB)/(N*3)).toFixed(2)+" na minutu hry");
    v.push("strel "+S.strely+", zakroku "+S.zakroky+", uspesnost "+(S.strely?Math.round(100*(S.golyA+S.golyB)/S.strely):0)+" %");
    v.push("faulu "+S.fauly+", rozstrel po remize "+S.najezdy+"x");
    var c=S.drzA+S.drzB+S.nikdo||1;
    v.push("drzeni TY "+Math.round(100*S.drzA/c)+"% BOT "+Math.round(100*S.drzB/c)+"% volny "+Math.round(100*S.nikdo/c)+"%");
    document.title="FLORBAL2 chyb="+window.__ch.length+" | "+v.join(" | ")+(window.__ch.length?" | CHYBA: "+window.__ch[0]:"");
  }catch(e){document.title="VYJIMKA: "+e.message+" | "+v.join(" | ");}
});
</script>
