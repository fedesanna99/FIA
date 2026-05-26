// v2.6.2 Shell · HUD Legend (top-left)
// Colormap legend per stress visualization. In Fase 2 placeholder visuale
// con gradient + axis ticks; il binding ai valori reali σ_max/σ_min
// arriverà in Fase 3 (Risultati workspace restyled).

import { Sliders } from "lucide-react";
import { useResultsStore } from "../../store/resultsStore";

export function ViewportHudLegend() {
  const showStressColormap = useResultsStore((s) => s.showStressColormap);

  if (!showStressColormap) return null;

  return (
    <div className="vp-hud vp-legend" data-hud="legend">
      <div className="vp-hud-row" style={{ justifyContent: "space-between" }}>
        <span className="vp-hud-title">σ Von Mises</span>
        <button
          type="button"
          className="vp-ctrl-btn"
          style={{ height: 20, padding: "0 5px" }}
          aria-label="Cambia colormap"
        >
          <Sliders size={11} />
        </button>
      </div>
      <div className="vp-legend-bar" />
      <div className="vp-legend-axis">
        <span>0.0</span>
        <span>44.6</span>
        <span>89.1</span>
        <span>133</span>
        <span>178</span>
      </div>
      <div className="vp-legend-unit">MPa</div>
    </div>
  );
}
