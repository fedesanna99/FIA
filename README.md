# FEA Pro

> Piattaforma FEM proprietaria, browser-first e cloud-aware, per modellare,
> analizzare, verificare, capire e documentare strutture.
>
> **Stato attuale**: `v2.3.2-persist-ci` (multi-model compare + undo/redo store-level + snapshot diff Δ% + persistenza localStorage + CI extended feature/**)
> **Storia release**: vedi [CHANGELOG.md](CHANGELOG.md)
> **Direzione prodotto**: vedi [ROADMAP.md](ROADMAP.md)
> **Guida utente in italiano**: vedi [docs/USER_GUIDE.md](docs/USER_GUIDE.md) — tour interfaccia, flussi passo-passo, convention, troubleshooting, glossario

![Backend](https://img.shields.io/badge/Backend-660%2B%20pytest-brightgreen)
![Frontend](https://img.shields.io/badge/Frontend-584%20vitest-brightgreen)
![E2E](https://img.shields.io/badge/Smoke%20E2E-10%2F10%20live-brightgreen)
![Validation](https://img.shields.io/badge/Validation-LE2%2FCantilever%2FEuler%20OK%20-%20LE1%2FLE10%20in%20fix-yellow)
![TS](https://img.shields.io/badge/TypeScript-strict-blue)
![Live](https://img.shields.io/badge/Live-fea--pro.fly.dev-cyan)

## Quickstart ingegnere · in 3 passi

Vai su **https://fea-pro.fly.dev/** e segui:

1. **Crea un account** — registrati con email + password (≥ 8 caratteri).
   Non serve niente altro: l'app diventa subito attiva.

2. **Apri il primo modello in 10 secondi** — tre vie:
   - **Studio Pro** (CTA blu da home) → costruisci da zero
   - **Percorsi** (CTA emerald da home) → wizard 6-step "Trave bi-appoggiata
     UC1" con template precaricato + analisi statica + UC normativo
     (S275/EC3/NTC) + bozza di report PDF, tutto end-to-end
   - **Da template** (palette `Ctrl+K` → "template") → galleria di 9
     modelli pronti (travi, telai 2D, reticoli 3D)

3. **Pipeline tipica** dalla Studio Pro:
   1. *Make* → mesh linea/shell + materiali (libreria 10 preset o
      custom con E, ν, ρ) + sezioni (40+ profili: IPE/HEA/HEB/UPN/RHS/SHS/CHS
      o custom con calcolo automatico A, Iy, Iz, J, Wel)
   2. *Vincoli* → "Carrello — blocca uᵧ" per bi-appoggiata orizzontale
   3. *Carichi* → nodale / distribuito / pressione / accelerogramma /
      ΔT, oppure auto da `Loads location` (vento NTC, neve, sismica)
   4. *Solve* (CTA verde topbar) → statica · modale · dinamica Newmark ·
      buckling · pushover · sismica time-history · non-lineare
      Newton-Raphson / arc-length Crisfield
   5. *Verify* → EC3 (resistenza + stabilità + LTB) · EC2 · EC5 · EC8 ·
      NTC 2018 · GPS Strutturale UC live
   6. *Inspect/View* → deformata, colormap Von Mises, iso 3D, diagrammi
      N/V/M, modi animati, drift time-history
   7. *Tools* → Export PDF reportlab · XLSX multi-sheet (7 sheet) · DXF ·
      IFC · CSV · validazione LE2/EC3/Cantilever/Euler (LE1/LE10 in fix, vedi sezione "Stato validazione")

> ⚠️ Convention vincoli: `ROLLER_X` = blocca uₓ (asse X vincolato). Per
> trave bi-appoggiata orizzontale (lungo X, gravità −Y) il carrello a destra
> è `ROLLER_Y` non `ROLLER_X`. Il dialog ha un hint dinamico esplicativo.

## Filosofia

- **Algoritmo > AI** — cuore tecnico verificabile, deterministico, niente black box.
- Studio Pro per controllo esperto, Percorsi guidati per scenari ricorrenti.
- Una sola verita' tecnica, tante lenti operative.
- Niente sicurezza dietro paywall.
- **Onestà sopra marketing** — quando un bug viene scoperto in audit interno,
  viene comunicato subito (vedi `docs/nafems_truth_audit.md`).

## ⚠ Stato validazione (v2.3.6 · audit 2026-05-24)

**Avviso importante**: la versione `v2.3.x` corrente NON è raccomandata per
progetti strutturali reali. Diversi bug emersi dall'audit interno
[`v2.3.5-nafems-truth-audit`](docs/nafems_truth_audit.md) richiedono fix
prima di un utilizzo professionale. Sprint di correzione `v2.4.x` in corso.

### Cosa funziona oggi

| Benchmark | Stato | Errore vs target |
|---|---|---|
| LE2 Cylindrical Cantilever | ✅ PASS | < 0.001% |
| Cantilever tip load (Euler-Bernoulli) | ✅ PASS | < 0.001% |
| Cantilever modal (frequenze flessionali) | ✅ PASS | < 2% |
| Euler buckling (pinned-pinned + fixed-free) | ✅ PASS | < 0.001% |

Beam 1D è solido. Tutte le verifiche EC2 / EC3 / EC5 / EC8 / NTC18 dove i
test attuali hanno tolleranza stretta passano correttamente.

### Cosa NON funziona ancora

| Benchmark | Stato | Note |
|---|---|---|
| LE1 Elliptic membrane | ❌ FAIL | Errore reale −32% vs target ±5%; anti-convergenza con mesh fine |
| LE10 Thick plate | ❌ FAIL | σ_yy nel punto D misurato 0.000 MPa vs target −5.38 MPa |
| SHELL_Q4_MITC | ❌ FAIL | Su carico pressione produce max\|uz\| = 0 (dispatch rotto) |
| Stress recovery shell (σ in punto specifico) | ❌ BUG | Componente bending non considerata in postprocess |
| Matrice singolare / struttura labile | ❌ BUG | Solver restituisce NaN o spostamenti folli senza warning |
| EC2 verifica staffe a taglio | ❌ BUG | `needs_stirrups` non confronta V_Ed con V_Rd_c |

### Cosa serve fare

Sprint `v2.4.x` in corso con priorità:
1. Disclaimer + rimozione claim non verificate (`v2.3.6-honesty-fix` — questo sprint)
2. Fix solver matrice singolare (`v2.4.0`)
3. Fix EC2 staffe (`v2.4.1`)
4. Fix SHELL_Q4_MITC + LE1 anti-convergenza + LE10 postprocess (`v2.4.2`)
5. Fix EC3/EC5/EC8 coverage gaps (`v2.4.3`)
6. Legal/security (GDPR, rate limit, headers) (`v2.4.4`)
7. UI bugs da `v2.3.4-quality-checkpoint` (`v2.4.5`)

Stima realistica: **3-4 settimane** di lavoro tecnico.

### Cosa puoi fare oggi con FEA Pro

- Studiare il prodotto, esplorare la UI
- Provare i template precaricati per capire workflow
- Usare LE2 / cantilever / buckling come esercizi didattici
- NON usare per dimensionamenti reali con responsabilità professionale

Per il rilascio "production-ready" attendere tag `v2.4.x` con tutti i fix sopra chiusi.

## Stato attuale (v2.3.2 persist-ci · 2026-05-23)

| Area | Numeri |
|---|---|
| Backend | 660+ pytest verdi · LE2 + Cantilever + Modal + Euler PASS · LE1/LE10 in fix (vedi sezione "Stato validazione") |
| Frontend | **584 vitest verdi** · build ~1.30 MB / gzip ~380 kB (xlsx lazy-loaded) |
| Viewport | InstancedMesh GPU + 5 moduli pure-logic 100% testati |
| E2E live | smoke 10/10 step PASS in 7.2s (auth → mesh → solve → verify → cleanup) |
| Numerica | δ_static err < 6% · f₁ modal err < 0.04% vs formule teoriche |
| Auth | gate full-screen + JWT bearer + 401 auto-logout |
| Deploy | Live su https://fea-pro.fly.dev (Fly free, region `fra`) |

Carry-over tecnici tracciati in **[BACKLOG.md](BACKLOG.md)** (9 voci storiche; tutti i bug B1-B9 dell'audit ingegneristico sono chiusi in v2.2.1).

### Multi-model compare + Undo/Redo (v2.3.0)
- ComparePanel con anteprima A vs B + auto-fetch React Query
- Undo/Redo store-level: Ctrl/Cmd+Z e Ctrl/Cmd+Y su ogni mutation in modelStore
- useModelHistory singleton con snapshot push automatico

### Snapshot diff con Δ% (v2.3.1)
- Rename snapshot inline (doppio click sul nome)
- Panel "Confronta" con delta% su max_u, max_σ, f₁

### Persistenza snapshot + CI extended (v2.3.2)
- snapshotStore persistito su localStorage (zustand persist middleware)
- CI workflow esteso su feature/** + npm ci + concurrency cancel-in-progress

## Capacità

### Solver (10)
- **Statica lineare** — sparse `K u = F` (`static_solver.py`)
- **Modale** — autoproblema `(K − ω² M) φ = 0` con ARPACK (`modal_solver.py`)
- **Dinamica transitoria** — schema Newmark-β implicito, smorzamento di Rayleigh, Auto-α/β da 2 freq. (`dynamic_solver.py`)
- **Buckling lineare** — autoproblema geometrico `K φ = λ K_G φ` (`buckling_solver.py`)
- **Pushover** — analisi statica non-lineare incrementale (`pushover_solver.py`)
- **Non-lineare Newton-Raphson** — convergenza geometrica + materiale (`nonlinear_solver.py`)
- **Arc-length Crisfield** — tracciamento snap-through (`arclength_solver.py`)
- **Sismica time-history** — integrazione step-by-step con accelerogramma (`seismic_th_solver.py`)
- **Unilateral** — vincoli monolateri (no-tension contact) (`unilateral_solver.py`)
- **Assembler** — matrici K, M, K_G globali sparse (`assembler.py`)
- **FFT** e **spettro di risposta** (Sd/Sv/Sa) post-analisi dinamica

### Elementi (13)
| Elemento | GdL/nodo | Tipo |
|---|---:|---|
| Beam 2D Euler-Bernoulli | 3 | flessione+assiale piano |
| Beam 3D + torsione | 6 | spaziale completo |
| Truss 2D / 3D | 2 / 3 | solo assiale |
| Cable 2D / 3D | 2 / 3 | cavo no-compression (geom. non-lineare) |
| Tri T3 plane-stress (CST) | 2 | membrana 2D |
| Shell Q4 Mindlin-Reissner | 6 | membrana + flessione (Gauss 2×2) |
| Shell Q4 MITC4 | 6 | shear-locking-free (mixed interpolation) |
| Shell Q4 layered | 6 | shell multistrato con stratigrafia |
| Solid H8 esaedro | 3 | tridimensionale (Gauss 2×2×2) |
| Solid T4 tetraedro | 3 | tetraedro lineare 4-nodi |
| Solid T10 tetraedro | 3 | tetraedro quadratico 10-nodi |

### Carichi (8 tipi)
Nodale · Distribuito su elemento · Pressione su shell · Peso proprio · Massa nodale · Forzante dinamica F(t) · Accelerogramma alla base (sismica) · Variazione termica ΔT

### Vincoli (6 tipi + releases)
Incastro · Cerniera · Carrello X/Y/Z · Personalizzato 6 GdL · Molla · **Cerniera interna** (release di momento)

### Materiali (libreria + custom)
Acciaio S235/S355 · Cls C25/30, C30/37 · Alluminio 6061 · Legno C24 · Editor materiale custom con preview G, K, ν

### Sezioni (libreria + custom)
IPE 300 · HEA 200 · HEB 300 · Rettangolari · Circolari piene/cave · Editor con calcolo automatico A, Iy, Iz, J, Wpl

### Frontend
- **AuthGate full-screen** + bootstrap idempotente + 401 auto-logout
- **PercorsoStepper 6-step** con TrustLayerBadge ("Preliminary/Draft" enforcement)
- **MissionBar** rule-engine deterministico (suggerisce prossimo passo senza AI)
- **ModelInfoCard** always-on sidebar destra (chip "✓ Salvato HH:MM")
- **ResultsOverviewCard** con metriche δ_max, σ_max, f₁ post-analisi
- **Galleria template** (9 modelli precaricati pronti all'uso)
- **ComparePanel** side-by-side anteprima A vs B con auto-fetch React Query
- Viewport 3D Three.js: prospettica/ortografica, wireframe/solid/transparent, grid + gizmo XYZ
- **Click-to-create nodi** con snap-to-grid configurabile
- Hover tooltip con info real-time, doppio click per edit
- Animazione transitoria con HUD timeline (play/pause/scrubbing)
- Forme modali animate, deformata, stress colormap Jet, diagrammi N/V/M lungo le travi
- **Vettori principal stress σ₁/σ₂** in trazione/compressione su shell e T3
- Drag&drop import JSON, snapshot risultati con confronto grafico (rename inline, diff Δ%)
- Toast notifications, equilibrium check live, validation interattivo (click su issue → seleziona)
- Cheat sheet shortcut (`?`)
- **Undo/Redo store-level** (Ctrl/Cmd+Z, Ctrl/Cmd+Y) su tutte le mutation modelStore

### Persistenza & export
- **Persistenza modelli su disco** (`backend/data/models/*.json`) sopravvive ai riavvii
- Export: **JSON** (modello+risultati) · **CSV** (tabelle) · **DXF** (CAD) · **📄 Report PDF** con immagini viewport e tabelle

## Stack

- **Backend**: Python 3.11 · FastAPI · NumPy · SciPy · Pydantic · pytest
- **Frontend**: React 18 · TypeScript · Three.js · @react-three/fiber · Zustand · TanStack Query · Tailwind CSS · Vite · Recharts · jsPDF · Vitest

## Avvio rapido

```bash
docker-compose up --build
```

- Frontend → http://localhost:5173
- Backend API → http://localhost:8000
- API Docs → http://localhost:8000/docs

## Sviluppo locale

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
pytest                          # 660+ test

# Frontend
cd frontend
npm install
npm run dev
npm test                        # 584 test Vitest
npx tsc --noEmit                # typecheck
npm run build                   # bundle con code-splitting
```

### Variabili d'ambiente backend
- `FEA_DATA_DIR` — directory persistenza (default `backend/data/models/`)
- `FEA_NO_PERSIST=1` — disabilita persistenza su disco (utile per test/CI)

## Esempi precaricati

| ID | Nome | Note |
|---|---|---|
| `ex_simple_beam_2d` | Trave bi-appoggiata 2D | 10 beam IPE 300, q=10 kN/m |
| `ex_portal_frame_2d` | Telaio portale 2D | Vento + carico tetto |
| `ex_truss_3d` | Reticolo spaziale 3D | 36 aste, 4 piani |
| `ex_shell_plate` | Piastra Q4 2×2 m | Carichi nodali equiv. |
| `ex_tower_3d` | Torre 3D 8 piani | Modale + dinamica con impulso |
| `ex_tri3_seismic` | Membrana T3 sismica | Mesh 64 triangoli + accelerogramma |

## Shortcuts

| Tasto | Azione |
|---|---|
| `N` | Aggiungi nodo |
| `E` | Aggiungi elemento |
| `L` | Aggiungi carico |
| `C` | Aggiungi vincolo |
| `M` | Wizard mesh |
| `P` | Toggle modalità "place nodo" |
| `Del` | Elimina selezione |
| `Esc` | Esci da tool / deseleziona |
| `F5` o `Ctrl+Enter` | Esegui analisi |
| `?` | Help cheat sheet |
| `Shift+Click` | Aggiungi alla selezione |
| Doppio click | Edit nodo / elemento |

## Struttura

```
fea-pro/
├── backend/         # FastAPI + solver FEA (660+ test pytest)
│   ├── core/elements/    # 13 elementi finiti (beam2d/3d, truss, cable, tri3, shell Q4 + MITC4 + layered, H8, T4, T10)
│   ├── core/solver/      # 10 solver (static/modal/dynamic/buckling/pushover/nonlinear/arclength/seismic_th/unilateral/assembler)
│   ├── core/postprocess/ # FFT + response spectrum
│   ├── core/mesh/        # generator + validator
│   ├── core/verification/ # EC2/EC3/EC5/EC8/NTC18
│   ├── api/routes/       # REST endpoints
│   ├── api/websocket.py  # progresso real-time
│   ├── schemas/          # Pydantic
│   ├── services/         # provider meteo/sismica/geocoding + cache + rate limit
│   ├── auth/             # JWT + signup/login
│   ├── billing/          # job meter + plans
│   ├── examples.py       # 9 modelli precaricati
│   └── tests/            # pytest
├── frontend/        # React + Three.js (584 test Vitest)
│   ├── src/components/viewport/  # 3D + HUD + tooltip
│   ├── src/components/panels/    # Sidebar pannelli (Compare, Snapshots, Verify...)
│   ├── src/components/dialogs/   # CRUD modal + wizard
│   ├── src/components/shell/     # TopBar, MissionBar, PercorsoStepper, ModelInfoCard, ResultsOverviewCard
│   ├── src/components/results/   # grafici Recharts
│   ├── src/store/                # Zustand (model/results/analysis/snapshot persisted/historyStore...)
│   ├── src/api/client.ts         # axios + interceptor
│   ├── src/hooks/                # query + shortcuts + useModelHistory (undo/redo)
│   ├── src/lib/                  # tributaryAreas, colormap, geometry, ...
│   └── src/utils/                # units, export, PDF report
├── docker-compose.yml
└── .github/workflows/ci.yml      # backend pytest + frontend typecheck + Vitest + Vite build · feature/** extended
```

## CI

GitHub Actions ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) esegue su ogni push:
1. **backend-tests**: Python 3.12 + pytest (660+ test)
2. **frontend-build**: Node 20 + tsc typecheck + Vitest (584 test) + Vite build

> v2.3.2: CI esteso su `feature/**` con `npm ci` e concurrency `cancel-in-progress`.
