/**
 * StatusBar (alpha.31 — Progressive Disclosure Task 27).
 *
 * Layout finale snellito: 4 voci essenziali sempre visibili (mockup v1.3):
 *   [● Pronto/Nessun modello]  [N · E · DoF]  ──spacer──
 *   [job live se isRunning]  [● Online]  [? · vX.Y]
 *
 * Voci RIMOSSE rispetto ad alpha.19:
 *   - Max u, Max σ, Equilibrio, Solver time, f₁ → vivono nei panel
 *     Results / Inspect, non servono in statusbar
 *   - CreditsBadge → ridondante con la QuotaCard in Dashboard
 *
 * Voci CONSERVATE:
 *   - status (Pronto / Nessun modello / Esec.)
 *   - entita' aggregate N · E · DoF (font-mono inline)
 *   - job live inline (solo se isRunning)
 *   - WSStatus (online/offline)
 *   - Help + APP_VERSION
 */
import { useEffect, useMemo, useState } from "react";
import { Loader2, HelpCircle } from "lucide-react";
import { useModelStore } from "../../store/modelStore";
import { useAnalysisStore } from "../../store/analysisStore";
import { useUIStore } from "../../store/uiStore";
import { APP_VERSION } from "../../lib/version";
import { WSStatus } from "./statusbar/WSStatus";

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
  const setDialog = useUIStore((s) => s.setOpenDialog);

  // ETA per il job live (linear extrapolation come alpha.30)
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

  const statusText = isRunning ? "Esec." : model ? "Pronto" : "Nessun modello";
  const statusColor = isRunning ? "bg-warn" : model ? "bg-success" : "bg-ink-dim";

  return (
    <div className="h-7 flex items-center px-3 border-t border-border bg-bg-panel text-[11px] text-ink-muted gap-3 overflow-hidden flex-shrink-0">
      {/* 1. Stato modello/runtime */}
      <div className="flex items-center gap-1.5 flex-shrink-0" data-testid="statusbar-status">
        <span className={`w-1.5 h-1.5 rounded-full ${statusColor}`} />
        {statusText}
      </div>

      {/* 2. Entita' modello (aggregate, solo se modello attivo) */}
      {model && (
        <span className="font-mono flex-shrink-0 hidden sm:inline">
          N: <span className="text-ink">{nNodes}</span>
          {" · "}
          E: <span className="text-ink">{nElems}</span>
          {" · "}
          DoF: <span className="text-ink">{nDofs}</span>
        </span>
      )}

      <div className="flex-1 min-w-0" />

      {/* Job live inline pillola (preservato alpha.30) */}
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

      {/* 3. Connessione (WS) */}
      <WSStatus />

      {/* 4. Help + version */}
      <button
        type="button"
        className="flex items-center gap-1 text-ink-dim hover:text-ink transition-colors flex-shrink-0"
        onClick={() => setDialog("help")}
        title="Mostra cheat-sheet shortcut"
        data-testid="statusbar-help"
      >
        <HelpCircle className="w-3 h-3" />
        <span className="hidden sm:inline">? · v{APP_VERSION.replace(/^v/, "")}</span>
      </button>
    </div>
  );
}
