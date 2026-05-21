/**
 * LeftSlidePanel (alpha.22) — Sprint 4 G7.
 *
 * Overlay ankorato a sinistra (subito dopo il LeftRail) che mostra il
 * content del workspace corrente. Sostituisce il vecchio
 * `WorkspacePanel` 380px fisso a destra.
 *
 * Larghezza 360-420px responsive. Animazione `slide-right` 220ms.
 * Header con titolo + close X. Body scrollabile.
 *
 * Decision: il panel NON e' modal (no backdrop). Il viewport rimane
 * visibile e interattivo a destra del panel. Il pattern e' "drawer
 * permanente" come Linear sidebar.
 */
import { X } from "lucide-react";
import { useLeftRailStore } from "../../store/leftRailStore";
import type { Workspace } from "../../store/workspaceStore";
import { MakePanel } from "../../shell/panels/MakePanel";
import { AnalysisWorkspace } from "./workspaces/AnalysisWorkspace";
import { ResultsWorkspace } from "./workspaces/ResultsWorkspace";
import { VerifyWorkspace } from "./workspaces/VerifyWorkspace";
import { IOWorkspace } from "./workspaces/IOWorkspace";


const TITLES: Record<Workspace, string> = {
  model:    "Make — Geometria & Carichi",
  analysis: "Solve — Analisi",
  verify:   "Verify — Verifiche",
  results:  "Risultati (legacy)",
  io:       "I/O & Collab (legacy)",
  docs:     "Documentazione",
};


export function LeftSlidePanel() {
  const openSection = useLeftRailStore((s) => s.openSection);
  const close = useLeftRailStore((s) => s.close);

  if (!openSection || openSection === "docs") return null;

  // alpha.24: per "model" usiamo il nuovo MakePanel (brief-aligned con
  // PanelChrome integrato — header + tabs + body in un singolo componente).
  // Gli altri workspace temporaneamente sono ancora i workspace v1.2
  // legacy; verranno migrati a SolvePanel/VerifyPanel/etc in alpha.25/.26.
  if (openSection === "model") {
    return <MakePanel />;
  }

  return (
    <aside
      className={[
        "flex-shrink-0 border-r border-border bg-bg-panel shadow-elev",
        "w-[360px] lg:w-[400px] xl:w-[440px]",
        "animate-slide-right",
        "flex flex-col overflow-hidden min-h-0",
      ].join(" ")}
      role="complementary"
      aria-label={TITLES[openSection]}
      data-testid={`left-panel-${openSection}`}
    >
      <header className="h-9 flex items-center justify-between px-3 border-b border-border flex-shrink-0">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-ink">
          {TITLES[openSection]}
        </h2>
        <button
          type="button"
          onClick={close}
          aria-label="Chiudi pannello"
          data-testid="left-panel-close"
          className="w-6 h-6 rounded flex items-center justify-center text-ink-muted hover:bg-bg-hover hover:text-ink transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </header>

      <div className="flex-1 overflow-hidden min-h-0">
        {openSection === "analysis" && <AnalysisWorkspace />}
        {openSection === "verify"   && <VerifyWorkspace />}
        {openSection === "results"  && <ResultsWorkspace />}
        {openSection === "io"       && <IOWorkspace />}
      </div>
    </aside>
  );
}
