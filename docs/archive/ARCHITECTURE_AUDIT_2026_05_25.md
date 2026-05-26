# FEA Pro · Architecture Audit · 2026-05-25

> Audit architetturale chirurgico della repo `fea-pro-v2_5_0-pr1-tokens-atoms-c32005e`.
> Solo analisi statica, no modifiche al codice, no brief Claude Code, no decisioni strategiche.
> Mappa i 64 bug del `UX_AUDIT_AND_FIX_BRIEF.md` alle root cause nel codice + bug nuovi
> di natura architetturale non visibili dagli screenshot.
>
> **Cluster coperti**: C (state) · B (errori) · F (precondizioni) · E (IA) · G (3D) · D (i18n) · A (visual) · H (palette).
> **File ispezionati**: 4 store, 5 macro-panel, 4 viewport renderer, registry palette, tokens, error pipeline, app entrypoint.

---

## Sezione 1 · Cluster audit · mapping bug → root cause

### CLUSTER C · State management + pannelli stackati

#### BUG-014 · "Ho messo view deformata ma non la vedo" / pannelli che restano stacked / stato fantasma

**ROOT CAUSE**: `store/leftRailStore.ts:33` + `store/workspaceStore.ts:76` + `components/shell/LeftRail.tsx:55-58`

Lo stato del rail SINISTRO è gestito da DUE store con dual-write:
- `leftRailStore.openSection` (toggle pattern, persist key `feapro-left-rail`)
- `workspaceStore.currentLeftPanel` + `currentLeftTab` (open/close esplicito, persist key `workspace-store`)

`LeftRail.tsx:55-58` chiama entrambi a ogni click:
```ts
setWorkspace(item.key);   // → workspaceStore
toggle(item.key);          // → leftRailStore
```

Asimmetria: `toggle()` può portare `leftRailStore.openSection=null` mentre `workspaceStore.currentLeftPanel` resta valorizzato. Commento in `MakePanel.tsx:55-60` documenta che il problema si è già manifestato (alpha.31 Task 25, "la X deve chiudere SIA il flag workspace SIA il rail openSection — altrimenti LeftSlidePanel resta montato").

**PATTERN VIOLATO**: single-source-of-truth. Dual-write asimmetrico.

**FIX SPECIFICO**: consolidare in `workspaceStore` come unica autorità. Eliminare `leftRailStore` e `rightRailStore`. `LeftSlidePanel.tsx:27` deve leggere `workspaceStore.currentLeftPanel`. Cleanup `workspace` legacy promesso "in alpha.27" (`workspaceStore.ts:13`) ancora pendente.

**BUG CORRELATI SCOPERTI**:
- Reload pagina dopo toggle-chiusura → `leftRailStore` persiste `openSection=null` ma `workspaceStore` persiste l'ultimo `currentLeftPanel`. Race iniziale tra le due hydration.
- Logout non garbage-collect `feapro-left-rail` né `feapro-right-rail` → residui dell'utente precedente.

---

#### BUG-058 · "Solve > Live" UI non implementata / stato analisi non riflesso

**ROOT CAUSE**: stato analisi diviso tra `analysisStore`, `jobsStore`, `resultsStore`, `liveMonitorPanel` (vedere `store/`). Nessun campo unificato `solveLifecycle: "idle" | "queued" | "running" | "completed" | "failed"` che la UI possa osservare in un solo punto. Verificato via:
- `store/analysisStore.ts` esiste come "store di setting analisi"
- `store/jobsStore.ts` esiste per gestione background job
- `components/panels/LiveMonitorPanel.tsx` esiste come componente

Senza un single state per il lifecycle, ogni callsite riassembla la verità da 3-4 sorgenti.

**PATTERN VIOLATO**: state machine esplicita per workflow critico.

**FIX SPECIFICO**: introdurre in `analysisStore` un campo `lifecycle: AnalysisLifecycle` con state machine + transition guards. Tutti i consumer leggono solo `lifecycle`.

**BUG CORRELATI SCOPERTI**:
- `META-002` (UX audit) già indica copertura via BUG-058. Conferma.

---

#### BUG-064 · State management generale frammentato

**ROOT CAUSE**: `src/store/` contiene **20 store Zustand** (`analysisStore`, `authStore`, `billingStore`, `climateStore`, `commentsStore`, `historyStore`, `jobsStore`, `leftRailStore`, `measurementsStore`, `modelStore`, `notificationsStore`, `panelHeaderStore`, `resultsStore`, `rightRailStore`, `selectionStore`, `snapshotStore`, `themeStore`, `toastStore`, `uiStore`, `wizardStore`, `workspaceStore`).

Nessuna gerarchia/aggregator/facade. Componenti come `MakePanel` importano 5 store separati e li sincronizzano manualmente.

**PATTERN VIOLATO**: store boundary by domain. Pattern attuale = un store per ogni piccola feature.

**FIX SPECIFICO**: documentare uno store map (chi possiede cosa) e accorpare i mini-store correlati (`leftRail+rightRail+panelHeader+uiStore` → `shellStore` unico). Out-of-scope per Sprint 2 ma essential per debt.

**BUG CORRELATI SCOPERTI**:
- `panelHeaderStore` (no test) gestisce un `popDrillIn: (() => void) | null` cioè un callback funzione dentro Zustand. Anti-pattern: store contiene closure mutabile dal componente. Riferimento `panelHeaderStore.ts:34`.

---

### CLUSTER B · Error handling tecnico

#### BUG-011 / BUG-012 · Errori JSON crudi esposti / white screen su crash React

**ROOT CAUSE**: `src/main.tsx:14-28` — nessun ErrorBoundary. Verificato via `grep -rn "ErrorBoundary\|componentDidCatch\|getDerivedStateFromError"` → zero match in tutto il frontend.

L'albero React è:
```
StrictMode > QueryClientProvider > TooltipProvider > Toaster + AuthGate > App
```

Senza boundary, qualsiasi throw in un componente (es. `ResultsView` su risultati malformati, `Viewport3D` su WebGL context lost, dialog complesso con prop non aspettata) → white screen.

**PATTERN VIOLATO**: defense in depth a livello UI.

**FIX SPECIFICO**: aggiungere `components/ui/ErrorBoundary.tsx` con `componentDidCatch` + fallback minimale italiano + pulsante "Ricarica" + `console.error` per Sentry futuro. Wrap `<App />` in `main.tsx`.

**BUG CORRELATI SCOPERTI**:
- Nessun handler globale per `window.onerror` né `window.onunhandledrejection` → promise rejection silenti non arrivano a toast.
- WebGL context lost (mobile, background tab) → `Viewport3D` crasha senza recovery. R3F supporta `onContextRestored`, non usato.

---

#### BUG-046 · "HTTP 422: [object Object]" come toast

**ROOT CAUSE (storico, già chiuso)**: era in `api/client.ts` interceptor pre-v1.6. Chiuso nello sprint v1.6 S0 B05.

**STATO ATTUALE**: `lib/apiErrors.ts:42-66` mappa 10 kind backend a italiano umano (`missing_constraints`, `singular_matrix`, `missing_material`, `missing_section`, `no_loads`, `invalid_solver_params`, `convergence_failed`, `quota_exceeded`, `model_not_found`, `validation_failed`). `api/client.ts:60-68` chiama `translateAxiosError` per ogni 4xx/5xx con `shouldToastHttpError` filter.

`translateApiError` gestisce 5 casi: kind strutturato, FastAPI 422 array detail, detail stringa, Error instance, fallback safe-stringify. Implementazione buona.

**RIMANE APERTO**:
- `BackendErrorKind` (`lib/apiErrors.ts:22-31`) è una union chiusa di 10 valori. Backend può emettere kind nuovi non mappati → utente vede `Errore del solver · <kind_raw>` (caso 1 di `translateApiError`).

**PATTERN VIOLATO**: contract test backend↔frontend mancante.

**FIX SPECIFICO**: aggiungere test integrazione che enumera tutti i kind generati dal backend e verifica che siano coperti in `ERROR_TRANSLATIONS`. Sync da OpenAPI o test runtime.

---

#### BUG-047 · Toast position inconsistente / copre Run button

Da `components/layout/Toaster.tsx` (non letto in profondità per tempo). Da auditare in fase fix. Le indicazioni UX (bottom-center, max-width 480px) sono coerenti con la decisione già nota. Verifica `Toaster.tsx` per pattern attuale.

---

### CLUSTER F · Precondizioni + empty state

#### BUG-027 · "Run" cliccabile su modello senza vincoli / errore reattivo non preventivo

**ROOT CAUSE**: `shell/panels/SolvePanel.tsx:165` — `disabled={!model || isRunning}` inline. La logica precondition è limitata a "esiste model?" Non controlla:
- almeno 1 vincolo applicato
- almeno 1 carico applicato
- materiali/sezioni assegnate

Quando l'utente preme con modello incompleto, il backend rileva e ritorna `missing_constraints` o `no_loads` → toast reattivo (in italiano, buono grazie a `apiErrors.ts`) MA il pattern preventivo manca.

**PATTERN VIOLATO**: prevenzione errori invece di spiegazione.

**FIX SPECIFICO**: vedere BUG-032.

---

#### BUG-031 · `disabledHint` come keyword "statica" non come tooltip esplicativo

**ROOT CAUSE**: `shell/panels/ViewPanel.tsx:401-449` — il componente interno `Toggle` riceve `disabledHint?: string` che renderizza inline come label decorativa (riga 442-444):
```tsx
{disabled && disabledHint && (
  <span className="ml-auto font-mono text-[10px] uppercase tracking-wide-1 text-ink-3 truncate">
    {disabledHint}
  </span>
)}
```

Quindi l'utente vede `Deformata ... statica` (grigio) e deve indovinare che "statica" significa "esegui un'analisi statica prima". Nessun tooltip esplicativo.

**FIX SPECIFICO**: vedere BUG-032.

---

#### BUG-032 · Nessun precondition registry centralizzato

**ROOT CAUSE**: verificato via `grep -rn "FeatureButton\|preconditions\|usePrecondition"` → zero match. Pattern ad-hoc replicato in:
- `shell/panels/SolvePanel.tsx:165` (Run linear)
- `shell/panels/ViewPanel.tsx:195-230` (5 Toggle deformata/stress/iso/principali/colormap)
- `shell/panels/MakePanel.tsx:144,159` (PrimaryButton add load, add constraint)
- `components/shell/topbar/ModelMenu.tsx:82,89,107` (duplicate/rename/delete model)

Almeno 12 callsite con check `disabled={...}` ricalcolato ogni volta.

**PATTERN VIOLATO**: DRY + UX consistency.

**FIX SPECIFICO**: creare `lib/preconditions.ts`:
```ts
type Precondition = { ok: boolean; missing: string[] };
export const preconditions = {
  runStaticAnalysis: (s: AppState): Precondition => { ... },
  showDeformedShape: (s: AppState): Precondition => { ... },
  ...
};
```
+ `components/ui/FeatureButton.tsx` che renderizza `<button disabled={!ok}>` con `<Tooltip content={missing.map(m => `Manca: ${m}`)}>` quando disabled. Ogni callsite consuma `<FeatureButton featureId="runStaticAnalysis" .../>`.

---

### CLUSTER E · Information architecture

#### BUG-016 · Make panel categorie vs azioni / doppia destinazione I/O

**ROOT CAUSE 1**: `shell/panels/MakePanel.tsx:37-43` definisce `HUB_CARDS` con 5 card di cui una è `id="io"` "Import / Export". Ma `shell/panels/ToolsPanel.tsx:42-50` definisce un enum `ToolsView` con `import`, `export`, `server-export` come sub-view. Doppia destinazione: l'utente può cercare import/export in due posti diversi (rail sinistro Make hub vs rail destro Tools hub).

**ROOT CAUSE 2**: sub-text delle HUB_CARDS espongono modello mentale interno (`MakePanel.tsx:38-42`):
- "Albero · nodi · elementi · materiali" (tree-view jargon)
- "Wizard discretizzazione (line/quad/h8)" (codice solver)
- "Fixed · pinned · rollers · springs" (inglese tecnico)
- "Wizard DXF/IFC/JSON · Tools export" (formati interni)

**PATTERN VIOLATO**: user mental model vs developer mental model.

**FIX SPECIFICO**: decidere una sola destinazione per I/O (rimuovere `HUB_CARDS.io` o rimuovere `ToolsView.import/export`); riscrivere i sub-text in italiano user-facing ("Da dove parti il modello", "Come discretizzi", "Cosa applichi", "Come blocchi").

---

#### BUG-051 · Command palette 1 categoria fat

**ROOT CAUSE**: `lib/paletteItems.ts` distribuzione voci:
| Sezione | Voci |
|---|---|
| commands | **82** |
| loads | 24 |
| help | 20 |
| panels | 12 |
| settings | 6 |
| **TOT** | 144 |

Lo "commands" è megabucket — 82 voci miste senza sub-gerarchia. Promessi 6 sezioni nel commento iniziale (riga 8-14), in pratica 5 + niente sub-grouping in "commands".

**PATTERN VIOLATO**: information scent. 82 voci scrollabili senza gerarchia = caccia al tesoro.

**FIX SPECIFICO**: in `lib/paletteItems.ts` aggiungere un campo `group` dentro `section="commands"` con valori tipo `"modeling"|"solve"|"verify"|"postprocess"|"view"|"misc"`. Header secondario in `CommandPalette.tsx` renderizza le sub-section. Le 82 voci dovrebbero ridistribuirsi in 6 gruppi da ~12-15.

---

### CLUSTER G · Convenzioni viewport 3D

#### BUG-035 · Gizmo orientamento posizione

**ROOT CAUSE**: `components/viewport/Viewport3D.tsx:131` — `<GizmoHelper alignment="top-right" margin={[80, 100]}>`. Mockup UX raccomanda bottom-right.

**FIX SPECIFICO**: cambiare `alignment="bottom-right"`. 1 riga.

---

#### BUG-043 · ScaleIndicator non dinamico vs camera zoom

**ROOT CAUSE**: `components/viewport/ScaleIndicator.tsx:13-19` — la scala è calcolata da `modelBounds(model).size` (bounding box del modello) in 4 step hardcoded:
```ts
const scaleStr =
  size > 50 ? "1:200" : size > 10 ? "1:50" : size > 2 ? "1:20" : "1:5";
```
NON usa il camera zoom level corrente. Modello stesso, zoom in/out 10× → indicatore non cambia. Granularità grossolana (4 step).

**PATTERN VIOLATO**: feedback visivo dinamico.

**FIX SPECIFICO**: `ScaleIndicator` deve leggere `useThree().camera` + `useFrame()` per ricalcolare scala in funzione di `camera.position.distanceTo(target)` + FOV. Pattern reference: CAD AutoCAD/SAP2000 scale bar.

---

#### BUG-048 · Tasto destro pan camera invece di context menu

**ROOT CAUSE**: `components/viewport/Viewport3D.tsx:126-130` — `<OrbitControls target={...} makeDefault enableDamping dampingFactor={0.1} />`. Nessun `mouseButtons={{LEFT:..., MIDDLE:..., RIGHT:...}}` esplicito → usa default three.js (left=rotate, middle=dolly, right=pan). Nessun `onContextMenu` handler sul Canvas container.

**PATTERN VIOLATO**: convenzione CAD (tasto destro = context menu).

**FIX SPECIFICO**: dopo decisione DEC-1, se context menu vince:
```tsx
<OrbitControls
  mouseButtons={{
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: undefined,  // disabilita pan via right
  }}
/>
```
+ sul container `<div onContextMenu={(e) => { e.preventDefault(); openContextMenu(e.clientX, e.clientY); }}>`. Pan camera spostato su Shift+drag.

---

#### BUG-049 · Carichi/vincoli in world-space invece di screen-space

**ROOT CAUSE**: `components/viewport/LoadRenderer.tsx:11-13` — la scala dell'arrow:
```ts
const arrowScale = useMemo(() => {
  const b = modelBounds(model);
  return Math.max(b.size * 0.15, 0.3);
}, [model]);
```
È world-space puro, scalato dal bounding box del modello. Stesso pattern applicato a `BCRenderer.tsx` (vedi 68 righe totali, struttura simile).

Conseguenze:
- Modello grande → frecce grandi, OK a vista d'occhio iniziale
- Zoom out → frecce minuscole, illeggibili
- Zoom in estremo → frecce gigantesche che escono dal frame

**PATTERN VIOLATO**: screen-space markers come standard CAD/FEM (SAP2000/MIDAS/Robot mostrano frecce di taglia costante in pixel).

**FIX SPECIFICO**: usare `<Html>` da `@react-three/drei` con `sprite` mode + posizionamento 3D, oppure custom `useFrame` che riscala la mesh in funzione di `camera.position.distanceTo(arrowOrigin) * factor`. Stesso fix in `BCRenderer.tsx`.

---

### CLUSTER D · Copy criptico + i18n

#### BUG-029 / BUG-040 / BUG-050 · Termini inglesi visibili a Paoletto

**ROOT CAUSE**: i nomi brand dei macro-panel sono inglesi e usati come label utente, non solo come ID interni. Match in:
- `components/shell/OnboardingTour.tsx:51-60` — sequenza `<strong>Make</strong>`, `<strong>Solve</strong>`, `<strong>Verify</strong>`, `<strong>Inspect</strong>`, `<strong>View</strong>`, `<strong>Tools</strong>`
- `components/shell/OnboardingTour.tsx:126,208-210` — riferimenti ricorrenti
- `components/dialogs/NewModelDialog.tsx:135` — `<b>Make</b>` nel testo
- `shell/panels/tools/CostPreviewView.tsx:27` — `<span>Solve</span>` come label

Inoltre `MakePanel.tsx:38-42` HUB_CARDS subtitle misti: "Wizard DXF/IFC/JSON · Tools export", "line/quad/h8", "Fixed · pinned · rollers · springs".

**PATTERN VIOLATO**: nessun i18n centralizzato (no `t("makePanel.title")` con dictionary). Stringhe hardcoded ovunque.

**FIX SPECIFICO**: la decisione DEC-3 condiziona tutto. Se CAD-classico italiano vince, mappa rinominazione:
- Make → Modella
- Solve → Calcola
- Verify → Verifica
- Inspect → Ispeziona
- View → Visualizza
- Tools → Strumenti

Non c'è infra i18n (`react-i18next` o simili) — viene refactor manuale string-by-string OPPURE introdurre `lib/i18n.ts` come prima cosa.

---

### CLUSTER A · Caos visivo + densità eccessiva

#### BUG-001..005 / BUG-022..026 · Densità Linear-style estrema 10-11px ovunque

**ROOT CAUSE 1 (sistemica)**:
- `text-[10px]` o `text-[11px]`: **547 occorrenze** nelle tsx
- `font-mono`: **432 occorrenze**

Pattern Linear-style replicato su ogni componente. Non è un'accidente locale.

**ROOT CAUSE 2 (token mancanti)**: `design/tokens.ts:83-91` definisce solo size raw:
```ts
fontSize: {
  xs: "11px", sm: "12px", base: "13px", md: "14px",
  lg: "16px", xl: "18px", "2xl": "22px", "3xl": "28px",
}
```
NESSUN token semantico contestuale (`label`, `navigation`, `body`, `caption`). Quindi i 547 callsite usano valori arbitrari (`text-[10px]` direttamente nel className Tailwind) invece di consumare token.

**PATTERN VIOLATO**: design tokens semantici come abstraction layer.

**FIX SPECIFICO**: prima dello Sprint 3 (cluster A), introdurre in `design/tokens.ts`:
```ts
typography: {
  labelMono: { size: "10px", family: "mono", weight: 500, transform: "uppercase" },
  navigation: { size: "13px", family: "ui", weight: 500 },
  body: { size: "14px", family: "ui", weight: 400 },
  caption: { size: "11px", family: "ui", weight: 400 },
}
```
+ classi Tailwind generate (`text-label-mono`, `text-navigation`, `text-body`). Migrazione dei 547 callsite uno per uno (è il vero costo dello sprint A — non un fix banale).

---

#### BUG-038 · Topbar dimensioni sotto standard

**Già coperto da BUG-022** secondo l'UX audit. Da auditare in `components/shell/TopBar.tsx` (33 file import workspaceStore, TopBar è tra questi).

---

### CLUSTER H · Command palette + ricerca

#### BUG-051 · 144 voci in 5 categorie / "commands" 82 voci megabucket

**Già analizzato sotto cluster E** (BUG-051 dual reference). Vedi sopra.

---

#### BUG-052..057 · Voci dinamiche promesse non implementate

**ROOT CAUSE**: `lib/paletteItems.ts:10-14` commento promette "Suggeriti (contesto attuale) — generati dinamicamente" e "Modelli (recenti, da react-query)". Nel registry statico non ci sono — devono essere generati in `CommandPalette.tsx` da hook dedicati. Verifica `hooks/useNavigationCommands.ts` esiste, ma è solo per goto-node/goto-element.

Manca:
- Suggeriti contestuali (cosa dovresti fare adesso, in base allo stato del modello)
- Modelli recenti (da react-query)

**FIX SPECIFICO**: aggiungere in `CommandPalette.tsx` merge runtime con hook `useSuggestedCommands(state)` + `useRecentModels()` (react-query). Sezioni separate nella palette.

---

## Sezione 2 · Bug NUOVI scoperti (architetturali, non in UX_AUDIT)

### ARCH-1 · `useCallback` quasi assente · performance re-render leak

**Evidenza**: grep ricorsivo nel frontend tsx:
- `useEffect(`: 47 occorrenze
- `useMemo(`: 79 occorrenze
- `useCallback(`: **1 occorrenza**

Le funzioni handler passate come prop a child memoizzati si ricreano a ogni render del parent → cascata di re-render. Per il viewport 3D con migliaia di nodi/elementi (`EngineElementRenderer.tsx`, `EngineNodeRenderer.tsx`) l'impatto è serio.

**Severity**: P1 (performance, percezione fluidità).

**FIX SPECIFICO**: audit puntuale dei componenti pesanti (Viewport3D children, ModelTree, CommandPalette) per identificare handler che vanno wrappati in `useCallback`. Out-of-scope per gli sprint cluster A-H ma da pianificare come sprint debt.

---

### ARCH-2 · 90 occorrenze di `any` / `as any` (non-test) · type unsafety in area safety

**Evidenza**: grep ricorsivo escluso `*.test.*`:
- 90 match di `: any\b` o `as any\b`

Concentrazione:
- `components/viewport/EngineElementRenderer.tsx`: 9 occorrenze (`e: any` handler types, `(el as any).pretension`)
- `components/viewport/DropZone.tsx`: 2 occorrenze (catch handler)

Viewport 3D è zona safety-critical (visualizzazione struttura strutturale che decide se "vedi" il bug del solver). `any` qui = bug invisibili a TypeScript.

**Severity**: P1 (debt + safety).

**FIX SPECIFICO**: tipizzare event handlers R3F con `ThreeEvent<MouseEvent>`. Eliminare `(el as any).pretension` aggiungendo il field opzionale al type `LineElementInstance["element"]`.

---

### ARCH-3 · 5 store senza test · invariante non verificata

**Evidenza**: store senza file `.test.ts` paired:
- `billingStore.ts`
- `panelHeaderStore.ts`
- `resultsStore.ts` ← **safety-critical**
- `selectionStore.ts`
- `uiStore.ts`

`resultsStore` contiene i risultati del solver (spostamenti, tensioni, modi, ecc.) → impatto safety strutturale. Senza test:
- Nessuna garanzia che `setResults(new)` non corrompa risultati precedenti durante race.
- Nessuna verifica che reset state (logout, model switch) pulisca tutto.

**Severity**: P0 per `resultsStore`, P2 per gli altri.

**FIX SPECIFICO**: aggiungere `store/resultsStore.test.ts` con test invarianti minimi: reset su logout, no leak tra modelli, immutabilità output.

---

### ARCH-4 · `BackendErrorKind` union chiusa senza contract test

**Evidenza**: `lib/apiErrors.ts:22-31`:
```ts
type BackendErrorKind =
  | "missing_constraints" | "singular_matrix" | "missing_material"
  | "missing_section" | "no_loads" | "invalid_solver_params"
  | "convergence_failed" | "quota_exceeded" | "model_not_found"
  | "validation_failed";
```

Backend Python può emettere altri kind (es. `arc_length_diverged`, `eigenvalue_not_converged`, `nan_in_displacement`). Frontend non li riconosce → utente vede `Errore del solver · arc_length_diverged` (kind raw esposto, vedi caso 1 di `translateApiError`).

**Severity**: P1.

**FIX SPECIFICO**: contract test che enumera kind dal codice Python e verifica coverage in `ERROR_TRANSLATIONS`. Oppure pattern fallback più gentile ("Errore del solver. Codice tecnico: arc_length_diverged. Contatta supporto.").

---

### ARCH-5 · Bridge legacy/shell con cleanup promesso non eseguito

**Evidenza**: `store/workspaceStore.ts:13` — "Cleanup completo dei campi legacy in alpha.27". Stato attuale v2.4.x → debt accumulato.

Il bridge `setWorkspace` ↔ `openLeftPanel` (righe 85-114) è bidirezionale ma:
- Nessun test di invariante "se `currentLeftPanel="make"` allora `workspace="model"`"
- Nessun lint rule che impedisce di settare uno solo dei due

**Severity**: P1.

**FIX SPECIFICO**: aggiungere test `workspaceStore.test.ts` che esegue tutte le transizioni e verifica invariante post-set. Programmare sprint cleanup "alpha.27 promised".

---

### ARCH-6 · Persistenza Zustand frammentata, no garbage collection

**Evidenza**: 4 store con `persist` middleware ognuno con propria chiave localStorage:
- `auth-store` (token)
- `workspace-store` (workspace + currentLeftPanel + currentRightPanel + ...)
- `feapro-left-rail` (openSection)
- `feapro-right-rail` (openSection)

Logout in `authStore` non garbage-collect le altre 3 chiavi → utente B vede residui di sezioni aperte da utente A.

**Severity**: P2 (UX residuo cross-user).

**FIX SPECIFICO**: `authStore.logout` deve chiamare `localStorage.removeItem(...)` per le 3 chiavi shell + reset stores. Pattern: emettere evento `feapro:logout` e ogni store si auto-pulisce.

---

### ARCH-7 · `panelHeaderStore` contiene closure mutabile (anti-pattern)

**Evidenza**: `store/panelHeaderStore.ts:34` — `popDrillIn: (() => void) | null` — è una closure che i componenti scrivono dentro lo store. Pattern anti-React (closure capture stale state se non aggiornata a ogni render). Senza test (vedere ARCH-3).

**Severity**: P2.

**FIX SPECIFICO**: trasformare in event bus (emit `"pop-drill-in"` event) o spostare la logica nei componenti consumer con `currentDrillIn: string | null` (dato, non funzione) + lookup table.

---

### ARCH-8 · Lazy loading parziale, bundle non analizzato

**Evidenza**: `shell/panels/ToolsPanel.tsx:34-37` — `AICopilotPanel` lazy-loaded (commento v1.7-polish T2 "chunk ~50kB con icons"). Tutti gli altri pannelli/dialog importati eagerly.

Stima dimensioni in chunk principale:
- 11 sub-view in ToolsPanel
- 35 dialog/panels in `components/panels/` (`AccelerogramsPanel`, `AICopilotPanel`, `ComparePanel`, `ConvergencePanel`, ecc.)

Nessuna bundle analysis evidente. Probabile first-load 2-3 MB JS per un'app che mostra all'utente solo viewport + topbar al primo render.

**Severity**: P2 (mobile/Paoletto first impression).

**FIX SPECIFICO**: `npm run build` con `--analyze` flag, identificare top 10 chunk, applicare `lazy()` strategicamente sui pannelli usati raramente (Accelerograms, ModeSuperposition, Fatigue, AI Copilot già lazy).

---

## Sezione 3 · Pattern sistemici

### P1 · Dual-write asimmetrico tra store sovrapposti
- Cluster C origine (BUG-014/058/064)
- Manifestazioni multiple già documentate nei commenti del codice (alpha.31 Task 25)
- Costo crescente: ogni nuova interazione richiede di ricordarsi N store da sincronizzare

### P2 · Densità tipografica raw nei className
- 547 callsite `text-[10/11px]`
- Token semantici contestuali assenti
- Refactor visivo = touchpoint massivo

### P3 · `disabled+keyword hint` invece di tooltip esplicativi sistemici
- 12+ callsite documentati, decine probabili
- Manca `FeatureButton` + `preconditions` registry
- UX preventiva degradata a UX reattiva

### P4 · Memoization sbilanciata
- 79 useMemo vs 1 useCallback
- Re-render leak su componenti pesanti (viewport, ModelTree)
- Probabile causa di lag percepito

### P5 · `as any` nei viewport handler safety-critical
- 9 occorrenze in EngineElementRenderer.tsx
- TypeScript bypass in zona "vedi il bug del solver"

### P6 · Mancata propagazione di pattern già definiti
- `apiErrors.ts` è ben fatto ma `BackendErrorKind` non testato contro backend
- Bridge `workspaceStore` ha mapping bidirezionale ma nessun invariante test
- `panelHeaderStore` esiste ma è anti-pattern (closure in store)

Trend: i pattern singoli sono implementati bene, ma manca il **layer di test/lint che ne garantisca l'invarianza** nel tempo. Debt prevedibile.

---

## Sezione 4 · Decisioni architetturali raccomandate per la chat principale

Queste decisioni vanno prese PRIMA di aprire gli sprint cluster, perché condizionano N bug ciascuna:

### DEC-A1 · State consolidation (priorità alta)

Coesistenza `leftRailStore` + `rightRailStore` + `workspaceStore.currentLeft/RightPanel` è insostenibile. Opzioni:
- **(a) workspaceStore unica autorità** + eliminare rail store. Cleanup `workspace` legacy promesso ad alpha.27. Più allineato al brief shell.
- **(b) rail store come unica autorità** + eliminare `currentLeft/RightPanel` da workspaceStore. Più semplice ma perde l'aspetto "tabbed" del brief.

Raccomandazione: (a). Costo ~1 sprint dedicato. Sblocca cluster C alla radice e tutti i bug di "pannello fantasma".

### DEC-A2 · ErrorBoundary come Sprint 0 (priorità alta)

Aggiungere ErrorBoundary in `main.tsx` è single-file change da 30 min. Va fatto SUBITO prima di qualunque sprint UX altrimenti regressioni fanno white-screen.

### DEC-A3 · Token semantici contestuali come pre-Sprint 3

Prima di toccare cluster A (visual hierarchy), introdurre token semantici (`labelMono`, `navigation`, `body`, `caption`) altrimenti i 547 callsite vanno toccati uno per uno con probabilità altissima di regressione visiva.

### DEC-A4 · FeatureButton + preconditions registry come pre-Sprint 2

Prima di toccare cluster F, creare `lib/preconditions.ts` + `components/ui/FeatureButton.tsx`. Senza, ogni callsite reimplementa logica e tooltip in modo incoerente.

### DEC-A5 · Contract test backend↔frontend per BackendErrorKind

Stabilire processo per cui ogni kind backend nuovo deve essere mappato in `ERROR_TRANSLATIONS` prima del merge. Test runtime o sync OpenAPI.

### DEC-A6 · `panelHeaderStore` refactor

Migrare da closure-in-store a evento bus o stato semplice. Non urgente ma da non far crescere.

---

## Sezione 5 · Quick wins (<30 min, chiudono >5 bug ciascuno o sbloccano cluster)

### QW-1 · GizmoHelper bottom-right (5 min)

**File:linea**: `components/viewport/Viewport3D.tsx:131`
**Modifica**: `alignment="top-right"` → `alignment="bottom-right"`
**Chiude**: BUG-035 + qualsiasi finding "gizmo in alto disturba"
**Rischio**: nullo
**Test**: visual regression baseline

### QW-2 · ErrorBoundary globale (15 min)

**File:linea**: `src/main.tsx:24` (wrap App)
**Modifica**: nuovo `components/ui/ErrorBoundary.tsx` + import in main.tsx
**Chiude**: BUG-011 + BUG-012 + categoria white-screen + tutte le future regressioni che crashano un sub-tree
**Rischio**: minimo (boundary cattura, fallback mostra UI italiana)
**Test**: unit test + manual trigger via componente broken

### QW-3 · OrbitControls mouseButtons esplicito (20 min)

**File:linea**: `components/viewport/Viewport3D.tsx:126-130`
**Modifica**: aggiungere `mouseButtons={{LEFT: ROTATE, MIDDLE: DOLLY, RIGHT: undefined}}` + `onContextMenu` handler sul container Canvas
**Chiude**: BUG-048 (dopo decisione DEC-1) + sblocca context menu (BUG-? sentiment Paoletto)
**Rischio**: basso (cambio convenzione interaction, va comunicato in onboarding)
**Test**: Playwright click destro su nodo → context menu visibile

### QW-4 · Dual-write LeftRail (25 min, condizionato a DEC-A1)

**File:linea**: `components/shell/LeftRail.tsx:55-58` + `shell/panels/MakePanel.tsx:55-60`
**Modifica**: rimuovere chiamata `useLeftRailStore.toggle(item.key)`, sostituire con `useWorkspaceStore.getState().openLeftPanel(LEGACY_TO_LEFT[item.key])`. Far leggere `LeftSlidePanel` da `workspaceStore.currentLeftPanel`.
**Chiude**: cluster C alla radice (BUG-014/058/064)
**Rischio**: medio (cambio store consumato da `LeftSlidePanel`, va testato che hydration su reload funzioni)
**Test**: Playwright sequence (open Make, close Make, refresh, verifica panel chiuso) + unit `workspaceStore.test.ts`

### QW-5 · Disabled hint → Tooltip explicativi su ViewPanel (30 min)

**File:linea**: `shell/panels/ViewPanel.tsx:401-449` (componente `Toggle` interno)
**Modifica**: rimpiazzare lo `<span>{disabledHint}</span>` con `<Tooltip content={`Disponibile dopo: ${disabledHint === "statica" ? "esegui analisi statica" : ...}`}>`. Mappa `disabledHint` → descrizione completa.
**Chiude**: BUG-031 (subset) + sblocca pattern per cluster F completo
**Rischio**: nullo (additivo, non rompe)
**Test**: visual + manuale

### QW-6 · GizmoViewport label color sempre visibile (5 min)

**File:linea**: `components/viewport/Viewport3D.tsx:134-135`
**Verifica visiva post-QW1**: dopo spostare bottom-right, verificare che `axisColors` siano leggibili su sfondo scuro.

---

## Appendice · File ispezionati

| File | Righe lette | Cluster coperto |
|---|---|---|
| `store/leftRailStore.ts` | 1-49 (full) | C |
| `store/rightRailStore.ts` | 1-42 (full) | C |
| `store/workspaceStore.ts` | 1-154 (full) | C |
| `store/panelHeaderStore.ts` | 1-60 (full) | C / ARCH-7 |
| `shell/types.ts` | 1-72 (full) | C |
| `components/shell/LeftRail.tsx` | 1-80 | C |
| `components/shell/LeftSlidePanel.tsx` | 1-33 (full) | C |
| `components/shell/RightRail.tsx` | grep | C |
| `components/shell/RightSlidePanel.tsx` | grep | C |
| `shell/panels/MakePanel.tsx` | 1-170 / 309 | C, E, D |
| `shell/panels/SolvePanel.tsx` | 155-200 | F |
| `shell/panels/ViewPanel.tsx` | 195-230 + 395-449 | F, A |
| `shell/panels/ToolsPanel.tsx` | 1-50 | E |
| `lib/apiErrors.ts` | 1-171 (full) | B |
| `api/client.ts` | 1-80 | B |
| `src/main.tsx` | 1-28 (full) | B |
| `App.tsx` | 390-420 | C |
| `components/viewport/Viewport3D.tsx` | 115-168 | G |
| `components/viewport/ScaleIndicator.tsx` | 1-26 (full) | G |
| `components/viewport/LoadRenderer.tsx` | 1-55 | G |
| `lib/paletteItems.ts` | 1-40 + grep counts | H |
| `design/tokens.ts` | 1-132 (full) | A |

---

**Documento generato**: 2026-05-25
**Origine**: audit architetturale chirurgico statico
**Autore**: Claude (auditor mode)
**Da rivedere con**: chat principale FEA Pro + Federico
**Versione**: 1.0
