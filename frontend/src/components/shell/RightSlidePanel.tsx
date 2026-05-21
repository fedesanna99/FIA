/**
 * RightSlidePanel (alpha.17) — overlay ancorato al RightRail.
 *
 * Si sovrappone visivamente al WorkspacePanel (zIndex 30) con animazione
 * slide-from-right. Larghezza 320px (mockup: 276px ma con padding+border
 * va leggermente piu' largo per leggibilita').
 *
 * I 4 panel hanno stesso layout: header (titolo + close X) + body
 * scrollabile. Il contenuto viene scelto via `openSection` dal store.
 */
import { X } from "lucide-react";
import { useRightRailStore } from "../../store/rightRailStore";
import { InspectPanelContent } from "./panels/InspectPanelContent";
import { ViewPanelContent } from "./panels/ViewPanelContent";
import { ToolsPanelContent } from "./panels/ToolsPanelContent";
import { HistoryPanelContent } from "./panels/HistoryPanelContent";


const TITLES = {
  inspect: "Inspect — Risultati",
  view:    "View — Layer & Display",
  tools:   "Tools — Strumenti",
  history: "History — Snapshot",
} as const;


export function RightSlidePanel() {
  const openSection = useRightRailStore((s) => s.openSection);
  const close = useRightRailStore((s) => s.close);

  if (!openSection) return null;

  return (
    <aside
      className={[
        "absolute top-0 bottom-0 right-12 w-[320px] z-30",
        "bg-bg-panel border-l border-border shadow-elev",
        "animate-slide-left",
        "flex flex-col",
      ].join(" ")}
      role="complementary"
      aria-label={TITLES[openSection]}
      data-testid={`right-panel-${openSection}`}
    >
      <header className="h-9 flex items-center justify-between px-3 border-b border-border flex-shrink-0">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-ink">
          {TITLES[openSection]}
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
        {openSection === "inspect" && <InspectPanelContent />}
        {openSection === "view"    && <ViewPanelContent />}
        {openSection === "tools"   && <ToolsPanelContent />}
        {openSection === "history" && <HistoryPanelContent />}
      </div>
    </aside>
  );
}
