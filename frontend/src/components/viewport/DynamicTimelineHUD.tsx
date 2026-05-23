import { useResultsStore } from "../../store/resultsStore";

/**
 * HUD overlay con timeline e controlli play/pause per la risposta dinamica.
 */
export function DynamicTimelineHUD() {
  const dyn = useResultsStore((s) => s.dynamicResults);
  const show = useResultsStore((s) => s.showDynamicAnimation);
  const animating = useResultsStore((s) => s.dynamicAnimating);
  const setAnimating = useResultsStore((s) => s.setDynamicAnimating);
  const timeIdx = useResultsStore((s) => s.dynamicTimeIndex);
  const setTimeIdx = useResultsStore((s) => s.setDynamicTimeIndex);
  const scale = useResultsStore((s) => s.dynamicAmpScale);
  const setScale = useResultsStore((s) => s.setDynamicAmpScale);

  if (!dyn || !show) return null;
  const t = dyn.times[timeIdx] ?? 0;
  const tMax = dyn.times[dyn.times.length - 1] ?? 0;

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-bg-panel/95 backdrop-blur border border-border rounded p-3 flex items-center gap-3 text-xs shadow-pop"
         style={{ minWidth: 480 }}>
      <button
        className="btn btn-primary"
        onClick={() => setAnimating(!animating)}
        title={animating ? "Pausa" : "Play"}
      >
        {animating ? "❚❚" : "▶"}
      </button>
      <div className="flex flex-col items-center min-w-[80px]">
        <span className="text-ink-3 text-[10px] uppercase">tempo</span>
        <span className="numeric text-accent-primary">
          {t.toFixed(3)} / {tMax.toFixed(2)} s
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={dyn.times.length - 1}
        value={timeIdx}
        onChange={(e) => {
          setTimeIdx(Number(e.target.value));
          if (animating) setAnimating(false);
        }}
        className="flex-1"
      />
      <div className="flex items-center gap-1">
        <span className="label">Scala</span>
        <input
          type="number"
          className="input w-16 numeric"
          value={scale}
          onChange={(e) => setScale(Number(e.target.value))}
        />
        <span className="text-ink-3">×</span>
      </div>
    </div>
  );
}
