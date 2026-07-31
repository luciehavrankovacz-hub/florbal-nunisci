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

- **`TEAMS`** — 4 týmy (kočičky/pejsci/medvídci/zajíčci), každý má `furs[]` (barvy srsti), `jersey` (barva dresu) a `names[]`. Hráč si v menu vybírá `keyA`/`keyB`.
- **`P(...)`** — tovární funkce na jednu postavičku (hráč nebo rozhodčí). `makeTeams()` postaví sestavu 5+1 podle `FORM` (pozice v poli).
- **Svět je větší než plátno**: `FW×FH` (2500×1350) vs. viditelné okno `VW×VH` (1360×760). `cam` sleduje `me` (postavu pod kontrolou), `drawMinimap()` kreslí mapku vpravo nahoře.
- **`me`** = postava, kterou hráč ovládá. Nastavuje se v `pickMe()` (auto-přepnutí, jen když tvůj tým získá míček) a `switchPlayer()` (ruční přepnutí na klávesu **Z** / tlačítko VYSTŘÍDAT — vybere nejbližšího k míčku).
- **`step()`** — hlavní herní smyčka (60×/s): pohyb hráčů/AI (`aiTarget()`), fyzika míčku, kolize, brankářské zákroky, časovač, případně nájezdy.
- **`stealCheck()`** — kdokoliv z opačného týmu může náhodně vypíchnout míček držiteli (i tobě, i bot brankář, ale **brankář jen blízko vlastní branky** — kontrola `Math.abs(o.x-gx)>240`). Šance na krádež škáluje s `diff` (0/1/2 = lehký/střední/těžký bot).
- **`foul()`** — část krádeží (16 %) rozhodčí odpíská jako faul → nájezd (`mode='shootout'`) pro faulovaný tým.
- **Nájezdy**: `setupPen()`/`penNext()`/`penEnd()`. Když střílí soupeř, hráč přebírá kontrolu nad **svým brankářem** (viz `me=turn==='A'?players[1]:players[0]` v `setupPen`).
- **Brankáři jsou záměrně mnohem rychlejší a reaktivnější** než hráči v poli (`sp:9.5` vs. běžných `3.7–4.8`, zrychlení `acc=2.2` vs. `0.55`) a předvídají dráhu letícího míčku (`aiTarget()`, blok `if(!ball.owner&&ball.vx*dir>0.5)`). Bez toho byly góly prakticky nechytatelné — bylo to hlášeno jako problém a takhle je to teď vyladěné. Neredukovat bez otestování, jestli se pořád dá chytat.
- **Kreslení**: `drawPlush()` kreslí jednu postavičku (uši podle `type`: cica/pejsek/zajic/medvidek/panda-rozhodčí), `drawField()` hřiště a tribuny, `drawHud()` skóre/čas/ovládání, `drawExtras()` pauza/ukazatel síly střely/energie/šipka k míčku, `drawEffects()` konfety a ohon míčku.
- **Zvuky** jsou generované přes WebAudio (`beep()`/`SFX`), žádné zvukové soubory.
- **`localStorage.florbalRekord`** — nejlepší skóre v prohlížeči.

## Ovládání (pro hráče)

Šipky/WASD nebo myš = pohyb, mezerník (držet) = nabitá střela, V = vypíchnout, N = nahrát (chytřejší nahrávka — hledá volného spoluhráče vepředu, ne jen nejbližšího), B = stop, Shift = sprint (ubývá energie), Z = vystřídat hráče, P/Esc = pauza.

## Nápady na vylepšení (neřešeno)

- Víc týmů/postaviček podle dalších plyšáků.
- Vlastní editor sestavy (kdo hraje na jaké pozici).
- Uložení nejlepšího skóre per obtížnost, ne jen jedno globální číslo.
- Zvuk lze ztlumit — zatím není tlačítko mute.
