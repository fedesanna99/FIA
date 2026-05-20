# FEA Pro — Onboarding per Claude

Briefing operativo per Claude (o nuovi sviluppatori) che mettono mano al progetto.
Questo documento descrive cosa è stato costruito, come è organizzato e come estenderlo
senza sorprese.

---

## 1. Cosa è FEA Pro

Applicazione web di **analisi strutturale agli elementi finiti** ispirata a LUSAS/SAP2000.
Stato attuale (vedi tabella in fondo): copertura **100% del prompt originale**
([LUSAS_clone_claudecode_prompt.md](../LUSAS_clone_claudecode_prompt.md)) + estensioni
non richieste (buckling lineare, FFT, response spectrum sismico, snapshot risultati,
persistenza, drag&drop, validation interattivo, principal stress vectors, ecc.).

### Capacità sintetiche
- **4 solver**: statica · modale · dinamica Newmark-β · buckling lineare
- **7 elementi finiti**: Beam2D · Beam3D · Truss2D · Truss3D · Tri3 plane-stress · Shell Q4 Mindlin-Reissner · Solid H8
- **8 tipi di carico**: nodal · distributed · pressure · self-weight · nodal_mass · dynamic F(t) · ground_accel (sismica) · temperature ΔT
- **6+1 tipi di vincolo**: fixed · pinned · roller X/Y/Z · custom 6-GdL · spring · **release interno** (cerniera momento)
- **Viewport 3D Three.js** con click-to-create+snap, hover tooltip, deformata, modi animati, time-history animato, diagrammi N/V/M, stress colormap, principal stress vectors σ₁/σ₂, prospettica/ortografica
- **6 esempi precaricati**, persistenza su disco, export JSON/CSV/DXF/PDF
- **Test**: 75 pytest (backend) + 19 Vitest (frontend), CI GitHub Actions pronto

---

## 2. Architettura

```
fea-pro/
├── backend/      # FastAPI · Python 3.11 · NumPy · SciPy · Pydantic
├── frontend/     # React 18 · TypeScript · Three.js · Zustand · Tailwind · Vite
├── docker-compose.yml
└── .github/workflows/ci.yml
```

### Backend (`backend/`)
```
main.py                          # FastAPI app entry point
storage.py                       # Persistenza modelli su disco (JSON)
examples.py                      # 6 modelli precaricati
schemas/
  ├── model.py                   # FEAModel, Node, Element, Load, Constraint, ElementType, LoadType, ConstraintType
  ├── material.py                # Material, Section + DB predefinito
  └── results.py                 # StaticResults, ModalResults, DynamicResults, ElementStress, ecc.
core/
  ├── elements/                  # 7 elementi finiti
  │   ├── beam2d.py              # + helper _condensate_releases per cerniere interne
  │   ├── beam3d.py
  │   ├── truss2d.py, truss3d.py
  │   ├── tri3.py                # CST plane-stress
  │   ├── shell_quad4.py         # Membrana + DKQ flessione, Gauss 2×2
  │   └── solid_hex8.py          # Gauss 2×2×2
  ├── solver/
  │   ├── assembler.py           # GlobalAssembler con _dead_dofs auto-detect
  │   ├── static_solver.py       # spsolve sparse
  │   ├── modal_solver.py        # ARPACK eigsh con fallback eigh densa
  │   ├── dynamic_solver.py      # Newmark-β implicito + ground_accel
  │   └── buckling_solver.py     # K φ = λ K_G φ
  ├── postprocess/
  │   └── spectrum.py            # FFT + response spectrum (Sd, Sv, Sa)
  └── mesh/
      ├── generator.py           # mesh_line, mesh_rectangle_shell/tri3, mesh_box_solid
      └── validator.py           # validate_model con livelli INFO/WARNING/ERROR
api/
  ├── routes/
  │   ├── models.py              # CRUD modello/nodi/elementi/carichi/vincoli + validate + mesh + import/duplicate
  │   ├── analysis.py            # /static/modal/dynamic/buckling + /fft + /response_spectrum + /rayleigh
  │   └── materials.py           # /materials, /sections + CRUD custom
  └── websocket.py               # /ws/analysis/{model_id} progresso real-time
tests/                           # 75 pytest: elements, solvers, examples, mesh, storage, releases, ecc.
data/models/                     # JSON dei modelli salvati (gitignored)
```

**Note critiche backend:**
- Tutte le matrici K/M sono **sparse CSR**. Per modelli grandi (>1000 GdL) è obbligatorio.
- L'assembler usa sempre **6 GdL per nodo** per uniformità. Elementi con meno GdL (beam2D, truss, T3) lasciano alcuni dof a 0 — sono identificati da `_dead_dofs()` e bloccati automaticamente prima della soluzione, altrimenti K sarebbe singolare.
- I dof rotazionali nei nodi 2D/T3 vengono bloccati anche se hanno massa nodale per evitare modi rigidi inerziali spuri nell'analisi modale.
- Le reazioni nei risultati statici sono `R = K·u − F_ext` (non `K·u` da solo), così la somma delle Fy reazioni bilancia esattamente la somma delle Fy applicate.
- `ROLLER_Y` blocca **uy** (non ux+uz). Convenzione: `ROLLER_<axis>` = "blocca quella traslazione".
- `storage.py` legge env vars `FEA_DATA_DIR` (path persistenza) e `FEA_NO_PERSIST` (disabilita per test/CI).

### Frontend (`frontend/`)
```
src/
├── App.tsx                          # Layout: Toolbar + Sidebar + Viewport + PropertiesPanel + StatusBar + Toaster + HelpDialog
├── main.tsx                         # QueryClient setup
├── store/                           # Zustand stores (no Redux)
│   ├── modelStore.ts                # modello corrente, selezione nodi/elementi, hover
│   ├── analysisStore.ts             # tipo analisi, parametri, viewport tool/projection/snap
│   ├── resultsStore.ts              # static/modal/dynamic results + animation state + snapshot hash
│   ├── snapshotStore.ts             # snapshot manuali per confronto
│   ├── toastStore.ts                # sistema toast (success/error/warning/info)
│   └── uiStore.ts                   # dialog corrente + editEntityId (node/element/load/constraint)
├── api/client.ts                    # axios + interceptor toast errori HTTP
├── hooks/
│   ├── useModel.ts                  # useModelList, useLoadModel (TanStack Query)
│   ├── useAnalysis.ts               # useRunAnalysis con WebSocket progresso
│   └── useKeyboardShortcuts.ts      # shortcut globali N/E/L/C/M/P/Del/Esc/F5/?
├── components/
│   ├── layout/                      # Toolbar, Sidebar, PropertiesPanel, StatusBar, Toaster
│   ├── viewport/                    # Tutto quel che si renderizza in Three.js
│   │   ├── Viewport3D.tsx           # Canvas R3F + OrbitControls + GizmoHelper
│   │   ├── NodeRenderer.tsx         # sfere ciano cliccabili (doppio click → edit)
│   │   ├── ElementRenderer.tsx      # BeamMesh / TriMesh / ShellMesh / SolidMesh
│   │   ├── LoadRenderer.tsx         # frecce per nodal/distributed/massa
│   │   ├── BCRenderer.tsx           # simboli vincoli (fixed/pinned/roller)
│   │   ├── DeformedShape.tsx        # overlay verde della deformata statica
│   │   ├── ModeShapeViewer.tsx      # animazione modi (useFrame)
│   │   ├── DynamicAnimation.tsx     # animazione time-history (useFrame)
│   │   ├── DynamicTimelineHUD.tsx   # play/pausa/scrubbing in basso al viewport
│   │   ├── PrincipalStressOverlay.tsx  # vettori σ₁ (rosso=traz) / σ₂ (ciano=compr)
│   │   ├── InternalForceDiagram.tsx # diagrammi N/V/M lungo le travi
│   │   ├── ClickPlane.tsx           # plane invisibile per click-to-create con snap
│   │   ├── ToolHUD.tsx              # HUD in alto-sx per modalità create
│   │   ├── HoverTooltip.tsx         # tooltip flottante con coord+stress+forze
│   │   ├── ColorLegend.tsx          # legenda stress colormap
│   │   ├── DropZone.tsx             # drag&drop JSON import
│   │   └── StaleResultsBanner.tsx   # banner ⚠ quando modello cambia post-analisi
│   ├── panels/                      # Pannelli sidebar + properties
│   │   ├── ModelTree.tsx            # albero filterabile con doppio click → edit + × delete
│   │   ├── EditorBar.tsx            # + Nodo/+Elem/+Carico/+Vinc/⊞Mesh/🎯Place/🗑Elimina
│   │   ├── AnalysisSettings.tsx     # parametri statica/modale/dinamica/buckling + Auto Rayleigh
│   │   ├── ViewportControls.tsx     # toggle deformata/colormap/diagrammi/principali/ortografica
│   │   ├── SelectionInspector.tsx   # dettagli nodi/elementi selezionati
│   │   ├── MaterialsLibrary.tsx     # libreria materiali+sezioni + dialog custom
│   │   ├── ValidationPanel.tsx      # validation interattivo (click → seleziona)
│   │   └── SnapshotsPanel.tsx       # snapshot risultati con 3 grafici comparativi
│   ├── dialogs/                     # Tutti i modali CRUD
│   │   ├── Dialog.tsx               # Base modal con backdrop + Esc
│   │   ├── NewModelDialog.tsx
│   │   ├── EditModelDialog.tsx
│   │   ├── NodeDialog.tsx           # add/edit con editNodeId
│   │   ├── ElementDialog.tsx        # add/edit con releases input
│   │   ├── LoadDialog.tsx           # 8 tipi + preview chart time-history
│   │   ├── ConstraintDialog.tsx
│   │   ├── MeshWizardDialog.tsx     # 1D/2D shell/2D tri/3D solid
│   │   ├── MaterialDialog.tsx       # materiale custom con preview G,K
│   │   ├── SectionDialog.tsx        # sezione custom con preview A,I,J
│   │   └── HelpDialog.tsx           # cheat sheet shortcut + features
│   └── results/                     # Pannelli risultati
│       ├── ResultsPanel.tsx         # summary/table/chart switcher
│       ├── DisplacementTable.tsx
│       ├── FrequencyChart.tsx
│       ├── TimeHistoryPlot.tsx
│       ├── StressDiagram.tsx
│       ├── FFTChart.tsx
│       ├── BucklingPanel.tsx
│       └── ResponseSpectrumPanel.tsx
├── utils/
│   ├── colormap.ts                  # Jet colormap (con test)
│   ├── geometry.ts                  # nodeById, modelBounds, modelHash (con test)
│   ├── units.ts                     # fmtForce/Stress/Length/Mass (con test)
│   ├── export.ts                    # JSON/CSV/DXF download
│   └── reportPdf.ts                 # PDF con jsPDF + autoTable
├── types/                           # Mirror TypeScript dei Pydantic schemas
│   ├── model.ts
│   ├── material.ts
│   └── results.ts
└── vite-env.d.ts                    # tipi per import.meta.env
```

**Note critiche frontend:**
- Tutti gli stati condivisi sono in **Zustand stores**, mai prop-drilling profondo.
- I dialog vivono nello `uiStore.openDialog`. Per aprire un dialog edit usa `openEditNode(id)` / `openEditElement(id)` / `openEditLoad(id)` / `openEditConstraint(id)` (resettano gli altri editId).
- I componenti `viewport/*` sono **R3F** (`@react-three/fiber`): non usano DOM, usano `useFrame`, `useThree`. I tooltip HTML stanno **fuori** dal `<Canvas>`.
- Tutte le `BufferGeometry` create via `useMemo` per evitare ricreazioni a ogni render.
- Pattern usato per geometrie dinamiche (DeformedShape, ModeShapeViewer, DynamicAnimation, PrincipalStressOverlay, InternalForceDiagram): `const geom = useMemo(() => new THREE.BufferGeometry()..., [deps])` + `<lineSegments geometry={geom}>`.
- Le mutation TanStack Query invalidano `["model", modelId]` per riallineare lo store dopo modifiche backend.
- Toast errori arrivano automaticamente dall'interceptor axios. Toast success vanno aggiunti manualmente nelle mutation `onSuccess`.

---

## 3. Come fare cose comuni

### Aggiungere un nuovo elemento finito
1. Crea `backend/core/elements/<name>.py` con classe che espone:
   - `__init__(self, nodes_xyz, E, ..., rho=0.0)`
   - `stiffness_global(self, releases=None) → ndarray (n_dof×n_dof)`
   - `mass_global(self) → ndarray`
   - opzionali: `internal_forces(u)`, `stresses(u)` per il post-processing
2. Esponi in `core/elements/__init__.py`
3. Aggiungi enum in `schemas/model.py::ElementType`
4. Aggiungi mapping in `core/solver/assembler.py::_element_dofs()` e `_build_element()`
5. Se ha stress, aggiungi branch in `static_solver.py::_build_results()`
6. Frontend: aggiungi al type `ElementType` (`frontend/src/types/model.ts`) e ai render `ElementRenderer.tsx`
7. Aggiungi alle option di `ELEMENT_OPTIONS` in `dialogs/ElementDialog.tsx`
8. Aggiungi a `_EXPECTED_NODES` in `core/mesh/validator.py`
9. Scrivi test in `tests/test_<name>.py`

### Aggiungere un nuovo tipo di carico
1. Aggiungi enum in `schemas/model.py::LoadType`
2. Aggiungi eventuali campi nel modello `Load` (es. `delta_t`, `pressure`)
3. Gestisci in `core/solver/assembler.py::build_load_vector()` (per statica) o `dynamic_solver.py::_build_time_force()` (per dinamica)
4. Aggiorna `frontend/src/types/model.ts::LoadType`
5. Aggiungi entry in `LOAD_TYPES` in `dialogs/LoadDialog.tsx` con `targetKind` (`node`/`element`/`global`)
6. Aggiungi UI condizionale (campi specifici) nel dialog
7. Aggiungi al payload della mutation
8. Scrivi test in `tests/test_<load_type>.py`

### Aggiungere un endpoint API
1. Aggiungi route in `backend/api/routes/<modulo>.py`
2. Definisci request model con Pydantic `BaseModel`
3. Aggiungi metodo al client in `frontend/src/api/client.ts`
4. Usalo con `useMutation` o `useQuery` nei componenti
5. Toast success a mano se necessario; errori automatici via interceptor
6. Test in `tests/test_api.py` con `TestClient(app)`

### Aggiungere un dialog frontend
1. Crea `frontend/src/components/dialogs/<Foo>Dialog.tsx`
2. Usa il wrapper `<Dialog open onClose title footer>`
3. Aggiungi alla `DialogKind` di `uiStore.ts`
4. Monta nell'`EditorBar.tsx` (se è un editor di entità) o in `App.tsx` (se globale)
5. Per edit mode: aggiungi prop `editXxxId?: number | null` e `useEffect` per pre-popolare al `open=true`

### Eseguire i test
```bash
# Backend
cd backend && pytest                 # 75 test
cd backend && pytest -v -k "modal"   # filtro
cd backend && pytest tests/test_examples.py::test_simple_beam_reactions_balance_loads

# Frontend
cd frontend && npm test              # Vitest 19 test
cd frontend && npm run test:watch    # watch mode
cd frontend && npx tsc --noEmit      # solo typecheck
cd frontend && npm run build         # bundle produzione
```

### Avviare il sistema
```bash
# Docker
docker-compose up --build

# Locale
cd backend && uvicorn main:app --reload --port 8000
cd frontend && npm run dev    # 5173 con proxy verso 8000
```

---

## 4. Convenzioni

### Backend
- **Unità SI** ovunque: m, N, Pa, kg, s, °C. La UI converte quando mostra.
- Sparse matrices SciPy CSR per K e M; densa solo come fallback.
- Pydantic per validazione input/output (schemi tipizzati).
- Docstring in italiano (il prompt è in italiano).
- Test pytest con `pytest.approx(...)` per confronti con tolleranza analitica.
- `_dead_dofs()` deve essere chiamato prima di ogni risolutore — automatico via `apply_boundary_conditions()`.

### Frontend
- **Italiano** per label UI e commenti utente. Codice/identifier in inglese.
- Tailwind utility-first, niente CSS modules. Classi semantiche in `index.css` (`.btn`, `.input`, `.panel`, `.row`).
- Colori dark theme: bg `#1a1f2e`/`#0f1219`, accent `#00d4ff`/`#00ff88`/`#ffaa00`/`#ff4444`.
- Font: `JetBrains Mono` per numeri (classe `.numeric`), `IBM Plex Sans` per UI.
- Mutation con TanStack Query, mai fetch a mano.
- Toast `success` per mutazioni utente; errori coperti dall'interceptor.

### Numerazione GdL globale
| Nodo i, GdL | Posizione globale |
|---|---|
| ux | `i*6 + 0` |
| uy | `i*6 + 1` |
| uz | `i*6 + 2` |
| θx | `i*6 + 3` |
| θy | `i*6 + 4` |
| θz | `i*6 + 5` |

Indice nodo `i` = ordine nella `model.nodes` (non l'id).

### Numerazione GdL locale Beam2D (6 dof)
`[ux_i, uy_i, θz_i, ux_j, uy_j, θz_j]` — release `[5]` per cerniera al nodo j.

### Numerazione GdL locale Beam3D (12 dof)
`[ux, uy, uz, θx, θy, θz]` × 2 nodi — release `[5]` per release θz al nodo i, `[11]` per nodo j.

---

## 5. Stato corrente vs prompt originale

| Modulo prompt | Stato | Note |
|---|---|---|
| 1 Elementi (6 richiesti) | ✓ 100% | + Tri3 extra |
| 2 Solver (3 richiesti) | ✓ 100% | + Buckling extra |
| 3 Materiali (6) + sezioni | ✓ 100% | + editor custom |
| 4 API REST + WebSocket | ✓ 100% | + endpoint mesh/import/duplicate/rayleigh/FFT/spectrum/validate |
| 5 Frontend (3 colonne, ortografica, snap-to-grid) | ✓ 100% | |
| 6 Carichi (7 richiesti) | ✓ 100% | tutti + ground_accel |
| 7 Vincoli (6 richiesti) | ✓ 100% | incl. cerniera interna (releases) |
| 8 Post-processing | ✓ 100% | + FFT + spectrum + principal stress |
| 9 5 esempi precaricati | ✓ 120% | 6 esempi (5 + T3 sismico) |
| 10 Export (4 formati) | ✓ 100% | + persistenza disco |
| Test pytest + Vitest | ✓ 100% | 75 + 19 = 94 test |

### Extras oltre la specifica
- Buckling lineare
- Tri3 plane-stress
- FFT + response spectrum sismico
- Snapshot risultati con confronto
- Hover tooltip viewport
- Drag&drop import JSON
- Edit on doubleclick (nodi, elementi, carichi, vincoli)
- Persistenza modelli su disco
- Validation panel interattivo (click → seleziona)
- Toast notifications + axios interceptor
- Equilibrium check live
- Help dialog con shortcut
- Stress principali σ₁/σ₂ con vettori in trazione/compressione
- Animazione transitoria dinamica con HUD timeline
- Auto Rayleigh α,β da 2 frequenze target
- Ground accel (accelerogramma sismico) come carico
- Mesh wizard 1D/2D shell/2D tri/3D
- Materiali/sezioni custom dialog
- Edit modello dialog
- Duplica modello
- Stale results banner

### Cosa potrebbe ancora essere migliorato
- **Solver non-lineare** (Newton-Raphson per geometrico/material non-lineare)
- **Combinazioni di carico** (load combinations con fattori)
- **Mesh adattiva** o non-strutturata (integrazione Gmsh)
- **Edit on doubleclick anche per shell/solid** (per ora solo beam/T3)
- **Plot delle accelerogrammi normativi precaricati** (es. ag standard EC8)
- **Import DXF** (l'export c'è già, manca l'import)
- **Authentication** + multi-user (oggi è single-tenant in-memory + disco)
- **Database persistente** (PostgreSQL + SQLAlchemy) invece di JSON files
- **E2E test Playwright**

---

## 6. Workflow tipici

### "L'utente vuole una nuova feature analisi (es. spettro sismico EC8)"
1. Backend: aggiungi solver/postprocess in `core/postprocess/<feature>.py`
2. Endpoint API in `api/routes/analysis.py`
3. Client API in `frontend/src/api/client.ts`
4. Componente in `frontend/src/components/results/<Feature>Panel.tsx`
5. Integra nel `ResultsPanel.tsx` (nuovo tab o sezione)
6. Test pytest + (opzionale) Vitest

### "L'utente segnala un bug nel solver"
1. Riproduci con uno dei 6 esempi o crea un setup minimo in `tests/test_xxx.py`
2. Verifica con `pytest -v -k <test_name>`
3. Fix → rilancia tutti i test (75/75 deve restare verde)
4. Se è un caso che il prompt richiede, aggiorna anche il documento test

### "L'utente vuole modificare la UI del viewport"
1. Tutti i renderer 3D vivono in `frontend/src/components/viewport/`
2. Toggle UI vanno in `panels/ViewportControls.tsx`
3. State condiviso in `store/analysisStore.ts` o `store/resultsStore.ts`
4. HMR Vite ricarica al volo, nessun restart richiesto

### "Backend riavvio richiesto"
Solo quando si modificano:
- Endpoint API o struttura risposta
- Schemi Pydantic
- Logic dei solver / assembler
- `examples.py` per nuovi esempi precaricati

**Non richiede restart**: modifiche frontend (HMR), persistenza modelli (live).

---

## 7. Comandi cheat sheet

```bash
# Test rapidi
cd backend && python -m pytest                              # 75 test (≈ 2 s)
cd frontend && npm test                                     # 19 test (≈ 1.5 s)
cd frontend && npx tsc --noEmit                             # type check

# Avvio dev
cd backend && python -m uvicorn main:app --reload
cd frontend && npm run dev

# Build produzione
cd frontend && npm run build                                # → dist/

# Reset persistenza (utile per ripartire da zero)
rm -rf backend/data/models/                                 # poi riavvia uvicorn

# Esegui solo gli esempi via API
curl -X POST localhost:8000/api/analysis/static/ex_simple_beam_2d -d '{}'
curl -X POST localhost:8000/api/analysis/modal/ex_tower_3d -d '{"n_modes": 6}'
curl -X POST localhost:8000/api/analysis/dynamic/ex_tri3_seismic -d '{"dt":0.02,"t_end":2}'
```

---

## 8. File chiave da leggere se si vuole capire il sistema

In ordine di priorità:

1. **[backend/core/solver/assembler.py](backend/core/solver/assembler.py)** — cuore del FEM. Capisce questo, capisci tutto.
2. **[backend/examples.py](backend/examples.py)** — esempi concreti di FEAModel completi.
3. **[backend/api/routes/models.py](backend/api/routes/models.py)** + **[analysis.py](backend/api/routes/analysis.py)** — superficie API.
4. **[frontend/src/store/modelStore.ts](frontend/src/store/modelStore.ts)** — state model nel client.
5. **[frontend/src/components/viewport/Viewport3D.tsx](frontend/src/components/viewport/Viewport3D.tsx)** — orchestra Three.js.
6. **[frontend/src/hooks/useAnalysis.ts](frontend/src/hooks/useAnalysis.ts)** — pattern WebSocket + mutation.
7. **[backend/tests/test_examples.py](backend/tests/test_examples.py)** — esempi di test end-to-end con verifica fisica.

---

## 9. Filosofia delle scelte

- **Pragmatismo > purezza accademica**: la rigidezza geometrica del buckling è semplificata (solo termine assiale), il Mindlin shell usa formulazione standard senza correzione del taglio sofisticata. Va bene così per uno strumento didattico/professionale di base.
- **Self-contained**: il backend è puro Python/NumPy/SciPy, no librerie FEM esterne (CalculiX, Code_Aster). Frontend usa solo lib mainstream (R3F, Recharts, jsPDF).
- **In-memory + disco**: niente database, JSON sul filesystem. Per produzione si migra facilmente a Postgres mantenendo la stessa interfaccia `storage.py`.
- **No magic**: i dof "dead" sono identificati e bloccati esplicitamente — niente perché-funziona-non-so-come.
- **Test = specifica**: ogni feature backend ha un test che verifica anche la correttezza fisica (formula analitica), non solo la non-explosion.

---

Buon lavoro. In caso di dubbio: `pytest` deve sempre essere verde, `tsc --noEmit` deve sempre essere verde, e l'app deve sempre essere accessibile a `http://localhost:5173`.
