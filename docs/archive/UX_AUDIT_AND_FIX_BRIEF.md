# FEA Pro · UX Audit & Fix Brief

> Documento operativo: 64 bug identificati il 2026-05-24 durante audit
> founder + AI assistant. Per ogni bug: descrizione, fix proposto con
> file/righe specifici dove possibile, test verificabili.
>
> **Da passare a Claude Code in sprint atomici, NON tutto insieme**.
>
> Strategia: 7 sprint compound, ognuno chiude 1 cluster.
> Ogni sprint <= 1-2 giorni. Quality gate visivo via Playwright + axe.

---

## STRUTTURA DOCUMENTO

1. **Quadro generale** — pattern sistemici emersi
2. **Decisioni architetturali pendenti** — 4 scelte da fare prima dei fix
3. **64 bug per cluster** — ognuno con: descrizione + fix + test
4. **Sequenza sprint raccomandata** — ordine di lavoro
5. **Quality automation setup** — come automatizzare test

---

# 1 · Quadro generale

## I 8 cluster identificati

| Cluster | Bug count | Severity media | Sprint |
|---|---|---|---|
| A · Caos visivo + densità eccessiva | 12 | P1 | S3 |
| B · Error handling tecnico | 5 | P0 | S1 |
| C · State management + pannelli stackati | 4 | P0 | S2 |
| D · Copy criptico + i18n | 8 | P1 | S5 |
| E · Information architecture | 5 | P0 | S4 |
| F · Precondizioni + empty state | 5 | P0 | S2 |
| G · Convenzioni viewport 3D | 6 | P1 | S6 |
| H · Command palette + ricerca | 7 | P1 | S5 |
| Catalog accuracy | 2 | P2 | S7 |

**Totale: 64 bug + 2 meta-finding strategici + 4 decisioni architetturali.**

## Pattern unificante

L'app espone il **modello mentale del developer** invece del modello mentale dell'**ingegnere strutturista**.

Esempi:
- "Albero · nodi · elementi · materiali" (tree view, gergo dev)
- "RAIL DESTRO", "MODELING", "I/O", "CLIMATE LOADS" (gergo codice)
- "n42 · e17" (sintassi shortcut)
- Errori JSON crudi esposti
- Pannelli che si sovrappongono senza state machine
- 182 comandi in 1 categoria
- Densità tipografica 10-11px mono ovunque

Tutto questo va invertito: **user-centric**, italiano professionale, gerarchia visiva chiara, prevenzione errori invece di spiegazione.

---

# 2 · Decisioni architetturali pendenti

Prima di iniziare i fix, queste 4 decisioni vanno prese esplicitamente.
Ogni decisione condiziona molti bug.

## DEC-1 · Interaction model viewport 3D

**Scelta**: tasto destro = pan camera oppure = context menu?

- **Stato attuale**: tasto destro = pan camera (default OrbitControls)
- **Raccomandazione**: tasto destro = context menu, pan camera con tasto centrale o Shift+drag (standard CAD)
- **Motivo**: context menu è universalmente atteso, pan camera ha alternative valide
- **Decisione richiesta da**: Federico

## DEC-2 · Design density

**Scelta**: densità Linear/Figma (compatto) o Notion/Slack (respirabile)?

- **Stato attuale**: Linear-style estremo (10-11px mono ovunque)
- **Raccomandazione**: ibrido contestuale
  - Field label form: 10px mono uppercase (Precision attuale OK)
  - Navigation/topbar: 13-14px sans-serif sentence case
  - Body content: 14-15px sans-serif
- **Motivo**: 10px ovunque rende illeggibile per uso prolungato
- **Decisione richiesta da**: Federico

## DEC-3 · Brand voice / estetica

**Scelta**: "terminal/console power-user look" oppure "CAD-classico professional look"?

- **Stato attuale**: terminal/console (mono uppercase, sintassi `n42`, label tipo `RAIL DESTRO`)
- **Raccomandazione**: CAD-classico (sans-serif italiano professionale, label normali, gergo eliminato)
- **Motivo**: target Paoletto viene da AutoCAD/SAP2000/Revit, non da Linear
- **Decisione richiesta da**: Federico

## DEC-4 · State machine pannelli laterali

**Scelta**: come si comportano i pannelli laterali quando se ne apre uno nuovo?

- **Stato attuale**: nessuna logica, si sovrappongono
- **Opzioni**:
  - A · **Tab system**: 1 solo pannello visibile, aprire uno chiude l'altro
  - B · **Side-by-side**: max 2 affiancati (sinistra + destra)
  - C · **Drawer stack**: nuovo copre vecchio con animazione chiara + breadcrumb back
- **Raccomandazione**: A (più semplice e prevedibile per Paoletto)
- **Decisione richiesta da**: Federico

---

# 3 · 64 bug per cluster

## CLUSTER A · Caos visivo + densità eccessiva (12 bug)

### BUG-001 · Banner "Spazio insufficiente per backup" copre Run button

**Severity**: P0
**Schermata**: Viewport workspace mobile, banner alto
**Sintomo**: toast non chiudibile copre il pulsante primario di azione
**File coinvolti**: probabile `frontend/src/components/shell/StorageWarningToast.tsx` o equivalente
**Fix proposto**:
```tsx
// 1. Aggiungere bottone X di dismiss
// 2. Auto-dismiss dopo 10 secondi
// 3. Persistenza dismiss (localStorage flag)
// 4. Reposizionare in bottom-center invece di top-banner
// 5. Max-width 480px per non occupare tutta la larghezza
```
**Test verificabile**:
- Playwright: apri viewport, screenshot, verifica che el `[data-testid="run-button"]` sia visibile e cliccabile (non coperto)
- axe-core: verifica click target non-occluded

---

### BUG-002 · "Nuovo modello" duplicato in topbar dropdown + sub-header

**Severity**: P1
**Schermata**: Viewport mobile e desktop
**Sintomo**: stessa info in 2 posti adiacenti
**File coinvolti**: `frontend/src/components/shell/TopBar.tsx` + sub-header component
**Fix proposto**:
- Tenere solo il dropdown topbar (più strutturato)
- Rimuovere occorrenza sub-header
- Se l'utente serve "vista rapida nome modello", usare breadcrumb integrato
**Test**:
- Playwright: count `text="Nuovo modello"` in viewport, deve essere 1

---

### BUG-003 · Bottom tabbar mobile ha label sovrapposte

**Severity**: P0
**Schermata**: Viewport mobile bottom
**Sintomo**: tab workspace ("MODELLO/MAKE/SOLVE/RISULTATI/ALTRO") + context actions ("Condividi/Modifica/Aggiungi/Cestino") sovrapposte
**File coinvolti**: `frontend/src/components/shell/MobileTabbar.tsx` + `MobileContextActions.tsx`
**Fix proposto**:
- Decidere: o tab workspace OR context actions, non entrambe
- Raccomandazione: tab workspace come default, context actions come sheet sliding up on tap selection
**Test**:
- Playwright mobile viewport: screenshot bottom, verifica unique row di tab visibili
- axe-core: verifica touch target ≥44px per ogni tab

---

### BUG-004 · Sub-header con info troncate ("12 nodi · 2 elem · ●")

**Severity**: P1
**Sintomo**: punto isolato, glifo missing, contatori troncati
**Fix proposto**:
- Verificare encoding font (probabile glyph missing)
- Sostituire bullet char con icona Lucide
- Layout responsive: nascondere contatori secondari su mobile
**Test**:
- axe-core: verifica nessun glyph U+FFFD (replacement char)

---

### BUG-005 · "Custom · Transp · Orto · L3" illeggibile/criptico

**Severity**: P1
**Sintomo**: stringa di 4 token senza affordance, "L3" ambiguo
**Fix proposto**:
- Convertire in dropdown o button group espliciti
- Tooltip per ogni opzione
- Rinominare "L3" → "Layer 3" o nome significativo
**Test**:
- axe-core: verifica aria-label per ogni control

---

### BUG-022 · Tipografia troppo piccola in topbar/pannelli

**Severity**: P0
**Sintomo**: 10-11px ovunque, illeggibile per uso prolungato
**File coinvolti**: `frontend/src/index.css` (tokens tipografici)
**Fix proposto** (subordinato a DEC-2):
```css
/* tokens.css */
--fs-xs: 11px;    /* solo field-label mono uppercase */
--fs-sm: 13px;    /* navigation, secondary text */
--fs-base: 14px;  /* body default - era 13px */
--fs-md: 15px;    /* primary content */
--fs-lg: 17px;
--fs-xl: 20px;
--fs-2xl: 24px;
--fs-3xl: 32px;
--fs-4xl: 40px;

/* Topbar height aumentata */
.topbar { min-height: 48px; /* era ~32-36px */ }

/* Touch target minimi */
button, .clickable {
  min-width: 32px;
  min-height: 32px;
}
```
**Test**:
- Lighthouse CI: accessibility score ≥90
- axe-core: nessun touch-target violation WCAG 2.5.5
- Visual regression: confronto baseline pre/post

---

### BUG-023 · 7 sezioni stesso peso visivo nel pannello View

**Severity**: P0
**Schermata**: Pannello View · VIEWPORT COCKPIT
**Sintomo**: PRESET VISTA, RENDER E CAMERA, ENGINE, LAYER BASE, RISULTATI OVERLAY, riepilogo top, footer info — tutte stesso peso
**File coinvolti**: `frontend/src/components/panels/ViewPanel.tsx`
**Fix proposto**:
- Hierarchy via padding (32px sopra sezione primaria, 16px sopra secondaria)
- Divisori sottili (1px ink-3) fra sezioni
- Label sezione primaria 13px semibold, secondaria 11px regular
**Test**:
- Visual regression baseline

---

### BUG-024 · Concetti misti nel pannello View (camera + engine + overlay)

**Severity**: P1
**Sintomo**: ENGINE (settings solver) messo in pannello View (settings visualizzazione)
**Fix proposto**:
- Split in 2 pannelli:
  - **Visualizzazione**: preset, render, camera, layer base, overlay risultati
  - **Avanzate**: engine selection, fattore deformata custom, performance
- Toggle "Avanzate" nascosto di default
**Test**:
- Manuale post-fix: verifica che ENGINE non sia più in pannello View

---

### BUG-025 · Header pannello View ridondante con controlli sotto

**Severity**: P1
**Sintomo**: "PRESET · VIEW · LAYER · Tecnica · solid·persp · 3+1·leg" in alto è riassunto dei controlli sotto
**Fix proposto**:
- Rimuovere riassunto top, lasciare solo controlli interattivi
- Oppure rendere riassunto NON-cliccabile (solo display)
**Test**:
- Manuale: verifica unicità controlli interattivi

---

### BUG-026 · "DRAW 2 · x50.0" criptico

**Severity**: P1
**Sintomo**: utente non capisce cosa sia
**Fix proposto**:
- Rinominare "Fattore amplificazione deformata: 50×"
- Spostarlo vicino al toggle "Deformata" in sezione overlay
- Slider o input numerico invece di button
**Test**:
- Manuale

---

### BUG-038 · Topbar dimensioni sotto standard

**Severity**: P1
**Già coperto da BUG-022**. Fix unificato.

---

### BUG-041 · Sidebar destra 3 icone senza tooltip

**Severity**: P1
**Schermata**: Workspace topbar/sidebar destra (occhio, layer, chiave inglese)
**File coinvolti**: `frontend/src/components/shell/RightRail.tsx`
**Fix proposto**:
```tsx
<button
  aria-label="Visualizza"
  title="Visualizza opzioni di rendering"
  className="..."
>
  <EyeIcon />
</button>
```
- Tooltip al hover (`title` attribute + tooltip component custom)
- Label visibile su breakpoint >= xl
**Test**:
- axe-core: verifica aria-label su tutti icon-only button

---

## CLUSTER B · Error handling tecnico (5 bug)

### BUG-011 · Messaggi errore JSON tecnici esposti all'utente

**Severity**: P0
**Schermata**: Topbar, banner errori
**Sintomo**: "Unexpected token '<', "<PNG..." is not valid JSON"
**File coinvolti**:
- `frontend/src/lib/api-client.ts` (handler errori globale)
- `frontend/src/components/ErrorBoundary.tsx`
**Fix proposto**:
```tsx
// In api-client.ts
async function apiRequest(url, options) {
  try {
    const response = await fetch(url, options);
    const contentType = response.headers.get('content-type');

    if (!contentType?.includes('application/json')) {
      // Backend ha ritornato HTML invece di JSON
      throw new APIError(
        'Errore di comunicazione con il server',
        'NON_JSON_RESPONSE',
        { url, status: response.status }
      );
    }

    if (!response.ok) {
      const data = await response.json();
      throw new APIError(
        translateError(data.error_code) || 'Errore inatteso',
        data.error_code,
        data
      );
    }

    return await response.json();
  } catch (e) {
    if (e instanceof APIError) throw e;
    throw new APIError(
      'Connessione al server interrotta. Riprova.',
      'NETWORK_ERROR',
      { url, originalError: e }
    );
  }
}

// translateError mappa codes tecnici → messaggi italiani
function translateError(code) {
  return {
    'NODE_NOT_FOUND': 'Nodo non trovato',
    'MODEL_INCOMPLETE': 'Il modello non ha tutti i dati necessari',
    'SOLVER_FAILED': 'Errore durante il calcolo. Verifica vincoli e carichi.',
    // ...
  }[code];
}
```
**Test**:
- Unit test: APIError mai mostra raw exception
- Playwright: inietta endpoint mock che ritorna HTML, verifica messaggio italiano

---

### BUG-012 · Backend ritorna HTML invece di JSON su errori

**Severity**: P0
**Categoria**: backend architecture
**File coinvolti**: `backend/main.py` o app FastAPI principale
**Fix proposto**:
```python
# In main.py FastAPI app
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

app = FastAPI()

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error_code": f"HTTP_{exc.status_code}",
            "message": exc.detail,
            "path": str(request.url),
        },
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={
            "error_code": "VALIDATION_ERROR",
            "message": "Dati non validi",
            "details": exc.errors(),
        },
    )

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    # Log internally with full traceback
    logger.exception(f"Unhandled exception: {request.url}")
    return JSONResponse(
        status_code=500,
        content={
            "error_code": "INTERNAL_ERROR",
            "message": "Errore interno del server. È stato registrato.",
        },
    )
```
**Test**:
- pytest: chiamare endpoint inesistente `/api/nonexistent`, verifica JSON response (no HTML)
- pytest: forzare exception in endpoint, verifica JSON 500 response

---

### BUG-013 · Errori senza contesto operativo

**Severity**: P1
**Sintomo**: errore non dice quale azione l'ha causato né cosa fare
**Fix proposto**:
- Ogni toast errore include:
  - **Azione**: "Caricamento modello fallito"
  - **Causa**: "File danneggiato o formato non supportato"
  - **Cosa fare**: "Verifica che il file sia un .json o .feap valido"
  - **Ulteriori dettagli** (link collapsible per stack trace tecnico)
**Test**:
- Manuale + unit test su ErrorToast component

---

### BUG-046 · Banner errori senza max-width copre UI

**Severity**: P0
**File coinvolti**: `frontend/src/components/shell/ErrorBanner.tsx` (o equivalente)
**Fix proposto**:
```tsx
// Toast/banner styles
.error-banner {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  max-width: 480px;
  z-index: 9999;
  /* mai inline nella topbar */
}
```
**Test**:
- Playwright: forza errore, verifica max-width
- axe-core: verifica z-index non sovrappone interactive elements

---

### BUG-047 · Stesso errore JSON ricompare (regression)

**Severity**: P0
**Categoria**: regression of BUG-011/012
**Fix**: copertura completa da BUG-011 + BUG-012. Test che previene regressione:
```typescript
// Playwright E2E test
test('non-JSON response never shows raw error', async ({ page }) => {
  await page.route('**/api/**', route => {
    route.fulfill({
      contentType: 'text/html',
      body: '<html>Internal Error</html>',
      status: 500
    });
  });

  await page.goto('/');
  await page.click('[data-testid="load-model"]');

  // Verifica che NON appaia "Unexpected token" o "<PNG" o "JSON"
  await expect(page.locator('text=/Unexpected token/')).not.toBeVisible();
  await expect(page.locator('text=/JSON/')).not.toBeVisible();

  // Verifica che appaia messaggio italiano
  await expect(page.locator('text=/Errore di comunicazione/')).toBeVisible();
});
```

---

## CLUSTER C · State management + pannelli stackati (4 bug)

### BUG-014 · Click nodo apre Inspect + NodeDetail sovrapposti

**Severity**: P0
**Schermata**: Click su nodo nel viewport 3D
**Sintomo**: 2 pannelli aperti uno sopra l'altro
**File coinvolti**:
- `frontend/src/components/viewport/Viewport3D.tsx` (handler click)
- `frontend/src/store/panelsStore.ts` (state machine pannelli, da creare se non esiste)

**Fix proposto** (subordinato a DEC-4):
```typescript
// panelsStore.ts - nuovo
interface PanelsState {
  currentLeftPanel: 'make' | 'view' | 'verify' | null;
  currentRightPanel: 'inspect' | 'solve' | null;
  inspectMode: 'node' | 'element' | 'results' | null;
  selectedNodeId: number | null;
  selectedElementId: number | null;
}

const usePanelsStore = create<PanelsState>((set) => ({
  // ...
  openRightPanel: (panel, mode = null) => set({
    currentRightPanel: panel,
    inspectMode: panel === 'inspect' ? mode : null,
  }),

  selectNode: (id) => set({
    selectedNodeId: id,
    selectedElementId: null,
    currentRightPanel: 'inspect',
    inspectMode: 'node',
  }),

  closeAllPanels: () => set({
    currentLeftPanel: null,
    currentRightPanel: null,
    selectedNodeId: null,
    selectedElementId: null,
  }),
}));
```

In Viewport3D.tsx:
```tsx
const handleNodeClick = (nodeId: number) => {
  usePanelsStore.getState().selectNode(nodeId);
};
```

**Test**:
- Playwright: click su nodo, verifica solo 1 pannello visibile
- Component test: cambio selezione node chiude precedente

---

### BUG-015 · Click nodo non comunica caricamento

**Severity**: P1
**Fix proposto**:
- Skeleton loader nel pannello Inspect mentre fetch dati
- Stato "loading" esplicito in panelsStore
```tsx
{isLoadingNode && <NodeDetailSkeleton />}
{node && <NodeDetail node={node} />}
```
**Test**:
- Playwright: ralenta network, verifica skeleton

---

### BUG-058 · Solve > Live pannello completamente vuoto

**Severity**: P0
**Schermata**: Solve workspace > sub-tab "live"
**Sintomo**: area centrale completamente bianca
**File coinvolti**: `frontend/src/components/panels/SolvePanel.tsx`
**Fix proposto**:
```tsx
function SolveLiveTab() {
  const { currentAnalysis, isRunning, progress, results } = useAnalysisStore();

  if (!currentAnalysis) {
    return (
      <EmptyState
        icon={<PlayCircleIcon />}
        title="Nessuna analisi configurata"
        description="Scegli il tipo di analisi e clicca Esegui"
        primaryAction={{
          label: "Configura analisi statica",
          onClick: () => openAnalysisConfig('static')
        }}
        secondaryAction={{
          label: "Vedi tutti i tipi",
          onClick: () => openAnalysisConfig()
        }}
      />
    );
  }

  if (isRunning) {
    return <AnalysisProgress
      analysis={currentAnalysis}
      progress={progress}
      onStop={stopAnalysis}
    />;
  }

  return <AnalysisSummary
    results={results}
    onNewAnalysis={() => clearAnalysis()}
    onViewResults={() => openResultsPanel()}
  />;
}
```
**Test**:
- Playwright: apri Solve > Live, verifica empty state visible
- Playwright: lancia analisi, verifica progress visible
- Playwright: analisi completa, verifica summary visible

---

### BUG-064 · Click "Apri Make" non chiude Solve aperto

**Severity**: P0
**Categoria**: regression of BUG-014 pattern
**Fix**: copertura completa da BUG-014 (panelsStore unificato)

---

## CLUSTER D · Copy criptico + i18n (8 bug)

### BUG-017 · "Albero" come termine criptico

**Severity**: P1
**File**: `frontend/src/components/panels/MakePanel.tsx` (sub-text card Geometria)
**Fix**:
```tsx
// Da: "Albero · nodi · elementi · materiali"
// A:  "Vista gerarchica · Nodi · Elementi · Materiali"
// O semplicemente rimuovere "Albero" se la tree view non c'è
```

---

### BUG-018 · Termini inglesi non tradotti

**Severity**: P1
**File**: vari componenti, cercare con grep
**Fix**:
```bash
# Lista mappatura traduzioni
grep -r "climate apply\|Fixed\|pinned\|rollers\|springs\|Wizard\|Tools" frontend/src
```
Tradurre:
- "climate apply" → "carichi climatici"
- "Fixed · pinned · rollers · springs" → "Incastro · Cerniera · Carrello · Molle"
- "Wizard" → "Procedura guidata"
- "Tools" → "Strumenti"
- "Wire / Solid / Transp" → "Wireframe / Solido / Trasparente"
- "Engine" → "Motore"
- "MODELING" → "Modellazione"
- "I/O" → "Importa/Esporta"
- "CLIMATE LOADS" → "Carichi climatici"

**Test**:
- Playwright: scan tutte le pagine, verifica nessuna occorrenza dei termini inglesi listati
- ESLint custom rule per prevenire regressione

---

### BUG-020 · "FASI" verticale senza contesto

**Severity**: P2
**Fix**: orientamento orizzontale + label "FASI: 1/5 modelli" o rimuovere

---

### BUG-029 · Termini inglesi nel pannello View

**Severity**: P2
**Fix**: coperto da BUG-018

---

### BUG-030 · "3+1 · leg" indecifrabile

**Severity**: P2
**Fix**: rimuovere o espandere "3 layer attivi + legenda"

---

### BUG-040 · "3D · SI" criptico

**Severity**: P2
**Fix**: "Sistema unità: SI (metri, Newton)" + icona tooltip

---

### BUG-050 · Template "Torre 3D" è trave reticolare

**Severity**: P2
**File**: `backend/examples.py`
**Fix**: rinominare template o sostituire modello sottostante
```python
# Da:
'ex_torre_3d': {'name': 'Torre 3D', 'description': '...'}

# A:
'ex_truss_3d': {'name': 'Trave reticolare 3D', 'description': '...'}
```

---

### BUG-054 · Gergo developer in palette ("RAIL DESTRO", "I/O", "MODELING")

**Severity**: P1
**File**: `frontend/src/lib/paletteItems.ts`
**Fix**:
```tsx
// Da:
{ label: "PANNELLO · INSPECT (RISULTATI) · RAIL DESTRO", ... }

// A:
{ label: "Apri pannello Ispeziona risultati", category: "Risultati", location: "Pannello laterale destro" }
```

---

## CLUSTER E · Information architecture (5 bug)

### BUG-016 · Make panel mostra categorie invece di azioni

**Severity**: P0
**Schermata**: Pannello Make
**Sintomo**: utente cerca "aggiungi nodo", trova "Geometria" categoria
**File**: `frontend/src/components/panels/MakePanel.tsx`
**Fix proposto** (riscrittura componente):
```tsx
const ACTIONS = [
  {
    id: 'add-node',
    label: 'Aggiungi nodo',
    icon: PlusCircle,
    shortcut: 'N',
    action: () => openAddNodeDialog(),
  },
  {
    id: 'add-element',
    label: 'Aggiungi elemento (trave/shell)',
    icon: Layers,
    shortcut: 'E',
    action: () => openAddElementDialog(),
  },
  {
    id: 'add-load',
    label: 'Aggiungi carico',
    icon: ArrowDown,
    shortcut: 'L',
    action: () => openAddLoadDialog(),
  },
  {
    id: 'add-constraint',
    label: 'Aggiungi vincolo',
    icon: Anchor,
    shortcut: 'C',
    action: () => openAddConstraintDialog(),
  },
  {
    id: 'import',
    label: 'Importa modello (DXF/IFC)',
    icon: FileUp,
    action: () => openImportWizard(),
  },
  {
    id: 'mesh',
    label: 'Genera mesh',
    icon: Grid,
    action: () => openMeshWizard(),
  },
];

const SETTINGS = [
  { label: 'Modifica materiali', icon: Edit, action: () => openMaterialsList() },
  { label: 'Modifica sezioni', icon: Edit, action: () => openSectionsList() },
];

function MakePanel() {
  return (
    <PanelContainer title="Costruisci modello">
      <Section title="Azioni">
        {ACTIONS.map(a => (
          <ActionRow key={a.id} {...a} />
        ))}
      </Section>
      <Section title="Impostazioni modello">
        {SETTINGS.map(s => (
          <ActionRow key={s.label} {...s} />
        ))}
      </Section>
    </PanelContainer>
  );
}
```
**Test**:
- Playwright: verifica testo "Aggiungi nodo" presente, "Geometria" no
- Component test: click "Aggiungi nodo" apre dialog

---

### BUG-031 · Verify > Live empty state senza CTA

**Severity**: P0
**File**: `frontend/src/components/panels/VerifyPanel.tsx`
**Fix proposto**:
```tsx
function VerifyLiveTab() {
  const hasResults = useResultsStore(s => s.staticResults != null);

  if (!hasResults) {
    return (
      <EmptyState
        title="Nessuna verifica disponibile"
        description="Per fare le verifiche normative servono i risultati di un'analisi"
        primaryAction={{
          label: "▶ Esegui analisi statica",
          onClick: () => runStaticAnalysis()
        }}
        secondaryAction={{
          label: "Cambia tipo di analisi",
          onClick: () => openSolvePanel()
        }}
      />
    );
  }

  return <VerifyResultsView />;
}
```
**Test**:
- Playwright: senza analisi, verifica bottone CTA visible e cliccabile

---

### BUG-032 · Bottoni accessibili senza precondizioni

**Severity**: P0
**Categoria**: meta-pattern
**Approccio**: registry centralizzato di precondizioni per ogni feature
```tsx
// preconditions.ts
export const FEATURE_PRECONDITIONS = {
  'verify-live': {
    requires: ['static-analysis-completed'],
    disabledLabel: 'Esegui analisi statica prima',
    disabledAction: 'run-static-analysis',
  },
  'export-pdf': {
    requires: ['model-exists', 'analysis-completed'],
    disabledLabel: 'Esegui un\'analisi per esportare il report',
    disabledAction: 'run-analysis',
  },
  'inspect-node': {
    requires: ['node-selected'],
    disabledLabel: 'Seleziona un nodo dal viewport',
    disabledAction: null,
  },
  // ...
};

function checkPrecondition(featureId, state) {
  const config = FEATURE_PRECONDITIONS[featureId];
  if (!config) return { available: true };

  const missing = config.requires.filter(req => !state[req]);
  if (missing.length === 0) return { available: true };

  return {
    available: false,
    missing,
    disabledLabel: config.disabledLabel,
    disabledAction: config.disabledAction,
  };
}
```

Componente che usa:
```tsx
function FeatureButton({ featureId, children, onClick }) {
  const state = useFeatureStateSelector();
  const check = checkPrecondition(featureId, state);

  if (!check.available) {
    return (
      <Tooltip content={check.disabledLabel}>
        <button disabled className="opacity-50 cursor-not-allowed">
          {children}
        </button>
      </Tooltip>
    );
  }

  return <button onClick={onClick}>{children}</button>;
}
```
**Test**:
- Component test per ogni precondition
- Playwright: senza analisi, verify-live button è disabled con tooltip

---

### BUG-039 · Info modello in 2 posizioni ridondanti

**Severity**: P1
**Fix**: estrarre `<ModelStatsBadge>` riusato in 1 sola posizione
```tsx
function ModelStatsBadge() {
  const stats = useModelStats();
  return (
    <div className="...">
      <span>{stats.nodes} nodi</span>
      <span>•</span>
      <span>{stats.elements} elementi</span>
      {stats.constraints > 0 && (
        <>
          <span>•</span>
          <span>{stats.constraints} vincoli</span>
        </>
      )}
    </div>
  );
}
```
**Test**:
- Playwright: count "X nodi · Y elementi" deve essere 1 in viewport

---

### BUG-045 · Info modello duplicata con formati inconsistenti

**Severity**: P1
**Fix**: coperto da BUG-039

---

## CLUSTER F · Precondizioni + empty state (5 bug)

### BUG-027 · Toggle disabilitati senza CTA chiara

**Severity**: P1
**Schermata**: Pannello View > Risultati Overlay
**Fix proposto**:
- Non mostrare toggle disabilitati, sostituire con sezione CTA:
```tsx
{!hasResults && (
  <CallToActionCard
    icon={<PlayCircle />}
    title="Esegui un'analisi per vedere i risultati"
    description="Statica, modale o dinamica - ognuna mostrerà overlay diversi"
    primaryAction={{ label: 'Esegui analisi statica', action: runStatic }}
    secondaryAction={{ label: 'Vedi tipi di analisi', action: openSolve }}
  />
)}
```

---

### BUG-028 · "Legacy STABILE" implica esistenza "instabile"

**Severity**: P2
**Fix**: nascondere selezione Engine in pannello "Avanzate" (vedi BUG-024)

---

### BUG-031 · (già coperto in CLUSTER E)

---

### BUG-061 · Empty state "Modello vuoto" linguaggio system-centric

**Severity**: P1
**Sintomo**: "Aggiungi nodi ed elementi da Make → Geometria"
**Fix proposto**:
```tsx
<EmptyState
  icon={<CubeIcon />}
  title="Modello pronto"  // più positivo
  description="Inizia da un template oppure costruisci da zero"

  primaryAction={{
    label: "Scegli un template",
    description: "9 modelli pronti da personalizzare",
    icon: <LibraryIcon />,
    onClick: () => openTemplateGallery()
  }}

  secondaryAction={{
    label: "Costruisci da zero",
    description: "Aggiungi nodi e elementi manualmente",
    icon: <PlusIcon />,
    onClick: () => openMakePanel('add-node')  // apre direttamente in azione "aggiungi nodo"
  }}

  tertiaryHint="oppure Ctrl+K per comandi rapidi"
/>
```
**Test**:
- Playwright: verifica template come primary, no riferimento a "Make → Geometria"

---

### BUG-062 · Empty state priorità CTA invertita (template dovrebbe essere primario)

**Severity**: P2
**Fix**: coperto da BUG-061

---

## CLUSTER G · Convenzioni viewport 3D (6 bug)

### BUG-035 · Tasto destro pan camera invece di context menu

**Severity**: P0
**Subordinato a DEC-1**
**File**: `frontend/src/components/viewport/Viewport3D.tsx`
**Fix proposto**:
```tsx
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

<OrbitControls
  mouseButtons={{
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.NONE,  // libera per context menu
  }}
  enablePan={true}
  // pan con shift+sinistro automatico
/>

<Canvas
  onContextMenu={(e) => {
    e.preventDefault();
    const target = getElementUnderCursor(e.clientX, e.clientY);
    openContextMenu({
      x: e.clientX,
      y: e.clientY,
      target,
    });
  }}
>
```
Context menu component:
```tsx
function ViewportContextMenu({ target, x, y, onClose }) {
  const items = target?.type === 'node' ? NODE_MENU_ITEMS
              : target?.type === 'element' ? ELEMENT_MENU_ITEMS
              : EMPTY_AREA_MENU_ITEMS;

  return <FloatingMenu x={x} y={y} items={items} onClose={onClose} />;
}
```
**Test**:
- Playwright: right-click su nodo, verifica menu visible con items corretti
- Playwright: shift+drag, verifica camera pan

---

### BUG-036 · Context menu regression (era presente, ora rimosso)

**Severity**: P1
**Fix**: coperto da BUG-035

---

### BUG-037 · Shortcut mouse non documentate

**Severity**: P2
**Fix**: pannello Aiuto con tabella scorciatoie
```tsx
function ShortcutsPanel() {
  return (
    <Section title="Mouse">
      <ShortcutRow keys="Click sinistro + drag" action="Ruota vista" />
      <ShortcutRow keys="Shift + drag" action="Sposta vista" />
      <ShortcutRow keys="Rotella" action="Zoom" />
      <ShortcutRow keys="Click destro" action="Menu contestuale" />
    </Section>
  );
}
```

---

### BUG-043 · Scala viewport 3D non si aggiorna con zoom

**Severity**: P0
**File**: `frontend/src/components/viewport/ScaleIndicator.tsx`
**Fix proposto**:
```tsx
function ScaleIndicator() {
  const { camera, size } = useThree();
  const [scale, setScale] = useState({ ratio: 50, label: '1:50' });

  useFrame(() => {
    // Calcola dimensione apparente di 1 metro a schermo
    const center = new THREE.Vector3();
    const pixelSize = computePixelSize(camera, center, size);

    // 1 metro reale → pixelSize pixel a schermo
    const ratio = Math.round(1 / pixelSize * 100);  // semplificato
    const label = `1:${ratio}`;

    if (label !== scale.label) {
      setScale({ ratio, label });
    }
  });

  return (
    <div className="scale-indicator">
      <div className="scale-bar" style={{ width: `${1 / pixelSize}px` }} />
      <span>1 m · {scale.label}</span>
    </div>
  );
}
```
**Test**:
- Playwright: zoom in, verifica scale label cambia
- Unit test: pixelSize calcolato correttamente per camera positions diverse

---

### BUG-044 · Carichi e vincoli sovradimensionati

**Severity**: P1
**File**: `frontend/src/components/viewport/LoadArrow.tsx`, `ConstraintIcon.tsx`
**Fix proposto**:
```tsx
// Render in screen-space invece di world-space
function LoadArrow({ position, magnitude, direction }) {
  const { camera } = useThree();
  const screenSize = useScreenSizeForWorldPoint(position, camera);

  // Dimensione fissa in screen pixels, non in metri mondo
  const arrowLength = clamp(
    Math.log10(magnitude) * 10,  // legge logaritmica
    20, 80  // min 20px, max 80px screen
  );

  return (
    <ScreenSpaceArrow
      worldPosition={position}
      pixelLength={arrowLength}
      direction={direction}
    />
  );
}
```

---

### BUG-048 · Gizmo XYZ in alto-destra invece di basso-destra

**Severity**: P1
**File**: `frontend/src/components/viewport/Gizmo.tsx`
**Fix**:
```css
.gizmo-container {
  position: absolute;
  bottom: 16px;   /* era top: ... */
  right: 16px;
  /* basso-destra standard CAD */
}
```
**Test**:
- Playwright: verifica gizmo bbox in bottom-right quadrant

---

### BUG-049 · Modello non centrato all'apertura

**Severity**: P1
**File**: `frontend/src/components/viewport/Viewport3D.tsx`
**Fix proposto**:
```tsx
function Viewport3D({ model }) {
  const { camera, scene } = useThree();

  useEffect(() => {
    if (!model) return;

    // Calcola bounding box modello
    const bbox = new THREE.Box3();
    scene.traverse((obj) => {
      if (obj.userData.isStructuralElement) {
        bbox.expandByObject(obj);
      }
    });

    if (bbox.isEmpty()) return;

    // Auto-fit camera
    const center = bbox.getCenter(new THREE.Vector3());
    const size = bbox.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
    const distance = (maxDim / 2) / Math.tan(fov / 2) * 1.5;  // 1.5× margine

    camera.position.set(center.x + distance, center.y + distance, center.z + distance);
    camera.lookAt(center);
    camera.updateProjectionMatrix();
  }, [model]);

  // ...
}
```
**Test**:
- Playwright: apri modello, verifica modello visible in center quadrant (non in corner)

---

## CLUSTER H · Command palette + ricerca (7 bug)

### BUG-051 · 182 comandi in 1 categoria "COMANDI"

**Severity**: P0
**File**: `frontend/src/lib/paletteItems.ts`
**Fix proposto**: riorganizzare per area funzionale
```typescript
export const PALETTE_CATEGORIES = [
  {
    id: 'recents',
    label: 'Recenti',
    items: () => getRecentActions(5),  // dinamico
  },
  {
    id: 'modeling',
    label: 'Modellazione',
    items: MODELING_ACTIONS,  // ~20-25 voci
  },
  {
    id: 'analysis',
    label: 'Analisi',
    items: ANALYSIS_ACTIONS,  // ~10-15
  },
  {
    id: 'results',
    label: 'Risultati',
    items: RESULTS_ACTIONS,  // ~15-20
  },
  {
    id: 'view',
    label: 'Visualizzazione',
    items: VIEW_ACTIONS,  // ~15-20
  },
  {
    id: 'navigation',
    label: 'Navigazione',
    items: () => getDynamicNavItems(),  // nodi/elementi del modello corrente
  },
  {
    id: 'settings',
    label: 'Impostazioni',
    items: SETTINGS_ACTIONS,
  },
  {
    id: 'help',
    label: 'Aiuto',
    items: HELP_ACTIONS,
  },
];
```

---

### BUG-052 · Tipografia da log/console

**Severity**: P0
**Subordinato a DEC-3**
**Fix proposto**:
```tsx
function PaletteItem({ item }) {
  return (
    <div className="palette-item">
      <Icon className="palette-icon" />
      <div className="palette-content">
        <div className="palette-label">{item.label}</div>
        {item.description && (
          <div className="palette-description">{item.description}</div>
        )}
      </div>
      <div className="palette-meta">
        <span className="palette-category">{item.category}</span>
        {item.shortcut && <Kbd>{item.shortcut}</Kbd>}
      </div>
    </div>
  );
}
```
CSS:
```css
.palette-label {
  font-family: var(--font-sans);  /* non mono */
  font-size: 14px;
  text-transform: none;  /* non uppercase */
  color: var(--ink-1);
}
.palette-description {
  font-family: var(--font-sans);
  font-size: 12px;
  color: var(--ink-3);
}
.palette-category {
  font-size: 11px;
  color: var(--ink-4);
}
```

---

### BUG-053 · Sintassi ricerca criptica ("n42 · e17")

**Severity**: P1
**Fix**: placeholder esplicito + help inline
```tsx
<SearchInput
  placeholder="Cerca azioni, vai a nodo (N42), elemento (E17)..."
  helpText={
    <div>
      <strong>Suggerimenti:</strong>
      <ul>
        <li>Digita "esegui" per le analisi</li>
        <li>Digita "aggiungi" per nuovi elementi</li>
        <li>Digita "N" + numero per andare a un nodo</li>
      </ul>
    </div>
  }
/>
```

---

### BUG-055 · Voci palette duplicate (SUGGERITI + COMANDI)

**Severity**: P2
**Fix**: filter unique
```typescript
function filterDuplicates(items) {
  const seen = new Set();
  return items.filter(item => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}
```

---

### BUG-056 · Overlay assente, errori visibili dietro palette

**Severity**: P1
**Fix**:
```tsx
function CommandPalette({ open, onClose }) {
  return (
    <>
      {open && (
        <div
          className="palette-overlay"
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 9998,
          }}
        />
      )}
      <Dialog open={open} className="palette-dialog">
        {/* ... */}
      </Dialog>
    </>
  );
}
```

---

### BUG-057 · Scorciatoie esposte su mobile

**Severity**: P2
**Fix**:
```tsx
const isMobile = useMediaQuery('(max-width: 768px)');

{!isMobile && item.shortcut && (
  <Kbd className="palette-shortcut">{item.shortcut}</Kbd>
)}
```

---

### BUG-059 · Funzione cerca duplicata (sidebar + topbar)

**Severity**: P1
**Fix**: rimuovere lente sidebar, mantenere search topbar
```tsx
// In LeftRail.tsx, rimuovere icona Search
// In TopBar.tsx, mantenere SearchInput esistente
```
Oppure differenziare scope (più complesso):
```tsx
// Sidebar: ricerca dentro il modello
<button title="Cerca nodi/elementi nel modello">
  <SearchIcon />  // diversa icona, es. SearchInModel
</button>

// Topbar: command palette globale
<SearchInput
  placeholder="Cerca azioni e comandi..."
  onClick={openCommandPalette}
/>
```

---

## Altri bug (singoli, non-cluster)

### BUG-006 · Engine button + Gizmo XYZ ammassati

**Severity**: P1
**Fix**: spostare Engine in pannello View Avanzate, Gizmo in bottom-right (BUG-048)

---

### BUG-007 · Viewport sproporzionato (modello piccolo)

**Severity**: P1
**Fix**: coperto da BUG-049 (auto-fit camera)

---

### BUG-008 · TopBar logo "F" vs avatar "FS" confondibili

**Severity**: P2
**Fix**: differenziare visually
```tsx
// Logo: square, accent background, font Inter Tight
<div className="logo bg-accent text-white">F</div>

// Avatar: circle, neutral background, smaller
<Avatar className="rounded-full bg-neutral text-ink size-7">FS</Avatar>
```

---

### BUG-009 · "PROSSIMO PASSO" truncato

**Severity**: P2
**Fix**: max-width o wrap, oppure tooltip per testo completo

---

### BUG-010 · Disclaimer normativo NTC18/EC3 assente

**Severity**: P1
**Fix**: aggiungere badge "Conforme NTC18 + EC3" in topbar e in report PDF

---

### BUG-019 · Icone sidebar senza tooltip

**Severity**: P1
**Fix**: aggiungere `title` + tooltip component a ogni icon-only button

---

### BUG-021 · X chiudi affordance ambigua

**Severity**: P2
**Fix**: tooltip "Chiudi pannello [nome]" + animazione di chiusura

---

### BUG-033 · Breadcrumb confondente

**Severity**: P2
**Fix**: chiarire pattern, freccia indietro per livello superiore, X per chiudere

---

### BUG-034 · Click destro pannelli laterali → menu browser

**Severity**: P1
**Fix**:
```tsx
function SidePanel({ children }) {
  return (
    <div onContextMenu={(e) => {
      e.preventDefault();
      // Eventualmente menu custom contestuale
    }}>
      {children}
    </div>
  );
}
```

---

### BUG-042 · "Mono uppercase 10px" applicato troppo aggressivamente

**Severity**: P0
**Categoria**: meta-pattern design system
**Fix**: audit + rule scoping (vedi DEC-2)

---

### BUG-060 · "Solve PRONTO" + breadcrumb "← Solve > live" confondono

**Severity**: P2
**Fix**: rimuovere doppia identificazione

---

### BUG-063 · Empty state nuovo modello manca context

**Severity**: P2
**Fix**: aggiungere saluto + nome modello inline (vedi BUG-061)

---

### Meta-finding META-001 · Bottoni accessibili senza precondizioni

**Severity**: critica
**Fix**: copertura sistematica da BUG-032

---

### Meta-finding META-002 · Solve > Live UI non implementata

**Severity**: P0
**Fix**: copertura da BUG-058

---

# 4 · Sequenza sprint raccomandata

## Sprint 1 · v2.5.1-error-handling (1-2 giorni)

**Cluster**: B · Error handling tecnico
**Bug**: BUG-011, BUG-012, BUG-013, BUG-046, BUG-047 (5 bug)
**Priorità**: P0 — sblocca diagnostica e UX

**Output atteso**:
- Backend FastAPI: tutti gli errori ritornano JSON strutturato
- Frontend: ErrorBoundary + APIError class + i18n traduzione errori
- Zero "Unexpected token JSON" visibili all'utente
- Toast errori con max-width 480px, posizione bottom-center

## Sprint 2 · v2.5.2-state-machine-panels (2-3 giorni)

**Cluster**: C · State management + F · Precondizioni empty state
**Bug**: BUG-014, BUG-015, BUG-058, BUG-064, BUG-027, BUG-031, BUG-032, BUG-061, BUG-062 (9 bug)
**Priorità**: P0 — sblocca flow di lavoro

**Output atteso**:
- `panelsStore` Zustand con state machine pannelli
- `preconditions.ts` registry
- `FeatureButton` component con disabled+tooltip
- Empty state component standardizzato con CTA
- Solve > Live implementato (empty/running/completed)

## Sprint 3 · v2.5.3-visual-hierarchy (2-3 giorni)

**Cluster**: A · Caos visivo + densità
**Bug**: BUG-001, BUG-002, BUG-003, BUG-004, BUG-005, BUG-022, BUG-023, BUG-024, BUG-025, BUG-026, BUG-038, BUG-041, BUG-042 (13 bug)
**Priorità**: P0/P1 — leggibilità professionale

**Output atteso**:
- DEC-2 decisa: design density ibrida contestuale
- Tokens tipografici aggiornati (4 size scales)
- Topbar height 48px
- Touch target ≥32px ovunque
- ViewPanel diviso (visualizzazione vs avanzate)

## Sprint 4 · v2.5.4-make-actions (2-3 giorni)

**Cluster**: E · Information architecture
**Bug**: BUG-016, BUG-039, BUG-045 (3 bug, ma riscrittura intera del Make panel)
**Priorità**: P0 — fix il pattern critico "categorie vs azioni"

**Output atteso**:
- Make panel riscritto come lista azioni dirette
- Sub-text card sostituite con icone + shortcut
- ModelStatsBadge centralizzato

## Sprint 5 · v2.5.5-copy-i18n-palette (2-3 giorni)

**Cluster**: D · Copy criptico + H · Command palette
**Bug**: BUG-017, BUG-018, BUG-020, BUG-029, BUG-030, BUG-040, BUG-050, BUG-051, BUG-052, BUG-053, BUG-054, BUG-055, BUG-056, BUG-057, BUG-059 (15 bug)
**Priorità**: P1 — italiano professionale + palette usabile

**Output atteso**:
- Traduzione completa termini tecnici (mapping completo)
- DEC-3 decisa: brand voice CAD-classico
- Command palette ristrutturata per categorie
- Tipografia palette sans-serif sentence case

## Sprint 6 · v2.5.6-viewport-3d (2-3 giorni)

**Cluster**: G · Convenzioni viewport 3D
**Bug**: BUG-035, BUG-036, BUG-037, BUG-043, BUG-044, BUG-048, BUG-049 (7 bug)
**Priorità**: P0/P1 — fiducia professionale

**Output atteso**:
- DEC-1 decisa: tasto destro = context menu
- Scala dinamica con zoom
- Gizmo in bottom-right
- Auto-fit camera all'apertura modello
- Carichi/vincoli in screen-space

## Sprint 7 · v2.5.7-polish (1-2 giorni)

**Cluster**: vari rimanenti
**Bug**: BUG-006-010, BUG-019, BUG-021, BUG-028, BUG-033, BUG-034, BUG-060, BUG-063 (15 bug minori)
**Priorità**: P2 — polish finale

**Output atteso**:
- Tooltip aggiunti dove mancanti
- Disclaimer normativo presente
- Polish vari

## Totale stimato: 12-17 giorni Claude Code

A fine Sprint 7 ci sono **0 P0 aperti** e ~10-15 P2 minori residui.

---

# 5 · Quality automation setup

## Sprint 0 · v2.5.0-quality-automation (3-5 giorni) — DA FARE PRIMA

**Obiettivo**: setup automation che verifica ogni fix oggettivamente.

### Componenti da installare

#### 5.1 · Playwright + axe-core + Lighthouse CI

```bash
cd frontend
pnpm add -D @playwright/test @axe-core/playwright
pnpm add -D @lhci/cli @lhci/utils
```

`playwright.config.ts`:
```typescript
export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'https://fea-pro.fly.dev',
    screenshot: 'on',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'] } },
  ],
});
```

#### 5.2 · Test suite base (15-20 schermate)

`tests/e2e/screens.spec.ts`:
```typescript
const SCREENS = [
  { name: 'landing', url: '/' },
  { name: 'dashboard', url: '/dashboard' },
  { name: 'workspace-empty', url: '/workspace?model=new' },
  { name: 'workspace-loaded', url: '/workspace?model=torre-3d' },
  { name: 'make-panel', url: '/workspace?model=torre-3d&panel=make' },
  { name: 'view-panel', url: '/workspace?model=torre-3d&panel=view' },
  { name: 'verify-panel', url: '/workspace?model=torre-3d&panel=verify' },
  { name: 'solve-panel', url: '/workspace?model=torre-3d&panel=solve' },
  { name: 'inspect-node', url: '/workspace?model=torre-3d&node=42' },
  { name: 'inspect-element', url: '/workspace?model=torre-3d&element=17' },
  { name: 'command-palette', action: 'open-palette' },
  // ...
];

for (const screen of SCREENS) {
  test(`screen: ${screen.name}`, async ({ page }) => {
    await page.goto(screen.url);

    // 1. Screenshot
    await page.screenshot({
      path: `screenshots/${screen.name}.png`,
      fullPage: true
    });

    // 2. axe-core scan
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious'))
      .toHaveLength(0);

    // 3. No console errors
    const errors = [];
    page.on('pageerror', e => errors.push(e));
    expect(errors).toHaveLength(0);

    // 4. No untranslated terms
    const html = await page.content();
    const FORBIDDEN = ['climate apply', 'Fixed', 'pinned', 'rollers', 'Wizard', 'RAIL DESTRO'];
    for (const term of FORBIDDEN) {
      expect(html).not.toContain(term);
    }
  });
}
```

#### 5.3 · Visual regression baseline

```typescript
// In ogni test
await expect(page).toHaveScreenshot(`${screen.name}.png`, {
  maxDiffPixels: 100,
});
```

Primo run salva baseline. Run successivi confrontano.

#### 5.4 · Orchestra Computer Use (agentic)

`scripts/agentic-audit.ts`:
```typescript
import Anthropic from '@anthropic-ai/sdk';

const TASKS = [
  'Crea un nuovo modello vuoto e prova a creare il primo nodo',
  'Carica template "Torre 3D" e applica un carico distribuito',
  'Esegui un\'analisi statica e leggi i risultati',
  'Apri il pannello Verify e prova a controllare le verifiche EC3',
  'Esporta un report PDF',
  // ...10 task totali
];

async function runAgent(task: string) {
  const anthropic = new Anthropic();

  // Lancia agente con Computer Use API
  const result = await anthropic.beta.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 4096,
    tools: [{ type: 'computer_20250124' }],
    messages: [{
      role: 'user',
      content: `Apri https://fea-pro.fly.dev. Task: ${task}.
                Documenta ogni problema UX che incontri.
                Se ti blocchi, descrivi dove e perché.`,
    }],
  });

  return parseAgentResult(result);
}

const results = await Promise.all(TASKS.map(runAgent));
const report = aggregateResults(results);
await fs.writeFile('agentic-audit-report.md', report);
```

#### 5.5 · Screenshot review con LLM vision

`scripts/screenshot-review.ts`:
```typescript
const PROMPT = `Sei un esperto UX di software per ingegneria strutturale italiana.
Analizza questo screenshot di FEA Pro e identifica problemi UX.

Focus su:
- Leggibilità (font size, contrast, hierarchy)
- Sovrapposizioni (overlay, banner, modal)
- Affordance (cosa è cliccabile, cosa non lo è)
- Copy italiano (termini tecnici, gergo developer)
- Consistency (stessa info in posti diversi)

Restituisci JSON: [{ severity: P0|P1|P2, category, description, fix_suggestion }]`;

for (const screen of SCREENS) {
  const screenshot = await fs.readFile(`screenshots/${screen.name}.png`);
  const review = await anthropic.messages.create({
    model: 'claude-opus-4-7',
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/png', data: screenshot.toString('base64') } },
        { type: 'text', text: PROMPT },
      ],
    }],
  });
  // ...
}
```

#### 5.6 · CI/CD integration

`.github/workflows/ux-audit.yml`:
```yaml
name: UX Audit
on:
  push:
    branches: [test, main]
  schedule:
    - cron: '0 3 * * *'  # ogni notte 3am UTC

jobs:
  playwright-axe:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install
      - run: pnpm playwright install
      - run: pnpm playwright test
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: screenshots
          path: screenshots/

  agentic-audit:
    runs-on: ubuntu-latest
    if: github.event_name == 'schedule'  # solo notturno
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install
      - run: pnpm tsx scripts/agentic-audit.ts
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
      - uses: actions/upload-artifact@v3
        with:
          name: agentic-report
          path: agentic-audit-report.md
```

### Output atteso Sprint 0

Quando finito:
- Ogni `git push` triggers Playwright + axe + visual regression
- Failure su qualsiasi P0/P1 blocca merge
- Ogni notte: agentic audit + LLM screenshot review
- Report mattutino con regression nuove vs persistenti
- Federico riceve dashboard con KPI UX

**Tempo Claude Code: 3-5 giorni.**
**Costo: $0 (incluso in Claude Max 20×).**

---

# 6 · Note di metodo

## Filosofia di lavoro

**Non più "Claude Code dice risolto"**. Ogni fix viene verificato da:
1. Playwright test mirato (pass/fail oggettivo)
2. axe-core compliance (WCAG)
3. Visual regression (no unexpected changes)
4. Manualmente da Federico solo nei casi sentiment (Tier 3)

## Quando Claude Code può legittimamente dire "risolto"

Solo se:
- [ ] Test Playwright del bug specifico passa
- [ ] axe-core: no new violations
- [ ] Visual regression: no unexpected diffs
- [ ] Documentazione del fix nel commit message
- [ ] Brief PROJECT_STATE aggiornato

Se uno solo manca, il fix è "in progress", non "done".

## Sessione Paoletto futura

Dopo Sprint 1-3 chiusi (errori + state + visual), prima di Sprint 4-7:
- Sessione 1h con Paoletto registrata
- Lui esegue task: "crea modello telaio 2D, esegui statica, esporta PDF"
- Federico osserva, non aiuta
- Output: lista bug Tier 3 (sentiment) che Paoletto avrebbe ancora dopo i fix oggettivi

Da Paoletto deriviamo eventuali Sprint 8+ orientati a polish + sentiment.

---

# 7 · Conclusione

64 bug strutturati, 7 sprint pianificati, 12-17 giorni di lavoro Claude Code stimato.

A fine Sprint 7:
- **0 P0** aperti
- **~5-10 P1** minori residui
- **~10-15 P2** cosmetici
- Quality automation che previene regressioni future
- Documento pronto per sessione user testing strutturata con Paoletto

**Il vero successo non sarà "0 bug" — sarà "Paoletto apre l'app e completa un task senza bloccarsi".** I 64 bug fixati sono la condizione necessaria, non sufficiente.

---

**Documento generato**: 2026-05-24
**Origine**: audit founder-driven con AI assistant
**Da rivedere**: dopo Sprint 3 chiuso (~7-10 giorni)
**Versione**: 1.0
