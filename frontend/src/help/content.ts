/**
 * Contenuti markdown della guida contestuale per ciascun workspace.
 *
 * Convenzione: ogni stringa è un Markdown GFM (heading, liste, code, table).
 * Renderizzato da `HelpSheet.tsx` con react-markdown + remark-gfm.
 *
 * Per modificare:
 *   - Aggiungi/correggi una voce qui (no JSX).
 *   - Le sezioni "## H2" vengono mostrate come ancore nel sommario.
 */
import type { Workspace } from "../store/workspaceStore";

export const HELP_CONTENT: Record<Workspace, { title: string; md: string }> = {

  model: {
    title: "Workspace MODELLO",
    md: `
## Cosa fa
Costruisci il **modello FEA**: nodi, elementi, materiali, sezioni, carichi, vincoli.

## Tab disponibili
- **Albero** — struttura del modello (gerarchia nodi/elementi/loads/constraints).
- **Inspector** — modifica i dettagli dell'entità selezionata nel viewport.
- **Libreria** — materiali EN 10025 + sezioni IPE/HEA/HEB pronti all'uso.

## Workflow tipico
1. Crea nuovo modello (TopBar → **+ Nuovo**) oppure duplica uno esistente.
2. Importa geometria (Workspace I/O → Import DXF / IFC) o disegna nodi con **N**.
3. Apri il wizard mesh (**M**) per generare:
   - Linea (beam/truss)
   - Shell / Tri rettangolare
   - Box 3D solido
   - **Parametrica** (L, T, cerchio, anello — via Delaunay).
4. Assegna materiali e sezioni dalla **Libreria**.
5. Aggiungi carichi (**L**) e vincoli (**C**).
   - Per terreno no-tension: vincolo tipo **spring** + **compression-only**.
   - Per suolo di Winkler distribuito: imposta **winkler_k** sull'elemento beam2d.

## Shortcut
| Tasto | Azione |
|-------|--------|
| \`N\` | Aggiungi nodo |
| \`E\` | Aggiungi elemento |
| \`L\` | Aggiungi carico |
| \`C\` | Aggiungi vincolo |
| \`M\` | Wizard mesh |
| \`Del\` | Elimina selezione |
| \`Esc\` | Deseleziona |
| \`Shift+Click\` | Aggiungi alla selezione |
`,
  },

  analysis: {
    title: "Workspace ANALISI",
    md: `
## Cosa fa
Esegui le **analisi** sul modello attivo. Il backend usa Newmark-β per dinamica,
Lanczos per modale, eigenvalue analysis per buckling, active-set per molle unilaterali.

## Tab disponibili
- **Lineare** — Statica · Modale · Dinamica · Buckling (parametri standard).
- **Push-over** — analisi non lineare a controllo carico con cerniere plastiche concentrate (NTC §7.3.4.1).
- **Sismica TH** — time-history multi-componente X/Y/Z. Accelerogrammi da catalogo PEER o sintetici.
- **Fatica** — Rainflow ASTM E1049-85 + curve S-N EC3-1-9 + Miner damage.
- **Monitor** — log streaming via WebSocket /ws/progress.

## Esegui un'analisi
1. Scegli il tipo in **TopBar** (Statica / Modale / Dinamica).
2. Click **Esegui** (\`F5\`).
3. I risultati appaiono automaticamente nel workspace Risultati.

## Push-over
- \`λ_step\` 0.05 = 5% di carico per step
- \`λ_max\` 5 = fino a 5x il pattern
- \`δ_max\` 1 m = stop su spostamento (proxy del meccanismo)

## Sismica time-history
- Attiva 1–3 componenti (X/Y/Z), ognuna da catalogo o sintetica (Kanai-Tajimi / Boore).
- Smorzamento Rayleigh tra \`ω_lo\` e \`ω_hi\` (Hz).

## Fatica
- 3 fonti di segnale: CSV manuale · da risultati dinamici · sintetico.
- Categoria EC3 di dettaglio (36 → 160 MPa).
- Damage \`D ≥ 1\` = rottura per fatica.
`,
  },

  verify: {
    title: "Workspace VERIFICHE",
    md: `
## Cosa fa
Verifica strutturale secondo Eurocodici + NTC 2018.

## Tab disponibili
- **EC3** — acciaio (EN 1993-1-1). Itera automaticamente su tutti i beam in acciaio del modello.
- **EC2** — calcestruzzo armato (sezione rettangolare, flessione + taglio).
- **EC5** — legno (resistenze EN 1995-1-1: trazione, compressione, flessione, taglio).
- **EC8** — sismica (spettro elastico/design + fattore di struttura q).
- **NTC** — combinazioni SLU/SLE/sismica/eccezionale + envelope.

## EC3 (automatico)
Richiede risultati statici. Per ogni beam in acciaio con profilo I:
- Classificazione sezione (C1-4) EN 1993-1-1 §5.5
- Resistenze N_Rd, M_c,Rd, V_c,Rd (§6.2)
- Instabilità flessionale N_b,Rd (§6.3.1) per compressione
- LTB M_b,Rd (§6.3.2) per flessione I-profili con Iw noto
- Verifica combinata N+M+V

## EC2 (form-driven)
Inserisci dimensioni sezione (b, d), armatura A_s, fck, fyk, M_Ed.
Restituisce M_Rd con verifica duttilità x/d ≤ 0.45 e armatura minima.

## EC5 (form-driven)
Scegli classe (C24/C30/GL24h/GL28h), service class (1=indoor, 2=copertura, 3=esterno),
durata carico (permanente → istantanea). Restituisce k_mod, γ_M e le 4 resistenze
di calcolo + UR per ogni stato di tensione.

## EC8 spettro
Spettro elastico Se(T) e di progetto Sd(T) per categoria suolo A-E e tipo sismico 1/2.
Grafico interattivo, parametri S/T_B/T_C/T_D visibili.

## NTC combinazioni
Costruisci la lista azioni (G1, G2, P, Q, E, A) con categorie ψ. Il sistema
**enumera tutte le combinazioni** per il tipo richiesto, con coefficienti per
ciascuna azione + envelope max/min.
`,
  },

  docs: {
    title: "Documentazione FEA Pro",
    md: `
## Overview
FEA Pro è un'applicazione di analisi strutturale agli elementi finiti
con backend Python (FastAPI + NumPy/SciPy) e frontend React/Three.js.

## Architettura
- **5 workspace tematici** (rail sinistro 48px)
  1. **Modello** — costruisci la struttura
  2. **Analisi** — esegui calcoli
  3. **Risultati** — visualizza + post-elabora
  4. **Verifiche** — controlli normativi
  5. **I/O & Collab** — import/export, AI, multiutente

- **Viewport 3D** sempre visibile al centro (Three.js / @react-three/fiber).
- **WorkspacePanel** destro (380-420 px) cambia in base al workspace.
- **Command Palette** (\`Ctrl+K\`) per accesso rapido a tutte le azioni.

## Solver supportati
- **Statica lineare** — assembler sparse + scipy spsolve
- **Modale** — Lanczos (\`scipy.sparse.linalg.eigsh\`)
- **Dinamica** — Newmark-β implicito + Rayleigh damping
- **Buckling** — eigenvalue (\`K + λ·K_G\` cubico Bernoulli)
- **Push-over** — load control + cerniere plastiche
- **Sismica TH** — multi-componente X/Y/Z con GROUND_ACCEL
- **Unilateral** — active-set per molle solo-compressione (FASE 9)
- **Winkler** — rigidezza distribuita per beam su suolo elastico (FASE 8)

## Verifiche normative
EC3 (acciaio) · EC2 (CA) · EC5 (legno) · EC8 (sismica) · NTC 2018 (azioni e combinazioni).

## I/O
- Import: DXF, IFC4
- Export: JSON, CSV, DXF, PDF (client + server), Excel multi-sheet, IFC4

## Risorse
- API docs OpenAPI: **/docs** (interfaccia Swagger)
- Repository: \`fea-pro\`
- Specifica UI redesign: \`UI_REDESIGN_SPEC.md\`
- Backlog tecnico: \`BACKLOG.md\`
`,
  },
};

/**
 * Tip inline da affiancare a feature specifiche.
 * Chiave = id univoco (usato in TipBubble), valore = markdown breve.
 */
export const INLINE_TIPS: Record<string, string> = {
  "winkler-k": "Coefficiente di sottosuolo elastico [N/m²]. Tipici: argilla molle 1e7, terreno medio 5e7, roccia 1e9.",
  "compression-only": "Disattiva la molla quando in trazione (terreno no-tension, gap, ecc.). Richiede risolutore active-set.",
  "rayleigh-anchors": "Frequenze di ancoraggio per il damping Rayleigh. Tipicamente la prima e la decima modale.",
  "ec8-q": "Fattore di struttura q = q_0 · α_u/α_1 · k_w ≥ 1.5. Riduce lo spettro elastico per ottenere Sd.",
  "ec3-category": "Categoria di dettaglio EN 1993-1-9 Tab. 8.1: 36/40/.../160 MPa. Definisce la curva S-N.",
  "gci": "Grid Convergence Index ASME V&V20. GCI < 5% indica convergenza accettabile.",
  "zz-error": "Errore Zienkiewicz-Zhu semplificato: smoothing nodale dei valori discontinui per elemento.",
};
