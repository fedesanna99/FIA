# Context snapshot per chat PM (Federico)

**Generato**: 2026-05-26
**HEAD**: `2de196a` · tag `v2.6.2.1-shell-polish` (post deploy v87)
**Branch attivo (worktree)**: `design-rebuild/v2.6`
**Sync**: HEAD = origin/test = origin/main = `2de196a` ✅
**Deploy live**: https://fea-pro.fly.dev/ release **v87** · health HTTP 200
**Quality gate baseline**: pytest **1677 collected** · vitest **695/695 PASS** (84 file) · tsc **0 errori** · build main chunk **~1.3 MB** (`frontend/dist/assets/index-NxwdMImZ.js`)

Scopo del documento: snapshot mirato del codice rilevante per pianificare
i prossimi sprint (mobile quick fix, Fase 3 desktop, bug emergenti). NON è
un audit completo, è un compendio per chat strategy PM.

Tag list (ultimi 5):
- `v2.6.2.1-shell-polish` ← HEAD
- `v2.6.2-shell`
- `v2.6.1-foundation`
- `v2.5.0-paolo-ready`
- `v2.5.9-paolo-readiness-gate`

---

## T1 · Shell rebuild (Fasi 1-2.5)

Tutti i file `frontend/src/shell/`:

| File | Righe | Ruolo |
|------|-------|-------|
| `Shell.tsx` | 65 | Orchestrator: layout grid 48/1fr/28 × 56/1fr/380. Compone TopBar+Rail+Viewport(children)+Panel+StatusBar+CommandPalette |
| `ShellTopBar.tsx` | 188 | TopBar h-48 con brand+model+save+trust+⌘K+run+icons. Export `ShellTopBar` + `modelShortId(model)` |
| `ShellRail.tsx` | 121 | Rail w-56 con 5 workspace + auto-detect + docs + settings |
| `ShellViewport.tsx` | 38 | Wrapper Canvas + 6 HUD overlay |
| `ShellPanel.tsx` | 153 | RightPanel w-380 + Radix Tabs + ShellPanelSection helper |
| `ShellStatusBar.tsx` | 66 | StatusBar h-28 con counters + version |
| `ShellCommandPalette.tsx` | 199 | cmdk + Radix Dialog; legge `PALETTE_ITEMS` registry (140 voci) via `usePaletteDispatch` |
| `hud/ViewportHudLegend.tsx` | 38 | Colormap σ Von Mises top-left |
| `hud/ViewportHudControls.tsx` | 56 | Persp/Ortho/Solid/Wire/Grid top-right |
| `hud/ViewportHudSelection.tsx` | 29 | Selection breadcrumb top-center (conditional) |
| `hud/ViewportHudGizmo.tsx` | 32 | XYZ axes SVG 88×88 bottom-right (placeholder, GizmoHelper drei resta dentro Viewport3D) |
| `hud/ViewportHudRuler.tsx` | 41 | Scale dinamica via `viewportCameraStore.metersPerScreenHeight` bottom-left |
| `hud/ViewportHudZoom.tsx` | 32 | Pan/Zoom/Fit/Maximize bottom-center |
| `types.ts` | 72 | Type definitions (ShellState, ShellActions, LeftPanelId, RightPanelId) |

**Workspace content (pre-existing pipeline UX, ospitati da ShellPanel via passthrough)**:
- `panels/MakePanel.tsx`, `panels/SolvePanel.tsx`, `panels/VerifyPanel.tsx`, `panels/InspectPanel.tsx`, `panels/ToolsPanel.tsx`, `panels/ViewPanel.tsx`
- `panels/PanelChrome.tsx`, `panels/CostPreviewCard.tsx`, `panels/inspect/NodeDetail.tsx`
- `panels/tools/AutoDetectView.tsx`, `panels/tools/CostPreviewView.tsx`, `panels/tools/ExportView.tsx`, `panels/tools/MeasureSnapshotView.tsx`, `panels/tools/ToolsHub.tsx`, `panels/tools/ValidationView.tsx`

**Registry palette (pre-existing, used by Shell e legacy palette)**:
- `palette/CommandRegistry.ts`, `palette/types.ts`, `palette/useCommandRegistry.ts`

### Shell.tsx (orchestrator, riga 47-65 chiave)

```tsx
type ShellWorkspaceId = "modello" | "analisi" | "risultati" | "verifiche" | "io";

interface ShellProps {
  children: ReactNode;  // Canvas R3F (Viewport3D) montato dal chiamante
}

const WORKSPACE_CONTENT: Record<ShellWorkspaceId, ReactNode> = {
  modello: <MakePanel />,
  analisi: <SolvePanel />,
  risultati: <InspectPanel />,
  verifiche: <VerifyPanel />,
  io: <ToolsPanel />,
};

export function Shell({ children }: ShellProps) {
  const [activeWs, setActiveWs] = useState<ShellWorkspaceId>("modello");
  return (
    <div className="shell shell-soft shell-density-comfy shell-panel-w-380 shell-vp-neutral theme-light">
      <ShellTopBar />
      <div className="shell-mid">
        <ShellRail active={activeWs} onChange={setActiveWs} />
        <ShellViewport>{children}</ShellViewport>
        <ShellPanel workspace={activeWs}>{WORKSPACE_CONTENT[activeWs]}</ShellPanel>
      </div>
      <ShellStatusBar />
      <ShellCommandPalette />
    </div>
  );
}
```

---

## T2 · `useNewShell` · rendering condizionale

**File**: `frontend/src/App.tsx:486`

```tsx
// v2.6.2 T9: usa la nuova Shell quando l'utente ha un modello attivo,
// è su desktop, e non è in focus mode. Negli altri casi (Dashboard
// home, mobile, focus mode) resta il chrome legacy.
const useNewShell = activeId !== null && !isMobile && !isFocusMode;
```

**Callsite (chi legge `useNewShell`)**:

| File:riga | Pattern |
|---|---|
| `App.tsx:486` | Definizione `const useNewShell = ...` |
| `App.tsx:531` | `{useNewShell ? <Shell>{...}</Shell> : <>{/* chrome legacy */}</>}` |

**Solo 2 callsite**: la condizione vive interamente in App.tsx. Non c'è un hook esposto `useNewShell()` — è una local const. Se Fase 3 richiede di leggerla da componenti figli (es. per disabilitare un overlay legacy), bisogna o promuoverla a context o passarla come prop.

**App.tsx:531-548 (codepath useNewShell=true)**:

```tsx
{useNewShell ? (
  <Shell>
    {/* v2.6.2.1 F1: ViewportCanvasTabs legacy rimosso (i 5 tab sono ora
        nella ShellPanel come Radix Tabs). Viewport3D in modalità
        suppressHud per evitare i chip ViewportHud legacy. */}
    <div className="absolute inset-0">
      <Viewport3D suppressHud />
    </div>
    <DropZone onImported={(id) => setActiveId(id)} />
    <SolverOverlay />
  </Shell>
) : (
  <>
    {/* chrome legacy: TopBar, MissionBar, LeftRail, LeftSlidePanel,
        Viewport3D senza suppressHud, RightRail, RightSlidePanel,
        MobileTabbar (mobile), MobilePanel (mobile), StatusBar,
        CommandPalette legacy */}
    ...
  </>
)}
```

---

## T3 · Stack mobile attuale

`useIsMobile` (`frontend/src/hooks/useIsMobile.ts`, 30 righe):

```ts
export function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.innerWidth < breakpoint : false,
  );
  useEffect(() => {
    if (typeof window === "undefined") return;
    const check = () => setIsMobile(window.innerWidth < breakpoint);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [breakpoint]);
  return isMobile;
}
```

Default breakpoint **768px** (Tailwind `md`). Window resize listener, no matchMedia.

### `frontend/src/components/shell/MobileTabbar.tsx` (74 righe)

- **Ruolo**: barra fissa bottom-screen mobile, 5 voci [Modello/Make/Solve/Risultati/Altro]
- **State**: `workspaceStore.currentMobileTab` (null = viewport visibile)
- **Tailwind chiave**: `fixed bottom-0 left-0 right-0 z-40 bg-bg-panel border-t border-border safe-area-bottom safe-area-x`, height `h-14` (56px)
- **Dipendenze**: `workspaceStore.setMobileTab`, lucide icons (Box, Hammer, Zap, BarChart3, MoreHorizontal)
- **Active state**: `text-accent bg-bg-info border-accent` con border-t-2

### `frontend/src/components/shell/MobilePanel.tsx` (135 righe)

- **Ruolo**: wrapper full-screen per pannelli mobile (apre quando si tocca Make/Solve/Risultati/Altro)
- **Props**: `title: string`, `onBack: () => void`, `children: ReactNode`
- **Feature v1.8.5 T2**: edge-swipe-back gesture (iOS-style), threshold 40px dal bordo, swipe 80px in <600ms → triggera back smart
- **Feature v2.1.6 nav-dedup**: header SMART con drill-in dual-line ("Verifiche · Live"). Legge `usePanelHeaderStore.current`, `popDrillIn` come back-handler condizionale
- **Tailwind chiave**: `absolute inset-0 bg-bg-panel z-30 flex flex-col animate-slide-right`, body `overflow-y-auto overflow-x-hidden min-h-0 min-w-0`
- **Dipendenze**: `panelHeaderStore`, lucide ArrowLeft

### `frontend/src/components/shell/MobileMoreMenu.tsx` (162 righe)

- **Ruolo**: contenuto del tab "Altro" mobile (lista 8 voci: Verifiche, View, Tools, Cerca, AI Copilot, Theme toggle, Account, Focus)
- **Pattern**: array di MenuRow + button list con icon 10×10 bg-bg-info + label/sub + chevron
- **Tailwind chiave**: `p-3 space-y-1.5`, button `w-full inline-flex items-center gap-3 p-3 border border-border bg-bg-elevated hover:bg-bg-hover hover:border-accent/50`
- **Dipendenze**: `workspaceStore` (setTab, setPalette, enterEmptyState), `themeStore` (mode, setMode)

### App.tsx mobile-related (riga 488-508)

```tsx
const mobilePanelInfo: Record<"make" | "solve" | "results" | "more",
  { title: string; content: React.ReactNode }
> = {
  make:    { title: "Make",      content: <MakePanel /> },
  solve:   { title: "Solve",     content: <SolvePanel /> },
  results: { title: "Risultati", content: <InspectPanel /> },
  more: {
    title:
      mobileMoreSub === "verify" ? "Verifiche" :
      mobileMoreSub === "tools" ? "Strumenti" :
      mobileMoreSub === "view" ? "View" :
      "Altro",
    content:
      mobileMoreSub === "verify" ? <VerifyPanel /> :
      mobileMoreSub === "tools" ? <ToolsPanel /> :
      mobileMoreSub === "view" ? <ViewPanel /> :
      <MobileMoreMenu />,
  },
};
```

**NOTA chiave per il PM**: oggi su mobile NON viene mostrata la nuova `Shell` (la condizione `useNewShell` esclude `isMobile`). Mobile usa il **chrome legacy** (TopBar legacy + MobileTabbar + MobilePanel). Decidere strada A (rebuild mobile dentro nuova Shell) vs C (quick fix sui legacy) è ancora aperto.

---

## T4 · ViewportHud / ViewportCanvasTabs (origine bug M1/M2/M3)

### `frontend/src/components/viewport/ViewportHud.tsx` (111 righe)

Render JSX completo (riga 48-89):

```tsx
return (
  <div className="absolute top-3.5 left-3.5 right-3.5 z-toolbar flex flex-wrap items-start gap-2 pointer-events-none">
    <Chip icon={<Box className="w-3 h-3" />} className="max-w-[220px]" title={model.name}>
      {model.name}
    </Chip>
    <Chip
      icon={<Layers className="w-3 h-3" />}
      className="max-w-[260px]"
      title={`${nNodes} nodi · ${nElems} elem · ${material}`}
    >
      {nNodes} nodi · {nElems} elem · {material}
    </Chip>
    <button
      className="pointer-events-auto max-w-[220px] min-w-0 bg-bg-panel border border-border px-2.5 py-1.5 flex items-center gap-1.5 text-[11px] text-ink-2 hover:text-ink hover:bg-bg-hover shadow-pop font-mono transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
      onClick={() => window.dispatchEvent(new CustomEvent("feapro:open-view-panel"))}
      title="Apri cockpit View"
      data-testid="viewport-hud-open-view"
    >
      <SlidersHorizontal className="w-3 h-3 flex-shrink-0" />
      <span className="truncate">
        {PRESET_LABELS[activeViewPreset]} · {renderLabel} · {cameraLabel} · L{activeBaseLayers}
      </span>
    </button>
    <button
      className={`pointer-events-auto flex-shrink-0 bg-bg-panel border px-2.5 py-1.5 flex items-center gap-1.5 text-[11px] shadow-pop font-mono transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 ${
        useViewportEngine ? "border-accent text-accent" : "border-border text-ink-2 hover:text-ink hover:bg-bg-hover"
      }`}
      onClick={toggleViewportEngine}
      title={useViewportEngine ? `ViewportEngine attivo (${stats.compressionRatio.toFixed(1)}x)` : "Attiva ViewportEngine GPU-first"}
    >
      <Gauge className="w-3 h-3 flex-shrink-0" />
      Engine
    </button>
  </div>
);
```

Container outer: `absolute top-3.5 left-3.5 right-3.5 z-toolbar flex flex-wrap items-start gap-2 pointer-events-none`
- **Z-index**: `z-toolbar` = 20 (definito in `tailwind.config.js`)
- **Layout**: flex-wrap horizontal con gap-2 (8px), top 14px, left/right 14px → su mobile <768 i 4 chip wrappano in 2-3 righe
- **`pointer-events-none`** sul container ma `pointer-events-auto` sui 2 button (chip 3 e 4) → solo i button sono cliccabili

I 4 chip floating:
1. **Box icon** + nome modello (es. "Telaio portale 2D"), max-w 220px
2. **Layers icon** + `{N} nodi · {E} elem · {material}` (es. "5 nodi · 4 elem · S275"), max-w 260px
3. **Sliders icon** + `{preset} · {render} · {projection} · L{layers}` (es. "Tecnica · Solido · Persp · L3"), max-w 220px button
4. **Gauge icon** + "Engine" toggle, border accent se attivo

Note:
- **Componente accetta `suppressHud` prop?** NO. Il suppression v2.6.2.1 F1 è esterno: `Viewport3D.tsx` riceve `suppressHud` e fa `{!suppressHud && <ViewportHud />}`.
- **Responsive media query**: NESSUNA. Il componente non ha `sm:`/`md:`/`lg:`. Il `flex-wrap` è l'unico responsive behaviour → sotto 768px i chip si impilano verticalmente.
- **Origine bug overlap card**: il container è `top-3.5 left-3.5 right-3.5` → su mobile + Notch + safe-area può uscire dal viewport o sovrapporsi alla MobileTabbar/StatusBar legacy.

### `frontend/src/components/shell/ViewportCanvasTabs.tsx` (112 righe)

Container outer: `flex items-center gap-3.5 px-3.5 py-2 bg-bg-panel border-b border-border` (renderizzato sopra Viewport con `absolute top-0 left-0 right-0 z-10` da App.tsx)

5 tab tabs `["model", "loads", "mesh", "results", "checks"]`. Active state: `text-accent border-accent bg-accent-subtle`. Counters opzionali a destra (nodi/elementi/DOF).

Note:
- **Accept suppress prop?** NO. Rimozione nel codepath nuova Shell è fatta in App.tsx (non più montato dentro `<Shell>`).
- **Responsive**: NESSUNA media query interna. Su mobile si schiaccia, su 375px alcuni tab uppercase escono dal viewport.
- **Custom event**: dispatchea `feapro:viewport-tab` su click. Backward compat con resultsStore / loadsStore.

---

## T5 · Moduli core pipeline UX

### `frontend/src/lib/preconditions.ts` (229 righe)

- **Type principali**:
  - `PreconditionId` = `"model-exists" | "model-has-constraints" | "model-has-loads" | "static-results-exist" | "modal-results-exist" | "node-selected" | "element-selected" | "history-can-undo" | "history-can-redo"`
  - `FeatureId` = 16 features (vedi sotto)
  - `FeatureConfig` = `{ requires: PreconditionId[]; disabledLabel: string; disabledAction: FeatureId | null; disabledActionLabel: string | null }`
  - `AppPreconditionState` = `{ model, staticResults, modalResults, selectedNodeIds, selectedElementIds, canUndo, canRedo }`

- **16 features registrate**:
  1. `run-static` (requires model + constraints + loads)
  2. `run-modal` (requires model + constraints)
  3. `run-buckling` (requires model + constraints + loads)
  4. `verify-ec3` (requires staticResults; propose `run-static`)
  5. `verify-ec2` (requires staticResults; propose `run-static`)
  6. `verify-ec8` (requires staticResults; propose `run-static`)
  7. `export-pdf` (requires model)
  8. `export-xlsx` (requires model)
  9. `inspect-node` (requires node-selected)
  10. `inspect-element` (requires element-selected)
  11. `undo` (requires history-can-undo)
  12. `redo` (requires history-can-redo)
  13. `view-deformed` (requires staticResults; propose `run-static`)
  14. `view-stress-colormap` (requires staticResults; propose `run-static`)
  15. `view-isosurfaces` (requires staticResults; propose `run-static`)
  16. `view-mode-shapes` (requires modalResults; propose `run-modal`)

- **Helper esportati**: `FEATURE_PRECONDITIONS` (record), `evaluatePrecondition(id, state)`, `checkFeature(featureId, state)`
- **Pattern d'uso**: tramite `<FeatureButton featureId="run-static">` (wrapper Button + Tooltip Radix) + hook `useFeaturePreconditionState`

### `frontend/src/lib/usePaletteDispatch.ts` (310 righe)

Hook dispatcher condiviso v2.6.2.1 F2.

- **Hook signature**: `export function usePaletteDispatch(): (item: PaletteItem, onComplete?: () => void) => void`
- **Action kinds gestiti (17 totali)** via switch su `item.actionKind`:
  `workspace | right-panel | tools-view | dialog | theme | run-analysis | external-link | openHelp | openAccount | openLocation | openAuth (no-op) | openExport | logout | open-template-gallery | open-wizard | open-import-wizard | apply-material | apply-section | toggle-view | view-preset | quick-export | goto-node | goto-element | focus-toggle | togglePalette`
- **Dipendenze store**: `useWorkspaceStore`, `useRightRailStore`, `useLeftRailStore`, `useUIStore`, `useAnalysisStore`, `useModelStore`, `useResultsStore`, `useThemeStore`, `useAuthStore`, `useSelectionStore`, `useWizardStore`
- **Helpers**: `useRunAnalysis()` hook, `useQueryClient()` per cache invalidation, `toast()`, `viewportCanvasDataUrl`, `quickExport`
- **Used by**: `ShellCommandPalette.tsx` (Shell nuova). Legacy `CommandPalette.tsx` ha ANCORA il dispatcher interno duplicato (migration unificata: Fase 5).

### `frontend/src/lib/paletteItems.ts` (421 righe)

- **Items totali**: **PALETTE_ITEMS** ha **144 entries** (statiche; +runtime dinamici `goto-node`/`goto-element` da useNavigationCommands)
- **Sezioni (`PaletteSection`)**: `commands | panels | settings | loads | help | favorites` (favorites runtime-only)
- **Sub-array privati**: `PANELS`, `COMMANDS`, `SETTINGS`, `LOADS`, `HELP`, `MATERIALS`, `SECTIONS`, `WIZARDS_EXTRA`, `VIEW_TOGGLES`, `CLIMATE_PRESETS`, `QUICK_EXPORT`, `HELP_TOPICS`, `QUICK_RUN` (13 sub-array concatenati in PALETTE_ITEMS)
- **Export aggiuntivi**: `SECTION_LABELS`, `SECTION_ORDER`, `PALETTE_COUNT`
- **PaletteItem shape**: `{ id, label, description?, aliases?, section, group?, icon?, shortcut?, actionKind, payload?, needsModel?, soon? }`

### `frontend/src/lib/apiErrors.ts` (201 righe)

- **Funzione `toastApiError` signature**:
  ```ts
  export function toastApiError(
    err: unknown,
    action: string,
    toastFn: (level: ToastLevel, message: string, ttlMs?: number) => void = toast,
  ): void
  ```
  Pattern d'uso: `toastApiError(e, "Errore generazione PDF")` → toast con messaggio italiano umano.

- **Backend error kinds gestiti (11)**: `missing_constraints | singular_matrix | missing_material | missing_section | no_loads | invalid_solver_params | convergence_failed | quota_exceeded | model_not_found | validation_failed | solver_not_dispatched`

- **Mapping `ERROR_TRANSLATIONS` (esempi)**:
  - `missing_constraints` → "Aggiungi almeno un vincolo prima di lanciare l'analisi (struttura labile)."
  - `singular_matrix` → "La matrice di rigidezza e' singolare. Controlla che i vincoli impediscano i moti rigidi."
  - `missing_material` → "Assegna un materiale all'elemento E{element_id}."
  - `missing_section` → "Assegna una sezione all'elemento E{element_id}."
  - `no_loads` → "Nessun carico applicato — l'analisi darebbe 0 spostamenti."
  - `invalid_solver_params` → "Parametri solver non validi: {detail}."
  - `convergence_failed` → "Il solver non e' convergito dopo N iterazioni. Prova con piu' step o tolleranza piu' alta."
  - `quota_exceeded` → "Quota crediti esaurita per questo mese. Vai a 'Account → Usage' per dettagli."
  - `model_not_found` → "Modello non trovato. Potrebbe essere stato eliminato in un'altra sessione."
  - `validation_failed` → "Il modello contiene errori di validazione. Apri il pannello 'Tools → Validazione' per dettagli."
  - `solver_not_dispatched` → "Il solver richiesto non e' registrato nel sistema. Contatta l'assistenza con il codice tecnico riportato."

Fallback: FastAPI 422 validation errors `{ detail: [{ loc, msg, type }] }` → primo messaggio + nome campo. Error instance → message + "Errore di rete". Sconosciuto → "Errore sconosciuto" + serialize sicuro.

---

## T6 · Store Zustand attivi (24 store)

| File | Righe | State shape (campi top-level) | Persist? | Ruolo |
|------|-------|-------------------------------|----------|-------|
| `analysisStore.ts` | (n/a, ampio) | analysisType, isRunning, progress, viewportMode, projection, showGrid, showLoads, showConstraints, showNodeLabels, showDiagrams, showPrincipals, activeViewPreset, snapEnabled, snapResolution, viewportTool, useViewportEngine, staticParams, modalParams, dynamicParams | NO | Stato corrente del solver + viewport overlays + tool mode |
| `authStore.ts` | (n/a) | user, token, isAuthenticated, isBooting | YES `feapro-auth` | Auth state + bootstrap |
| `billingStore.ts` | (n/a) | quota | NO | Billing/quota status |
| `climateStore.ts` | (n/a) | bundle (location-based loads) | YES | Climate loads cache |
| `commentsStore.ts` | (n/a) | comments[] | YES | Annotazioni collab |
| `historyStore.ts` | (n/a) | past[], future[] (FEAModel snapshots) | NO | Undo/redo history |
| `jobsStore.ts` | (n/a) | activeJob, jobs[] | NO | Job tracking (WS progress) |
| `leftRailStore.ts` | 50 | openSection (make/solve/verify) | NO | Left rail panel state |
| `measurementsStore.ts` | 118 | measurements[] | NO | Misure manuali viewport |
| `modelStore.ts` | 237 | model (FEAModel \| null), lastSavedAt, selectedNodeIds, selectedElementIds, hover, ...mutations | NO (history via historyStore) | **Core**: modello attivo + undo/redo (`undo()`/`redo()` da history) |
| `notificationsStore.ts` | 85 | items[] (read/unread) | NO | Bell counter |
| `panelHeaderStore.ts` | 52 | current, popDrillIn | NO | Mobile drill-in state per MobilePanel header |
| `resultsStore.ts` | 104 | staticResults, modalResults, dynamicResults, showDeformed, showStressColormap, showIsosurfaces, modelHashAtAnalysis | NO | Risultati + overlay toggle |
| `rightRailStore.ts` | 44 | openSection (inspect/view/tools/history) | NO | Right rail panel state |
| `selectionStore.ts` | 32 | selectedNodeId, selectedElementId (single) | NO | Inspector selection (single, separato da modelStore multi-set) |
| `snapshotStore.ts` | 91 | snapshots[] | YES | Snapshot model A/B per compare |
| `themeStore.ts` | 101 | mode ("dark"\|"light"\|"system"), resolved, init() | YES `feapro-theme` | Dark/light + system listener |
| `toastStore.ts` | 59 | toasts[] | NO | Toast queue |
| `uiStore.ts` | 44 | openDialog (NodeDialog/ElementDialog/...), editNodeId, editElementId, ... | NO | Dialog state global |
| `viewportCameraStore.ts` | 25 | metersPerScreenHeight (10Hz throttled da CameraTracker) | NO | Pubblica camera state per ScaleIndicator dinamico (v2.5.7) |
| `wizardStore.ts` | 50 | active (WizardKind), payload | NO | Hub generico wizard (sismica-th, push-over, ecc.) |
| `workspaceStore.ts` | 154 | workspace (model/analysis/verify/docs), activeTab, helpOpen, paletteOpen, currentMobileTab (`null`\|model\|make\|solve\|results\|more), currentLeftPanel, currentRightPanel, isEmptyState, ... | YES `feapro-workspace` | Workspace + mobile tab + palette + focus mode |

**Note**:
- `workspaceStore` ha bridge legacy↔brief (`workspace`/`activeTab` vs `currentLeftPanel`/`currentRightPanel`) — pulizia promessa da DEC-A1 ancora pending.
- `modelStore.undo()` / `redo()` invocano `useModelHistory` (history snapshot push-on-mutation).

---

## T7 · Tokens design system Soft v2.1

### `frontend/src/styles/tokens.css` (220 righe)

Categorie CSS var:
- **Surfaces** (5 livelli): `--bg`, `--bg-panel`, `--bg-elevated`, `--bg-hover`, `--bg-viewport`, `--bg-active`
- **Borders** (3 strengths): `--border`, `--border-light`, `--border-strong`
- **Ink** (4 livelli): `--ink`, `--ink-muted`, `--ink-dim`, `--ink-faint`
- **Accent** (cyan singular): `--accent`, `--accent-hover`, `--accent-active`, `--accent-subtle`, `--accent-rgb`
- **Semantic ink**: `--success`, `--warn`, `--coral`, `--purple`, `--danger`, `--info`
- **Semantic tinted backgrounds**: `--bg-success`, `--bg-warn`, `--bg-coral`, `--bg-purple`, `--bg-info`, `--bg-danger`
- **Shadow**: `--shadow-pop`, `--shadow-elev`, `--shadow-card`, `--shadow-dialog`, `--shadow-hover`
- **Radius** (Soft default, Sharp opt-in via `data-radius="sharp"`): `--r-xs` (4), `--r-sm` (6), `--r-md` (8), `--r-lg` (10), `--r-xl` (12), `--r-2xl` (16), `--r-3xl` (20), `--r-full` (9999)
- **Motion**: `--d-fast` (120ms), `--d-mid` (200ms), `--d-slow` (360ms), `--ease-standard`, `--ease-decelerate`, `--ease-accelerate`
- **Fonts**: `--font-sans` (Inter), `--font-display` (Plus Jakarta Sans), `--font-mono` (JetBrains Mono)
- **Type scale**: `--fs-xs/sm/base/md/lg/xl/2xl/3xl/4xl/5xl` (11px → 56px)
- **Letter spacing**: `--ls-tight-1..4`, `--ls-wide-1..4`
- **Spacing**: `--sp-0..20` (4px scale)
- **Z-index**: `--z-viewport` (0), `--z-panel` (10), `--z-toolbar` (20), `--z-dropdown` (30), `--z-popover` (35), `--z-dialog` (40), `--z-toast` (50), `--z-tooltip` (60), `--z-loader` (70)

Header (righe 1-50, light palette):
```css
:root, :root[data-theme="light"] {
  color-scheme: light;
  --bg:           #FAFAFA;
  --bg-panel:     #FFFFFF;
  --bg-elevated:  #FFFFFF;
  --bg-hover:     #F4F5F7;
  --bg-viewport:  #F4F5F7;
  --bg-active:    #E6F1FB;
  --border:         #E5E6E8;
  --border-light:   #D4D6DA;
  --border-strong:  #A8ACB3;
  --ink:        #15161A;
  --ink-muted:  #4A4F57;
  --ink-dim:    #7B808A;
  --ink-faint:  #B0B5BD;
  --accent:         #0891B2;
  --accent-hover:   #0E7490;
  --accent-active:  #155E75;
  --accent-subtle:  #ECFEFF;
  --accent-rgb:     8,145,178;
  ...
}
```

Dark palette (righe 73-117, opt-in `[data-theme="dark"]`):
```css
:root[data-theme="dark"] {
  color-scheme: dark;
  --bg:           #0E1014;
  --bg-panel:     #16191F;
  --bg-elevated:  #1D2128;
  --bg-hover:     #1D2128;
  --bg-viewport:  #08090C;
  --bg-active:    #15314A;
  --ink:        #F2F4F7;
  --ink-muted:  #B5BAC2;
  --ink-dim:    #80868F;
  --ink-faint:  #555C66;
  --accent:        #6EDDF5;
  --accent-hover:  #88E2F5;
  --accent-active: #5DD7F2;
  --accent-subtle: rgba(110,221,245,0.12);
  --accent-rgb:    110,221,245;
  ...
}
```

### `frontend/src/styles/tokens.ts` (163 righe)

Mirror TS-only dei tokens. Export principali:
- `tokens` object: `{ color: {...}, font: { sans, display, mono }, radius: {...}, shadow: {...}, motion: { fast, mid, slow, easeStandard, easeDecelerate, easeAccelerate }, zIndex: {...}, spacing: {...} }`
- Per lookup tipato in Tailwind config (`tokens.font.sans.split(",").map(...)`) e helper TS che leggono i tokens senza CSS var resolution.

### `frontend/src/styles/shell.css` (996 righe)

Adattamento di `nuovo-guscio.css` (Fase 2 v2.6.2). Sezioni principali (commenti `/* ── X ── */`):
1. Layout shell (`.shell`, `.shell-mid` grid)
2. TopBar v2 (`.shell-topbar`, `.tb-brand`, `.tb-mark`, `.tb-model`, `.tb-save`, `.tb-trust`, `.tb-search`, `.tb-iconbtn`, `.tb-run`, `.tb-avatar`)
3. Left Rail (`.shell-rail`, `.rail-btn`, `.rail-tooltip`, `.rail-sep`, `.rail-spacer`)
4. Viewport area (`.shell-viewport`, `.vp-grid`, `.vp-grid-major`, `.vp-canvas`, `.vp-svg`)
5. HUD floating panels (`.vp-hud`, `.vp-legend`, `.vp-controls`, `.vp-gizmo`, `.vp-ruler`, `.vp-zoom`, `.vp-selection`, `.vp-watermark`)
6. Right Panel (`.shell-panel`, `.sp-head`, `.sp-icon`, `.sp-tabs`, `.sp-tab`, `.sp-body`, `.sp-section`, `.sp-section-head`)
7. Metrics, display-list, slider, ur-strip, snap-row, inspector-card (workspace content helpers)
8. Status Bar (`.shell-statusbar`, `.sb-item`, `.sb-dot`, `.sb-k`, `.sb-v`, `.sb-sep`, `.sb-spacer`)
9. Command palette overlay (`.cmd-backdrop`, `.cmd-modal`, `.cmd-search`, `.cmd-list`, `.cmd-group-head`, `.cmd-item`, `.cmd-foot`)
10. Inline help sheet (`.help-sheet`, slide-from-right)

**Nessuna media query in shell.css**: la shell è desktop-only by design (vedi `useNewShell` excludes mobile).

---

## T8 · Modelli demo backend attivi (`backend/examples.py`)

| ID | Nome funzione | Tipo strutturale |
|----|---------------|------------------|
| `ex_simple_beam_2d` | example_simple_beam_2d | Beam2D — trave appoggiata con carico distribuito |
| `ex_portal_frame_2d` | example_portal_frame_2d | Beam2D — telaio portale 2D (usato come template di default) |
| `ex_truss_3d` | example_truss_3d | Truss3D — capriata 3D |
| `ex_shell_plate` | example_shell_plate | Shell Q4 — piastra inflessa |
| `ex_tower_3d` | example_tower_3d | Beam3D — torre 3D |
| `ex_tri3_seismic` | example_tri3_membrane | Tri3 membrane — sismica |
| `ex_cube_solid_h8` | example_cube_solid_h8 | Solid H8 — cubo solido |
| `ex_cable_bridge_2d` | example_cable_bridge_2d | Cable + Beam — ponte sospeso 2D |
| `ex_laminate_plate` | example_laminate_plate | Shell laminate — piastra composita |

Total: **9 modelli demo**. Funzione builder: `build_example_models() -> list[FEAModel]` in `backend/examples.py:420`.

---

## T9 · Baseline qualità HEAD `2de196a`

- **pytest**: **1677 collected** (coverage 27% al boot, baseline storica 1669 → +8 nuovi nelle ultime fasi)
- **vitest**: **695/695 PASS** (84 test file) — confermato in smoke v2.6.2.1 polish
- **tsc --noEmit**: 0 errori
- **build size**: main chunk `frontend/dist/assets/index-NxwdMImZ.js` = **1.3 MB** (gzip ~380 kB). Three.js chunk ~858 kB separato.
- **Deploy live**: https://fea-pro.fly.dev/ release **v87** (image `01KSJ3WTNHY6WE29HPH4FZGWS4`, 387 MB)
- **Health endpoint**: `GET /api/health` → HTTP 200 `{"status":"ok","version":"1.0.0"}`
- **Smoke E2E live** (Playwright chromium): 3/3 PASS in 59.1s (v2.6.2.1 polish re-run)
- **DOM topleft post-fix**: 50 elementi (era ~80 pre-polish, **-30**); chip ViewportHud legacy e ViewportCanvasTabs = 0 occorrenze in codepath useNewShell

---

## T10 · Sprint reports recenti

### `docs/v2.6.2.1-shell-polish_report.md`

```
# v2.6.2.1-shell-polish · Report

**Data**: 2026-05-26
**SHA HEAD**: `747e51a` (+ docs commit dopo)
**Tag pushato**: `v2.6.2.1-shell-polish`
**Deploy**: release **v87** su https://fea-pro.fly.dev/
**Image**: `registry.fly.io/fea-pro:deployment-01KSJ3WTNHY6WE29HPH4FZGWS4`

## Finding chiusi (3/3)

| Finding | Stato | Evidenza DOM post-fix |
|---------|-------|-----------------------|
| **F1** ViewportHud + ViewportCanvasTabs legacy | ✅ chiuso | Chip "5 nodi · 4 elem"/"Tecnica · Solido"/ViewportCanvasTabs = **0 occorrenze** nel topleft-dom post-deploy v87 |
| **F2** ShellCommandPalette registry connection | ✅ chiuso | Test vitest verifica render ≥100 voci da PALETTE_ITEMS (~140 totali) |
| **F3** Model selector slug semantico | ✅ chiuso | `span.tb-model-id` = **"TP2"** invece di "EX_POR" |
```

### `docs/v2.6.2-shell-deploy_report.md`

```
# v2.6.2-shell · Deploy report

**Data**: 2026-05-26 ~12:00 UTC
**Tipo**: deploy production
**Tag pushato**: `v2.6.2-shell` (SHA `03d9bd7`)
**Branch deployato**: `design-rebuild/v2.6` (in sync con `origin/main` e `origin/test`)

## Release info

- **Release**: **v86** (era v85, v2.5.0-paolo-ready)
- **Image tag**: `registry.fly.io/fea-pro:deployment-01KSJ2A2Y0683HX5HYJENHPZ36`
- **Image size**: 387 MB
- **App**: `fea-pro`, region `fra`, machine `d8d2949c042208`
- **Strategy**: rolling (single-machine)
```

### `docs/v2.6.2-shell-smoke_report.md`

```
# v2.6.2-shell smoke live · Report

**Data**: 2026-05-26
**Target**: https://fea-pro.fly.dev/ release v86 (commit `03d9bd7`)
**Tool**: Playwright 1.60.0 (chromium)
**Account test**: `fede.s***@hotmail.it` (utente reale, credenziali via env var)
**Durata totale**: 1.3 min (3 test, 1 worker)
**Spec**: `frontend/e2e/v2.6.2-shell-smoke.spec.ts` (177 righe)

## Risultato globale

| Test | Esito | Durata |
|------|-------|--------|
| 1 · shell loading + screenshot multipli | ✅ PASS | 33.0s |
| 2 · smoke funzionale pipeline v2.5.0 | ✅ PASS | 39.2s |
| 3 · version marker v2.6 | ✅ PASS | 5.6s |
```

### `docs/v2.6.2-shell_report.md`

```
# Report · v2.6.2-shell

**Tipo**: feat (UI shell rebuild, primo cambio visibile in produzione)
**Tag**: `v2.6.2-shell` (pushato su origin)
**Data**: 2026-05-26
**Branch**: `design-rebuild/v2.6`
**Predecessor**: `v2.6.1-foundation` (Fase 1, `b34ada2`)

## 1. Scope

Fase 2 del rebuild design system Soft v2.1. Replica della shell Studio Pro
secondo `design-handoff/ui_kits/webapp_desktop/Nuovo Guscio.html`:
```

### `docs/v2.6.1-foundation_report.md`

```
# Report · v2.6.1-foundation

**Tipo**: feat (foundation design system)
**Tag**: `v2.6.1-foundation` (pushato su origin)
**SHA**: `b34ada2` (HEAD), foundation commit
**Data**: 2026-05-26
**Branch**: `design-rebuild/v2.6`
**Predecessor**: `f265c4d` (diag HUD investigation v2.5.0-paolo-ready)
**Pipeline Paolo (v2.5.0)**: preservata, ZERO file esistenti modificati
```

### Altri reports recenti

- `docs/v2.6.2-shell-blueprint.md` (T0 Fase 2 — blueprint dal mockup, 191 righe)
- `docs/v2.6.2-shell-smoke.md` (smoke verify documentale Fase 2)
- `docs/v2.6.2.1-polish-investigation.md` (T1 polish — investigazione finding)
- `docs/v2.5.9-paolo-readiness-gate_report.md` (closure pipeline UX 5-settimane)
- `docs/v2.5.9-smoke-verify.md`, `docs/v2.5.9-test-infra-audit.md`

---

## T11 · Decisioni architetturali tracciate

| ID | Decisione | Stato | File riferimento |
|----|-----------|-------|------------------|
| **DEC-A1** | Cleanup completo workspace legacy in `workspaceStore.ts` (rimuovere bridge `workspace`/`activeTab` post alpha.27 promise) | ⏳ Pending (debt aperto) | `docs/v2.5.6-cluster-cf-state-preconditions_report.md:146`, `docs/v2.5.9-paolo-readiness-gate_report.md:144`, `docs/v2.5.7-cluster-a-viewport-and-visual_report.md:119` (`ViewportControls.tsx` legacy duplicato anch'esso DEC-A1 cleanup) |
| **DEC-A4** | Preconditions registry centrale (`lib/preconditions.ts`) + `FeatureButton` + hook `useFeaturePreconditionState` | ✅ Implementato in v2.5.6 (16 feature) + esteso in v2.5.7 (4 toggle View) | `docs/v2.5.6-cluster-cf-state-preconditions_report.md`, `docs/v2.5.7-cluster-a-viewport-and-visual_report.md` |

Note:
- **DEC-A2, DEC-A3, DEC-A5+**: non grep-abili nelle docs accessibili — probabilmente erano numerazioni interne `ARCHITECTURE_AUDIT_2026_05_25.md` non incluso nel worktree, oppure non ancora tracciate come acronimo. Federico ha contexto sull'audit originale.
- **Debt aperti** (da `v2.5.9-paolo-readiness-gate_report.md`):
  - DEC-A1 workspace legacy cleanup (~1-2h stimato)
  - 30 caller Categoria B error handling (toastApiError migration)
  - MakePanel hub→azioni refactor
  - F (post-Fase 2 smoke): F1/F2/F3 ✅ già chiusi in v2.6.2.1 polish

---

## Out of scope di questo snapshot

- `frontend/src/components/shell/CommandPalette.tsx` (555 righe legacy) — dispatcher duplicato vs `usePaletteDispatch`, migration unificata = Fase 5
- `frontend/src/components/viewport/Viewport3D.tsx` (~180 righe, post v2.6.2.1 con prop `suppressHud`)
- I 14+ dialog/wizard lazy-loaded in App.tsx (NodeDialog, ImportWizard, PercorsiBeamWizard, ecc.)
- I 50+ callsite di `Button` Precision (non migrati a `Button2`/Soft v2.1 — Fase 5)
- `backend/main.py` API routes (vedi se serve audit dedicato)
- Test infrastructure (vitest setup, playwright config) — riferimento `docs/v2.5.9-test-infra-audit.md`
- Storybook / preview tooling (non presente al momento)

## Note per il PM

1. **Mobile è il prossimo gap critico**: la nuova Shell esclude mobile, restano i 3 componenti legacy (`MobileTabbar`/`MobilePanel`/`MobileMoreMenu`) che usano i tokens vecchi. Strada A (Shell mobile new) vs Strada C (quick fix legacy con nuovi tokens) ancora aperta.

2. **`ViewportHud.tsx` con flex-wrap senza media query** è la root cause M1/M2/M3 mobile overlap: su 375px i 4 chip wrappano in 2-3 righe coprendo viewport. Suppress prop esiste ma solo per desktop nuova Shell.

3. **Palette dispatcher duplicato**: `lib/usePaletteDispatch.ts` (Shell new) + `components/shell/CommandPalette.tsx` (legacy) hanno entrambi il dispatcher 17-actionKind. Migration unificata = Fase 5.

4. **Workspace store bridge legacy**: `workspaceStore.workspace` + `currentLeftPanel` coesistono (DEC-A1 cleanup pending). Per Fase 3 conviene NON aggiungere nuovi callsite sul legacy.

5. **No backend changes da v2.5.x**: pytest 1677 stabile, no nuove route. Tutta l'attività Fase 1/2/2.5 è frontend-only.

6. **Deploy strategy**: Fly.io free-tier auto-stop, machine `d8d2949c042208` region `fra`, image 387 MB rolling single-machine. Health check `/api/health` + cold-start ~1-2s.
