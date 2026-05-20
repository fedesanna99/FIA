import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";


vi.mock("../../api/client", () => ({
  openProgressSocket: vi.fn(() => ({
    close: vi.fn(),
  })),
}));


import { LiveMonitorPanel } from "./LiveMonitorPanel";
import { useModelStore } from "../../store/modelStore";
import { useAnalysisStore } from "../../store/analysisStore";


const SAMPLE_MODEL = {
  id: "test_lm", name: "test", is_3d: false,
  nodes: [], elements: [], loads: [], constraints: [],
};


beforeEach(() => {
  vi.clearAllMocks();
  act(() => {
    useModelStore.setState({
      model: SAMPLE_MODEL as never,
      selectedNodeIds: new Set(),
      selectedElementIds: new Set(),
    });
    useAnalysisStore.setState({
      isRunning: false,
      progress: 0,
      progressMessage: "",
    });
  });
});


describe("LiveMonitorPanel", () => {
  it("renders without crashing", () => {
    render(<LiveMonitorPanel />);
    // titolo o badge di stato presenti
    expect(document.body.textContent).toMatch(/idle|running|monitor|live/i);
  });

  it("shows running badge when analysis is in progress", () => {
    act(() => {
      useAnalysisStore.setState({
        isRunning: true, progress: 0.5, progressMessage: "Solving...",
      });
    });
    render(<LiveMonitorPanel />);
    // Italian label per "in esecuzione"; cerco anche progress message
    expect(document.body.textContent).toMatch(/esecuzione|solving/i);
  });

  it("renders idle/inattivo when no analysis is running", () => {
    render(<LiveMonitorPanel />);
    expect(document.body.textContent).toMatch(/idle|inattivo|in attesa|nessuna/i);
  });
});
