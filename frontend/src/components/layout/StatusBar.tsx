import { useMemo } from "react";
import { useModelStore } from "../../store/modelStore";
import { useAnalysisStore } from "../../store/analysisStore";
import { useResultsStore } from "../../store/resultsStore";
import { useUIStore } from "../../store/uiStore";
import { fmtLength, fmtStress } from "../../utils/units";

export function StatusBar() {
  const model = useModelStore((s) => s.model);
  const { isRunning, progress, progressMessage } = useAnalysisStore();
  const { staticResults, modalResults } = useResultsStore();
  const setDialog = useUIStore((s) => s.setOpenDialog);

  const nNodes = model?.nodes.length ?? 0;
  const nElems = model?.elements.length ?? 0;
  const nDofs = nNodes * 6;

  /** Bilancio statica: Σ reazioni + Σ carichi nodali dovrebbe ≈ 0. */
  const equilibrium = useMemo(() => {
    if (!staticResults || !model) return null;
    let rfx = 0, rfy = 0, rfz = 0;
    for (const r of staticResults.reactions) {
      rfx += r.fx; rfy += r.fy; rfz += r.fz;
    }
    let lfx = 0, lfy = 0, lfz = 0;
    for (const l of model.loads) {
      if (l.type === "nodal") {
        lfx += l.fx ?? 0; lfy += l.fy ?? 0; lfz += l.fz ?? 0;
      }
    }
    const residual = Math.hypot(rfx + lfx, rfy + lfy, rfz + lfz);
    const totalApplied = Math.hypot(lfx, lfy, lfz) + 1;
    const relErr = residual / totalApplied;
    return { rfx, rfy, rfz, lfx, lfy, lfz, residual, relErr };
  }, [staticResults, model]);

  return (
    <div className="flex items-center px-3 py-1.5 border-t border-border bg-bg-panel text-xs text-ink-muted gap-4">
      <span className={isRunning ? "text-accent-warning" : "text-accent-success"}>
        ● {isRunning ? "Esecuzione" : "Pronto"}
      </span>
      <span>Nodi: <span className="numeric text-ink">{nNodes}</span></span>
      <span>Elementi: <span className="numeric text-ink">{nElems}</span></span>
      <span>DoF: <span className="numeric text-ink">{nDofs}</span></span>

      {staticResults && (
        <>
          <span>Max u: <span className="numeric text-accent-primary">
            {fmtLength(staticResults.max_displacement)}
          </span></span>
          <span>Max σ: <span className="numeric text-accent-warning">
            {fmtStress(staticResults.max_stress)}
          </span></span>
          {equilibrium && (
            <span title={
              `ΣR=(${(equilibrium.rfx/1000).toFixed(2)}, ${(equilibrium.rfy/1000).toFixed(2)}, ${(equilibrium.rfz/1000).toFixed(2)}) kN\n` +
              `ΣF=(${(equilibrium.lfx/1000).toFixed(2)}, ${(equilibrium.lfy/1000).toFixed(2)}, ${(equilibrium.lfz/1000).toFixed(2)}) kN\n` +
              `Residuo: ${(equilibrium.residual).toFixed(3)} N (${(equilibrium.relErr * 100).toFixed(3)}%)`
            }>
              Equilibrio:{" "}
              <span className={
                equilibrium.relErr < 1e-3 ? "text-accent-success" :
                equilibrium.relErr < 1e-1 ? "text-accent-warning" : "text-accent-danger"
              }>
                {equilibrium.relErr < 1e-3 ? "✓ OK" :
                 equilibrium.relErr < 1e-1 ? "⚠ approx" : "✕ ERRORE"}
              </span>
            </span>
          )}
          <span>Solver: <span className="numeric text-ink">
            {staticResults.solve_time_ms.toFixed(0)} ms
          </span></span>
        </>
      )}
      {modalResults && modalResults.modes[0] && (
        <span>f₁: <span className="numeric text-accent-primary">
          {modalResults.modes[0].frequency_hz.toFixed(3)} Hz
        </span></span>
      )}

      <div className="flex-1" />

      {isRunning && (
        <div className="flex items-center gap-2 min-w-[280px]">
          <span className="text-ink-dim truncate max-w-[200px]">{progressMessage}</span>
          <div className="w-32 h-1.5 bg-border rounded overflow-hidden">
            <div
              className="h-full bg-accent-primary transition-all"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
          <span className="numeric text-ink">{Math.round(progress * 100)}%</span>
        </div>
      )}

      <button
        className="text-ink-dim hover:text-accent-primary text-[11px]"
        onClick={() => setDialog("help")}
        title="Mostra cheat-sheet shortcut"
      >? Help</button>
      <span className="text-ink-dim">FEA Pro v0.1.0</span>
    </div>
  );
}
