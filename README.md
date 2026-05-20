# FEA Pro v1.0.0

Applicazione web di analisi strutturale agli elementi finiti, ispirata a LUSAS / SAP2000.

![Stato](https://img.shields.io/badge/Backend-660%2F660%20pytest-brightgreen) ![Stato](https://img.shields.io/badge/Frontend-58%2F58%20vitest-brightgreen) ![Cov](https://img.shields.io/badge/coverage-92%25-brightgreen) ![TS](https://img.shields.io/badge/TypeScript-clean-blue)

> Release ufficiale **v1.0.0** del 2026-05-19 dopo le 25 fasi del piano.
> Carry-over tecnici non bloccanti tracciati in **[BACKLOG.md](BACKLOG.md)** (9 voci).
>
> **⚠️ Audit UX**: il backend espone ~45 funzionalità, l'attuale UI ne raggiunge
> circa il 55%. Specifica completa per redesign UI/UX moderno e responsive in
> **[UI_REDESIGN_SPEC.md](UI_REDESIGN_SPEC.md)** (8 milestone M0-M8, ~12 giorni).

## Capacità

### Solver
- **Statica lineare** — sparse `K u = F`
- **Modale** — autoproblema `(K − ω² M) φ = 0` con ARPACK
- **Dinamica transitoria** — schema Newmark-β implicito, smorzamento di Rayleigh, Auto-α/β da 2 freq.
- **Buckling lineare** — autoproblema geometrico `K φ = λ K_G φ`
- **FFT** e **spettro di risposta** (Sd/Sv/Sa) post-analisi dinamica

### Elementi
| Elemento | GdL/nodo | Tipo |
|---|---:|---|
| Beam 2D Euler-Bernoulli | 3 | flessione+assiale piano |
| Beam 3D + torsione | 6 | spaziale completo |
| Truss 2D / 3D | 2 / 3 | solo assiale |
| Tri T3 plane-stress (CST) | 2 | membrana 2D |
| Shell Q4 Mindlin-Reissner | 6 | membrana + flessione (Gauss 2×2) |
| Solid H8 esaedro | 3 | tridimensionale (Gauss 2×2×2) |

### Carichi (8 tipi)
Nodale · Distribuito su elemento · Pressione su shell · Peso proprio · Massa nodale · Forzante dinamica F(t) · Accelerogramma alla base (sismica) · Variazione termica ΔT

### Vincoli (6 tipi + releases)
Incastro · Cerniera · Carrello X/Y/Z · Personalizzato 6 GdL · Molla · **Cerniera interna** (release di momento)

### Materiali (libreria + custom)
Acciaio S235/S355 · Cls C25/30, C30/37 · Alluminio 6061 · Legno C24 · Editor materiale custom con preview G, K, ν

### Sezioni (libreria + custom)
IPE 300 · HEA 200 · HEB 300 · Rettangolari · Circolari piene/cave · Editor con calcolo automatico A, Iy, Iz, J, Wpl

### Frontend
- Viewport 3D Three.js: prospettica/ortografica, wireframe/solid/transparent, grid + gizmo XYZ
- **Click-to-create nodi** con snap-to-grid configurabile
- Hover tooltip con info real-time, doppio click per edit
- Animazione transitoria con HUD timeline (play/pause/scrubbing)
- Forme modali animate, deformata, stress colormap Jet, diagrammi N/V/M lungo le travi
- **Vettori principal stress σ₁/σ₂** in trazione/compressione su shell e T3
- Drag&drop import JSON, snapshot risultati con confronto grafico
- Toast notifications, equilibrium check live, validation interattivo (click su issue → seleziona)
- Cheat sheet shortcut (`?`)

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
pytest                          # 75 test

# Frontend
cd frontend
npm install
npm run dev
npm test                        # 19 test Vitest
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
├── backend/         # FastAPI + solver FEA (75 test pytest)
│   ├── core/elements/    # 7 elementi finiti
│   ├── core/solver/      # 4 solver (static/modal/dynamic/buckling)
│   ├── core/postprocess/ # FFT + response spectrum
│   ├── core/mesh/        # generator + validator
│   ├── api/routes/       # REST endpoints
│   ├── api/websocket.py  # progresso real-time
│   ├── schemas/          # Pydantic
│   ├── examples.py       # 6 modelli precaricati
│   └── tests/            # pytest
├── frontend/        # React + Three.js (19 test Vitest)
│   ├── src/components/viewport/  # 3D + HUD + tooltip
│   ├── src/components/panels/    # Sidebar pannelli
│   ├── src/components/dialogs/   # CRUD modal
│   ├── src/components/results/   # grafici Recharts
│   ├── src/store/                # Zustand (model/results/analysis/toast/ui/snapshot)
│   ├── src/api/client.ts         # axios + interceptor
│   ├── src/hooks/                # query + shortcuts
│   └── src/utils/                # colormap, units, geometry, export, PDF report
├── docker-compose.yml
└── .github/workflows/ci.yml      # backend pytest + frontend typecheck + Vitest + Vite build
```

## CI

GitHub Actions ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) esegue su ogni push:
1. **backend-tests**: Python 3.12 + pytest (75 test)
2. **frontend-build**: Node 20 + tsc typecheck + Vitest (19 test) + Vite build
