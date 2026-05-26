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

// v2.6.3.1 BUG-#1 fix: workspace che richiedono area workspace piena
// (~1000px+) per il rendering corretto dei pattern handoff Precision.
// I pattern con grid orizzontale (es. ChecksDetailTable grid-cols-[240px_1fr])
// collassano nel right panel ShellPanel 380px (1fr → ~80px). Quando il
// workspace è in takeover mode, la grid Shell passa da 3-col (rail+vp+panel)
// a 2-col (rail+takeover-content) e il pannello-content è renderizzato a
// piena larghezza fullArea, NON dentro ShellViewport.
//
// Trade-off: il Canvas R3F è unmount-remount al cambio workspace (perdita
// stato view R3F). Accettabile perché:
//   - In Verifiche l'utente non vede il viewport (è una tabella)
//   - Cambio workspace è raro (una volta per minuti)
//   - Stato modello/results vive in Zustand (no perdita reale)
const VIEWPORT_TAKEOVER_WORKSPACES: ShellWorkspaceId[] = ["verifiche"];

const WORKSPACE_CONTENT_NORMAL: Record<ShellWorkspaceId, ReactNode> = {
  modello: <MakePanel />,
  analisi: <SolvePanel />,
  risultati: <InspectPanel />,
  verifiche: <VerifyPanel />,
  io: <ToolsPanel />,
};

// In takeover mode passiamo `fullArea` al panel content quando lo supporta,
// così PanelChrome rimuove le width fisse 300/340/380 e l'area workspace
// resta veramente full (~1000px+).
const WORKSPACE_CONTENT_TAKEOVER: Partial<Record<ShellWorkspaceId, ReactNode>> = {
  verifiche: <VerifyPanel fullArea />,
};

export function Shell({ children }: ShellProps) {
  const [activeWs, setActiveWs] = useState<ShellWorkspaceId>("modello");
  const isTakeover = VIEWPORT_TAKEOVER_WORKSPACES.includes(activeWs);
  const takeoverContent = isTakeover ? WORKSPACE_CONTENT_TAKEOVER[activeWs] : null;

  return (
    <div
      className={`shell shell-soft shell-density-comfy shell-panel-w-380 shell-vp-neutral theme-light${
        isTakeover ? " shell-takeover-on" : ""
      }`}
    >
      <ShellTopBar />

      <div className="shell-mid">
        <ShellRail active={activeWs} onChange={setActiveWs} />
        {isTakeover && takeoverContent ? (
          <main className="shell-takeover-content" data-testid="shell-takeover-content">
            {takeoverContent}
          </main>
        ) : (
          <>
            <ShellViewport>{children}</ShellViewport>
            <ShellPanel workspace={activeWs}>{WORKSPACE_CONTENT_NORMAL[activeWs]}</ShellPanel>
          </>
        )}
      </div>

      <ShellStatusBar />

      <ShellCommandPalette />
    </div>
  );
}
