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
import { ShellTopBar } from "./ShellTopBar";
import { ShellRail } from "./ShellRail";
import { ShellViewport } from "./ShellViewport";
import { ShellPanel } from "./ShellPanel";
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
// redesign/workspace-fasi rifinitura 2b: nome evento "vai al workspace"
// usato dalla CTA del toast "Analisi completata".
import { ANALYSIS_GOTO_EVENT } from "../lib/analysisCompleteToast";
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

  // redesign/workspace-fasi rifinitura 2b: listener globale
  // `feapro:shell:goto-workspace` (CTA del toast "Analisi completata
  // → Vai ai Risultati"). Il toast e' non-invasivo: la navigazione
  // avviene SOLO se l'utente clicca esplicitamente l'azione.
  useEffect(() => {
    const onGoto = (e: Event) => {
      const detail = (e as CustomEvent).detail as { ws?: string } | undefined;
      const ws = detail?.ws;
      if (ws && VALID_WS.has(ws as ShellWorkspaceId)) {
        setActiveWs(ws as ShellWorkspaceId);
      }
    };
    window.addEventListener(ANALYSIS_GOTO_EVENT, onGoto);
    return () => window.removeEventListener(ANALYSIS_GOTO_EVENT, onGoto);
  }, [setActiveWs]);

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
            {!showFocusChrome && (
              <ShellPanel workspace={activeWs}>
                {/* redesign/workspace-fasi (FETTA 2b · FAM B): wira onIterate
                    su Risultati cosi' la Sintesi puo' tornare a "modello"
                    (Costruisci). Altrimenti usa il content statico. */}
                {activeWs === "risultati"
                  ? <ResultsTabsPanel onIterate={() => setActiveWs("modello")} />
                  : WORKSPACE_CONTENT_NORMAL[activeWs]}
              </ShellPanel>
            )}
          </>
        )}
      </div>

      {!showFocusChrome && <ShellStatusBar />}

      <ShellCommandPalette />

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
