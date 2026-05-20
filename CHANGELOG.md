# Changelog FEA Pro

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
