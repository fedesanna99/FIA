# ROADMAP — FEA Pro

> Visione evolutiva. Per il backlog tecnico granulare e i carry-over di v1.0.0 vedi `BACKLOG.md`.
> Per la specifica del redesign UI vedi `UI_REDESIGN_SPEC.md`.

**Stato corrente**: `v2.3.2-persist-ci` (snapshot persistence localStorage +
CI extended feature/**). Post v2.3.0 (multi-model compare + undo/redo store-level)
e v2.3.1 (snapshot rename inline + diff Δ%). 584 vitest verdi, 660+ pytest verdi,
deploy live su https://fea-pro.fly.dev/.

> **Versioning note (2026-05-23)**: i tag `v1.7.1-polish-debt` e
> `v1.7.2-polish-pass2` derivano dal **nome del piano tematico**
> "v1.7 Polish & perf" che era nella vecchia sezione "Roadmap futura"
> di questo file. Cronologicamente vengono *dopo* v1.8.5-mobile ma
> il numero retrocede. Per evitare future confusioni, la "Roadmap
> futura" è stata rinumerata da v1.9 in poi (vedi §"Roadmap futura"),
> e i piani tematici (Connect / Pro tools / Cloud-native) non
> coincidono più con tag semver bassi.

---

## Storia recente

### v2.3.0 → v2.3.2 — Compare + Undo + Persistenza
**Stato**: ✅ Chiuso (2026-05-23)
- v2.3.0 (`v2.3.0-compare-undo`): ComparePanel A vs B con auto-fetch React Query +
  Undo/Redo store-level (Ctrl/Cmd+Z e Ctrl/Cmd+Y su ogni mutation modelStore) +
  `useModelHistory` singleton con snapshot push automatico.
- v2.3.1 (`v2.3.1-snapshot-diff`): rename snapshot inline (doppio click sul nome) +
  panel "Confronta" con delta% su `max_u`, `max_σ`, `f₁`.
- v2.3.2 (`v2.3.2-persist-ci`): snapshotStore persistito su localStorage via
  zustand `persist` middleware + CI workflow esteso su `feature/**` con
  `npm ci` e concurrency `cancel-in-progress`.

### v2.0 → v2.2 — Audit ingegneristico end-to-end
**Stato**: ✅ Chiuso
- 9 bug audit ingegneristico (B1-B9) chiusi
- AuthGate full-screen + bootstrap idempotente + 401 auto-logout
- CORS lockdown via env-var (no più `*`)
- Cleanup dead code: 9 file, 1139 LOC rimosse
- Lazy-load 7 dialog/wizard pesanti (main bundle −65 kB)
- Touch target mobile WCAG 2.5.5
- v2.2.2-audit-deep: auth gate + nav dedup + audit ingegneristico chiuso

### v1.9 — Demo Slice Percorsi (chiuso, ~v2.0)
**Stato**: ✅ Implementato in fase v1.9/v2.0
- PercorsoStepper 6-step (Trave bi-appoggiata UC1)
- TrustLayerBadge ("Preliminary/Draft" enforcement)
- Studio Pro / Percorsi come due lenti su stesso modello
- Galleria template 9 modelli precaricati
- PercorsiBeamWizard end-to-end
- Report PDF builder (modal export multi-pagina)

### v1.7.2-polish-pass2 (2026-05-23, post-v1.8.5)
- T1 `rightRailStore` static-only: rimossi 4 dynamic import (App.tsx x2,
  CommandPalette, MakePanel) → chiamate dirette getState().
- T2 `notificationsStore` dedicato: nuovo store per bell badge persistente
  + 8 test. TopBar `unreadCount` ora deriva da `items.filter(!read)`.
  Click bell = markAllRead. `useAnalysis` wire `notify(success|error)`.
- T3 `toastStore` static-only: rimossi 3 dynamic import (App.tsx x2,
  LibraryPicker). Warning Vite "dynamic+static" risolti tutti.

### v1.7.1-polish-debt (2026-05-23, post-v1.8.5)
- T1 Cleanup legacy: rimossi `ExportMenu.tsx` + `topbar/Breadcrumb.tsx`
  (0 import attivo) + suite test associata.
- T2 Code-splitting: `AICopilotPanel` + `AccountDialog` ora lazy chunk
  separati (17 kB raw scorporati dal main).
- T3 `materials?: Material[]` aggiunto a FEAModel → rimosso cast
  `as unknown` da ViewportHud.

### v1.8.5-mobile (2026-05-23)
- R0 Recupero ROADMAP.md: storia recente da v1.6.1 → v1.8.4.
- T1 safe-area-inset audit: confermato già in place (no fix).
- T2 MobilePanel edge-swipe gesture iOS-style (touchstart entro 40px,
  dx≥80px e tempo<600ms → onBack).
- T3 `body { overscroll-behavior: contain; touch-action: manipulation }`.

### v1.8.4-a11y (2026-05-23)
- T1 Focus-visible rings su CTA hero (`accent` / `percorsi`).
- T2 MobileTabbar: `aria-current="page"` + aria-label dinamico + focus rings.
- T3 JobsSection empty state: CTA `Apri Solve →` quando esiste un modello.
- T4 Skip link a11y `Vai al contenuto` → `#main-content` (WCAG 2.4.1).

### v1.8.3-microaffordance (2026-05-23)
- T1 Hover lift su CTA Studio Pro / Percorsi (`-translate-y-0.5 + shadow-lg`).
- T2 EmptyModelOverlay hint `Ctrl + K` palette (desktop only).
- T3 Save status chip animate-slide-down (no più sbocciare brusco).
- T4 `ResultsOverviewCard` Max σ tonale vs soglia S235 (visivo, non normativo).

### v1.8.2-pass2 (2026-05-23)
- T1 StatusBar arricchita: counts modello `N · E · DoF · 3D · SI`.
- T2 TopBar tier badge tooltip JSX con crediti X/Y + progress bar tonale.
- T3 Skeleton loading sidebar destra durante `isRunning`.

### v1.8.1-polish (2026-05-22)
- P0 Mojibake `ViewportHud` (`Â·` → `·`, `â€"` → `—`).
- P1 Sidebar destra densa: `AnalysisSummaryCard` + `ResultsOverviewCard`.
- P2 Tier badge dinamico via `/api/quotas/:userId` (4 stili tonali).
- P3 `MissionBar` rule engine già coperto da v1.8 T3 (8 test).
- P4 Capture Playwright stato live (mobile + desktop).

### v1.8.0-product-alignment (2026-05-22)
- T0 Token CSS `--c-percorsi` emerald (2° asse semantico Studio Pro / Percorsi).
- T1 CTA doppia Studio Pro (blu) + Percorsi (emerald) su Dashboard.
- T2 `PercorsiPlaceholderDialog` informativo (placeholder fino a v1.9).
- T3 `MissionBar` minima + rule engine deterministico `computeHint`.
- T4 `ModelInfoCard` always-on sidebar destra desktop.
- T5 LeftRail sezioni categoriali con label uppercase.
- T6 Tier badge Pro hardcoded + edit nome modello inline (poi dinamico in v1.8.1).
- Hotfix: mobile panel full-width + rimozione tab bar drill-in Make/Solve/Verify.

### v1.7.0-ui-coerence (2026-05-22)
- T1 Hub-icon palette tokens (info/success/purple/coral/warn/gray).
- T2 Mobile PanelHub coerente Make/Solve/Verify/Inspect (single pattern).
- T3 Drill-in pattern: breadcrumb + cost preview + Esegui verde gradient.
- T4 `ElementDialog` + Section/Material picker no-overflow mobile.
- T5 Dismiss UX: no crocette modal, solo backdrop + ESC + swipe-back.
- T6 TopBar + bottom tabbar coerenti.

### v1.6.1-polish (2026-05-22)
- Toast errore al boot offline coperti da banner + whitelist `/api/auth/me`,
  `/api/jobs`, `/api/billing/quota`. Network error puri non emettono toast (T1).
- "View" button anomalo rimosso dalla Dashboard (T2). Accesso unico via
  RightRail "View" o chip preset HUD viewport.
- Notification bell counter filtra `error|warning`, non piu' tutti i toast (T3).
- Coverage iniziale viewport-engine: 5 moduli, 53 unit test su classification,
  geometry, edge pairs, compressionRatio (T4).
- Audit Legacy vs Engine documentato in `docs/viewport-engine-audit.md`
  con parity guard test (T5).
- Smoke E2E Playwright `e2e/smoke-engineer-workflow.spec.ts`: 4 scenari
  (empty/workflow/palette/errori-italiani) + procedura install in
  `docs/playwright-setup.md` (T6).
- README + ROADMAP allineati al reale (T7).
- Demo Quality Pass walkthrough manuale + report finale (T8).

### v1.6.0-sprint0 (2026-05-22)
- 10 bug P0 bloccanti il test ingegnere chiusi:
  B01 TemplateGallery · B02 palette click-outside · B03 rail disabled senza
  modello · B05 errori 422 in italiano · B07 hub pattern desktop=mobile ·
  B08 mobile back button · B13 library picker completa · B15 viewport refit ·
  B16 deformata disabled senza analisi · B17 jobsStore + chip topbar.
- Viewport Engine GPU sperimentale con InstancedMesh (5 moduli, 0 test → poi
  testato in v1.6.1).
- 376/376 vitest verdi.

### v1.5.2 (2026-05-21)
Cleanup pannelli legacy (Results/IO) + progressive disclosure interna
(PanelHub + PanelBreadcrumb riusabili) + closure tag `v1.5.2`.

---

## Fasi completate (storia estesa)

### v1.0.0 (2026-05-19)
Release ufficiale del solver. Backend 660/660 pytest verde, frontend 58/58 vitest. Coverage 92%. 25 fasi del piano originale.

### v1.3.0 (Sprint 1, 2026-05-19 → -20)
- **Asse A**: cost_estimator + JobMeter middleware + audit JSONL + persistent JobQueue + 4 panel solver migrati a job async
- **Asse F**: services/registry + cache SQLite TTL + rate_limiter token bucket
- **Asse D**: NAFEMS LE1/LE2/LE10 benchmarks + validation report endpoint
- **Asse E**: vitest tests per 5 panel + MSW handlers + useJobRun hook
- **Asse F4-F8**: 4 provider F4 (forecast/geocoding/elevation/seismic) + F6 usage_tracker + F8 orchestrator
- **Asse B**: B1-B4 services facade (geocoding/terrain/loads-meteo/loads-seismic)
- Tag `v1.3.0-alpha.3`

### v1.4.0 alpha.1 → alpha.15 (Sprint 2-3, 2026-05-20 → -21)
- **Deploy Fly.io single-image** (alpha.2): Dockerfile multi-stage Node+Python, fly.toml, region `fra`, free tier, volume per /data
- **Climate / loads applicati** (alpha.3 → .8): useClimateStore persist, ClimateContextBadge, ApplyClimateLoadsDialog, computeTributaryAreas, per-node mode, seismic envelope, location demo presets
- **Onboarding & quality** (alpha.10 → .15): wind 4-direction envelope, OnboardingTour update, cold-start mitigation, backend JWT auth + frontend auth UI, user_id propagation

### v1.4.0 alpha.16 → alpha.28 (Sprint 4-5, mockup v1.3)
- **Foundation CSS** (alpha.16): tokens v1.3 + dual theme dark/light
- **Shell refactor** (alpha.17 → .22): RightRail + slide-in panel, TopBar arricchita, StatusBar con job progress + WS + crediti, migrazione 6 rail Make/Solve/Verify + Inspect/View/Tools, command palette 180+ voci, viewport-first dramatic refactor
- **Brief v1.2.1** (alpha.23 → .28): Tabler+Fuse+workspaceStore nuovo schema, PanelChrome base, MakePanel/SolvePanel/VerifyPanel/InspectPanel/ViewPanel/ToolsPanel, CostPreviewCard gradient inline, empty state Shift+Space, OnboardingTour 9 step

### v1.4.0 alpha.29 → alpha.30 (Mockup alignment, 2026-05-21)
15 task del documento `MOCKUP_ALIGNMENT_TASKS.md`:
- Run button verde gradient, Gizmo top-right, Viewport HUD chips, Scale indicator
- Save status chip, Undo/Redo icons, Bell notifications, Collab avatars stack
- Topbar cleanup → AvatarMenu dropdown
- StatusBar job inline con ETA, Toast mockup style
- VerifyPanel UC badge list, AI Copilot polish, Dashboard pre-modello
- Polish finale + fix test regression

### v1.4.0 alpha.31 (Progressive Disclosure, 2026-05-21)
12 task del documento `PROGRESSIVE_DISCLOSURE_TASKS.md`:
- ModelMenu dropdown (rimuovi 5 elementi topbar)
- Hide undo/redo + bell quando idle
- Focus + Export + Theme + Account in AvatarMenu
- Run condizionale `!isSolveOpen`
- Auto-save HUD chip rimosso
- Close panels in dashboard
- Tools panel snellito 5 voci
- Focus mode shell-wide
- Quota card senza % duplicata
- **Fix X close panels** (bug critico)
- Escape closes all panels
- StatusBar 4 voci essenziali

---

## Roadmap futura

> **Versioning convention (2026-05-23, post v2.3.3-docs-sync)**: la
> "Roadmap futura" parte da **v2.4.x** in avanti. Piani v1.9 → v2.3 sono
> tutti chiusi e spostati in "Storia recente" sopra.

### v2.4.x — Tech debt closure
**Obiettivo**: chiudere i debiti tecnici puntuali emersi durante v2.3.x.

- **BL-9**: jsPDF CVE bump (~10 min) — vedi `BACKLOG.md`
- `jobsStore` unificato (alpha.30 follow-up) — `Map<JobId, JobState>` come
  unica source of truth, sostituisce `analysisStore.isRunning`
- History push wiring (alpha.30 Task 6 follow-up) — restanti store da
  collegare a `useModelHistory.push`
- `notificationsStore` dedicato (alpha.30 Task 8 follow-up) — separare da
  toastStore (già parzialmente fatto in v1.7.2)
- `rightRailStore` solo statico (alpha.30 follow-up)
- Cleanup legacy `ExportMenu.tsx`, `Breadcrumb.tsx` (se ancora presenti)
- `materials` field in `FEAModel` (alpha.30 Task 3 follow-up — accesso
  oggi è difensivo in ViewportHud)
- Test Williams toggle frame specifico per arc-length (BL-2 follow-up)

### v2.5.x — Quality checkpoint
**Obiettivo**: test funzionali completi sull'app v2.3.2.

- L1 audit dead clicks (Playwright crawler su tutta la SPA)
- L2 audit funzionale per area (~10 happy path + 5 edge case)
- Report bug consolidato + fix sprint dedicato
- Lighthouse Performance baseline desktop + mobile
- Audit security headers (HSTS / CSP / X-Frame-Options / X-Content-Type-Options)
- Audit rate-limit auth endpoint (oggi 0 — vedi audit interno)

### v2.6.x — Decisione di prodotto
**Obiettivo**: a valle del checkpoint qualità, scelta esplicita tra:

- **Strada A · Redesign UI/UX con Claude Design** (pacchetto già pronto in
  `.codex-temp/claude-design-pack/`, ora rimosso ma referenziato in
  `docs/redesign-architetti/`)
- **Strada B · Cloud-native + monetization v2.0** (Stripe, Postgres
  managed, multi-tenant, OpenTelemetry, API pubblica)
- **Strada C · Feature normative italiane** (connection EC3-1-8, NTC18
  cap.8 dettaglio, armature DWG, EC4/EC6/EC7/EC9 oggi mancanti)

La scelta dipende da feedback utenti reali post v2.3.2 e dai risultati
del quality checkpoint v2.5.x.

### v3.0 → futuro
**Obiettivo**: posizionamento competitivo "cloud + pay-per-use + made-for-Italy".

Vedi `docs/STRATEGIC_CONTEXT.md` (se presente) per:
- Analisi competitor (ProSap, SAP2000, IDEA StatiCa, AEC Collection)
- Posizionamento mercato (quadrante vuoto: "cloud + pay-per-use + made-for-Italy")
- Gap normativi prioritari per il mercato italiano
- BIM viewer (IFC4 import + overlay), topology optimization, multi-region Fly,
  Postgres managed + S3-compatible storage, mobile companion read-only.

---

## Decisioni architetturali aperte

### A1 · jobsStore unificato vs analysisStore.isRunning
Attualmente `analysisStore` traccia un solo job alla volta (l'analisi corrente). Quando arriverà la JobQueue persistente con job concorrenti (es. validazione NAFEMS + statica + modale in parallelo), serve uno `jobsStore` con `Map<JobId, JobState>`. **Decisione**: introduciamo lo store in **v1.10.0 "Tech debt closure"** quando avremo > 1 job concorrente reale.

### A2 · CRDT vs OT per collab
Lo schema `FEAModel` è strutturato (nodi/elementi/loads/constraints come liste indicizzate by id). Adatto a CRDT type-aware. **Candidati**: Yjs (Y.Map/Y.Array) o Automerge 2.0. **Decisione**: pre-feasibility study in **v1.11.0 "Connect"** prima dell'implementazione.

### A3 · History push: debounce vs explicit checkpoints
Due opzioni per popolare `useModelHistory`:
- A) Subscribe a `modelStore` con debounce 500ms — automatico, ogni edit crea snapshot
- B) Push esplicito ai punti chiave (post-mutation, post-import, post-undo)

**Decisione preferita**: B + un fallback A su `addNode/removeNode` aggregati. La granularità "ogni keystroke" è troppo fine.

### A4 · Bundle splitting strategy
La chunk principale a 1.1 MB è dominata da `index-*.js` (logic + componenti) + `three-*.js` (860 kB). Three.js è già splittato. Per ridurre il main bundle: lazy-load delle pagine pesanti (Validation report, Settings, AI Copilot panel).

**Trade-off**: meno bundle ma più network requests inizialmente. **Decisione**: implementare in v1.7, monitorare con Lighthouse.

### A5 · Mobile responsive: nativo o adattivo?
Lo shell desktop-first attuale ha breakpoints `sm 768 / md 1024 / lg 1280 / xl 1440`. Il mobile (< 768) ha le rail nascoste e topbar collassata. **Domanda aperta**: serve davvero la modalità mobile? Per chi modella struttura grande su smartphone? Probabilmente la mobile view è solo "viewer" (read-only).

**Decisione**: in v2.0 introduciamo react-native con scope "viewer + jobs status + dashboard". Niente editing mobile.

---

## KPI tracking

| Metrica | Valore reale v2.3.2 | Target |
|---|---|---|
| Backend pytest | 660+ verdi | ≥ 700 entro v2.5 |
| Frontend vitest | 584 verdi | ≥ 650 entro v2.5 |
| E2E Playwright | 10/10 step PASS in 7.2s | mantieni 100% |
| Errore numerico statica | δ < 6% | ≤ 5% |
| Errore numerico modale | f₁ < 0.04% | mantieni |
| Bundle main gzip | ~380 kB | ≤ 350 kB entro v2.5 |
| Lighthouse Performance | (da misurare) | ≥ 80 |
| Backend coverage | 92% | ≥ 92% mantieni |
| Frontend coverage | (da misurare) | ≥ 80% |
| Backend P95 solver static | (da misurare) | ≤ 2 s per 1k DoF |
| Test coverage frontend | (da misurare) | ≥ 80% |
| Onboarding completion rate | (analytics non ancora wired) | ≥ 60% nuovi utenti |

---

## Note sulla cadenza

- **Sprint** = 1-2 settimane focalizzate su un asse
- **alpha** = pre-release versionata (es. `v1.4.0-alpha.31`) — incrementale dentro la stessa minor
- **beta** = feature-complete pre-rilascio pubblico, freeze API
- **release** = `v1.X.0` tag su `main`, deploy stabile, annunci

Il branch `test` è il ramo di integrazione attivo: ogni alpha è un tag su `test` deployato su Fly. Quando una versione è stabile, il trigger "sincronizza test con tutto" promuove `test` → `main` su tutti i remote configurati.
