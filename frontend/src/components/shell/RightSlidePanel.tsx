/**
 * RightSlidePanel (alpha.17 → refactor alpha.26 G11).
 *
 * Container overlay ankorato a sinistra del RightRail. Sostituisce
 * i vecchi *PanelContent (alpha.17) con i 3 nuovi macro-panel
 * brief-aligned (InspectPanel/ViewPanel/ToolsPanel) wrappati in
 * PanelChrome.
 *
 * History panel mantiene il vecchio HistoryPanelContent (non e' nel
 * brief — preserved per UX snapshot management).
 */
import { X } from "lucide-react";
import { useRightRailStore } from "../../store/rightRailStore";
import { HistoryPanelContent } from "./panels/HistoryPanelContent";
import { InspectPanel } from "../../shell/panels/InspectPanel";
import { ViewPanel } from "../../shell/panels/ViewPanel";
import { ToolsPanel } from "../../shell/panels/ToolsPanel";


export function RightSlidePanel() {
  const openSection = useRightRailStore((s) => s.openSection);
  const close = useRightRailStore((s) => s.close);

  if (!openSection) return null;

  // alpha.26: 3 panel brief-aligned (Inspect/View/Tools) ora sono
  // componenti completi con PanelChrome integrato. Renderizzati come
  // overlay assoluto (mantenuto absolute positioning compat alpha.17).
  if (openSection === "inspect" || openSection === "view" || openSection === "tools") {
    return (
      <aside
        className="absolute top-0 bottom-0 right-12 z-30 animate-slide-left"
        role="complementary"
        data-testid={`right-panel-${openSection}`}
      >
        {openSection === "inspect" && <InspectPanel />}
        {openSection === "view"    && <ViewPanel />}
        {openSection === "tools"   && <ToolsPanel />}
      </aside>
    );
  }

  // History: panel legacy (non nel brief, ma preserved per UX snapshot)
  return (
    <aside
      className={[
        "absolute top-0 bottom-0 right-12 w-[320px] z-30",
        "bg-bg-panel border-l border-border shadow-elev",
        "animate-slide-left",
        "flex flex-col",
      ].join(" ")}
      role="complementary"
      aria-label="History — Snapshot"
      data-testid="right-panel-history"
    >
      <header className="h-9 flex items-center justify-between px-3 border-b border-border flex-shrink-0">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-ink">
          History — Snapshot
        </h2>
        <button
          type="button"
          onClick={close}
          aria-label="Chiudi pannello"
          data-testid="right-panel-close"
          className="w-6 h-6 rounded flex items-center justify-center text-ink-muted hover:bg-bg-hover hover:text-ink transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </header>
      <div className="flex-1 overflow-auto p-3 text-xs">
        <HistoryPanelContent />
      </div>
    </aside>
  );
}
