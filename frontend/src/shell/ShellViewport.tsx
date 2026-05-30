// v2.6.2 Shell · Viewport wrapper
//
// Wrapper della Canvas R3F esistente (Viewport3D), ospita i 6 HUD floating
// del mockup §3.4. NON tocca il Canvas/scene: si limita a posizionare gli
// overlay attorno.
//
// HUD floating posizionati con `position: absolute` via classi `.vp-hud` +
// posizione specifica (.vp-legend, .vp-controls, ecc.) in shell.css.
//
// v3.4 Fetta M5 mobile (30/05/2026 mattina): doppio-tap su mobile entra
// in focus mode (escape valve viewport pieno). Gate `isMobile` → desktop
// non e' toccato (focus mode resta accessibile via toggle topbar o F).
// Il hook `useDoubleTap` skippa tap su elementi interattivi (HUD buttons)
// quindi cliccare su Zoom/Ruler/Legend non triggera erroneamente focus.
// Vedi ADR 004 D6 (Opzioni A+C combinate: viewport invariato + escape
// doppio-tap full-screen).

import { ReactNode } from "react";
import { ViewportHudLegend } from "./hud/ViewportHudLegend";
import { ViewportHudControls } from "./hud/ViewportHudControls";
import { ViewportHudSelection } from "./hud/ViewportHudSelection";
import { ViewportHudGizmo } from "./hud/ViewportHudGizmo";
import { ViewportHudRuler } from "./hud/ViewportHudRuler";
import { ViewportHudZoom } from "./hud/ViewportHudZoom";
import { useWorkspaceStore } from "../store/workspaceStore";
import { useIsMobile } from "../hooks/useIsMobile";
import { useDoubleTap } from "../hooks/useDoubleTap";

interface ShellViewportProps {
  children?: ReactNode;
  showSelectionHud?: boolean;
}

export function ShellViewport({ children, showSelectionHud = false }: ShellViewportProps) {
  // v3.4 Fetta M5: cablato doppio-tap → focus mode su mobile.
  // `enterEmptyState` e' il toggle gia' esistente di Fetta 0 — qui
  // solo nuovo trigger (touch-friendly) per la stessa azione.
  const isMobile = useIsMobile();
  const enterFocus = useWorkspaceStore((s) => s.enterEmptyState);
  const { onClick: handleViewportTap } = useDoubleTap(enterFocus, isMobile);

  return (
    <section
      className="shell-viewport"
      aria-label="Viewport 3D"
      data-shell="viewport"
      onClick={handleViewportTap}
    >
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
