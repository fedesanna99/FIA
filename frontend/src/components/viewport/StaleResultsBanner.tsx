import { useMemo } from "react";
import { useModelStore } from "../../store/modelStore";
import { useResultsStore } from "../../store/resultsStore";
import { useRunAnalysis } from "../../hooks/useAnalysis";
import { modelHash } from "../../utils/geometry";

/**
 * Banner che avvisa quando il modello è stato modificato dopo l'ultima analisi.
 */
export function StaleResultsBanner() {
  const model = useModelStore((s) => s.model);
  const { staticResults, modalResults, dynamicResults, modelHashAtAnalysis } = useResultsStore();
  const run = useRunAnalysis();
  const hash = useMemo(() => modelHash(model), [model]);

  const hasResults = !!(staticResults || modalResults || dynamicResults);
  const stale = hasResults && modelHashAtAnalysis !== null && hash !== modelHashAtAnalysis;

  if (!stale) return null;

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-accent-warning/20 border border-accent-warning text-accent-warning text-xs px-3 py-1.5 rounded flex items-center gap-3 backdrop-blur shadow">
      <span className="font-semibold">⚠ Risultati obsoleti</span>
      <span className="text-ink-muted">Il modello è cambiato dopo l'ultima analisi.</span>
      <button
        className="btn btn-primary text-[10px] py-0.5 px-2"
        onClick={() => run()}
        title="Riesegui l'analisi corrente"
      >
        ↻ Riesegui
      </button>
    </div>
  );
}
