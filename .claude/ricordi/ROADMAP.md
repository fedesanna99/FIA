# ROADMAP — fette del redesign workspace

> Vista operativa per Claude. Versioning storico granulare (v1.x → v3.x)
> sta in `/ROADMAP.md` root del repo. Qui solo le **fette del branch
> `redesign/workspace-fasi`** + cosa viene dopo.
>
> Niente SHA: si trovano con `git log --oneline redesign/workspace-fasi`.

## ✅ Chiuse

### Pre-redesign
- **v3.3.1-nafems-honest** (28/05/2026) — capitolo NAFEMS LE1/LE10
  chiuso con tolleranze ufficiali + criterio topologico. 28 PASS + 4
  xfailed onesti (registrano locking 16×16). Vedi ADR 001.

### Branch `redesign/workspace-fasi`

| Fetta | Cosa | Output |
|---|---|---|
| **Fetta 0** | Focus mode dentro Shell custom (Soft v2.1). Su desktop con modello attivo il focus mode non cade più sul chrome legacy. | Shell con `data-shell-focus`, viewport pieno, X di uscita |
| **Fetta 1** | Spina 3 fasi `Costruisci / Esegui / Risultati` additiva sopra il guscio, con stato `done/stale` + affordance click. | `ShellPhaseStepper.tsx`, store `currentPhase` |
| **Fetta 2a** | Fase Risultati — guscio 3 schede (Sintesi / Dati / Verifiche) + striscia verdetto. | `Results{TabsPanel,VerdictStrip}.tsx` |
| **Fetta 2b** | 4 famiglie del workspace Risultati: strip onesta + rilevatore sospetto (warn ambra), Sintesi metriche aggregate, Dati sollecitazioni + reazioni, Verifiche EC3 in chiaro + n/a. | `ResultsSintesi/DatiSollecitazioni/DatiReazioni/Verifiche.tsx` + helper `resultsHonest.ts` |
| **Fetta 2c** | Toast "Analisi completata → Risultati" non invasivo + intent store HMR-safe (rimpiazza window listener fantasma). | `lib/analysisCompleteToast.ts`, `store/shellIntentStore.ts` |
| **Fetta 2d** | FIX A export CSV feedback (era silent click), FIX B equilibrio neutro su distribuiti (era falsa-rossa Δ ✗). | Patch a Verifiche + Dati Reazioni |
| **Fetta 2-tests** | 6 Playwright E2E protezione regressioni 2b/2c/2d: CTA cambia phase (anti-HMR), silent update, TTL autodismiss, badge Validato vs Stima, Δ equilibrio neutro, export CSV toast. | `e2e/results-workspace.spec.ts` + webServer config |
| **Fetta E0-fix** (3 commit) | Foundation alignment Soft v2.1: pulizia `tokens.ts` stale Precision v2.0 + dedupe fonts + JBM 700; default radius Soft md + rimozione ghost block + doc `--c-*` alpha binary; Button.tsx migrato a Soft v2.1. | Adozione Foundation: ~55% → ~95% |
| **Fetta E2-IA · Commit E2.1** | Topbar IA prototipo v3 ADDITIVA: 3 icone fisse Home/Modelli/Jobs accanto al brand + 2 toggle Albero/Focus prima della ⌘K palette + AvatarMenu esteso con gruppo Cronologia/Template/Docs. | `ShellTopBar.tsx`, `AvatarMenu.tsx`, `GlobalRoutingListeners.tsx`, `App.tsx`, `shell.css`. Vitest 991/991, Playwright 6/6 |
| **Fetta D0** | Bootstrap `.claude/ricordi/` cross-progetto: 6 file (README/CONTEXT/CULTURE/ROADMAP/BACKLOG) + 3 ADR (NAFEMS-honest, Soft v2.1, IA prototipo v3) + 3 handoff Claude Code↔Claude Design. | `.claude/ricordi/**` (738+ righe markdown) |
| **Deploy live v3.4** (29/05) | Push branch redesign + fast-forward test/main + `fly deploy --remote-only`. Sito live su <https://fea-pro.fly.dev/> con 4 stati onesti + Soft v2.1 + IA prototipo v3 topbar | Image `01KSS92H2TKTEJGY17BN38CR9Z`, HTTP 200, bundle `index-DyMXagIm.js` |
| **Fetta E3 — Dashboard redesign React** (8 commit, Step E) | Implementazione fetta-per-fetta del mockup Claude Design Round 2 (Handoff 05). DashTopBar replica E2.1, Hero sobrio 3 stati, NewModelTile 1+2, RecentsCarousel + Riprendi, TemplateGallery 9 template, EmptyOnboarding stato C, QuotaBanner sticky condizionale, Settings/Billing page completa. | `frontend/src/dashboard/*` (5 nuovi componenti), `frontend/src/settings/SettingsBillingPage.tsx`, `frontend/src/styles/dashboard-soft.css` + `settings-billing.css`. Vitest 991/991, Playwright 6/6 |
| **Fetta E2-IA · Commit E2.2** | Panel DX della Shell custom in 2 stati (`open` / `closed`). Default `open` → zero regression. Quando `closed` la `ShellRightReopenTab` (32px sticky right) sostituisce ShellPanel nella terza colonna grid e permette di riaprirlo. Bottone X aggiunto nell'header `sp-head-row` accanto al `?` help per chiudere. Nuovo `rightPanelStore` Zustand persisted. Focus mode + takeover restano prioritari. | `frontend/src/store/rightPanelStore.ts(+test)`, `frontend/src/shell/ShellRightReopenTab.tsx(+test)`, edit `Shell.tsx`/`ShellPanel.tsx`/`shell.css` + estensione test esistenti. Vitest 1012/1012 (+21), TypeScript silenzioso |
| **Fetta E2-IA · Commit E2.4** | Panel SX "Albero modello" con gerarchia del modello caricato. Default `closed` → grid `.shell-mid` resta 3-col (zero regression). Quando `open` il `ShellLeftTreePanel` (240px) viene inserito tra Rail e Viewport come 2a colonna; mostra 5 sezioni (Nodi/Elementi/Materiali/Vincoli/Carichi) con count tabular-nums letti read-only da `modelStore`. Empty state quando `model === null`. Cablato al toggle Albero della topbar (E2.1 placeholder → ora store reale). Nuovo `leftTreeStore` Zustand persisted. Focus mode + takeover restano prioritari (`isLeftTreeVisible` boolean condivide la stessa logica tra rendering JSX e data-attribute CSS). | `frontend/src/store/leftTreeStore.ts(+test)`, `frontend/src/shell/ShellLeftTreePanel.tsx(+test)`, edit `Shell.tsx`/`ShellTopBar.tsx`/`shell.css` + estensione `Shell.test.tsx`/`ShellTopBar.test.tsx`. Vitest 1033/1033 (+21), TypeScript silenzioso |
| **Polish post-mockup · Spina blocco skip + Albero allineato prototipo v3** | Recuperati 29/05 sera i 3 mockup HTML originali del prototipo workspace v3 dai Downloads di Federico (salvati in `socio/05-prototipi-workspace-v3/`). Confronto col React ha rivelato 2 deviazioni: **(1)** la spina era "mai disabilitata" (regola Fetta 1 originale) ma Federico ha cambiato idea — non deve essere possibile saltare Esegui per andare diretto ai Risultati. Aggiunto `canEnter` per ogni passo con tooltip esplicativo + active escape. **(2)** L'Albero E2.4 aveva 5 sezioni in ordine inventato — il prototipo v3 ne ha 6: Nodi → Elementi → Sezioni·materiali (combinati!) → Carichi → Vincoli → Combinazioni. Combinazioni renderizza "—" (4 stati onesti, non implementato nel modello dominio). Aggiunta tree-note in basso col testo del prototipo. | `frontend/src/shell/ShellPhaseStepper.tsx(+test)`, `frontend/src/shell/ShellLeftTreePanel.tsx(+test)`, `frontend/src/styles/shell.css`. Vitest 1046/1046 (+13), TypeScript silenzioso. Commit `5776f05` |
| **Fetta E2.5a + E2.5b · Rail cleanup 6→3 + rinomina Verifica** | Preparazione per la migrazione architettonica "6 workspace → 3 fasi" (ADR 003 revisione 29/05 sera). **E2.5a**: rimossi `verifiche`, `io`, `view` dal `ShellRail` (sia collapsed 6→3 che expanded via `railConfig.ts` 12→10). Voci ancora raggiungibili via ⌘K palette finche' non confluiscono nei nuovi posti (E2.5c per Verifiche, fetta successiva per View toolbar e I/O AvatarMenu). **E2.5b**: rinomina user-facing "Risultati" → "Verifica" in tutti i punti della Shell custom (spina, panel DX header, rail item, ShellRightReopenTab, ResultsTabsPanel). **Workspace id `risultati` resta invariato** per non rompere store/sessionStorage/route legacy. | 14 file modificati: `frontend/src/lib/railConfig.ts`, `frontend/src/shell/ShellRail.tsx`/`.test.tsx`, `frontend/src/shell/ShellPanel.tsx`/`.test.tsx`, `frontend/src/shell/ShellPhaseStepper.tsx`/`.test.tsx`, `frontend/src/shell/ShellRightReopenTab.tsx`/`.test.tsx`, `frontend/src/shell/results/ResultsTabsPanel.tsx`/`.test.tsx`, `frontend/src/components/shell/LeftRail.test.tsx`, `frontend/src/components/shell/shared/RailSections.test.tsx`, `frontend/src/lib/railDispatch.test.ts`. Vitest 1045/1045 (-1 test rimosso "checks workspace switch"), TypeScript silenzioso. Commit `e61facd` |
| **Fetta E2.5c · Panel DX Verifica accordion verticale** | REFACTOR del panel DX del workspace `risultati` da 3-tabs orizzontali + sub-tabs a accordion verticale con **Sintesi sempre aperta** in cima + **4 sezioni collassabili** (Spostamenti / Sollecitazioni / Reazioni / Verifica EC3). Filosofia "junior fuori, senior dentro" (Tensione 1 Opzione A): dati fondamentali (UR / σmax / freccia / verdict / trust) sempre visibili in cima per studente / ing. junior, approfondimenti per chi vuole. Multi-open: l'utente puo' aprire piu' sezioni contemporaneamente. Niente perdita di content (i 5 componenti embedded invariati). Nuovo store `verifyAccordionStore` Zustand persisted. Workspace `verifiche` takeover invariato (raggiungibile via ⌘K palette per power-user). | 6 file: nuovo `frontend/src/store/verifyAccordionStore.ts(+test)`, refactor `frontend/src/shell/results/ResultsTabsPanel.tsx(+test)`, nuove regole CSS `frontend/src/styles/shell.css` (`.results-section*`), aggiornati selettori `frontend/e2e/results-workspace.spec.ts` (Playwright). Vitest 1058/1058 (+13), TypeScript silenzioso. Commit `87800b5` |
| **Fetta E2.5d · 4 route placeholder + cablaggio handler topbar** | Chiude i TODO E2.5 inline lasciati in E2.1: le 4 route mancanti (`/modelli`, `/jobs`, `/cronologia`, `/docs`) diventano pagine placeholder onesti (4 stati onesti: "In arrivo + razionale + dove la feature vive oggi"). Pattern: DashTopBar in alto (E3.1) + empty state centrato (icona Lucide cyan + titolo + descrizione + CTA). Cablati i 3 icone topbar E2.1 (handleModelli/handleJobs via useNavigate) e le 2 voci AvatarMenu E2.1 (Cronologia/Docs via goTo). Rimossi i tooltip "(in arrivo)" — ora le route esistono. | 5 file: nuovo `frontend/src/pages/PlaceholderPages.tsx`, edit `main.tsx` (+4 route), `shell/ShellTopBar.tsx` (cabla 2 handler), `components/shell/topbar/AvatarMenu.tsx` (cabla 2 voci), `styles/dashboard-soft.css` (regole `.placeholder-*`). Vitest 1058/1058 invariato, TypeScript silenzioso. Commit `c4d2f2f` |
| **Fetta M1 · Mobile topbar hamburger + Shell custom abilitata su mobile** (30/05/2026) | Foundation mobile workspace: nuovo `ShellTopBarMobileMenu.tsx` (Radix DropdownMenu hamburger, 10 voci in 3 sezioni Navigazione/Vista/Azioni, riusa store di ShellTopBar senza prop-drilling). CSS `@media (max-width: 639px)` in `shell.css` nasconde quick-nav/model-sel/save/trust/toggles/⌘K/Undo/Redo/Help/Bell e mostra hamburger; brand compact (no eyebrow/tier/version); Run compact (no kbd F5). Side fix CSS specificity `.shell-topbar .tb-mobile-menu`. **Gate-removal critico in `App.tsx`** (Revisione 30/05 ADR 004): rimosso `&& !isMobile` da `useNewShell` → la Shell custom è ora renderizzata su ogni viewport quando c'è un modello attivo; aggiunto `!useNewShell` al gate del `MobileTabbar` → la tabbar legacy resta SOLO per Dashboard mobile (zero regressione). Scope M1 = chrome topbar mobile; layout completo (rail SX nascosto, panel DX sheet, Albero drawer) → fette M2/M3/M4 future. | 6 file: nuovo `frontend/src/shell/ShellTopBarMobileMenu.tsx(+test)`, edit `shell/ShellTopBar.tsx`/`.test.tsx`, `styles/shell.css`, `App.tsx`, `.claude/ricordi/decisioni/004-mobile.md` (addendum). Vitest 1068/1068 (+10), TypeScript silenzioso. Commit `7dbb379` |
| **M1-polish · Workspace mobile usabile** (30/05/2026) | Solo CSS in `shell.css` @media (max-width: 639px). **Layout**: nasconde `.shell-rail`/`.shell-left-tree`/`.shell-panel`/`.shell-right-reopen-tab` (M3/M4 future li ri-introdurranno come drawer/bottom-sheet). Grid `.shell-mid` collassa a 1-col anche con `data-left-tree-state="open"`. **Fix canvas overflow**: il root `.shell` non aveva `grid-template-columns` esplicito → cella implicit `auto` si stirava al max-content del canvas Three.js (che manteneva la larghezza iniziale desktop 717px) costringendo l'intera grid a sforare 375px → topbar Run/Avatar finivano fuori schermo. Fix: `grid-template-columns: minmax(0, 1fr)` + `min-width: 0` sui flex/grid intermedi (sblocca lo shrink sotto intrinsic size). Risultato: shell + topbar + mid + viewport tutti a 375px puliti, canvas R3F auto-resized a 300×fit, viewport finalmente full-width usabile. | 1 file: edit `styles/shell.css` (~50 righe @media). Vitest 1068/1068 invariato, console pulita. Commit `877c455` |
| **Fetta M2 · Spina compatta mobile** (30/05/2026) | Solo CSS in `shell.css` @media (max-width: 639px). Le pillole inattive della spina 3 fasi diventano cerchietto solo-numero (no label, no icon stato), la pillola attiva mantiene num + label + icona. Pattern visivo `(1) → (2) → (3) Verifica` invece di `(1) Costruisci → (2) Esegui → (3) Verifica`. Altezza row spina ridotta `--phase-h: 36px` (da 44) per recuperare 8px verticali per il viewport. ADR 004 D3 implementato. Zero TSX changes: blocco skip + tap navigation + tooltip restano invariati (logica componente identica). | 1 file: edit `styles/shell.css` (~30 righe nuove @media). Vitest 1068/1068 invariato, desktop completamente invariato. Commit `ef5cdfe` |
| **Fetta M4 · Panel DX Verifica bottom sheet mobile** (30/05/2026) | Nuovo bottom sheet sticky per il panel DX "Verifica" su mobile (workspace `risultati`). Filosofia ADR 004 D5 "junior fuori, senior dentro": **peek** (default, 64px) mostra solo header "Verifica · subtitle dinamico" + chevron-up, **expanded** (80vh con animation 250ms) mostra l'accordion completo (Sintesi sempre aperta + 4 sezioni Spostamenti/Sollecitazioni/Reazioni/Verifica EC3 multi-open). Tap su header toggle. Body scroll lock quando expanded (cleanup garantito al unmount/collapse). Renderizzato solo se `isMobile && activeWs === "risultati"`: viewport pieno nelle fasi Costruisci/Esegui. Su desktop il sheet è `display: none` (ShellPanel 380px nel grid invariato). Pattern store stesso di rightPanelStore (Zustand persisted, key `feapro-mobile-sheet`). Nasconde l'header interno di ResultsTabsPanel via CSS `.shell-panel-sheet .results-panel-h { display: none }` per evitare duplicazione visiva. | 4 file: nuovi `frontend/src/store/mobileSheetStore.ts(+test)`, `frontend/src/shell/ShellPanelMobileSheet.tsx(+test)`, edit `shell/Shell.tsx` (render condizionale + import useIsMobile), `styles/shell.css` (~90 righe nuove). Vitest 1083/1083 (+15: 6 store + 9 component), TypeScript silenzioso. Live verificato @ 375px: peek 64px sticky bottom, tap → expanded 650px (80vh) con accordion completo. Scope NON incluso (M4-polish futuro): swipe gesture verticale, refactor doppio-mount ResultsTabsPanel (mobile sheet + ShellPanel desktop display:none). Commit `847ddd1` |
| **M4-polish · Single-open accordion su mobile** (30/05/2026 notte) | Feedback live di Federico testando il deploy LIVE su iPhone: nel bottom sheet M4 l'accordion era multi-open (eredità desktop E2.5c) → aprendo Sollecitazioni mentre Spostamenti era aperto bisognava scrollare per arrivare al content nuovo. **Decisione UX**: bottom sheet mobile usa single-open exclusive (tap su X chiude le altre); desktop ShellPanel resta multi-open invariato. Filosofia "junior fuori, senior dentro" applicata allo SPAZIO. Implementazione: `verifyAccordionStore` nuovo metodo `openExclusive(key)`; `ResultsTabsPanel` prop `singleOpen?: boolean` (default `false`); `AccordionSection` interno handler conditional; `Shell.tsx` passa `singleOpen={true}` solo nel ResultsTabsPanel embeddato dentro `ShellPanelMobileSheet`. Sintesi sempre-open NON toccata (vive fuori store). | 5 file: edit `store/verifyAccordionStore.ts(+test)` (+3 test), `shell/results/ResultsTabsPanel.tsx(+test)` (+4 test), `shell/Shell.tsx`, `.claude/ricordi/decisioni/004-mobile.md` (addendum). Vitest 1090/1090 (+7), TypeScript silenzioso. Commit `74b702e` |
| **Fetta M3 · Albero modello drawer mobile** (30/05/2026 mattina) | Drawer overlay per il panel SX "Albero modello" su mobile (ADR 004 D4 pattern Slack/Telegram). Nuovo wrapper `ShellLeftTreeDrawer.tsx` (zero store nuovo — riusa `leftTreeStore` esistente E2.4): position fixed left 0, width 80vw max 280px, height 100vh, transform translateX(-100%) chiuso → translateX(0) aperto, transition 250ms cubic-bezier. Backdrop rgba(0,0,0,0.42) fade-in 200ms, click → toggle (chiude). Body scroll lock via useEffect (cleanup garantito al unmount o close). Shell.tsx: gate `!isMobile` aggiunto al render in-grid del panel + nuovo render drawer condizionale `isMobile && !focus && !takeover` fuori dalla grid mid (overlay position:fixed). data-left-tree-state forzato "closed" su mobile (grid resta 1-col M1-polish). CSS override `.shell .shell-left-tree-drawer .shell-left-tree { display: flex; width: 100%; height: 100% }` specificity 0-3-0 batte M1-polish display:none (0-2-0). Hamburger menu (M1) → voce "Albero modello" toggle invariata: già chiamava leftTreeStore.toggle() → ora apre il drawer su mobile. Zero TSX changes ad altre parti. | 4 file: nuovo `frontend/src/shell/ShellLeftTreeDrawer.tsx(+test)` (9 test), edit `shell/Shell.tsx` (import + render drawer + gate `!isMobile`), `styles/shell.css` (~60 righe). Vitest 1099/1099 (+9), TypeScript silenzioso. Commit `9c78f59` |
| **Fetta M5 · Doppio-tap focus mode mobile** (30/05/2026 mattina) | Escape valve mobile per il viewport 3D: doppio tap entro 300ms su `.shell-viewport` → entra in focus mode (riusa `enterEmptyState` di Fetta 0, viewport pieno senza chrome). ADR 004 D6 (Opzioni A+C combinate: viewport invariato + escape doppio-tap full-screen). Nuovo hook `useDoubleTap(onDoubleTap, enabled)` — conta tap consecutivi entro `DOUBLE_TAP_THRESHOLD_MS=300`, skippa tap su elementi interattivi via `target.closest('button,a,input,[role=button],[role=link],[role=menuitem],[role=tab]')` (HUD buttons Zoom/Ruler/Legend non triggerano focus). Gate `enabled={isMobile}` in `ShellViewport.tsx`: desktop invariato (focus accessibile via toggle topbar o tasto F come Fetta 0). Uscita focus mode invariata (pill "Esci focus" top-right già da Fetta 0). | 3 file: nuovo `frontend/src/hooks/useDoubleTap.ts(+test)` (8 test: single/double tap, timeout reset, 3-tap pattern, enabled=false, skip interactive, cleanup unmount), edit `shell/ShellViewport.tsx` (+import hook + onClick handler section). Vitest 1107/1107 (+8), TypeScript silenzioso. Zero TSX changes ai 6 HUD floating, zero touch al Canvas R3F (zona protetta viewport engine). |

### Fetta D0 (questa)
- **D0 — Memoria di progetto** (29/05/2026) — Bootstrap `.claude/ricordi/`
  cross-progetto. README + CONTEXT + CULTURE + ROADMAP + BACKLOG + 3 ADR.
  Niente codice toccato, baseline test invariata.

## 🟡 In corso

### Fetta E2-IA (5 commit totali) — in pausa post-E3
Adottare l'IA del prototipo v3 dentro Soft v2.1 (opzione B + (c) mix
gerarchizzato — vedi ADR 003). E2.1 chiuso, E2.2-E2.5 in attesa.

- [x] **E2.1** Topbar 3 icone + menu profilo + toggle Albero/Focus (commit `4f9e0a8`)
- [x] **E2.2** Panel DX stato "closed" + reopen tab verticale destra (commit `912e285`)
- [ ] **E2.3** Panel DX stato "inspector" contestuale (selezione bidirezionale)
- [x] **E2.4** Albero modello in panel SX collassato di default (commit `1415f03`)
- [x] **E2.5a + E2.5b** Rail SX cleanup 6→3 + rinomina Risultati→Verifica (commit `e61facd`)
- [x] **E2.5c** Panel DX Verifica refactor accordion verticale (commit `87800b5`)
- [x] **E2.5d** 4 route mancanti `/modelli` `/jobs` `/cronologia` `/docs` + handler topbar (commit `c4d2f2f`)

🎉 **Fetta E2-IA completata** — IA prototipo v3 implementata end-to-end (topbar 3 icone + menu profilo + spina blocco skip + panel DX 3 stati con accordion + panel SX Albero + rail cleanup 6→3 + 4 route placeholder). ADR 003 chiuso. Restano scope futuro: selezione bidirezionale viewport↔Albero↔inspector (E2.3+E2.4-foglie fuse), View overlay → toolbar viewport, I/O smistato in palette+AvatarMenu, rimozione VerifyPanel takeover.

### 📱 Fette mobile M1-M5 (ADR 004 chiuso · pronto per implementazione)

- [x] **M1** Topbar mobile + hamburger menu + gate-removal Shell custom (30/05/2026, commit pendente)
- [x] **M2** Spina compatta `(1) → (2) → (3) Verifica` (30/05/2026, commit pendente)
- [x] **M3** Albero modello drawer overlay con backdrop click-to-close (30/05/2026, commit pendente)
- [x] **M4** Panel DX Verifica bottom sheet (peek 64px + expanded 80vh tap-toggle) (30/05/2026, commit pendente) · swipe gesture → M4-polish futuro
- [x] **M5** Viewport doppio-tap = focus mode full-screen (30/05/2026, commit pendente)

🎉 **Filone mobile M1-M5 COMPLETATO** end-to-end. ADR 004 chiuso. Workspace ora pienamente usabile su iPhone (375px). Restano scope futuro: M4-polish swipe gesture verticale per il bottom sheet; tablet polish 640-1024px se serve.

**Decisioni IA cristallizzate**: vedi `decisioni/004-mobile.md` (6 decisioni
+ filtro scope + convention E2-IA applicate al mobile).
- [ ] **E2.5** Rail SX eliminazione + verifica accorpamento voci (residue route mancanti `/modelli`, `/jobs`, `/cronologia`, `/docs`)

### Fetta E3 — Dashboard redesign React (CHIUSA 29/05, 8 commit)

Implementazione fetta-per-fetta del mockup Claude Design Round 2.
Pattern stabilito: commit atomico per fetta, baseline verde sempre,
DashTopBar prima (golden reference live = ShellTopBar E2.1).

- [x] **E3.1** DashTopBar replica ShellTopBar (commit `2a9dd0b`)
- [x] **E3.2** DashHero sobrio + 3 stati A/B/C (commit `56a2cbb`)
- [x] **E3.3** NewModelTile 1+2 (1 CTA primaria + 2 link sobri, commit `d59add1`)
- [x] **E3.4** RecentsCarousel + Riprendi (commit `5e42434`)
- [x] **E3.5** TemplateGallery 9 template prominenti (commit `90fc934`)
- [x] **E3.6** EmptyOnboarding stato C (commit `d4641f6`)
- [x] **E3.7** QuotaBanner sticky stato B (commit `711a46e`)
- [x] **E3.8** SettingsBillingPage `/settings/billing` (commit `8a46e96`)

**Dettagli completi**: vedi `handoffs/06-step-E-complete.md` per
sintesi tecnica + cosa è successo + stato repo + TODO non bloccanti.

## 🔵 Prossime

### Sequenza dopo E2-IA

| Fetta | Cosa | Stato spec |
|---|---|---|
| **F1** | Toolbar viste viewport (3D iso / piano / fronte / lato, presets utili) | Brief da decidere |
| **F2** | Selezione bidirezionale viewport ↔ albero ↔ inspector | Brief da decidere |
| **F3** | Tab Reazioni completa (oggi colonne tagliate a dx — vedi BACKLOG Tier-2-A) | Brief da decidere |
| **Mezza-fetta UI toggle** | Toggle utente per `radius` (soft/sharp), `accent` (cyan/altro?), `density` (compatto/normale). Già esiste l'opt-in `data-radius="sharp"` da DESIGN_HANDOFF §1.3, va esposto come UI control. | Brief da decidere |

### Più avanti (visione, non commitment)

- **E3** UI primitives da rifare (vedi BACKLOG `## UI primitives E3`).
- Estensione Workspace Costruisci (MakePanel) e Esegui (SolvePanel) con la
  stessa filosofia 4-stati-onesti del workspace Risultati.
- Validazione strutturale: chiudere LE1 anti-convergenza mesh fine
  (centroide stress recovery) + shear locking Q4 (sospetto, da verificare).

## Convention di chiusura fetta

Una fetta è chiusa solo quando **tutti questi** sono veri:
1. Commit atomico (un solo commit per fetta).
2. Vitest e Playwright restano al contatore precedente (o aumentano).
3. Verifica visiva live: server avviati, login, screenshot della
   feature che dimostra il comportamento.
4. Federico approva e dice "ok" — niente unilateralità.
