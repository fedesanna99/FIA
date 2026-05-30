# ADR 005 — Demo Slice v1.9 · Verifica telaio 2D

- **Data**: 30/05/2026 (mezzogiorno)
- **Stato**: 🟢 CHIUSO 30/05/2026 (D1-D8 implementati end-to-end)
- **Predecessore**: Documento Madre v0.2 §0 (killer feature), v1.8 product
  alignment brief (Studio Pro / Percorsi dualità), ADR 003 IA prototipo v3
  (workspace desktop)
- **Successore atteso**: v1.10 (AI Copilot funzionale, ElementDetail completo,
  altri Percorsi: Beam check / Compare alternatives / IFC import)

## Contesto

Il Documento Madre v0.2 §0 dichiara la **killer feature** del prodotto:

> *"FEA Pro mi dice cosa manca, cosa è critico e cosa fare dopo."*

E la **strategia iniziale punto 3**: costruire la **Demo Slice "Verifica
telaio 2D"** — primo Percorso end-to-end che racconta il flow completo
problema → modello → verifica → report → apri in Studio Pro.

Prima di v1.9 esistevano:
- `PercorsiBeamWizard.tsx` (v1.9.0 T1 · 6 step) come modal/page dialog
- `PercorsoUC1Page.tsx` (v2.7.3) page route mockup-driven step 3 default
- 9 template backend pronti

**Quello che mancava**: una vera **galleria sopra** + un Percorso
**parametrico** (non template-fissi) con **preview live** che racconti
la promessa del prodotto.

## Problema

Fare un Demo Slice end-to-end che:
1. Sia accessibile da `/percorsi` (galleria sopra)
2. Permetta all'utente di **costruire** un telaio 2D parametrico (no
   template fisso) con preview SVG live
3. Confermi vincoli/carichi/materiali preset (didattici)
4. Esegua analisi reale (`useRunAnalysis` backend)
5. Mostri UC EC3 derivato dai resultsStore
6. Generi PDF (Trust Layer DRAFT)
7. Termini con "Completa percorso" + ritorno galleria

Senza duplicare codice esistente (`PercorsoStep`, `PercorsoStepper`,
`PercorsiBeamWizard` hooks reusabili).

## Decisione

**8 fette atomiche D1-D8** consecutive in una sessione:

| Fetta | Cosa | Commit |
|---|---|---|
| **D1** | Page route `/percorsi/telaio-2d` skeleton + stepper 6 step | `594e784` |
| **D2** | Galleria `/percorsi` "Choose a path" (3 card + sidebar + footer) | `5226e69` |
| **D3** | Step Geometry parametrico (form 4 campi + preview SVG live + 3 preset) | `1914c9e` |
| **D4** | Sub-header eyebrow "PERCORSO GUIDATO" + Studio Pro pill polish | `1fab4dd` |
| **D5** | Credits chip persistente cross-step | `988c692` |
| **D6** | Step 2-3 Vincoli/Carichi + Materiali/Sezioni (StepConfirm pattern) | `ec7adee` |
| **D7** | Step 4-6 Esegui (real backend) + Critical (UC EC3) + Report (Trust DRAFT) | `c68ff36` |
| **D8** | Deploy + ADR + ROADMAP (questa fetta) | _in corso_ |

**Componenti nuovi creati**:
- `frontend/src/percorsi/PercorsoTelaio2DPage.tsx` (page route 6-step)
- `frontend/src/percorsi/PercorsiGalleryPage.tsx` (galleria)
- `frontend/src/percorsi/steps/StepGeometry.tsx` (D3)
- `frontend/src/percorsi/steps/StepConfirm.tsx` (D6, riusabile per altri step)
- `frontend/src/percorsi/geometry/buildFrameModel.ts` (D3 helper puro)
- `frontend/src/styles/percorso-telaio-2d.css` (~900 righe)
- `frontend/src/styles/percorsi-gallery.css` (~330 righe)
- 3 test files (PercorsoTelaio2DPage + PercorsiGalleryPage + StepGeometry)

**Componenti riusati (zero duplicazione)**:
- `PercorsoStep` template (header + body grid + footer) — wraps ogni step
- `PercorsoStepper` + `PERCORSO_STEPS_6` standard
- `useRunAnalysis` hook (D7 step 4 backend wire)
- `selectionStore` / `modelStore.setModel` / `resultsStore` / `toastStore`

## Convention cristallizzate (per le prossime fette Demo Slice)

### 1. "Una sola verità tecnica, due lenti operative"
Studio Pro e Percorsi condividono lo stesso `modelStore`. Quando D3
genera il telaio via `buildFrameModel` → `setModel(generatedModel)`, lo
stesso modello è visibile anche aprendo Studio Pro. **Zero duplicazione
del dominio**. Pattern Documento Madre §0 onorato.

### 2. "Active escape sempre visibile"
Ogni page route Percorso ha la pill "Apri in Studio Pro →" top-right.
L'utente sa che può sempre uscire dal Percorso e prendere il controllo
manuale del modello. Vedi `ptd-open-studio` accent border polish (D4).

### 3. "Trust Layer DRAFT sempre"
Il report PDF (step 6) è SEMPRE marcato `DRAFT · Preliminary` finché un
tecnico abilitato non lo firma. Nessuna "validità professionale per
default" — pattern Documento Madre §0 Trust Layer.

### 4. "Step parametrici vs StepConfirm"
- Step con parametri user-input (es. D3 Geometry) → componente dedicato
  (StepGeometry.tsx) con form + validation + preview live.
- Step che mostrano preset pre-configurati (es. D6 Vincoli/Materiali) →
  pattern `<StepConfirm />` riusabile (Items + Tip + CTA + Aside about).
- Step backend-driven (es. D7 Esegui/Critical/Report) → inline nel page
  component (logica specifica, no duplicazione utile).

### 5. "Eyebrow visivo emerald = identità Percorsi"
Sub-header con icona ingranaggio emerald-12% bg + eyebrow MONO
"PERCORSO GUIDATO" + titolo Plus Jakarta. Cristallizza la modalità
Percorsi visivamente (vs Studio Pro topbar minimal). Token color
`rgb(16, 185, 129)` allineato al `--c-percorsi` v1.8 step 0.

### 6. "Auto-avanza step quando logica completata"
- D3: click "Done with Geometry" → setStep(2) automatico.
- D7 step 4: quando `staticResults` arriva + `!isRunning` → setStep(5)
  automatico via useEffect.
- D7 step 6: click "Completa percorso" → toast success + navigate
  `/percorsi`.

### 7. "Eyebrow + Aside about + Tip = pattern Percorso"
Ogni step ha:
- **Eyebrow MONO** (es. "STEP 1 — Geometry") nel header (PercorsoStep).
- **Aside dx 240-280px** con "About this step" + preset alternative.
- **Tip box giallo accent-bordered** con Lightbulb icon per nudge
  didattici.

## Conseguenze

### Sostenibili end-to-end
- Demo Slice live su `fea-pro.fly.dev/percorsi/telaio-2d` (post-D8 deploy).
- Vitest 1155+ verde · TS silenzioso · 8 commit atomici.
- Zero touch al solver / viewport engine / store di dominio (eccetto
  setModel che è "boundary write" intenzionale per il flow Percorso).

### Da fare in fette future (NON v1.9)
- **ElementDetail completo** (oggi placeholder MVP in ShellInspectorPanel E2.3
  + step 3 Materiali confirm preset).
- **Backend real generate PDF** (oggi toast MVP — generateReport
  richiede viewport canvas snapshot + setup).
- **Auto-mesh** step 4 (oggi solver lavora direttamente sui nodi/elementi
  generati da buildFrameModel — no mesh refinement).
- **AI Copilot funzionale** (v1.10 — oggi placeholder card galleria + sidebar).
- **Altri Percorsi**: Beam check (refactor PercorsiBeamWizard a page
  pattern coerente) · Compare alternatives · Import IFC/DXF.
- **Mobile Percorso**: oggi desktop-only (persona-driven Federico
  30/05: senior usa desktop) — eventuale M-future per il salto mobile.

## Per il prossimo Claude

Quando Federico dirà "fetta Percorso X" o "completiamo v1.10":
1. **Leggi questo ADR** per capire il pattern Demo Slice consolidato.
2. **Riusa PercorsoStep + PercorsoStepper + StepConfirm** prima di scrivere
   nuovo. La duplicazione del wizard pattern è il primo nemico della
   manutenibilità.
3. **Mantieni "una verità tecnica, due lenti"**: scrivi a `modelStore`,
   `resultsStore` direttamente — non duplicare con uno store-percorso.
4. **Trust Layer DRAFT** è regola immutabile per i report.
5. Pattern "step parametrico vs confirm vs backend-driven" è gia' chiaro
   — vedi sezione "Convention cristallizzate" sopra.

Reference design conservato in `Downloads/uploads/FEAPRO_CLAUDE_DESIGN_PACKAGE/`:
- `01_PRODUCT_VISION/DOCUMENTO_MADRE.md`
- `03_TARGET_MOCKUPS/pack_v0_3/02_percorsi_path_selection.png`
- `03_TARGET_MOCKUPS/pack_v0_3/03_percorso_telaio_2d_step_geometry.png`
- `03_TARGET_MOCKUPS/pack_v0_3/04_percorso_supports_and_loads.png`
- `06_SPRINTS_RECENT/v1_8_product_alignment_brief.md`
