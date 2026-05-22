/**
 * AnalysisSummaryCard (v1.8.1 P1, esteso v1.8.2 T3).
 *
 * Card 2 della sidebar densa destra (mockup 08). Mostra metadata
 * dell'ultima analisi statica eseguita: solve time, # DOF approx,
 * status, link "Apri Inspect" per il dettaglio.
 *
 * Si nasconde quando staticResults = null E nessun job sta girando.
 * v1.8.2 T3: quando isRunning && staticResults === null mostra
 * skeleton shimmer per dare feedback visivo immediato all'utente.
 */
import { useResultsStore } from "../../store/resultsStore";
import { useModelStore } from "../../store/modelStore";
import { useAnalysisStore } from "../../store/analysisStore";
import { useRightRailStore } from "../../store/rightRailStore";

export function AnalysisSummaryCard() {
  const staticRes = useResultsStore((s) => s.staticResults);
  const model = useModelStore((s) => s.model);
  const isRunning = useAnalysisStore((s) => s.isRunning);

  // v1.8.2 T3: skeleton mentre solve sta girando (no risultati ancora).
  if (!staticRes && isRunning && model) {
    return (
      <div className="border-b border-border p-3 space-y-1.5 bg-bg-panel" data-testid="analysis-summary-card-skeleton">
        <div className="text-[10px] uppercase tracking-wider text-ink-muted font-mono font-semibold">
          Analysis summary
        </div>
        <div className="space-y-1.5">
          <div className="h-3 bg-bg-hover rounded animate-pulse w-3/4" />
          <div className="h-3 bg-bg-hover rounded animate-pulse w-2/3" />
          <div className="h-3 bg-bg-hover rounded animate-pulse w-1/2" />
        </div>
      </div>
    );
  }

  if (!staticRes || !model) return null;

  // DOF approx: nNodes * 3 (2D) o 6 (3D) — euristica, no API dedicata.
  const dofPerNode = model.is_3d ? 6 : 3;
  const nDof = (model.nodes?.length ?? 0) * dofPerNode;

  return (
    <div className="border-b border-border p-3 space-y-1.5 bg-bg-panel" data-testid="analysis-summary-card">
      <div className="text-[10px] uppercase tracking-wider text-ink-muted font-mono font-semibold">
        Analysis summary
      </div>
      <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
        <span className="text-ink-muted">Solve time</span>
        <span className="text-ink font-mono text-right">
          {staticRes.solve_time_ms.toFixed(0)} ms
        </span>
        <span className="text-ink-muted">DOF approx</span>
        <span className="text-ink font-mono text-right">
          {nDof.toLocaleString("it")}
        </span>
        <span className="text-ink-muted">Status</span>
        <span className="text-ink-success font-mono text-right">OK</span>
      </div>
      <button
        type="button"
        onClick={() => useRightRailStore.getState().open("inspect")}
        className="w-full text-[11px] text-ink-info hover:underline text-left pt-1"
        data-testid="analysis-summary-open-inspect"
      >
        Apri Inspect →
      </button>
    </div>
  );
}
