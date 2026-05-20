# FEA Pro · Specifica UI/UX Redesign v2

> **Obiettivo**: ridisegnare da zero l'interfaccia di FEA Pro per rendere accessibile
> all'utente finale il 100% delle ~45 funzionalità del backend v1.0.0, con un'esperienza
> moderna, responsive e didattica. Documento self-contained: chiunque parta da qui
> può eseguire la roadmap senza altre dipendenze informative.

**Audience**: developer frontend (React/TS), designer UI, prodotto.
**Versione documento**: v2.0 · **Data**: 2026-05-19 · **Stato**: spec di partenza.

---

## 0 · Indice

1. [Audit del gap attuale](#1-audit-del-gap-attuale)
2. [Principi di design](#2-principi-di-design)
3. [Information architecture](#3-information-architecture)
4. [Layout & responsive](#4-layout--responsive)
5. [Catalogo delle aree (workspace)](#5-catalogo-delle-aree-workspace)
6. [Sistema di documentazione contestuale](#6-sistema-di-documentazione-contestuale)
7. [Component library di riferimento](#7-component-library-di-riferimento)
8. [Mapping completo feature → UI surface](#8-mapping-completo-feature--ui-surface)
9. [Roadmap implementativa](#9-roadmap-implementativa)
10. [Glossario](#10-glossario)

---

## 1 · Audit del gap attuale

Il backend v1.0.0 espone **62 route REST + 2 WebSocket**. L'attuale UI ne usa **~25** (≈55%).
Le funzioni mancanti sono raggruppabili in 6 famiglie:

| Famiglia | Funzioni inaccessibili da UI | Endpoint principali |
|---|---|---|
| 🤖 **AI** | Copilot Q&A sul modello | `POST /api/ai/ask` |
| 🤝 **Collab** | Editing real-time multi-utente (Lamport, CRDT-like) | `WS /ws/collab/{id}` |
| 🔍 **Diagnostics** | Auto-detection problemi modello (5 detector) | `GET /api/models/{id}/auto-detect` |
| 🔀 **Compare** | Diff strutturale + risultati A vs B | `POST /api/models/compare` |
| 📐 **Mesh parametrica** | L/T/cerchio/anello (FASE 11) | `POST /api/models/{id}/mesh/parametric` |
| 📥📤 **I/O server** | DXF in/out, IFC4 in/out, XLSX, PDF reportlab, accelerogrammi PEER/ESM + sintetici | `/api/io/**` |
| 🏛️ **Verifiche** | EC2 (CA), EC5 (legno), EC8 (sismica) — solo EC3 esposto | (mancano endpoint dedicati) |
| ⚙️ **Solver avanzati** | Push-over, sismica multi-comp + drift, Rainflow/Miner | `POST /api/analysis/...` parziale |
| 🎨 **Postprocess** | Iso-linee, slice planes, mode superposition, convergence, ZZ error | (solo libreria core) |
| 🌍 **Schema editor** | `Element.winkler_k`, `Constraint.compression_only` | (CRUD esistente non li espone) |

**Conseguenza**: l'utente medio vede ~50% del valore della piattaforma. L'UI nuova deve esporre il 100% **senza diventare un cruscotto da centrale nucleare**.

---

## 2 · Principi di design

### 2.1 — Progressive disclosure
Niente "1000 bottoni in cima". Tre livelli:
1. **Livello 1 (sempre visibile)**: viewport 3D + barra superiore con 5 azioni primarie (Nuovo, Apri, Mesh, Analisi, Verifica).
2. **Livello 2 (tab/sezioni)**: pannelli laterali a workspace tematico (vedi §5).
3. **Livello 3 (dialog modali)**: editor approfonditi, wizard, configurazioni.

### 2.2 — Workspace tematici (no "tutto tutto insieme")
Invece di una sidebar monolitica, **5 workspace** che cambiano la layout del pannello destro:
- 🏗️ **Modello** (geometria + carichi + vincoli)
- ⚙️ **Analisi** (run + parametri + monitor)
- 📊 **Risultati** (visualizzazione + diagrammi + postprocess)
- ✅ **Verifiche** (EC2/3/5/8, fatica, convergenza)
- 🔄 **I/O & Collab** (import/export, AI, multi-utente)

L'utente cambia workspace dal **rail verticale a sinistra**; il viewport 3D resta sempre il protagonista al centro.

### 2.3 — Mobile-readable, touch-aware
La UI gira primariamente su desktop (≥1280 px) ma è leggibile e usabile fino a tablet (≥768 px). Sotto, viene mostrata una landing "FEA Pro funziona meglio su schermi più grandi" con link a Docs.

### 2.4 — Spiegare ciò che si fa
Ogni panel ha un **header con titolo + descrizione contestuale + link "?"** che apre un overlay con:
- "Cosa fa questa sezione"
- "Quando la uso"
- "Riferimenti normativi/tecnici"
- "Esempi tipici"

### 2.5 — Coerenza estetica (design tokens)
Stessi token attraverso tutta la app:
```ts
// design-tokens.ts
export const tokens = {
  color: {
    bg:          '#0F1115',    // sfondo app
    bgPanel:     '#171A21',    // pannelli
    bgElevated:  '#1F232C',    // dialog/dropdown
    border:      '#262B36',
    ink:         '#E6E8EE',
    inkMuted:    '#9AA0AB',
    accent:      '#3DA9FC',    // azioni primarie
    success:     '#22C55E',
    warn:        '#F59E0B',
    danger:      '#EF4444',
    chart:       ['#3DA9FC','#A78BFA','#22C55E','#F59E0B','#EF4444','#06B6D4'],
  },
  radius:      { sm: 6, md: 10, lg: 14, full: 9999 },
  shadow:      { panel: '0 6px 24px -8px rgba(0,0,0,.55)' },
  font:        { ui: 'Inter, system-ui, sans-serif',
                 mono: 'JetBrains Mono, ui-monospace, monospace' },
  duration:    { fast: 120, mid: 220, slow: 360 },
  zIndex:      { viewport: 0, panel: 10, toolbar: 20,
                 dropdown: 30, dialog: 40, toast: 50 },
};
```
Dark-mode è default (settore CAE è sempre dark). Light-mode è opzionale ma deve essere fornito per accessibilità.

### 2.6 — Accessibilità minima (WCAG AA)
- Contrasti ≥ 4.5:1 per testo, 3:1 per icone
- Tutti i bottoni hanno `aria-label` esplicito
- Focus visibile (outline accent, 2 px)
- Keyboard nav completa (Tab, Esc, frecce sui menu)
- Toggle "reduce motion" che disabilita animazioni > 220 ms

---

## 3 · Information architecture

```
┌────────────────────────────────────────────────────────────────────┐
│ TOP BAR (sempre visibile, 48 px)                                   │
│ [FEA Pro] [Modello ▾] [+ Nuovo] [⎘ Dup] [✎] [▶ Esegui] [User ⓘ ⚙] │
├──┬─────────────────────────────────────────────────────────────────┤
│R │                                                                 │
│A │                                                                 │
│I │                                                                 │
│L │           VIEWPORT 3D (Three.js, sempre centrale)               │
│  │                                                                 │
│🏗│                                                                 │
│⚙ │                                                                 │
│📊│                                                                 │
│✅│                                                                 │
│🔄│                                                                 │
│  ├─────────────────────────────────────────────────────────────────┤
│  │ STATUS BAR (24 px): unità · zoom · stato analisi · collab badge │
└──┴─────────────────────────────────────────────────────────────────┘
                                              ▲
                                              │
              PANNELLO DESTRO (380 px, scrollabile)
              cambia contenuto in base al workspace
```

### Top bar
- Logo + selettore modello attivo (dropdown con search)
- Azioni primarie: **+ Nuovo** · **⎘ Duplica** · **✎ Modifica** · **▶ Esegui ultima analisi** (default static)
- A destra: avatar utente · stato collaborazione · **?** (help) · **⚙** (settings)

### Rail sinistro (icone 48×48, tooltip al hover)
- 🏗️ Modello — geometria, carichi, vincoli, materiali
- ⚙️ Analisi — selezione tipo, parametri, run
- 📊 Risultati — viewer deformata/stress, diagrammi, postprocess
- ✅ Verifiche — EC2/3/5/8, fatica, convergenza
- 🔄 I/O & Collab — import/export, AI, collaborazione
- ──────── (separator)
- ⓘ Docs — apre overlay con guida embedded
- 🐛 Debug — apre auto-detection (sostituisce il vecchio "Validation")

### Pannello destro
Contenuto contestuale al workspace selezionato. Vedi §5 per il dettaglio.

---

## 4 · Layout & responsive

| Breakpoint | Layout |
|---|---|
| ≥ 1440 px | Layout completo: rail 48 · viewport flex · pannello destro 420 px |
| 1280–1440 px | Pannello destro 360 px |
| 1024–1280 px | Pannello destro 320 px, rail collassabile a 40 px |
| 768–1024 px | Pannello destro overlay a comparsa (click sull'icona rail) sopra il viewport. Topbar collassa azioni secondarie in un menu "⋯" |
| < 768 px | Schermata "**FEA Pro è pensato per desktop**" con link a "Vista demo solo lettura" e download Python client per CLI |

### Touch support
- Three.js controls aware del touch (`OrbitControls` con `touches: { ONE: ROTATE, TWO: PAN }`)
- Tap su elemento = selezione; long-press = menu contestuale; pinch = zoom
- Tutti i bottoni rail ≥ 44×44 px (target Apple HIG)

---

## 5 · Catalogo delle aree (workspace)

Ogni workspace ha **una colonna a tab** nel pannello destro. Tab solo 2-4 per workspace, mai di più.

### 5.1 — 🏗️ Workspace MODELLO

Header: **"Costruisci la struttura"** · descrizione · **?** apre overlay esplicativo.

| Tab | Contenuto |
|---|---|
| **Albero** | TreeView: Nodi · Elementi · Carichi · Vincoli. Click su voce → seleziona in viewport. Pulsante "+" contestuale ad ogni gruppo. |
| **Mesh** | Wizard mesh:<br>• **Lineare** (line + n_div, default beam2d/beam3d/truss)<br>• **Quadrilatera** (4 corners + nx/ny, default shell_q4)<br>• **Triangolare** (4 corners + nx/ny, default tri3)<br>• **Box solida** (origin + sizes + nx/ny/nz, default solid_h8)<br>• **🆕 Parametrica**: L, T, cerchio, anello — slider per geometria e mesh size |
| **Sezioni & Materiali** | Browser libreria (16 profili IPE/HEA/HEB + 17 materiali Acciaio/Cls/Legno) + editor custom con calcolo A, Iy, Iz, J, Wpl in tempo reale. |
| **Schema avanzato** | 🆕 Pannello per opzioni che ora richiedono JSON editing:<br>• `Element.winkler_k` → checkbox + slider "Beam su suolo elastico"<br>• `Element.releases` → toggle release momento fine/inizio<br>• `Constraint.compression_only` → checkbox "Solo compressione" su molla<br>• `Constraint.spring_k` → slider rigidezza |

**Dialog associati**:
- `NodeDialog` (esistente)
- `ElementDialog` (esistente, da estendere con winkler_k e releases)
- `LoadDialog` (esistente, da estendere con accelerogram picker — vedi 5.5)
- `ConstraintDialog` (esistente, da estendere con compression_only e spring_k)
- `MeshWizardDialog` (esistente, da estendere con tab "Parametrica")

### 5.2 — ⚙️ Workspace ANALISI

Header: **"Scegli e lancia l'analisi"** · spiega quando usare ogni tipo.

| Tab | Contenuto |
|---|---|
| **Lineari** | Card cliccabili (radio-card) per:<br>• Statica<br>• Modale (con input n_modes)<br>• Dinamica Newmark (con dt, t_end, β, γ, store_nodes)<br>• Buckling (n_modes critici)<br>• Response Spectrum (modale + spettro + SRSS/CQC)<br>+ **Damping wizard**: input f₁, f₂, ξ → calcola Rayleigh α, β automatico |
| **Non lineari** | 🆕 Card per:<br>• **Push-over** (λ-incrementale, λ_max, n_step, tracking cerniere)<br>• Time-history sismica multi-componente (carica accelerogrammi X/Y/Z, post-process drift) |
| **Avanzato** | 🆕 Card per:<br>• **Fatica** (Rainflow + S-N curve + Miner) con dropdown categoria EC3-1-9 (36-160) |
| **Monitor** | Durante un run: progress bar via `ws/analysis/{id}`, log streaming, tasto "Annulla" se solver supporta. |

Sotto le tab, **bottone "▶ Esegui"** sticky in fondo al pannello con preview parametri.

### 5.3 — 📊 Workspace RISULTATI

Mostra solo se il modello ha risultati salvati. Altrimenti CTA: "Esegui un'analisi prima".

| Tab | Contenuto |
|---|---|
| **Viewport** | Toggle: Deformata · Stress σ₁/σ₂ · Stress von Mises · N/V/M diagrams · Forme modali (con slider modo + animazione) · 🆕 **Modi sovrapposti** (slider per ogni modo, somma in real-time). Slider deformation scale. Colormap legend. |
| **Diagrammi** | • Curva λ-δ (push-over) <br>• Spettro FFT del nodo selezionato <br>• Response spectrum Sd/Sv/Sa <br>• Time-history u(t)/v(t)/a(t) <br>• Curva capacità con cerniere plastiche evidenziate |
| **Postprocess** | 🆕 Tools avanzati:<br>• **Iso-linee 2D** (marching triangles, slider valore iso)<br>• **Slice plane 3D** (definisci piano per normale + offset → mostra sezione)<br>• **Drift sismico** (per modello multi-piano: tabella drift % per piano + ratio)<br>• **Fatica risultati** (tabella cicli + danno cumulativo per nodo) |
| **Qualità** | 🆕 Analisi posteriore:<br>• **Convergenza h-refinement** (genera 3 mesh refinate, runa, calcola GCI Roache + ordine convergenza Richardson)<br>• **ZZ error estimator** (mostra mappa errore stimato → suggerisce dove rifinire) |

### 5.4 — ✅ Workspace VERIFICHE

Header: **"Verifiche normative"** · descrizione: "Confronto domanda vs resistenza secondo EN 1993/1992/1995/1998 + NTC 2018."

| Tab | Contenuto |
|---|---|
| **EC3 acciaio** | Esistente. Mostra tabella elementi con UR_max, governing (resistance/buckling/LTB/serviceability), color-coded. Click su riga → dettaglio (N_Ed, M_Ed, V_Ed, N_Rd, M_b_Rd, ecc.). Input γ_M0, γ_M1, categoria SLS. |
| **EC2 CA** | 🆕 Verifica flessione + taglio sezione rettangolare. Input: b, h, d, As, As', staffe, fck, fyk. Output: M_Rd, V_Rd,c, V_Rd,s, V_Rd,max, UR. Riferimenti §6.1, §6.2. |
| **EC5 legno** | 🆕 Verifica trazione/compressione/flessione/taglio con k_mod (servizio + durata carico). Input: classe servizio 1/2/3, durata permanente/breve/istantanea, materiale C24/GL24h. |
| **EC8 sismica** | 🆕 Spettri elastici 4-rami con T_B, T_C, T_D, fattore di struttura q, combinazioni sismiche, mappa zone IT. Input: a_g, suolo (A-E), classe importanza, smorzamento. Plot spettro Sd(T). |
| **NTC 2018** | 🆕 Generatore combinazioni SLU/SLE da uno schema azioni. Tabelle γ/ψ esposte. Envelope sollecitazioni risultanti. |

### 5.5 — 🔄 Workspace I/O & COLLAB

Workspace centralizzato per tutto ciò che è non-strutturale.

| Tab | Contenuto |
|---|---|
| **Import** | 🆕 Drag&drop area che accetta:<br>• `.json` (modello FEA Pro) <br>• `.dxf` (CAD) — wizard mapping layer→materiale<br>• `.ifc` (BIM) — preview entità prima dell'import<br>Bottone "Genera DXF d'esempio" per testare. |
| **Export** | 🆕 Pulsanti per ogni formato server-side:<br>• 📑 **PDF report** reportlab (7 sezioni, scelta include_static/include_modal)<br>• 📊 **Excel multi-sheet** openpyxl (5-8 sheet stilizzati)<br>• 📐 **DXF** con FEA_* layers strutturati<br>• 🏗️ **IFC4** con storey + axis<br>• 📄 **JSON / CSV** client-side (esistenti) |
| **Accelerogrammi** | 🆕 Browser catalogo: <br>• Lista file embedded (PEER NGA, ESM, CSV) con dt, npts, PGA <br>• Plot signal preview <br>• **Generatore sintetico**: Kanai-Tajimi (input ω_g, ξ_g, durata) + Boore white-noise con envelope Saragoni-Hart <br>• Bottone "Usa nel modello" → crea Load `ground_accel` con direzione X/Y/Z |
| **Compare A vs B** | 🆕 Dialog: scegli modello A + modello B → mostra:<br>• `ModelDiff`: nodes/elements/loads/constraints added/removed/modified (color-coded liste)<br>• `StaticResultsDiff`: Δu max, Δ%, ΔN, ΔM su tabella ordinabile<br>• Toggle "Highlight in viewport" che colora i diff sui modelli sovrapposti |
| **🤖 AI Copilot** | 🆕 Chat panel a destra. Domanda libera sul modello attivo. Backend serializza modello + risultati nel prompt. Provider scelto via env (Gemini / Mock). Cronologia messaggi locale. Esempi precaricati: "Quanti nodi ha il modello?", "Quale elemento ha l'UR_max?", "Suggerisci come ridurre il drift al piano 5". |
| **🤝 Collab** | 🆕 Badge "Stai modificando da solo" / "N utenti connessi". Cursore live degli altri utenti nel viewport (avatar colorato + nome). Lock automatico sull'entità in editing. Cronologia operazioni (Lamport-ordered). Toggle "Modalità solo lettura". |
| **🔍 Auto-detect** | 🆕 Spostato qui dal "Validation" attuale. Mostra 5 detector:<br>• `duplicate_elements`<br>• `coincident_nodes`<br>• `orphan_loads`<br>• `missing_section`<br>• `winkler_jump` (variazione rigidezza terreno > 100x)<br>Ogni issue ha bottone "Fix automatico" (es. unisci nodi, rimuovi carico orfano). |

---

## 6 · Sistema di documentazione contestuale

L'UI nuova è **didattica**. Ogni schermo ha:

### 6.1 — Help overlay (`?` in alto a destra del pannello)
Apre un side-sheet di 480 px che spiega:
- **Cosa fa** questa funzionalità
- **Quando** usarla (esempi pratici)
- **Input richiesti** con range tipici
- **Cosa restituisce** (interpretazione output)
- **Riferimenti normativi/tecnici** (link a EN/NTC quando applicabile, paper, libri)
- **Esempi precaricati** ("Usa l'esempio della trave bi-appoggiata")

Contenuto in JSON/Markdown statico, non chiama backend (per offline):
```
frontend/src/docs/
├── help/
│   ├── workspace-modello.md
│   ├── mesh-parametric.md
│   ├── analysis-pushover.md
│   ├── verify-ec3.md
│   ├── postprocess-isolines.md
│   ├── compare-models.md
│   ├── ai-copilot.md
│   └── ...
```

### 6.2 — Tooltip inline
Ogni input numerico ha tooltip che spiega:
- L'unità di misura
- Il range tipico
- Il significato fisico

Esempio per `n_modes` (modale): _"Numero di modi propri da estrarre. Valori tipici 3-20. Per analisi sismica EC8 occorre garantire ≥85% di massa partecipante: aumenta se il check fallisce."_

### 6.3 — Onboarding tour (prima volta)
Al primo accesso (`localStorage.firstRun`):
- Tour guidato in 6 step con `react-joyride` o equivalente
- Step: 1) Apri esempio → 2) Esplora 3D → 3) Cambia workspace → 4) Lancia static → 5) Vedi risultati → 6) Esporta PDF
- Skippabile, riavviabile da menu "?".

### 6.4 — Empty states didattici
Nessun "no data here". Sempre call-to-action:
- Workspace Risultati senza analisi → "**Nessun risultato ancora.** Apri il workspace Analisi e premi ▶ Esegui."
- Tab AI senza chiave Gemini → "Provider AI in modalità mock. Configura `FEAPRO_AI_API_KEY` per usare Gemini reale. [Docs →]"

### 6.5 — Cheat sheet shortcut (`?` sulla tastiera)
Già esiste, da aggiornare con i nuovi shortcut:
- `1`-`5` → switch workspace (Modello, Analisi, Risultati, Verifiche, I/O)
- `F2` → AI Copilot
- `F3` → Auto-detect
- `Ctrl+K` → command palette (vedi §7.3)

---

## 7 · Component library di riferimento

### 7.1 — Stack tecnico
- **React 18** + **TypeScript** + **Vite** (immutati)
- **State**: Zustand (immutato), aggiunti store: `workspaceStore`, `collabStore`, `aiStore`, `pushoverStore`, `verifyStore`
- **Data**: TanStack Query (immutato)
- **Styling**: Tailwind CSS + CSS variables per design tokens
- **UI primitives**: **Radix UI** (`@radix-ui/react-*`) per Dialog, Dropdown, Tabs, Popover, Tooltip, accessibilità out-of-the-box
- **Icons**: **lucide-react** (consistent stroke, già modern)
- **Charts**: Recharts (immutato) per FFT / spettri / drift
- **3D**: Three.js + @react-three/fiber + @react-three/drei (immutati)
- **Form**: **react-hook-form** + **zod** per validation (nuovo — sostituisce gli stati locali sparsi)
- **Markdown help**: `react-markdown` + `remark-gfm`
- **Codice / formule**: `katex` per render formule normative inline (es. M_b,Rd formula in tooltip)
- **Tour**: `@reactour/tour` o `react-joyride`

### 7.2 — Component primitives da costruire una sola volta
```
src/components/ui/
├── Button.tsx           // variants: primary/secondary/ghost/danger; sizes: xs/sm/md
├── Input.tsx            // numero/testo/select con label, hint, error
├── NumericInput.tsx     // con unit + range + tooltip + step keyboard
├── Card.tsx             // contenitore base con header opzionale
├── Tabs.tsx             // wrapper Radix
├── Dialog.tsx           // wrapper Radix
├── Dropdown.tsx         // wrapper Radix
├── Tooltip.tsx          // wrapper Radix
├── Popover.tsx          // wrapper Radix
├── Toast.tsx            // sostituisce toast.tsx esistente
├── HelpSheet.tsx        // side-sheet con Markdown rendered
├── DataTable.tsx        // sortable + filtrable + paginated
├── EmptyState.tsx       // illustration + title + description + CTA
├── ProgressBar.tsx
├── Spinner.tsx
├── Badge.tsx            // status/severity badge
├── Toggle.tsx
├── Slider.tsx
└── ColorPicker.tsx      // per editor materiali, colormap
```

Tutti i component usano design tokens, hanno storybook (`*.stories.tsx`) per documentation.

### 7.3 — Command palette (Ctrl+K)
Tipo VSCode. Lista azioni fuzzy-searchable:
- "Mesh trave..." → apre MeshWizard
- "Esegui analisi modale" → setta type=modal + run
- "Verifica EC3" → switcha a Verifiche/EC3 + run
- "Esporta PDF" → trigger export
- "AI: quanti nodi?" → manda direttamente la query AI

Implementazione: `cmdk` library di pacocoursey.

---

## 8 · Mapping completo feature → UI surface

Tabella esaustiva. Una riga per ogni endpoint/feature backend. Status = stato atteso post-redesign.

| # | Feature | Backend | UI surface | Stato attuale | Stato target |
|---|---|---|---|---|---|
| 1 | List modelli | `GET /models/` | Topbar dropdown | ✅ | ✅ |
| 2 | Get modello | `GET /models/{id}` | Auto on select | ✅ | ✅ |
| 3 | Crea modello | `POST /models/` | NewModelDialog | ✅ | ✅ |
| 4 | Update modello | `PUT/PATCH /models/{id}` | EditModelDialog | ✅ (solo PUT) | ✅ |
| 5 | Delete modello | `DELETE /models/{id}` | Topbar menu | ❌ | ✅ (Modello menu) |
| 6 | Duplica modello | `POST /models/{id}/duplicate` | Topbar | ✅ | ✅ |
| 7 | Import JSON | `POST /models/import` | DropZone | ✅ | ✅ (→ I/O tab) |
| 8 | Validate | `GET /models/{id}/validate` | ValidationPanel | ✅ | ✅ (→ Auto-detect) |
| 9 | **Auto-detect** | `GET /models/{id}/auto-detect` | — | ❌ | 🆕 I/O → Auto-detect tab |
| 10 | Mesh line | `POST /models/{id}/mesh/line` | MeshWizard kind=line | ✅ | ✅ |
| 11 | Mesh shell | `POST /models/{id}/mesh/shell` | MeshWizard kind=shell | ✅ | ✅ |
| 12 | Mesh tri | `POST /models/{id}/mesh/tri` | MeshWizard kind=tri | ✅ | ✅ |
| 13 | Mesh box | `POST /models/{id}/mesh/box` | MeshWizard kind=box | ✅ | ✅ |
| 14 | **Mesh parametric** | `POST /models/{id}/mesh/parametric` | — | ❌ | 🆕 MeshWizard tab "Parametrica" |
| 15-26 | CRUD nodi/el/loads/constr | `*/nodes,elements,loads,constraints` | Dialog | ✅ | ✅ (estesi con winkler/comp-only) |
| 27 | **Compare models** | `POST /models/compare` | — | ❌ | 🆕 I/O → Compare tab |
| 28 | Static analysis | `POST /analysis/static/{id}` | Toolbar | ✅ | ✅ (→ Analisi/Lineari) |
| 29 | Modal | `POST /analysis/modal/{id}` | Toolbar | ✅ | ✅ |
| 30 | Dynamic Newmark | `POST /analysis/dynamic/{id}` | AnalysisSettings | ✅ | ✅ |
| 31 | Buckling | `POST /analysis/buckling/{id}` | BucklingPanel | ✅ | ✅ |
| 32 | Rayleigh damping | `POST /analysis/rayleigh` | AnalysisSettings | ✅ | ✅ (wizard inline) |
| 33 | FFT | `POST /analysis/fft/{id}` | FFTChart | ✅ | ✅ (→ Risultati/Diagrammi) |
| 34 | Response spectrum | `POST /analysis/response_spectrum/{id}` | ResponseSpectrumPanel | ✅ | ✅ |
| 35 | Get cached results | `GET /analysis/results/{id}/{type}` | Internal | ✅ | ✅ |
| 36 | **Push-over** | (TBD endpoint dedicato — solver esiste) | — | ❌ | 🆕 Analisi/Non-lineari card |
| 37 | **Seismic time-history multi-comp** | (parte di dynamic con ground_accel) | — | parz. | 🆕 Wizard dedicato con drift |
| 38 | List materiali | `GET /materials` | MaterialsLibrary | ✅ | ✅ |
| 39 | Add materiale | `POST /materials` | MaterialDialog | ✅ | ✅ |
| 40 | List sezioni | `GET /sections` | MaterialsLibrary | ✅ | ✅ |
| 41 | Add sezione | `POST /sections` | SectionDialog | ✅ | ✅ |
| 42 | Delete sezione | `DELETE /sections/{id}` | MaterialsLibrary | ✅ | ✅ |
| 43 | **Verifica EC3** | `POST /verify/ec3/{id}` | VerificationPanel | ✅ | ✅ (→ Verifiche/EC3) |
| 44 | **Verifica EC2** | (lib helper, da promuovere ad endpoint) | — | ❌ | 🆕 Verifiche/EC2 tab |
| 45 | **Verifica EC5** | (lib helper, da promuovere ad endpoint) | — | ❌ | 🆕 Verifiche/EC5 tab |
| 46 | **Verifica EC8** | (lib helper, da promuovere ad endpoint) | — | ❌ | 🆕 Verifiche/EC8 tab |
| 47 | **Combinazioni NTC 2018** | (lib helper) | — | ❌ | 🆕 Verifiche/NTC tab |
| 48 | **Fatica Rainflow** | (lib helper, da promuovere) | — | ❌ | 🆕 Analisi/Avanzato + Risultati/Postprocess |
| 49 | **Iso-linee 2D** | (lib helper) | — | ❌ | 🆕 Risultati/Postprocess |
| 50 | **Slice planes 3D** | (lib helper) | — | ❌ | 🆕 Risultati/Postprocess |
| 51 | **Mode superposition** | (lib helper) | — | ❌ | 🆕 Risultati/Viewport (slider multi-modo) |
| 52 | **Convergence + ZZ** | (lib helper) | — | ❌ | 🆕 Risultati/Qualità |
| 53 | **Import DXF** | `POST /io/import/dxf` | — | ❌ | 🆕 I/O/Import |
| 54 | **Import IFC** | `POST /io/import/ifc` | — | ❌ | 🆕 I/O/Import |
| 55 | **Export DXF server** | `GET /io/export/{id}/dxf` | — (esiste solo client) | ❌ | 🆕 I/O/Export |
| 56 | **Export IFC** | `GET /io/export/{id}/ifc` | — | ❌ | 🆕 I/O/Export |
| 57 | **Export XLSX** | `GET /io/export/{id}/xlsx` | — | ❌ | 🆕 I/O/Export |
| 58 | **Export PDF reportlab** | `GET /io/export/{id}/pdf` | — (esiste solo jsPDF client) | ❌ | 🆕 I/O/Export |
| 59 | **Accelerogrammi catalog** | `GET /io/accelerograms` | — | ❌ | 🆕 I/O/Accelerogrammi |
| 60 | **Accelerogramma download** | `GET /io/accelerograms/{file}` | — | ❌ | 🆕 I/O/Accelerogrammi (preview + use) |
| 61 | **Accelerogramma sintetico** | `POST /io/accelerograms/synthetic` | — | ❌ | 🆕 I/O/Accelerogrammi (generator) |
| 62 | **AI Copilot** | `POST /ai/ask` | — | ❌ | 🆕 I/O/AI tab + Ctrl+K |
| 63 | Progress WS | `WS /ws/analysis/{id}` | openProgressSocket | ✅ | ✅ |
| 64 | **Collab WS** | `WS /ws/collab/{id}` | — | ❌ | 🆕 I/O/Collab + viewport cursor overlay |

**Conta**:
- Esistenti da preservare/ristrutturare: **28**
- Nuove UI surface: **22**

---

## 9 · Roadmap implementativa

Fasi pensate per essere shippable indipendentemente. Ogni fase chiude un milestone visibile all'utente.

### M0 — Fondamenta (1-2 giorni)
- Aggiungere Radix UI, lucide, react-hook-form, zod, react-markdown, katex, cmdk
- Creare `src/design/tokens.ts` + Tailwind config con tokens
- Costruire `src/components/ui/*` (Button, Input, Card, Tabs, Dialog, ...)
- Estendere `client.ts` con TUTTE le 14+ route mancanti (anche se le UI non sono ancora pronte — i tipi sono utili)
- Aggiungere store `workspaceStore` per il routing tab/workspace
- Storybook setup
- **Deliverable**: design system + tipi pronti, app continua a funzionare come prima

### M1 — Nuovo guscio (1 giorno)
- Sostituire `App.tsx` con il layout a rail sinistro + workspace
- Migrare gli attuali pannelli (Tree, ValidationPanel, VerificationPanel, MaterialsLibrary, ResponseSpectrumPanel, BucklingPanel, FFTChart, SnapshotsPanel) nei nuovi workspace
- Topbar nuova + command palette Ctrl+K
- **Deliverable**: UI riorganizzata, zero feature nuove, zero regression

### M2 — Workspace MODELLO esteso (1 giorno)
- Tab "Parametrica" in MeshWizard (L, T, cerchio, anello)
- Schema editor: winkler_k, compression_only, spring_k, releases
- Estensione ElementDialog/ConstraintDialog
- **Deliverable**: gap del Modello chiuso

### M3 — Workspace ANALISI esteso (1 giorno)
- Card "Push-over" → wizard + curva λ-δ
- Card "Time-history sismica multi-comp" con picker accelerogrammi (placeholder che si completerà in M6)
- Card "Fatica Rainflow"
- **Deliverable**: tutti i solver back-end accessibili

### M4 — Workspace RISULTATI esteso (2 giorni)
- Tab Postprocess: iso-linee + slice planes + drift sismico + fatica
- Slider multi-modo per mode superposition nella viewport
- Tab Qualità: convergence h-refinement + ZZ error
- **Deliverable**: postprocess completo

### M5 — Workspace VERIFICHE esteso (2 giorni)
- Promuovere EC2/EC5/EC8 da lib a endpoint REST (lavoro backend +)
- Tab dedicati con UI dei rispettivi parametri normativi
- Spettro EC8 con plot interattivo
- Generator combinazioni NTC con envelope viewer
- **Deliverable**: 4 normative coperte invece di sola EC3

### M6 — Workspace I/O & COLLAB (2 giorni)
- Tab Import (DXF + IFC con wizard mapping)
- Tab Export (PDF/XLSX/DXF/IFC server-side)
- Tab Accelerogrammi (catalogo + preview + generatore sintetico)
- Tab Compare A vs B
- Tab Auto-detect (con fix automatici)
- Tab AI Copilot (chat panel)
- Tab Collab (cursor live + lock)
- **Deliverable**: 100% delle funzioni accessibili

### M7 — Documentazione contestuale (1 giorno)
- HelpSheet con Markdown per ogni workspace/funzionalità (~30 docs)
- Tooltip inline su ogni input numerico
- Onboarding tour 6 step
- Empty states didattici ovunque
- **Deliverable**: app self-explaining

### M8 — Responsive & polish (1 giorno)
- Test/fix breakpoints 1024/1280/1440
- Touch gestures viewport
- Reduce motion toggle
- Light mode
- A11y audit (axe-core CI gate)
- **Deliverable**: production-ready

**Totale stimato**: ~12 giorni-uomo. Ogni milestone è shippabile in produzione separatamente.

---

## 10 · Glossario

| Termine | Significato |
|---|---|
| **Workspace** | Una delle 5 aree tematiche del pannello destro (Modello/Analisi/Risultati/Verifiche/I/O+Collab) |
| **Rail** | Barra verticale sinistra con le icone dei workspace |
| **Topbar** | Barra orizzontale in alto, sempre visibile, con azioni globali |
| **Pannello destro** | Container che cambia in base al workspace selezionato |
| **Progressive disclosure** | Mostrare prima l'80% delle azioni comuni, nascondere il 20% avanzato dietro tab/dialog |
| **HelpSheet** | Side-sheet con Markdown che spiega cosa fa una sezione |
| **Command palette** | Modal Ctrl+K con search di tutte le azioni |
| **Empty state** | Schermata mostrata quando non ci sono dati, con CTA didattica |
| **CTA** | Call To Action — bottone primario che invita all'azione |
| **Auto-detect** | Sistema di rilevamento problemi automatici sul modello |
| **Schema editor** | UI per modificare campi del modello che oggi sono "JSON-only" |
| **Tokens** | Variabili di design (colori, spaziature, font) centralizzate |

---

## Appendice A · Esempi di mockup testuale

### Workspace MODELLO → Tab Mesh → kind=Parametrica
```
┌─ Mesh parametrica ──────────────────────── ? ┐
│  Genera una mesh 2D di una forma standard.   │
│                                              │
│  Forma:                                      │
│  [ Rettangolo ▾ ]                            │
│  ├─ L                                        │
│  ├─ T                                        │
│  ├─ Cerchio                                  │
│  └─ Anello                                   │
│                                              │
│  Parametri (cambiano in base alla forma):    │
│  ▸ b: [ 200 ] mm                             │
│  ▸ h: [ 300 ] mm                             │
│  ▸ tf: [  10 ] mm                            │
│  ▸ tw: [   8 ] mm                            │
│                                              │
│  Mesh size: ── ●─────────  20 mm             │
│  Tipo elemento: [ tri3 ▾ ]                   │
│                                              │
│  Materiale: [ steel_s355 ▾ ]                 │
│  Spessore (shell): [ 10 ] mm                 │
│                                              │
│              [ Anteprima ]  [ Genera ▶ ]     │
└──────────────────────────────────────────────┘
```

### Workspace I/O → Tab AI Copilot
```
┌─ AI Copilot ───────────────────────────── ? ┐
│  Provider: Gemini · Modello: gemini-2.0-pro │
│  ─────────────────────────────────────────  │
│  👤  Quanti nodi ha il modello?             │
│  🤖  Il modello ha 11 nodi.                 │
│  👤  Quale elemento ha l'UR più alto?       │
│  🤖  L'elemento 5 (mezzeria) ha UR_max=     │
│      0.240, governato da LTB.               │
│  ─────────────────────────────────────────  │
│  Suggerimenti:                              │
│   ▸ "Spiega come ridurre l'UR di element 5" │
│   ▸ "Quali modi sono dominanti?"            │
│   ▸ "Verifica se la massa partecipante      │
│      è sufficiente per EC8"                 │
│  ─────────────────────────────────────────  │
│  ┌────────────────────────────────────────┐ │
│  │ Scrivi una domanda…                    │ │
│  │                                      ↵ │ │
│  └────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

---

## Fine

Questo documento è la **fonte di verità** per il redesign. Aggiornarlo prima di iniziare
ogni milestone (M0...M8). Ogni PR che tocca la UI deve referenziare la sezione corrispondente.

Per ogni nuova feature backend (es. carry-over BACKLOG.md BL-1 Cable), aggiungere
una riga nella tabella §8 con destinazione UI prima di scrivere codice.
