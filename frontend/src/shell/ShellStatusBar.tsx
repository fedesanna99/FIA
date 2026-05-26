// v2.6.2 Shell · Status Bar (h-28px)
//
// Layout §3.7: connessione + selezione + unità + snap + spacer + solver +
// collab + zoom + counters modello + versione app.
//
// Dati reali da useModelStore (counters), useAnalysisStore (isRunning),
// useAuthStore (online state). Placeholder Fase 2 per selezione e zoom %.

import { useModelStore } from "../store/modelStore";
import { useAnalysisStore } from "../store/analysisStore";
import { APP_VERSION } from "../lib/version";

export function ShellStatusBar() {
  const model = useModelStore((s) => s.model);
  const isRunning = useAnalysisStore((s) => s.isRunning);

  const nNodes = model?.nodes?.length ?? 0;
  const nElements = model?.elements?.length ?? 0;
  const nLoads = model?.loads?.length ?? 0;
  const nConstraints = model?.constraints?.length ?? 0;

  return (
    <footer className="shell-statusbar" data-shell="statusbar">
      <div className="sb-item">
        <span className={`sb-dot ${isRunning ? "warn" : ""}`} />
        <span className="sb-v">{isRunning ? "Solver…" : "Online"}</span>
        <span className="sb-k">· fea-pro.fly.dev</span>
      </div>
      <div className="sb-sep" />
      <div className="sb-item">
        <span className="sb-k">Unità</span>
        <span className="sb-v">SI · kN, m, MPa</span>
      </div>
      <div className="sb-sep" />
      <div className="sb-item">
        <span className="sb-k">Snap</span>
        <span className="sb-v">0.10 m</span>
      </div>

      <div className="sb-spacer" />

      <div className="sb-item">
        <span className="sb-k">Solver</span>
        <span className={`sb-dot ${isRunning ? "warn" : ""}`} />
        <span className="sb-v">{isRunning ? "running" : "ready"}</span>
      </div>
      <div className="sb-sep" />
      <div className="sb-item">
        <span className="sb-k">Zoom</span>
        <span className="sb-v">100%</span>
      </div>
      <div className="sb-sep" />
      {model && (
        <div className="sb-item">
          <span className="sb-v">
            {nNodes} nodi · {nElements} elem · {nConstraints} vincoli · {nLoads} carichi
          </span>
        </div>
      )}
      <div className="sb-sep" />
      <div className="sb-item">
        <span className="sb-k">{APP_VERSION}</span>
      </div>
    </footer>
  );
}
