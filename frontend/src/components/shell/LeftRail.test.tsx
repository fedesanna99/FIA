import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TooltipProvider } from "@radix-ui/react-tooltip";

import { LeftRail } from "./LeftRail";
import { useWorkspaceStore } from "../../store/workspaceStore";


beforeEach(() => {
  useWorkspaceStore.setState({
    workspace: "model",
    activeTab: {} as any,
    helpOpen: false,
    paletteOpen: false,
  });
  window.localStorage.clear();
});


function renderRail() {
  return render(
    <TooltipProvider>
      <LeftRail />
    </TooltipProvider>
  );
}


describe("LeftRail (alpha.20: Make/Solve/Verify + Results/IO legacy)", () => {
  it("renders 3 main workspace buttons + 2 secondary legacy", () => {
    renderRail();
    // 3 main (workflow): model=Make, analysis=Solve, verify=Verify
    expect(screen.getByTestId("left-rail-model")).toBeInTheDocument();
    expect(screen.getByTestId("left-rail-analysis")).toBeInTheDocument();
    expect(screen.getByTestId("left-rail-verify")).toBeInTheDocument();
    // 2 secondary (legacy deep-link)
    expect(screen.getByTestId("left-rail-results")).toBeInTheDocument();
    expect(screen.getByTestId("left-rail-io")).toBeInTheDocument();
  });

  it("click on Solve switches workspace to analysis", () => {
    renderRail();
    fireEvent.click(screen.getByTestId("left-rail-analysis"));
    expect(useWorkspaceStore.getState().workspace).toBe("analysis");
  });

  it("click on Verify switches workspace to verify", () => {
    renderRail();
    fireEvent.click(screen.getByTestId("left-rail-verify"));
    expect(useWorkspaceStore.getState().workspace).toBe("verify");
  });

  it("click on Make (model) switches workspace to model", () => {
    useWorkspaceStore.setState({ workspace: "analysis" } as any);
    renderRail();
    fireEvent.click(screen.getByTestId("left-rail-model"));
    expect(useWorkspaceStore.getState().workspace).toBe("model");
  });

  it("active button has aria-current=page", () => {
    useWorkspaceStore.setState({ workspace: "analysis" } as any);
    renderRail();
    expect(screen.getByTestId("left-rail-analysis")).toHaveAttribute("aria-current", "page");
    expect(screen.getByTestId("left-rail-model")).not.toHaveAttribute("aria-current", "page");
  });

  it("secondary items use ink-faint color (deprecated visual cue)", () => {
    renderRail();
    const secondary = screen.getByTestId("left-rail-results");
    // Quando NON attivo, deve avere classe text-ink-faint
    expect(secondary.className).toMatch(/text-ink-faint/);
  });

  it("palette button is rendered", () => {
    renderRail();
    expect(screen.getByTestId("left-rail-palette")).toBeInTheDocument();
  });

  it("clicking palette button toggles palette open", () => {
    renderRail();
    expect(useWorkspaceStore.getState().paletteOpen).toBe(false);
    fireEvent.click(screen.getByTestId("left-rail-palette"));
    expect(useWorkspaceStore.getState().paletteOpen).toBe(true);
  });

  it("help button opens documentation", () => {
    renderRail();
    expect(useWorkspaceStore.getState().helpOpen).toBe(false);
    fireEvent.click(screen.getByTestId("left-rail-help"));
    expect(useWorkspaceStore.getState().helpOpen).toBe(true);
  });
});
