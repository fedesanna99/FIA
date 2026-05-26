# FEA Pro · Design Decisions History

> Recupero strutturato di decisioni, wireframe, brief già prodotti in chat passate.
> Obiettivo: NON ripartire da zero. Cross-reference con i 64 bug del UX_AUDIT.
>
> Chat passate analizzate:
> - **Chat A** ("Greeting in Italian", 2026-05-24 pomeriggio): brief 7-sprint completo redesign Precision
> - **Chat B** (questa, in chiusura): audit 64 bug founder-driven + Capability Map
>
> 2026-05-25 — Federico + Claude

---

## SINTESI ESECUTIVA

In Chat A esiste già un **brief 7-sprint completo (v2.5.0-redesign-precision)** con:
- 25 giorni Claude Code di lavoro pianificato
- 17 schermate ridisegnate (mockup HTML + JSX bundle)
- Wireframe completi ElementInspector + NodeDetail con dati specifici
- 4 BUG-V mobile identificati con fix
- 25-30 asserzioni E2E discoverability
- 6 quality gate per ogni sprint
- Trust Layer DRAFT + disclaimer cleanup pianificato

**Quanto è stato implementato**: solo **S1 (PR1 v2.5.0-pr1-tokens-atoms)**. Era stato chiuso, mergeato, deployato su fea-pro.fly.dev (vedi screenshot live dashboard A1 in chat).

**Quanto resta da fare**: S2-S7 (~22 giorni Claude Code), che include:
- Chrome navigazionale (S2)
- 4 BUG mobile (S2 o S3 a seconda della versione del brief)
- 5 screens core (S3)
- 6 screens percorsi (S4)
- **ElementInspector + diagrammi picchi (S5)** — chiude 4 P0 Paoletto
- Viewport 3D + palette espansa (S6)
- Mobile + E2E + deploy (S7)

**Il problema**: tra Chat A (24/05 pomeriggio) e questa chat (24/05 sera), il lavoro è stato **interrotto al PR1**. Mai partito S2-S7.

---

## 1 · IL BRIEF v2.5.0-redesign-precision IN BREVE

### 1.1 · Caratteristiche visuali non negoziabili (decisione presa)

- Light canonical, dark paritetico via `[data-theme="dark"]`
- Accento cyan singolo `#0891B2` light / `#5DD7F2` dark
- Tutti i radius a 0 (sharp). `rounded-full` solo per cerchi puri
- Hairline borders, shadow `0 0 0 1px rgba(...)`
- Tipografia: Inter (body), Inter Tight (display), JetBrains Mono (numerici)
- Italiano predominante, inglese solo per codici norma (EC3 §6.2.5, kNm, ⌘K)

### 1.2 · Vincoli operativi (decisione presa)

- **Zero modifiche backend** (1675 PASS invariato)
- **Zero rimozioni feature** (solo ridisegno)
- **Zero nuove dipendenze pesanti** (Tailwind + Lucide bastano)
- Task v1.5 aperti confluiscono nel redesign

### 1.3 · Pipeline 7 sprint (decisione presa)

| Sprint | Scope | Giorni | Tag |
|---|---|---|---|
| S1 | tokens + atoms | 2.5 | `v2.5.0-pr1-tokens-atoms` ✓ FATTO |
| S2 | chrome + 4 BUG mobile | 4 | `v2.5.0-pr2-chrome` |
| S3 | A1+A2+B1+B3+C1 screens | 3 | `v2.5.0-pr3-screens-core` |
| S4 | C2-C7 percorsi | 2.5 | `v2.5.0-pr4-percorsi` |
| S5 | ElementInspector + diagrammi | 4-5 | `v2.5.0-pr5-inspector-diagrams` |
| S6 | viewport + palette ≥160 voci | 3.5 | `v2.5.0-pr6-viewport-palette` |
| S7 | mobile + E2E + polish | 4 | `v2.5.0` (tag finale) |

### 1.4 · Decisioni architetturali fissate (decisione presa)

| ID | Decisione | Scelta |
|---|---|---|
| D1 | Sprint quick fix bug mobile prima? | NO, confluiti in S2 |
| D2 | Gap ElementInspector | Claude Code disegna in S5, Federico valida wireframe ASCII |
| D3 | Branch strategy | feature branch + PR per sprint (no atomici su test) |
| D4 | Default tema | light canonical, auto-migrate utenti su dark |
| D5 | Cadenza | back-to-back per S0-S2, flessibile da S3 |

---

## 2 · CROSS-REFERENCE: 64 BUG ↔ DECISIONI ESISTENTI

Per ogni cluster del UX_AUDIT, verifico cosa è già stato pensato.

### CLUSTER A · Caos visivo + densità eccessiva (12 bug)

**Stato in Chat A**: 4 BUG-V identificati specifici + decisioni tipografiche/densità prese.

| Bug audit | Mappa in Chat A | Stato |
|---|---|---|
| BUG-001 (banner copre Run) | **BUG-V2** | Identificato + fix proposto: TopBar height fixed mobile, no debord |
| BUG-002 (Nuovo modello duplicato) | **BUG-V1** | Identificato + fix proposto: `md:hidden` sulla pill |
| BUG-003 (bottom tabbar label sovrapposte) | parziale | Tabbar mobile già implementata, ri-stilare S2/S3 |
| BUG-004 (sub-header troncati) | **BUG-V3** | Identificato + fix proposto: dash orfano condizionato + CHECKS responsive |
| BUG-005 (Custom · Transp · Orto · L3) | **BUG-V4** | Identificato + fix proposto: ViewportToolbar con label "Vista: Iso/Front/Top" + sostituire stringhe criptiche |
| BUG-022 (tipografia troppo piccola) | Decisione D presa | Token Inter/Inter Tight/JetBrains Mono - serve refinement densità |
| BUG-023 (7 sezioni stesso peso View) | NUOVO | Non discusso |
| BUG-024 (concetti misti View) | NUOVO | Non discusso |
| BUG-025 (header ridondante View) | NUOVO | Non discusso |
| BUG-026 (DRAW 2 · x50.0) | NUOVO | Non discusso |
| BUG-038 (topbar dim sotto standard) | parziale | Tokens definiti, da verificare se >= WCAG |
| BUG-041 (sidebar 3 icone senza tooltip) | NUOVO | Non discusso |

**Verdetto Cluster A**: 4/12 bug già pianificati come BUG-V in S2/S3. 8/12 nuovi (emersi da audit Cluster A nostro).

### CLUSTER B · Error handling tecnico (5 bug)

**Stato in Chat A**: NESSUNA discussione esplicita. Brief non tocca error handling.

| Bug | Stato | Note |
|---|---|---|
| BUG-011, 012, 013, 046, 047 | TUTTI NUOVI | Cluster scoperto nel nostro audit, non era nel radar di Chat A |

**Verdetto Cluster B**: cluster INTERAMENTE nuovo. Va aggiunto al piano.

### CLUSTER C · State management pannelli (4 bug)

**Stato in Chat A**: Decisione presa per inspector ma NON per state machine generale.

| Bug | Mappa in Chat A | Stato |
|---|---|---|
| BUG-014 (click nodo apre Inspect+NodeDetail) | parziale | S5 prevede `selectionStore` + click nodo → RightPanel Inspect (no più modal). NON dice esplicitamente "chiude altri pannelli" |
| BUG-015 (click nodo no feedback) | NUOVO | Non discusso, skeleton loader non menzionato |
| BUG-058 (Solve > Live vuoto) | parziale | Solve panel previsto in S3/S4 ma empty state specifico non discusso |
| BUG-064 (Apri Make non chiude Solve) | NUOVO | State machine pannelli non risolta esplicitamente |

**Verdetto Cluster C**: parziale. La selezione node/element via `selectionStore` è chiara, ma la state machine generale dei pannelli (Make/Solve/Verify/Inspect mutuamente esclusivi?) NON è risolta. Va decisa ora.

### CLUSTER D · Copy criptico + i18n (8 bug)

**Stato in Chat A**: Decisione "italiano predominante" presa, ma audit specifico termini inglesi residui NON fatto.

| Bug | Stato |
|---|---|
| BUG-017 ("Albero" criptico) | NUOVO |
| BUG-018 (climate apply, Fixed, pinned, rollers) | NUOVO |
| BUG-020 (FASI verticale) | NUOVO |
| BUG-029 (termini inglesi View) | NUOVO |
| BUG-030 (3+1 · leg) | NUOVO |
| BUG-040 (3D · SI criptico) | NUOVO |
| BUG-050 (Torre 3D vs trave reticolare) | NUOVO |
| BUG-054 (RAIL DESTRO, MODELING, I/O) | NUOVO |

**Verdetto Cluster D**: cluster INTERAMENTE nuovo. Va fatto audit termini con grep + mappatura traduzioni.

### CLUSTER E · Information architecture (5 bug)

**Stato in Chat A**: Discoverability discussa estensivamente, ma "Make panel azioni vs categorie" NON era target.

| Bug | Mappa in Chat A | Stato |
|---|---|---|
| BUG-016 (Make categorie vs azioni) | parziale | Make hub con tabs (Geometria, Mesh, Carichi, Vincoli, Materiali, Sezioni) confermato come struttura. Ma "azioni dirette" vs "categorie" NON dibattuto. Bug nostro è più radicale |
| BUG-031 (Verify Live empty senza CTA) | parziale | Verify panel previsto S3 + ChecksDetailTable. Empty state specifico no |
| BUG-032 (bottoni senza precondizioni) | NUOVO | Pattern non discusso |
| BUG-039 (info modello duplicata) | NUOVO | Non discusso |
| BUG-045 (info modello formati inconsistenti) | NUOVO | Non discusso |

**Verdetto Cluster E**: parziale. Discoverability "ogni feature path UI in N tap" è ben coperta come obiettivo, ma il bug "categorie vs azioni" è un livello sotto, non risolto.

### CLUSTER F · Precondizioni + empty state (5 bug)

**Stato in Chat A**: NESSUNA discussione su pattern precondizioni.

| Bug | Stato |
|---|---|
| BUG-027 (toggle disabilitati senza CTA) | NUOVO |
| BUG-028 (Legacy STABILE) | NUOVO |
| BUG-031 (Verify Live empty) | NUOVO |
| BUG-061 (empty state nuovo modello system-centric) | NUOVO |
| BUG-062 (priorità CTA invertita) | NUOVO |

**Verdetto Cluster F**: cluster INTERAMENTE nuovo. Pattern "prevent error" vs "explain error" non discusso in Chat A.

### CLUSTER G · Convenzioni viewport 3D (6 bug)

**Stato in Chat A**: BUG-V4 affrontato (label vista corrente), il resto NUOVO.

| Bug | Mappa in Chat A | Stato |
|---|---|---|
| BUG-035 (tasto destro pan vs context menu) | NUOVO | Non discusso |
| BUG-036 (context menu regression) | NUOVO | Non discusso |
| BUG-037 (shortcut mouse non documentate) | NUOVO | Non discusso |
| BUG-043 (scala viewport non aggiorna zoom) | NUOVO | Non discusso |
| BUG-044 (carichi/vincoli sovradimensionati) | NUOVO | Non discusso |
| BUG-048 (gizmo XYZ alto-destra) | parziale | "Label sopra gizmo" prevista, ma riposizionamento gizmo NO |
| BUG-049 (modello non centrato all'apertura) | NUOVO | Non discusso |

**Verdetto Cluster G**: 1/6 affrontato parzialmente (BUG-V4 nel S2/S3). 5/6 nuovi.

### CLUSTER H · Command palette + ricerca (7 bug)

**Stato in Chat A**: Palette espansa pianificata a ≥160 voci, ma struttura "182 in 1 categoria" NON discussa come bug.

| Bug | Mappa in Chat A | Stato |
|---|---|---|
| BUG-051 (182 comandi 1 categoria) | parziale | Palette ≥120-160 voci pianificata in S6, ma raggruppamento categorie esplicito NO |
| BUG-052 (tipografia palette console-like) | NUOVO | Non discusso |
| BUG-053 (sintassi n42 e17 criptica) | parziale | Asserzione "vai a nodo N5" prevista ma placeholder esplicito NO |
| BUG-054 (gergo developer) | NUOVO | Coperto da decisione i18n generale |
| BUG-055 (voci palette duplicate) | NUOVO | Non discusso |
| BUG-056 (overlay assente) | NUOVO | Non discusso |
| BUG-057 (scorciatoie su mobile) | NUOVO | Non discusso |
| BUG-059 (cerca duplicata sidebar+topbar) | NUOVO | Non discusso |

**Verdetto Cluster H**: 2/8 parzialmente coperti, 6/8 nuovi.

---

## 3 · BUG NUOVI (non in Chat A) — RICHIEDONO PIANIFICAZIONE

Recuperando il cross-reference, **~44 dei 64 bug sono NUOVI rispetto a Chat A**.

I 44 bug nuovi si raggruppano in 4 meta-pattern emersi solo nell'audit di stasera:

### Meta-pattern 1 · Error handling tecnico
- Backend ritorna HTML invece di JSON (BUG-012)
- Frontend mostra "Unexpected token JSON" (BUG-011, 047)
- Banner errori senza max-width o dismiss (BUG-046)
- Errori senza contesto operativo (BUG-013)

**Era invisibile in Chat A** perché non avevano fatto user testing strutturato. Emerso ieri sera con screenshot Federico.

### Meta-pattern 2 · State management generale pannelli
- Click nodo apre Inspect+NodeDetail sovrapposti (BUG-014)
- Apri Make non chiude Solve (BUG-064)
- Pattern sistemico: nessuna state machine centrale

**Parzialmente coperto da `selectionStore` previsto in S5**, ma la state machine "pannelli mutuamente esclusivi" è un livello sopra che non era stato deciso.

### Meta-pattern 3 · Precondizioni e empty state
- Bottoni accessibili anche senza precondizioni (BUG-032)
- Empty state senza CTA azionabile (BUG-031)
- Toggle grigi senza spiegazione (BUG-027)
- Empty state linguaggio system-centric (BUG-061)

**Pattern "prevent error" vs "explain error" non discusso in Chat A**.

### Meta-pattern 4 · i18n completo
~10 bug di gergo developer e termini inglesi sparsi.

**Decisione "italiano predominante" presa, ma audit massivo non fatto**.

---

## 4 · COSA È STATO IMPLEMENTATO REALMENTE

Da quello che vedo nelle chat:

### Implementato ✓
- **S1 · v2.5.0-pr1-tokens-atoms** (Chat A pomeriggio + screenshot live)
  - `index.css` sostituito destructive con `tokens.css`
  - Inter Tight caricato
  - 5 atoms ridisegnati (Button, Badge, Input, IconButton, Toggle)
  - 6 atoms già OK (Chip, Kbd, Spinner, Skeleton, Avatar, FormField)
  - Mergeato in `test` e `main`, deployato su fea-pro.fly.dev
  - Verifica live: dashboard A1 renderizzata con tokens Precision

### NON implementato ✗
- **S2** (chrome navigazionale + 4 BUG-V mobile)
- **S3** (5 screens core)
- **S4** (6 percorsi)
- **S5** (ElementInspector + diagrammi picchi) — questo è il cuore, chiude 4 P0 Paoletto
- **S6** (viewport 3D + palette)
- **S7** (mobile + E2E + polish + deploy v2.5.0)

### Conseguenza
**I 4 P0 Paoletto NON sono ancora stati chiusi** perché S5 (dove erano pianificati) non è mai partito.

---

## 5 · ARTEFATTI RECUPERABILI DA CHAT A

In Chat A esistono artefatti completi che possiamo riusare:

### 5.1 · Wireframe ElementInspector (testuale + JSX)

```
┌─────────────────────────────────────────────────────┐
│  ◀  Elemento B1 · BEAM2D                  [×]       │
├─────────────────────────────────────────────────────┤
│  GEOMETRIA                                           │
│    Nodo i = N1 (0.00, 0.00, 0.00)                    │
│    Nodo j = N3 (4.25, 0.00, 3.50)                    │
│    Lunghezza = 5.503 m                               │
│                                                      │
│  MATERIALE [steel_s355]                              │
│    E = 210 GPa · fy = 355 MPa · ν = 0.3              │
│                                                      │
│  SEZIONE [IPE 300]                                   │
│    A = 5380 mm² · Iy = 8356 cm⁴                      │
│    Wpl,y = 628 cm³ · Wpl,z = 125 cm³                 │
│                                                      │
│  SOLLECITAZIONI                                      │
│    M_max  =  12.45 kNm  @ x = 2.25 m                 │
│    M_min  =  -3.20 kNm  @ x = 5.50 m                 │
│    V_max  =  18.30 kN   @ x = 0.00 m                 │
│    N_max  =  -45.20 kN  (compressione, costante)     │
│                                                      │
│  VERIFICHE EC3                              UC max   │
│    Flessione My                              0.42    │
│    Taglio Vz                                 0.18    │
│    Instabilità laterale (LTB)                0.71    │
│    INTERAZIONE TOTALE                        0.88    │
└─────────────────────────────────────────────────────┘
```

**Riusabile per**: BUG-014, BUG-015 (cluster C), Paoletto P0 #1, #2, #3, #4.

### 5.2 · Pattern SVG diagrammi N/V/M etichettati

```tsx
<g fontFamily="JetBrains Mono" fontSize="11" fontWeight="600"
   fill={ur > 0.9 ? "var(--danger)" : "var(--ink)"}>
  <text x={peakX} y={peakY - 14} textAnchor="middle">
    M<tspan baselineShift="sub" fontSize="9">max</tspan> = {Mmax.toFixed(2)} kNm
  </text>
  <text x={peakX} y={peakY} fontSize="9" fill="var(--ink-dim)" textAnchor="middle">
    @ x = {positionX.toFixed(2)} m ({positionLabel})
  </text>
</g>
```

**Riusabile per**: Paoletto P0 #2 (diagrammi senza valori picco).

### 5.3 · Schema fields backend ElementResults

```python
element.id: str
element.length: float
element.nodeI.x, .y, .z
element.material.E, .fy, .nu, .rho, .G, .alphaT
element.section.A, .J, .Iy, .Iz, .Wply, .Wplz
element.internalForces.N.max.value, .position_x, .at_node
element.internalForces.Mz.max.value, .position_x, .position_label
element.checks.EC3_6_2.ur
element.checks.EC3_6_3_3.ur  # LTB
element.checks.EC3_6_2_6.ur  # taglio
```

**Riusabile per**: brief backend extension se serve.

### 5.4 · Quality gate strutturati (6 gate)

1. **Gate 1 · Visivo**: PNG live vs mockup, almeno 8 spunti per sprint
2. **Gate 2 · Backend**: pytest 1675 PASS invariato
3. **Gate 3 · Discoverability E2E**: asserzioni cumulative (25-30 entro S7)
4. **Gate 4 · Overlap**: nessuna sovrapposizione UI
5. **Gate 5 · Routing**: ogni button testato
6. **Gate 6 · Axe**: 0 violations critical

**Riusabile per**: setup quality automation Sprint 0 (vedi UX_AUDIT_AND_FIX_BRIEF §5).

### 5.5 · 25-30 asserzioni discoverability E2E (lista completa)

Lista già scritta in Chat A. Esempi:
- "Da A1 Dashboard, hub Studio Pro cliccabile → B1 workspace caricato in ≤2 tap"
- "Da B1, click su nodo → RightPanel Inspect mostra NodeDetail in ≤1 tap"
- "CommandPalette: cerca 'ipe 300' → trova 'Applica sezione IPE 300' entro 100ms"
- "Mobile: tap su elemento → MobileElementInspector full-screen"

**Riusabile per**: brief Playwright + quality automation (UX_AUDIT §5).

### 5.6 · Bundle handoff Precision (file fisici)

Esistono in `docs/redesign-precision/handoff/`:
- `tokens.css` (~700 righe, già usato in S1)
- `precision.css` (~180 classi semantiche)
- 17 schermate HTML (A1-A2, B1-B3, C1-C7, D1-D2, E1-E2)
- React-pack TSX (TopBar, HubCard, QuickAction, ProjectCard, ChecksRail, ChecksDetailTable, ModelsTable, InsightPanel, ElementInspector, ResultsView, ios-frame)
- `implementation.md`, `migration-risks.md`, `PROMPT_FOR_CLAUDE_CODE.md`

**Riusabile per**: TUTTI gli sprint S2-S7. Bundle completo già esiste, basta applicarlo.

---

## 6 · DECISIONI CHE QUESTA ANALISI ABILITA

### Decisione 1 · Riprendiamo il brief 7-sprint o ripartiamo?

**Opzione A · Riprendiamo il brief**
- Pro: 22 giorni di pianificazione già fatti, bundle handoff esistente, decisioni architetturali fissate
- Contro: i 44 bug NUOVI emersi nel nostro audit non sono nel brief, vanno integrati
- Tempo per integrare: 1-2 giorni di refactoring del brief

**Opzione B · Ripartiamo da zero con un piano nuovo**
- Pro: piano cucito sui 64 bug specifici
- Contro: butto via il lavoro di Chat A. Tempo: 3-5 giorni per scrivere brief equivalente
- Inoltre rischia di reinventare quello che esiste

**Opzione C · Ibrida: brief Chat A + estensione bug nuovi**
- Tengo i 7 sprint, ma aggiungo:
  - **Sprint -1 (Setup Quality Automation)** prima di tutto
  - **Estensione S2** per coprire BUG cluster B (error handling)
  - **Estensione S5** per coprire state machine pannelli generale
  - **Aggiunta Sprint 8 (i18n audit + dead code)** alla fine
- Tempo: 1 giorno integrazione

**Raccomandazione**: **Opzione C**. Salva il lavoro fatto, integra i bug nuovi, aggiunge le quality gate.

### Decisione 2 · S5 ElementInspector ha priorità?

In Chat A è **lo sprint critico** che chiude i 4 P0 Paoletto. Però richiede ~4-5 giorni.

**Opzione A · Anticipiamo S5 dopo S1**
- Skip S2-S4 temporaneamente, vai diretto al cuore
- Pro: chiude in 4-5 giorni il vero blocco utente (P0 Paoletto)
- Contro: S5 richiede chrome (S2) + screens (S3), salta logica

**Opzione B · Rispettiamo sequenza S2 → S3 → S4 → S5**
- ~14 giorni prima di chiudere P0 Paoletto
- Pro: ordine sensato (chrome prima, contenuti dopo)
- Contro: Paoletto aspetta 2-3 settimane

**Opzione C · Parallelizziamo dove possibile**
- S2 (chrome) e S5-step-1 (wireframe + schema) in parallelo
- Poi S2-merge prima di S5-code

**Raccomandazione**: **Opzione A** modificata. Una versione "fast track":
1. Setup Quality Automation (1 sett)
2. S5 ElementInspector standalone (può convivere con chrome attuale)
3. Chrome S2 dopo

Così Paoletto vede risultato concreto in 2 settimane. Le P0 sue sono i diagrammi etichettati e click nodo, NON la topbar.

### Decisione 3 · Pattern state machine pannelli

In Chat A solo `selectionStore` previsto (node/element). NON c'è state machine generale "Make XOR Solve XOR Verify XOR Inspect".

**Da decidere prima di S5**:
- Tab system (1 solo pannello primario visibile)
- Side-by-side (max 2: sinistro Make/View, destro Inspect/Solve)
- Drawer stack (1 sopra l'altro con breadcrumb back)

**Raccomandazione**: **Tab system**. Più semplice, prevedibile per Paoletto, evita BUG-014/BUG-064.

### Decisione 4 · Error handling globale

Cluster B (5 bug) interamente nuovo. Richiede:
- Backend: exception handler FastAPI globale → JSON
- Frontend: APIError class + ErrorBoundary + i18n traduzione
- Toast: max-width, dismiss, autoclose

**Va aggiunto come Sprint -1 o Sprint 0**, prima di S2.

### Decisione 5 · Precondizioni feature

Cluster F (5 bug) interamente nuovo. Richiede:
- `preconditions.ts` registry centralizzato
- `<FeatureButton featureId="verify-live">` component con disabled+tooltip+CTA

**Va aggiunto come parte di Sprint S3/S4** dove i bottoni feature entrano.

---

## 7 · PIANO RIVISTO (Opzione C)

Sintesi dei 5 sprint aggiuntivi rispetto al brief originale:

### Sprint -1 · Quality Automation Setup (5 giorni)

Playwright + axe + Lighthouse + visual regression + Computer Use orchestra.

Output: ogni deploy ha test oggettivi. Sblocca tutto il resto.

(Dettagli in UX_AUDIT_AND_FIX_BRIEF §5)

### Sprint 0 · Error Handling Foundation (3 giorni)

Backend FastAPI exception handler globale + frontend APIError + ErrorBoundary + Toast component.

Chiude cluster B (5 bug).

### Sprint S2 · Chrome + 4 BUG-V (4 giorni, come Chat A)

Più estensione: integrare cluster A bug NUOVI (BUG-023/024/025/026 pannello View).

### Sprint S3 · Screens core + Make-azioni (3 + 2 giorni)

Originale Chat A + addendum:
- Riscrittura Make panel come azioni dirette (BUG-016)
- Centralizzazione `<ModelStatsBadge>` (BUG-039, 045)
- preconditions.ts registry inizio (BUG-032)

### Sprint S4 · Percorsi C2-C7 (2.5 giorni, come Chat A)

Originale.

### Sprint S5 · ElementInspector + State Machine (5 + 1 giorni)

Originale Chat A + addendum:
- Implementazione state machine pannelli (tab system) - BUG-014, BUG-064
- Empty states standardizzati (BUG-031, 058, 061, 062)

### Sprint S6 · Viewport 3D + Convenzioni (3.5 + 2 giorni)

Originale Chat A + addendum:
- Context menu su tasto destro (BUG-035)
- Scala dinamica con zoom (BUG-043)
- Gizmo bottom-right (BUG-048)
- Auto-fit camera (BUG-049)
- Shortcut mouse documentate (BUG-037)

### Sprint S7 · Mobile + E2E + Polish (4 giorni, come Chat A)

Originale.

### Sprint S8 · i18n + Polish Final (2 giorni)

Nuovo:
- Audit massivo termini inglesi residui (BUG-018, 029, 054)
- Traduzione completa
- Bug rimanenti P2

**Totale rivisto: 33 giorni Claude Code** (era 22 in Chat A, +11 per cluster B+F+G+i18n).

Calendario realistico: 7-9 settimane a 1 sprint/settimana, o 5 settimane back-to-back.

---

## 8 · CONCLUSIONE

### Cosa è stato fatto

Esiste un **brief 7-sprint completo dettagliato** (Chat A). Solo S1 è stato implementato (PR1 mergeato, deployato).

### Cosa è stato "perso"

Tra fine S1 e ieri sera (audit), il lavoro si è interrotto. Non è chiaro perché — forse Federico stanco, forse Paoletto ha dato feedback negativo prima del previsto, forse focus deviato altrove.

Il brief è ancora **valido**. Bundle handoff esiste. Wireframe esistono. Quality gate definiti.

### Cosa scopre questo audit

L'audit di stasera (64 bug) ha trovato **44 bug nuovi** che il brief Chat A non aveva visto, perché:
1. Error handling non era stato testato (cluster B)
2. State machine generale pannelli non discussa (cluster C parziale)
3. Precondizioni feature non concettualizzate (cluster F)
4. i18n non audited (cluster D)

### Cosa fare

Riprendere il brief Chat A, integrare i 44 bug nuovi nei sprint giusti, aggiungere 2 sprint nuovi (Quality Automation + Error Handling Foundation + i18n), procedere con un calendario 7-9 settimane.

**Non ripartire da zero**. Salvare quello che è già fatto.

### Una nota di metodo

La perdita di lavoro tra Chat A e oggi è esattamente il problema sistemico che dicevamo:
- Conoscenza distribuita in chat che non si parlano
- Niente file project authoritativo aggiornato
- Niente quality automation che mantiene il progresso

Quello che stai facendo adesso (caricare i 2 file nel project, fare cross-reference fra chat, costruire piano operativo) **è la prima volta che si lavora con disciplina di processo**. Non sprecarla.

---

## APPENDICE · Stato FEA 2 al momento di questa scrittura

Chat FEA 2 verificata via `conversation_search`. Stato (25/05 04:27):

- **Aperta correttamente** nel project FEA Pro
- **Allineata**: Claude lì dentro ha letto PROJECT_STATE, FEA_PRO_CAPABILITY_MAP, UX_AUDIT_AND_FIX_BRIEF
- **Ruolo accettato**: AUDITOR ARCHITETTURALE, analisi statica chirurgica per cluster (C → B → F → E → G → D → A → H), output `ARCHITECTURE_AUDIT_2026_05_25.md`
- **Repo caricata**: zip `fea-pro-v2_5_0-pr1-tokens-atoms-c32005e.zip`
  - SHA `c32005e` post-merge S1
  - Coerente con quanto risulta da PROJECT_STATE
- **In attesa**: conferma che lo zip sia la repo target dell'audit. Una volta confermato, parte dal Cluster C (state management) come da priorità del prompt

**Cosa Federico deve fare in FEA 2**: rispondere "sì, è la repo target, parti con Cluster C", poi monitorare le query mirate file-per-file. Tempo stimato audit: 2-4 ore di scambio.

**Quando FEA 2 finisce**: lui consegna `ARCHITECTURE_AUDIT_2026_05_25.md` con root cause + file:linea per ogni cluster + bug nuovi architetturali. Quel documento entra nel project knowledge come quarto pilastro accanto a:
1. `UX_AUDIT_AND_FIX_BRIEF.md` (64 bug observed)
2. `FEA_PRO_CAPABILITY_MAP.md` (capacità onesta)
3. `DESIGN_DECISIONS_HISTORY.md` (questo file)
4. `ARCHITECTURE_AUDIT_2026_05_25.md` (in arrivo da FEA 2)

A quel punto avremo la **visione completa**: cosa l'app fa + cosa è rotto + cosa è già stato pensato + dove sta nel codice. Da lì il piano operativo finale è ovvio.

---

**Documento generato**: 2026-05-25
**Origine**: query strategiche su chat "Greeting in Italian" (brief 7-sprint v2.5.0-redesign-precision) + chat FEA 2 (audit architetturale in starting block) + UX_AUDIT corrente
**Da rivedere**: dopo audit FEA 2 chiuso + audit Claude Code CLI massivo
**Versione**: 1.0
