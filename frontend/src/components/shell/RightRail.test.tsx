import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TooltipProvider } from "@radix-ui/react-tooltip";

import { RightRail } from "./RightRail";
import { RightSlidePanel } from "./RightSlidePanel";
import { useRightRailStore } from "../../store/rightRailStore";


beforeEach(() => {
  useRightRailStore.setState({ openSection: null });
  window.localStorage.clear();
});


function renderShell() {
  return render(
    <TooltipProvider>
      <div style={{ position: "relative", width: 800, height: 600 }}>
        <RightRail />
        <RightSlidePanel />
      </div>
    </TooltipProvider>
  );
}


describe("RightRail", () => {
  it("renders 4 rail buttons (inspect/view/tools/history)", () => {
    renderShell();
    expect(screen.getByTestId("right-rail-inspect")).toBeInTheDocument();
    expect(screen.getByTestId("right-rail-view")).toBeInTheDocument();
    expect(screen.getByTestId("right-rail-tools")).toBeInTheDocument();
    expect(screen.getByTestId("right-rail-history")).toBeInTheDocument();
  });

  it("opens Inspect panel on click", async () => {
    const user = userEvent.setup();
    renderShell();
    expect(screen.queryByTestId("right-panel-inspect")).toBeNull();
    await user.click(screen.getByTestId("right-rail-inspect"));
    expect(screen.getByTestId("right-panel-inspect")).toBeInTheDocument();
  });

  it("toggle: second click closes the same panel", async () => {
    const user = userEvent.setup();
    renderShell();
    await user.click(screen.getByTestId("right-rail-view"));
    expect(screen.getByTestId("right-panel-view")).toBeInTheDocument();
    await user.click(screen.getByTestId("right-rail-view"));
    expect(screen.queryByTestId("right-panel-view")).toBeNull();
  });

  it("click on different button replaces panel (no close)", async () => {
    const user = userEvent.setup();
    renderShell();
    await user.click(screen.getByTestId("right-rail-view"));
    expect(screen.getByTestId("right-panel-view")).toBeInTheDocument();
    await user.click(screen.getByTestId("right-rail-tools"));
    expect(screen.queryByTestId("right-panel-view")).toBeNull();
    expect(screen.getByTestId("right-panel-tools")).toBeInTheDocument();
  });

  it("close button (X) hides the panel", async () => {
    const user = userEvent.setup();
    renderShell();
    await user.click(screen.getByTestId("right-rail-history"));
    expect(screen.getByTestId("right-panel-history")).toBeInTheDocument();
    await user.click(screen.getByTestId("right-panel-close"));
    expect(screen.queryByTestId("right-panel-history")).toBeNull();
  });

  it("aria-current=page on active rail button", async () => {
    const user = userEvent.setup();
    renderShell();
    await user.click(screen.getByTestId("right-rail-inspect"));
    expect(screen.getByTestId("right-rail-inspect")).toHaveAttribute(
      "aria-current", "page"
    );
    expect(screen.getByTestId("right-rail-view")).not.toHaveAttribute(
      "aria-current", "page"
    );
  });

  it("aria-expanded reflects open state", async () => {
    const user = userEvent.setup();
    renderShell();
    const btn = screen.getByTestId("right-rail-tools");
    expect(btn).toHaveAttribute("aria-expanded", "false");
    await user.click(btn);
    expect(btn).toHaveAttribute("aria-expanded", "true");
  });
});
