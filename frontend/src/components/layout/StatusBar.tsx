/**
 * StatusBar (Precision v2.0 PR18 batch C) — barra inferiore minimal.
 *
 * Layout: [dot status]  [N · E · DoF]  ── [job live]  [WS]  [Help · vX]
 * Tutto font-mono uppercase tracking-wide-1 per coerenza con eyebrow Precision.
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
  const statusColor = isRunning ? "bg-warn" : model ? "bg-success" : "bg-ink-3";

  return (
    <div className="h-7 flex items-center px-3 border-t border-border bg-bg-panel font-mono text-[10px] uppercase tracking-wide-1 text-ink-3 gap-3 overflow-hidden flex-shrink-0">
      {/* 1. Stato modello/runtime */}
      <div className="inline-flex items-center gap-1.5 flex-shrink-0 font-semibold" data-testid="statusbar-status">
        <span className={`w-1.5 h-1.5 rounded-full ${statusColor}`} />
        {statusText}
      </div>

      {/* 2. Entita' modello (aggregate, solo se modello attivo) */}
      {model && (
        <span className="flex-shrink-0 hidden sm:inline" data-testid="statusbar-counts">
          N: <span className="text-ink-2 tabular-nums">{nNodes}</span>
          {" · "}
          E: <span className="text-ink-2 tabular-nums">{nElems}</span>
          {" · "}
          DoF: <span className="text-ink-2 tabular-nums">{nDofs}</span>
          {" · "}
          <span className="text-ink-2">{model.is_3d ? "3D" : "2D"}</span>
          {" · "}
          <span className="text-ink-2">{model.units}</span>
        </span>
      )}

      <div className="flex-1 min-w-0" />

      {/* Job live inline pillola Precision */}
      {isRunning && (
        <div
          className="inline-flex items-center gap-2 bg-bg-info border border-accent/30 text-accent px-2 py-0.5 flex-shrink-0 normal-case tracking-normal"
          data-testid="statusbar-progress"
          title={progressMessage}
        >
          <Loader2 className="w-3 h-3 animate-spin flex-shrink-0" />
          <span className="font-medium capitalize hidden sm:inline text-[11px]">{analysisType}</span>
          <div className="w-16 sm:w-20 h-1 bg-accent/15 overflow-hidden flex-shrink-0">
            <div
              className="h-full bg-accent transition-all"
              style={{ width: `${Math.round(progress * 100)}%` }}
              data-testid="statusbar-progress-bar"
            />
          </div>
          <span className="font-mono flex-shrink-0 text-[10px] uppercase tracking-wide-1 tabular-nums">
            {Math.round(progress * 100)}%
            <span className="hidden md:inline normal-case tracking-normal"> · {etaText}</span>
          </span>
        </div>
      )}

      {/* 3. Connessione (WS) */}
      <WSStatus />

      {/* 4. Help + version */}
      <button
        type="button"
        className="inline-flex items-center gap-1 text-ink-3 hover:text-ink transition-colors flex-shrink-0 font-semibold"
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
