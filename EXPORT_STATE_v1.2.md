# FEA Pro — Stato Sviluppo Completo (Export per Chat Esterna)

> Data: 2026-05-20 · Versione corrente: **v1.2.0** · Tutti i gate verdi

---

## 1. Cos'è FEA Pro

Webapp di analisi strutturale agli elementi finiti (FEM) full-stack, sviluppata in 25 fasi + 9 BL (carry-over) + 3 micro-release (v1.1, v1.2). Pensata per ingegneri strutturisti italiani (normative NTC 2018, Eurocodici 2/3/5/8).

**Caratteristiche distintive:**
- Solver FEM proprio in NumPy/SciPy (no dipendenze a Calculix/OpenSees)
- Frontend 3D real-time con react-three-fiber
- Verifiche normative integrate (EC2/EC3/EC5/EC8/NTC18)
- Streaming progress via WebSocket
- AI Copilot integrato (Gemini/Mock)
- Collab real-time multi-utente (CRDT con Lamport clock)

---

## 2. Stack Tecnologico

### Backend (Python 3.14)
| Componente | Libreria |
|---|---|
| Web framework | FastAPI |
| Numerica | NumPy, SciPy |
| Validation | Pydantic v2 |
| CAD/BIM | ezdxf, ifcopenshell |
| Mesh | gmsh (wrapper thread-safe), Delaunay 2D |
| Report | reportlab (PDF), openpyxl (XLSX) |
| HTTP client | httpx |
| Test | pytest + cov + benchmark + hypothesis |

### Frontend
| Componente | Libreria |
|---|---|
| UI | React 18 + TypeScript |
| Build | Vite |
| 3D | Three.js + @react-three/fiber + @react-three/drei |
| State | Zustand (multi-store) |
| Data fetching | TanStack Query |
| Styling | Tailwind (con breakpoint sm/md/lg/xl) |
| Test | Vitest + @testing-library + MSW |
| Routing | Niente (SPA single-page con tab workspace) |

### Porte locali
- Backend: **:8765** (originale :8000 cambiato per conflitto porta utente)
- Frontend dev: **:5273** (Vite fallback automatico a 5274 se occupata)
- WebSocket: `/ws/analysis/{model_id}` e `/ws/collab/{model_id}`

---

## 3. Architettura

```
fea-pro/
├── backend/
│   ├── api/
│   │   ├── routes/         # analysis, models, io, verify, ai, postprocess, collab
│   │   └── ws/             # broadcast_progress (analysis), CollabSession
│   ├── solvers/            # linear, modal, buckling, pushover, dynamic, seismic_th,
│   │                       # nonlinear (Newton-Raphson), arclength (Crisfield),
│   │                       # unilateral (active-set), winkler
│   ├── elements/           # beam2d, beam3d, tri3, q4, q4_mitc, shell_q4, shell_dkt,
│   │                       # cable2d, cable3d, solid_h8, solid_t4, solid_t10, spring
│   ├── materials/          # MATERIALS_DB, SECTIONS_DB, CompositeLayerSpec
│   ├── verify/             # ec2, ec3, ec5, ec8, ntc18_combinations
│   ├── postprocess/        # isolines (TRI3), slicing (H8/T4), iso 3D (marching tet/cubes),
│   │                       # zz_error, convergence (Richardson + GCI)
│   ├── io/                 # dxf, ifc, accelerograms (PEER, ESM, Kanai-Tajimi)
│   ├── ai/                 # GeminiProvider, MockProvider, copilot serializer
│   ├── schemas/            # Pydantic models
│   ├── storage/            # JSON file-based persistenza modelli/risultati
│   ├── examples.py         # 11 modelli demo pre-caricati
│   └── tests/              # 730 test
│
├── frontend/src/
│   ├── components/
│   │   ├── viewport/       # Viewport3D, ElementRenderer, DeformedShape,
│   │   │                   # InternalForceDiagram, ModeShapeViewer,
│   │   │                   # IsosurfaceLayer, IsosurfaceLegend, ColorLegend,
│   │   │                   # CableLine, TetMesh, PrincipalStressOverlay,
│   │   │                   # ClickPlane, ToolHUD, HoverTooltip
│   │   ├── panels/         # Static, Modal, Buckling, Dynamic, Pushover, ResponseSpectrum,
│   │   │                   # SeismicTH, Nonlinear, ArcLength, Isosurface, LiveMonitor,
│   │   │                   # Slicing, Fatigue, AICopilot, ConvergencePanel,
│   │   │                   # AutoDetectPanel, VerificationPanel (EC2/3/5/8)
│   │   ├── workspaces/     # ModelWorkspace, AnalysisWorkspace (7 tab),
│   │   │                   # ResultsWorkspace (7 tab), VerifyWorkspace, IOWorkspace
│   │   ├── dialogs/        # Element, Node, Load, BC, Material, Section, Mesh, Import
│   │   └── ui/             # Dialog, Tabs, Toast, OnboardingTour, StatusBar, TopBar
│   ├── store/              # modelStore, analysisStore, resultsStore, workspaceStore,
│   │                       # historyStore, commentsStore, measurementsStore
│   ├── api/                # client TS verso FastAPI (httpx-style)
│   └── utils/              # geometry, colormap (jet), units (fmtStress)
│
├── CHANGELOG.md            # v1.0.0 → v1.1.0 → v1.2.0
├── BACKLOG.md              # BL-1..BL-9 (tutti chiusi tranne BL-9 esterno jsPDF CVE)
└── ARCHITECTURE.md
```

### Store Zustand chiave
- **modelStore**: modello FEM corrente (nodes, elements, loads, BC, sections, materials)
- **resultsStore**: `staticResults`, `modalResults`, `dynamicResults`, `isosurfaceData`, flags `showDeformed`/`showStressColormap`/`showIsosurfaces`
- **analysisStore**: `viewportMode`, `projection`, `showGrid`, eventi live (per LiveMonitor)
- **workspaceStore**: tab attivo corrente

---

## 4. Feature complete (v1.0.0 — 25 FASE)

### Solver FEM (FASE 0-9, 12)
- **Statica lineare** (BEAM2D/3D, TRI3, Q4, SHELL_Q4/DKT, SOLID_H8)
- **Modale** (Lanczos via SciPy `eigsh`)
- **Buckling Eulero-Bernoulli** (K_G con interpolazione cubica Bathe §6.6.3, errore 0.00%)
- **Pushover** (λ-incrementale, plastic hinges |M|>M_pl, curva λ-δ)
- **Response spectrum** (SRSS + CQC Der Kiureghian 1981, mass participation)
- **Time-history dinamica** (Newmark-β, Rayleigh damping da ξ + ω_lo/ω_hi)
- **Sismica multi-componente** (wrapper TH con drift e drift ratio)
- **Beam su suolo Winkler** (K_winkler consistent mass, test Hetényi errore 0.02%)
- **Molle unilaterali** (active-set, ≤5 iter)

### Verifiche normative (FASE 2-4)
- **EC3**: classificazione §5.5, resistenze §6.2, instabilità flessionale §6.3.1, LTB §6.3.2 — 16 profili IPE/HEA/HEB
- **EC2**: flessione e taglio CA (B450C + C20-C45)
- **EC5**: legno con k_mod (C24/GL24h)
- **EC8**: spettri elastici 4-rami, fattore q, combinazioni sismiche, zone
- **NTC 2018**: SLU/SLE generator (formule 2.5.1-2.5.6), envelope sollecitazioni, property-based tests

### I/O (FASE 10, 11, 13, 17, 24)
- **DXF** import/export (ezdxf)
- **IFC4** import/export (ifcopenshell)
- **Mesh automatica**: Delaunay 2D con holes, gmsh wrapper, geometrie parametriche (rectangle, L, T, circle, ring)
- **Accelerogrammi**: PEER NGA (.AT2), ESM ASCII, CSV, Kanai-Tajimi + Boore envelope Saragoni-Hart
- **Export Excel** multi-sheet (5-8 sheet stilizzati)
- **Report PDF** parametrico (reportlab, 7 sezioni)

### Postprocess (FASE 16, 19)
- **Marching triangles** per isolinee TRI3
- **Slice planes** per tetraedri ed esaedri
- **Superposizione modale lineare**
- **Convergence**: Richardson extrapolation + GCI (Roache ASME V&V20)
- **Zienkiewicz-Zhu error estimator**

### UI/UX (FASE 15)
- **3 store dedicati**: historyStore (undo/redo), commentsStore, measurementsStore
- Utility geometriche (distance3D, angleDeg, chainLength)

### Avanzate (FASE 14, 18, 20-25)
- **Fatica**: Rainflow ASTM E1049-85 4-point + S-N 2 pendenze + Miner (14 categorie EC3-1-9)
- **Confronto modelli A vs B**: ModelDiff + StaticResultsDiff
- **Python client + CLI**: FEAProClient sync httpx, CLI argparse 7 subcommand
- **AI Copilot**: AIProvider astratto, GeminiProvider REST, MockProvider offline
- **Collab real-time**: CollabSession con Lamport clock thread-safe + WS `/ws/collab/{model_id}`
- **Auto-detection**: 5 detector (duplicate_elements, coincident_nodes, orphan_loads, missing_section, winkler_jump)

---

## 5. Feature aggiunte v1.1.0 (UX completion BL)

### Nuovi pannelli frontend
- **NonlinearPanel** (`POST /api/analysis/nonlinear/{id}`): Newton-Raphson + cavi tension-only (BL-1), form parametri, curva λ vs max|u|, tabella step con badge convergenza, contatori active/slack cables
- **ArcLengthPanel** (`POST /api/analysis/arclength/{id}`): Crisfield path-following (BL-2), form ricco (Δs auto/prescritto, control DOF, λ_max, δ_max, λ_init), grafico equilibrium path λ-δ, peak λ in ReferenceLine
- **IsosurfacePanel** (`POST /api/postprocess/{id}/isosurfaces`): marching tetra/cubes (BL-7) con smoothing nodale automatico di σ_VM, riepilogo aree per livello
- **LiveMonitorPanel**: log streaming via WS + eventi store locale, auto-scroll pausabile, badge running/idle, max 500 eventi

### Viewport
- **CableLine** (BL-1): cavi come linee sottili, verdi se pretesi, grigie se slack
- **TetMesh** (BL-3): render tetraedri T4/T10 (T10 usa solo 4 vertici)
- **IsosurfaceLayer** (BL-7): mesh triangoli iso 3D, colormap jet, opacity 0.55, depthWrite=false
- `shell_q4_mitc` condivide rendering di `shell_q4`

### Modelli demo seed (in `backend/examples.py`)
- `ex_cube_solid_h8`: cubo H8 in trazione (BL-3/BL-7)
- `ex_cable_bridge_2d`: ponte strallato 2D con 4 cavi pretesi 50 kN (BL-1)
- `ex_laminate_plate`: piastra 4×4 SHELL_Q4 con laminato cross-ply 0/90/0 (BL-4)

### Database materiali/sezioni
- Materiali: `cable_steel_y1860` (Y1860, E=195 GPa), `carbon_uni` (T300, E=135 GPa)
- Sezioni: `cable_d20` (A=3.14e-4), `cable_d50` (A=1.96e-3), `laminate_cross_ply` (3 strati 1mm carbon simmetrico)

### Fix responsive
- **TopBar**: pulsanti CRUD solo icona sotto md, select modello fluido su mobile
- **StatusBar**: gerarchia visiva graduale sm/md/lg, progress bar adattiva
- **Dialog custom**: `w-[calc(100vw-24px)]` con maxWidth cap → mobile-safe
- **TabsList** workspace ora scrollabili orizzontalmente

### Workspace estesi
- **AnalysisWorkspace**: 7 tab (era 5) — aggiunti Non-lin., Arc-len.
- **ResultsWorkspace**: 7 tab (era 6) — aggiunto Iso 3D

---

## 6. Feature aggiunte v1.2.0 (UX polish + progress live)

### Backend
- Tutti i solver lunghi (pushover, seismic_th, **nonlinear**, **arclength**) ora iniettano `progress_cb` -> broadcast su `/ws/analysis/{model_id}`
- Endpoint REST `async` con `_make_progress_cb()` helper thread-safe (cattura running loop)
- Tutti i 4 endpoint convertono errori in `broadcast_progress(1.0, "Errore: ...")` -> notifica client anche su exception

**Pattern critico (asyncio threadsafe)**:
```python
def _make_progress_cb(model_id: str):
    loop = asyncio.get_running_loop()
    def cb(p: float, msg: str = ""):
        asyncio.run_coroutine_threadsafe(
            broadcast_progress(model_id, p, msg), loop
        )
    return cb

async def _run_solver(solver, progress_cb):
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(
        None, lambda: solver.solve(progress_cb=progress_cb)
    )
```
**Perché**: `loop.create_task()` accumulava task ma non li eseguiva finché solve() non ritornava (loop bloccato dal sync solver). Soluzione: executor sblocca il loop, threadsafe coroutine scheduling fa arrivare i WS in real-time.

### Frontend
- **NonlinearPanel** e **ArcLengthPanel** persistono il risultato come `staticResults` in `useResultsStore` -> deformata appare **automaticamente** nel viewport (riusa `DeformedShape`, `InternalForceDiagram`)
- **ElementDialog** esteso con 5 nuovi tipi (`cable2d/3d`, `shell_q4_mitc`, `solid_t4/t10`) + campo `pretension` (N0 in N) visibile solo per cavi
- **ColorLegend** generalizzato con `format` callback custom + parametro `position` (top-right, top-right-2, bottom-right) -> permette legende multiple
- **IsosurfaceLegend** nuovo overlay nel viewport: min/max dei livelli iso correnti in notazione scientifica neutra

---

## 7. Gate qualità (sempre verdi)

| Gate | v1.0 | v1.1 | v1.2 |
|---|---|---|---|
| pytest | 655/655 | 730/730 (cov 90%) | **730/730** OK |
| vitest | 58/58 | 58/58 | **58/58** OK |
| tsc | 0 errori | 0 errori | **0 errori** OK |
| vite build | OK | 9.7s | **OK** OK |
| Backend coverage | 92% | 90% | **90%** OK |

---

## 8. Carry-over (BACKLOG.md)

| ID | Voce | Stato |
|---|---|---|
| BL-1 | Newton-Raphson + Cable 2D/3D | chiuso v1.1 |
| BL-2 | Arc-length post-buckling (Crisfield) | chiuso v1.1 |
| BL-3 | Elementi Tet4 / T10 solidi | chiuso v1.1 |
| BL-4 | Shell layered (composite) | chiuso v1.1 |
| BL-5 | Q4 MITC4 anti shear-locking | chiuso v1.1 |
| BL-6 | NAFEMS LE1/LE2/LE10 ellittico | aperto |
| BL-7 | 3D iso-surfaces (marching tetra/cubes) | chiuso v1.1 |
| BL-8 | DXF layer -> material/section mapping | aperto |
| BL-9 | Bump jsPDF per CVE noto | esterno |

---

## 9. Convenzioni progetto

### Pattern API
- REST: `/api/<resource>/<id>` (no trailing slash sui singoli, `/api/models/` lista vuole slash)
- Import full payload: `POST /api/models/import` (NON `POST /api/models/`, che crea modello vuoto)
- WS progress: `/ws/analysis/{model_id}` invia `{progress: 0..1, message: string}`
- WS collab: `/ws/collab/{model_id}` con messaggi `join`/`op`/`cursor`

### Pattern frontend
- Tutti i pannelli usano `useMutation` di TanStack Query
- Risultati lunghi: persisti in `resultsStore` per visualizzazione nel viewport
- Componenti viewport leggono direttamente dagli store (no prop drilling)
- Tailwind breakpoint: sm:768, md:1024, lg:1280, xl:1440

### Trigger custom utente (CLAUDE.md)
- **"sincronizza test con tutto"**: pull --ff-only su `test`, poi per ogni remote push `test:test` + `test:main`. MAI force-push senza chiedere. MAI `--no-verify`.

---

## 10. Modelli demo precaricati (`backend/examples.py`)

| ID | Descrizione | Tipo |
|---|---|---|
| `ex_cantilever` | Mensola 2D BEAM | linear/modal |
| `ex_simply_supported` | Trave appoggiata UDL | linear |
| `ex_portal_frame` | Telaio 2D | linear/buckling |
| `ex_truss_2d` | Capriata reticolare | linear |
| `ex_plate_q4` | Piastra Q4 | linear/modal |
| `ex_winkler_beam` | Trave su suolo elastico | linear |
| `ex_tri3_membrane` | Membrana TRI3 | linear |
| `ex_dynamic_frame` | Telaio dinamico Newmark | time-history |
| `ex_cube_solid_h8` | Cubo solid 8-nodi trazione | static + iso 3D |
| `ex_cable_bridge_2d` | Ponte strallato 2D, 4 cavi pretesi 50 kN | nonlinear |
| `ex_laminate_plate` | Piastra 4x4 SHELL_Q4 cross-ply 0/90/0 | static |

---

## 11. Stato attuale operativo

- Branch: `test` (allineato con `main` dopo ultima "sincronizza test con tutto")
- Backend: in esecuzione locale su `:8765`
- Frontend dev: in esecuzione locale su `:5273` (o fallback `:5274`)
- Tutte le E2E verificate: pushover (21 eventi WS), nonlinear (6 eventi), arclength (6 eventi)
- Verifica matematica modelli demo: cubo H8 sigma_VM ~ 340 kPa (analitico OK), iso area al piano x=0.5 = 1.0 esatto, cable bridge transizione active->slack 4->2 corretta

---

## 12. Possibili direzioni v1.3

Candidati discussi/identificati (non ancora avviati):
- **Test vitest** per NonlinearPanel, ArcLengthPanel, IsosurfacePanel, LiveMonitorPanel (gap coverage)
- **Auto-detect warning** per cavi CABLE2D/3D senza pretension > 0
- **OnboardingTour update** con i nuovi tab (Non-lin., Arc-len., Iso 3D, Monitor)
- **CLI Python** estesa con subcommand `nonlinear`/`arclength`/`isosurface`
- **MeshWizardDialog** preset "box solid t4"
- **Snapshot** dei risultati nonlinear/arclength
- **BL-6 / BL-8** aperti
