/**
 * ToolsPanel (v1.5 Task 28 — hub navigation refactor).
 *
 * Rispetto ad alpha.31 (5 voci affastellate in 2 sezioni Modello/Output),
 * ora e' un "hub" che mostra 4 card grandi colorate. Click su una card →
 * drill-in nella sub-view dedicata con breadcrumb "Strumenti › X".
 *
 * Sub-views (in `tools/`):
 *  - MeasureSnapshotView   (Misure + Snapshot uniti)
 *  - ExportView            (5 opzioni PDF/XLSX/CSV/JSON)
 *  - ValidationView        (NAFEMS benchmark + EC verify)
 *  - CostPreviewView       (spiegazione + link a Solve)
 *
 * Riferimento visuale: mockup `fea_pro_progressive_disclosure_v1.html`
 * sezione 03 "Hub invece di toolbar densa".
 */
import { useEffect, useState } from "react";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { IconTool } from "@tabler/icons-react";
import { useWorkspaceStore } from "../../store/workspaceStore";
import { useRightRailStore } from "../../store/rightRailStore";
import { PanelChrome } from "./PanelChrome";
import { ToolsHub } from "./tools/ToolsHub";
import { MeasureSnapshotView } from "./tools/MeasureSnapshotView";
import { ExportView } from "./tools/ExportView";
import { ValidationView } from "./tools/ValidationView";
import { CostPreviewView } from "./tools/CostPreviewView";
import { AutoDetectView } from "./tools/AutoDetectView";
import { ImportPanel } from "../../components/panels/ImportPanel";
import { ExportServerPanel } from "../../components/panels/ExportServerPanel";
import { AccelerogramsPanel } from "../../components/panels/AccelerogramsPanel";
import { ComparePanel } from "../../components/panels/ComparePanel";
import { AICopilotPanel } from "../../components/panels/AICopilotPanel";
import { CollabPanel } from "../../components/panels/CollabPanel";


export type ToolsView =
  | "hub"
  | "measure-snapshot"
  | "import"
  | "export"
  | "server-export"
  | "validation"
  | "auto-detect"
  | "accelerograms"
  | "compare"
  | "ai-copilot"
  | "collab"
  | "cost-preview";


const SUBVIEW_LABELS: Record<Exclude<ToolsView, "hub">, string> = {
  "measure-snapshot": "Misure e snapshot",
  "import":           "Import",
  "export":           "Export rapido",
  "server-export":    "Export server",
  "validation":       "Validazione",
  "auto-detect":      "Auto-detect",
  "accelerograms":    "Accelerogrammi",
  "compare":          "Compare A/B",
  "ai-copilot":       "AI Copilot",
  "collab":           "Collab",
  "cost-preview":     "Cost preview",
};

function isToolsSubview(value: unknown): value is Exclude<ToolsView, "hub"> {
  return typeof value === "string" && value in SUBVIEW_LABELS;
}


export function ToolsPanel() {
  const [view, setView] = useState<ToolsView>("hub");
  const closeRight = useWorkspaceStore((s) => s.closeRightPanel);
  const closeRail = useRightRailStore((s) => s.close);

  const handleClose = () => {
    closeRight();
    closeRail();
    setView("hub");
  };

  useEffect(() => {
    const handler = (event: Event) => {
      const next = (event as CustomEvent<{ view?: unknown }>).detail?.view;
      if (isToolsSubview(next)) setView(next);
    };
    window.addEventListener("feapro:tools-view", handler);
    return () => window.removeEventListener("feapro:tools-view", handler);
  }, []);

  return (
    <PanelChrome
      side="right"
      title="Tools"
      Icon={IconTool}
      subtitle={view === "hub" ? "Strumenti" : SUBVIEW_LABELS[view]}
      onClose={handleClose}
      testId="panel-tools"
    >
      {view === "hub" ? (
        <ToolsHub onSelect={setView} />
      ) : (
        <div className="flex flex-col h-full">
          <ToolsBreadcrumb view={view} onBack={() => setView("hub")} />
          <div className="flex-1 min-h-0 overflow-hidden">
            {view === "measure-snapshot" && <MeasureSnapshotView />}
            {view === "import" && <ImportPanel />}
            {view === "export" && <ExportView />}
            {view === "server-export" && <ExportServerPanel />}
            {view === "validation" && <ValidationView />}
            {view === "auto-detect" && <AutoDetectView />}
            {view === "accelerograms" && <AccelerogramsPanel />}
            {view === "compare" && <ComparePanel />}
            {view === "ai-copilot" && <AICopilotPanel />}
            {view === "collab" && <CollabPanel />}
            {view === "cost-preview" && <CostPreviewView />}
          </div>
        </div>
      )}
    </PanelChrome>
  );
}


function ToolsBreadcrumb({
  view, onBack,
}: {
  view: Exclude<ToolsView, "hub">;
  onBack: () => void;
}) {
  return (
    <div className="px-3.5 py-2.5 border-b border-border flex items-center gap-1.5 text-[11px] flex-shrink-0">
      <button
        type="button"
        onClick={onBack}
        data-testid="tools-breadcrumb-back"
        className="text-ink-muted hover:text-ink flex items-center gap-1 transition-colors"
      >
        <ArrowLeft className="w-3 h-3" /> Strumenti
      </button>
      <ChevronRight className="w-2.5 h-2.5 text-ink-dim" />
      <span className="font-semibold text-ink">{SUBVIEW_LABELS[view]}</span>
    </div>
  );
}
