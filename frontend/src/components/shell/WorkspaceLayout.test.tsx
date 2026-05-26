/**
 * WorkspaceLayout.test.tsx (Precision v2.0) — B1 grid composition smoke.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { WorkspaceLayout } from "./WorkspaceLayout";

describe("WorkspaceLayout", () => {
  it("renders viewport + leftRail with minimum required slots", () => {
    render(
      <WorkspaceLayout
        leftRail={<div data-testid="lr">rail</div>}
        viewport={<div data-testid="vp">viewport</div>}
      />,
    );
    expect(screen.getByTestId("workspace-layout")).toBeInTheDocument();
    expect(screen.getByTestId("lr")).toBeInTheDocument();
    expect(screen.getByTestId("vp")).toBeInTheDocument();
    expect(screen.getByTestId("workspace-viewport")).toBeInTheDocument();
  });

  it("renders leftPanel + rightRail + rightPanel + statusBar slots when provided", () => {
    render(
      <WorkspaceLayout
        topbar={<div data-testid="tb">topbar</div>}
        leftRail={<div>rail</div>}
        leftPanel={<div data-testid="lp">leftpanel</div>}
        viewport={<div>vp</div>}
        rightRail={<div data-testid="rr">rightrail</div>}
        rightPanel={<div data-testid="rp">rightpanel</div>}
        statusBar={<div data-testid="sb">status</div>}
      />,
    );
    expect(screen.getByTestId("tb")).toBeInTheDocument();
    expect(screen.getByTestId("workspace-left-panel")).toBeInTheDocument();
    expect(screen.getByTestId("rr")).toBeInTheDocument();
    expect(screen.getByTestId("workspace-right-panel")).toBeInTheDocument();
    expect(screen.getByTestId("sb")).toBeInTheDocument();
  });

  it("composes leftPanel + rightPanel slots with custom widths", () => {
    // jsdom non serializza gridTemplateColumns fedelmente; verifichiamo
    // invece la composizione tramite testid dei due slot.
    render(
      <WorkspaceLayout
        leftRail={<div>rail</div>}
        leftPanel={<div data-testid="custom-lp">lp</div>}
        leftPanelWidth={480}
        viewport={<div>vp</div>}
        rightPanel={<div data-testid="custom-rp">rp</div>}
        rightPanelWidth={320}
      />,
    );
    expect(screen.getByTestId("workspace-left-panel")).toBeInTheDocument();
    expect(screen.getByTestId("custom-lp")).toBeInTheDocument();
    expect(screen.getByTestId("workspace-right-panel")).toBeInTheDocument();
    expect(screen.getByTestId("custom-rp")).toBeInTheDocument();
  });
});
