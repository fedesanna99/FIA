/**
 * WSStatus (alpha.19) — Sprint 4 / Asse G4.
 *
 * Indicator dot live per la connessione: pinga `/api/health` ogni 30s
 * e mostra un dot verde se online, ambra se rallentato (>500ms),
 * rosso se offline. Tooltip mostra latency + ultimo check.
 *
 * Decisione: NON usiamo WebSocket reale (overhead) — fetch `/api/health`
 * e' sufficiente per indicatore presenza backend. WS reali continuano a
 * essere usati da `useJobs` / `useAnalysis` separatamente.
 */
import { useEffect, useState } from "react";
import { Tooltip } from "../../ui/Tooltip";


interface PingState {
  status: "ok" | "slow" | "offline";
  latencyMs: number | null;
  lastCheck: number;
}


async function pingHealth(): Promise<{ ok: boolean; latencyMs: number }> {
  const t0 = performance.now();
  try {
    const r = await fetch("/api/health", { method: "GET", cache: "no-store" });
    const latencyMs = performance.now() - t0;
    return { ok: r.ok, latencyMs };
  } catch {
    return { ok: false, latencyMs: performance.now() - t0 };
  }
}


export function WSStatus() {
  const [state, setState] = useState<PingState>({
    status: "ok",
    latencyMs: null,
    lastCheck: 0,
  });

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const { ok, latencyMs } = await pingHealth();
      if (cancelled) return;
      setState({
        status: ok ? (latencyMs > 500 ? "slow" : "ok") : "offline",
        latencyMs,
        lastCheck: Date.now(),
      });
    }

    check();
    const id = window.setInterval(check, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const colorClass =
    state.status === "ok"      ? "bg-success" :
    state.status === "slow"    ? "bg-warn"    :
    "bg-danger";

  const label =
    state.status === "ok"      ? "Online" :
    state.status === "slow"    ? "Slow"   :
    "Offline";

  return (
    <Tooltip
      content={
        <div>
          <div className="font-semibold">Backend · {label}</div>
          {state.latencyMs !== null && (
            <div className="text-ink-3 text-[11px] mt-0.5">
              Latency {state.latencyMs.toFixed(0)} ms
            </div>
          )}
        </div>
      }
    >
      <div
        className="flex items-center gap-1 px-1 cursor-default"
        data-testid="statusbar-ws-status"
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${colorClass} ${state.status === "ok" ? "animate-pulse" : ""}`}
          aria-label={label}
        />
        <span className="text-[11px] text-ink-3 hidden lg:inline">{label}</span>
      </div>
    </Tooltip>
  );
}
