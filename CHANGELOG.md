# Changelog FEA Pro

## v1.3.0 — Sprint 1 (in development)

### Added (in progress)
- A1: cost_estimator backend per tutti i solver
- A2: JobMeter middleware con audit JSONL
- F1-F3: external services layer (Provider abstraction, SQLite cache, token bucket rate limiter)
- A3: Quota system mock con cap mensile
- A5: Persistent JobQueue con priorità e retry
- A4: CostPreviewDialog frontend pre-solve
- D1: NAFEMS LE1/LE2/LE10 benchmarks
- D2: Validation page HTML pubblica /api/validation/report
- E1: Test vitest per NonlinearPanel, ArcLengthPanel, IsosurfacePanel, LiveMonitorPanel, JobsPanel, CostPreviewDialog

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
