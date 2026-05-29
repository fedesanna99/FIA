// v2.6.2 Shell · Orchestrator
//
// Telaio principale dell'app desktop con modello attivo.
// Layout grid 48/1fr/28 × 56/1fr/380 secondo §3.1 DESIGN_HANDOFF.
//
// Composizione:
//   TopBar (48)
//   mid:  [Rail 56] [Viewport children] [Panel 380]
//   StatusBar (28)
//   CommandPalette (overlay)
//
// Children = il Canvas R3F (Viewport3D) montato dall'esterno, così la Shell
// non ha vincoli sul rendering 3D.
//
// Workspace state: leggiamo `workspaceStore.workspace` (legacy: model/analysis/
// verify) e lo mappiamo al workspace nuovo (modello/analisi/risultati/...).
// Mapping completo refactor: Fase 5.

import { ReactNode, useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import { useThemeStore } from "../store/themeStore";
// redesign/workspace-fasi (FETTA 0): focus mode wiring dentro Shell custom.
// `isEmptyState` è il flag di focus (vedi workspaceStore.enterEmptyState /
// exitEmptyState, triggerati da F / Shift+Space / palette `focus-toggle` /
// AvatarMenu).
import { useWorkspaceStore } from "../store/workspaceStore";
// v3.4 Fetta E2-IA Commit E2.2: stato del panel destro Shell custom.
// Default "open" → comportamento invariato per tutti gli utenti
// esistenti. Quando "closed" la ShellRightReopenTab prende il posto
// di ShellPanel (vedi JSX sotto + shell.css `[data-panel-state]`).
import { useRightPanelStore } from "../store/rightPanelStore";
// v3.4 Fetta E2-IA Commit E2.4: stato del panel SX "Albero modello".
// Default "closed" → grid 3-col invariata. Cablato al toggle Albero
// della ShellTopBar (E2.1) ora che ha un consumer reale.
import { useLeftTreeStore } from "../store/leftTreeStore";
import { ShellTopBar } from "./ShellTopBar";
import { ShellRail } from "./ShellRail";
import { ShellViewport } from "./ShellViewport";
import { ShellPanel } from "./ShellPanel";
// v3.4 Fetta E2-IA Commit E2.2: tab verticale destra che sostituisce
// ShellPanel quando il panel e' chiuso (rightPanelStore.panelState).
// Pattern simmetrico al focus-exit pill (Fetta 0): affordance sempre
// visibile per riaprire qualcosa che e' stato chiuso volontariamente.
import { ShellRightReopenTab } from "./ShellRightReopenTab";
// v3.4 Fetta E2-IA Commit E2.4: panel SX "Albero modello" con gerarchia
// del modello caricato (5 sezioni read-only da modelStore). Default
// closed → grid 3-col invariata. Aperto → grid 4-col con seconda
// colonna `--left-tree-w` (240px).
import { ShellLeftTreePanel } from "./ShellLeftTreePanel";
// v3.4 Fetta M4 mobile (30/05/2026 notte): bottom sheet "Verifica" su
// mobile. Renderizzato solo quando isMobile && activeWs === "risultati"
// (su desktop il ShellPanel desktop 380px prende il suo posto). Wrappa
// ResultsTabsPanel come sheet sticky bottom con header peek/expanded.
// Vedi ADR 004 D5.
import { ShellPanelMobileSheet } from "./ShellPanelMobileSheet";
import { useIsMobile } from "../hooks/useIsMobile";
import { ShellStatusBar } from "./ShellStatusBar";
import { ShellCommandPalette } from "./ShellCommandPalette";
// redesign/workspace-fasi (FETTA 1): spina 3 fasi additiva sotto la topbar.
// NON sostituisce la rail sinistra (railConfig.ts LOCKED), aggiunge solo
// una gerarchia esplicita Costruisci → Esegui → Risultati.
import { ShellPhaseStepper } from "./ShellPhaseStepper";
import { MakePanel } from "./panels/MakePanel";
import { SolvePanel } from "./panels/SolvePanel";
import { VerifyPanel } from "./panels/VerifyPanel";
import { InspectPanel } from "./panels/InspectPanel";
import { ToolsPanel } from "./panels/ToolsPanel";
// v3.1 Fase 2c: ViewPanel ora esposto come 6° workspace (overlay viewport
// + view preset). Prima raggiungibile solo via right-rail legacy o palette.
import { ViewPanel } from "./panels/ViewPanel";
// redesign/workspace-fasi (FETTA 2a): nuovo guscio Risultati (3 schede)
// + striscia verdetto overlay viewport. InspectPanel resta importato come
// content di Sintesi (embed) dentro ResultsTabsPanel.
import { ResultsTabsPanel } from "./results/ResultsTabsPanel";
import { ResultsVerdictStrip } from "./results/ResultsVerdictStrip";
// redesign/workspace-fasi rifinitura 2c: intent store HMR-safe per
// la CTA del toast "Analisi completata → Vai ai Risultati". Sostituisce
// il vecchio window event "feapro:shell:goto-workspace" che era fragile
// rispetto a hot reload di Shell.tsx (closure-stale).
import { useShellIntentStore } from "../store/shellIntentStore";
// v2.6.5 D.1: rail expanded vs collapsed (single source of truth) per
// sincronizzare grid `--rail-w` con il render del rail.
// v2.6.6 E.2: hook promosso da `shell/useRailExpansion.ts` a `lib/` per
// condivisione con LeftRail legacy.
import { useRailExpansion } from "../lib/useRailExpansion";

type ShellWorkspaceId = "modello" | "analisi" | "risultati" | "verifiche" | "io" | "view";

interface ShellProps {
  /** Canvas R3F (Viewport3D) — montato dal chiamante per separation of concerns. */
  children: ReactNode;
}

// v2.6.3.1 BUG-#1 fix: workspace che richiedono area workspace piena
// (~1000px+) per il rendering corretto dei pattern handoff Precision.
// I pattern con grid orizzontale (es. ChecksDetailTable grid-cols-[240px_1fr])
// collassano nel right panel ShellPanel 380px (1fr → ~80px). Quando il
// workspace è in takeover mode, la grid Shell passa da 3-col (rail+vp+panel)
// a 2-col (rail+takeover-content) e il pannello-content è renderizzato a
// piena larghezza fullArea, NON dentro ShellViewport.
//
// Trade-off: il Canvas R3F è unmount-remount al cambio workspace (perdita
// stato view R3F). Accettabile perché:
//   - In Verifiche l'utente non vede il viewport (è una tabella)
//   - Cambio workspace è raro (una volta per minuti)
//   - Stato modello/results vive in Zustand (no perdita reale)
const VIEWPORT_TAKEOVER_WORKSPACES: ShellWorkspaceId[] = ["verifiche"];

const WORKSPACE_CONTENT_NORMAL: Record<ShellWorkspaceId, ReactNode> = {
  modello: <MakePanel />,
  analisi: <SolvePanel />,
  // redesign/workspace-fasi (FETTA 2a/2b): il workspace "risultati" ora usa
  // ResultsTabsPanel (3 schede Sintesi/Dati/Verifiche). La Sintesi e' il
  // nuovo layout aggregato (FAM B), non piu' embed di InspectPanel. La
  // versione "default" qui senza onIterate e' un fallback statico — il
  // render reale wira onIterate via overrideRisultati (sotto, nel JSX).
  risultati: <ResultsTabsPanel />,
  verifiche: <VerifyPanel />,
  io: <ToolsPanel />,
  // v3.1 Fase 2c: ViewPanel come 6° workspace
  view: <ViewPanel />,
};

// In takeover mode passiamo `fullArea` al panel content quando lo supporta,
// così PanelChrome rimuove le width fisse 300/340/380 e l'area workspace
// resta veramente full (~1000px+).
const WORKSPACE_CONTENT_TAKEOVER: Partial<Record<ShellWorkspaceId, ReactNode>> = {
  verifiche: <VerifyPanel fullArea />,
};

// v3.3.0 audit-fix L3.1-P0-1: activeWs persisted via sessionStorage
// (era state locale, F5 perdeva il workspace, Cmd+K non sincronizzava).
const ACTIVE_WS_KEY = "feapro:shell:active-workspace";
const VALID_WS = new Set<ShellWorkspaceId>([
  "modello", "analisi", "risultati", "verifiche", "io", "view",
]);

function readPersistedWs(): ShellWorkspaceId {
  if (typeof window === "undefined") return "modello";
  try {
    const raw = window.sessionStorage.getItem(ACTIVE_WS_KEY);
    if (raw && VALID_WS.has(raw as ShellWorkspaceId)) {
      return raw as ShellWorkspaceId;
    }
  } catch { /* ignore */ }
  return "modello";
}


export function Shell({ children }: ShellProps) {
  // v3.3.0 audit-fix L3.1-P0-1: activeWs persisted sessionStorage.
  const [activeWs, setActiveWsState] = useState<ShellWorkspaceId>(readPersistedWs);
  const setActiveWs = useCallback((ws: ShellWorkspaceId) => {
    setActiveWsState(ws);
    try { window.sessionStorage.setItem(ACTIVE_WS_KEY, ws); } catch { /* ignore */ }
  }, []);
  const isTakeover = VIEWPORT_TAKEOVER_WORKSPACES.includes(activeWs);
  const takeoverContent = isTakeover ? WORKSPACE_CONTENT_TAKEOVER[activeWs] : null;
  // v2.6.5 D.1: rail expanded mode → grid `--rail-w: 200px`. Single source
  // of truth via hook localStorage-backed (default true). Niente override
  // via prop perché la grid CSS deve essere sincrona col rail render.
  const { isExpanded: railExpanded } = useRailExpansion();

  // v3.4 Fetta M4 mobile (30/05/2026 notte): isMobile per render
  // condizionale del bottom sheet Verifica. Sotto 768 (breakpoint
  // useIsMobile legacy) il ShellPanel desktop e' display:none via CSS
  // M1-polish, e su workspace=risultati renderizziamo il sheet sticky
  // bottom. Usiamo il breakpoint 768 dello useIsMobile esistente (non
  // 640 dell'ADR 004 D1) per coerenza con il gate `.shell-panel
  // {display:none}` di M1-polish — entrambi devono triggerare insieme,
  // altrimenti su tablet 641-768 avremmo entrambi visibili (doppio
  // panel) o entrambi nascosti (niente panel). Trade-off accettato: tra
  // 641 e 768 il sheet si attiva pur essendo "tablet" per ADR D1 — i
  // 128px di range tablet stretto sono comunque touch e il sheet rende
  // bene. Future M-tablet polish potra' raffinare se serve.
  const isMobile = useIsMobile();

  // redesign/workspace-fasi (FETTA 0): focus mode dentro Shell custom.
  // Quando isFocusMode è true, nascondiamo Rail/Panel/StatusBar e teniamo
  // solo TopBar (come bussola) + Viewport pieno. Il tasto F / Shift+Space
  // continuano a togglare via App.tsx; in più offriamo un pill "Esci focus"
  // sempre visibile per discoverability. Mentre Takeover si esclude
  // mutualmente (in takeover non senso entrare in focus dello stesso workspace).
  const isFocusMode = useWorkspaceStore((s) => s.isEmptyState);
  const exitFocus = useWorkspaceStore((s) => s.exitEmptyState);
  // Nota: se isTakeover && isFocusMode il focus vince — il takeover-content
  // resta logicamente attivo (workspace=verifiche) ma non viene renderizzato
  // in focus per dare priorità al viewport pieno. All'uscita dal focus
  // il takeover ritorna come prima.
  const showFocusChrome = isFocusMode;

  // v3.3.0 audit-fix L3.1-P1-1: theme className derivato da themeStore.
  // Prima era hardcoded `theme-light` → dark mode rotto in Shell custom.
  const theme = useThemeStore((s) => s.resolved);

  // v3.4 Fetta E2-IA Commit E2.2: stato del panel destro (open / closed).
  // Subscribe persistito → ricarica preserva la scelta dell'utente power.
  // Default "open" → comportamento invariato per tutti gli utenti
  // esistenti al primo render dopo l'introduzione di questo store.
  // Quando "closed": ShellRightReopenTab prende il posto di ShellPanel e
  // la grid `.shell-mid` restringe la colonna destra da 380px a 32px
  // (override `--panel-w` via `[data-panel-state="closed"]` in shell.css).
  const panelState = useRightPanelStore((s) => s.panelState);

  // v3.4 Fetta E2-IA Commit E2.4: stato del panel SX "Albero modello".
  // Default "closed" → la grid `.shell-mid` resta 3-col come prima
  // (zero regression). Quando "open" la grid passa a 4-col tramite
  // override CSS su `[data-left-tree-state="open"]` (vedi shell.css)
  // e il `ShellLeftTreePanel` viene renderizzato tra Rail e Viewport.
  // Focus/takeover restano prioritari (in entrambi i casi il panel
  // SX non viene renderizzato per lasciare massimo spazio).
  const treeState = useLeftTreeStore((s) => s.treeState);
  // v3.4 Fetta E2-IA Commit E2.4: stato "effettivo" del panel SX.
  // L'utente puo' avere `treeState === "open"` come preferenza persistita,
  // ma in focus mode o takeover il panel SX non viene comunque
  // renderizzato (chrome nascosto o workspace fullArea). Usiamo lo stesso
  // boolean per (a) decidere se renderizzare `ShellLeftTreePanel` e
  // (b) settare il data-attribute CSS — cosi' grid e DOM restano coerenti
  // senza dover scrivere override CSS speciali su takeover/focus.
  const isLeftTreeVisible =
    !isFocusMode && !isTakeover && treeState === "open";

  // v3.3.0 audit-fix L3.1-P1-4: keyboard shortcut 1-6 per workspace switch.
  // Prima App.tsx aveva solo 1/2/3, ShellRail mostrava kbd 4/5/6 dead.
  useEffect(() => {
    const order: ShellWorkspaceId[] = ["modello", "analisi", "risultati", "verifiche", "io", "view"];
    const onKey = (e: KeyboardEvent) => {
      // Ignora se utente sta scrivendo in input/textarea/contenteditable
      const target = e.target as HTMLElement | null;
      if (target && (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      )) return;
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const idx = parseInt(e.key, 10) - 1;
      if (idx >= 0 && idx < order.length) {
        setActiveWs(order[idx]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setActiveWs]);

  // redesign/workspace-fasi rifinitura 2c: osserva l'intent store
  // (CTA del toast "Analisi completata → Vai ai Risultati"). HMR-safe:
  // lo store sopravvive a hot reload, niente listener fantasma su
  // istanze Shell smontate. Quando pendingWorkspace e' settato,
  // applichiamo subito (se workspace valido) e consumiamo.
  const pendingWorkspace = useShellIntentStore((s) => s.pendingWorkspace);
  const consumeIntent = useShellIntentStore((s) => s.consume);
  useEffect(() => {
    if (pendingWorkspace && VALID_WS.has(pendingWorkspace as ShellWorkspaceId)) {
      setActiveWs(pendingWorkspace as ShellWorkspaceId);
      consumeIntent();
    } else if (pendingWorkspace) {
      // Workspace sconosciuto: consume comunque per non lasciare lo
      // store sporco. Niente cambio activeWs (silent fallback).
      consumeIntent();
    }
  }, [pendingWorkspace, setActiveWs, consumeIntent]);

  return (
    <div
      // v3.0.0 Sprint F F3: `data-app-mode="studio-legacy"` attributo stabile per
      // identificare il Studio shell legacy. Permette al body lock in index.css
      // di matchare via `:has([data-app-mode="studio-legacy"])` invece di
      // dependency sulle class `.shell.shell-soft` (brittle a rename).
      data-app-mode="studio-legacy"
      // redesign/workspace-fasi (FETTA 0): aggiunto `shell-focus-on` quando
      // isFocusMode → la grid passa a 1-col / topbar+viewport (CSS in shell.css).
      data-focus-mode={isFocusMode ? "true" : undefined}
      // v3.4 Fetta E2-IA Commit E2.2: data-panel-state per CSS override
      // `--panel-w` (32px tab vs 380px panel). Letto da `.shell[data-panel-state="closed"]`
      // in shell.css. Quando "open" il valore non viene letto da nessun
      // selettore CSS (default `--panel-w: 380px` invariato).
      data-panel-state={panelState}
      // v3.4 Fetta E2-IA Commit E2.4: data-left-tree-state per CSS
      // override grid `.shell-mid` (4-col quando "open", 3-col quando
      // "closed"). Usiamo `isLeftTreeVisible` (NON `treeState` diretto)
      // cosi' in focus/takeover l'attributo e' "closed" e la grid resta
      // 3-col anche se l'utente aveva treeState="open" come preferenza.
      data-left-tree-state={isLeftTreeVisible ? "open" : "closed"}
      className={`shell shell-soft shell-density-comfy shell-panel-w-380 shell-vp-neutral theme-${theme}${
        isTakeover ? " shell-takeover-on" : ""
      }${isFocusMode ? " shell-focus-on" : ""}${railExpanded ? " shell-rail-expanded" : ""}`}
    >
      <ShellTopBar />

      {/* redesign/workspace-fasi (FETTA 1): spina 3 fasi additiva.
          In focus mode la spina è nascosta (riga grid collassata a 0
          via .shell-focus-on in shell.css) e il componente non viene
          renderizzato per non sprecare subscribe agli store. */}
      {!showFocusChrome && (
        <ShellPhaseStepper active={activeWs} onChange={setActiveWs} />
      )}

      <div className="shell-mid">
        {!showFocusChrome && <ShellRail active={activeWs} onChange={setActiveWs} />}
        {/* v3.4 Fetta E2-IA Commit E2.4: panel SX "Albero modello"
            inserito tra Rail e Viewport quando isLeftTreeVisible.
            Stesso boolean usato dal data-attribute sul root → grid
            CSS e DOM restano coerenti senza override speciali per
            takeover/focus. */}
        {isLeftTreeVisible && <ShellLeftTreePanel />}
        {!showFocusChrome && isTakeover && takeoverContent ? (
          <main className="shell-takeover-content" data-testid="shell-takeover-content">
            {takeoverContent}
          </main>
        ) : (
          <>
            <ShellViewport>
              {children}
              {/* redesign/workspace-fasi (FETTA 2a): striscia verdetto +
                  toggle viste sopra il viewport quando si e' in Risultati.
                  Nascosta in focus mode (showFocusChrome guard) e quando
                  workspace != risultati. */}
              {!showFocusChrome && activeWs === "risultati" && (
                <ResultsVerdictStrip />
              )}
            </ShellViewport>
            {!showFocusChrome && (panelState === "open" ? (
              <ShellPanel workspace={activeWs}>
                {/* redesign/workspace-fasi (FETTA 2b · FAM B): wira onIterate
                    su Risultati cosi' la Sintesi puo' tornare a "modello"
                    (Costruisci). Altrimenti usa il content statico. */}
                {activeWs === "risultati"
                  ? <ResultsTabsPanel onIterate={() => setActiveWs("modello")} />
                  : WORKSPACE_CONTENT_NORMAL[activeWs]}
              </ShellPanel>
            ) : (
              /* v3.4 Fetta E2-IA Commit E2.2: panel destro chiuso →
                 ShellRightReopenTab prende il posto di ShellPanel nella
                 terza colonna grid `.shell-mid` (32px via override
                 `--panel-w` su `[data-panel-state="closed"]`). Click
                 sulla tab → rightPanelStore.open() → ShellPanel torna.
                 Workspace prop = label workspace corrente. */
              <ShellRightReopenTab workspace={activeWs} />
            ))}
          </>
        )}
      </div>

      {!showFocusChrome && <ShellStatusBar />}

      <ShellCommandPalette />

      {/* v3.4 Fetta M4 mobile (30/05/2026 notte): bottom sheet "Verifica"
          su mobile in fase risultati. Renderizzato come overlay position:
          fixed bottom dal CSS (.shell-panel-sheet), wrappa ResultsTabsPanel
          col proprio header peek/expanded toggle. Su desktop e' nascosto
          via CSS @media (default display:none, mostrato solo sotto 640).
          Su mobile + altre fasi (Costruisci/Esegui) non e' montato →
          viewport pieno. Doppio mount accettato (sheet + ShellPanel
          desktop display:none) come trade-off scope: refactor in
          M4-polish se servira'.
          NB: showFocusChrome guard evita render in focus mode. */}
      {!showFocusChrome && isMobile && activeWs === "risultati" && (
        <ShellPanelMobileSheet>
          <ResultsTabsPanel onIterate={() => setActiveWs("modello")} />
        </ShellPanelMobileSheet>
      )}

      {/* redesign/workspace-fasi (FETTA 0): pill "Esci focus" sempre visibile
          quando isFocusMode. Reversibilità garantita anche se l'utente
          non ricorda lo shortcut F. Il pill è position:fixed top-right
          sotto la topbar (vedi `.shell-focus-exit` in shell.css). */}
      {isFocusMode && (
        <button
          type="button"
          onClick={exitFocus}
          className="shell-focus-exit"
          data-testid="shell-focus-exit"
          aria-label="Esci da focus mode"
          title="Esci da focus mode (F)"
        >
          <X size={14} aria-hidden />
          <span>Esci focus</span>
          <kbd>F</kbd>
        </button>
      )}
    </div>
  );
}
