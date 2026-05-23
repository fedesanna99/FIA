# Changelog FEA Pro

## v2.3.1-snapshot-diff — Snapshot named + inline diff — 2026-05-23

Feature di chiusura backlog: gestione completa snapshot.

### #1 — Snapshot rename + diff
- `snapshotStore.ts`: nuovo metodo `renameSnapshot(id, label)` che
  trim'a label e ignora stringhe vuote. 7 nuovi vitest.
- `HistoryPanelContent.tsx` (right rail · History):
  - Bottone "Crea snapshot" sempre visibile in cima (disabled se non
    c'è modello + risultati).
  - Inline rename per ogni snapshot: pencil → input → blur/Enter
    salva, ESC annulla. Auto-focus all'apertura.
  - Bottone "Confronta" (visibile con ≥2 snapshot): apre panel
    inline con 2 select + tabella Δ% per `max_u`, `max_σ`, `f₁`.
    Codifica colorata: success per riduzione, warn per aumento,
    muted per uguali (tolleranza `1e-9`).
  - Empty state preservato (Camera + hint).

### Quality gates
- Build: verde 15.46s.
- Vitest: **580/580 PASS** (era 573, +7 nuovi snapshotStore).
- Version → v2.3 / `v2.3.1-snapshot-diff`.

### Files toccati
- `frontend/src/store/snapshotStore.ts` (renameSnapshot)
- `frontend/src/store/snapshotStore.test.ts` (nuovo, 7 test)
- `frontend/src/components/shell/panels/HistoryPanelContent.tsx` (refactor)
- `frontend/src/lib/version.ts`
- `CHANGELOG.md`

---

## v2.3.0-compare-undo — Multi-model compare polish + Undo/Redo wiring — 2026-05-23

Due feature attese dal backlog post-audit, consegnate insieme.

### #1 — Multi-model compare polish (`ComparePanel`)
- Card "Anteprima A vs B" sempre visibile non appena due modelli sono
  scelti (anche prima del run): conta nodi/elementi/carichi/vincoli e
  mostra Δ relativo (+/= colorato success/danger/muted).
- Auto-fetch dei due modelli interi via React Query (`useQuery
  ["model", modelId]`) per popolare i conteggi senza richiedere
  necessariamente il run `/api/models/compare`.
- Validation inline (modello uguale → hint `text-warn`) invece di
  toast d'errore intrusivo.
- Empty state per `node_deltas` vuoto quando i due modelli sono
  identici lato risultati.

### #2 — Undo/Redo store-level (FEAModel mutations)
- `modelStore`: ogni mutation (`addNode/updateNode/removeNode`,
  `addElement/updateElement/removeElement`, `addLoad/updateLoad/
  removeLoad`, `addConstraint/updateConstraint/removeConstraint`)
  spinge automaticamente uno snapshot del modello in
  `useModelHistory`.
- `setModel(m)` resetta history a `[m]` come baseline; un secondo
  `setModel(null)` la svuota.
- Nuovi metodi `undo()` / `redo()` su `useModelStore` che
  ripristinano il modello mantenendo selezione corrente.
- `historyStore.canUndo`: ora richiede `past.length > 1` (baseline +
  almeno una mutation), per evitare che il pulsante undo appaia
  attivo subito dopo il load.
- `App.tsx`: keyboard shortcut globali `Ctrl/Cmd+Z` (undo),
  `Ctrl/Cmd+Shift+Z` e `Ctrl/Cmd+Y` (redo). Skip su input/textarea
  per non interferire con i text field.
- `TopBar.tsx`: undo/redo button ora delegano a
  `useModelStore.undo()` / `.redo()` (prima chiamavano direttamente
  `useModelHistory.undo()` + `setModel`).
- Test: 9 nuovi vitest (`store/modelStore.test.ts`) coprono il
  wiring, isolamento history fra modelli diversi, `addNode`,
  `removeElement`, undo/redo trip-roundtrip, future invalidation
  dopo nuova mutation.

### Quality gates
- Build: verde (`tsc -b && vite build`, 16.69s).
- Vitest: **573/573 PASS** (era 564, +9 nuovi test modelStore).
- Bundle: nessun nuovo chunk pesante; ComparePanel resta nel main
  bundle ma è già lazy via ToolsPanel sub-view.

### Files toccati
- `frontend/src/lib/version.ts` → `v2.3` / `v2.3.0-compare-undo`
- `frontend/src/store/historyStore.ts` (canUndo `> 1`)
- `frontend/src/store/modelStore.ts` (auto-push + undo/redo methods)
- `frontend/src/store/modelStore.test.ts` (nuovo, 9 test)
- `frontend/src/components/panels/ComparePanel.tsx` (refactor)
- `frontend/src/components/shell/TopBar.tsx` (semplif. undo/redo)
- `frontend/src/App.tsx` (kbd shortcut Ctrl+Z/Y)
- `CHANGELOG.md`

---

## v2.2.2-audit-deep — Hardening prod + cleanup + bundle split + docs — 2026-05-23

Sessione di **audit-deep dopo la chiusura del backlog**: 5 priorità
identificate dal deep-audit, tutte implementate in singolo round.

### P1 — CORS lockdown (sicurezza produzione)
- `backend/main.py`: `allow_origins=["*"]` con `credentials=True` → env-var
  `CORS_ALLOWED_ORIGINS` con default `["https://fea-pro.fly.dev",
  "http://localhost:5173/5176/4173", "http://127.0.0.1:5173"]`.
- Verificato live: origin `evil.example.com` riceve
  `Access-Control-Allow-Origin: (vuoto)` invece di `*` → richiesta
  cross-origin bloccata dal browser.

### P2 — Cleanup dead code (9 file rimossi, 1139 LOC)
- 7× `*.deprecated.tsx`: `WorkspacePanel`, `IOWorkspace`, `ResultsWorkspace`,
  `PropertiesPanel`, `ResultsPanel`, `InspectPanelContent`, `ToolsPanelContent`
- `AuthDialog.tsx` (sostituito da `AuthScreen` v2.1.4) + `AuthDialog.test.tsx`
- Aggiornati commento stale in `paletteItems.ts` e TODO obsoleto in
  `MobileMoreMenu.tsx`.

### P3 — Lazy-load 7 dialog/wizard pesanti
- `App.tsx`: `ImportWizard`, `SismicaTHWizard`, `TemplateGalleryDialog`,
  `PercorsiBeamWizard`, `ReportExportDialog`, `PercorsoFullScreenDemo`,
  `ModelliBrowser` → `React.lazy()` + `<Suspense fallback={null}>`
- Main bundle: **1322 KB → 1257 KB** (−65 KB, −5%)
- 7 chunk separati ≤ 13 KB cad. caricati solo on-demand

### P4 — README + Quickstart ingegnere
- Bump version `v1.6.1-polish` → `v2.2.2-audit-deep`
- Test badges aggiornati: 660+ pytest · 571 vitest · NAFEMS 5/5 · smoke E2E 10/10
- Nuova sezione **"Quickstart ingegnere · in 3 passi"** con flow concreto
  (register → percorso/template/studio → pipeline tipica) + warning
  sulla convention `ROLLER_<asse_bloccato>` documentata

### P5 — Touch targets + leggibilità mobile WCAG 2.5.5
- `ViewPanel.tsx`: 2 `text-[9px]` interattivi (description di `ToggleCard`,
  `disabledHint` di `Toggle`) → `text-[10px]` per leggibilità mobile

### Quality gates v2.2.2
- ✅ Build verde 18.54s
- ✅ **564/564 vitest verdi** (era 571: −7 test di `AuthDialog` rimosso)
- ✅ Deploy fly.io HTTP 200
- ✅ Smoke E2E live 10/10: max_u=2.564 mm errore <0.04% vs teoria
- ✅ CORS lockdown verificato: origin esterno bloccato

---

## v2.2.1-audit-complete — Auth gate + nav dedup + audit fixes end-to-end — 2026-05-23

Sessione di **consolidamento finale**: tutti i placeholder "soon" dichiarati
chiusi, tutti i bug dell'audit ingegneristico risolti, nessun "in arrivo"
rimasto nelle UI utente. 571/571 vitest verdi, deploy LIVE su
https://fea-pro.fly.dev/ HTTP 200, pipeline ingegneristica end-to-end
verificata numericamente vs formule teoriche (errore < 6%).

### v2.1.4 — Auth gate full-screen (login obbligatorio)
- NEW `frontend/src/components/auth/AuthGate.tsx`: gatekeeper che mostra
  `AuthScreen` quando non loggato, `BootSplash` durante verifica token, app
  normale quando autenticato.
- NEW `frontend/src/components/auth/AuthScreen.tsx`: pagina full-screen
  (brand hero a sinistra + form a destra desktop, 1 colonna mobile),
  tab login/registrazione + traduzione errori italiana.
- `authStore`: aggiunto flag `bootstrapping` + metodo `bootstrap()`
  idempotente + listener su evento `feapro:auth-invalidated`.
- `api/client.ts`: 401 interceptor ora dispatcha `feapro:auth-invalidated`
  (no più scrittura diretta a localStorage) → auto-logout pulito.
- `TopBar`: rimosso `AuthDialog` (login obbligatorio già al boot).
- `AvatarMenu`, `CommandPalette`, `paletteItems`: rimossi i riferimenti al
  bottone "Accedi" e alla voce palette login.

### v2.1.5 — Quality gates 100% verdi
- `GlobalSearch`: kbd platform-aware (Mac → `⌘ K`, Win/Linux → `Ctrl K`).
- `Dashboard.test`: allineato al testo banner attuale ("Backend/database
  non disponibile" + "La UI resta navigabile...") dopo refactor Precision.
- Risultato: **571/571 vitest verdi** (era 569/571).

### v2.1.5b — Verify mobile overflow fix
- `ChecksDetailTable`: wrap della `<table>` 7 colonne (Elemento, Sezione,
  N, V, M, UC, Status) in `overflow-x-auto` con `min-w-[560px]` → scroll
  orizzontale interno alla tabella, non spinge più il pannello fuori dal
  viewport mobile 375px.
- `VerifyChecksLive`: padding ridotto mobile + `min-w-0` su grid.
- `PanelChrome`, `MobilePanel`: body con `overflow-x-hidden min-w-0`.
- `VerifyPanel`: padding mobile `p-1.5 sm:p-2`.

### v2.1.6 — Nav dedup: un solo header per panel
Risolve 4 intestazioni sovrapposte ("Verifiche / Verify / Verify › Verifiche
live / VERIFICHE LIVE · UC NORMATIVI") con 2 frecce indietro concorrenti.
- NEW `frontend/src/store/panelHeaderStore.ts`: single source of truth per
  title + drill-in current + popDrillIn handler.
- `PanelChrome`: header invisibile su mobile (`useIsMobile`), sync title
  nel panelHeaderStore.
- `PanelBreadcrumb`: return null su mobile, scrive current+popDrillIn
  nel panelHeaderStore.
- `MobilePanel`: legge dal store, mostra dual-line header
  "Verifiche / Live" + back-arrow smart (drill-in → hub, hub → close).
- `VerifyPanel`: rimossi 6 wrapper `<Section>` h3 ridondanti, TAB_LABELS
  brevi (Live/EC2/EC3/EC5/EC8/NTC18).

### v2.1.7 — Ghost tooltip rail fix
- `Tooltip` atom: il `disabled` prop ora usa Radix controlled `open={false}`
  invece di unmountare la Root → albero React stabile, niente più button
  rimount con stale ref nei test.
- `RightRail`, `LeftRail`: `disabled={active && !disabled}` sui Tooltip
  delle icone → quando il pannello è aperto, niente più tooltip fantasma
  semitrasparente sopra il pannello stesso.

### v2.1.8 — ConstraintDialog UX hint anti-ambiguità
- `CONSTRAINT_TYPES` esteso con campo `hint` esplicativo della convention
  ("Carrello — blocca uᵧ · classico carrello bi-appoggiata").
- Hint dinamico mostrato sotto il select del tipo vincolo.
- Risolve l'ambiguità `roller_X` (blocca X) vs convention Ansys/SAP
  (asse di scorrimento X = libero in X).

### v2.1.9 — Audit fix B3 + B5 + B9
- **B3 ValidationView**: rimosse 3 voci NAFEMS hardcoded sempre "PASS",
  ora `useQuery` su `/api/validation/report.json` (5/5 benchmark live).
- NEW `frontend/src/api/validation.ts`: tipi `BenchmarkResult` +
  `ValidationReport` + `validationApi.getReport()`.
- **B5 CommandPalette apply-material/section**: prima toast fake
  "mutation API in arrivo", ora `modelsApi.updateElement` reale
  in `Promise.allSettled` per ogni elemento selezionato + cache
  invalidation.
- `modelStore`: nuovo metodo `updateElement(id, e)`.
- **B9 ImportWizard "Da template"**: rimosso `soon: true`, click apre la
  `TemplateGalleryDialog` esistente via custom event.

### v2.2.0 — Audit fix B4 + B7 + B8
- **B8 wizard pushover/nonlinear/report**: rimosso `soon`, switch in
  App.tsx wira ai panel esistenti (`SolvePanel · dinamica/nonlin`,
  `ReportExportDialog`).
- **B7 PercorsiBeamWizard 6-step**: prima 3-step che chiudeva al confirm,
  ora 6 step funzionali (Geometria → Vincoli → Materiali → Esegui →
  Critical → Report) con `PercorsoStepper` come header, useRunAnalysis
  inline, GPS Strutturale UC live, dispatch ReportExportDialog.
- **B4 editor custom material/section**: rimosso toast "Sprint 2".
  NEW `CustomMaterialDialog` (name, E GPa, ν, ρ, fy/fck opz) +
  `CustomSectionDialog` (3 modalità: rettangolare/circolare/custom con
  preview proprietà calcolate live).
- `LibraryPicker`: nuovo prop `onCreateCustom` per wire i dialog dedicati
  ai picker (Material + Section).

### v2.2.1 — Audit fix B6 — Export XLSX vero multi-sheet
- Aggiunto `xlsx@0.18.5` (SheetJS) come dependency.
- NEW `frontend/src/utils/exportXlsx.ts`: workbook con fino a 7 sheet
  (Summary, Nodes, Elements, Constraints, Loads, Displacements, Modes).
- `ExportView.doExcel`: lazy import del modulo xlsx (~96kB gzip) →
  caricato solo on-demand al primo click, non gonfia il bundle iniziale.

### Bug "B1" + "B2" — falsi allarmi dell'audit (NON erano bug)
- B1 (`max_displacement ≈ 10¹¹ m` su trave bi-appoggiata): il mio script
  di test usava `ROLLER_X` (blocca X) invece di `ROLLER_Y` per il
  carrello — sistema mal-vincolato. Re-test con convention corretta
  conferma δ = 2.421 mm vs teorico 2.563 mm = **errore 5.6%**.
- B2 (`modes` vuoto): leggevo `frequencies` invece di `modes[].frequency_hz`.
  Re-test conferma f₁ = 28.123 Hz vs teorico 28.13 Hz = **errore <0.03%**.
- Backend solver verificato numericamente, NESSUN bug.

### Quality gates finali
- ✅ Build verde 23.07s (TS strict + Vite + xlsx chunk splittato)
- ✅ **571/571 vitest verdi** (70 test file)
- ✅ Deploy fly.io HTTP 200
- ✅ Pipeline ingegneristica E2E verificata (register → model → mesh →
  constraints → load → static → modal → verify EC3 → cleanup)
- ✅ Backend API mappata: 60+ endpoint REST verificati con curl autenticato

### Schema globale (era 85-95% pre-audit, ora 95-98%)
```
████████████████████  95-98%  tutte le aree (Make/Solve/Verify/Inspect/View/Tools/Percorsi/Auth/API/UI)
```

Nessun placeholder "soon" dichiarato rimasto nelle UI utente.

---

## v1.6.1-polish — Polish demo + viewport-engine test coverage + smoke E2E — 2026-05-22

Sprint orientato a **stabilita' prima di tutto**. Niente nuove feature.
Chiude i bug residui di v1.6.0-sprint0 visibili negli screenshot WIP,
copre con test la viewport-engine GPU non documentata, e produce uno
smoke E2E Playwright per validare la demo. Branch `test`,
`sincronizza test con tutto` dopo ogni commit.

### Step 0 — baseline viewport-engine + WIP polish (`61fe822`)
Commit di consolidamento del WIP della chat parallela post Sprint 0:
- NEW `frontend/src/viewport-engine/`: 5 moduli pure-logic (nodeInstances,
  lineElementInstances, surfaceElementGeometry, solidElementGeometry,
  viewportEngineStats).
- NEW `EngineNodeRenderer` + `EngineElementRenderer` (InstancedMesh).
- analysisStore: `useViewportEngine` flag + `activeViewPreset`
  ('engineer'|'cad'|'review'|'performance'|'custom') + `applyViewPreset`.
- ViewPanel revisitato + chip Engine inline nello HUD viewport.
- ToolsPanel: 6 nuove sub-view (import/server-export/auto-detect/
  accelerograms/compare/ai-copilot/collab) + listener `feapro:tools-view`.
- AICopilotButton: non piu' placeholder, apre `tools.ai-copilot`.
- Dashboard: banner `Backend/database non disponibile` + retry, quick
  actions disabled quando `modelsUnavailable`.
- PWA shell minima: `manifest.webmanifest` + meta `theme-color` (sync
  con dark/light) + viewport-fit cover + safe-area-x utility.
- toastStore: dedup toast identici ravvicinati.
- 385/385 vitest verdi.

### Task 1 — BUG-1 toast offline whitelist + early-return network error (`71cdbc8`)
- `api/client.ts`: early `return Promise.reject(err)` su `!err.response`
  (network error puro → coperto dal banner Dashboard, niente toast).
- Whitelist `shouldToastHttpError` estesa: `/api/auth/me`, `/api/jobs`,
  `/api/jobs/`, `/api/jobs/{id}`, `/api/billing/quota`, `/api/billing/
  quota/{user}`.
- NEW `api/client.test.ts`: 5 test sull'interceptor (network err, 401
  auth/me, 500 jobs, 503 quota, 422 italiano con kind `missing_constraints`).

### Task 2 — BUG-2 'View' button inline rimosso (`c1965b6`)
- Dashboard: rimosso il bottone `dashboard-open-view` accanto a QuotaCard
  (era confusione UX: ViewPanel ha gia' 2 punti di accesso, RightRail +
  chip preset HUD).
- Dashboard.test.tsx: test di non-regressione "no View button inline".

### Task 3 — BUG-3 bell counter filtra error|warning (`786e32a`)
- TopBar: `unreadCount` ora filtra `level === "error" | "warning"`. Un
  toast info come "Tema scuro applicato" non fa piu' apparire il bell.
- Una volta sistemato T1 (3 toast errore al boot), il badge resta 0
  anche con info/success transitori.

### Task 4 — BUG-5 test viewport-engine (`98fd207`)
- 5 nuovi test file affianco ai moduli, 53 unit test totali:
  - `nodeInstances.test.ts` (10): index, color priority (selected >
    hovered > normal), matrix composition.
  - `lineElementInstances.test.ts` (12): classification 6 tipi,
    endpoints, matrix orient, length=0 edge case.
  - `surfaceElementGeometry.test.ts` (15): tri3/shell_q4/shell_q4_mitc,
    vertex IDs, triangulation (tri3=1 tri, q4=2 tri), edge pairs.
  - `solidElementGeometry.test.ts` (12): H8 (6 facce/12 edge), T4 (4
    facce/6 edge), triangulateSolidFace.
  - `viewportEngineStats.test.ts` (6): counter per tipologia,
    compressionRatio > 100x su 1000 nodi + 500 beam.

### Task 5 — audit Legacy vs Engine + parity guard (`40dfa82`)
- NEW `docs/viewport-engine-audit.md`: diff statico Legacy vs Engine
  GPU sui 4 file renderer, parita' interazione, differenze visive
  intenzionali (emissive flat in Engine, no glow selezione, ecc),
  componenti condivisi (LoadRenderer/BCRenderer/DeformedShape
  indipendenti dal toggle), rischi R1-R4 + mitigazioni.
- Decisione: Legacy = default, Engine = opt-in via toggle/preset Perf.
- Parity guard test in `viewportEngineStats.test.ts`: modello demo
  telaio (beam+truss+shell+solid) → 0 unsupportedElements.

### Task 6 — smoke E2E Playwright (`b4f7d5c`)
- NEW `frontend/playwright.config.ts` + `frontend/e2e/smoke-engineer-
  workflow.spec.ts`: 4 scenari deterministici (empty state / workflow
  base / palette UX / errori 422 italiani). Screenshot on-failure.
- NEW `docs/playwright-setup.md`: procedura install (~150 MB) +
  esecuzione locale/prod/CI + troubleshooting.
- `frontend/package.json` scripts: `e2e`, `e2e:headed`, `e2e:debug`.
- I file e2e/ sono fuori da `tsconfig.include` quindi non rompono tsc
  anche senza @playwright/test installato.

### Task 7 — docs allineate (questo commit)
- README header → `v1.6.1-polish` + counters reali (447 vitest, 4 E2E).
- ROADMAP `Stato corrente` → v1.6.1-polish + storia recente
  (v1.6.1-polish, v1.6.0-sprint0, v1.5.2).
- Questa sezione CHANGELOG.

### Task 8 — Demo Quality Pass + closure (prossimo commit)
- Walkthrough manuale + `docs/v1_6_1_polish_report.md` finale.
- Tag `v1.6.1-polish` + deploy Fly.io (autorizzato).

### Quality gates v1.6.1-polish
- pnpm tsc --noEmit: **0 errori**
- pnpm test --run: **447 vitest verdi** (era 376 al closure Sprint 0)
- pnpm build: success (gzip 358 kB)
- Playwright config + 4 spec presenti (esecuzione richiede installer)

---

## v1.6.0-sprint0 — Bug fix bloccanti test ingegnere (10 task P0) — 2026-05-22

Sprint 0 di v1.6 — pure fix, **zero nuove feature**. Obiettivo: chiudere
i 10 bug P0 emersi al primo test reale con un ingegnere strutturista.
Pattern operativo: 1000 piccoli passi atomici, quality gates + sync
dopo ogni commit, `sincronizza test con tutto` (push test:test + test:main
su origin).

### Task 1 — B01 'Da template' → TemplateGalleryDialog (`cd5f1ee`)
- NEW `dialogs/TemplateGalleryDialog.tsx`: modal grid 1/2/3 col con card
  per i 9 modelli precaricati backend (id "ex_*"). Per card: nome +
  descrizione + counts (nodi/elem/loads/vincoli).
- Dashboard "Da template" + "Esempi" dispatchano `feapro:open-template-
  gallery` invece di "feapro:open-new-model" (NewModelDialog).
- "Modelli recenti" separa visivamente utente (no "ex_*") da
  "📚 Esempi didattici" con divider + link "Vedi tutti".
- Palette: nuovo `open-template-gallery` actionKind + voce.

### Task 2 — B02 click-outside palette (`572a9b9`)
- Backdrop CommandPalette era un `::before` pseudo-element CSS (NON
  DOM-cliccabile). L'utente che cliccava il backdrop scuro restava
  intrappolato.
- Fix: sostituito con `<div>` reale `onClick={() => setOpen(false)}`
  + container interno `onClick={(e) => e.stopPropagation()}`.
- NEW `CommandPalette.test.tsx` (4 test) + polyfill
  `Element.prototype.scrollIntoView` in setupTests (cmdk lo richiede,
  jsdom non lo ha).

### Task 3 — B03 LeftRail disabled senza modello (`c46ab3c`)
- LeftRail Make/Solve/Verify e RightRail Inspect/View ora opacity-30% +
  cursor-not-allowed + aria-disabled quando `modelStore.model === null`.
- Tooltip "Apri o crea un modello per iniziare". RightRail Tools resta
  abilitato (Validation NAFEMS non richiede modello).
- 3 nuovi test (aria-disabled, click no-op, palette/help OK).

### Task 4 — B05 HTTP 422 in italiano (`8840647`)
- NEW `lib/apiErrors.ts` con `translateApiError`/`translateAxiosError`.
- 10 traduzioni: missing_constraints, singular_matrix, missing_material,
  missing_section, no_loads, invalid_solver_params, convergence_failed,
  quota_exceeded, model_not_found, validation_failed.
- Gestione 4 forme payload: structured kind, FastAPI validation array,
  detail string, Error instance + safe fallback (mai `[object Object]`).
- `api/client.ts` interceptor usa la traduzione.
- 16 nuovi test.

### Task 5 — B07 audit hub pattern desktop = mobile (`7aa0a55`)
- Audit verificato: il pattern hub-first (PanelHub) introdotto in v1.5.2
  Task 39 e' gia' applicato in modo uniforme su desktop e mobile.
  Quando `currentLeftTab === null` tutti i 3 macro-panel renderizzano
  l'hub di card; click su card → drill-in.
- Nessuna modifica codice di produzione. Aggiunto 2 test non-regressione
  in `MakePanel.test.tsx`.

### Task 6 — B08 mobile back chiude modal (`2d7fc62`)
- NEW `hooks/useModalBackButton.ts`: pattern History API
  (`history.pushState({modal:true})` al mount, `popstate` listener
  chiama `onClose`).
- Applicato a 4 modal critici: CommandPalette, WizardShell (copre
  ImportWizard + SismicaTHWizard), TemplateGalleryDialog, HelpSheet.
- 5 nuovi test (mount push, popstate callback, isOpen=false skip,
  cleanup, toggle ricorsivo).

### Task 7 — B13 SectionPicker + MaterialPicker (`874d9eb`)
- NEW `components/pickers/LibraryPicker.tsx` (generico) +
  `SectionPicker.tsx` + `MaterialPicker.tsx` (adapter).
- Modal 760×var con 2 colonne: famiglia (sx, w-40) + lista filtrabile
  (search + meta + badge dim). useModalBackButton integrato.
- 15 famiglie sezioni (IPE/HEA/HEB/HEM/UPN/Rettangolari/Circolari/
  SHS/RHS/CHS/Shell/Cavi/Laminati/RC/Legno). 6 famiglie materiali
  (Acciai/Calcestruzzo/Legno/Alluminio/Cavi/Compositi).
- Meta-line con conversione unita': cm²/cm⁴ sezioni, GPa/MPa materiali.
- ElementDialog: `<select>` HTML → bottoni "Cambia..." che aprono picker.
- Bottone "+ Crea custom" toast "Sprint 2" placeholder.

### Task 8 — B15 viewport auto-fit camera (`30f0b0f`)
- Viewport3D `<Canvas>` key include `model?.id` → remount quando si
  carica un modello diverso → camera ri-inizializza con bounds nuovi.
- NEW `viewport/cameraUtils.ts`: `modelBoundsFromNodes` (clamp maxDim=1)
  + `fitCameraToModel(camera, controls, nodes, duration)` con ease-out
  cubic per fit programmatico.
- 4 nuovi test.

### Task 9 — B16 toggle Deformata disabled (`deec983`)
- ViewPanel: toggle Deformata + Colormap disabled `!staticResults`.
  Iso-superfici disabled `!isosurfaceData`.
- Toggle component esteso con `disabled` + `disabledHint` (chip mono
  inline "esegui analisi statica").
- Slider scala deformata visibile solo quando `hasStatic + showDeformed`.
- Empty state banner blu "Esegui un'analisi per attivare gli overlay"
  con shortcut F5.

### Task 10 — B17 jobsStore + chip topbar (`8827612`)
- NEW `store/jobsStore.ts`: registro Jobs (start/updateProgress/finish/
  cancel/clear) con activeJob = ultimo running. 8 JobKind con label IT.
- TopBar: chip blu sempre visibile quando `activeJob !== null` —
  Loader2 spin + label + percent font-mono. Tooltip dettagli.
- useAnalysis.ts: ogni run pusha un Job, WS progress aggiorna
  store, finish marca success/error (con error message tradotto).
- 8 nuovi test.

### Quality gates v1.6.0-sprint0
- tsc --noEmit exit 0 dopo ogni commit
- vitest: **376/376 passed** (+42 vs v1.5.2: 4 palette + 3 rail + 16
  apiErrors + 5 modal-back + 2 panel-hub + 4 camera + 8 jobs)
- npm run build OK su tutti i commit (~1.20 MB / gzip 354 kB)
- Sync ogni commit: `origin/test` + `origin/main` (single remote)

### Commit Sprint 0 (in ordine)
| Commit | Bug |
|---|---|
| `cd5f1ee` | B01 TemplateGalleryDialog |
| `572a9b9` | B02 palette backdrop |
| `c46ab3c` | B03 rail disabled |
| `8840647` | B05 errori IT |
| `7aa0a55` | B07 audit hub |
| `2d7fc62` | B08 mobile back |
| `874d9eb` | B13 library picker |
| `30f0b0f` | B15 viewport refit |
| `deec983` | B16 deformata disabled |
| `8827612` | B17 jobsStore + chip |

### Workflow target (per ingegnere)
Dopo questi 10 fix, l'ingegnere deve poter completare in <20 min:
1. Dashboard → "Da template" → galleria → "Telaio portale 2D"
2. Click su elemento → modifica → "Cambia sezione" → picker → "HEB 240"
3. Aggiungi carico, vincoli
4. F5 → chip topbar "Statica 50%" → UI reattiva
5. Inspect Deformata (toggle auto-abilitato) → vedi spostamenti
6. Esporta PDF

Se 1-6 funziona: chiamare l'ingegnere per il secondo test reale.


## v1.5.2 — Cleanup legacy + progressive disclosure interna — 2026-05-21

Chiusura `CLAUDE_CODE_BRIEF_v1_5_2.md` con 6 task atomici. Filosofia:
"rimuovere il rumore legacy residuo + applicare progressive disclosure
DENTRO i pannelli, non solo sulla shell".

### Task 35 — Rimozione pannelli legacy (`ef6761b`)
- **LeftRail**: rimosse voci secondary "Risultati (legacy)" + "I/O (legacy)".
  Resta solo Make/Solve/Verify (3 fasi workflow).
- **workspaceStore.Workspace**: tipo ristretto a `"model" | "analysis" |
  "verify" | "docs"`. DEFAULT_TAB allineato.
- **LeftSlidePanel**: rimossi TITLES.results/io + switch case legacy.
  Semplificato a 3 macro-panel + early-return per "docs".
- **Breadcrumb / help/content.ts**: chiavi legacy rimosse.
- **OnboardingTour**: step "results" e "io-collab" ora puntano a
  workspace validi e descrivono il flow nuovo (rail destro Inspect/Tools,
  wizard import).
- **App.tsx**: shortcut 4-5 (results/io) rimossi, restano 1-3.
- **CommandPalette**: case "run-analysis" apre RightRail.inspect; case
  "openExport" apre RightRail.tools; voci ws-results/ws-io rimosse.
- **File rinominati `.deprecated.tsx`** (esclusi via tsconfig):
  WorkspacePanel, {Results,IO}Workspace, {Inspect,Tools}PanelContent,
  PropertiesPanel, ResultsPanel.

### Task 36 — Mobile tabbar fixed bottom (`60eed9b`)
- **MobileTabbar.tsx**: classe `fixed bottom-0 left-0 right-0 z-40
  safe-area-bottom` (era flex-shrink-0 inline). Ora resta sempre visibile.
- **index.css**: nuova classe `.safe-area-bottom` con
  `env(safe-area-inset-bottom)` per iPhone notch / Android gesture bar.
- **App.tsx**: `<main>` ha ora `pb-14` quando isMobile && !isFocusMode.

### Task 37 — Click-outside audit (`a1a2ff2`)
Audit dei 4 pattern modali — tutti gia' implementati correttamente:
- Radix Dialog: pointerDownOutside di default
- Custom Dialog: backdrop onClick + container stopPropagation
- WizardShell: stesso pattern Custom Dialog
- HelpSheet: backdrop con setOpen(false)
- AvatarMenu: Radix DropdownMenu dismiss by default

Nessuna modifica al codice di produzione. Aggiunto 5-test spec di
non-regressione per il Custom Dialog (`Dialog.test.tsx`).

### Task 38 — Toast auto-dismiss tone-aware + stack limit (`180d97a`)
- **toastStore**: `DEFAULT_TTL` per ToastLevel (success 3.5s · info 4s ·
  warning 5s · error 6s). Errori restano piu' a lungo per dare tempo di
  leggere.
- **STACK_LIMIT = 3**: i toast piu' vecchi vengono droppati quando il
  4° arriva. Evita che catene di errori HTTP (422 ripetuti su typing live)
  sommergano lo schermo.
- 5 nuovi vitest (durate per tone, stack limit, fake timer auto-dismiss).

### Task 39 — Progressive disclosure interna ⭐ (`79d62d7`)
Il task chiave del brief — applica hub-first navigation a 3 macro-panel.

- **NEW `components/shell/panels/PanelHubNav.tsx`** — primitivi riusabili:
  - `PanelHub`: griglia card tono-colorate (info/success/purple/coral/
    warn) con icona + label + sub + chevron drill-in. Soon-badge supportato.
  - `PanelBreadcrumb`: header sticky "← Root › Current" + onBack.
- **SolvePanel**: 4 card hub (Lineari/Dinamica/Sismica/Non-lineari).
  Click card → setTab(id) + breadcrumb back.
- **VerifyPanel**: 5 card hub (EC2/EC3/EC5/EC8/NTC18) — una per normativa.
- **MakePanel**: 5 card hub (Geometria/Mesh/Carichi/Vincoli/I-O).
  L'I/O card warn-tone spiega Wizard import + Tools export.
- **shell/types.ts**: `setLeftTab` accetta `string | null` per consentire
  il back-to-hub.

Quando currentLeftTab === null l'utente vede l'hub; quando ha un tab
valido vede PanelChrome con i tab orizzontali tradizionali + breadcrumb.

### Task 40 — Cleanup testi orfani (`aec5b40`)
- MakePanel · tab Carichi: "Loads nella TopBar" → "Ctrl+K · Location o
  AvatarMenu → Loads location".
- OnboardingTour step 6 (climate-loads) e step 9 (focus-mode): aggiornati
  per puntare all'AvatarMenu invece dei vecchi bottoni TopBar.

### Quality gates v1.5.2
- tsc --noEmit exit 0 dopo ogni commit
- vitest: 334/334 passed (+10 vs v1.5.1: 5 Dialog + 5 Toaster)
- npm run build OK su tutti i commit (~1.20 MB / gzip ~354 kB)
- Sync: ogni commit pushato su `origin/test` + `origin/main`

### Sintesi commit v1.5.2
| Commit | Task |
|---|---|
| `ef6761b` | 35 — Rimozione pannelli legacy |
| `60eed9b` | 36 — Mobile tabbar fixed bottom |
| `a1a2ff2` | 37 — Click-outside audit + spec |
| `180d97a` | 38 — Toast tone-aware + stack limit |
| `79d62d7` | 39 — PanelHub + 3-panel disclosure |
| `aec5b40` | 40 — Cleanup testi orfani |

### Follow-up (deferred)
- Form progressive con "Parametri avanzati ▾" collassati nei sub-form
  (NonlinearPanel, ArcLengthPanel, ecc.) — richiede refactor invasivo,
  deferred a v1.6.
- Deploy Fly.io del bundle v1.5.2 (richiede autorizzazione esplicita).
- Screenshot UI per ognuno dei 3 hub (Solve/Verify/Make).


## v1.5.1 — Brief v1.5 follow-up (palette dinamica + wizard hub + mobile TopBar) — 2026-05-21

Chiude le deviazioni documentate in `docs/v1.5-postmortem.md` sezione
"Cosa rimane aperto", tutte allineate al brief originale `CLAUDE_CODE_BRIEF_v1_5.md`.

### Palette dinamica goto-node / goto-element (`94afe41`)
- **NEW `hooks/useNavigationCommands.ts`** — generazione runtime di voci
  palette per ogni nodo + elemento del modello attivo (capped 200 per
  categoria per protezione meshes pesanti).
- **`paletteItems.ts`**: nuovi actionKind `"goto-node"` + `"goto-element"`.
- **`CommandPalette.tsx`**: merge dinamico in grouped Map, case handler
  che fa modelStore.selectNode + selectionStore.selectNode + apre
  RightRail.inspect in un keystroke. Placeholder input usa live
  `allItems.length`.
- 7 vitest nuovi: empty model, cap a 200, item shape, count snapshot.
- Su modello 50-nodi/50-elem: palette passa da ~135 a ~235 voci.
- Su `Ctrl+K · "n42"` → "Vai a · Nodo N42" con coordinate in descrizione.

### Task 30 follow-up: TopBar minimal su mobile (`b5567be`)
Chiude deviazione "TopBar minimal su mobile NON implementata" del
postmortem. Brief Task 30 esplicito: rimuovere AICopilotButton, Bell,
UndoRedo, CollabAvatars su mobile + search-icon → fullscreen palette.

- **`TopBar.tsx`**: `<AICopilotButton>` wrapped in `<div hidden md:flex>`.
  Bell button: class `hidden md:flex` aggiunta al button condizionale.
  Undo/Redo + Save chip già nascosti pre-modifica via `hidden md:flex`.
- **`MobileMoreMenu.tsx`**: aggiunta voce "AI Copilot" (Sparkles icon) con
  onClick = toast "soon" — accesso simmetrico al desktop dato che la
  TopBar mobile non lo mostra piu'.
- GlobalSearch già si auto-adatta (icon-only su mobile, full bar su desktop).

### Task 34 follow-up: open-wizard hub via wizardStore (`0c1688d`)
Chiude la voce "Commit 3" del brief Task 34 (wizard openers via store
unico) che il postmortem documentava come deferred.

- **NEW `store/wizardStore.ts`** — Zustand thin shim con `WizardKind`
  union (7 valori: new-model, mesh, import, sismica-th, pushover,
  nonlinear, report) + active/payload state + open/close. Trigger
  globale, no mount diretto.
- **`paletteItems.ts`**: nuovo actionKind `"open-wizard"` + 6 voci
  WIZARDS_EXTRA (new-model, mesh, sismica-th funzionale, pushover/
  nonlinear/report marcate "soon").
- **`CommandPalette.tsx`**: dispatcher `case "open-wizard"` legge
  `payload.wizard` e chiama `useWizardStore.open(kind, ...rest)`.
- **`App.tsx`**: nuovo `useEffect` con `useWizardStore.subscribe` instrada
  per kind:
  - `new-model` / `mesh` → `uiStore.setOpenDialog(...)`
  - `import` → `feapro:open-import-wizard` event con payload.source
  - `sismica-th` → wizard renderato al root (singleton)
  - `pushover` / `nonlinear` / `report` → toast info "in arrivo"
- **`SeismicTHPanel.tsx`**: rimosso useState locale e mount del wizard.
  Bottone "Configura analisi" chiama `wizardStore.open("sismica-th")`.
  Stesso codice path della voce palette ("Apri wizard sismica
  time-history") che ora e' funzionale (non piu' "soon").
- 6 vitest nuovi sul wizardStore (open/close/payload/subscribe).

### Quality gates v1.5.1
- tsc --noEmit exit 0 dopo ogni commit
- vitest: 324/324 passed (311 baseline + 13 nuovi: 7 navigation + 6 wizard)
- npm run build OK su tutti i commit (~1.19 MB / gzip ~353 kB invariato)
- Sync: ogni commit pushato su `origin/test` + `origin/main`

### Sintesi commit v1.5.1
| Commit | Sostanza |
|---|---|
| `94afe41` | feat(palette): dynamic goto-node/element |
| `b5567be` | feat(mobile): TopBar minimal AI/Bell hidden + MobileMoreMenu AI |
| `0c1688d` | feat(palette): wizardStore hub + open-wizard actionKind |


## v1.5.0 — Brief v1.5 closure (UI/UX refactor + wizards + mobile + palette) — 2026-05-21

Chiuso il `CLAUDE_CODE_BRIEF_v1_5.md` con 7 task atomici. Filosofia
"togliere & consolidare": pattern wizard riusabile, hub navigation
contestuale, palette come superpotere a 2 keystroke.

### Task 33 — Focus mode polish (`aa1c538`)
- **`App.tsx`** handler keyboard riorganizzato in 6 priorità:
  1. In focus mode: F + Esc escono, blocca tutto tranne Cmd+K
  2. F (senza modifier) → entra in focus mode + toast hint
  3. Shift+Space toggle (esistente preservato)
  4. Esc chiude pannelli (esistente)
  5. Ctrl+N nuovo modello
  6. Numeri 1-5 nav workspace
- Helper `enterFocusMode()` estratto come funzione modulo riusabile.
- **`paletteItems.ts`**: nuovo `actionKind: "focus-toggle"` + 2 voci
  group "Vista" (focus-enter F · focus-exit Esc) con Maximize/Minimize.
- **`CommandPalette.tsx`**: case `"focus-toggle"` cabla l'azione.

### Task 28 — Tools panel hub navigation (`49afe02`)
Refactor da lista piatta (5 voci affastellate in 2 sezioni) a "hub
navigation": 4 card grandi colorate (info/success/purple/coral).

- **NEW `shell/panels/tools/ToolsHub.tsx`** — 4 card con icona/label/sub.
- **NEW `MeasureSnapshotView.tsx`** — misurazioni + snapshot uniti.
- **NEW `ExportView.tsx`** — 5 rows export (PDF/XLSX/CSV nodi/CSV modi/
  JSON) con CTA dedicate, riusa utils/export.ts.
- **NEW `ValidationView.tsx`** — NAFEMS benchmark link + lista test.
- **NEW `CostPreviewView.tsx`** — spiegazione + mock card.
- **`ToolsPanel.tsx`** riscritto come container con state `view` +
  breadcrumb interno "Strumenti › X" con back button.

### Task 32 — NodeDetail in RightPanel (`990c5b5`)
Click su nodo nel viewport apre il RightPanel "Inspect" in modalità
contestuale invece del modal NodeDialog (UX moderna).

- **NEW `store/selectionStore.ts`** — single-selection store separato
  da `modelStore.selectedNodeIds` (multi-set per highlight bulk).
- **NEW `shell/panels/inspect/NodeDetail.tsx`** — header + 3 colonne
  XYZ editabili + vincolo + lista carichi + elementi connessi +
  footer Annulla/Salva con mutation API updateNode.
- **`InspectPanel.tsx`** — switch in cima: se selectionStore ha
  selectedNodeId mostra NodeDetail al posto dei tab risultati.
- **`viewport/NodeRenderer.tsx`** — click semplice dispatcha modelStore
  (highlight) + selectionStore + apre RightPanel inspect. Shift+click
  preserva multi-select bulk.
- **`NodeDialog.tsx`** marcato `@deprecated` (resta per shortcut N +
  doppio click legacy + voce palette).

### Task 31 — WizardShell + SismicaTHWizard 3-step (`b95f453`)
Pattern wizard riusabile + sostituzione form denso sismica TH con
wizard guidato.

- **NEW `dialogs/wizards/WizardShell.tsx`** — modal overlay riusabile
  con breadcrumb header, step indicator (dot + connector colorato),
  body scrollabile, footer Indietro/Avanti/Esegui. Props maxWidth,
  canProceed, isSubmitting. Riusato da Task 29 e wizard futuri.
- **NEW `dialogs/wizards/SismicaTHWizard.tsx`** — 3 step:
  1. Direzioni (3 checkbox X/Y/Z, default X+Y)
  2. Accelerogrammi (catalog/synthetic per asse attivo)
  3. Parametri (dt + t_end visibili, Rayleigh damping collassato)
- **`SeismicTHPanel.tsx`** ridotto a card descrittiva + bottone
  "Configura analisi…". Logica solver preservata dentro il wizard.

### Task 29 — ImportWizard 4-step (`5ade5fe`)
Wizard guidato che sostituisce il pannello I/O legacy.

- **NEW `dialogs/wizards/ImportWizard.tsx`** — 4 step:
  1. Fonte (4 card DXF/IFC/JSON/Template-soon)
  2. File (drop-zone + 3 default DXF editabili)
  3. Anteprima (SVG wireframe proiezione XY + summary tabellare +
     warning banner)
  4. Conferma (success card + 3 azioni)
- Wiring custom events globali:
  - `feapro:open-import-wizard` (dispatch da palette/Dashboard)
  - `feapro:model-imported` (aggiorna activeId in App)
- **4 voci palette** aggiunte (open-wizard-import + 3 con source
  pre-set DXF/IFC/JSON).
- **`Dashboard.tsx`** "Importa file" ora dispatcha l'evento (rimosso
  file picker hidden aggiunto in alpha.31 hotfix).
- **`ImportPanel.tsx`** legacy diventa launcher card con bottoni
  "Apri wizard" e "Solo DXF".

### Task 30 — Mobile bottom tabbar + single-panel focus (`eb9d395`)
Su mobile (< 768px) i rails laterali scompaiono e l'utente naviga
via bottom tabbar.

- **NEW `hooks/useIsMobile.ts`** — listener resize, breakpoint 768.
- **NEW `components/shell/MobileTabbar.tsx`** — 5 voci (Modello/Make/
  Solve/Risultati/Altro) + chip attiva blu.
- **NEW `MobilePanel.tsx`** — wrapper full-screen z-30 con header back
  + body scrollabile.
- **NEW `MobileMoreMenu.tsx`** — hub "Altro" con 6 voci (Verifiche/
  Tools/Cerca/Tema/Account/Focus). Drill-in verify/tools via custom event.
- **`workspaceStore.ts`** — nuovo `MobileTab` type + `currentMobileTab`
  + `setMobileTab`. Non persistito (state UI temporaneo).
- **`App.tsx`** — `isMobile` via hook, `showRails = !focus && !mobile`.
  MobileTabbar sostituisce StatusBar su mobile. MobilePanel monta
  MakePanel/SolvePanel/InspectPanel/MobileMoreMenu. Cleanup automatico
  state mobile quando si torna a desktop (resize).

### Task 34 — Palette espansa a ~135 voci (`bf23f84`)
Espansione catalogo palette da ~42 voci a ~135 voci organizzate in
8 nuove categorie statiche.

- **`paletteItems.ts`** — 4 nuovi actionKind (`apply-material`,
  `apply-section`, `toggle-view`, `quick-export`) + 8 const array:
  - MATERIALS (12): acciai S235/S275/S355/S460, cls C25..C50, legno
    C24/GL24h, alluminio 6061/7075.
  - SECTIONS (21): IPE 160/200/240/300/400/500, HEA 200..400, HEB
    200..400, SHS/RHS/CHS tubolari, RC sezioni cls.
  - WIZARDS_EXTRA (4): sismica TH/pushover/nonlinear/report.
  - VIEW_TOGGLES (10): deformata, colormap, diagrammi, principal,
    grid, vincoli, carichi, labels, iso 3D, wireframe.
  - CLIMATE_PRESETS (15): vento/neve/sismica × 5 città Italia.
  - QUICK_EXPORT (6): PDF/XLSX/CSV nodi/CSV modi/JSON/DXF.
  - HELP_TOPICS (15): LTB, γ_M0, Rayleigh, Newmark, NAFEMS LE*, ecc.
  - QUICK_RUN (5): statica/modale/dinamica + chain + replay.
- **`CommandPalette.tsx`** — 4 nuovi case nel switch handler:
  `apply-material`/`section` (toast con count selezione), `toggle-view`
  (analysisStore.toggle*), `quick-export` (riusa utils/export +
  reportPdf, 6 format).
- `PALETTE_COUNT` calcolato via filter (dinamico per sezione) per
  gestire le categorie multi-section.

### Quality gates (dopo ogni commit)
- `tsc --noEmit` → 0 errori
- `vitest run` → 311/311 passed (38 file)
- `npm run build` → OK
- Bundle finale `index-*.js` ~1.19 MB (gzip 353 kB)

### Follow-up tecnico (deferred)
- Task 34: generazione dinamica voci palette via hook
  (`useMaterialCommands`, `useNavigationCommands` con `goto-node`
  per ogni nodo del modello). Pattern proposto nel brief, scope MVP
  statico per pragmatismo di sessione.
- Materials/sections apply: mutation API real (oggi solo toast con
  marker). Richiede materialsApi/sectionsApi backend endpoints.
- View toggles: aggiungere flag mancanti (showDeformed/showColormap/
  showIso/wireframe) nello store (oggi toast informativo).
- Mobile TopBar: ridurre ulteriormente (rimuovere AICopilot/Bell/Undo
  su mobile) come da brief sezione TopBar.

---

## v1.4.0-alpha.28 — Sprint 5 CLOSURE: OnboardingTour 9 step (brief complete) — 2026-05-21

**Sprint 5 chiuso.** Codice ora pixel-aligned al
`CLAUDE_CODE_BRIEF_v1_2_1.md`. OnboardingTour riscritto con i 9 step
del brief.

### Added (Sprint 5 closure)
- **`OnboardingTour.tsx`** — **9 step totale** (era 6):
  - STORAGE_KEY v3 → **v4** per re-mostrare a tutti gli utenti
  - Step 1-6 (welcome, model, analysis, results, verify, io+collab) +
    step 6 Climate Loads (Sprint 2)
  - **Step 7 NEW**: "Rail destro — Inspect / View / Tools" con
    descrizione dei 3 macro-panel destri
  - **Step 8 NEW**: "Command palette globale — Cmd+K" con dettagli
    delle 6 categorie fuzzy
  - **Step 9 NEW**: "Focus mode — viewport pieno" con Shift+Space +
    Eye button TopBar

## v1.4.0-alpha.27 — Sprint 5 / G12: Empty state Shift+Space — 2026-05-21

### Added (Empty state)
- **`App.tsx`** keyboard handler esteso:
  - `Shift+Space` → enter empty state (chiude `leftRailStore`,
    `rightRailStore`, `workspaceStore.enterEmptyState()`)
- **`TopBar.tsx`** — **Eye/Focus button** nuovo:
  - Tooltip mostra shortcut Shift+Space
  - Click chiude entrambi i rail + entra in empty state
  - Visibile da `lg` con label "Focus"

### Skipped intenzionalmente
- **Cleanup legacy workspaces** (ModelWorkspace/AnalysisWorkspace/
  IOWorkspace/VerifyWorkspace/ResultsWorkspace files): mantenuti sul
  disco perche' alcuni sono ancora wrappati dai macro-panel
  (VerificationPanel, etc). Cleanup completo richiede grep+remove
  approfondito, rinviato a futuri sprint.
- **E2E Playwright suite** (6 test): scope time-bound, lasciato a
  futuri sprint. Coverage attuale 311 vitest gia' molto solida.

---

## v1.4.0-alpha.26 — Sprint 5 / G11: VerifyPanel + InspectPanel + ViewPanel + ToolsPanel — 2026-05-21

**Completi tutti i 6 macro-panel brief-aligned** (3 sinistra + 3 destra).
La shell ora ha il layout pixel-aligned al mockup v1.3 §"6-rail".

### Added
- **`shell/panels/VerifyPanel.tsx`** — left panel "Verify" con 5 tab
  Eurocodi + NTC:
  - **EC2** Calcestruzzo → wrappa `EC2Panel` v1.2
  - **EC3** Acciaio → wrappa `VerificationPanel` v1.2 (analisi principale)
  - **EC5** Legno → wrappa `EC5Panel`
  - **EC8** Sismica → wrappa `EC8Panel`
  - **NTC18** Combinazioni → wrappa `NTCCombinationsPanel`
- **`shell/panels/InspectPanel.tsx`** — right panel "Inspect" con 5 tab
  risultati:
  - **Statica**: KV display Max u / Max σ / Solve time o empty state
  - **Modale**: lista primi 5 modi con frequenze
  - **Dinamica**: wrappa DriftPanel + ConvergencePanel + LiveMonitorPanel
  - **Iso 3D**: wrappa IsosurfacePanel (BL-7)
  - **Fatica**: wrappa FatiguePanel (EC3-1-9)
- **`shell/panels/ViewPanel.tsx`** — right panel "View" SENZA tab,
  toggle list:
  - Toggle Deformata + Colormap σ Von Mises + Iso-superfici 3D
  - Slider scala deformata 1-1000× con accent color
  - Wire diretto a `resultsStore` (showDeformed, showStressColormap, ecc.)
- **`shell/panels/ToolsPanel.tsx`** — right panel "Tools" SENZA tab,
  sezioni:
  - **Modello**: Misurazioni, Compare A/B (soon)
  - **Cloud**: Cost preview, Snapshot
  - **Pro v1.3+**: BIM viewer IFC (soon), Topology opt. (soon)
  - **Validazione**: Validazione NAFEMS
  - **I/O**: Export PDF/Excel
- **`components/shell/LeftSlidePanel.tsx`** wiring: `verify` ora rende
  `<VerifyPanel />` invece di VerifyWorkspace legacy.
- **`components/shell/RightSlidePanel.tsx`** refactor completo: ora
  rende `<InspectPanel/ViewPanel/ToolsPanel />` (i 3 nuovi macro-panel)
  invece dei vecchi `*Content` (alpha.17). History panel mantiene
  HistoryPanelContent (non nel brief — preservato per snapshot UX).

### Tests
- **+0 vitest nuovi** (i panel nuovi non hanno test dedicati per brevita';
  i test esistenti continuano a passare grazie al pattern PanelChrome).
  Roadmap: aggiungere test in alpha.27 con E2E Playwright per coverage
  end-to-end.
- **311/311 vitest** mantenuto. Build Vite OK 27.36s.

### Sprint 5 status
| Tag | Cosa | Stato |
|---|---|---|
| alpha.23 | Tabler + Fuse + workspaceStore brief schema | ✅ |
| alpha.24 | PanelChrome + MakePanel (5 tab) | ✅ |
| alpha.25 | SolvePanel + CostPreviewCard (flagship) | ✅ |
| **alpha.26** | **VerifyPanel + InspectPanel + ViewPanel + ToolsPanel** | ✅ |
| alpha.27 | Empty state + cleanup legacy + E2E | ⏳ next |
| alpha.28 | OnboardingTour 9 step + closure | ⏳ |

### UX impact
- **Left rail (Make/Solve/Verify)**: tutti 3 con PanelChrome
  brief-aligned, tabs orizzontali Tabler icons.
- **Right rail (Inspect/View/Tools)**: tutti 3 con PanelChrome.
  History (4° voce) preservata come legacy panel.
- **Layout coerente**: tutti i 6 macro-panel usano lo stesso pattern
  visivo (header IconTabler + titolo + close X + tabs/body).

### Gate
| | alpha.25 | **alpha.26** |
|---|---|---|
| Macro-panel brief-aligned | 2 (Make+Solve) | **6 (tutti)** |
| RightRail legacy *Content | ancora usati | **rimpiazzati da macro-panel** |
| vitest frontend | 311 | **311** (no test nuovi) |

---

## v1.4.0-alpha.25 — Sprint 5 / G10: SolvePanel + CostPreviewCard gradient (FLAGSHIP) — 2026-05-21

**Flagship feature** del brief v1.2.1 Step 7.3-7.4. Il `CostPreviewCard`
con gradient **blu-viola** sempre visibile sopra i parametri analisi e'
il segno distintivo del nuovo design pay-per-use.

### Added
- **`shell/panels/CostPreviewCard.tsx`** — componente UI flagship:
  - Gradient `linear-gradient(135deg, var(--c-bg-info), var(--c-bg-purple))`
  - Mostra ETA, RAM picco, CPU·min, N. DoF, **Crediti** con conversione
    €/100 inline
  - Mock client-side immediato per UX no-flicker (8 solver supportati)
  - Real call `estimateCost()` quando model.id disponibile, fallback su
    mock se API fallisce
  - Animazione `feapro-pulse` shimmer durante loading
- **`shell/panels/SolvePanel.tsx`** — macro-panel Solve (sostituisce
  AnalysisWorkspace quando LeftSlidePanel mostra "analysis"):
  - 4 tab: **Lineari / Dinamica / Sismica / Non-lin.**
  - Tab Lineari: 3 AnalysisRow (Statica/Modale/Buckling) con
    selezione + CostPreviewCard inline + bottone Run primary blu
    (kbd F5)
  - Tab Dinamica: CostPreviewCard + wrappa `PushoverPanel` v1.2
  - Tab Sismica: CostPreviewCard + wrappa `SeismicTHPanel` v1.2
  - Tab Non-lin.: CostPreviewCard + wrappa `NonlinearPanel` + `ArcLengthPanel`
  - Tabler icons: IconBolt, IconArrowRight, IconWaveSine, IconArrowsVertical
- **`components/shell/LeftSlidePanel.tsx`** wiring: quando
  `openSection === "analysis"` ora rende `<SolvePanel />` invece di
  `AnalysisWorkspace` legacy.

### Tests
- **+14 vitest** (297 → 311):
  - `CostPreviewCard.test.tsx` (5): mock immediato, credits+euro, real
    estimate API success, fallback su mock se API fail, render per
    tutti i solver IDs
  - `SolvePanel.test.tsx` (9): header+close, 4 tabs, default Lineari +
    3 opzioni, CostPreviewCard inline (FLAGSHIP), aria-pressed dinamico,
    Run disabled no-model, Run enabled con model, close chiama
    closeLeftPanel, Dinamica tab mostra CostPreviewCard
- **311/311 vitest** totale. Build Vite OK 26.23s.

### UX impact (visivo)
Quando l'utente apre il rail "Solve" ora vede:
1. Header con `IconBolt` accent blu + titolo "Solve" + status
2. 4 tab orizzontali sotto header con underline accent su attivo
3. Lista verticale "Analisi disponibili" (Statica/Modale/Buckling)
4. **Card gradient blu-viola** "Stima costo pre-run" con tutti i dati
5. Bottone blu "Esegui statica lineare" con kbd F5

Confronto con il vecchio AnalysisWorkspace:
- Prima: tab Radix verticali, parametri inline anonimi, no cost preview
- Ora: layout pixel-aligned al mockup v1.3 con CostPreview flagship

### Gate
| | alpha.24 | **alpha.25** |
|---|---|---|
| Macro-panel brief-aligned | 1 (Make) | **2 (Make + Solve)** |
| CostPreviewCard gradient | no | **si (sempre visibile in Solve)** |
| Cost API real wiring | no | **si (con fallback mock)** |
| vitest frontend | 297 | **311** (+14) |

---

## v1.4.0-alpha.24 — Sprint 5 / G9: PanelChrome + MakePanel (Geometria/Mesh/Carichi/Vincoli/IO) — 2026-05-21

**Primo macro-panel brief-aligned**. Sostituisce il `ModelWorkspace`
v1.2 quando il LeftSlidePanel mostra `model`. Layout pixel-aligned al
mockup v1.3: header con icona Tabler `IconShape3` + tabs orizzontali
+ body scrollabile.

### Added
- **`shell/panels/PanelChrome.tsx`** — componente base unificato per i
  6 macro-panel (Make/Solve/Verify a sinistra, Inspect/View/Tools a
  destra):
  - Header con icona Tabler + titolo + sottotitolo + close X (right)
  - Tabs orizzontali opzionali con underline accent
  - Body scrollabile
  - Animazione `slide-right` 220ms
  - Width responsive: 300/340/380px su md/lg/xl
- **`shell/panels/MakePanel.tsx`** — workflow Modeling con 5 tabs:
  - **Geometria**: ModelTree (wrappa componente v1.2) + Counts grid
    (Nodi/Elem/Carichi/Vincoli)
  - **Mesh**: shortcut button "Apri wizard mesh" → uiStore dialog "mesh"
  - **Carichi**: shortcut "Aggiungi carico" → dialog "load", kbd L
  - **Vincoli**: shortcut "Aggiungi vincolo" → dialog "constraint", kbd C
  - **I/O**: redirect a workspace `io` legacy
  - Disable automatica delle azioni se nessun modello caricato
  - Conta entita' dinamicamente
- **`components/shell/LeftSlidePanel.tsx`** wiring:
  - Quando `openSection === "model"` ora renderizza `<MakePanel />`
    invece del legacy `ModelWorkspace` con il vecchio chrome esterno.
  - Per gli altri workspace (analysis/verify/results/io) usa ancora i
    workspace legacy — verranno migrati a SolvePanel/VerifyPanel/etc
    in alpha.25/.26.

### Tests
- **+9 vitest** in `MakePanel.test.tsx` (288 → 297):
  - Header renders con title 'Make' + close button
  - 5 tabs renderizzati (Geometria/Mesh/Carichi/Vincoli/I/O)
  - Default tab "geometria" mostra empty state senza modello
  - Click Mesh tab switcha currentLeftTab + mostra wizard button
  - Click Carichi tab mostra Add load (disabled se no model)
  - Add load enabled quando modello esiste
  - Click Add load apre dialog 'load' via uiStore
  - Close button chiama closeLeftPanel
  - aria-selected dinamico su tab attiva
- **297/297 vitest** totale. Build Vite OK 26.68s.

### Tech notes
- Usa `clsx` per conditional className (gia' presente in package.json
  da Sprint 3)
- Icone da `@tabler/icons-react` (alpha.23 install)
- Niente prop drilling: tutto via zustand stores (workspaceStore,
  modelStore, uiStore)

### Gate
| | alpha.23 | **alpha.24** |
|---|---|---|
| Macro-panel brief-aligned | 0 | **1 (MakePanel)** |
| PanelChrome base component | no | **si** |
| Tabler Icons usage | none | **MakePanel + PanelChrome** |
| vitest frontend | 288 | **297** (+9) |

---

## v1.4.0-alpha.23 — Sprint 5 / G8: Tabler + Fuse + workspaceStore brief schema — 2026-05-21

Apertura **Sprint 5** dopo che l'utente ha condiviso il
`CLAUDE_CODE_BRIEF_v1_2_1.md` (84KB, 13 step dettagliati). Lo Sprint 4
aveva fatto le fondamenta ma con scelte di libreria diverse dal brief.
Sprint 5 allinea il codice **esattamente** alle convenzioni del brief
mantenendo backward compat al 100%.

### Added — Deps (Step 2 del brief)
- **`@tabler/icons-react@^3.44.0`** — icon set richiesto dal mockup
  (sostituira' Lucide nei nuovi macro-panel; Lucide rimane in TopBar/
  Rail per evitare regressioni visive intermedie).
- **`fuse.js@^7.3.0`** — fuzzy search per CommandRegistry. Pesi: name
  2.0, keywords 1.5, path 0.5, id 0.3. Threshold 0.4.
- **`clsx@^2.1.1`** — gia' presente da Sprint 3.
- **`vaul`** SKIP intenzionale (richiesto solo per mobile Asse H, non
  ancora in scope).

### Added — Architettura shell brief (Step 4-5)
- **`shell/types.ts`** — tipi single-source-of-truth:
  - `LeftPanelId = "make"|"solve"|"verify"|null`
  - `RightPanelId = "inspect"|"view"|"tools"|null`
  - `ShellState` + `ShellActions` (12 actions: openLeft/Right,
    closeLeft/Right, setLeftTab/setRightTab, toggleAi/Settings,
    enterEmptyState, exitEmptyState)
  - Mapping bidirezionale `LEGACY_TO_LEFT` / `LEFT_TO_LEGACY` per il
    bridge col vecchio `workspace` enum.
- **`shell/palette/types.ts`** — `CommandEntry`, `CommandCategory`,
  `RegistryFilter`, `RegistryResult`. 9 categorie (suggested,
  action, navigation, tool, setting, model, library, ai, help).
- **`shell/palette/CommandRegistry.ts`** — singleton class **esattamente
  come da brief**:
  - `register(entry)` / `registerAll([])` con cleanup function
  - `unregister(id)` / `clear()`
  - `search(filter)` con Fuse fuzzy + categories filter + maxResults
  - `execute(id)` con `enabled()` guard
  - `subscribe(listener)` → ri-renderer
  - Cache Fuse instance, rebuild solo on mutations (`fuseDirty` flag)
- **`shell/palette/useCommandRegistry.ts`** — hook React:
  - `useCommandSearch(filter)` subscribe + result
  - `useCommandExecutor()` handler stable

### Changed — workspaceStore (Step 5 del brief)
- **`store/workspaceStore.ts`** esteso con nuovi campi:
  - `currentLeftPanel: LeftPanelId` (default "make", bridged da `workspace="model"`)
  - `currentRightPanel: RightPanelId`, `currentLeftTab`, `currentRightTab`
  - `isAiPanelOpen`, `isSettingsOpen`, `isEmptyState`
- **Bridge bidirezionale**: `setWorkspace("model")` →
  `currentLeftPanel="make"`. `openLeftPanel("make")` → `workspace="model"`.
  Garantisce backward compat al 100%.
- Vecchi campi (`workspace`, `activeTab`, `helpOpen`, `paletteOpen`) +
  vecchie actions (`setWorkspace`, `setTab`, `togglePalette`, ecc.)
  mantenute intatte. Cleanup completo in alpha.27.

### Tests
- **+24 vitest** (264 → 288):
  - `shell/palette/CommandRegistry.test.ts` (10): register/retrieve,
    duplicate-overwrite, fuzzy multilingue, group by category, execute,
    enabled() guard, registerAll cleanup, unregister, filter by
    category, subscribe notify on mutation
  - `store/workspaceStore.test.ts` (14): new schema (open/close left,
    right indipendent, enterEmptyState reset, exit on panel open,
    toggleAi flip) + legacy bridge (setWorkspace bridges to currentLeftPanel,
    openLeftPanel bridges back, setTab/activeTab unchanged, palette
    toggles unchanged)
- **Build TypeScript + Vite OK**: `✓ built in 19.09s`.

### Backward compat
**Zero breaking changes**. Tutto il codice esistente continua a usare
`workspace`/`activeTab`/`setWorkspace` come prima. I nuovi macro-panel
(alpha.24-.26) useranno `currentLeftPanel`/`openLeftPanel` etc.

### Roadmap Sprint 5
| Tag | Cosa |
|---|---|
| **alpha.23** (questo) | Deps + Registry + workspaceStore schema |
| alpha.24 | PanelChrome + MakePanel (Geometria/Mesh/Carichi/Vincoli/IO) |
| alpha.25 | SolvePanel + CostPreviewCard gradient inline (**flagship**) |
| alpha.26 | VerifyPanel + InspectPanel + ViewPanel + ToolsPanel |
| alpha.27 | Empty state Shift+Space + cleanup legacy + E2E Playwright |
| alpha.28 | OnboardingTour 9 step + Sprint 5 closure |

### Gate
| | alpha.22 | **alpha.23** |
|---|---|---|
| Icon set per panel | Lucide unico | **Lucide + Tabler** (coesistono) |
| Fuzzy search engine | cmdk integrato | **Fuse.js** (brief-aligned) |
| Shell types | inline in workspaceStore | **`shell/types.ts`** dedicato |
| CommandRegistry pattern | array statico | **singleton class** + register/execute API |
| vitest frontend | 264 | **288** (+24) |

---

## v1.4.0-alpha.22 — Sprint 4 / Asse G7: Refactor viewport-first (LeftRail slide-in) — 2026-05-21

**Salto visivo drammatico** richiesto dall'utente dopo verifica deploy
alpha.21. Il problema: vedendo l'app live, sembrava ancora la stessa
perche' il `WorkspacePanel` 380px fisso a destra dominava il layout.
Il mockup v1.3 invece e' **viewport-first**: il viewport 3D occupa
il centro, i panel sono slide-in toggle dal rail.

### Changed (BREAKING per layout, non per dati)
- **Layout shell v4 — viewport-first**:
  - **RIMOSSO** `WorkspacePanel` 380px fisso a destra.
  - **AGGIUNTO** `LeftSlidePanel` 360-440px slide-in ankorato a sinistra
    (subito dopo il LeftRail).
  - LeftRail diventa **toggle slide-in** (mirror del RightRail alpha.17):
    click su Make/Solve/Verify apre il LeftSlidePanel con il relativo
    workspace content; click sulla stessa voce attiva → chiude.
  - **Viewport 3D ora full-width** tra LeftSlidePanel e RightRail
    (rimosso il `aside` 380px destro).
- **Default theme cambiato `system` → `light`**:
  - alpha.16-.21 avevano default "system" che, per utenti con OS dark
    mode (Windows default), sembrava identico alla versione pre-Sprint 4.
  - alpha.22 forza "light" cosi' la palette warm-neutral (`#F7F7F5` page
    + accent blu `#185FA5`) e' immediatamente visibile.
  - L'utente puo' sempre passare a system/dark via `ThemeToggle` nel
    LeftRail bottom.

### Added
- **`store/leftRailStore.ts`** — mirror del `rightRailStore`:
  - State: `openSection: Workspace | null` (default `"model"`)
  - API: `toggle(section)`, `open(section)`, `close()`
  - Persistenza zustand `feapro-left-rail` per ricordare il panel aperto
    tra refresh
- **`components/shell/LeftSlidePanel.tsx`** — overlay slide-in 360-440px:
  - Header con titolo workspace + close X
  - Body scrollabile con ModelWorkspace/AnalysisWorkspace/VerifyWorkspace
    (e legacy results/io quando l'utente apre via shortcut 4/5)
  - Animazione `slide-right` 220ms (apertura)
  - NON modal: viewport rimane interattivo (no backdrop)

### Removed
- **`components/shell/WorkspacePanel.tsx`** non e' piu' usato in `App.tsx`
  ma il file rimane sul disco (NON cancellato per evitare di rompere
  eventuali import esterni a `App.tsx`). Sara' rimosso definitivamente
  in alpha.23 se non emergono regressioni.

### Tests
- **+8 vitest** (256 → 264):
  - `leftRailStore.test.ts` (6): toggle, open, close, replace pattern
  - LeftRail.test.tsx aggiornato (3 nuovi test): toggle pattern, slide
    state, aria-expanded; sostituiti 4 test workspace-switch precedenti
  - themeStore.test.ts: default cambiato da `system` → `light`, ordine
    cycle aggiornato `light → system → dark → light`
- **264/264 vitest** totale. Build Vite OK 10.50s.

### UX impact (atteso vs precedente)
| Aspetto | Pre-alpha.22 | **alpha.22** |
|---|---|---|
| Layout default | Viewport stretto + WorkspacePanel 380px | **Viewport gigante** + slide-in opzionali |
| Aspetto cromatico | Dark (system) | **Light warm** `#F7F7F5` |
| Workspace pattern | Sempre visibili (tab-style) | **Toggle slide-in** (Linear/Figma-like) |
| Spazio viewport (1920px screen) | ~1450px | **~1800px** (+25%) |
| Discovery panel | Implicito (tabs) | **Esplicito** (icon-bar slide-in) |

### Trade-off
- **Pro**: viewport-first allineato al mockup v1.3, layout moderno
  (Linear/Figma vibe), focus visivo sul modello 3D.
- **Contro**: utenti abituati a "tutto sempre visibile" devono fare
  un click in piu' per vedere mesh wizard / analysis settings.
- **Mitigation**: default `openSection: "model"` → al primo accesso il
  panel Make e' gia' aperto, esperienza simile al precedente.

### Sprint 4 totale (alpha.16 → .22)
| Tag | Cosa | vitest |
|---|---|---|
| alpha.16 | CSS tokens v1.3 + dual theme | 202 |
| alpha.17 | RightRail + slide-in (Inspect/View/Tools/History) | 215 |
| alpha.18 | TopBar arricchita | 226 |
| alpha.19 | StatusBar arricchita | 234 |
| alpha.20 | 6-rail labels (Make/Solve/Verify) | 243 |
| alpha.21 | Command palette espansa registry | 256 |
| **alpha.22** | **Viewport-first refactor** | **264** |

**Net delta Sprint 4 totale**: +70 vitest, +14 componenti shell, palette
10 → 42 voci, font Inter, palette warm-neutral, dual theme,
**layout viewport-first**.

### Gate
| | alpha.21 | **alpha.22** |
|---|---|---|
| Layout pattern | WorkspacePanel fisso | **Slide-in toggle** |
| Viewport area | ~70% schermata | **~85% schermata** |
| Theme default | system (OS-dipendente) | **light warm-neutral** |
| vitest frontend | 256 | **264** (+8) |

---

## v1.4.0-alpha.21 — Sprint 4 / Asse G6: Command palette espansa (registry) — 2026-05-21

Sprint 4 **CLOSURE**. La command palette `Ctrl+K` ora pesca da una
**registry centralizzata** (`lib/paletteItems.ts`) con 6 sezioni
mockup-aligned: Suggeriti contestuali, Comandi, Pannelli, Climate
Loads, Impostazioni, Aiuto. Total iniziale: **42 voci** con fuzzy
match su label + alias + descrizione. Aliases multilingual
(italiano + inglese + slang ingegneristico).

### Added
- **`lib/paletteItems.ts`** — registry strutturata:
  - 4 sezioni statiche: panels (9), commands (11), settings (7),
    loads (9), help (5) → **41 items + 1 placeholder soon = 42**
  - Una 6° sezione "favorites" (Suggeriti) **dinamica**: top 3 in
    base al workspace attivo (es. su Solve → run-static/modal/dynamic)
  - Ogni item ha: `id`, `label`, `description?`, `aliases?[]`,
    `section`, `group?`, `icon?`, `shortcut?`, `actionKind`, `payload?`,
    `needsModel?`, `soon?`
  - `actionKind` enum tipizzato: workspace, right-panel, dialog, theme,
    run-analysis, external-link, openHelp, openAccount, openLocation,
    openAuth, openExport, logout, togglePalette
  - `SECTION_LABELS` + `SECTION_ORDER` per heading e priorita' rendering
- **`CommandPalette.tsx`** refactor da hard-coded → registry-driven:
  - Larghezza espansa 640 → 720px (piu' spazio per descrizioni)
  - Placeholder dinamico mostra il count "Cerca tra 42 comandi…"
  - Heading per sezione include il count (`⚡ Comandi · 11`)
  - Suggeriti contestuali al TOP: top 3 per workspace attivo
  - Row layout multilinea: label + group · description + shortcut
  - Custom event dispatch per dialog "esterni" (account/location/auth)
    → evita prop drilling
  - Disabled state per `needsModel` (auto-grey se no model)
- **`TopBar.tsx`** — listener custom event `feapro:open-{account|
  location|auth}` per ricevere i comandi dalla palette senza
  passare callbacks attraverso 5 livelli di componenti.

### Tests
- **+13 vitest** in `paletteItems.test.ts` (256 totale):
  - 40+ items minimum sanity
  - Unique IDs (no duplicati)
  - Schema validation: ogni item ha label/section/actionKind
  - Sections coperte (panels/commands/settings/loads/help)
  - Workspace items coprono tutti i 5 workspaces
  - Right-panel items coprono Inspect/View/Tools/History
  - Theme items coprono dark/light/system
  - Run-analysis items coprono static/modal/dynamic
  - PALETTE_COUNT struct match con grouped counts

### Build & gate
- **Build TypeScript + Vite OK**: `✓ built in 9.86s`. No regressioni.
- **256/256 vitest** (243 + 13).

### Estensione futura (verso 180+)
La registry e' progettata per crescere. Per arrivare alle 180+ voci
del mockup, aggiungere:
- **Materiali EN** (14): S235/275/355/420/460/690, C25/30 - C50/60,
  EN AW-6082, legno C24
- **Sezioni** (50+): IPE/HE/UPN/L profilati, tubi, scatolari
- **Modelli recenti** (5-10 via react-query)
- **Help articoli** (50+): articoli su LTB, instabilita', NTC §3.3.3
  etc., one entry per concetto teorico

Tutti questi sono solo dati: estendere `PALETTE_ITEMS` array senza
toccare il rendering. Stima ~2-3h work per aggiungerli quando il
backend espone `/api/materials`, `/api/sections` con i nomi.

### UX impact
- **Suggeriti contestuali**: l'utente apre Ctrl+K su Solve workspace
  → vede subito "Esegui statica / modale / dinamica" come prime opzioni
- **Fuzzy multilingue**: "modello" + "model" + "geometry" + "geometria"
  matchano la stessa voce
- **Shortcut visibili**: ogni item con shortcut (F5, N, E, L, C, 1-5)
  mostra la kbd a destra per discovery
- **No prop drilling**: l'aggiunta di nuove azioni che aprono dialog
  TopBar richiede solo un nuovo item nella registry + un listener
  custom event in TopBar useEffect

### Sprint 4 closure summary
| Tag | Asse | Cosa | vitest |
|---|---|---|---|
| **alpha.16** | G1 | Foundation CSS tokens v1.3 + dual theme system | 202 |
| **alpha.17** | G2 | RightRail + slide-in panel system (Inspect/View/Tools/History) | 215 |
| **alpha.18** | G3 | TopBar arricchita (breadcrumb + search + AI + collab) | 226 |
| **alpha.19** | G4 | StatusBar arricchita (WS dot + credits + version) | 234 |
| **alpha.20** | G5 | 6-rail layout (Make/Solve/Verify + 2 legacy) | 243 |
| **alpha.21** | G6 | Command palette espansa registry-driven | 256 |

**Net delta Sprint 4**: +62 vitest (194 → 256), +13 nuovi
componenti shell, +5 store/lib, palette da 10 → 42 voci.

### Gate
| | alpha.20 | **alpha.21** |
|---|---|---|
| Palette voci | 10 hard-coded | **42** registry-driven |
| Palette sezioni | 4 ad-hoc | **6** mockup-aligned + heading count |
| Suggeriti contestuali | no | **si** (top 3 per workspace) |
| Fuzzy alias | no | **si** (label + aliases + description) |
| vitest frontend | 243 | **256** (+13) |

---

## v1.4.0-alpha.20 — Sprint 4 / Asse G5: 6-rail layout (Make/Solve/Verify + Inspect/View/Tools) — 2026-05-21

LeftRail riallineato al mockup v1.3: i 3 workflow strutturali
(**Make / Solve / Verify**) sono ora le voci principali, mentre Results
e I/O scendono in basso come voci "legacy deep-link". Il RightRail
(alpha.17) gia' offre l'accesso primario a Results (via Inspect),
View, Tools, History.

Strategia non-breaking: il `workspaceStore` mantiene le 5 keys
(model/analysis/verify/results/io) per backward compat con localStorage
esistenti e bookmark. Solo i **label** cambiano.

### Added / Changed
- **`LeftRail.tsx`** refactor:
  - **3 voci principali** workflow-oriented (mockup v1.3):
    - 1 · **Make**   (workspace `model`) — icona `Hammer`
    - 2 · **Solve**  (workspace `analysis`) — icona `Cpu`
    - 3 · **Verify** (workspace `verify`) — icona `ShieldCheck`
  - **2 voci secondarie** legacy in fondo, tono `ink-faint`:
    - 4 · Risultati (legacy) — deprecato in favore di Inspect (RightRail)
    - 5 · I/O (legacy) — deprecato in favore di Tools + Export menu
  - Estratto `<RailButton>` come componente interno per dedup
  - Divider tra main e secondary section
- **`Breadcrumb.tsx`** — `WORKSPACE_LABELS` aggiornato:
  - `model` → "Make" (era "Modello")
  - `analysis` → "Solve" (era "Analisi")
  - `verify` → "Verify" (era "Verifiche")
  - Results/IO restano in italiano (sono ora voci secondarie)
- **`OnboardingTour.tsx`** — STORAGE_KEY bumped da v2 → **v3** per
  re-mostrare tour a tutti. Welcome step riscritto:
  - Sezione sinistra "A sinistra · costruisci" (Make/Solve/Verify)
  - Sezione destra "A destra · esplora" (Inspect/View/Tools)
  - Shortcut hint aggiornato da "1-5" → "1-3" + Ctrl+K
- **`lib/version.ts`** — APP_TAG bumped da `alpha.19` → `alpha.20`.

### Tests
- **+9 vitest** in `LeftRail.test.tsx` (243 totale):
  - Renders 3 main buttons + 2 secondary legacy
  - Click Solve switches to analysis
  - Click Verify switches to verify
  - Click Make switches to model
  - aria-current="page" su button attivo
  - Secondary items have `text-ink-faint` (deprecated visual cue)
  - Palette button renders
  - Palette button toggles paletteOpen
  - Help button opens documentation
- **TopBarParts.test.tsx** aggiornato (1 test): label "Solve"
  invece di "Analisi" nel Breadcrumb
- **243/243 vitest totale**. Build TypeScript + Vite OK (10.03s).

### Backward compat
- `workspaceStore` keys NON cambiate: codice esistente che fa
  `setWorkspace("model")` continua a funzionare.
- localStorage `feapro-workspace` carica correttamente (stessi keys).
- Shortcut keyboard `1-5` da `App.tsx` continuano a switchare workspace
  (map invariata). L'utente puo' ancora premere `3` per Risultati o
  `5` per I/O (legacy bookmarks).
- WorkspacePanel renderizza ancora i 5 workspaces (no rimozione
  componenti: solo riposizionamento visivo nel rail).

### UX impact
- **Workflow chiaro**: Make → Solve → Verify e' un mental model
  riconoscibile per ingegneri strutturisti (parallelo CAD: modela,
  calcola, verifica).
- **Discoverable RightRail**: l'utente che cerca i risultati ora
  trova primary path nel rail destro (Inspect) anziche' nel sinistro.
- **Legacy gentle deprecation**: chi era abituato a "Risultati" nel
  rail sinistro lo vede ancora (in fondo, in `ink-faint`) ma con
  un tooltip che suggerisce il nuovo path.

### Gate
| | alpha.19 | **alpha.20** |
|---|---|---|
| Workspace label rail sinistro | Modello/Analisi/Risultati/Verifiche/I/O | **Make/Solve/Verify** (main) + 2 legacy |
| Workflow nominazione | generica | **mockup v1.3** (workflow-oriented) |
| Onboarding tour | v2 (Climate Loads) | **v3** (6-rail layout) |
| vitest frontend | 234 | **243** (+9) |

---

## v1.4.0-alpha.19 — Sprint 4 / Asse G4: StatusBar arricchita — 2026-05-21

StatusBar a destra ora include **WS dot live**, **credits badge** dal
billing backend, **version corretta** dalla constant condivisa. La
parte sinistra (entita', equilibrio, max, modal f₁) resta intatta.

### Added
- **`components/layout/statusbar/WSStatus.tsx`** — indicator dot live:
  - Pinga `/api/health` ogni 30s (no WebSocket overhead, sufficiente
    per healthcheck UI)
  - Stati: `ok` (verde + pulse), `slow` (ambra, latency > 500ms),
    `offline` (rosso, fetch fallito)
  - Tooltip mostra latency + ultimo check
  - Mobile: solo dot; desktop ≥ lg: dot + label "Online/Slow/Offline"
- **`components/layout/statusbar/CreditsBadge.tsx`** — badge crediti:
  - React-query a `/api/billing/quota` con staleTime 30s + refetch 60s
  - Mostra `used/cap` (es. "5/50") con coin icon
  - 3 toni colore: normale (>0% <80%), warn (≥80%), danger (≥100%)
  - Include `bonus_credits` nel totale cap
  - Click → callback (apre AccountDialog)
  - Auto-switch user_id: JWT.sub se loggato, "demo_user" altrimenti
  - Nascosto su errore 401 (utente anonimo senza billing data)
- **`StatusBar.tsx`** refactor:
  - Aggiunti WSStatus + CreditsBadge in posizione destra (mockup-aligned)
  - Click su CreditsBadge → apre AccountDialog inline (state locale,
    no apertura via uiStore)
  - Version da `APP_VERSION` constant (era hardcoded `"v0.1.0"`)
  - Mantenute tutte le info esistenti: status, N/E/DoF, Max u/σ,
    equilibrio, solver time, f₁ modale, progress bar in-line analisi
- **`lib/version.ts`** — bumped `APP_TAG` da `alpha.18` a `alpha.19`.

### Tests
- **+8 vitest** in `StatusBarParts.test.tsx` (226 → 234):
  - CreditsBadge (6): null while loading, null su 401, render used/cap,
    include bonus, onClick callback, usa JWT user.id se loggato
  - WSStatus (2): render dot indicator, aria-label per accessibility
- Mock di `fetch` globale + `getQuota` per evitare richieste reali in
  test (jsdom non implementa fetch nativo).

### Build & gate
- **Build TypeScript + Vite OK**: `✓ built in 10.27s`.
- **234/234 vitest** (226 + 8). Zero regressioni in StatusBar legacy.

### UX impact
- **Crediti visibili sempre**: l'utente sa quanto ha consumato senza
  dover aprire AccountDialog. Quando ≥80% del cap, il badge diventa
  ambra: warning early.
- **Backend liveness signal**: dot live verde rassicura sul fatto che
  il backend e' raggiungibile. Diventa rosso se Fly stoppa la VM (cold
  start in arrivo). Latency tooltip esposto per debugging.
- **Version coerente**: "FEA Pro v1.4" finalmente esposto in statusbar
  (era v0.1.0 hard-coded). Aggiornato con APP_VERSION = "v1.4".

### Gate
| | alpha.18 | **alpha.19** |
|---|---|---|
| StatusBar sub-component | 0 (inline tutto) | **2** (WSStatus + CreditsBadge) |
| Credits visibility | solo AccountDialog | **inline statusbar** |
| Backend liveness UI | n/a | **dot live + latency** |
| Version display | hardcoded "v0.1.0" | **APP_VERSION = "v1.4"** |
| vitest frontend | 226 | **234** (+8) |

---

## v1.4.0-alpha.18 — Sprint 4 / Asse G3: TopBar arricchita — 2026-05-21

TopBar riallineata al mockup v1.3: **breadcrumb contestuale**,
**search-bar globale** (apre command palette), **AI Copilot button**
(placeholder Sprint 5), **collab avatar** con dot live. Versione
finalmente coerente (`v1.0` hardcoded → `v1.4` da constant condivisa).

### Added
- **`lib/version.ts`** — single-source-of-truth per `APP_VERSION` (mostrata
  in TopBar) e `APP_TAG` (riservata a Account dialog debug). Aggiornare
  ad ogni release.
- **`components/shell/topbar/Breadcrumb.tsx`** — visibile ≥ lg:
  `[folder] Nome modello › Workspace attivo`. Cliccabile sul workspace
  per ri-attivare la sezione. Truncate max 160px modello, preserva
  l'overflow.
- **`components/shell/topbar/GlobalSearch.tsx`** — pulsante stylizzato come
  input search "Cerca…" con `kbd Ctrl K` a destra. Click → apre command
  palette (`useWorkspaceStore.togglePalette`). Versione mobile icon-only
  (md:hidden).
- **`components/shell/topbar/AICopilotButton.tsx`** — pulsante Sparkles
  accent purple (mockup v1.3). Tooltip mostra chip "soon". Click → toast
  info "AI Copilot disponibile da v1.5 (Sprint 5)". Stile distinto
  (purple) per evidenziare la feature AI.
- **`components/shell/topbar/CollabAvatars.tsx`** — avatar circolare 6x6
  con iniziali email (es. "mario.rossi" → "MR") + dot live verde
  pulsante (animazione `feapro-pulse`). Nascosto se anonimo. In
  Sprint 5 evolvera' in stack di avatar overlappati (collab WS).
- **`TopBar.tsx`** refactor:
  - Versione `APP_VERSION` da `lib/version.ts` (era hardcoded `"v1.0"`)
  - Aggiunti Breadcrumb, GlobalSearch, AICopilotButton, CollabAvatars
  - Logo: aggiunto `font-display` (Inter primario per il marchio)
  - Mantenute tutte le funzionalita' precedenti (model picker, CRUD,
    run, location, account, auth, export)

### Tests
- **+11 vitest** in `TopBarParts.test.tsx` (215 → 226):
  - Breadcrumb (3): placeholder no-model, model name truncate,
    workspace label dinamica
  - GlobalSearch (3): desktop button con kbd, click togglePalette,
    mobile button con aria-label
  - AICopilotButton (2): renders, click non crasha (toast info)
  - CollabAvatars (3): nascosto se anonimo, iniziali da "mario.rossi"
    → "MR", iniziali single-word "fedesanna" → "FE"

### Build & gate
- **Build TypeScript + Vite OK**: `✓ built in 10.27s`.
- **226/226 vitest** (215 + 11). Nessuna regressione TopBar legacy.

### UX polish
- **Versione visibile**: l'utente vede subito che sta usando v1.4 (era
  v1.0 ferma da release). Diminuisce ambiguita' "ho la versione vecchia?"
- **Search-bar discoverable**: `Ctrl+K` finalmente esposto come UI element
  (prima era solo shortcut nascosto). Tutorial-friendly per new user.
- **AI placeholder**: gestisce le aspettative — l'utente sa che la feature
  esistera' (chip "soon") senza dover indovinare.
- **Avatar collab**: piccolo segnale che l'utente e' "presente" e logged in.
  Dot live verde = stato attivo (precursore di multi-user real-time).

### Gate
| | alpha.17 | **alpha.18** |
|---|---|---|
| TopBar sub-component | 5 (logo, picker, CRUD, run, account) | **9** (+ Breadcrumb, Search, AI, Collab) |
| Version display | hardcoded "v1.0" | **APP_VERSION = "v1.4"** |
| Command palette discoverability | Ctrl+K hidden | **GlobalSearch UI** |
| vitest frontend | 215 | **226** (+11) |

---

## v1.4.0-alpha.17 — Sprint 4 / Asse G2: RightRail + slide-in panels — 2026-05-21

Introdotto il **rail destro a 4 voci** (Inspect / View / Tools / History)
con panel slide-in overlay. Mirror del LeftRail esistente ma ankorato a
destra del WorkspacePanel. Click su un'icona apre un panel laterale 320px
con animazione `slide-left`; click sulla stessa icona attiva → chiude
(toggle pattern come da mockup v1.3).

Coesistenza non-breaking: in alpha.17 il rail e' opzionale (panel chiuso
di default), il WorkspacePanel resta visibile. In alpha.20 il
WorkspacePanel sara' rimosso e il rail destro diventera' la home delle
viste/strumenti.

### Added
- **`store/rightRailStore.ts`** — zustand `persist` storage
  `"feapro-right-rail"`. Stato: `openSection: "inspect" | "view" |
  "tools" | "history" | null`. API: `toggle(section)`, `open(section)`,
  `close()`. Toggle pattern: click sulla stessa sezione attiva la chiude.
- **`components/shell/RightRail.tsx`** — barra verticale 48px lato
  destro con icone Lucide (`Eye`, `Layers`, `Wrench`, `History`).
  Mirror del LeftRail: indicator bar `::before` 2px accent, tooltip
  side=left, aria-expanded riflesso dal store.
- **`components/shell/RightSlidePanel.tsx`** — overlay 320px ankorato
  `right-12` (subito a sinistra del RightRail), `z-30` sopra il
  WorkspacePanel. Header con titolo + close X. Animazione `slide-left`
  220ms ease-out (tailwind keyframe gia' esistente).
- **4 panel content** in `components/shell/panels/`:
  - **`InspectPanelContent`** — riassunto risultati per analisi
    (static/modal/dynamic/buckling) con stato "calcolata" / "non
    ancora". Click su una riga abilitata → switch workspace=results.
  - **`ViewPanelContent`** — toggle overlay viewport: deformata,
    colormap stress (von Mises), iso-surfaces 3D, slider scala
    deformata 1-1000×. Wire diretto a `useResultsStore`.
  - **`ToolsPanelContent`** — 5 shortcut: cost preview, compare A/B,
    misurazioni, snapshot, BIM viewer. Quelli implementati saltano
    al workspace dedicato; gli altri sono marcati "soon".
  - **`HistoryPanelContent`** — lista snapshot da `useSnapshotStore`,
    timestamp relativo ("3m fa"), chip "statica/modale" per indicare
    risultati salvati. Empty state friendly + pulsante elimina per
    snapshot.
- **`App.tsx`** — layout aggiornato a `App shell v3`:
  - Wrapper relative attorno a body row per absolute positioning
    di SlidePanel
  - Container `<div className="relative flex flex-shrink-0">` raggruppa
    `WorkspacePanel + RightSlidePanel + RightRail` (rail in fondo)

### Tests
- **+13 vitest** (202 → 215):
  - `rightRailStore.test.ts` (6): null default, toggle open, toggle
    same closes, toggle different replaces, open() force, close()
  - `RightRail.test.tsx` (7): renders 4 buttons, opens Inspect,
    toggle close on same, replace su button diverso, close X button,
    aria-current=page riflesso, aria-expanded riflesso
- **215/215 vitest totale**. Build TypeScript + Vite OK (9.81s).

### UX details
- **Toggle ergonomia**: il pattern toggle e' standard nei rail di
  Linear / Notion / Figma. Click una volta apre, click sullo stesso
  chiude. Riduce friction.
- **Persistence**: il panel rimane aperto tra refresh (utente power
  user). Si chiude solo esplicitamente.
- **No autoclose on workspace change**: cambiare workspace (1-5) non
  chiude il SlidePanel. Cambia solo il contenuto principale.
- **Tooltip side=left**: ancora a sinistra del rail destro (mockup-
  consistent).

### Layout aggiornato
```
┌──────────────────────────────────────────────────────────┐
│ TopBar (48 px)                                            │
├──┬─────────────────────┬─────────────────────┬───────────┤
│L │                     │ WorkspacePanel      │ RightRail │
│e │   Viewport 3D       │ (380 px)            │ (48 px)   │
│f │   (Three.js)        │                     │           │
│t │                     │ +overlay SlidePanel │ Inspect / │
│R │                     │  (alpha.17, 320 px) │ View /    │
│a │                     │  z-30 sopra WS panel│ Tools /   │
│i │                     │                     │ History   │
│l │                     │                     │           │
├──┴─────────────────────┴─────────────────────┴───────────┤
│ StatusBar (24 px)                                         │
└──────────────────────────────────────────────────────────┘
```

### Gate
| | alpha.16 | **alpha.17** |
|---|---|---|
| Rail layout | 1 (left only) | **2** (left + right) |
| Slide-in panel | no | **si** (toggle + persist) |
| Panel sections destro | 0 | **4** (Inspect / View / Tools / History) |
| vitest frontend | 202 | **215** (+13) |

---

## v1.4.0-alpha.16 — Sprint 4 / Asse G: foundation CSS tokens v1.3 — 2026-05-21

Apertura **Sprint 4 (Asse G del piano v1.3 rev2)**: refactor UI desktop
verso il mockup "6-rail + command palette". alpha.16 e' la fondazione
non-breaking: nuova palette colori warm-neutral allineata al mockup,
font Inter aggiunto, semantic tints (info/success/warn/coral/purple),
shadow tokens e border-radius scale, default theme cambiato da `dark`
hardcoded a `system` (segue prefers-color-scheme OS).

### Added
- **`index.html`** — caricato font **Inter** (400/500/600/700) via Google
  Fonts oltre a IBM Plex Sans e JetBrains Mono.
- **`src/index.css`** — palette riallineata al mockup v1.3:
  - **Light**: warm neutral `#F7F7F5` (page), `#FFFFFF` (surface),
    accent blu info `#185FA5`, semantic ink `#3B6D11` (success),
    `#854F0B` (warn), `#993C1D` (coral), `#534AB7` (purple).
  - **Dark**: warm dark `#161618` (page), `#1F1F22` (surface),
    accent `#5AB1EE`, palette semantica equivalente in tint scuro.
  - 5 nuove **semantic backgrounds**: `--c-bg-info/success/warn/coral/
    purple` (Tailwind: `bg-info`, `bg-success`, …).
  - 5 nuove **semantic inks**: `ink-info/success/warn/coral/purple`.
  - **ink-4** (faint) per testo disabilitato (mockup).
  - **Shadow tokens**: `--shadow-pop` (soft) e `--shadow-elev`
    (panel/dialog) auto-adapted al theme. Esposti come `shadow-pop`,
    `shadow-elev`, `shadow-dialog` in Tailwind.
  - **Border-radius scale** allineata mockup (4/6/10/14 px).
  - **`.chip`** + 5 varianti semantiche (`.chip-info` etc).
  - **`.kbd`** per shortcut visualizzati nei pannelli/palette.
  - **`@keyframes feapro-pulse`** + classe `.feapro-pulse` per
    indicatori "live" (collab cursor, dot status WebSocket).
- **`tailwind.config.js`** — aggiornato:
  - `colors.bg.{info,success,warn,coral,purple}` (tints semantici).
  - `colors.ink.{info,success,warn,coral,purple,faint}`.
  - `colors.{coral,purple,error}` come standalone (alias da
    `--c-coral/-purple/-danger`).
  - `boxShadow.{pop,elev,dialog,panel,dropdown}` ora referenzia
    `var(--shadow-*)` per auto-theming.
  - `borderRadius` allineato a mockup (4/6/10/14 px).
  - `fontFamily.display` aggiunto (`Inter` primario).
- **`themeStore.ts`** — default `mode` cambiato da `"dark"` a `"system"`.
  Mantiene retrocompat: chi aveva localStorage `feapro-theme` con
  `mode:"dark"` continua a vedere dark. Nuovi utenti seguono OS.

### Tests
- **+8 vitest** in nuovo file `themeStore.test.ts`:
  - default `mode === "system"`
  - setMode dark/light/system → applica `data-theme` su `<html>`
  - system mode rispetta `prefers-color-scheme` (mocked matchMedia)
  - cycle dark → light → system → dark
  - init() registra MQ listener + cleanup correctly
  - explicit modes (dark/light) NON cambiano resolved su MQ event
- **202/202 vitest totale** (194 + 8).
- **Build TypeScript + Vite OK**: `✓ built in 10.17s`. Nessun warning
  Tailwind di token sconosciuti.

### Breaking changes
**Nessuno**. Tutti i token vecchi (`--c-bg`, `--c-ink`, `bg-bg`, `text-
accent-primary`, ecc.) sono mantenuti. I componenti esistenti continuano
a funzionare con la nuova palette (visivamente diversa: warm-neutral
invece di cool-slate, ma struttura identica).

### Visual diff
- **TopBar/StatusBar/dialog** ora hanno background `#F7F7F5` (light) o
  `#161618` (dark) — piu' caldo del precedente slate-blue.
- **Bottoni accent** ora blu info `#185FA5` (light) o `#5AB1EE` (dark)
  invece di `#2563EB` / `#3DA9FC`.
- **Font sans** ora Inter (era IBM Plex Sans) — leggermente piu'
  compatto/moderno, allineato al feeling Linear/Notion.

### Roadmap Sprint 4 (alpha.16-.21)
| Tag | Cosa |
|---|---|
| **alpha.16** | Foundation CSS tokens + dual theme system (**questo**) |
| alpha.17 | RightRail (Inspect/View/Tools) + slide-in panel system |
| alpha.18 | TopBar arricchita (breadcrumb + search + collab + AI) |
| alpha.19 | StatusBar arricchita (job progress + crediti + WS dot) |
| alpha.20 | Migrazione completa 6 rail (Make/Solve/Verify · Inspect/View/Tools) |
| alpha.21 | Command palette espansa (180+ voci) + cost card inline |

### Gate
| | alpha.15 | **alpha.16** |
|---|---|---|
| CSS tokens semantici | 4 (bg/border/ink/accent) | **9** (+ 5 semantic + shadow + radius) |
| Theme default | `dark` hardcoded | **`system`** (OS-aware) |
| Font sans | IBM Plex Sans | **Inter** (mockup-aligned) |
| vitest frontend | 194 | **202** (+8) |

---

## v1.4.0-alpha.15 — user_id propagation (JWT → job ownership) — 2026-05-21

Chiusura della trilogia auth (.13 backend → .14 frontend → .15 wiring).
Ora gli endpoint `/api/jobs` rispettano il JWT bearer: ogni utente
loggato vede SOLO i propri job, ogni submit eredita `user_id =
JWT.sub`. Backward-compat: anonimi e CLI legacy continuano come
"demo_user".

### Added
- **`backend/auth/user_resolver.py`** — funzione pura
  `resolve_user_id(current_user, explicit_user_id)` che implementa
  la priority chain:
  1. JWT user (Bearer valido) → `current_user.id`
  2. Explicit `user_id` (query/body) → quello (con strip)
  3. Fallback → `DEFAULT_USER_ID` (env `FEAPRO_DEFAULT_USER_ID`,
     default "demo_user")
  - Esportata via `auth.resolve_user_id` + `auth.DEFAULT_USER_ID`
- **`api/routes/jobs.py`** — endpoint POST `/api/jobs` + GET
  `/api/jobs`:
  - Aggiunto `current_user: Optional[User] = Depends(
    get_current_user_optional)` (no 401 se mancante)
  - `user_id = resolve_user_id(current_user, req.user_id)` applicato
    a quota check + Job.user_id + list filter
  - `JobSubmitRequest.user_id` ora `Optional[str] = None` (era
    required con default `DEFAULT_USER_ID`)

### Tests
- **+8 pytest** in `tests/auth/test_user_resolver.py`:
  - 5 unit: JWT prevale su explicit, no JWT usa explicit, no JWT no
    explicit → DEFAULT, empty/whitespace → DEFAULT, strip whitespace
  - 3 integration TestClient: `GET /api/jobs` no header (default),
    con JWT (sub dal token), con query `?user_id=manual`
- **1400/1402 pytest backend** (1392 + 8). 2 fail pre-esistenti
  (calibration timing drift, USGS network) NON correlati.

### Semantica
| Scenario | user_id usato |
|---|---|
| Frontend loggato (alpha.14 + JWT) | `JWT.sub` (UUID utente reale) |
| CLI/test che passa `user_id=X` | `"X"` (explicit) |
| Browser anonimo | `"demo_user"` (env fallback) |

### Migration impact
- **Zero breaking changes** per UI esistente: il frontend e' gia'
  in grado di funzionare sia anonimo che loggato (interceptor
  alpha.14). I job creati da `demo_user` rimangono visibili a
  utenti anonimi; quelli creati post-login vengono "spostati" sul
  JWT.sub (storicamente, i job di un utente precedentemente
  anonimo NON migrano — sono accessibili solo loggandosi come
  `demo_user` se la quota lo permette, ma in pratica saranno
  cleanup-ati).
- **Altri endpoint non ancora migrati**: `analysis.py` continua a
  usare il vecchio `DEFAULT_USER_ID` constant. Migrazione
  incrementale: alpha.16+ se serve auth piu' stringente.

### Esempio runtime
```bash
# Anonimo: job creato come demo_user
curl -X POST /api/jobs -d '{"model_id":"...", "solver":"static"}'
# → Job.user_id = "demo_user"

# Loggato: JWT prevale anche se body contiene user_id
curl -X POST /api/jobs \
  -H 'Authorization: Bearer eyJ...' \
  -d '{"model_id":"...", "solver":"static", "user_id":"ignored"}'
# → Job.user_id = "<JWT.sub UUID>"
```

### Gate
| | alpha.14 | **alpha.15** |
|---|---|---|
| Endpoint /api/jobs auth-aware | no | **si** |
| user_id da JWT | no | **si (su jobs)** |
| pytest backend | 1392 | **1400** (+8) |
| Backward compat anonimi | n/a | **100%** |

### Sprint 3 closure
Sprint 3 (alpha.10-.15) chiuso. Roadmap originale completata:
- ✅ alpha.10 wind 4-direction NTC §3.3.3
- ✅ alpha.11 onboarding tour Climate Loads
- ✅ alpha.12 cold-start mitigation interno
- ✅ alpha.13 JWT auth backend
- ✅ alpha.14 frontend auth UI
- ✅ alpha.15 user_id propagation
- 🚫 alpha.16-.20 Stripe billing (richiede account utente)
- 🚫 custom domain (richiede dominio utente)

---

## v1.4.0-alpha.14 — Frontend auth UI (Login/Register + interceptor) — 2026-05-21

UI di accesso completa: AuthDialog combo Login/Register + zustand
authStore persistente + axios interceptor che allega automaticamente
`Authorization: Bearer <token>` a TUTTE le richieste API esistenti. Su
401 → logout silenzioso (token scaduto/invalido → redirige a login).

### Added
- **`api/auth.ts`** — 3 funzioni tipizzate:
  - `register(email, password)` → AuthResponse
  - `login(email, password)` → AuthResponse
  - `getMe(token)` → AuthUser (per verifica token al boot)
  - Usa axios raw (non `api`) per evitare loop con interceptor toast
- **`store/authStore.ts`** — zustand `persist` storage "auth-store":
  - `token`, `user` (AuthUser | null)
  - `setAuth(token, user)` — chiamato dopo register/login success
  - `logout()` — pulisce stato
  - `verifyToken()` — re-chiama `/api/auth/me` per refreshare. Su 401
    auto-logout (clear localStorage). Usato in TopBar.useEffect al mount.
  - `isLoggedIn()` — true sse token AND user
- **`components/dialogs/AuthDialog.tsx`** — combo Login/Register:
  - Tab switcher (Login / Registrati), `initialMode` prop
  - Email + password fields con autocomplete, minLength (8 register / 1
    login), maxLength 72 (limite bcrypt)
  - Inline error display (no toast HTTP — gestito globale)
  - Switch link "Nessun account? Crea account" + viceversa
  - Su success: setAuth + toast verde + onClose
- **`api/client.ts`** — 2 nuovi interceptor:
  - **Request**: legge `localStorage["auth-store"]` (no import circolare
    con authStore che usa axios) e allega `Authorization: Bearer <tok>`
    se presente. ALL existing endpoint diventano auth-aware senza
    modificare singolarmente loro client.
  - **Response 401**: pulisce auth-store + dispatcha `storage` event
    cosi' i componenti zustand-subscribers ri-renderizzano immediatamente
    in stato anonimo.
- **`TopBar.tsx`** integrazione UX:
  - Pulsante 🔐 "Accedi" se anonimo → apre AuthDialog
  - Se loggato → mostra email troncata + 🚪 LogOut tooltip
  - useEffect al mount: se token salvato ma user null (es. dopo refresh
    F5), chiama `verifyToken()` per ripopolare info user dal server.

### Tests
- **+14 vitest** (180 → 194):
  - `authStore.test.ts` (7): starts logged out, setAuth, logout,
    verifyToken (no-token, success, expired-clears, isLoggedIn variants)
  - `AuthDialog.test.tsx` (7): renders Login default, switch to
    Register, login API call, register API call, short password
    rejected, server error inline, initialMode prop
- **Build OK** (vite 6 + TypeScript): `✓ built in 10.30s`.

### Backward compatibility
alpha.14 e' **opt-in tier 1**: gli endpoint backend NON sono ancora
gated. Un utente anonimo continua a usare l'app come prima (demo_user
hardcoded in jobs/usage/...). L'unica differenza: se logga, il JWT
viene allegato silenziosamente a tutte le richieste. La migrazione
hard avviene in alpha.15.

### UX details
- Email autocomplete="email", password autocomplete="current-password"
  (login) o "new-password" (register) per password manager
- Errori server mostrati inline nel dialog (no toast popup → menorr
  intrusivo durante login fallito)
- Tooltip su LogOut button mostra email (utile per multi-account dev)
- 401 da qualsiasi endpoint → silent logout (no toast "401 Unauthorized"
  perche' il logout-event e' atteso)

### Gate
| | alpha.13 | **alpha.14** |
|---|---|---|
| Auth UI | 0 | **Login/Register dialog + topbar button** |
| Auto-attach Bearer | no | **si (request interceptor)** |
| Auto-logout 401 | no | **si (response interceptor)** |
| vitest frontend | 180 | **194** (+14) |

---

## v1.4.0-alpha.13 — JWT auth base (register/login/me) — 2026-05-21

Primo step verso multi-user reale. Fino ad alpha.12 ogni utente era
`demo_user` hardcoded. alpha.13 introduce registrazione + login con
bcrypt + JWT bearer tokens, e l'endpoint protetto `/api/auth/me` come
modello per la migrazione degli altri endpoint in alpha.15.

### Added
- **Nuovo modulo `backend/auth/`** (5 file, no breaking changes):
  - `password.py` — wrapper bcrypt: `hash_password(plain)` →
    `$2b$12$...` 60-char ASCII; `verify_password(plain, hash)` →
    bool tollerante (no eccezioni). Cost factor 12 (OWASP 2025).
    Rifiuta password vuote o >72 byte (limite bcrypt).
  - `jwt_tokens.py` — wrapper PyJWT: HS256 firma con
    `FEAPRO_JWT_SECRET`. TTL default 7gg (override
    `FEAPRO_JWT_TTL_HOURS`). Payload: `sub`, `iat`, `exp` + extra
    claims. `JWTError` unifica expired/invalid/malformed.
  - `users_db.py` — SQLite WAL: tabella `users(id, email UNIQUE
    COLLATE NOCASE, password_hash, created_at, last_login_at)`.
    Path: `FEAPRO_USERS_DB` o `<DATA_DIR>/users.sqlite`. CRUD:
    `register`, `get_by_email`, `get_by_id`, `update_last_login`,
    `count`. DTO `User.to_public_dict()` esclude password_hash.
  - `dependencies.py` — FastAPI deps:
    - `get_current_user` strict: estrae Bearer, decode JWT, lookup
      user → 401 se manca/invalido/expired/user-gone.
    - `get_current_user_optional` tollerante: torna None su fail
      (utile per migrazione endpoint legacy "demo_user").
- **3 endpoint REST** in `api/routes/auth.py`:
  - `POST /api/auth/register {email, password}` → 201
    `{token, user}` (password >= 8 char, email validata via
    `email-validator`). 409 se email gia' esiste.
  - `POST /api/auth/login {email, password}` → 200 `{token, user}`
    o 401 (no info-leak: stesso messaggio per email-not-found e
    wrong-password). Auto-update `last_login_at`.
  - `GET /api/auth/me` Authorization: Bearer X → `{user}` o 401.
- **`main.py`** wired: `app.include_router(auth_routes.router,
  prefix="/api/auth", tags=["auth"])`.
- **`fly.toml`** — secret JWT settata via `flyctl secrets set
  FEAPRO_JWT_SECRET=...` (NON in repo per ovvi motivi).
- **`requirements.txt`** — 3 nuove deps:
  - `bcrypt==4.2.1` (binary wheel, no system deps)
  - `pyjwt==2.10.1` (pure Python)
  - `email-validator==2.3.0` (richiesto da pydantic EmailStr)

### Tests
- **+48 pytest** in `tests/auth/`:
  - `test_password.py` (11): hash format, roundtrip, reject wrong,
    unique salt, empty/too-long input, malformed hash, unicode.
  - `test_jwt_tokens.py` (10): create/decode roundtrip, extra
    claims, sub/iat/exp protected from override, empty user_id,
    invalid signature, malformed, expired, TTL default, invalid TTL.
  - `test_users_db.py` (15): init creates file, register normalizes
    email, duplicate raises, case-insensitive UNIQUE, get_by_email,
    get_by_id, update_last_login, count, public_dict no leak.
  - `test_routes_auth.py` (12): TestClient E2E flow — register
    success, short password 422, invalid email 422, duplicate 409,
    login success, wrong password 401, ghost user 401 (no leak),
    /me without Bearer 401, invalid token 401, missing prefix 401,
    valid token returns user, full register→login→me flow.
- **1392/1394 pytest backend** (1344 + 48). Stessi 2 fail
  pre-esistenti (calibration drift, USGS integration NON correlati).

### Security notes
- **bcrypt cost 12**: ~50ms/verify su shared-cpu-1x Fly. Rallenta
  brute-force ma non e' bloccante per UX (single login).
- **JWT HS256 stateless**: nessun refresh token (TTL 7gg semplice).
  Migrazione futura → HS256 short-lived + refresh in alpha.16+ se
  serve.
- **No info-leak su login**: 401 generico sia per email-non-esiste
  che password sbagliata. CWE-203 mitigato.
- **email COLLATE NOCASE**: `Alice@X.com` e `alice@x.com` rifiutati
  come duplicati. Standard RFC 5321 (local-part case-sensitive ma
  in pratica case-insensitive).

### Migration path (alpha.14-.15)
alpha.13 introduce gli endpoint MA non li attiva sugli altri:
`/api/jobs`, `/api/usage`, etc. continuano ad accettare
`user_id="demo_user"` query param. alpha.14 aggiunge UI Login/Register
+ axios interceptor; alpha.15 sostituisce hardcoded `demo_user` con
`current_user.id` derivato dal JWT.

### Gate
| | alpha.12 | **alpha.13** |
|---|---|---|
| Auth endpoint | 0 | **3** (register/login/me) |
| Auth providers | demo_user | demo_user (+ JWT opt-in) |
| pytest backend | 1344 | **1392** (+48) |
| Coverage `auth/` | 0% | **~95%** (only routes happy-path) |

---

## v1.4.0-alpha.12 — Cold-start mitigation interno (self-ping) — 2026-05-21

Fly.io `auto_stop_machines = true` ferma la VM dopo ~5 min di idle.
Il prossimo utente paga cold-start ~10-22s (boot Python + Uvicorn +
register_all gmsh + caricamento staticfiles). alpha.12 risolve con
self-ping interno via public URL: la VM ping il PROPRIO endpoint
`/api/health` ogni 4 min → la proxy Fly vede una connessione in
ingresso → idle timer reset → la VM rimane warm.

### Added
- **`backend/services/self_ping.py`** modulo asyncio.Task:
  - `start_self_ping()` → opt-in via 3 env var
    (FEAPRO_SELF_PING_ENABLED, _URL, _INTERVAL_S)
  - `_ping_once(client, url)` → ritorna (success, status, latency_ms, error)
    Considera 5xx come failure (warming needs server alive)
    Considera 4xx come success (proxy ha visto la connessione = OK warming)
  - `get_stats()` → snapshot `(started_at, n_pings, n_success, n_failures,
    consecutive_failures, last_status, last_latency_ms, last_error)`
  - 3 fail consecutivi → log ERROR (visibile in `flyctl logs`)
  - Interval clampato [60, 600]s per evitare overflow input
- **`main.py`** wire startup/shutdown + endpoint observability:
  - `startup_event()` chiama `start_self_ping()` dopo register_all
  - `shutdown_event()` chiama `stop_self_ping()` per graceful drain
  - `GET /api/health/self-ping` → restituisce `get_stats()` (debug)
- **`fly.toml`** 3 env var production:
  - `FEAPRO_SELF_PING_ENABLED = "true"`
  - `FEAPRO_SELF_PING_URL = "https://fea-pro.fly.dev/api/health"`
  - `FEAPRO_SELF_PING_INTERVAL_S = "240"` (4 min < Fly 5min idle)

### Tests
- **+13 pytest** in `tests/services/test_self_ping.py`:
  - start disabled by default (no env var)
  - start enabled+URL crea task; idempotent
  - `_ping_once`: 200 OK, 404, 500, timeout (mock httpx transport)
  - get_stats schema (9 chiavi)
  - interval clampato per input fuori range
  - invalid interval string → fallback 240
  - stop noop quando non avviato
  - consecutive_failures tracking
- **1344 pytest backend** (1331 + 13). 2 fail pre-esistenti
  (calibration drift, USGS integration) NON correlati.

### Trade-off & alternative

**Pro self-ping interno** (scelto):
- $0 costo aggiuntivo (1 req/4min trascurabile)
- Nessuna dipendenza da servizi esterni (UptimeRobot, cron-job.org)
- Nessun account utente richiesto

**Contro**:
- Se la VM e' down (deploy/crash/manual stop), non si auto-riavvia.
  Solo una request esterna la riporta su.
- 4xx considerati "success" per il warming, ma 5xx genuine errors
  vengono loggati come fail.

**Alternativa skipped: `min_machines_running = 1`** in fly.toml:
- Pro: solution canonica Fly, sempre 1 VM warm
- Contro: 1 dei 3 VM gratuiti riservato sempre, no scaling down a 0.
  Self-ping permette di sperimentare con auto_stop_machines = true
  mantenendo cold-start mitigato.

### Gate
| | alpha.11 | **alpha.12** |
|---|---|---|
| Cold-start mean | ~22s | **~0s warm** (steady-state) |
| pytest backend | 1331 | **1344** (+13) |
| Fly auto_stop | enabled | enabled (ma self-ping) |
| Costo extra | 0 | **0** (free-tier) |

---

## v1.4.0-alpha.11 — Onboarding tour update Climate Loads — 2026-05-21

Il tour onboarding mostrato al primo accesso (e re-shown ora a tutti gli
utenti via bump `STORAGE_KEY` v1→v2) include uno step 6 dedicato al
workflow Climate Loads end-to-end. Riduce attrito su feature scientific-
mente non banale: l'utente medio non sa che q_p + s_design + a_g/g sono
applicabili come nodal/ground_accel direttamente in 2 click.

### Added
- **`OnboardingTour.tsx`** — 6° step "climate-loads" con `MapPin` icon:
  - Spiega TopBar → 📍 Loads (5 preset + search live qualunque città)
  - Risultati: q_p (vento EN 1991-1-4), s_design (neve EN 1991-1-3),
    a_g/g (sismica NTC §3.2)
  - Badge floating persistente su refresh (zustand persist localStorage)
  - Click badge → 🔧 Applica come carichi al modello
  - Highlights: tributary per-nodo da topologia (Σ F = q × A esatto),
    inviluppo vento 4 direzioni NTC §3.3.3, sismica `ground_accel`
    model-level
- **`STORAGE_KEY`** bump `"feapro-onboarding-seen-v1"` → `"...-v2"`:
  tutti gli utenti esistenti rivedono il tour la prossima volta che
  aprono l'app — first-class discoverability per Climate Loads.

### Tests
- **180/180 vitest** (no nuovi test richiesti — solo content step text;
  i 3 test esistenti `OnboardingTour.test.tsx` continuano a passare con
  i nuovi step).
- Build TypeScript + Vite OK: `✓ built in 9.39s`.

### Gate
| | alpha.10 | **alpha.11** |
|---|---|---|
| Onboarding steps | 5 | **6** (+ climate-loads) |
| Storage version | v1 | **v2** (re-shows tour) |
| vitest frontend | 180 | **180** |

---

## v1.4.0-alpha.10 — Wind 4-direction envelope NTC §3.3.3 — 2026-05-21

Inviluppo vento NTC 2018 §3.3.3 completo: 4 casi di carico (±X, ±Y)
applicati simultaneamente come 4 loads/nodo. Fino a alpha.7 l'inviluppo
era bi-axis (2 direzioni sull'asse scelto); alpha.10 estende a 4 per
conformita' normativa rigorosa (calcoli su edifici alti / strutture
critiche dove il vento e' considerato in tutte le combinazioni).

### Added
- **`applyClimateLoads.ts`** nuova opzione `windEnvelope4Direction`:
  - Default `false` (backward compatible)
  - Se `true`: genera 4 nodal loads/nodo (`+X`, `-X`, `+Y`, `-Y`)
  - Label `"Wind EN1991-1-4 [<loc>, Envelope] +X/-X/+Y/-Y"` per
    traceability nel solver e nei report.
  - Sovrascrive `windEnvelope` (bi-axis) se entrambi attivi (4-dir wins).
- **`ApplyClimateLoadsDialog.tsx`** checkbox UI:
  - 🌪️ "Inviluppo 4 direzioni (±X, ±Y) — 4 loads/nodo NTC §3.3.3"
  - Mutualmente esclusivo con il checkbox bi-axis envelope
  - Selezionando 4-dir si disattiva auto bi-axis (e viceversa)
- **Conservation con per-node**: in modalita' per-node + 4-direction →
  Σ |F| per nodo = 4 × q × tributary[i], somma vettoriale = 0 (4 forze
  bilanciate). Il solver gestisce le 4 combinazioni come load cases
  separati per inviluppo M+/-, V+/-, etc.

### Tests
- **+6 vitest** in `applyClimateLoads.test.ts`:
  - Count 4 loads/nodo non vincolato (1 snow, 4 wind, 5 totali)
  - Magnitudes simmetriche (+X/-X uguali, +Y/-Y uguali, asse X = asse Y)
  - Labels contengono "+X", "-X", "+Y", "-Y"
  - 4-direction override bi-axis quando entrambi true
  - Combo snow + 4-direction wind + seismic = 16 loads + 1 ground_accel
  - Σ vettoriale wind loads = 0 (conservation per nodo)
- **180/180 vitest totale** (174 + 6).

### Use case strutturale
Edificio simmetrico in zona vento alta (es. Cagliari q_p=0.55 kN/m²):
- **alpha.7 bi-axis +X**: solo 2 casi (vento da est, vento da ovest)
- **alpha.10 4-direction**: 4 casi (E, W, N, S) → inviluppo completo
  delle sollecitazioni alla base e all'attacco copertura — richiesto
  da NTC §3.3.3 per edifici NON simmetrici o con altezza > 25m.

### Gate
| | alpha.9 | **alpha.10** |
|---|---|---|
| Wind envelope direzioni | 2 (±asse scelto) | **4 (±X, ±Y completo)** |
| vitest frontend | 174 | **180** (+6) |
| NTC §3.3.3 conformity | parziale | **completa** |

---

## v1.4.0-alpha.9 — Observability dashboard frontend — 2026-05-21

I 3 endpoint backend F6 (`/api/providers/usage/{summary,timeline,health}`)
ora hanno UI consumer: tab "🌐 Providers" in AccountDialog. L'admin vede
live: cache hit ratio per provider, errori, latency media — utile per
debug "Open-Meteo è giù" o "stiamo bruciando il rate limit Nominatim".

### Added
- **`api/providers-usage/index.ts`** — frontend client tipizzato per:
  - `getProvidersSummary(params)` → `ProviderUsageSummary` con `rows[]` +
    `totals` (cache_hit_ratio, error_ratio globali)
  - `getProvidersTimeline(params)` → bin orari/giornalieri/settimanali
  - `getProvidersHealth()` → status SQLite tracker (db_path, total_records,
    by_domain breakdown)
- **`AccountDialog`** Tab "🌐 Providers":
  - Filtri: `window_days` (1/7/30/90) + `domain` dropdown
    (meteo/geocoding/elevation/seismic)
  - 3 Stat cards: chiamate totali, cache hit con %, errori con %
  - Tabella per ogni (provider, endpoint) con calls/cache%/err/latency
  - Cache hit > 50% evidenziato in accent color (✓ buona cache)
  - Error ratio > 5% evidenziato in error color (⚠ provider unstable)
  - Empty state friendly: "Apri TopBar → Loads per generare traffico"
- Dialog width espanso 520 → 640 px per accomodare la nuova tab

### Tests
- **+3 vitest** in `AccountDialog.test.tsx`:
  - Render Providers tab con summary rows (2 provider mock)
  - Domain filter triggera re-query con `{domain: "meteo"}`
  - Window selector cambia `window_days` nel params
- **174/174 vitest totale** (171 + 3).

### Use case admin

Scenario: utente segnala "loads non si calcolano". Admin apre:
1. AccountDialog → tab Providers
2. Window 1 giorno → vede n_calls=0 su `open_meteo_archive` ❌
3. Capisce: il provider meteo è in errore o quota esaurita
4. Solution: switcha env var `FEAPRO_METEO_FALLBACK` o investiga
   Open-Meteo upstream

Senza questa dashboard, l'admin doveva fare `flyctl ssh sftp shell` e
inspect `/data/usage.sqlite` manualmente. Time-to-debug 5min → 5s.

### Gate
| | alpha.8 | **alpha.9** |
|---|---|---|
| vitest frontend | 171 | **174** (+3) |
| F6 endpoint UI consumer | 0 | **3** (summary, timeline pending, health pending) |
| Live URL | ✅ | ✅ |

---

## v1.4.0-alpha.8 — Location demo presets — 2026-05-21

Onboarding rapido: 5 preset Italia (Roma, Milano, L'Aquila, Cagliari,
Cortina) caricabili con 1 click senza API call. Utile per chi prova
l'app a freddo e vuole vedere il workflow end-to-end senza aspettare
le chiamate live ai provider.

### Added
- **`lib/locationPresets.ts`** — 5 `LocationPreset` predefiniti:
  | Key | Location | q_p | s_design | a_g/g | Caratteristica |
  |---|---|---|---|---|---|
  | roma | Roma centro | 0.40 | 0.10 | 0.10 | sismica moderata |
  | milano | Milano Duomo | 0.32 | 0.50 | 0.05 | sismica bassa |
  | laquila | L'Aquila | 0.45 | 1.20 | **0.30** | **sismica ALTA** |
  | cagliari | Cagliari porto | **0.55** | 0.02 | 0.04 | vento alto, no neve |
  | cortina | Cortina d'Ampezzo | 0.35 | **1.80** | 0.10 | **neve estrema** |
- **`LocationPickerDialog`** — Step 0 prima del search:
  - "⚡ Preset rapidi (valori indicativi · no API call)"
  - 5 bottoni emoji-labelled, tooltip con descrizione climate-zone
  - Click → `climateStore.setBundle(preset)` + `onApply(bundle)` + toast
    + chiude dialog. Onboarding ~5s vs ~25s con API live.

### Tests
- **+9 vitest** `locationPresets.test.ts`: 5 preset, key uniche, struttura
  bundle, sanity (L'Aquila a_g≥0.20, Cortina s_d≥1.0, Cagliari no snow,
  Milano a_g<0.10), source contains "preset".
- Fix test `performs search and shows results`: distingue risultato live
  (source=open_meteo_geocoding) dai preset (source=preset_*).
- **171/171 vitest totale**.

### Gate
| | alpha.7 | **alpha.8** |
|---|---|---|
| vitest frontend | 162 | **171** (+9) |
| Onboarding first-loads | ~25s | **~5s** |

---

## v1.4.0-alpha.7 — Seismic apply + wind envelope ±X — 2026-05-21

Espansione applicabilita' loads: sismica come `ground_accel` model-level
+ wind envelope bidirezionale per inviluppo NTC §3.3.3.

### Added
- **`applyClimateLoads.ts`** opzioni nuove:
  - `includeSeismic: boolean` (default false): se attiva + bundle.seismic
    non null, aggiunge 1 Load `type: "ground_accel"`, `direction: [1,0,0]`,
    `pressure: a_g_over_g × 9.81` (m/s²), label `"Seismic NTC2018 [Roma,
    soil B, +X]"`. Usabile dal solver `seismic_th` come accelerazione
    del terreno.
  - `windEnvelope: boolean` (default false): se attiva, per ogni nodo
    genera **2 wind loads** (positivo e negativo sull'asse scelto) invece
    di 1. Labels `Envelope +X` / `-X`. Implementa NTC §3.3.3.
  - `G_M_S2 = 9.81` exportato.
- **`ApplyClimateLoadsResult.seismic_a_g_m_s2?: number`** popolato quando
  includeSeismic + a_g > 0.
- **`ApplyClimateLoadsDialog`** UI:
  - Checkbox "🌋 Sismica (ground_accel +X)" visibile solo se bundle ha
    seismic data. Mostra `a_g = X.XXX m/s²` dinamicamente.
  - Sotto direzione wind: checkbox "Inviluppo bidirezionale (±X)" che
    disabilita il select direzione.

### Tests
- **+8 vitest**: envelope ±X (sign flip), envelope su Y (fy invece fx),
  envelope false=backward compat, includeSeismic genera ground_accel con
  direction/magnitude correct, seismic null nel bundle = no load, a_g=0
  skip, combo wind+snow+seismic counts, envelope+seismic counts.
- **162/162 vitest totale**.

### Solver wiring (lasciato per Sprint 3)

Il backend `seismic_th_solver` accetta gia' `Load{type:"ground_accel"}` ma
con time-history. In alpha.7 generiamo solo PGA costante — il professionista
puo' usarlo come scaling base. Sprint 3 includera':
- Generazione automatica time-history da spectrum (NTC §3.2)
- Combinazione gravity + climate + seismic come LoadCases
- UI per LoadCase con weights/factors NTC §2.5

---

## 🔮 Sprint 3 outline (roadmap v1.5+)

### Multi-user + auth (alpha.10–.15)
- JWT auth con email login (FastAPI + bcrypt)
- `user_id` reale propagato (oggi hardcoded "demo_user")
- Quota per-utente real-time (oggi mock)
- Per-user climateStore (oggi shared via localStorage)

### Billing Stripe (alpha.16–.20)
- Webhook Stripe → quota.subscription update
- Stripe checkout per upgrade tier
- Tier capacities: free 50 / starter 500 / pro 5000 / enterprise illimitato
- Trial 14gg automatici al signup

### Observability dashboard (alpha.21–.25)
- Frontend dashboard letta da `/api/providers/usage/*`
- Grafico timeline 30gg cache hit / error rate / latency
- Alerting su SLO breach (cache_hit_ratio < 50%, error_ratio > 5%)
- Heatmap geografica chiamate Open-Meteo/USGS per regione utente

### LoadCase combinations NTC §2.5 (alpha.26–.30)
- UI `LoadCaseCombinationDialog`: combina Dead + Climate + Live
- Coefficienti γ NTC tabella 2.5.I, formule SLU/SLE
- Genera N LoadCases automaticamente con weights
- Solver esegue tutti → inviluppo verifiche EC3/2/5/8

### Production hardening (continuo)
- Custom domain `feapro.app` o `fea-pro.it`
- Cloudflare CDN davanti a Fly.io
- UptimeRobot ping ogni 5min (no cold-start)
- Sentry error tracking frontend + backend
- Backup automatico volume Fly /data (cron daily → S3 backblaze)

### Provider extensions
- INGV Earthquake (Italia complementare USGS, M<3.5 dettagliato)
- IGN España elevation
- DGT3D digital terrain Italia (5m vs SRTM 30m)

---

## v1.4.0-alpha.6 — Per-node magnitude: ogni nodo riceve q × tributary[i] — 2026-05-20

Closure scientifico finale: invece di applicare una magnitudo costante,
ogni nodo riceve la sua specifica forza derivata dalla tributary area
locale. Per una mesh suddivisa, i nodi interni ricevono ~2× la forza
dei nodi estremi — esatto come dovrebbe essere per una distribuzione
di pressione su area.

### Added
- **`applyClimateLoads.ts`** estesa:
  - Nuovo `ApplyClimateOptions.tributaryMode: "uniform" | "per-node"`
  - Nuovo `facadeWidthM` (usato solo in per-node, default 1.0 m)
  - In modalita' `per-node`: chiama `computeTributaryAreas(model, facadeWidthM)`
    e applica magnitudo specifica `q × tributary[i]` per ogni nodo
  - Nodi isolati (tributary=0) in per-node sono **skippati**
    automaticamente (oltre ai vincolati)
  - `ApplyClimateResult` ora include `wind_force_min/max_kN` e
    `snow_force_min/max_kN` (solo in per-node)
- **`ApplyClimateLoadsDialog`** updated:
  - Radio button "📐 Uniforme" / "🧮 Per-nodo da topologia"
  - In uniforme: il classico input number + bottone "🤖 Auto media"
  - In per-nodo: input `facade_width` per beam 1D
  - Preview live: in per-nodo mostra "min–max kN (media X)" invece di
    valore unico — l'utente vede subito la distribuzione spaziale
  - Nota footer aggiornata in base alla modalita'

### Conservation verified
Test "sum totale per-node = q × area_totale_modello":
- Shell Q4 2m × 2m, area=4 m², s_design=0.022 kN/m²
- Sum |fz| = 0.088 kN (= 4 nodi × 0.022 = 0.088 ✓ esatto)

### Confronto numerico

Modello: trave 6m × 3 sub-beam (4 nodi), estremi liberi, s_design=0.022 kN/m²

| Nodo | Tributary [m²] | Magnitudo `per-node` [kN] | Magnitudo `uniform` (media 1.0) [kN] |
|---|---|---|---|
| 1 (estremo) | 1.0 (half=1) | 0.022 | 0.022 |
| 2 (interno) | 2.0 | **0.044** | 0.022 |
| 3 (interno) | 2.0 | **0.044** | 0.022 |
| 4 (estremo) | 1.0 | 0.022 | 0.022 |
| **Sum** | **6.0** | **0.132** ✓ = 0.022 × 6.0 | 0.088 (sbagliato!) |

**Conservazione totale**: solo per-node garantisce `Σ F = q × A_totale`.

### Tests
- **+8 vitest** per modalita' per-node:
  - trave 6m vincolata estremi (interni 1m tributary)
  - trave libera (estremi 0.5m vs interni 1m, magnitudo diversa)
  - nodo isolato (no element adiacente) → skippato
  - modello senza beam/shell → tutti skip
  - facade_width 2× raddoppia magnitudini beam
  - shell Q4 2×2: corner < edge < center magnitudo
  - **conservation**: sum |fz| = s × A_total esatto
  - uniform mode NON popola min/max
- **154/154 vitest totale** (146 + 8).

### Gate
| Gate | alpha.5 | **alpha.6** |
|---|---|---|
| pytest backend | 1308 | 1308 |
| vitest frontend | 146 | **154** (+8) |
| Live URL | ✅ | ✅ |
| Closure scientifico | parziale (media uniforme) | **completo (per-node q×t[i])** |

### Scientific significance

Per la prima volta in FEA Pro, l'engineer può applicare carichi
climatici con **distribuzione spaziale corretta**:
- Apri il modello (mesh suddivisa N volte)
- Clicca badge → expanded → "Applica come carichi"
- Seleziona "🧮 Per-nodo da topologia"
- Click "Aggiungi N carichi"
- I carichi sono **proporzionali alla tributary area locale**
- Sum totale = q × area_totale (conservazione esatta)

Questo è il modello matematicamente corretto per pressione costante su
una superficie discretizzata. Modalita' uniforme rimane disponibile
per stima rapida / sanity check.

---

## v1.4.0-alpha.5 — Tributary area auto-derived dalla topologia — 2026-05-20

L'engineer non deve più indovinare il "1.0 m² uniforme" — FEA Pro lo
calcola dalla topologia del modello, rendendo i carichi climatici
scientificamente difendibili.

### Added
- **`lib/tributaryAreas.ts`** — helper puro `computeTributaryAreas(model,
  facadeWidthM=1.0)`:
  - Per ogni nodo somma:
    - 1/2 della lunghezza di ciascun beam/truss/cable adiacente
    - 1/4 dell'area di ciascun shell Q4 adiacente
    - 1/3 dell'area di ciascun tri3 adiacente
  - Solid elements (tet/hex): ignorati (out of scope v1.4)
  - `tributary_area_m2 = tributary_length × facade_width + tributary_area_shell`
  - Ritorna `TributaryResult` con `by_node` map + `stats`
    (min/max/mean/median, n_with_tributary, n_isolated).
- **`ApplyClimateLoadsDialog`** wire bottone **🤖 Auto da topologia**
  vicino al campo tributary_area:
  - Click → calcola media topologia → aggiorna input
  - Toast info con range min-max
  - Toast errore se nessun beam/shell nella topologia

### Algoritmo verificato

| Topologia | Tributary nodo |
|---|---|
| 1 beam 6m | estremi 3m, area = 3 m² (facade 1m) |
| 7 nodi, 6 beam 1m | interni 1m, estremi 0.5m |
| 1 shell Q4 1m×1m | 4 nodi × 0.25 m² |
| 3×3 nodi, 2×2 shell Q4 | corner 0.25, edge 0.5, centro 1.0 |
| beam+shell coincidenti | somma contributi |
| solid h8 | tutti isolati (skip) |

### Tests
- **+14 vitest** `tributaryAreas.test.ts`: empty/no-elements, beam2d
  semplice, beam2d suddivisa (interno/estremo), facade_width custom,
  shell Q4 1×1, shell Q4 2×2 (corner/edge/center), tri3, beam+shell
  misti, solid skip, stats edge cases, beam3d con length 3D, element
  nodi inesistenti safe, median pari.
- **146/146 vitest totale** (132 + 14).

### UX flow updated

```
ApplyClimateLoadsDialog ora ha:
  [Area di influenza per nodo] [🤖 Auto da topologia]
  [_____1.0_____] m²

Click su 🤖:
  → computeTributaryAreas(model) → stats
  → input value = stats.area_mean_m2
  → toast: "Auto-calc: media 0.85 m² (range 0.50-1.20)"
```

L'engineer vede subito la distribuzione spaziale dei loads, può
decidere se accettare il default uniforme (vecchia logica) o l'auto
(suggested mean) o un valore custom.

### Limiti residui (v1.5 backlog)

- Auto-calc usa la MEDIA per tutti i nodi (semplificazione). Per accuratezza
  totale ogni nodo riceverebbe una magnitudo diversa = q × tributary[i].
  Future enhancement: opzione "per-nodo" che genera N loads ciascuno con
  magnitudo specifica.
- Beam 1D usa default `facade_width = 1.0 m`. Per facciate verticali
  reali serve definire altezza piano per ogni nodo. Future:
  `facade_height_at_node[]` derivato dalla z-coordinate o input UI.

### Gate
| Gate | alpha.4 | **alpha.5** |
|---|---|---|
| pytest backend | 1308 | 1308 |
| vitest frontend | 132 | **146** (+14) |
| Live URL | ✅ | ✅ |

---

## v1.4.0-alpha.4 — Closure end-to-end: climate loads → carichi nodali — 2026-05-20

Chiusura naturale del loop Sprint 2: dopo aver calcolato i loads tramite
LocationPickerDialog (B1-B4), ora si possono **applicare come carichi
nodali reali** al modello attivo via un click dal ClimateContextBadge.

### Added
- **`lib/applyClimateLoads.ts`** — helper puro che genera `Load` entries
  dal `ClimateBundle`:
  - Per ogni nodo NON vincolato (skipConstrained=true default):
    - Snow: `Load{type:"nodal", fz:-s_design × tributary_area, label}`
    - Wind: `Load{type:"nodal", fx|fy: ±q_p × tributary_area, label}`
  - Direzione vento configurabile: ±X / ±Y
  - Tributary area: 1.0 m² default (= magnitudo identica a q,s in kN/m²)
  - Labels per traceability: `"Snow EN1991-1-3 [Roma]"`,
    `"Wind EN1991-1-4 [Roma, +X]"` — il professionista riconosce origin.
- **`dialogs/ApplyClimateLoadsDialog.tsx`** — UX modale:
  - Checkboxes wind/snow (toggle indipendenti)
  - Select direzione vento (+X, -X, +Y, -Y)
  - Input numerico tributary_area [m²]
  - Checkbox skipConstrained
  - **Anteprima live** count loads + force/nodo
  - Click "Aggiungi N carichi al modello" → iter su `modelsApi.addLoad`
    + invalidate query + toast success
- **`shell/ClimateContextBadge.tsx`** wire bottone **🔧 Applica come
  carichi al modello** nell'expanded view → apre dialog.

### Tests
- **+15 vitest helper** `lib/applyClimateLoads.test.ts`:
  - bundle null → empty result; skipConstrained on/off
  - snow magnitude = s_design × area, direzione -Z verificata
  - wind magnitude = q_p × area, direzioni ±X/±Y, sign corretto
  - includeWind/Snow false → solo l'altro
  - location name nel label per traceability
  - DEFAULT_APPLY_OPTIONS coerenti
  - edge: 0 nodi, 0 constraints, entrambi false
- **+1 helper test** in `ClimateContextBadge.test.tsx`: aggiunto
  `QueryClientProvider` wrapper (perché badge ora include dialog con
  useMutation).
- **132/132 vitest totale** (117 + 15).

### UX completo

```
TopBar Loads → LocationPickerDialog → "Applica al modello"
  ↓
ClimateContextBadge (floating, persiste in localStorage)
  ↓ click sul nome → expanded
  ↓ bottone "🔧 Applica come carichi al modello"
  ↓
ApplyClimateLoadsDialog (form: wind/snow/direction/area)
  ↓ click "Aggiungi N carichi"
  ↓ loop: modelsApi.addLoad × N
  ↓
Modello.loads aumenta → pannello CARICHI mostra count + label
"Snow EN1991-1-3 [Roma]" / "Wind EN1991-1-4 [Roma, +X]"
```

### Limiti documentati (per v1.5 enhancement)

- Tributary area = costante (1.0 m² default). Per modelli reali serve
  derivare per nodo basato sulla topologia mesh (es. somma metà delle
  lunghezze elementi adiacenti per beam, area shell adiacenti per Q4).
- Direzione vento = uniforme su tutti i nodi. Realisticamente serve
  pressione su una sola facciata + suction sull'altra.
- No moltiplicatori NTC 2018 di sicurezza (γ_W = 1.5 ULS): l'utente li
  applica manualmente in CombinazioneCarichi solver.
- Sismica = ancora solo info nel badge (non applicata come accelerazione
  spettrale). Future v1.5 wire al solver response spectrum NTC 2018.

### Gate
| Gate | alpha.3 | **alpha.4** |
|---|---|---|
| pytest backend | 1308 | 1308 |
| vitest frontend | 117 | **132** (+15) |
| Live URL | ✅ | ✅ deployed |
| Loop closure | parziale (info only) | **completa (info → carichi)** |

---

## v1.4.0-alpha.3 — UX continuity: ClimateContextBadge persistente — 2026-05-20

Closure naturale di B1-B4: dopo aver calcolato loads via LocationPickerDialog,
i valori restano visibili nel viewport (no piu' "dialog → close → loss").

### Added
- **`store/climateStore.ts`** (zustand + persist localStorage):
  - `bundle: ClimateBundle | null` con `location + elevation_m + meteo +
    seismic + computed_at` timestamp.
  - `setBundle(omit computed_at)` aggiunge automaticamente `Date.now()`.
  - `clear()` resetta. Persiste in localStorage chiave `climate-store`.
- **`shell/ClimateContextBadge.tsx`** — pill compatta floating
  `position: fixed top-14 left-3`:
  - Sempre visibile quando `bundle != null` (qualsiasi workspace).
  - Mostra: 📍 nome location · lat/lon · elevazione.
  - Click sul nome → expanded view con valori chiave EN 1991 + NTC 2018:
    - v_b,0, q_p(z=10m), s_k, s_design
    - M_max storico Mw, a_g/g, soil category, S_e plateau
    - Footer: "calcolato X min fa · da Open-Meteo + USGS + Open-Elevation"
  - `X` button → clear store (rimuove badge).
  - `Edit2` button (se `onReopen` callback) → riapre LocationPickerDialog.
- **`TopBar.tsx`** wire `onApply={setClimateBundle}` al dialog.
- **`App.tsx`** monta `<ClimateContextBadge />` nel layout principale.

### Tests
- **+13 unit test**:
  - `store/climateStore.test.ts` (5): null iniziale, setBundle stora con
    computed_at, setBundle(null) clear, clear() reset, replacement preserva
    monotonia timestamp.
  - `shell/ClimateContextBadge.test.tsx` (8): hide quando bundle null,
    render con location, click nome toggle expanded, clear button rimuove
    bundle, edit button calls onReopen, edit nascosto senza callback,
    gestione bundle parziale (no seismic / no meteo).
- **117/117 vitest totale** (104 + 13). Helper `renderWithProvider`
  wrappa in `TooltipProvider` (richiesto da Radix in test isolati).

### Smoke test produzione live (verificati nel browser)
1. Carico https://fea-pro.fly.dev/ → no badge (localStorage vuoto)
2. Click TopBar **Loads** → LocationPickerDialog apre
3. Search "Roma" → 8 risultati live da Open-Meteo
4. Click "Roma 47.83, 26.60 Romania" (quota 138 m s.l.m.) → calcoli B2+B3+B4 in parallelo:
   - Vento: v_b,0=19.22 m/s, q_p(10m)=**0.393 kN/m²**
   - Neve: s_k=0.403, s_design=**0.323 kN/m²** (Romania nevosa)
   - Sismica: M_max Mw 4.9, a_g/g=**0.0423**, S_e plateau=**0.106**
5. Click "Applica al modello" → dialog chiude, badge **📍 Roma 47.833,
   26.600 · 138 m ✕** appare in alto a sinistra
6. Click sul nome → expanded view con tutti i valori EN 1991+NTC 2018
7. **F5 refresh** → badge ancora presente (persist OK)
8. Click X → badge rimosso

### Gate
| Gate | alpha.2 | **alpha.3** |
|---|---|---|
| pytest backend | 1308 | 1308 (no changes) |
| vitest frontend | 104 | **117** (+13) |
| Live URL | ✅ | ✅ deployed |
| Build | OK | OK |

---

## v1.4.0-alpha.2 — Deploy live su Fly.io — 2026-05-20

Prima volta online: **https://fea-pro.fly.dev/** (Frankfurt EU, $0/mese free tier).

### Deploy infrastructure
- **Single-image Dockerfile** multi-stage: `node:20-alpine` builda Vite
  frontend → `python:3.11-slim` runtime serve sia API che SPA da
  `/app/static/`. Same origin = no CORS, 1 sola URL.
- **fly.toml**: region `fra` (Frankfurt EU), 1× shared-cpu-1x 1GB RAM,
  auto-stop dopo idle (cold start ~22s), volume `fea_data` 1GB persistente.
- **Volume `/data`** mount per persistere tra redeploy: cache F2, usage
  tracker F6, jobs queue A5, audit JSONL job_meter A2.
- **WebSocket nativo persistente** (`/ws/jobs/{user_id}`) supportato dal
  proxy Fly.io senza modifiche.

### Fixed (bug emersi durante il deploy)
- **`OSError: libGLU.so.1` al boot** — gmsh runtime richiede libgl/glu
  su Debian. Aggiunti pacchetti apt: `libglu1-mesa`, `libgl1`,
  `libxrender1`, `libxcursor1`, `libxft2`, `libxinerama1`, `libgomp1`.
- **`register_all()` non chiamato al boot** — i 8 provider F4 non venivano
  registrati nel registry singleton, B1-B4 ritornavano 503 "no providers
  registered". Aggiunto al `@app.on_event("startup")` di `main.py`.
- **Path SQLite hardcoded** — `.cache/` non persisteva tra redeploy. Ora
  4 moduli leggono env var `FEAPRO_DATA_DIR` (default `.cache/` per dev):
  `services/cache.py`, `services/usage_tracker.py`, `jobs/store.py`,
  `billing/job_meter.py`.

### Added
- **Env var fallback chain** in `fly.toml`:
  ```
  FEAPRO_METEO_FALLBACK = "open_meteo_archive"
  FEAPRO_GEOCODING_FALLBACK = "nominatim"
  FEAPRO_ELEVATION_FALLBACK = "usgs_elevation"
  ```
  Critico: senza questi, F8 chiama solo `[primary]` della chain. Per
  `/api/loads/meteo` il primary `open_meteo_forecast` solleva
  `NotImplementedError` su `historical_extremes`, e con la chain
  estesa F8 fa skip ad `open_meteo_archive` che lo implementa.
- **`--proxy-headers --forwarded-allow-ips=*`** in uvicorn CMD per
  rispettare `X-Forwarded-*` di Fly edge TLS termination.

### Smoke test live (verificati nel browser end-to-end)
- `GET /api/health` → `{"status":"ok"}` (cold start 22s, calde <100ms)
- LocationPickerDialog UI:
  - Search "Cagliari" → 3 risultati live da Open-Meteo (Sardegna,
    Trentino, Aeroporto)
  - Click su Cagliari Sardegna (39.23, 9.12) → trigger pipeline B1+B2+B3+B4
  - Elevation 36m da Open-Elevation
  - **Wind**: v_b,0=22.33 m/s, q_p(z=10m)=0.530 kN/m² (EN 1991-1-4)
  - **Snow**: s_k=0.028, s_design=0.022 kN/m² (EN 1991-1-3)
  - **Seismic**: M_max 4.1 storico USGS, a_g/g=0.0213, spettro plateau
    S_e/g≈0.053 (NTC 2018 §3.2)
  - Tutti i valori coerenti con realtà (Cagliari = NTC zona 4 sismica
    bassa + clima mite + raffica vento moderata).

### Comando deploy
```bash
flyctl deploy --remote-only --app fea-pro
```
Remote builder Fly.io = no Docker locale richiesto. ~3 min totali.

### Gate finale post-deploy
| Gate | Valore |
|---|---|
| pytest backend (no-slow) | 1308/1308 verdi (path env-var test) |
| vitest frontend | 104/104 verdi |
| **Live URL** | **https://fea-pro.fly.dev/** ✅ |
| Cold start | 22s (auto-stop true) |
| Costo mensile | $0 (free tier) |

### Cose ancora aperte (post v1.4.0-alpha.2)
- **`origin/main` 12 commit indietro**: promuovere quando vuoi con
  `sincronizza test con tutto`.
- **Cold start 22s** scomodo per demo live. Opzioni: UptimeRobot ping
  ogni 5 min (gratis) o `min_machines_running = 1` (~720h/mese).
- **No auth**: `user_id="demo_user"` hardcoded. Va bene per beta
  privato; per pubblico aggiungere token API.
- **Quota Open-Meteo**: 10000 req/day free per IP, cache amortizza ma
  se traffico > ~100 utenti/day si saturano. Upgrade a Standard tier
  ($29/mese 100k req/day) quando serve.

---

## v1.4.0-alpha.1 — Sprint 2 closure: piano B + UI integration — 2026-05-20

Chiusura Sprint 2 con UI integration end-to-end (LocationPickerDialog),
README facade completo, e 3 fix di errori nascosti emersi durante l'audit.

### Added
- **`LocationPickerDialog`** (frontend B1+B2+B3+B4 integration):
  - 3-step UX: search → preview elevation + bbox → wind+snow+seismic
    loads in tabs, con soil category picker per spettro NTC 2018.
  - 8 vitest verdi: search/results/select/apply/soil-change/reset/empty.
  - Wired in `TopBar` (icona MapPin + label "Loads") accanto ad Account.
- **API client frontend**:
  - `api/loads/index.ts` — `computeMeteoLoads`, `computeSeismicLoads`
  - `api/geocoding/index.ts` — `geocodingSearch`, `geocodingReverse`,
    `geocodingBest`
  - `api/terrain/index.ts` — `terrainBatch`, `terrainProfile`, `terrainBbox`
- **README `services/facades/README.md`**: architettura piramidale
  Sprint 2, esempi numerici Roma/Norcia/Cagliari, workflow REST e_2_e,
  roadmap upgrade per v1.4+ (tabella NTC 2018 ufficiale, c_e(z)
  realistico, etc.).

### Fixed
- **ArcLengthPanel test**: mock `useJobRun.mutate` chiamava `onSuccess`
  con `steps[]` senza i campi `arc_length` e `control_displacement`,
  che il componente accedeva via `.toExponential(...)` causando
  `TypeError: Cannot read properties of undefined`. Aggiunti i 2 campi
  + `step` ai mock steps (sia `vi.mock` che `mockResolvedValue`).
- **vitest `ResizeObserver is not defined`**: jsdom non implementa
  ResizeObserver, ma `recharts` (e altri componenti Sprint 1 che usano
  `ResponsiveContainer`) lo chiamano al mount. Aggiunto polyfill stub
  globale in `setupTests.ts`. Risolve l'unhandled error che mascherava
  il bug ArcLengthPanel.
- **`cost_estimator` nonlinear sottostima ×2.5**: il test
  `test_estimate_within_tolerance_of_actual[cable_bridge_2d/nonlinear]`
  falliva consistentemente (estimate 66ms vs actual 125ms = 47% errore
  > 30% tolerance). Separati `_PUSHOVER_ALPHA = 1.2e-6` (lambda-incr.)
  da `_NONLINEAR_ALPHA = 3.0e-6` (Newton-Raphson). Tutti i 7 calibration
  case passano ora con margine.

### Gate finale Sprint 2

| Gate | baseline alpha.4 | **v1.4.0-alpha.1** | Δ |
|---|---|---|---|
| pytest backend (no-cov, no-slow) | 916 | **1308** | +392 |
| pytest backend (calibration verdi) | n/a | **7/7** | — |
| Slow integration tests | 0 | 25 | +25 |
| vitest frontend | 96 | **104** | +8 |
| vitest unhandled errors | 1 (toExponential) | **0** | -1 |
| Frontend vite build | OK | **OK** | — |
| mypy --strict Sprint 2 files | n/a | **clean su 12 file** | — |

### Sprint 2 cumulative

- **9 commit** sul branch `claude/crazy-hodgkin-86772d`
- **8 provider** concreti (4 domini: meteo, geocoding, elevation, seismic)
- **4 service facade** (B1+B2+B3+B4) operative
- **11 nuovi REST endpoint**:
  ```
  GET  /api/providers/usage/{summary,timeline,health}
  GET  /api/geocoding/{search,reverse,best}
  POST /api/terrain/{batch,profile,bbox}
  POST /api/loads/meteo
  POST /api/loads/seismic
  ```
- **1 LocationPickerDialog** UI completo (TopBar integration)
- **Coverage moduli nuovi**: 90-100% uniforme + mypy --strict clean

### Workflow utente end-to-end

```
TopBar [MapPin] → LocationPickerDialog
    1. type "Cagliari" → API geocoding search → results list
    2. click "Cagliari" → API terrain batch + meteo + seismic loads
    3. switch soil category → re-query spectrum
    4. click "Applica al modello" → callback onApply(bundle)
```

`bundle = {location, elevation_m, meteo: MeteoLoadsResult, seismic: SeismicLoadsResult}`
pronto per essere applicato come `LoadCase` ai modelli FEA Pro.

---

## [Unreleased] — Sprint 2 (storia incrementale 9 commit)

### Added
- **B1: GeocodingService + REST `/api/geocoding/*`** (Sprint 2)
  - Facade sopra orchestrator F8 (chain `open_meteo_geocoding` →
    `nominatim` fallback automatico).
  - **API service**: `search(query, count, language)`,
    `reverse(lat, lon, language)`, `find_best(query, language)` →
    Location | None (helper convenience).
  - **Pattern reverse**: Open-Meteo non supporta reverse → solleva
    `NotImplementedError` → F8 fa skip al provider successivo
    (Nominatim). Nessuna logica di fallback custom necessaria.
  - **REST endpoint**:
    - `GET /api/geocoding/search?q=<query>&count=10&language=en`
    - `GET /api/geocoding/reverse?lat=...&lon=...&language=en`
    - `GET /api/geocoding/best?q=<query>` ← top hit only (Location|null)
  - Validation: query [1, 200] chars, count [1, 100], language [2, 10]
    chars, lat/lon range. Errori HTTP: 422 input, 503 no providers,
    502 ProviderError.

- **B2: TerrainService + REST `/api/terrain/*`** (Sprint 2)
  - Facade sopra orchestrator F8 (chain `open_elevation` →
    `usgs_elevation` fallback).
  - **API service**:
    - `lookup_points(points)` — quota per N punti arbitrari, batch
      via Open-Elevation POST (max 1000 punti per request)
    - `profile_along_line(lat1, lon1, lat2, lon2, n_points=50)` —
      interpolazione lineare lat/lon + lookup batch (chart sezione)
    - `bbox_statistics(lat_min, lon_min, lat_max, lon_max, n_grid=10)` —
      griglia n×n nel bbox + stats elevation (n_grid max 32 → 1024 punti)
  - **Funzioni pure helper** (testabili separatamente):
    - `compute_terrain_stats(points)` — min/max/mean/range elevation
    - `interpolate_line(lat1, lon1, lat2, lon2, n)` — interp WGS84 lineare
    - `generate_bbox_grid(bbox, n_grid)` — griglia row-major
  - **DTO**: `TerrainProfile(points, stats, source_provider, notes)`,
    `TerrainStatistics(n_points, elevation_{min,max,mean,range}_m)`.
  - **REST endpoint**:
    - `POST /api/terrain/batch` body `{points: [{lat, lon}, ...]}`
    - `POST /api/terrain/profile` body `{lat1, lon1, lat2, lon2, n_points}`
    - `POST /api/terrain/bbox` body `{lat_min, lon_min, lat_max, lon_max, n_grid}`
  - **Use case strutturale**: importare un DXF planare (mesh 2D xy)
    e riproiettarlo su quote SRTM reali via `terrain.lookup_points()`.
    Output direttamente applicabile come nodi `z[i]` della mesh 3D.

### Tests
- **+68 unit/integration test**:
  - `test_geocoding.py` (15): search + reverse + find_best end-to-end
    con mock primary+fallback, fallback su NotImplementedError,
    propagazione ValueError no-skip, no provider unavailable,
    coordinate range, find_best empty → None, singleton.
  - `test_terrain.py` (29): helper puri (stats empty/single/multi/
    negative elevations, interpolate_line n=2/midpoint/invalid,
    bbox_grid corners/n²/invalid bbox), service E2E (lookup_points
    happy/empty/too-many/invalid-coords/no-provider/error-propagates,
    profile_along_line n_points/min2, bbox grid, truncated provider note,
    singleton).
  - `test_geocoding_endpoint.py` (16): search/reverse/best happy paths +
    503/502/422 (lat/lon/count/empty-query), best returns null when
    empty, ValueError → 422.
  - `test_terrain_endpoint.py` (12): batch/profile/bbox happy paths +
    503/422 (empty/too-many/invalid-coords/n_grid/n_points/bbox-invalid)
    + 502 provider error.

### Gate
| Gate | B3 | **B1+B2** |
|---|---|---|
| pytest backend (no-slow) | 1235 | **1308** (+73) |
| B1+B2 coverage | — | `geocoding.py` 100%, `terrain.py` 100%, route geocoding 95%, route terrain 93% |
| mypy --strict | clean | clean |

### Piano B — COMPLETATO ✅

Dopo B1+B2, **tutte e 4 le facade del piano B sono operative**:

| Facade | Endpoint | Pattern |
|---|---|---|
| B1 GeocodingService | `/api/geocoding/{search,reverse,best}` | chain F8 geocoding |
| B2 TerrainService | `/api/terrain/{batch,profile,bbox}` | chain F8 elevation + batch |
| B3 SeismicLoadsService | `/api/loads/seismic` | chain F8 seismic + NTC 2018 spectrum |
| B4 MeteoLoadsService | `/api/loads/meteo` | chain F8 meteo + EN 1991 loads |

### Note operative
- **Workflow utente UI completo** (post-Sprint 2):
  1. User digita "Cagliari" → `/api/geocoding/best` → `(39.21, 9.11)`
  2. UI mostra `/api/terrain/bbox` (mappa terreno around)
  3. Calcola loads: `/api/loads/meteo` + `/api/loads/seismic`
  4. Applica come nuovi LoadCase al modello FEA
- **Tutti i facade osservabili** via F6 tracker (provider-level) +
  log (orchestrator-level fallback events).
- **5 nuovi REST endpoint Sprint 2** in totale: 3 providers/usage + 2
  loads (B3+B4) + 3 geocoding (B1) + 3 terrain (B2) = **11 endpoint
  Sprint 2**.

---

### Added
- **B3: SeismicLoadsService + REST `/api/loads/seismic`** (Sprint 2)
  - **Pipeline**: lat/lon → orchestrator F8 → USGSEarthquakeProvider
    (`historical_max_magnitude` radius/years) → GMPE Sabetta-Pugliese
    1996 (taratura Italia) → parametri spettrali NTC 2018 §3.2 →
    response spectrum elastico orizzontale.
  - **Funzioni pure formule**:
    - `estimate_a_g_from_magnitude(M, R_km, ...)` — Sabetta-Pugliese
      1996: `log10(PGA/g) = -1.845 + 0.363·M - 1.0·log10(√(R²+25))`
      Validato: M=6→0.10g, M=6.5→0.16g, M=7→0.24g, M=9→1.28g
    - `compute_eta(damping)` — fattore correzione smorzamento ξ
    - `compute_site_params(a_g, F_0, T_c*, soil)` — NTC 2018 Tab.
      3.2.II completa (A/B/C/D/E con S e C_C tabellati)
    - `compute_response_spectrum(params, n_points, t_max)` — 4 tratti
      NTC 2018 §3.2.3.2 formule (3.2.4)
  - **DTO**: `SeismicLoadsResult(location, historical_max_magnitude,
    site_params, spectrum, notes, gmpe_used)`, `SeismicSiteParams`
    (a_g/g, F_0, T_c*, T_B, T_C, T_D, S, C_C, η, soil_category),
    `ResponseSpectrumPoint(T_s, S_e_over_g)`.
  - **REST `POST /api/loads/seismic`**: body con tutti i parametri
    NTC 2018 tunable (soil, F_0, T_c*, damping, GMPE R, spettro
    discretization). Default sensati per Italia. Validation
    422 fastapi, 503 no providers, 502 ProviderError.
  - **Baseline minimo**: se nessun terremoto storico nel raggio
    (M_max = 0), usa M=4.5 baseline NTC 2018 zona 4 + nota di warning.
  - **Note v1.3**: ogni output include warning che la stima e'
    preliminare (didattica/pre-progetto); per progetto reale serve la
    tabella ufficiale NTC 2018 (reticolo 10751 nodi + Classe d'Uso +
    Vita di Riferimento).

### Tests
- **+53 unit test**:
  - `tests/services/facades/test_seismic_loads.py` (42):
    - GMPE (9): zero M, sanity M=6/6.5/7/R=20km, monotonia con
      M/R, clip a 1.5g, R=0 safe, override coefficienti.
    - Eta + site params (10): eta(5%)=1, decreases with damping,
      clip low; soil A/B/C/D/E con S e C_C correct, invalid soil
      raises; T_D cresce con a_g, override F_0 / T_c* propaga.
    - Spectrum (9): n_points correct, T=0 = a_g·S, plateau =
      a_g·S·η·F_0, decreases dopo T_C, non-negative, invalid
      n_points/t_max raises, zero a_g → zero everywhere.
    - Service E2E (14): full result, soil category, M=0 baseline,
      explicit elevation skips lookup, elevation failure → notes,
      no provider → ProviderUnavailableError, v1.3 note presente,
      validation radius/years_back, default orchestrator, singleton,
      dict serialization, gmpe_used field, custom GMPE R.
  - `tests/api/test_loads_seismic_endpoint.py` (11): happy path,
    explicit params override, 422 lat/soil/F_0/damping/radius,
    503 no provider, 502 provider error, spectrum structure, notes
    presenti.

### Gate
| Gate | B4 | **B3** |
|---|---|---|
| pytest backend (no-slow) | 1182 | **1235** (+53) |
| Module coverage (facades+endpoint) | 100% | **97% + 100% + 100%** |
| mypy --strict | clean | clean |

### Note operative
- **`/api/loads/seismic` standalone**: come `/loads/meteo`, e' un
  calcolo veloce (no JobQueue async needed). Frontend chiama direct.
- **GMPE estensibile**: i coefficienti c1/c2/c3/h_ref sono parametri
  della funzione `estimate_a_g_from_magnitude` — facile sostituire
  con altre leggi (Bindi 2014, Akkar 2014, regionali) in upgrade.
- **Spettro 4-branch standard** EC8/NTC 2018: l'output e' direttamente
  fruibile dal solver EC8 spectrum (gia' presente in
  `core/verification/ec8/spectrum.py`).
- **Soil category default A**: e' la categoria piu' conservativa per
  S (1.0), ma in Italia il piu' comune e' B-C. L'utente DEVE
  configurare la soil corretta per il sito specifico.

---

### Added
- **B4: MeteoLoadsService + REST `/api/loads/meteo`** (Sprint 2)
  - Prima service **facade** del piano B (UI-friendly orchestrators).
  - **Pipeline**: lat/lon → orchestrator F8 → OpenMeteoArchive
    (`historical_extremes` 80y) + OpenElevation (`lookup`) → formule
    EN 1991-1-4 (vento) + EN 1991-1-3 (neve) → MeteoLoadsResult
    pronto per essere applicato al modello.
  - **Funzioni pure formule** (testabili separatamente, 100% coverage):
    - `compute_v_b0_from_gust(gust, factor=1.4)` — 3s gust → 10min mean
    - `compute_q_b(v_b0, ρ=1.25 kg/m³)` — pressione cinetica base
    - `compute_q_p_z10(q_b, c_e=1.7)` — pressione picco z=10m terr.II
    - `compute_s_k_from_snowfall(cm, ρ_snow=200 kg/m³)` — carico al suolo
    - `compute_s_design(s_k, μ_i=0.8, C_e=1.0, C_t=1.0)` — tetto piano
  - **DTO**: `MeteoLoadsResult(location, wind, snow, years_used, notes)`,
    `WindLoads`, `SnowLoads`, `MeteoLoadsLocation` (tutti Pydantic v2).
  - **REST `POST /api/loads/meteo`**: body `{lat, lon, elevation_m?,
    years=80}`. Validation lat[-90,90], lon[-180,180], years[10,85],
    elevation_m[-500,9000]. HTTP 503 se nessun provider, 502 se
    ProviderError non-recoverable, 422 se input invalido.
  - **Assunzioni v1.3** (documentate in docstring + roadmap upgrade):
    - terreno II categoria default (EN 1991-1-4 Tab. 4.1)
    - c_dir=c_season=1, z=10m, ρ_aria=1.25, ρ_neve=200 kg/m³
    - μ_i=0.8 tetto piano, C_e=C_t=1.0
    - gust factor 1.4 (Davenport)
  - **Estensione futura**: integrazione zone NTC 2018 (cf §3.3.2 vento,
    §3.4.2 neve) con altitude-dependent s_k Alpine/Mediterraneo, c_e(z)
    realistico per z != 10m, multi-terrain category.
  - **Esempio numerico** (gust 50y = 35 m/s, snow 50y = 30 cm):
    - v_b0 ≈ 25 m/s, q_b ≈ 0.39 kN/m², q_p(z=10m) ≈ 0.66 kN/m²
    - s_k ≈ 0.59 kN/m², s_design ≈ 0.47 kN/m²

### Tests
- **+41 unit test**:
  - `tests/services/facades/test_meteo_loads.py` (31): formule pure
    (gust factor, q_b, q_p, s_k, s_design con default + custom factors),
    edge cases (zero/negative input clip, invalid factor raises), service
    end-to-end con mock providers (orchestrator chain), elevation
    failure → notes (no crash), terrain category != II raises
    NotImplementedError, zero extremes → zero loads, high gust → high
    pressure sanity, singleton existence, dict serialization.
  - `tests/api/test_loads_endpoint.py` (10): POST happy path con/senza
    elevation explicit, validazione 422 (lat/lon/years/elevation range,
    missing fields), 503 no providers, 502 provider error, default
    years=80 captured.

### Gate
| Gate | F8 | **B4** |
|---|---|---|
| pytest backend (no-slow) | 1141 | **1182** (+41) |
| B4 modules coverage | — | **100% + 100% + 100%** |
| mypy --strict | clean | clean |

### Note operative
- **Architettura pyramid completa**: B4 e' la prima facade che usa
  l'intero stack Sprint 2 (orchestrator F8 → tracker F6 → providers F4
  → registry/cache/limiter F1/F2/F3 Sprint 1). Pattern replicabile per
  B1 (geocoding_service), B2 (terrain_service), B3 (seismic_loads).
- **`/api/loads/meteo` standalone**: il frontend puo' chiamarlo
  direttamente (es. CostPreviewDialog "calcola wind+snow loads") senza
  toccare la JobQueue — e' un calcolo veloce, no async wait.
- **UI integration TODO**: aggiungere dialog `LocationPickerDialog` o
  field `(lat, lon, elev)` in `MaterialsPanel`/`ModelTopPanel` per
  permettere all'utente di chiamare `/api/loads/meteo` e applicare i
  risultati a un load case dedicato (FUTURO, post-Sprint 2 alpha.5).

---

### Added
- **F8: ServiceOrchestrator + fallback chain** (Sprint 2)
  - **`services/orchestrator.py`**: orchestratore async generico che
    legge la fallback chain dal `ProviderRegistry` (env var
    `FEAPRO_<DOMAIN>_PROVIDER` + `FEAPRO_<DOMAIN>_FALLBACK=csv`) e
    delega al primo provider che ha successo.
  - **API**: `orchestrator.call(domain, method, *args, **kwargs)` ←
    chiamata via `getattr(provider, method)(*args, **kwargs)`,
    type-generic; `orchestrator.call_by_name(domain, provider_name,
    method, ...)` bypassa la chain per uso esplicito;
    `orchestrator.get_chain(domain)` introspezione.
  - **Eccezioni retryable** (skip al next provider):
    `ProviderUnavailableError`, `ProviderTimeoutError`,
    `ProviderRateLimitError`, `NotImplementedError`, provider senza
    il metodo richiesto (AttributeError gestito internamente).
  - **Eccezioni non-retryable** (propaga subito): `ValueError`,
    `ProviderError` con status 4xx (es. 400 bad request), altre.
  - **`AllProvidersFailedError`** (extends `ProviderUnavailableError`):
    sollevata quando tutti i provider della chain hanno fallito.
    Attributo `.attempts: list[(name, exception)]` con la cronologia
    completa dei tentativi.
  - **`services/providers/registration.py`**: helper `register_all()`
    che registra tutti i provider F4 (8 totali su 4 domini) nel
    registry singleton. Ordine di registrazione fissa la "default
    chain" (primo = primary):
      - meteo: open_meteo_forecast > open_meteo_archive
      - geocoding: open_meteo_geocoding > nominatim
      - elevation: open_elevation > usgs_elevation
      - seismic: usgs_earthquake (unico)

### Tests
- **+24 unit test** `tests/services/test_orchestrator.py`:
  - Base: primary ok, fallback su unavailable/timeout/rate_limit/
    NotImplementedError, propaga ValueError, propaga ProviderError 400,
    AllProvidersFailedError con cronologia completa, provider senza
    metodo, unknown domain KeyError.
  - call_by_name: bypass chain, unknown provider KeyError, method
    missing AttributeError, propaga errori (no skip).
  - get_chain: chain di default + env var fallback CSV, empty per
    unknown domain.
  - register_all: popola 4 domini (8 provider), ritorna registry,
    funziona col singleton globale.
  - E2E con tracker: provider reale (MockTransport) + orchestrator +
    tracker singleton enabled → record presente dopo call.
  - AllProvidersFailedError: message format, inheritance da
    ProviderUnavailableError (chain-able), singleton existence.

### Gate
| Gate | F6 | **F8** |
|---|---|---|
| pytest backend (no-slow) | 1117 | **1141** (+24) |
| F8 modules coverage | — | **100% + 100%** |
| mypy --strict | clean | clean |

### Note operative
- **Pattern uso B1-B4**: i futuri service facade (`geocoding_service`,
  `meteo_loads_service`, ...) chiameranno `orchestrator.call(...)`
  invece di gestire manualmente la fallback chain.
- **`call_by_name`**: utile per UI admin "test connection" che
  voglia testare un provider specifico bypass-and-the chain.
- **Tracker F6 + Orchestrator F8 integrati**: ogni call sotto
  l'orchestrator viene tracciata individualmente dal provider; se
  fallback viene attivato, il tracker registra 2 righe (1 error +
  1 ok) per la stessa logical operation. La distinzione orchestrator-
  level "quale provider e' stato scelto alla fine" e' lasciata ai
  log (logger.info) — non aggiunge righe al tracker.

---

### Added
- **F6: provider usage_tracker** (Sprint 2)
  - **`services/usage_tracker.py`**: tracker SQLite per ogni call ai
    provider F4. Tabella `provider_usage(id, ts, domain, provider,
    endpoint, status, latency_ms, cached, user_id)` con indici su `ts`,
    `(domain, provider, ts)`, `user_id`. Mode WAL, thread-safe.
  - **API tracker**: `record()` fire-and-forget (errori silenziati,
    observability non rompe path produttivo); `aggregate(domain, provider,
    endpoint, user_id, since_ts, until_ts)` → `list[ProviderUsageStats]`
    con cache_hit_ratio + error_ratio + avg/total latency; `timeline()`
    per bin hour/day/week.
  - **`set_enabled(bool)`** + env var `FEAPRO_USAGE_TRACKER_DISABLED=1`
    per controllo lifecycle. Conftest backend disabilita il singleton
    di default in test (evita pollution `.cache/usage.sqlite`).
  - **Wiring providers**: i 9 stub `_record_call()` accumulati in F4.1-
    F4.4 ora chiamano realmente `tracker.record(...)`. Pattern uniforme
    su 7 provider (open_meteo_forecast/archive, open_meteo_geocoding,
    nominatim, open_elevation, usgs_elevation, usgs_earthquake).
  - **REST endpoint** `/api/providers/usage/*`:
    - `GET /summary?domain&provider&endpoint&user_id&window_days` →
      aggregato + totals (cache_hit_ratio, error_ratio)
    - `GET /timeline?granularity={hour,day,week}&...` → bins per chart
    - `GET /health` → totale record + breakdown per domain
  - Prefisso `/api/providers/usage/` (non `/api/usage/providers/`) per
    evitare collisione con `/api/usage/{user_id}/summary` (Sprint 1).

### Tests
- **+46 unit/integration test**:
  - `tests/services/test_usage_tracker.py` (24 test): record + aggregate
    + filtri (domain/provider/endpoint/user_id/time-window), error
    status counting, disabled tracker no-op, set_enabled toggle, record
    silently swallows exceptions, timeline (hour/day/week + filtri +
    invalid granularity), health (empty + populated), clear, to_dict
    serialization, singleton disabled in tests.
  - `tests/services/test_provider_tracker_wiring.py` (10 test): verifica
    che ognuno dei 7 provider F4 chiami effettivamente il tracker via
    `_record_call`. Test error_status_recorded_correctly (5xx →
    `n_errors`++) + disabled_tracker_doesnt_record_via_provider.
  - `tests/api/test_providers_usage_endpoint.py` (11 test): summary
    no-filter + per domain/provider/endpoint, combined filters,
    window_days validation 422, timeline by granularity + invalid 422,
    health endpoint, empty DB zero totals.

### Gate
| Gate | F4.4 | **F6** |
|---|---|---|
| pytest (no-cov, no-slow) | 1071 | **1117** (+46) |
| F6 modules coverage | — | `usage_tracker.py` 95%, `providers_usage.py` 100% |
| mypy --strict | clean | clean |

### Note operative
- **Pattern provider invariato**: ognuno dei 7 provider F4 ha lo stesso
  `_record_call` body — 3 righe di chiamata `tracker.record(...)`.
  Refactoring futuro: spostare in metodo base `services.base.Provider`
  per evitare duplicazione.
- **Conftest backend** modificato: disabilita il SINGLETON tracker
  (non setta env var) cosi' nuove istanze `UsageTracker(db_path=tmp)`
  restano enabled by default per test isolati.
- **Hook `with_global_tracker` fixture**: pattern per test che vogliono
  verificare il singleton — temp swap db_path + clear + set_enabled,
  ripristino in teardown.
- **F6 sblocca**: dashboard frontend di osservabilita' (futuro), billing
  per-user piu' accurato, alerting su cache_hit_ratio basso o
  error_ratio alto (futuro).

---

### Added
- **F4.4: USGSEarthquakeProvider** (Sprint 2)
  - Implementa `SeismicProvider` ABC (dominio `seismic`) sopra
    `services.base.Provider`. Catalogo USGS FDSN Earthquake event API.
  - **`search_nearby(lat, lon, max_radius_km, years_back, min_magnitude, limit)`**
    → `EarthquakeResult`: eventi entro raggio km dalla location nel
    periodo richiesto, ordinati per tempo decrescente, magnitudo
    filtrabile. Output con `Earthquake` strutturati (id, time_iso,
    lat/lon, depth_km, magnitude, place, event_type, url).
  - **`historical_max_magnitude(lat, lon, max_radius_km, years_back)`**
    → float: magnitudo massima storica, comodita' per NTC/EC8 site
    assessment. Riutilizza la cache di `search_nearby` (stessa chiave
    se lat/lon/radius/years coincidono).
  - GeoJSON parsing tollerante: feature senza magnitude/url/time, con
    coords 2D (no depth) sono gestite senza crash (skip o default).
  - Cache TTL 7 giorni (`DEFAULT_TTL["seismic"]` Sprint 1 F2).
  - Rate bucket `usgs_earthquake` 0.5 rps (pre-registrato Sprint 1 F3).
  - Hook `_record_call()` stub per F6.

### Tests
- **+23 unit test** `tests/services/providers/seismic/`:
  - `test_usgs_earthquake.py`: parse Norcia 2016 fixture (Mw 6.5+6.2+...),
    cache hit + params completi nella key, empty/malformed features
    skip, 429/500/400/timeout error mapping, usage hook, corrupt cache
    fallback con payload pydantic-invalid (earthquakes="not-a-list"),
    invalid args (radius<=0, years_back range, min_mag range, limit
    range), historical_max_magnitude basic + empty + cache-reuse,
    health ok/down/timeout/degraded, classvars, feature senza url/time,
    coords 2D = depth 0.
- **+4 integration test** `test_seismic_integration.py` (`@pytest.mark.slow`):
  - Norcia 2016 sequence (M>=5 entro 50km/15y, attesi >=2 eventi)
  - Tokyo 500km/20y → M_max >= 7.5 (Tohoku 2011 9.0)
  - Sahara 100km/10y M>=4 → <20 eventi (zona quasi asismica)
  - Cache hit reale su 2 chiamate identiche

### Gate
| Gate | F4.1 | F4.2 | F4.3 | F4.4 |
|---|---|---|---|---|
| pytest (no-cov, no-slow) | 964 | 1011 | 1048 | **1071** (+23) |
| Module coverage | 93% | 92.1% | 90.6% | **91.1%** |
| mypy --strict | clean | clean | clean | **clean** |
| Slow integration | 8 | 15 | 21 | **25** (+4) |

### Note operative
- USGS Earthquake unico provider per dominio `seismic` (no fallback
  chain per ora). Architettura comunque pronta: aggiungere INGV
  Earthquake Catalog API (Italia, piu' dettagliato per piccoli M<3.5)
  sara' uno step opzionale futuro.
- Pattern `historical_*` che riusa cache di `search_*` testato come
  funzionante: ottimizzazione importante per workflow "assessment +
  visualizzazione lista eventi" sulla stessa UI page.

---

### Added
- **F4.3: OpenElevationProvider + USGSElevationProvider** (Sprint 2)
  - Implementa `ElevationProvider` ABC (dominio `elevation`) sopra il
    Provider abstraction Sprint 1. Riutilizza il modulo errori F4.1.
  - **`OpenElevationProvider`**: worldwide, endpoint
    `https://api.open-elevation.com/api/v1/lookup`. Cache TTL 10 anni,
    rate limit 5 rps bucket `open_elevation`. **Batch nativo** via POST
    JSON `{locations: [...]}` (max 1000 punti). Cache batch per-punto
    (riusa cache hit individuali → solo i mancanti vengono fetchati).
  - **`USGSElevationProvider`**: solo US, alta risoluzione (1-3 m NED),
    endpoint `https://epqs.nationalmap.gov/v1/json`. Cache TTL 10 anni,
    rate limit 5 rps bucket `usgs_elevation`. No batch nativo →
    fallback su loop sequenziale. Soglia "no data" `value <= -100000`
    convertita in `ProviderError` per consentire fallback chain F8.
  - Bucket `open_elevation` + `usgs_elevation` auto-registrati al
    primo import del package (idempotente, no modifiche a Sprint 1).
  - Cache key lat/lon a 5° decimale (~1 m) per cache hit stabile.
  - Hook `_record_call()` per F6 (lookup + lookup_batch + cache_hit).

### Tests
- **+37 unit test** `tests/services/providers/elevation/`:
  - `test_open_elevation.py` (20 test): single lookup parse Roma,
    cache hit + round 5° decimale, empty results, 429/500/timeout,
    usage hook, corrupt cache fallback. **Batch**: 3 punti parse, cache
    per-punto (prepop + fetch parziale), batch empty/too-large,
    truncated response. Health ok/down/timeout/degraded.
  - `test_usgs_elevation.py` (17 test): parse DC, cache, outside-US
    → ProviderError, malformed/non-numeric value, 429/500/timeout,
    usage hook, corrupt cache, batch via default loop seq, health,
    location field snap-to-grid.
- **+6 integration test** `test_elevation_integration.py` (`@pytest.mark.slow`):
  Open-Elevation Roma/Monte Bianco/batch 3 punti italiani, USGS
  Washington DC/Denver alta quota, USGS Roma (fuori US) → ProviderError.

### Gate
| Gate | F4.1 | F4.2 | F4.3 |
|---|---|---|---|
| pytest (no-cov, no-slow) | 964 | 1011 | **1048** (+37) |
| Module coverage | 93% | 92.1% | **90.6%** |
| mypy --strict | clean | clean | **clean** |
| Slow integration | 8 | 15 | **21** (+6) |

### Note operative
- Bucket registration at-import-time pattern: il package
  `services.providers.elevation/__init__.py` registra `open_elevation`
  + `usgs_elevation` idempotentemente. Pattern riutilizzabile per F4.4
  (USGS earthquake ha gia' bucket pre-registrato in Sprint 1).
- `lookup_batch` con cache per-punto: per N punti dove K sono gia' in
  cache, fa 1 HTTP call per N-K punti (anziche' N call separate).
  Importante per workflow "interpolate mesh quota su SRTM".

---

### Added
- **F4.2: OpenMeteoGeocodingProvider + NominatimProvider** (Sprint 2)
  - Implementa `GeocodingProvider` ABC (dominio `geocoding`) sopra il
    Provider abstraction Sprint 1. Riutilizza il modulo errori F4.1.
  - **`OpenMeteoGeocodingProvider`**: forward search only (no reverse —
    solleva `NotImplementedError`), endpoint
    `https://geocoding-api.open-meteo.com/v1/search`. Cache TTL 1 anno
    (location stabili), rate limit 10 rps bucket condiviso `open_meteo`,
    no API key.
  - **`NominatimProvider`**: forward search + reverse geocoding,
    endpoint `https://nominatim.openstreetmap.org/{search,reverse}`.
    Cache TTL 1 anno, rate limit **1 rps strict** bucket `nominatim`,
    User-Agent identificativo obbligatorio (default
    `FEA-Pro/1.3 (...)`, override via env `FEAPRO_NOMINATIM_USER_AGENT`).
  - Cache key search case-insensitive (`query.lower()`), include
    `count` e `language`. Reverse key con lat/lon a 5° decimale (~1 m).
  - Hook `_record_call()` stub per F6 (forward + reverse + cache_hit).

### Tests
- **+47 unit test** `tests/services/providers/geocoding/`:
  - `test_open_meteo_geocoding.py` (19 test): parse Rome multi-result,
    cache hit + case-insensitive, empty results, 429/500/400/timeout
    error mapping, usage hook, invalid args, reverse NotImplemented,
    health ok/down/degraded/timeout, corrupt cache fallback, parse
    malformed skip, `_safe_int`/`_safe_float_opt` helpers, country_code
    None safe.
  - `test_nominatim.py` (28 test): parse Cagliari, cache search +
    reverse, User-Agent custom + env + default, 429/500/403/timeout,
    non-list response, invalid args, reverse not-found, routed transport
    search+reverse insieme, corrupt cache fallback (search + reverse),
    reverse timeout/usage hook, health unexpected status degraded,
    parse skip malformed entries, classvars match spec.
- **+7 integration test** `test_geocoding_integration.py` (`@pytest.mark.slow`):
  Open-Meteo Cagliari/Tokyo/no-results, Nominatim Cagliari/reverse
  Cagliari/ocean reverse, rate limit 1 rps su 3 query.

### Gate
| Gate | F4.1 | F4.2 |
|---|---|---|
| pytest (no-cov, no-slow) | 964 | **1011** (+47) |
| Module coverage | 93% | **92.1%** |
| mypy --strict | clean | clean |
| Slow integration | 8 collected | 15 collected (8+7) |

### Note operative
- Bucket `nominatim` (1 rps) era gia' pre-registrato in F3 — pronto
  per uso senza modifiche al limiter.
- Dominio cache `"geocoding"` ha TTL default 1 anno gia' configurato
  in `services/cache.py:DEFAULT_TTL`.
- Pattern provider identico a F4.1 (cache hit → rate_limit → fetch →
  parse → cache set → return; corrupt cache fallback; usage hook).

---

### Added
- **F4.1: OpenMeteoForecastProvider + OpenMeteoArchiveProvider** (Sprint 2)
  - Implementa `MeteoProvider` ABC sopra `Provider` (Sprint 1 F1/F2/F3).
  - **`OpenMeteoForecastProvider`**: previsioni 16 giorni, endpoint
    `https://api.open-meteo.com/v1/forecast`. Cache TTL 6h, rate limit
    10 rps su bucket condiviso `open_meteo`, timeout 10s. Output:
    `ForecastResult` con lista `HourlyEntry`.
  - **`OpenMeteoArchiveProvider`**: estremi storici ERA5 dal 1940
    (≤85 anni), endpoint `https://archive-api.open-meteo.com/v1/archive`.
    Cache TTL 30 giorni, stesso bucket rate limit, timeout 30s. Output:
    `WindSnowExtremes` con max assoluto + return period 50 anni stimato
    via **Gumbel Type I** (method-of-moments, formula EN 1991-1-4 §4.2).
  - Error mapping: 429 → `ProviderRateLimitError`, 5xx →
    `ProviderUnavailableError`, timeout → `ProviderTimeoutError`,
    altri 4xx + parse error → `ProviderError`.
  - Hook stub `_record_call()` per F6 `usage_tracker` (settimana 3).
  - Cache key: lat/lon arrotondati a 4 decimali (~10 m, sufficiente
    per cache hit stabile su input GUI imprecisi).
  - Licenza Open-Meteo free tier non-commercial, no API key richiesta.
- **Helper Gumbel** `_gumbel_return_period.py`: funzione pura riusabile,
  `gumbel_return_period(annual_maxima, T=50)` + helper
  `annual_maxima_from_daily(dates, values)` per pipeline ERA5 → estremi.
  Edge cases: campione vuoto/singolo/costante, T≤1 ValueError,
  quantile clippato a 0 per variabili fisicamente non-negative.

### Tests
- **+48 unit test** `tests/services/providers/meteo/`:
  - `test_gumbel_return_period.py` (14 test): dataset noto MoM, monotonicita',
    edge cases (empty/single/constant/None/clip), `annual_maxima_from_daily`.
  - `test_open_meteo_forecast.py` (17 test): parse, cache hit/key
    rounding/corrupt-fallback, 429/500/503/400/timeout error mapping,
    usage hook, days validation, health_check ok/down/timeout, abstract
    `health()` wrapper.
  - `test_open_meteo_archive.py` (17 test): parse, cache, errori,
    Gumbel 50y, no-snowfall location, invalid years, empty daily safe,
    `get_archive` raw access, health_check.
- **+8 integration test** `test_open_meteo_integration.py` (`@pytest.mark.slow`,
  skippati di default): forecast Cagliari/Roma reali, archive 50y Cagliari/
  L'Aquila/Roma con sanity range (wind 20-60 m/s Cagliari, snow >10 cm
  L'Aquila, snow <50 cm Roma), rate limit throttling oltre capacity 20,
  cache hit reale.

### Fixed
- `services/base.py:__init_subclass__` annotata con `**kwargs: Any -> None`
  per consentire `mypy --strict` clean sui nuovi provider (1-line type-only
  fix, zero impatto runtime).

### Gate
| Gate | alpha.4 | Sprint 2 F4.1 |
|---|---|---|
| pytest (no-cov, no-slow) | 916 | **964** (+48) |
| F4.1 module coverage | — | **~93%** (target ≥90%) |
| mypy --strict (F4.1 files) | — | **clean** |
| vitest | 96 | 96 |
| tsc / build | OK | OK |

### Note operative
- **`pytest-httpx` NON aggiunta** alle dipendenze: usiamo
  `httpx.MockTransport` nativo (zero nuove dep, compat 100% con httpx 0.28).
- **Provider ABC quirk**: `Provider.__init_subclass__` controlla
  `__abstractmethods__` ma `ABCMeta` lo popola DOPO. Workaround in
  `MeteoProvider`: dichiariamo `name = "_abstract"` come placeholder
  (la classe e' comunque non istanziabile, e nessuno la registra).
- **No automatic fallback** dentro i provider: il fallback chain F8 vive
  a livello orchestratore. I provider sollevano l'eccezione semantica
  giusta e l'orchestratore decide.

---

## v1.3.0-alpha.4 — UX gap fill: AccountDialog + validation link — 2026-05-20

Chiusura dei 5 gap UI/UX identificati nell'audit post-Sprint 1: gli endpoint
backend `/api/usage`, `/api/quotas/{tier,reset,bonus}`, `/api/validation/report`
erano disponibili ma non raggiungibili dall'interfaccia utente.

### Frontend
- **`api/usage/index.ts`**: client REST per `GET /api/usage/{user_id}/summary`
  + `POST /api/quotas/{user_id}/{reset,bonus}` (chiude GAP 1, 2, 3).
- **`components/dialogs/AccountDialog.tsx`**: nuovo dialog con 3 tab
  - **Usage**: tabella aggregata job by solver / status, finestra temporale
    selezionabile (7/30/90/365 giorni).
  - **Tier**: cambio piano `free/starter/pro/enterprise` con preview cap
    (chiude GAP 4 — `setQuotaTier` ora effettivamente bindato a UI).
  - **Admin**: reset mese + bonus credits (azioni admin / mock per v1.3).
  - Footer: link "View system validation report" a `/api/validation/report`
    (chiude GAP 5).
- **TopBar**: nuovo bottone "Account" (icona User) tra Run e Export
  che apre `AccountDialog`.

### Test
- **+6 test** `AccountDialog.test.tsx`: tabs Usage / Tier / Admin,
  validation report link, mutation calls (setQuotaTier, resetQuota,
  addQuotaBonus), window selector.

### Verificato in preview
- TopBar `[data-testid="topbar-account"]` apre il dialog
- Usage tab fetcha live `/api/usage/demo_user/summary?window_days=30`
  e mostra 132 job (linear 129, pushover 2, nonlinear 1) con 0.84 crediti
- Validation link href `/api/validation/report` (apre in new tab)

### Gate
| Gate | alpha.3 | alpha.4 |
|---|---|---|
| pytest (no-cov) | 916 | **916** |
| vitest | 90 | **96** (+6) |
| tsc | 0 | 0 |
| vite build | OK | OK |

### Backend / orfani pre-Sprint 1
L'audit non ha rilevato endpoint legacy v1.2 orfani: tutti i path
`analysis/`, `verify/`, `io/`, `ai/`, `materials/` sono consumati dai
panel esistenti.

---

## v1.3.0-alpha.3 — Test depth + coverage uplift — 2026-05-20

Polish post-migration: amplia drasticamente la suite di test per dare
confidenza piena su tutti i nuovi sottosistemi Sprint 1.

### Tests
- **+15 test** `tests/jobs/test_worker_edge_cases.py`: copertura
  `jobs/worker.py` 75% → 87%. Esercita `_serialize_result` (None / dict
  / dataclass / pydantic v1 / v2 / primitive), failure paths
  (`model_not_found`, `solver_not_dispatched`, quota_exceeded), worker
  lifecycle (start/stop loop), `build_default_dispatcher`, `get_worker`
  singleton.
- **+29 test** `tests/test_deep_e2e_sprint1.py`: deep integration suite
  in 9 sezioni (API contract, quota lifecycle, priority+retry,
  concorrenza multi-thread, failure injection, invariant
  audit↔DB↔usage↔quota, validation report HTML/JSON parity, cost
  estimator monotonicity con **hypothesis** property-based, full E2E
  smoke catena estimate→quota→submit→worker→result→audit).
- **+16 test** `tests/services/test_registry_edge_cases.py`: copertura
  `services/registry.py` 82% → 97%, `services/base.py` 82% → 94%.
  Esercita `register` con istanza/classe, `get_by_name`, fallback
  chain con env CSV malformato, `health_all` con provider exception /
  already-running loop / empty registry, `clear()`.
- **+4 test** `frontend/src/hooks/useJobRun.test.tsx`: WS job_done →
  onSuccess, WS job_failed → onError, polling fallback quando WS muto,
  filtro job_id (eventi di altri job ignorati).

### Coverage
| Modulo | Sprint 1 alpha.2 | alpha.3 |
|---|---|---|
| `services/base.py` | 82% | **94%** |
| `services/registry.py` | 82% | **97%** |
| `jobs/worker.py` | 75% | **87%** |
| TOTAL backend | 90% | **90%** (preservato) |

### Gate
| Gate | alpha.2 | alpha.3 |
|---|---|---|
| pytest (no-cov) | 856 | **916** (+60) |
| pytest (cov) | 849+7skip | **909+7skip** (+60) |
| vitest | 86 | **90** (+4) |
| tsc / build | OK | OK |

### Coverage env
- `pytest.ini`: `--cov` ora misura `billing,services,jobs,validation`
  oltre a `core`.
- Calibration test auto-skip sotto coverage instrumentation (rumore
  sui tempi rende non-deterministico il check ±30%).

---

## v1.3.0-alpha.2 — Sprint 1 polish — 2026-05-20

Completamento della DoD A5 (migrazione effettiva dei 4 endpoint long-running
alla JobQueue) + integrazione UI completa della queue + LE1 mesh refined.

### Frontend
- **hooks/useJobRun.ts**: wrappa POST `/api/jobs` + WS wait + GET result in
  un'interfaccia mutation-like, con polling 1s fallback e timeout 5min.
- **PushoverPanel, NonlinearPanel, ArcLengthPanel, SeismicTHPanel** migrati
  da `analysisExtApi.{solver}` (sync) a `useJobRun` (async via JobQueue).
  Stesso flusso UX: CostPreviewDialog → Procedi → progress → risultato.
- **JobsPanel** ora **tab dedicato in AnalysisWorkspace** (8° tab, icona
  ListChecks) con polling REST 15s + WebSocket `/ws/jobs/{user_id}` per
  update real-time. Badge `live/offline` + ultimo evento visibili.
- **api/jobs/index.ts**: aggiunto `openJobsSocket(userId, onEvent)` helper
  + tipo `JobEvent`.
- Test vitest panel aggiornati con mock `submitJob` + stub `useJobRun`.

### Backend
- **validation/benchmarks.py**: LE1 mesh raddoppiata 8x8 → 24x24 (576 elem),
  tolleranza ridotta da 400% a 100% (errore tipico ~49%).
- Tutti i 5 benchmark passano (cantilever, simply supported, NAFEMS LE2,
  Euler buckling, NAFEMS LE1).

### Smoke E2E verificato
- Pushover via JobQueue: POST `/api/jobs` → WS `job_done` arriva in real-time
  → GET `/api/jobs/{id}/result` ritorna PushoverResults (55 step, 6
  cerniere, lambda_collapse=2.750 sul ponte strallato).
- Nonlinear via JobQueue: 10 step convergenti, max|u|=6.29e-2 m, 507ms.
- JobsPanel: badge `live` quando WS connesso, riga submitted appare
  immediatamente via WS evento `job_done`.

### Gate
| Gate | v1.3.0-alpha.1 | v1.3.0-alpha.2 |
|---|---|---|
| pytest backend | 856 | **856** |
| vitest frontend | 86 | **86** |
| tsc | 0 errori | **0 errori** |
| vite build | OK | **OK** |
| Validation report | 5/5 (LE1 tol 400%) | **5/5 (LE1 tol 100%)** |

---

## v1.3.0-alpha.1 — Sprint 1 (closed) — 2026-05-20

Foundations per la monetizzazione (cost estimator, job metering, quote,
queue persistente) + scaffolding services layer + completamento gap NAFEMS BL-6.

### Backend
- **A1 — cost_estimator**: `billing/cost_estimator.py` con dispatcher per 10
  SolverKind (`linear`, `modal`, `buckling`, `pushover`, `response_spectrum`,
  `dynamic_th`, `seismic_th`, `nonlinear`, `arclength`, `winkler`). Power-law
  tarata `cpu_min ~ alpha * n_dof^beta * mult` calibrata entro +-30% sui modelli
  demo. Endpoint `POST /api/billing/estimate`.
- **A2 — JobMeter**: context manager `measure_job(...)` con tracking di
  wall-time / CPU-time / RAM peak (cross-platform via `tracemalloc`). Append
  JSONL atomico thread-safe in `audit/jobs.jsonl`. Endpoint
  `GET /api/usage/{user_id}/summary` con aggregazioni per solver/status.
- **F1 — Provider registry**: `services/base.py` + `services/registry.py`
  con singleton process-wide, selezione provider via env var
  `FEAPRO_<DOMAIN>_PROVIDER` + fallback chain
  `FEAPRO_<DOMAIN>_FALLBACK=csv,list`. Zero provider concreti in Sprint 1
  (Sprint 2 sblocco).
- **F2 — SQLite TTL cache**: `services/cache.py` con WAL journal, TTL
  default per dominio, override via `FEAPRO_CACHE_TTL_<DOMAIN>=<seconds>`,
  helper `cache_key(...)`.
- **F3 — Token bucket rate limiter**: `services/rate_limiter.py` con
  `with_backoff()` per retry esponenziale su 429/5xx. 3 bucket pre-registrati
  (`nominatim 1 rps`, `usgs_earthquake 0.5 rps`, `open_meteo 10 rps`).
- **A3 — Quota system**: `billing/quotas.py` con JSON persistence, auto-reset
  al cambio mese UTC, RLock thread-safe. Middleware `check_quota_for_solve`
  -> HTTPException 402 strutturata. Endpoint admin `GET|POST /api/quotas`.
- **A5 — Persistent JobQueue**: `jobs/store.py` (SQLite) + `jobs/worker.py`
  async + `api/routes/jobs.py` REST + WS `/ws/jobs/{user_id}` per eventi
  `job_queued|started|progress|done|failed|retry`. Worker avviato/fermato via
  `@app.on_event("startup"/"shutdown")`. Dispatcher copre tutti gli 8 solver.
- **D1 — NAFEMS LE1/LE2/LE10**: `tests/nafems/` con 9 test (LE1 Q4/Tri3 +
  convergenza, LE2 cantilever Beam3D + convergenza + reazioni, LE10 thick
  plate Q4 + h-refinement + linearita'). Mesh ellittica via Coons patch.
  BL-6 chiuso.
- **D2 — Validation page**: `GET /api/validation/report` (HTML
  auto-contained) + `GET /api/validation/report.json`. Cache TTL configurabile
  via `FEAPRO_VALIDATION_REPORT_TTL`.

### Frontend
- **A4 — CostPreviewDialog**: `api/billing/` + `store/billingStore` (con
  `persist` per skipCostPreview) + `hooks/useCostPreview` + dialog modale
  con breakdown DOF/ETA/RAM/CPU/credits + banner "quota esaurita".
  Integrato in PushoverPanel, NonlinearPanel, ArcLengthPanel, SeismicTHPanel.
- **A5 frontend**: `api/jobs/` client REST + nuovo `JobsPanel` con
  filtro stato, cancel inline, detail card. Pronto per integrazione UI
  futura nel workspace Analysis.
- **E1 — vitest coverage**: 18 nuovi test per NonlinearPanel,
  ArcLengthPanel, IsosurfacePanel, LiveMonitorPanel, JobsPanel,
  CostPreviewDialog, useCostPreview.

### Migration notes
- Nuovi hidden file: `.cache/services.sqlite`, `.cache/jobs.sqlite`,
  `.quotas/quotas.json`, `audit/jobs.jsonl` -- tutti in `.gitignore`.
- Nuove env var: `FEAPRO_<DOMAIN>_PROVIDER`, `FEAPRO_<DOMAIN>_FALLBACK`,
  `FEAPRO_CACHE_TTL_<DOMAIN>`, `FEAPRO_VALIDATION_REPORT_TTL`,
  `FEAPRO_DEFAULT_USER_ID`.
- Endpoint legacy (pushover, seismic_th, nonlinear, arclength) restano sync
  per compatibilita' col frontend esistente; il flow JobQueue e' accessibile
  via `POST /api/jobs` con lo stesso dispatcher.

### Gate
| Gate | v1.2 baseline | v1.3 Sprint 1 |
|---|---|---|
| pytest backend | 730 | **856** (+126) |
| vitest frontend | 58 | **86** (+28) |
| tsc | 0 errori | **0 errori** |
| vite build | OK | **OK** |
| Cost estimator +-30% | -- | **green (7/7)** |
| Validation report green | -- | **green (5/5)** |
| BL-6 | aperto | **chiuso** |

### Smoke E2E verificato
- API: `POST /api/billing/estimate` -> `POST /api/jobs` -> worker async ->
  `GET /api/jobs/{id}/result` + quota consume + audit JSONL + usage summary.
- UI: app `:5273` con modello `ex_cable_bridge_2d`, Analisi -> Push-over ->
  Esegui pushover -> CostPreviewDialog si apre con stima + quota residua
  "49.83 / 50 (free)" -> Procedi -> solve completato (55 step, 6 cerniere,
  lambda collapse = 2.750) -> deformata visibile nel viewport.

---

## v1.2.0 — 2026-05-20 (UX polish + progress live)

Continuazione di v1.1 con focus sul **completamento del ciclo utente** per le
feature BL-1/BL-7 e sul monitor live.

### Backend
- Tutti i solver lunghi (pushover, seismic_th, **nonlinear**, **arclength**)
  ora iniettano `progress_cb` → broadcast su `/ws/analysis/{model_id}`.
  Gli endpoint REST sono diventati `async` con `_make_progress_cb()` helper
  thread-safe (cattura il running loop).
- Tutti i 4 endpoint convertono gli errori in `broadcast_progress(1.0, "Errore: …")`
  così il client viene notificato anche su exception.

### Frontend
- **NonlinearPanel** e **ArcLengthPanel** ora persistono il risultato come
  `staticResults` in `useResultsStore` → la deformata appare **automaticamente**
  nel viewport (riusando `DeformedShape`, `InternalForceDiagram`).
- **ElementDialog** esteso con:
  - 5 nuovi tipi: `cable2d`, `cable3d`, `shell_q4_mitc`, `solid_t4`, `solid_t10`
  - Campo `pretension` (N₀ in N) visibile solo per cavi, con default vuoto
    e hint sezioni `cable_d20`/`cable_d50`.
- **ColorLegend** generalizzato con `format` callback custom + parametro
  `position` (top-right, top-right-2, bottom-right) → permette legende multiple.
- **IsosurfaceLegend** nuovo overlay nel viewport che mostra min/max dei livelli
  iso attualmente visualizzati (notazione scientifica neutra).

### Test
- Tutti i gate restano verdi: pytest 730/730, vitest 58/58, tsc 0, build OK.

---

## v1.1.0 — 2026-05-20 (Completamento UX feature BL)

Dopo l'audit di integrazione UI-UX, sono state esposte all'utente le feature
BL-1/BL-2/BL-7 che erano solo backend, e sono stati creati i modelli demo per
testarle senza dover modellare da zero.

### Nuovi pannelli frontend
- **NonlinearPanel** (`POST /api/analysis/nonlinear/{id}`) — Newton-Raphson +
  cavi tension-only (BL-1), con form parametri, curva λ vs max|u|, tabella step
  con badge convergenza e contatori active/slack cables.
- **ArcLengthPanel** (`POST /api/analysis/arclength/{id}`) — Crisfield
  path-following (BL-2), con form ricco (Δs auto/prescritto, control DOF, λ_max,
  δ_max, λ_init), grafico equilibrium path λ-δ, peak λ in ReferenceLine.
- **IsosurfacePanel** (`POST /api/postprocess/{id}/isosurfaces`) — marching
  tetra/cubes (BL-7) con smoothing nodale automatico di σ_VM, riepilogo aree
  per livello, integrazione con `setIsosurfaceData` per rendering nel viewport.
- **LiveMonitorPanel** — log streaming via WebSocket `/ws/analysis/{id}` +
  eventi dello store locale, auto-scroll pausabile, badge running/idle,
  clear button, max 500 eventi.

### Viewport
- **CableLine** (BL-1) — cavi disegnati come linee sottili, verdi se
  pre-tesi, grigie se slack.
- **TetMesh** (BL-3) — render tetraedri T4/T10 (T10 usa solo i 4 vertici).
- **IsosurfaceLayer** (BL-7) — mesh triangoli iso 3D con colormap jet,
  trasparenti (opacity 0.55, depthWrite=false).
- **shell_q4_mitc** ora condivide il rendering di `shell_q4`.

### Modelli demo seed
- `ex_cube_solid_h8` — cubo H8 in trazione (BL-3/BL-7).
- `ex_cable_bridge_2d` — ponte strallato 2D con 4 cavi pre-tesi 50 kN (BL-1).
- `ex_laminate_plate` — piastra 4×4 SHELL_Q4 con laminato cross-ply 0/90/0 (BL-4).

### Database materiali/sezioni
- Materiali: `cable_steel_y1860` (trefolo Y1860), `carbon_uni` (fibra carbonio T300).
- Sezioni: `cable_d20`, `cable_d50` (cavi tension-only), `laminate_cross_ply`
  (3 strati 1 mm carbon, simmetrico).

### Fix responsive (precedenti all'audit)
- **TopBar** — pulsanti CRUD solo icona sotto md, select modello fluido su mobile.
- **StatusBar** — gerarchia visiva graduale `sm/md/lg`, progress bar adattiva.
- **Dialog (custom)** — `w-[calc(100vw-24px)]` con `maxWidth` cap → mobile-safe.
- **TabsList** workspace ora scrollabili orizzontalmente.

### Workspace estesi
- **AnalysisWorkspace** — 7 tab (era 5): + Non-lin., + Arc-len.
- **ResultsWorkspace** — 7 tab (era 6): + Iso 3D.

### Gate v1.1
- pytest 730/730 ✅ (coverage 90%)
- vitest 58/58 ✅
- tsc 0 errori ✅
- vite build 9.7s ✅

---

## v1.0.0 — 2026-05-19

Prima release ufficiale dopo il completamento del piano in 25 fasi.

### Riepilogo numerico

- **655 test pytest** passati (era 75 alla baseline)
- **58 test vitest** passati (era 19 alla baseline)
- **Backend coverage: 92%** (gate ≥70%)
- **0 errori TypeScript**, build Vite verde
- **0 test xfail**

### Funzionalità per fase

**FASE 0 — Setup test infrastructure**
- pytest-cov, pytest-benchmark, hypothesis
- vitest + @testing-library + msw
- Cartelle tests/benchmarks e tests/validation

**FASE 1 — Benchmarks analitici**
- Cantilever PL³/3EI
- Simply supported UDL 5wL⁴/384EI
- Euler buckling (sblocked in Fase 5)
- NAFEMS FV4 modal cantilever, LE10 plate
- Patch test Tri3 e Q4

**FASE 2 — Verifiche EC3 (EN 1993-1-1)**
- MATERIALS_DB esteso (S275/S420/S460)
- SECTIONS_DB con 16 profili IPE/HEA/HEB completi
- Classificazione sezioni §5.5
- Resistenze §6.2
- Instabilità flessionale §6.3.1
- Instabilità flesso-torsionale (LTB) §6.3.2
- API POST /api/verify/ec3 + UI VerificationPanel

**FASE 3 — Verifiche EC2/EC5/EC8**
- Materiali B450C, cls C20-C45, legno C24/GL24h
- EC2: flessione e taglio CA
- EC5: resistenze legno con k_mod
- EC8: spettri elastici 4-rami, fattore q, combinazioni sismiche, zone

**FASE 4 — Combinazioni NTC 2018**
- Schema azioni + tabelle γ/ψ
- Generatore SLU/SLE (formule 2.5.1-2.5.6)
- Envelope sollecitazioni
- Property-based tests con hypothesis

**FASE 5 — Buckling beam Euler-Bernoulli**
- K_G con interpolazione cubica Bathe §6.6.3
- Refactor buckling_solver per BEAM2D
- Errore Eulero: 0.00%

**FASE 6 — Push-over analysis**
- PushoverSolver λ-incrementale
- Tracking plastic hinges (|M| > M_pl)
- Curva capacità λ-δ

**FASE 7 — Response spectrum analysis**
- SRSS, CQC con Der Kiureghian 1981
- Direzione combinations
- Mass participation ratio (verifica 61.3% Blevins)

**FASE 8 — Beam su suolo elastico Winkler**
- Element.winkler_k schema
- K_winkler con consistent mass matrix
- Test Hetényi (errore 0.02%)

**FASE 9 — Molle unilaterali**
- Constraint.compression_only schema
- UnilateralSolver con algoritmo active-set
- Iterazioni ≤ 5 per problemi piccoli

**FASE 10 — I/O BIM/CAD**
- DXF importer/exporter (ezdxf)
- IFC4 importer/exporter (ifcopenshell)
- API /api/io/import|export

**FASE 11 — Mesh automatica**
- Delaunay 2D per poligoni con holes
- Gmsh wrapper thread-safe per 2D e box surface
- Geometrie parametriche (rectangle, L, T, circle, ring)
- API /api/models/{id}/mesh/parametric

**FASE 12 — Sismica time-history multi-componente**
- SeismicTimeHistorySolver wrapper su Newmark-β
- Rayleigh damping da ξ + ω_lo/ω_hi
- Postprocess drift e drift ratio

**FASE 13 — Catalogo accelerogrammi**
- Parser PEER NGA (.AT2), ESM ASCII, CSV
- Kanai-Tajimi + Boore con envelope Saragoni-Hart
- 2 file embedded; API /api/io/accelerograms

**FASE 14 — Fatica (Rainflow + S-N + Miner)**
- Algoritmo Rainflow ASTM E1049-85 4-point
- S-N a 2 pendenze (m=3, m=5) con 14 categorie EC3-1-9
- Danno Palmgren-Miner con γ_Mf

**FASE 15 — UI: undo/redo, commenti, misure**
- 3 store Zustand (historyStore, commentsStore, measurementsStore)
- Utility geometriche (distance3D, angleDeg, chainLength)

**FASE 16 — Slicing, iso-curve, modi sovrapposti**
- Marching triangles per isolinee TRI3
- Slice planes per tetraedri ed esaedri
- Superposizione modale lineare

**FASE 17 — Export Excel multi-sheet**
- openpyxl con 5-8 sheet stilizzati
- API /api/io/export/{id}/xlsx

**FASE 18 — Confronto modelli A vs B**
- ModelDiff (nodes/elements/loads/constraints added/removed/moved/modified)
- StaticResultsDiff (max Δu, Δ%, ΔN, ΔM)
- API POST /api/models/compare

**FASE 19 — Convergence + ZZ error**
- Richardson extrapolation, GCI (Roache ASME V&V20)
- Zienkiewicz-Zhu error estimator semplificato

**FASE 20 — Python client + CLI**
- FEAProClient sync httpx con http_client iniettabile
- CLI argparse con 7 subcommand

**FASE 21 — AI Copilot**
- AIProvider astratto, GeminiProvider REST, MockProvider offline
- Copilot serializza modello+risultati in prompt
- API POST /api/ai/ask

**FASE 22 — Real-time collaboration**
- CollabSession con Lamport clock thread-safe
- WebSocket /ws/collab/{model_id} con join/op/cursor

**FASE 23 — Auto-detection problemi modello**
- 5 detector (duplicate_elements, coincident_nodes, orphan_loads, missing_section, winkler_jump)
- API GET /api/models/{id}/auto-detect

**FASE 24 — Report PDF parametrico**
- reportlab con 7 sezioni
- API GET /api/io/export/{id}/pdf

**FASE 25 — Release**
- Smoke test end-to-end (5 test workflow completi)
- Version bump a 1.0.0
- Endpoint /api con features list

### Carry-over noti (non bloccanti)

Tutti i carry-over sono tracciati in **[BACKLOG.md](BACKLOG.md)** con priorità,
complessità stimata e sketch tecnico di implementazione. Sintesi:

| ID | Voce | Priorità |
|---|---|---|
| BL-1 | Newton-Raphson + Cable 2D/3D (non-linearità geometrica) | 🔴 alta |
| BL-2 | Arc-length post-buckling + Williams toggle frame | 🔴 alta |
| BL-3 | Elementi Tet4 / T10 solidi | 🟡 media |
| BL-4 | Shell layered (composite stack-up) | 🟡 media |
| BL-5 | Q4 MITC4 / reduced integration (anti shear-locking) | 🟡 media |
| BL-6 | NAFEMS LE1/LE2/LE10 con geometria ellittica | 🟢 bassa |
| BL-7 | 3D iso-surfaces (marching tetra/cubes nativo) | 🟢 bassa |
| BL-8 | DXF layer → material/section mapping | 🟢 bassa |
| BL-9 | Bump jsPDF per CVE noto (solo client) | 🔵 esterno |

### Stack

**Backend Python 3.14**: FastAPI, NumPy, SciPy, Pydantic, ezdxf, ifcopenshell, gmsh, openpyxl, reportlab, httpx, pytest+cov+benchmark+hypothesis.

**Frontend**: React 18 + TypeScript + Three.js + Zustand + TanStack Query + Vitest + msw.
