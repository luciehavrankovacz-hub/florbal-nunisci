# Florbal Ňuňísků

Hra pro Lucii (florbal s plyšovými Ňuňísky). Ahoj tati, tady je kontext, ať se v tom rychle zorientuješ. 🙂

**Hraje se na:** https://luciehavrankovacz-hub.github.io/florbal-nunisci/
**Zdroják:** jeden soubor `index.html` (HTML + CSS + JS, canvas, žádné závislosti, žádný build krok).

## Jak nasadit změnu

Uprav `index.html` a pushni do `main` — GitHub Pages se aktualizuje samo (může trvat ~1 minutu, případně Ctrl+F5).

```
git clone https://github.com/luciehavrankovacz-hub/florbal-nunisci.git
# uprav index.html
git add index.html
git commit -m "popis změny"
git push
```

Lokálně stačí `index.html` otevřít v prohlížeči (`file://`), žádný server není potřeba.

## Jak to funguje (přehled kódu)

Vše je v `index.html`, žádné děleni na díly (na rozdíl od Země Ňuňísků). Zhruba odshora dolů:

- **`TEAMS`** — 8 týmů podle skutečných plyšáků (pandici/bobrici/cici/vlcci/clawsby/veverky/mysky/pejsci), každý má `furs[]` (barvy srsti), `jersey` (barva dresu), `captain` (jméno kapitána) a `names[]`. Hráč si v menu vybírá `keyA`/`keyB`.
- **`P(...)`** — tovární funkce na jednu postavičku (hráč nebo rozhodčí). `makeTeams()` postaví sestavu 5+1 podle `FORM` (pozice v poli), `assignNums()` rozdá čísla (kapitán = 7, viz `p.captain`), kapitán navíc naskočí doprostřed hřiště místo do formace vzadu.
- **Svět je větší než plátno**: `FW×FH` (2500×1350) vs. viditelné okno `VW×VH` (1360×760). `cam` sleduje `me` (postavu pod kontrolou), `drawMinimap()` kreslí mapku vpravo nahoře.
- **`me`** = postava, kterou hráč ovládá. Nastavuje se v `pickMe()` (auto-přepnutí, jen když tvůj tým získá míček) a `switchPlayer()` (ruční přepnutí na klávesu **Z** / tlačítko VYSTŘÍDAT — vybere nejbližšího k míčku).
- **`step()`** — hlavní herní smyčka (60×/s): pohyb hráčů/AI (`aiTarget()`), fyzika míčku, kolize, brankářské zákroky, časovač, případně nájezdy.
- **`stealCheck()`** — kdokoliv z opačného týmu může náhodně vypíchnout míček držiteli (i tobě, i bot brankář, ale **brankář jen blízko vlastní branky** — kontrola `Math.abs(o.x-gx)>240`). Šance na krádež škáluje s `diff` (0/1/2 = lehký/střední/těžký bot).
- **`foul()`** — část krádeží (16 %) rozhodčí odpíská jako faul → nájezd (`mode='shootout'`) pro faulovaný tým.
- **Nájezdy**: `setupPen()`/`penNext()`/`penEnd()`. Když střílí soupeř, hráč přebírá kontrolu nad **svým brankářem** (viz `me=turn==='A'?players[1]:players[0]` v `setupPen`).
- **Brankáři jsou záměrně mnohem rychlejší a reaktivnější** než hráči v poli (`sp:9.5` vs. běžných `3.7–4.8`, zrychlení `acc=2.2` vs. `0.55`) a předvídají dráhu letícího míčku (`aiTarget()`, blok `if(!ball.owner&&ball.vx*dir>0.5)`). Bez toho byly góly prakticky nechytatelné — bylo to hlášeno jako problém a takhle je to teď vyladěné. Neredukovat bez otestování, jestli se pořád dá chytat.
- **Kreslení**: `drawPlush()` kreslí jednu postavičku (uši podle `type`: cica/pejsek/zajic/medvidek/panda-rozhodčí), `drawField()` hřiště a tribuny, `drawHud()` skóre/čas/ovládání, `drawExtras()` pauza/ukazatel síly střely/energie/šipka k míčku, `drawEffects()` konfety a ohon míčku.
- **Zvuky** jsou generované přes WebAudio (`beep()`/`SFX`), žádné zvukové soubory, tlačítko/klávesa M ztlumí (`ticho`, `localStorage.florbalTicho`).
- **`localStorage`**: `florbalRekord` (nejlepší skóre), `florbalDres` (vybraný vzor dresu — normální/pruhovaný/duhový/zlatý), `florbalSerie` + `florbalZlata` (série výher po sobě, 3 odemknou zlatý třpytivý dres).
- **Kapitán (`assignNums`/`num===7`)**: žlutý odznak „C" a jméno „(C) Jméno" v `drawPlush()`, vysvětlivka v menu.
- **Trenéři (`coachA`/`coachB`, `drawCoach()`)** a **oslava po výhře (`celebrateTeam`)** — kosmetika, žádný vliv na hru.
- **`stumble`** — vtipné zavrávorání s hvězdičkami při tvrdé srážce dvou hráčů (viz `rozestup()`/kolizní smyčka v `step()`), na chvíli je hráč pomalejší.

## Ovládání (pro hráče)

Šipky/WASD nebo myš = pohyb, mezerník (držet) = nabitá střela, V = vypíchnout, N = nahrát (chytřejší nahrávka — hledá volného spoluhráče vepředu, ne jen nejbližšího), B = stop, Shift = sprint (ubývá energie), Z = vystřídat hráče, P/Esc = pauza (P/Esc a Z jsou v multiplayeru vypnuté, viz níž).

## Hraní přes internet — ZAPOJENO (2026-08-03)

Ve složce **`multiplayer/`** je `sit.js` (celé spojení, beze změny — pořád
stejný kód jako v Zemi Ňuňísků) + `ukazka.html`/`zkouska.py` na ověření, že
spojení jede samo o sobě. `index.html` teď na `sit.js` odkazuje a menu má
tlačítka **Založit hru** / **Připojit se**.

**Jak je to udělané** (přesně podle `NAVOD.md`, jen zapsané do skutečné hry):
- Kamarád vždycky ovládá **`players[7]`** — první hráč v poli týmu B (ne
  brankář) — přes klávesy, nikdy nepočítá svět sám (`jsemKlient` v
  `jedenKrok()` vynechá `step()`, jen dojíždí k přijatým pozicím).
- Hostitel **přijaté klávesy** (`ciziKlavesy`, bitový řetězec 9 znaků) používá
  přesně jako `keys` pro `me` — viz nová větev `p===kamarad` v pohybové
  smyčce `step()`. Hrany (stisk/pušení) spouští `poke(kamarad)`/`pass(kamarad)`/
  `stopIt(kamarad)`/`shoot(kamaradCharge,kamarad)` v `SIT.kdyzPrijde`.
- `shoot/pass/poke/stopIt` teď berou parametr `who` (default `me`) — ovládají
  buď lokálního hráče, nebo kamaráda, a na klientovi jsou samy o sobě no-op
  (`if(SIT.zapnuto&&!SIT.jsemHost)return;`), aby si klient nikdy nepočítal
  vlastní verzi pravdy.
- **`resetPositions()` po každém gólu staví `players` znova** (nové objekty) —
  proto tam musí být `if(SIT.zapnuto&&SIT.jsemHost)kamarad=players[7];`, jinak
  by hostitel po prvním gólu ovládal zahozenou neviditelnou postavičku.
- Hostitel 20×/s posílá `rozesliStav()` (pozice/dx/dy/číslo/stumble všech
  hráčů, míček, skóre, čas, rozhodčí, cheer/shake/celebrace) přes `SIT.rychle`;
  klient dojíždí k přijatým `cx/cy` (ne skok, viz `jedenKrok()`). `say()`
  navíc pošle hlášku (`t:'msg'`) a `goal()` pošle `t:'gol'` na konfety+zvuk.
- **Nefunguje/neřešeno zatím**: nájezdy v multiplayeru (tlačítko je schválně
  zablokované), myš/tažení a HUD tlačítka (STŘÍLET/VYPÍCHNOUT/…) pro
  kamaráda — ten musí ovládat klávesnicí. Víc než jeden kamarád (sit.js to
  umí, hra zatím ne — `od===1` je natvrdo).
- **Ověřeno** dvěma headless Chromy proti sobě (stejný trik jako
  `zkouska.py`) — hostitel i kamarád skončili se stejnou pozicí kamaráda
  i míčku (na pixel přesně po doježdění), a klávesy V/N/mezerník/B na
  kamarádovi proběhly bez pádu. Skutečné hraní na dvou počítačích přes
  internet (ne jen localhost) jsem needělala — to by chtělo vyzkoušet.

## Nápady na vylepšení (neřešeno)

- Nájezdy v multiplayeru.
- Myš/dotyk a HUD tlačítka pro kamarádova hráče (zatím jen klávesnice).
- Víc než jeden kamarád najednou (sit.js umí až 7).
- Vlastní editor sestavy (kdo hraje na jaké pozici).
- Uložení nejlepšího skóre per obtížnost, ne jen jedno globální číslo.
