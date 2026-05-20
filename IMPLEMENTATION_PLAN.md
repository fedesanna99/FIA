# FEA Pro — Piano di implementazione completo

Documento eseguibile da Claude Code. Ogni fase è un prompt autonomo: aprilo in una nuova sessione e incollalo. Le fasi sono ordinate per dipendenze e priorità di valore.

**Regole trasversali (valgono per OGNI fase):**

1. **Non considerare una fase completata** finché non passano:
   - `cd backend && pytest -q` → tutti verde
   - `cd frontend && npm test -- --run` → tutti verde
   - `cd frontend && npx tsc --noEmit` → 0 errori
   - `cd frontend && npm run build` → build ok
2. **Ogni nuova feature deve avere test dedicati**: backend → pytest, frontend → Vitest. Coverage minimo: 1 happy path + 1 edge case + 1 caso di errore.
3. **Validazione fisica obbligatoria** per i solver: confronto con soluzione analitica nota o benchmark NAFEMS, tolleranza esplicita nei test (`pytest.approx(rtol=1e-3)` di default, più stretto dove serve).
4. **Nessuna dipendenza a pagamento**. Solo PyPI/npm open source. Tutte le API esterne usate devono avere free tier documentato nel commit.
5. **Niente regressioni**: prima di chiudere una fase, ri-esegui i test di TUTTE le fasi precedenti.
6. **Commit atomici** per fase (uno o più, ma ognuno deve lasciare la build verde).
7. **Aggiorna `README.md`** con le nuove capacità man mano.

---

## FASE 0 — Baseline & infrastruttura test

**Obiettivo:** garantire che la suite attuale sia verde e introdurre strumenti che useremo dopo.

**Tasks:**
- Esegui tutti i test esistenti (backend + frontend). Se qualcosa è rosso, prima fixa.
- Aggiungi al backend: `pytest-cov`, `pytest-benchmark`, `hypothesis` (property-based testing).
- Aggiungi al frontend: `@testing-library/react`, `@testing-library/user-event`, `msw` (mock server).
- Configura coverage gate: `pytest --cov=core --cov-fail-under=70`.
- Crea cartella `backend/tests/benchmarks/` per casi NAFEMS (vuota, popolata in fasi successive).
- Crea cartella `backend/tests/validation/` per confronti con soluzioni analitiche.

**Acceptance test:**
- `pytest --cov` riporta % coverage e non scende sotto 70% sui moduli `core/`.
- CI esistente continua a passare.

---

## FASE 1 — Benchmark NAFEMS & validazione

**Obiettivo:** prima di aggiungere solver nuovi, **validare quelli esistenti** contro casi standard. Senza questo, ogni feature dopo è fragile.

**Casi da implementare in `backend/tests/benchmarks/`:**
- `test_nafems_le1.py` — Elliptic membrane (plane stress) — **rimandato a FASE 11** dopo mesh non strutturata
- `test_nafems_le2.py` — Cylindrical shell patch test — rimandato a FASE 11
- `test_nafems_le10.py` — Thick plate pressure (ellittico) — rimandato a FASE 11
- `test_plate_navier.py` — VARIANTE in Fase 1: piastra rettangolare appoggiata, soluzione di Timoshenko-Navier (mesh strutturata Q4, fattibile ora)
- `test_nafems_fv2.py` — Pin-ended cross (modale)
- `test_nafems_fv4.py` — Cantilever (modale, freq esatte note)
- `test_cantilever_tip_load.py` — Trave a sbalzo con carico in punta: confronto δ = PL³/3EI
- `test_simply_supported_udl.py` — δ = 5wL⁴/384EI
- `test_euler_buckling.py` — N_cr = π²EI/L² (varie condizioni di vincolo)

**Per ogni test:** tolleranza esplicita, riferimento documentato in docstring.

**Acceptance test:**
- Tutti i benchmark NAFEMS passano con tolleranza ≤ 2% sui valori target.
- Test di buckling Eulero: 4 condizioni di vincolo (libero-incastro, cerniera-cerniera, incastro-incastro, incastro-libero), tutti entro 1%.

---

## FASE 2 — Codici di verifica strutturale (EC3 acciaio)

**Obiettivo:** trasformare il software da "calcolatore" a "tool per ingegneri italiani". Eurocodice 3 prima perché è il più richiesto.

**Backend — `backend/core/verification/`:**
- `ec3/section_classification.py` — classi 1/2/3/4 secondo Tab 5.2 EN 1993-1-1
- `ec3/resistance.py` — N_c,Rd, N_t,Rd, M_c,Rd, V_c,Rd
- `ec3/stability.py` — instabilità flessionale (curve a/b/c/d), flesso-torsionale (LTB)
- `ec3/combined.py` — verifica combinata N+M (formule 6.61, 6.62)
- `ec3/serviceability.py` — frecce limite L/250, L/300
- `materials_library.py` — S235, S275, S355, S420, S460 con tutte le proprietà normative
- `sections_library.py` — IPE/HEA/HEB/HEM completi (da `structural_shapes` PyPI o tabelle hardcoded)

**API:** `POST /api/verify/ec3` riceve `{model_id, load_combo}` e ritorna lista verifiche per elemento con utilization ratio.

**Frontend:**
- Nuovo pannello `VerificationPanel` con tabella elementi, U.R. colorato (verde <0.8, giallo 0.8-1.0, rosso >1.0)
- Click su elemento → modale con formule applicate e valori intermedi
- Export PDF report verifiche

**Test (obbligatori):**
- 1 test per ogni formula di EN 1993-1-1 con valori da esempi del CTICM o handbook
- Test di integrazione: trave IPE 300 L=6m con carico noto → U.R. atteso
- Confronto con almeno 3 esempi pubblicati (cita la fonte in docstring)
- Frontend: test che la tabella renderizza, colori giusti, modale apre

**Acceptance:**
- `pytest backend/tests/verification/` tutto verde
- Vitest copre il nuovo pannello
- Demo: caricare `ex_portal_frame_2d`, lanciare verifica, vedere risultati

---

## FASE 3 — Verifiche EC2 (cemento armato) + EC5 (legno) + EC8 (sismica)

Stessa struttura di Fase 2.

**EC2:**
- Flessione semplice rettangolare con armatura calcolata
- Taglio (V_Rd,c, V_Rd,s con staffe)
- Verifica fessurazione SLE
- Test: confronto con esempi UNI/Bozza

**EC5:**
- Legno C24, GL24h: trazione, compressione, flessione, taglio
- Instabilità di colonne e di travi (LTB)
- k_mod, k_def coefficienti

**EC8:**
- Calcolo zona sismica da coordinate (dataset INGV già nel repo)
- Spettri elastici Type 1/2 con S, T_B, T_C, T_D
- Fattore di struttura q
- Verifica gerarchia delle resistenze (nodo trave-colonna)
- Combinazioni sismiche E+G+0.3Q

**Test:**
- 1 esempio per Eurocodice da letteratura ufficiale, errore <2%
- `test_seismic_zone_lookup.py`: 10 città italiane note → a_g atteso

---

## FASE 4 — Combinazioni di carico SLU/SLE automatiche

**Backend — `backend/core/combinations/`:**
- `ntc2018.py`: combinazioni fondamentale, sismica, rara, frequente, quasi-permanente
- Coefficienti γ_G, γ_Q, ψ_0, ψ_1, ψ_2 per categorie A-H (residenziale, ufficio, ecc.)
- Inviluppo automatico delle sollecitazioni

**API:** `POST /api/analysis/run_envelope` esegue tutte le combinazioni e ritorna max/min per elemento.

**Frontend:**
- UI per categoria d'uso (dropdown) e tipo di azioni (G1, G2, Q1, Q2, Vento, Neve, Sisma)
- Tabella inviluppo per ogni elemento

**Test:**
- Combinazione manuale di un caso noto → confronto numerico
- Property-based con `hypothesis`: l'inviluppo è sempre ≥ del singolo caso peggiore

---

## FASE 5 — Solver: non-linearità geometrica (P-Δ, grandi spostamenti)

**Backend — `backend/core/solver/nonlinear/`:**
- `newton_raphson.py` — N-R standard con incremento di carico (load control)
- `arc_length.py` — Riks/Crisfield per snap-through
- `geometric_stiffness.py` — K_T = K + K_σ (già esiste per buckling, riutilizzare)

**Test (CRITICI):**
- Trave snella a sbalzo: confronto con soluzione di Bisshopp & Drucker (1945)
- Asta di Eulero post-buckling: confronto con curva analitica
- Snap-through di arco ribassato (Williams toggle frame): valori tabulati noti
- Convergenza in <50 iterazioni, residuo <1e-6
- **TODO carry-over da FASE 1**: rimuovere `@pytest.mark.xfail` da
  `tests/benchmarks/test_euler_buckling.py::test_pinned_pinned_column_K1`
  dopo aver implementato K_G beam corretta. Il test deve passare con
  tolleranza ≤2% sul valore N_cr = π²EI/L² al raffinare della mesh.

**Frontend:**
- Pannello "Analisi non lineare" con curve carico-spostamento real-time
- Visualizzazione deformata a step incrementali (slider)

---

## FASE 6 — Solver: plasticità (cerniere plastiche, push-over)

**Backend:**
- Cerniera plastica concentrata con interazione N-M
- Modello elasto-plastico perfetto + incrudimento bilineare
- Push-over analysis con incremento monotono di spostamento
- Curva di capacità (taglio alla base vs spost. punto controllo)

**Test:**
- Trave a sbalzo: momento plastico M_pl = W_pl × f_y, confronto entro 1%
- Telaio 1 piano 1 campata: meccanismo a 3 cerniere, fattore di collasso noto
- Push-over di telaio 3 piani: capacità ultima entro 5% da SAP2000 reference (file di confronto fornito)

---

## FASE 7 — Spettrale modale CQC/SRSS

**Backend — `backend/core/postprocess/spectral.py`:**
- Combinazione SRSS (Square Root of Sum of Squares)
- Combinazione CQC (Complete Quadratic) con coefficienti ρ_ij
- Spettro EC8 elastico e di progetto
- Calcolo masse partecipanti (deve raggiungere ≥85%)
- Combinazione direzioni X+0.3Y / 0.3X+Y

**Test:**
- Edificio 3 piani shear-type: confronto con calcolo manuale
- Verifica che SRSS ≤ CQC per modi vicini
- Massa partecipante 1° modo trave a sbalzo: ~61.3% (valore teorico noto)

**Frontend:**
- Pannello "Spettrale" con configurazione spettro EC8
- Tabella modi con periodo, massa partecipante %, contributo
- Bottone "Run spettrale" che fa N analisi statiche equivalenti e combina

---

## FASE 8 — Nuovi elementi: cavo, suolo Winkler, shell layered, tetraedro

**Backend — nuovi elementi in `core/elements/`:**

### 8.1 Cavo (catenaria, solo trazione)
- Elemento `Cable2D` e `Cable3D`
- Test: catenaria sotto peso proprio, freccia analitica nota

### 8.2 Beam su suolo elastico (Winkler)
- Modulo k_w costante
- Test: trave infinita su Winkler con carico concentrato → soluzione di Hetényi

### 8.3 Shell layered (compositi/CLT)
- Stratificazione con angoli e materiali diversi
- Matrice ABD classica laminate theory
- Test: laminato simmetrico [0/90/90/0] → confronto con esempio Reddy

### 8.4 Tetraedro T4 e T10
- T4 lineare (4 nodi)
- T10 quadratico (10 nodi, 4 di vertice + 6 di lato)
- Test patch test, test di convergenza su cubo soggetto a trazione

**Frontend:**
- Editor per definizione cavi (snap su nodi esistenti)
- Editor laminato con tabella strati
- Visualizzazione T4/T10 nel viewport

---

## FASE 9 — Elementi di contatto / molle unilaterali

**Backend:**
- Molla che lavora solo a compressione (terreno)
- Gap element con luce iniziale
- Iterazione di contatto con active-set

**Test:**
- Trave su suolo elastico che si solleva su un lato: confronto con Hetényi modificato
- Gap di chiusura: spostamento iniziale = gap, poi rigidezza piena

---

## FASE 10 — Import/export BIM e CAD

**Backend:**
- `pip install ifcopenshell ezdxf cadquery` (tutti free, open source)
- `core/io/dxf_importer.py` — importa linee e polilinee come beam
- `core/io/dxf_exporter.py` — esporta modello + risultati (già parzialmente fatto, completare)
- `core/io/ifc_importer.py` — legge `IfcBeam`, `IfcColumn`, `IfcSlab` da file IFC4
- `core/io/ifc_exporter.py` — scrive modello come IFC con `IfcStructuralAnalysisModel`

**API:**
- `POST /api/import/dxf` (multipart upload)
- `POST /api/import/ifc`
- `GET /api/export/{model_id}/ifc`

**Frontend:**
- Drag & drop file `.dxf` / `.ifc` nella viewport
- Preview pre-import con check (unità, scala, layer mapping)

**Test:**
- File DXF di test: 1 trave semplice → importa, 2 nodi + 1 elemento
- File IFC4 di test (scaricato da BuildingSMART sample files): importa edificio piccolo
- Round-trip: esporta IFC, re-importa, modelli identici

---

## FASE 11 — Mesh automatica e parametrica

**Backend:**
- `pip install gmsh pygmsh meshio`
- `core/mesh/auto_mesh_2d.py` — Delaunay su regione poligonale arbitraria
- `core/mesh/auto_mesh_3d.py` — wrapper gmsh per tetraedrizzazione
- `core/mesh/parametric.py` — geometrie parametriche (capannone, telaio, piastra)

**Test:**
- Mesh quadrato 1×1 con h=0.1: ~200 triangoli ±10%
- Qualità mesh: tutti i triangoli con angolo minimo >20°
- Mesh tetraedrica di cubo: convergenza su soluzione di trazione semplice

**Frontend:**
- Wizard "Nuova geometria parametrica" → dropdown template
- Slider per parametri (L, H, n piani) con preview live

---

## FASE 12 — Time-history sismica multi-componente

**Backend:**
- Estendere accelerogramma a 3 componenti X/Y/Z
- Scaling automatico per match con spettro target (procedura EN 1998-1)
- Caricamento da file `.AT2` (PEER), `.ASC` (ESM)

**Test:**
- File AT2 di test (El Centro): caricamento corretto, peak ground accel verificato
- Scaling: spettro della time-history scalata combacia con target entro 10% nei periodi rilevanti

---

## FASE 13 — Catalogo accelerogrammi reali (USGS / ESM / INGV)

**Backend:**
- `core/io/strong_motion.py` — client per:
  - USGS Earthquake Catalog API (https://earthquake.usgs.gov/fdsnws/event/1/)
  - ESM Database (https://esm-db.eu) — registrazione gratuita
  - INGV (http://terremoti.ingv.it/)
- Cache locale dei record scaricati in `backend/data/strong_motion/`

**API:**
- `GET /api/strong_motion/search?lat=&lon=&radius=&min_magnitude=`
- `POST /api/strong_motion/download/{event_id}`

**Frontend:**
- Modale "Carica sisma reale" con mappa (Leaflet, free) e filtri
- Anteprima accelerogramma prima del download

**Test:**
- Mock con `responses` o `httpx_mock` delle API esterne
- 1 test di integrazione reale (`@pytest.mark.network`, opt-in con flag)

---

## FASE 14 — Fatica (Rainflow + S-N)

**Backend:**
- `pip install rainflow`
- `core/postprocess/fatigue.py` — conteggio cicli Rainflow, curve S-N (EN 1993-1-9 per acciaio)
- Calcolo danno cumulato Miner

**Test:**
- Sequenza nota → conteggio cicli verificato manualmente
- Particolare costruttivo categoria 90 con storia stress nota → danno atteso

---

## FASE 15 — UI: undo/redo, versioning, commenti, misure

**Frontend:**
- Middleware Zustand per history (undo/redo con `zundo`)
- Snapshot versioning con diff visivo (cosa è cambiato fra v1 e v2)
- Annotazioni ancorate a nodi/elementi (testo + colore)
- Tool "misura" (distanza, angolo) con click su 2 punti

**Test:**
- `userEvent` simula crea nodo → undo → nodo sparito → redo → nodo torna
- Versioning: 2 snapshot consecutivi, diff mostra entità aggiunte

---

## FASE 16 — Slicing, iso-surfaces, modi sovrapposti

**Frontend (Three.js):**
- Piano di taglio interattivo per H8/shell con isovalori di stress
- Iso-surfaces 3D (marching cubes) — usa `three-stdlib`
- Combinazione lineare di modi (slider per coefficienti) con animazione

**Test (Vitest + jsdom):**
- Snapshot test del componente slicer
- Test unitario: marching cubes su scalar field analitico → vertici attesi

---

## FASE 17 — Export Excel multi-sheet

**Backend:**
- `pip install openpyxl`
- `core/io/excel_export.py` con sheet: Nodi, Elementi, Reazioni, Sollecitazioni, Spostamenti, Verifiche
- Formattazione: header bold, U.R. con colori condizionali

**API:** `GET /api/export/{model_id}/xlsx`

**Test:**
- Apri il file generato con `openpyxl`, verifica numero sheet e celle chiave

---

## FASE 18 — Confronto modelli A vs B

**Backend:**
- `core/compare/model_diff.py` — diff strutturale (entità aggiunte/rimosse/modificate)
- `core/compare/results_diff.py` — diff numerico risultati (max delta %, posizione)

**Frontend:**
- Vista split: modello A sinistra, B destra, viewport sincronizzate
- Tabella diff con filtri

**Test:**
- 2 modelli identici → diff vuoto
- Modello con 1 elemento in più → diff lo evidenzia

---

## FASE 19 — Convergence checker e mesh adaptive

**Backend:**
- `core/mesh/adaptive.py` — stima errore (Zienkiewicz-Zhu) e raffittimento dove err > toll
- Loop: mesh → solve → error → refine, fino a convergenza

**Test:**
- Patch test: stima errore = 0 su soluzione esatta
- Concentrazione di stress (foro in piastra): converge a Kt=3.0 ±2%

---

## FASE 20 — Python client + CLI

**Nuovo package `fea-pro-client/`:**
- `pip install -e .` installabile
- Classi: `Client`, `Model`, `Analysis`, `Results`
- CLI: `fea-pro run model.json --analysis static` produce JSON risultati

**Test:**
- Test E2E: avvia backend, client si connette, crea modello, esegue, scarica risultati
- CLI con `--help` produce output atteso

---

## FASE 21 — AI Copilot strutturale (Gemini free tier)

**Backend — `backend/core/ai/`:**
- Client per Google Gemini (`pip install google-generativeai`) — 15 req/min free, no carta richiesta
- Fallback su Ollama locale (`pip install ollama`) se disponibile
- Tool calling: il modello può chiamare API interne (`get_model`, `run_analysis`, `verify_ec3`)
- Endpoint streaming `POST /api/ai/chat` (SSE)

**Frontend:**
- Pannello chat laterale con:
  - "Genera modello da descrizione" → "telaio 5 piani 3 campate IPE300 zona sismica 2" → modello creato
  - "Spiega questi risultati" → mostra contesto risultati e chiede al modello
  - "Verifica questa trave a EC3" → invoca tool calling

**Test:**
- Mock del client AI con risposte deterministiche
- Test che il parser tool-call genera azioni corrette
- 1 test integrazione opt-in con API reale (`@pytest.mark.ai_live`)

---

## FASE 22 — Collaborazione real-time (Yjs + WebSocket)

**Backend:**
- `pip install y-py` (Yjs Python binding)
- Estendere WebSocket esistente con channel Yjs per modelli condivisi
- Persistenza CRDT su disco

**Frontend:**
- `npm install yjs y-websocket`
- Awareness (cursori e selezioni di altri utenti nel viewport)
- Indicatore "X utenti online"

**Test:**
- 2 client headless modificano lo stesso modello → entrambi convergono allo stesso stato
- Disconnessione + riconnessione: merge corretto

---

## FASE 23 — Auto-detection problemi modello

**Backend — `backend/core/validation/diagnostic.py`:**
- Meccanismi labili (autovalori di K negativi/nulli)
- Nodi non vincolati flottanti
- Masse mancanti per analisi modale
- Mesh distorta (jacobiano negativo, angoli estremi)
- Carichi su elementi inesistenti

**API:** `GET /api/models/{id}/diagnostic` ritorna lista issue con severity.

**Frontend:**
- Banner "X warnings, Y errors" sopra al viewport
- Click su issue → highlight entità coinvolte

**Test:**
- Modello con 1 nodo flottante → diagnostic lo trova
- Modello con K singolare (meccanismo) → trovato

---

## FASE 24 — Report PDF parametrico con template

**Backend:**
- `pip install jinja2 weasyprint` (alternativa: `reportlab`)
- Template HTML con segnaposti per: copertina, indice, modello, risultati, verifiche
- Render server-side via WeasyPrint → PDF di qualità professionale

**API:** `POST /api/export/{model_id}/report` con `{template, sections, signatures}`.

**Frontend:**
- Pannello "Genera report" con checkboxes per sezioni e preview PDF inline (`<embed>`)

**Test:**
- Render report di esempio → PDF generato non vuoto, contiene parole chiave attese (parsing con `pdfplumber`)

---

## FASE 25 — Hardening finale e release

**Tasks:**
- Coverage globale ≥ 85%
- Esegui tutta la suite NAFEMS + benchmark cumulativi
- Audit dipendenze (`pip-audit`, `npm audit`)
- Documenta tutte le API in `/docs` (FastAPI Swagger già esiste, integrarlo)
- Aggiorna `README.md` con tutte le nuove capacità
- Bump version 2.0.0, tag git
- Smoke test docker-compose: tutto parte, le 6 demo precaricate funzionano

**Acceptance finale:**
- `pytest --cov` ≥ 85%
- `vitest --coverage` ≥ 75%
- 0 vulnerabilità HIGH/CRITICAL in audit
- Build docker completa <5 minuti
- Le 6 demo precaricate eseguono statica + modale + dinamica senza errori
- Almeno 1 caso completo end-to-end documentato: importa IFC → mesh → analisi → verifica EC3 → report PDF

---

## Note operative per Claude Code

- **Esegui una fase alla volta.** Non saltare le fasi precedenti, le dipendenze sono reali.
- **Se un test fallisce** non commentarlo o rilassare la tolleranza senza spiegare nel commit perché. La validazione fisica è l'unica difesa contro bug subdoli nel FEM.
- **Quando aggiungi una dipendenza**, aggiornala in `requirements.txt` (backend) o `package.json` (frontend) con versione pinnata.
- **Documentation as code**: ogni modulo nuovo ha docstring con riferimento normativo/bibliografico (es. "EN 1993-1-1 §6.3.1.2" o "Bathe, FEM Procedures, 2014, p. 421").
- **Naming consistente**: italiano per UI utente, inglese per nomi di funzioni/classi/file.
- **Performance budget**: nessuna analisi di un modello di esempio deve impiegare più di 2× il tempo pre-modifica. Aggiungi `pytest-benchmark` ai test critici.
- **Backward compatibility**: i modelli JSON salvati con versione N devono caricare con versione N+1. Aggiungi migrazione automatica se cambi schema.

## Comando di partenza

```
Apri IMPLEMENTATION_PLAN.md ed esegui la FASE 0 secondo le regole trasversali. Quando hai finito e tutti i test passano, fermati e chiedi conferma prima di passare alla FASE 1.
```
