/**
 * WorkspaceLayout (Precision v2.0) — B1 grid shell della Studio Pro.
 *
 * Mockup B1 di handoff Claude Design. Layout-only wrapper, niente atoms.
 * Espone slot per:
 *   - `topbar`      (full width, 48px)
 *   - `missionBar`  (full width sotto topbar, opzionale)
 *   - `leftRail`    (112px desktop, 56px tablet, hidden mobile)
 *   - `leftPanel`   (opzionale, slide-in da sinistra · 320-480px)
 *   - `viewport`    (centro, fill remaining space)
 *   - `rightRail`   (56px desktop+tablet, sotto MobileTabbar mobile)
 *   - `rightPanel`  (ModelInfoCard sidebar 296px, opzionale)
 *   - `statusBar`   (full width, 28px)
 *
 * Grid CSS:
 *   Desktop (≥lg 1280px):  112 · 1fr · 56 · 296 · rows: 48 · auto · 1fr · 28
 *   Tablet  (md 1024-1280): 56  · 1fr · 56 · 220 · rows: 48 · auto · 1fr · 28
 *   Mobile  (<md):         viewport full + MobileTabbar (tabbar è esterno qui)
 *
 * Quando `leftPanel` è valorizzato:
 *   - Desktop: appare a destra della leftRail (slide-in 360-480px)
 *   - Mobile: full-screen sopra viewport (gestito da MobilePanel esterno)
 */
import { type ReactNode } from "react";
import { cn } from "../ui/cn";

interface Props {
  topbar?: ReactNode;
  missionBar?: ReactNode;
  leftRail: ReactNode;
  leftPanel?: ReactNode;
  /** Larghezza del leftPanel quando aperto. Default 384. */
  leftPanelWidth?: number;
  viewport: ReactNode;
  rightRail?: ReactNode;
  rightPanel?: ReactNode;
  /** Larghezza del rightPanel quando aperto. Default 296. */
  rightPanelWidth?: number;
  statusBar?: ReactNode;
  className?: string;
}

export function WorkspaceLayout({
  topbar,
  missionBar,
  leftRail,
  leftPanel,
  leftPanelWidth = 384,
  viewport,
  rightRail,
  rightPanel,
  rightPanelWidth = 296,
  statusBar,
  className,
}: Props) {
  // Le colonne le calcoliamo dinamicamente in funzione di leftPanel/rightPanel/rightRail.
  // Forma generale: leftRail · leftPanel? · viewport · rightRail? · rightPanel?
  const cols: string[] = ["clamp(56px,8vw,112px)"];
  if (leftPanel) cols.push(`${leftPanelWidth}px`);
  cols.push("1fr");
  if (rightRail) cols.push("56px");
  if (rightPanel) cols.push(`${rightPanelWidth}px`);

  // Conta colonne effettive per il colSpan delle righe full-width (topbar, missionBar, statusBar).
  const colCount = cols.length;

  return (
    <div
      className={cn(
        "h-screen w-screen overflow-hidden bg-bg",
        "grid",
        className,
      )}
      style={{
        gridTemplateColumns: cols.join(" "),
        gridTemplateRows: "48px auto 1fr 28px",
      }}
      data-testid="workspace-layout"
    >
      {/* Topbar — full width */}
      {topbar && (
        <div className="border-b border-border" style={{ gridColumn: `1 / ${colCount + 1}`, gridRow: "1" }}>
          {topbar}
        </div>
      )}

      {/* Mission bar — full width sotto topbar, attraverso TUTTE le colonne tranne leftRail */}
      {missionBar && (
        <div
          className="border-b border-border"
          style={{
            gridColumn: `2 / ${colCount + 1}`,
            gridRow: "2",
          }}
        >
          {missionBar}
        </div>
      )}

      {/* Left rail — full height (sotto topbar) */}
      <aside
        className="border-r border-border bg-bg-panel overflow-y-auto"
        style={{
          gridColumn: "1",
          gridRow: missionBar ? "2 / 4" : "2 / 4",
        }}
      >
        {leftRail}
      </aside>

      {/* Left panel (drill-in) — opzionale, fra leftRail e viewport */}
      {leftPanel && (
        <div
          className="border-r border-border bg-bg-panel overflow-y-auto animate-slide-right"
          style={{
            gridColumn: "2",
            gridRow: missionBar ? "2 / 4" : "2 / 4",
          }}
          data-testid="workspace-left-panel"
        >
          {leftPanel}
        </div>
      )}

      {/* Viewport — centro */}
      <main
        className="relative overflow-hidden bg-bg-viewport"
        style={{
          gridColumn: leftPanel ? "3" : "2",
          gridRow: missionBar ? "3" : "2 / 4",
        }}
        data-testid="workspace-viewport"
      >
        {viewport}
      </main>

      {/* Right rail */}
      {rightRail && (
        <aside
          className="border-l border-border bg-bg-panel overflow-y-auto"
          style={{
            gridColumn: rightPanel ? `${colCount - 1}` : `${colCount}`,
            gridRow: missionBar ? "2 / 4" : "2 / 4",
          }}
        >
          {rightRail}
        </aside>
      )}

      {/* Right panel (ModelInfoCard sidebar) */}
      {rightPanel && (
        <aside
          className="border-l border-border bg-bg-panel overflow-y-auto"
          style={{
            gridColumn: `${colCount}`,
            gridRow: missionBar ? "2 / 4" : "2 / 4",
          }}
          data-testid="workspace-right-panel"
        >
          {rightPanel}
        </aside>
      )}

      {/* Status bar — full width */}
      {statusBar && (
        <div className="border-t border-border" style={{ gridColumn: `1 / ${colCount + 1}`, gridRow: "4" }}>
          {statusBar}
        </div>
      )}
    </div>
  );
}
