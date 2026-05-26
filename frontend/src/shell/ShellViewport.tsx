// v2.6.2 Shell · Viewport wrapper
//
// Wrapper della Canvas R3F esistente (Viewport3D), ospita i 6 HUD floating
// del mockup §3.4. NON tocca il Canvas/scene: si limita a posizionare gli
// overlay attorno.
//
// HUD floating posizionati con `position: absolute` via classi `.vp-hud` +
// posizione specifica (.vp-legend, .vp-controls, ecc.) in shell.css.

import { ReactNode } from "react";
import { ViewportHudLegend } from "./hud/ViewportHudLegend";
import { ViewportHudControls } from "./hud/ViewportHudControls";
import { ViewportHudSelection } from "./hud/ViewportHudSelection";
import { ViewportHudGizmo } from "./hud/ViewportHudGizmo";
import { ViewportHudRuler } from "./hud/ViewportHudRuler";
import { ViewportHudZoom } from "./hud/ViewportHudZoom";

interface ShellViewportProps {
  children?: ReactNode;
  showSelectionHud?: boolean;
}

export function ShellViewport({ children, showSelectionHud = false }: ShellViewportProps) {
  return (
    <section className="shell-viewport" aria-label="Viewport 3D" data-shell="viewport">
      {/* Canvas R3F (Viewport3D) ospitato come children */}
      {children}

      {/* HUD floating — z-index gestito da .vp-hud (sopra Canvas) */}
      <ViewportHudLegend />
      <ViewportHudControls />
      {showSelectionHud && <ViewportHudSelection />}
      <ViewportHudGizmo />
      <ViewportHudRuler />
      <ViewportHudZoom />
    </section>
  );
}
