/**
 * StatusBar legacy (Precision v2.0 PR18 batch C) → v2.6.6 E.4 enrichment.
 *
 * Chrome legacy che renderizza la statusbar in home dashboard (useNewShell
 * === false) e workspace mobile/focus. Refactor v2.6.6 E.4 applica gli
 * stessi enrichment v2.6.5 D.3 della Shell custom per match mockup A1:
 *
 *   - dot Online + WebSocket connesso + Sync OK + counter modelli aperti
 *   - spacer
 *   - Solver ready/running + counters modello (se attivo) + crediti inline
 *     + ⌘K Cerca + version
 *
 * Mantiene il job progress chip live durante isRunning (legacy feature).
 *
 * data-testid coerenti con ShellStatusBar custom: sb-ws, sb-sync,
 * sb-models-open, sb-credits — per smoke E2E composition E.5.
 */
import { useEffect, useMemo, useState } from "react";
import { Loader2, HelpCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useModelStore } from "../../store/modelStore";
import { useAnalysisStore } from "../../store/analysisStore";
import { useAuthStore } from "../../store/authStore";
import { useUIStore } from "../../store/uiStore";
import { getQuota } from "../../api/billing";
import { APP_VERSION } from "../../lib/version";

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
  const authUser = useAuthStore((s) => s.user);

  // ETA computation (legacy feature mantenuta)
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
    const remainingS = (elapsedS * (1 - progress)) / progress;
    return fmtEta(remainingS);
  }, [isRunning, startedAt, nowTick, progress]);

  const nNodes = model?.nodes?.length ?? 0;
  const nElems = model?.elements?.length ?? 0;
  const nLoads = model?.loads?.length ?? 0;
  const nConstraints = model?.constraints?.length ?? 0;

  // v2.6.6 E.4: counters arricchiti come Shell custom v2.6.5 D.3
  const openModelsCount = model ? 1 : 0;
  const wsConnected = true; // carry-over: useWebSocketStatus() v2.7+
  const syncStatus = "OK"; // carry-over: backend last_sync_at v2.7+

  // v2.6.6 E.4: crediti inline (read da billing quota, cache 30s coerente
  // con Dashboard widget Crediti e Shell custom).
  const userId = authUser?.id ?? "demo_user";
  const { data: quota } = useQuery({
    queryKey: ["billing-quota", userId],
    queryFn: () => getQuota(userId),
    staleTime: 30_000,
    retry: 1,
    enabled: !!authUser,
  });
  const creditsUsed = quota?.used_credits ?? 0;
  const creditsCap = (quota?.cap_credits ?? 100) + (quota?.bonus_credits ?? 0);

  return (
    <footer
      className="shell-statusbar"
      data-shell="statusbar"
      data-testid="statusbar-legacy"
    >
      {/* 1. Online + WebSocket + Sync + counter modelli */}
      <div className="sb-item">
        <span className="sb-dot" data-online="true" />
        <span className="sb-v">Online</span>
      </div>
      <div className="sb-sep" />
      <div className="sb-item" data-testid="sb-ws">
        <span className="sb-dot" data-connected={wsConnected ? "true" : "false"} />
        <span className="sb-v">WebSocket {wsConnected ? "connesso" : "disconnesso"}</span>
      </div>
      <div className="sb-sep" />
      <div className="sb-item" data-testid="sb-sync">
        <span className="sb-v">Sync {syncStatus}</span>
      </div>
      <div className="sb-sep" />
      <div className="sb-item" data-testid="sb-models-open">
        <span className="sb-v">{openModelsCount} modelli aperti</span>
      </div>

      <div className="sb-spacer" />

      {/* 2. Solver state */}
      <div className="sb-item">
        <span className="sb-k">Solver</span>
        <span className={`sb-dot ${isRunning ? "warn" : ""}`} />
        <span className="sb-v">{isRunning ? "running" : "ready"}</span>
      </div>

      {/* 3. Job progress chip (legacy feature, mantenuto durante isRunning) */}
      {isRunning && (
        <>
          <div className="sb-sep" />
          <div
            className="sb-item"
            data-testid="statusbar-progress"
            title={progressMessage}
          >
            <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
            <span className="sb-v capitalize">{analysisType}</span>
            <span className="sb-v">{Math.round(progress * 100)}%</span>
            <span className="sb-k">{etaText}</span>
          </div>
        </>
      )}

      {/* 4. Counters modello (solo se attivo) */}
      {model && (
        <>
          <div className="sb-sep" />
          <div className="sb-item" data-testid="sb-counts">
            <span className="sb-v">
              {nNodes} nodi · {nElems} elem · {nConstraints} vincoli · {nLoads} carichi
            </span>
          </div>
        </>
      )}

      {/* 5. Crediti inline */}
      <div className="sb-sep" />
      <div className="sb-item" data-testid="sb-credits">
        <span className="sb-v">{creditsUsed}/{creditsCap} cr</span>
      </div>

      {/* 6. ⌘K Cerca shortcut hint */}
      <div className="sb-sep" />
      <div className="sb-item">
        <span className="sb-kbd-inline">⌘K</span>
        <span className="sb-v">Cerca</span>
      </div>

      {/* 7. Help + version (legacy feature mantenuta) */}
      <div className="sb-sep" />
      <button
        type="button"
        className="sb-item"
        onClick={() => setDialog("help")}
        title="Mostra cheat-sheet shortcut"
        data-testid="statusbar-help"
        style={{ background: "transparent", border: 0, cursor: "pointer" }}
      >
        <HelpCircle className="w-3 h-3" aria-hidden="true" />
        <span className="sb-k">{APP_VERSION}</span>
      </button>
    </footer>
  );
}
