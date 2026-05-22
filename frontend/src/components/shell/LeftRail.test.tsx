import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TooltipProvider } from "@radix-ui/react-tooltip";

import { LeftRail } from "./LeftRail";
import { useWorkspaceStore } from "../../store/workspaceStore";
import { useLeftRailStore } from "../../store/leftRailStore";


beforeEach(() => {
  useWorkspaceStore.setState({
    workspace: "model",
    activeTab: {} as any,
    helpOpen: false,
    paletteOpen: false,
  });
  // alpha.22: LeftRail e' ora toggle slide-in. Reset slide state.
  useLeftRailStore.setState({ openSection: null });
  window.localStorage.clear();
});


function renderRail() {
  return render(
    <TooltipProvider>
      <LeftRail />
    </TooltipProvider>
  );
}


describe("LeftRail (v1.5.2: Make/Solve/Verify · legacy Results/IO rimossi)", () => {
  it("renders 3 main workspace buttons (Make/Solve/Verify)", () => {
    renderRail();
    expect(screen.getByTestId("left-rail-model")).toBeInTheDocument();
    expect(screen.getByTestId("left-rail-analysis")).toBeInTheDocument();
    expect(screen.getByTestId("left-rail-verify")).toBeInTheDocument();
  });

  it("does NOT render legacy Results/IO buttons (v1.5.2 Task 35)", () => {
    renderRail();
    expect(screen.queryByTestId("left-rail-results")).toBeNull();
    expect(screen.queryByTestId("left-rail-io")).toBeNull();
  });

  it("click on Solve opens slide panel + sets workspace=analysis", () => {
    renderRail();
    fireEvent.click(screen.getByTestId("left-rail-analysis"));
    expect(useWorkspaceStore.getState().workspace).toBe("analysis");
    expect(useLeftRailStore.getState().openSection).toBe("analysis");
  });

  it("click on Verify opens slide panel + sets workspace=verify", () => {
    renderRail();
    fireEvent.click(screen.getByTestId("left-rail-verify"));
    expect(useWorkspaceStore.getState().workspace).toBe("verify");
    expect(useLeftRailStore.getState().openSection).toBe("verify");
  });

  it("click on Make opens slide panel + sets workspace=model", () => {
    useWorkspaceStore.setState({ workspace: "analysis" } as any);
    renderRail();
    fireEvent.click(screen.getByTestId("left-rail-model"));
    expect(useWorkspaceStore.getState().workspace).toBe("model");
    expect(useLeftRailStore.getState().openSection).toBe("model");
  });

  it("toggle: clicking same active button closes slide panel", () => {
    useLeftRailStore.setState({ openSection: "model" });
    renderRail();
    fireEvent.click(screen.getByTestId("left-rail-model"));
    // workspace sempre sincronizzato
    expect(useWorkspaceStore.getState().workspace).toBe("model");
    // ma il panel ora chiuso
    expect(useLeftRailStore.getState().openSection).toBeNull();
  });

  it("active button has aria-current=page when slide is open", () => {
    useLeftRailStore.setState({ openSection: "analysis" });
    renderRail();
    expect(screen.getByTestId("left-rail-analysis")).toHaveAttribute("aria-current", "page");
    expect(screen.getByTestId("left-rail-model")).not.toHaveAttribute("aria-current", "page");
  });

  it("aria-expanded reflects open state (toggle pattern)", () => {
    renderRail();
    expect(screen.getByTestId("left-rail-model")).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(screen.getByTestId("left-rail-model"));
    expect(screen.getByTestId("left-rail-model")).toHaveAttribute("aria-expanded", "true");
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
