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
import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { useModelStore } from "../../store/modelStore";
import { useAnalysisStore } from "../../store/analysisStore";
import { useResultsStore } from "../../store/resultsStore";
import { useUIStore } from "../../store/uiStore";
import { fmtLength, fmtStress } from "../../utils/units";
import { APP_VERSION } from "../../lib/version";
import { CreditsBadge } from "./statusbar/CreditsBadge";
import { WSStatus } from "./statusbar/WSStatus";
import { AccountDialog } from "../dialogs/AccountDialog";

/** Formatta ETA in formato "X s" o "Xm Ys" leggibile. */
function fmtEta(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "—";
  if (seconds < 60) return `${Math.ceil(seconds)} s`;
  const m = Math.floor(seconds / 60);
  const s = Math.ceil(seconds - m * 60);
  return `${m}m ${s}s`;
}


export function StatusBar() {
  const model = useModelStore((s) => s.model);
  const { isRunning, progress, progressMessage, analysisType } = useAnalysisStore();
  const { staticResults, modalResults } = useResultsStore();
  const setDialog = useUIStore((s) => s.setOpenDialog);
  const [accountOpen, setAccountOpen] = useState(false);

  // alpha.30: ETA per il job live. Salva il timestamp di inizio quando
  // isRunning va true; ricalcola ETA = elapsed * (1 - progress) / progress
  // (linear extrapolation). Reset a 0 quando isRunning torna false.
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [nowTick, setNowTick] = useState(Date.now());
  useEffect(() => {
    if (isRunning && startedAt === null) setStartedAt(Date.now());
    if (!isRunning && startedAt !== null) setStartedAt(null);
  }, [isRunning, startedAt]);
  useEffect(() => {
    if (!isRunning) return;
    const t = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, [isRunning]);
  const etaText = useMemo(() => {
    if (!isRunning || startedAt === null || progress <= 0.01) return "—";
    const elapsedS = (nowTick - startedAt) / 1000;
    const remainingS = elapsedS * (1 - progress) / progress;
    return fmtEta(remainingS);
  }, [isRunning, startedAt, nowTick, progress]);

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

        {/* Job live inline pillola (mockup v1.3): icona spin + nome + bar + ETA */}
        {isRunning && (
          <div
            className="flex items-center gap-2 bg-bg-info border border-accent/20 text-ink-info px-2 py-0.5 rounded-md text-[11px] flex-shrink-0"
            data-testid="statusbar-progress"
            title={progressMessage}
          >
            <Loader2 className="w-3 h-3 animate-spin flex-shrink-0" />
            <span className="font-medium capitalize hidden sm:inline">{analysisType}</span>
            <div className="w-16 sm:w-20 h-1 bg-accent/15 rounded-sm overflow-hidden flex-shrink-0">
              <div
                className="h-full bg-accent transition-all"
                style={{ width: `${Math.round(progress * 100)}%` }}
                data-testid="statusbar-progress-bar"
              />
            </div>
            <span className="font-mono flex-shrink-0">
              {Math.round(progress * 100)}%
              <span className="hidden md:inline"> · {etaText}</span>
            </span>
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
