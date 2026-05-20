import { useAnalysisStore } from "../../store/analysisStore";

/**
 * HUD overlay in alto-sinistra che mostra il tool corrente e i suoi parametri.
 */
export function ToolHUD() {
  const tool = useAnalysisStore((s) => s.viewportTool);
  const setTool = useAnalysisStore((s) => s.setViewportTool);
  const snapEnabled = useAnalysisStore((s) => s.snapEnabled);
  const toggleSnap = useAnalysisStore((s) => s.toggleSnap);
  const snapResolution = useAnalysisStore((s) => s.snapResolution);
  const setSnapResolution = useAnalysisStore((s) => s.setSnapResolution);

  if (tool === "select") return null;

  return (
    <div className="absolute top-4 left-4 z-30 bg-bg-panel/95 border border-accent-primary backdrop-blur rounded p-3 text-xs shadow-lg"
         style={{ minWidth: 260 }}>
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-accent-primary">⊕ Modalità: nuovo nodo</span>
        <button className="text-ink-dim hover:text-ink text-lg leading-none"
                onClick={() => setTool("select")} title="Annulla (Esc)">×</button>
      </div>
      <div className="text-ink-muted text-[11px] mb-2 leading-snug">
        Click sul piano XY per posizionare un nuovo nodo.<br/>
        Tieni premuto <kbd className="numeric text-[10px] bg-bg px-1 rounded border border-border">Shift</kbd> per piazzarne in serie.
      </div>
      <label className="flex items-center gap-2 cursor-pointer mb-1">
        <input type="checkbox" checked={snapEnabled} onChange={toggleSnap} />
        <span>Snap-to-grid</span>
      </label>
      {snapEnabled && (
        <div className="flex items-center gap-2 mt-1">
          <span className="text-ink-muted">Risoluzione</span>
          <input
            type="number" step="0.1" min="0.01"
            className="input numeric w-20" value={snapResolution}
            onChange={(e) => setSnapResolution(Number(e.target.value))}
          />
          <span className="text-ink-dim">m</span>
        </div>
      )}
    </div>
  );
}
