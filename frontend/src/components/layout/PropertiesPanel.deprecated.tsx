import { useState } from "react";
import { useModelStore } from "../../store/modelStore";
import { useResultsStore } from "../../store/resultsStore";
import { ViewportControls } from "../panels/ViewportControls";
import { ResultsPanel } from "../results/ResultsPanel";
import { SelectionInspector } from "../panels/SelectionInspector";
import { MaterialsLibrary } from "../panels/MaterialsLibrary";
import { ValidationPanel } from "../panels/ValidationPanel";
import { VerificationPanel } from "../panels/VerificationPanel";
import { SnapshotsPanel } from "../panels/SnapshotsPanel";

type Tab = "view" | "props" | "lib" | "check" | "ec3" | "results" | "snap";

const TAB_LABELS: Record<Tab, string> = {
  view: "Vista",
  props: "Prop.",
  lib: "Lib",
  check: "Check",
  ec3: "EC3",
  results: "Risultati",
  snap: "Snap",
};

export function PropertiesPanel() {
  const [tab, setTab] = useState<Tab>("view");
  const model = useModelStore((s) => s.model);
  const hasResults = useResultsStore(
    (s) => !!(s.staticResults || s.modalResults || s.dynamicResults)
  );

  return (
    <div className="w-80 border-l border-border bg-bg-panel flex flex-col overflow-hidden">
      <div className="flex border-b border-border bg-bg">
        {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
          <button
            key={t}
            className={`flex-1 px-2 py-2 text-[11px] font-semibold uppercase tracking-wider transition ${
              tab === t
                ? "text-accent-primary border-b-2 border-accent-primary bg-bg-panel"
                : "text-ink-3 hover:text-ink"
            }`}
            onClick={() => setTab(t)}
          >
            {TAB_LABELS[t]}
            {t === "results" && hasResults && (
              <span className="ml-1 text-accent-success">●</span>
            )}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-auto">
        {tab === "view" && <ViewportControls />}
        {tab === "props" && (model ? <SelectionInspector /> : <Empty />)}
        {tab === "lib" && <MaterialsLibrary />}
        {tab === "check" && <ValidationPanel />}
        {tab === "ec3" && <VerificationPanel />}
        {tab === "results" && <ResultsPanel />}
        {tab === "snap" && <SnapshotsPanel />}
      </div>
    </div>
  );
}

function Empty() {
  return (
    <div className="p-6 text-center text-ink-3 text-xs">
      Nessun modello caricato.
    </div>
  );
}
