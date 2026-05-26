// v2.6.2 Shell · HUD Zoom (bottom-center)
// Pan + Zoom out + value % + Zoom in + Fit + Maximize.
// Placeholder Fase 2: i bottoni sono renderizzati ma non bindati al camera
// store (Fase 3+).

import { Move, ZoomOut, ZoomIn, Crosshair, Maximize2 } from "lucide-react";

export function ViewportHudZoom() {
  return (
    <div className="vp-hud vp-zoom" aria-label="Controlli zoom" data-hud="zoom">
      <button type="button" aria-label="Pan" title="Pan">
        <Move size={14} />
      </button>
      <span className="vp-zoom-sep" />
      <button type="button" aria-label="Zoom out" title="Zoom out">
        <ZoomOut size={14} />
      </button>
      <span className="vp-zoom-val">100%</span>
      <button type="button" aria-label="Zoom in" title="Zoom in">
        <ZoomIn size={14} />
      </button>
      <span className="vp-zoom-sep" />
      <button type="button" aria-label="Centra vista (F)" title="Fit (F)">
        <Crosshair size={14} />
      </button>
      <span className="vp-zoom-sep" />
      <button type="button" aria-label="Schermo intero" title="Schermo intero">
        <Maximize2 size={14} />
      </button>
    </div>
  );
}
