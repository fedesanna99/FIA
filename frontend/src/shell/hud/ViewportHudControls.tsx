// v2.6.2 Shell · HUD Controls (top-right)
// Persp/Ortho + Solid/Wireframe + Grid toggle. Bind a analysisStore.projection
// e useAnalysisStore.viewportMode/showGrid.

import { Box, Grid3x3, Layers } from "lucide-react";
import { useAnalysisStore } from "../../store/analysisStore";

export function ViewportHudControls() {
  const projection = useAnalysisStore((s) => s.projection);
  const setProjection = useAnalysisStore((s) => s.setProjection);
  const viewportMode = useAnalysisStore((s) => s.viewportMode);
  const setViewportMode = useAnalysisStore((s) => s.setViewportMode);
  const showGrid = useAnalysisStore((s) => s.showGrid);
  const toggleGrid = useAnalysisStore((s) => s.toggleGrid);

  return (
    <div className="vp-hud vp-controls" data-hud="controls">
      <button
        type="button"
        className={`vp-ctrl-btn ${projection === "perspective" ? "on" : ""}`}
        onClick={() => setProjection("perspective")}
        aria-label="Prospettica"
      >
        <Box size={12} /> Persp
      </button>
      <button
        type="button"
        className={`vp-ctrl-btn ${projection === "orthographic" ? "on" : ""}`}
        onClick={() => setProjection("orthographic")}
        aria-label="Ortografica"
      >
        <Grid3x3 size={12} /> Ortho
      </button>
      <span
        style={{ width: 1, background: "var(--border)", margin: "4px 2px" }}
        aria-hidden
      />
      <button
        type="button"
        className={`vp-ctrl-btn ${viewportMode === "solid" ? "on" : ""}`}
        onClick={() => setViewportMode(viewportMode === "solid" ? "wireframe" : "solid")}
        aria-label={viewportMode === "solid" ? "Solid" : "Wireframe"}
      >
        <Layers size={12} /> {viewportMode === "solid" ? "Solid" : "Wire"}
      </button>
      <button
        type="button"
        className={`vp-ctrl-btn ${showGrid ? "on" : ""}`}
        onClick={toggleGrid}
        aria-label="Toggle griglia"
      >
        <Grid3x3 size={12} />
      </button>
    </div>
  );
}
