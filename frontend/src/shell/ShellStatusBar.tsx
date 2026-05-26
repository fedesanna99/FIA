// v2.6.2 Shell · Status Bar (h-28px) · v2.6.5 D.3 enrichment per A1 mockup
//
// Layout §3.7: connessione + WebSocket + Sync + counters modello + spacer +
// solver + zoom + unità + snap + version.
//
// v2.6.5 D.3 (mockup Dashboard A1):
//   - WebSocket dot indicator (connesso/disconnesso). Per ora `connected=true`
//     statico (carry-over: hook `useWebSocketStatus()` quando wsClient esporrà
//     readyState reactive)
//   - Sync OK (statico per ora — carry-over a backend `last_sync_at` field)
//   - Counter modelli aperti (sempre 1 quando model è attivo, 0 altrimenti)
//   - Crediti inline (read da billing quota se disponibile)
//
// Dati reali da useModelStore (counters), useAnalysisStore (isRunning),
// useAuthStore (online state). Placeholder Fase 2 per selezione e zoom %.

import { useQuery } from "@tanstack/react-query";
import { useModelStore } from "../store/modelStore";
import { useAnalysisStore } from "../store/analysisStore";
import { useAuthStore } from "../store/authStore";
import { getQuota } from "../api/billing";
import { APP_VERSION } from "../lib/version";

export function ShellStatusBar() {
  const model = useModelStore((s) => s.model);
  const isRunning = useAnalysisStore((s) => s.isRunning);
  const authUser = useAuthStore((s) => s.user);

  const nNodes = model?.nodes?.length ?? 0;
  const nElements = model?.elements?.length ?? 0;
  const nLoads = model?.loads?.length ?? 0;
  const nConstraints = model?.constraints?.length ?? 0;

  // v2.6.5 D.3: crediti inline letti da billing quota (cache 30s — coerente
  // con Dashboard widget Crediti). NO refetch al solver tick (statusbar
  // sopravvive a tutta la sessione, no scope creep).
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

  // v2.6.5 D.3: WebSocket connection status. Per ora "connesso" statico
  // (la app non ha hook reactive su wsClient.readyState). Carry-over:
  // `useWebSocketStatus()` in `frontend/src/lib/wsStatus.ts` quando il
  // ws client esporrà event onopen/onclose globale.
  const wsConnected = true;

  // v2.6.5 D.3: counter modelli aperti. Per ora 0|1 (un solo modello attivo
  // in workspaceStore.activeId). Multi-modello aperti = carry-over v2.7+.
  const openModelsCount = model ? 1 : 0;

  // Sync status: per ora "OK" statico finché non c'è backend last_sync_at
  // o WebSocket Y.js diff propagation.
  const syncStatus = "OK";

  return (
    <footer className="shell-statusbar" data-shell="statusbar">
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

      <div className="sb-item">
        <span className="sb-k">Solver</span>
        <span className={`sb-dot ${isRunning ? "warn" : ""}`} />
        <span className="sb-v">{isRunning ? "running" : "ready"}</span>
      </div>
      <div className="sb-sep" />
      {model && (
        <>
          <div className="sb-item">
            <span className="sb-v">
              {nNodes} nodi · {nElements} elem · {nConstraints} vincoli · {nLoads} carichi
            </span>
          </div>
          <div className="sb-sep" />
        </>
      )}
      <div className="sb-item" data-testid="sb-credits">
        <span className="sb-v">{creditsUsed}/{creditsCap} cr</span>
      </div>
      <div className="sb-sep" />
      <div className="sb-item">
        <span className="sb-kbd-inline">⌘K</span>
        <span className="sb-v">Cerca</span>
      </div>
      <div className="sb-sep" />
      <div className="sb-item">
        <span className="sb-k">{APP_VERSION}</span>
      </div>
    </footer>
  );
}
