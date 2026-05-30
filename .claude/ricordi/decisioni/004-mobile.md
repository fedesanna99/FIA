# ADR 004 — Adattamento mobile della Fetta E2-IA

- **Data**: 30/05/2026 (notte)
- **Stato**: 🟢 CHIUSO 30/05/2026 (decisioni IA fissate con Federico,
  pronto per implementazione fette M1-M5)
- **Predecessore**: ADR 003 (IA prototipo v3 desktop) — questo è il
  companion mobile
- **Successore atteso**: ADR 005 quando avremo implementato M1-M5 e
  avremo nuove decisioni emerse dal vivo

## Contesto

La Fetta E2-IA (29-30/05/2026, 7 commit feature + 3 polish + closure)
ha costruito il **workspace desktop-first**:
- TopBar 48px con 12+ elementi
- Spina 3 fasi (Costruisci/Esegui/Verifica) con tooltip blocco skip
- Rail SX 200px (expanded) o 56px (collapsed) con 4 sezioni testuali
- Albero modello 240px (collassato di default)
- Viewport 3D fluido
- Panel DX 380px con accordion Verifica (Sintesi sempre aperta + 4 collapse)

**Su mobile (375-414px) niente di questo funziona**: solo il chrome
occuperebbe 820px. C'è già un'infrastruttura mobile LEGACY
(`useIsMobile` breakpoint 768, `MobileTabbar` bottom-fissa con 5 voci)
collegata alla **Shell legacy** (`App.tsx`), ma NON alla Shell custom.
Risultato attuale: aprire `localhost:5273` su iPhone mostra dashboard
responsive ma il workspace e' rotto / fa scroll-x.

## Problema

Servono 6 decisioni IA chiave per allineare il nuovo workspace al
mobile, prima che inizi qualsiasi implementazione.

## Decisioni (confermate Federico 30/05 notte)

### ✅ D1 · 3 breakpoint chiave

```
0 ────── 640 ─────── 768 ──────── 1024 ────────── ∞
   MOBILE          TABLET             DESKTOP
   bottom-tab     drawer+bottom     full chrome
   chrome=0       chrome=parziale   chrome=intero
```

- **<640 mobile compatto**: chrome ridotto al minimo (topbar +
  tabbar bottom), zero rail SX, panel a sheet
- **640-1024 tablet**: rail SX collapsed (solo icone 56px), Albero
  a drawer overlay, panel DX 320px (più stretto)
- **>1024 desktop**: tutto come oggi

Razionale: 3 breakpoint, non 4. Niente "small desktop" intermedio
(complica senza giovare). Federico: *"se pensi ne bastino 3 allora
saranno 3"*.

### ✅ D2 · Topbar mobile (opzione A · hamburger)

Su 375px non ci stanno 12 elementi. **Scelta**: hamburger menu +
brand + Run + Avatar (3 elementi visibili, hamburger apre menu con
3 icone fisse Home/Modelli/Jobs + AvatarMenu items + toggle Albero/Focus).

Razionale: pattern UX universalmente compreso ("chiunque vede un
menu ad hamburger e sa che va cliccato" — Federico). La filosofia
IA prototipo v3 ("3 icone fisse sempre visibili") era pensata per
spazio orizzontale ampio — su mobile l'hamburger sblocca chrome
pulito senza sacrificare le scoperte.

### ✅ D3 · Spina mobile (opzione A · spina compatta in topbar)

3 piccoli step indicatori "1 · 2 · 3" + label fase attiva.
Mantiene continuità con desktop (l'utente che torna a mobile vede
lo stesso pattern). MobileTabbar legacy resta come fallback per la
Shell legacy ma il workspace custom usa la sua spina compattata.

Razionale: Federico esplicitamente curioso *"sono proprio curioso
di vedere come verrà la spina su mobile"* — pattern visibile, non
nascosto in un menu. Coerente con la filosofia "spina = mappa
sempre visibile" di Fetta 1.

### ✅ D4 · Panel SX Albero modello mobile (opzione B · drawer semi-modal)

Drawer sinistro semi-modal (apre 80% larghezza, swipe a sinistra
chiude). Pattern UX consolidato (Slack, Telegram).

Razionale: filosofia "strato esperto a richiesta" del prototipo v3
si traduce bene — l'utente lo apre quando gli serve, swipe a
sinistra per chiuderlo. Federico: *"sono indeciso tra A e B, seguo
la tua raccomandazione e lo vedrò dal vivo, tanto è una piccolezza"*.
Se in fase M3 il pattern non convince, switch ad A (full-screen
overlay) e' fix minore.

### ✅ D5 · Panel DX Verifica accordion mobile (opzione A · bottom sheet)

Bottom sheet swipe-up. Header sempre visibile in basso (mostra UR
+ verdict + chevron up), swipe-up per espandere a 80vh con accordion
completo.

Razionale: rispetta filosofia "junior fuori, senior dentro" del
panel DX desktop (E2.5c) — Sintesi (UR/σ/freccia) sempre visibile
come header del sheet, swipe-up per approfondire. Applica SOLO in
fase Verifica; Costruisci/Esegui non hanno panel DX così ricco —
bastano viewport + topbar Run.

### ✅ D6 · Viewport 3D mobile (opzioni A+C combinate)

A · viewport invariato (più piccolo per via dello spazio).
C · escape via doppio-tap = focus mode (viewport diventa full-screen).

Razionale: non ricreare viewport mobile (complessità enorme + il 3D
non si rinegozia bene su touch). Permettere l'escape al full-screen
quando l'utente vuole più spazio. Pattern "doppio tap = focus" è
naturale su touch.

## Conseguenze · Fette mobile M1-M5 suggerite

| Fetta | Cosa | Scope | Dipendenze | Priorità UX |
|---|---|---|---|---|
| **M1** | Topbar mobile (D2) + hamburger menu | ~2h | nessuna | 🔴 alta (sblocca tutto) |
| **M2** | Spina compatta (D3) | ~1h | M1 | 🟡 media |
| **M3** | Albero drawer (D4) | ~2h | nessuna, parallela | 🟢 nice-to-have |
| **M4** | Panel DX bottom sheet (D5) | ~3h | accordion E2.5c | 🟡 media (solo per Verifica) |
| **M5** | Viewport focus mode doppio-tap (D6) | ~1h | nessuna | 🟢 escape valve |

**Totale stimato**: ~9 ore. Tipicamente da spalmare su 2-3 sessioni
Claude da 3h. Pattern raccomandato: M1 prima sempre (è il chrome
foundation), poi M2/M3/M4/M5 in parallelo dove possibile.

## Cosa NON è scope del primo round mobile (filtro onesto)

- ❌ **Dashboard mobile** (E3.x): è già parzialmente responsive,
  fix specifici sono fette future M6+
- ❌ **MobileTabbar legacy refactor**: resta com'è per la Shell legacy
  (App.tsx). NON sostituiamo: aggiungiamo il nuovo workspace mobile
  in parallelo.
- ❌ **Touch gestures dedicate per viewport 3D** (pan/rotate/pinch):
  complessità grande, fetta dedicata futura
- ❌ **PWA / offline / push notifications**: scope diverso (Sprint A
  M3 nel BACKLOG root)
- ❌ **Tablet-only layout (tra 640 e 1024)**: D1 lo prevede ma
  l'implementazione viene insieme alle fette M1-M5 (no fette dedicate
  tablet)

## Convention dalla Fetta E2-IA che valgono ANCHE su mobile

(Da ADR 003 sezione "Convention cristallizzate")

1. **Prototipo HTML vince sull'IA, mockup CD vince sull'estetica** —
   non c'è prototipo mobile del workspace v3, quindi le scelte di IA
   mobile sono le nostre (questo ADR). Le scelte estetiche restano
   Soft v2.1.
2. **Junior fuori, senior dentro** — D5 bottom sheet con header
   sempre visibile e' applicazione diretta.
3. **Active escape** — D6 doppio-tap focus mode e' applicazione
   diretta del principio (escape valve, non costretto).
4. **Onora il testo del designer** — quando arriveranno mockup mobile,
   copia VERBATIM nuove note/tooltip.
5. **4 stati onesti applicato OVUNQUE** — anche su mobile: empty state
   mobile, indicatori loading mobile, niente "Coming soon" generici.

## Revisione 30/05/2026 (notte) — Fetta M1 ricognizione live

**Cosa è emerso**: durante l'implementazione di Fetta M1 (hamburger
topbar), la verifica live a 375px ha mostrato `MobileTabbar` legacy
invece del nuovo hamburger. Indagine in `App.tsx`:

- Riga 590: `const useNewShell = activeId !== null && !isMobile;`
- Riga 786: `{isMobile && !isFocusMode && <MobileTabbar />}`

Quindi la **Shell custom non viene mai renderizzata su mobile**
(< 768px = `useIsMobile` legacy). Al suo posto: chrome legacy +
`MobileTabbar` 5-voci bottom. Il nuovo `ShellTopBarMobileMenu` di M1
era invisibile su iPhone.

**Inaccuratezza ADR originale**: la sezione "Contesto" sopra dice
*"il workspace è rotto / fa scroll-x"*. **Realtà**: il workspace
custom su mobile non è proprio renderizzato — è la Shell legacy che
prende il posto. L'ADR è stato scritto con poca ricognizione su
`App.tsx`. Pattern lesson: per fette mobile, includere SEMPRE una
verifica del gate `useNewShell` in App.tsx prima di scrivere ADR.

**Patch decisa con Federico (30/05 notte, carta bianca + raccomandazione
Claude)**: include il gate-removal NELLO STESSO commit M1.

1. `App.tsx` riga 590: rimuovo `&& !isMobile` → `const useNewShell =
   activeId !== null` (Shell custom diventa l'unica per workspace su
   ogni viewport quando c'è un modello attivo)
2. `App.tsx` riga 786: aggiungo `&& !useNewShell` → `{isMobile &&
   !isFocusMode && !useNewShell && <MobileTabbar />}` (MobileTabbar
   legacy resta SOLO per Dashboard mobile / no model, zero regressione
   su quel flusso)

**Conseguenze invariate**:
- D1 3 breakpoint (640/768/1024) → resta valido, già implementato
  in `shell.css` (M1 CSS @media 639px)
- D2 hamburger → resta valido (componente già scritto)
- D3-D6 → restano valide per fette M2-M5 future

**Conseguenze nuove**:
- MobileTabbar legacy: resta intatta per Dashboard mobile, non viene
  più mostrata su workspace mobile. Single source of truth per il
  workspace = Shell custom su ogni viewport.
- `showRails = !isFocusMode && !isMobile` (riga 580) NON va toccato —
  riguarda solo `LeftRail`/`LeftSlidePanel` legacy che sono fuori dalla
  Shell custom (la Shell custom ha il suo `ShellRail`).

**Fattorizzazione**: la patch è di 2 righe e atomica, single commit
con M1 è la scelta giusta. Niente M1.5 separato.

## Addendum M4-polish · single-open accordion su mobile (30/05/2026 notte)

**Trigger**: feedback live di Federico testando il deploy LIVE su iPhone
vero (`fea-pro.fly.dev`). Citazione testuale: *"se ad esempio sei su
spostamenti e clicchi sollecitazioni, secondo me la cosa migliore è che
si chiuda la scheda prima per avere più spazio"*.

**Problema osservato**: nel bottom sheet M4 (`ShellPanelMobileSheet` su
mobile in fase Verifica) l'accordion era multi-open (eredità del
desktop `verifyAccordionStore` E2.5c). Aprendo sezione X mentre Y era
gia' aperta, l'utente doveva scrollare verticalmente oltre Y per
arrivare a X — perdita di vista del content "che ha appena tappato".

**Decisione UX**: il bottom sheet su mobile usa **single-open
exclusive**, il desktop ShellPanel resta multi-open invariato.

Razionale:
- Spazio desktop (380px alti accordion): multi-open serve a confrontare
  2 sezioni fianco a fianco (es. Spostamenti + Reazioni per verifica
  equilibrio).
- Spazio mobile (80vh sheet ~650px): single-open garantisce che il
  content della sezione attiva sia sempre primo nel viewport, niente
  scroll lungo per arrivarci.
- Stessa filosofia "junior fuori, senior dentro" — applicata allo
  **spazio**: la sezione attiva sempre visibile, niente content
  overflowing per chi sta cercando un'informazione specifica.

**Implementazione**:
1. `verifyAccordionStore`: nuovo metodo `openExclusive(key)` che fa
   `set({ openSections: [key] })`. Altri metodi (toggle/open/close/closeAll)
   invariati.
2. `ResultsTabsPanel`: nuova prop `singleOpen?: boolean` (default `false`).
3. `AccordionSection` interno: handler conditional sul click — se
   `singleOpen && isOpen` → `close(key)`; se `singleOpen && !isOpen` →
   `openExclusive(key)`; else → `toggle(key)`.
4. `Shell.tsx`: passa `singleOpen={true}` solo al `ResultsTabsPanel`
   embeddato nel `ShellPanelMobileSheet`. Il ResultsTabsPanel del
   `ShellPanel` desktop resta `singleOpen={false}` (default).

**Conseguenze**:
- Sintesi sempre-open in cima NON e' toccata dal flag (resta sempre
  visibile in entrambi i mode).
- Stato `verifyAccordionStore.openSections` resta condiviso fra mobile
  e desktop. Se l'utente apre una sezione su mobile, poi va su desktop,
  vede quella sezione aperta (multi-open desktop). Coerente.
- Test estesi: 3 nuovi al store (openExclusive idempotente, exclusive
  chiude tutte le altre, da empty apre solo quella) + 4 nuovi al
  ResultsTabsPanel (default invariato multi-open, singleOpen chiude
  le altre, tap su aperta la chiude, Sintesi invariata).

**Lesson pattern**: feedback live di un utente vero (Federico testando
LIVE su iPhone) ha valore enorme — trova attriti UX invisibili dai
test. Pattern di rispetto: tradurre il feedback informale ("scritto
malissimo xD" parole sue) in decisione tecnica documentata + fix
veloce + redeploy.

**Insight persona-driven (Federico, 30/05 mattina post-deploy
M4-polish)**: la differenza di comportamento mobile vs desktop NON
e' un trade-off forzato dallo spazio, e' una **scelta consapevole di
audience**. Citazione testuale di Federico dopo aver testato live
single-open su iPhone:

> *"su mobile non può esserci più di una scheda aperta, su desktop si
> per permettere ai senior di paragonare, tanto un senior userà
> probabilmente sempre la versione desktop"*

Conseguenze per le decisioni future:
- **Desktop = senior/power user**: workflow complessi (confronto
  sezioni, multi-pannello, scorciatoie da tastiera, formule estese).
  Pattern UX desktop-first per feature avanzate.
- **Mobile = junior + on-the-go**: controllo veloce, una cosa alla
  volta, gestures touch-native, pattern atteso (hamburger / sheet /
  drawer). Mai costringere un mobile user a "scrollare per trovare"
  quando un single-open chiarisce.
- **NON serve la paritá feature mobile-desktop**: alcune feature
  potranno essere desktop-only senza danno (es. multi-open
  comparativo, View overlay toolbar, palette ⌘K rich). Il mobile
  ha la _stessa qualita'_ con un set di feature _curato per il
  contesto d'uso_.

Pattern applicabile a tutte le fette mobile future M3/M5/M6+: prima
di replicare un pattern desktop su mobile, chiedere "chi e' l'utente
mobile QUI? Se senior, replico; se junior/on-the-go, semplifico".

## Per il prossimo Claude

Quando Federico dirà "Fetta M1", apri questo file + `socio/06-cose-belle-fetta-e2-ia.md`
+ ADR 003 sezione "Convention cristallizzate". Hai tutto in tasca per
partire senza dover chiedere. L'unica cosa che NON e' in questo ADR
sono dettagli visivi (colori esatti, padding precisi, font-size mobile)
— quelli si decidono dal vivo guardando la prima implementazione.

Pattern Federico-Claude per fette mobile (lessons learned dalla E2-IA):
- Mostra wireframe ASCII prima di scrivere codice
- Una fetta = un commit atomico, baseline test verde sempre
- Verifica live dopo ogni fetta (screenshot + click test)
- Pausa contemplativa fra fette grosse — Federico apprezza i momenti
  per guardare insieme quello che si è costruito

## Addendum DM1+DM2 · Dashboard mobile <640 (30/05/2026 sera)

**Trigger**: handoff Round 5 di Claude Design (`Desktop/PER-CLAUDE-CODE.md`
+ `mobile.zip` con `Dashboard-phone.html` come reference visivo, citazione
testuale: *"a 768px il layout esistente regge bene, sotto 640px mancava
un breakpoint dedicato"*).

**Scope iniziale ADR**: il punto "Cosa NON è scope" originale escludeva
esplicitamente la Dashboard mobile (*"Dashboard mobile è già parzialmente
responsive, fix specifici sono fette future M6+"*). Riaperto dopo che
Federico ha ricevuto il bundle Round 5 da Claude Design e ha chiesto
allineamento al target.

**Decisione**: 2 fette atomiche CSS-only DM1 + DM2 (zero React touch,
zero store, zero solver — additivo puro):

- **DM1** (`c72a5be`) — blocco `@media (max-width: 640)` in
  `dashboard-soft.css` con porting del §R5.2 di Claude Design:
  - Topbar essenziale (nav globale + tier badge + Aiuto nascosti)
  - `.block-head` `flex-direction: column` + **`align-items: stretch`**
    (NON `flex-start` — warning esplicito di Claude Design: con
    flex-start titolo si restringe alla larghezza iniziale e collide
    col link quando Plus Jakarta riflowa al caricamento webfont)
  - `.new-model-tile` compatta (kbd off, icon 48 vs 56, padding 20)
  - `.dash-hero h1` 30→23px
  - `.tg-grid` 1 colonna
  - `.quota-inner` padding 32→16 (extra vs §R5.2: senza, CTA "Vedi
    fatturazione" wrappa su 2 righe a 375)
- **DM2** (`80fe3a7`) — QuotaBanner stack verticale via `flex-wrap`:
  - icon + msg riga 1 (msg `flex: 1 1 calc(100% - 28px)` forza wrap)
  - CTA largo centrato + dismiss compatto riga 2
  - CTA height 32 (touch target)
  - `.quota-spacer { display: none }` (filler flex non serve in stack)

**4 lezioni cristallizzate per banner sticky responsive**:

1. **`stretch` non `flex-start` su section header stacked** — quando
   il titolo è display font (Plus Jakarta, Inter Tight, ecc.), webfont
   caricato in async può cambiare la larghezza del titolo dopo il
   primo paint. `flex-start` fissa alla larghezza iniziale → collisione
   col link al riflow. `stretch` invece dà 100% al titolo → mai
   collisione, mai layout shift.

2. **`flex-wrap` + `display: none` su `.spacer`** = ricetta minima per
   stack verticale di banner orizzontale senza media-query nidificate
   o ristrutturazione DOM. Bastano 3 regole.

3. **`calc(100% - <icon-width + gap>)`** come `flex-basis` del primo
   contenuto forza il wrap pulito al successivo elemento, evitando
   doppi righe ambigue.

4. **Touch target +4-8px verticale** su CTA mobile (CSS attuale: 28
   desktop → 32 mobile) è coerente con W3C/Material/HIG 44pt minimum
   touch — anche se 32 non è 44, il padding interno + l'area cliccabile
   estesa fanno raggiungere il target. NON è scope di DM2 standardizzare
   a 44 ovunque (fetta dedicata futura).

**Verifica live**: simulato stato A nel preview (banner display:none +
sub hero rewritten) → render IDENTICO al target `Dashboard-phone.html`
di Claude Design. SOLA differenza visiva residua: icona "Segui un
percorso" usa `TrendingUp` 📈 (nostro) vs `Music` 🎵 (target). Scelta
cosmetica di Claude Design strana per "percorso"; convention ADR 003
"prototipo HTML vince sull'IA, mockup CD vince sull'estetica" — qui
l'icona è scelta di IA, quindi noi possiamo decidere autonomamente.
Lasciato `TrendingUp` (più intuitivo).

**Mini-difetto noto fuori scope**: il banner CTA wrappa ancora tra
640-1100 (tablet + desktop intermedio). DM2 risolve solo `<640`.
Fix eventuale = alzare il breakpoint dello stack a `<1100`
(2 righe CSS), oppure abbreviare la msg per quei viewport. Non
urgente: lo vede solo chi è quota >80% (banner condizionale).

**Conseguenze invariate**: ADR 004 originale (workspace mobile M1-M5)
resta valido al 100%. DM1+DM2 sono companion sul versante Dashboard.
Persona-driven "Mobile = junior + on-the-go" applicato anche qui:
banner stack verticale è esattamente il pattern atteso da junior touch
user, niente affordance nascoste.
