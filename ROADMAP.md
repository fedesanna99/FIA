# ROADMAP — FEA Pro

> Visione evolutiva. Per il backlog tecnico granulare e i carry-over di v1.0.0 vedi `BACKLOG.md`.
> Per la specifica del redesign UI vedi `UI_REDESIGN_SPEC.md`.

**Stato corrente**: `v1.6.1-polish` — Sprint 0 (10 bug P0) chiuso + viewport-engine GPU
con InstancedMesh testato (53 test) + audit visivo Legacy↔Engine + smoke E2E Playwright
(4 scenari). Live su https://fea-pro.fly.dev/.

---

## Storia recente

### v1.6.1-polish (2026-05-22, in chiusura)
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

### v1.5.0 — "Connect" (collab real-time)
**Obiettivo**: collaborazione live multi-utente con presence + cursors.

| Asse | Item |
|---|---|
| F (backend collab) | WebSocket session manager · room broadcast · CRDT per modello condiviso (yjs server) |
| U (frontend collab) | `useCollabStore` zustand con `activeUsers` reale · CollabAvatars stack popolato real-time · cursors 3D nel viewport · presence indicators sui modelli |
| Auth | Org/workspace · invite via email · role-based permissions (viewer/editor/admin) |
| Verifica | Test E2E 2 client su stesso modello, sync entità node-by-node |

### v1.5.x — Solver completeness (carry-over BACKLOG)
Vedi `BACKLOG.md` per dettagli:
- **BL-1**: Newton-Raphson + Cable 2D/3D (ponti sospesi, tiranti)
- **BL-2**: Arc-length Crisfield/Riks (post-snap-through, Williams toggle frame)
- **BL-3**: Elementi Tet4 / T10 (solidi tetraedrici)
- **BL-4**: Shell layered (composite plies)
- **BL-5**: Contact unilateral (terreno, gap)
- **BL-6**: NAFEMS battery completa (LE1-LE11)
- **BL-7**: Time-history modal superposition
- **BL-8**: Adaptive mesh refinement
- **BL-9**: Iso-surface 3D per stress/strain

### v1.6.0 — "Pro tools" (workflow avanzato)
**Obiettivo**: features Pro nella tier paid.

| Asse | Item |
|---|---|
| BIM viewer | IFC4 import + overlay sul modello FEA · estrazione automatica geometria + materiali da IFC · sync bi-direzionale |
| Topology optimization | SIMP method · constraint stress/displacement · post-processing iso-density con threshold |
| Compare A/B | side-by-side viewer per 2 modelli o 2 run · diff strutturato su entità e risultati |
| Export Pro | PDF reportlab server-side (multi-pagina con TOC) · XLSX multi-sheet con grafici embedded · DXF strutturato (CAD-compatible) |

### v1.7.0 — "Polish & perf"
**Obiettivo**: pulire i debiti tecnici accumulati negli sprint UI.

| Item | Provenienza |
|---|---|
| History push wiring (`useModelHistory.push` auto su modelStore subscribe + debounce) | follow-up alpha.30 Task 6 |
| `notificationsStore` dedicato (read/unread + sheet/drawer) | follow-up alpha.30 Task 8 / alpha.31 Task 17 |
| `jobsStore` reale (lista job attivi multi-tipo, non solo analysisStore.isRunning) | follow-up alpha.30 Task 10 / alpha.31 |
| `rightRailStore` solo statico (eliminare il dynamic import in App.tsx, ottimizza chunk) | follow-up alpha.30 |
| Code-splitting: Validation page · Settings dialog · AICopilot lazy-loaded | bundle warning corrente (1.1 MB) |
| Cleanup legacy: `ExportMenu.tsx`, `Breadcrumb.tsx` non più referenziati | follow-up alpha.31 |
| `materials` campo in `FEAModel` (oggi accesso difensivo con cast unsafe) | follow-up alpha.30 Task 3 |

### v2.0.0 — "Cloud-native"
**Obiettivo**: scalabilità multi-tenant + observability completa.

| Asse | Item |
|---|---|
| Infra | Multi-region Fly · Postgres managed · object storage S3-compatible per modelli grandi · CDN per assets |
| Observability | OpenTelemetry tracing · Sentry frontend + backend · Grafana dashboards solver latency / quota usage / WS connessioni |
| Billing | Stripe integration · tier free/pro/enterprise · usage-based per crediti · invoice automatici |
| API pubblica | REST + GraphQL · OpenAPI 3.1 spec · API key management · rate-limit dichiarativo per tier |
| Mobile-first | React Native app companion (read-only: dashboard, jobs status, model viewer) |

---

## Decisioni architetturali aperte

### A1 · jobsStore unificato vs analysisStore.isRunning
Attualmente `analysisStore` traccia un solo job alla volta (l'analisi corrente). Quando arriverà la JobQueue persistente con job concorrenti (es. validazione NAFEMS + statica + modale in parallelo), serve uno `jobsStore` con `Map<JobId, JobState>`. **Decisione**: introduciamo lo store con Sprint v1.7 polish quando avremo > 1 job concorrente reale.

### A2 · CRDT vs OT per collab
Lo schema `FEAModel` è strutturato (nodi/elementi/loads/constraints come liste indicizzate by id). Adatto a CRDT type-aware. **Candidati**: Yjs (Y.Map/Y.Array) o Automerge 2.0. **Decisione**: pre-feasibility study in v1.5 prima dell'implementazione.

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

## KPI tracking (suggeriti)

| Metrica | Target v1.5 | Strumento |
|---|---|---|
| Lighthouse Performance | ≥ 80 | CI weekly |
| Bundle main gzip | ≤ 250 kB | Vite build report |
| Backend P95 solver static | ≤ 2 s per 1k DoF | OTel histograms |
| WebSocket presence latency | ≤ 100 ms in-region | Custom probe |
| Test coverage backend | ≥ 92% (mantenuto) | pytest-cov |
| Test coverage frontend | ≥ 80% | vitest --coverage |
| Onboarding completion rate | ≥ 60% nuovi utenti | Analytics |

---

## Note sulla cadenza

- **Sprint** = 1-2 settimane focalizzate su un asse
- **alpha** = pre-release versionata (es. `v1.4.0-alpha.31`) — incrementale dentro la stessa minor
- **beta** = feature-complete pre-rilascio pubblico, freeze API
- **release** = `v1.X.0` tag su `main`, deploy stabile, annunci

Il branch `test` è il ramo di integrazione attivo: ogni alpha è un tag su `test` deployato su Fly. Quando una versione è stabile, il trigger "sincronizza test con tutto" promuove `test` → `main` su tutti i remote configurati.
