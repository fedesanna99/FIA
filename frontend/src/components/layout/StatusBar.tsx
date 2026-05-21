/**
 * StatusBar (alpha.19 Sprint 4 G4) — barra inferiore arricchita.
 *
 * Layout mockup v1.3:
 *   [● pronto/esec.] [N E DoF] [Max u/σ] [equilibrio] [solver ms] [f₁]
 *   ── spacer ──
 *   [progress job inline] [WS dot] [credits badge] [? Help] [version]
 *
 * Le info pre-esistenti (entita', equilibrio, max, modal f₁) sono
 * mantenute identiche. Le novita' alpha.19:
 *   - WSStatus: dot live + tooltip latency (pinga /api/health 30s)
 *   - CreditsBadge: usato/cap da react-query getQuota
 *   - APP_VERSION constant (era "v0.1.0" hardcoded)
 *   - Click su credits apre AccountDialog
 */
import { useMemo, useState } from "react";
import { useModelStore } from "../../store/modelStore";
import { useAnalysisStore } from "../../store/analysisStore";
import { useResultsStore } from "../../store/resultsStore";
import { useUIStore } from "../../store/uiStore";
import { fmtLength, fmtStress } from "../../utils/units";
import { APP_VERSION } from "../../lib/version";
import { CreditsBadge } from "./statusbar/CreditsBadge";
import { WSStatus } from "./statusbar/WSStatus";
import { AccountDialog } from "../dialogs/AccountDialog";


export function StatusBar() {
  const model = useModelStore((s) => s.model);
  const { isRunning, progress, progressMessage } = useAnalysisStore();
  const { staticResults, modalResults } = useResultsStore();
  const setDialog = useUIStore((s) => s.setOpenDialog);
  const [accountOpen, setAccountOpen] = useState(false);

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
    <>
      <div className="flex items-center px-2 sm:px-3 py-1.5 border-t border-border bg-bg-panel text-xs text-ink-muted gap-2 sm:gap-4 overflow-hidden">
        {/* Status: sempre visibile */}
        <span className={isRunning ? "text-accent-warning flex-shrink-0" : "text-accent-success flex-shrink-0"} data-testid="statusbar-status">
          ● {isRunning ? "Esec." : "Pronto"}
        </span>
        {/* Nodi: sempre visibili */}
        <span className="flex-shrink-0">N: <span className="numeric text-ink">{nNodes}</span></span>
        {/* Elementi: da sm in su */}
        <span className="flex-shrink-0 hidden sm:inline">E: <span className="numeric text-ink">{nElems}</span></span>
        {/* DoF: da md in su */}
        <span className="flex-shrink-0 hidden md:inline">DoF: <span className="numeric text-ink">{nDofs}</span></span>

        {staticResults && (
          <>
            {/* Max u: da sm in su */}
            <span className="flex-shrink-0 hidden sm:inline">Max u: <span className="numeric text-accent-primary">
              {fmtLength(staticResults.max_displacement)}
            </span></span>
            {/* Max σ: da md in su */}
            <span className="flex-shrink-0 hidden md:inline">Max σ: <span className="numeric text-accent-warning">
              {fmtStress(staticResults.max_stress)}
            </span></span>
            {/* Equilibrio: solo da lg in su (richiede tooltip leggibile) */}
            {equilibrium && (
              <span className="flex-shrink-0 hidden lg:inline" title={
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
                   equilibrium.relErr < 1e-1 ? "⚠ approx" : "✕ ERR"}
                </span>
              </span>
            )}
            {/* Solver time: solo da lg in su */}
            <span className="flex-shrink-0 hidden lg:inline">Solver: <span className="numeric text-ink">
              {staticResults.solve_time_ms.toFixed(0)} ms
            </span></span>
          </>
        )}
        {modalResults && modalResults.modes[0] && (
          <span className="flex-shrink-0 hidden md:inline">f₁: <span className="numeric text-accent-primary">
            {modalResults.modes[0].frequency_hz.toFixed(3)} Hz
          </span></span>
        )}

        <div className="flex-1 min-w-0" />

        {/* Progress bar in-line per analisi/solver corrente */}
        {isRunning && (
          <div className="flex items-center gap-2 min-w-0 sm:min-w-[200px] md:min-w-[280px]" data-testid="statusbar-progress">
            <span className="text-ink-dim truncate max-w-[120px] sm:max-w-[200px] hidden sm:inline">{progressMessage}</span>
            <div className="w-16 sm:w-32 h-1.5 bg-border rounded overflow-hidden flex-shrink-0">
              <div
                className="h-full bg-accent transition-all"
                style={{ width: `${Math.round(progress * 100)}%` }}
                data-testid="statusbar-progress-bar"
              />
            </div>
            <span className="numeric text-ink flex-shrink-0">{Math.round(progress * 100)}%</span>
          </div>
        )}

        {/* WS dot (alpha.19) */}
        <WSStatus />

        {/* Credits badge (alpha.19) */}
        <CreditsBadge onClick={() => setAccountOpen(true)} />

        {/* Help */}
        <button
          className="text-ink-dim hover:text-accent text-[11px] flex-shrink-0"
          onClick={() => setDialog("help")}
          title="Mostra cheat-sheet shortcut"
          data-testid="statusbar-help"
        >? <span className="hidden sm:inline">Help</span></button>

        {/* Version (alpha.19: da APP_VERSION constant) */}
        <span className="text-ink-dim flex-shrink-0 hidden lg:inline" data-testid="statusbar-version">
          FEA Pro {APP_VERSION}
        </span>
      </div>

      <AccountDialog open={accountOpen} onClose={() => setAccountOpen(false)} />
    </>
  );
}
