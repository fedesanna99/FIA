// v2.6.2 Shell · Orchestrator
//
// Telaio principale dell'app desktop con modello attivo.
// Layout grid 48/1fr/28 × 56/1fr/380 secondo §3.1 DESIGN_HANDOFF.
//
// Composizione:
//   TopBar (48)
//   mid:  [Rail 56] [Viewport children] [Panel 380]
//   StatusBar (28)
//   CommandPalette (overlay)
//
// Children = il Canvas R3F (Viewport3D) montato dall'esterno, così la Shell
// non ha vincoli sul rendering 3D.
//
// Workspace state: leggiamo `workspaceStore.workspace` (legacy: model/analysis/
// verify) e lo mappiamo al workspace nuovo (modello/analisi/risultati/...).
// Mapping completo refactor: Fase 5.

import { ReactNode, useState } from "react";
import { ShellTopBar } from "./ShellTopBar";
import { ShellRail } from "./ShellRail";
import { ShellViewport } from "./ShellViewport";
import { ShellPanel } from "./ShellPanel";
import { ShellStatusBar } from "./ShellStatusBar";
import { ShellCommandPalette } from "./ShellCommandPalette";
import { MakePanel } from "./panels/MakePanel";
import { SolvePanel } from "./panels/SolvePanel";
import { VerifyPanel } from "./panels/VerifyPanel";
import { InspectPanel } from "./panels/InspectPanel";
import { ToolsPanel } from "./panels/ToolsPanel";

type ShellWorkspaceId = "modello" | "analisi" | "risultati" | "verifiche" | "io";

interface ShellProps {
  /** Canvas R3F (Viewport3D) — montato dal chiamante per separation of concerns. */
  children: ReactNode;
}

const WORKSPACE_CONTENT: Record<ShellWorkspaceId, ReactNode> = {
  modello: <MakePanel />,
  analisi: <SolvePanel />,
  risultati: <InspectPanel />,
  verifiche: <VerifyPanel />,
  io: <ToolsPanel />,
};

export function Shell({ children }: ShellProps) {
  const [activeWs, setActiveWs] = useState<ShellWorkspaceId>("modello");

  return (
    <div className="shell shell-soft shell-density-comfy shell-panel-w-380 shell-vp-neutral theme-light">
      <ShellTopBar />

      <div className="shell-mid">
        <ShellRail active={activeWs} onChange={setActiveWs} />
        <ShellViewport>{children}</ShellViewport>
        <ShellPanel workspace={activeWs}>{WORKSPACE_CONTENT[activeWs]}</ShellPanel>
      </div>

      <ShellStatusBar />

      <ShellCommandPalette />
    </div>
  );
}
