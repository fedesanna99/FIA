import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@radix-ui/react-tooltip";

vi.mock("../../api/billing", async () => {
  const actual = await vi.importActual<typeof import("../../api/billing")>("../../api/billing");
  return { ...actual, estimateCost: vi.fn().mockResolvedValue(null) };
});

vi.mock("../../hooks/useAnalysis", () => ({
  useRunAnalysis: () => vi.fn(),
}));


import { SolvePanel } from "./SolvePanel";
import { useWorkspaceStore } from "../../store/workspaceStore";
import { useModelStore } from "../../store/modelStore";


function renderPanel() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <TooltipProvider><SolvePanel /></TooltipProvider>
    </QueryClientProvider>
  );
}


beforeEach(() => {
  useWorkspaceStore.setState({
    workspace: "analysis",
    activeTab: { analysis: "linear" } as any,
    currentLeftPanel: "solve",
    currentRightPanel: null,
    // v1.5.2 Task 39: pre-imposta "lineari" per saltare la vista hub.
    currentLeftTab: "lineari",
    currentRightTab: null,
    isAiPanelOpen: false,
    isSettingsOpen: false,
    isEmptyState: false,
    helpOpen: false,
    paletteOpen: false,
  });
  useModelStore.setState({ model: null } as any);
  window.localStorage.clear();
});


describe("SolvePanel (Sprint 5 G10 / alpha.25)", () => {
  it("renders header with title 'Solve' + close button", () => {
    renderPanel();
    // v1.5.2 Task 39: il breadcrumb "← Solve" duplica il match — usare
    // getAllByText perche' ora ci sono 2 elementi con "Solve" (heading + back).
    expect(screen.getAllByText("Solve").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByTestId("panel-solve-close")).toBeInTheDocument();
  });

  // v1.8 (post-T6): tab orizzontali rimosse. Navigation via hub-card click.
  it("drill-in NON mostra la tab bar orizzontale (coerenza con Inspect)", () => {
    renderPanel();
    expect(screen.queryByTestId("panel-solve-tab-lineari")).toBeNull();
    expect(screen.queryByTestId("panel-solve-tab-dinamica")).toBeNull();
    expect(screen.queryByTestId("panel-solve-tab-sismica")).toBeNull();
    expect(screen.queryByTestId("panel-solve-tab-nonlin")).toBeNull();
  });

  it("default tab 'lineari' shows 3 analysis options", () => {
    renderPanel();
    expect(screen.getByTestId("solve-option-static")).toBeInTheDocument();
    expect(screen.getByTestId("solve-option-modal")).toBeInTheDocument();
    expect(screen.getByTestId("solve-option-buckling")).toBeInTheDocument();
  });

  it("CostPreviewCard is rendered inline in Lineari tab (FLAGSHIP)", () => {
    renderPanel();
    expect(screen.getByTestId("cost-preview-card")).toBeInTheDocument();
  });

  it("clicking analysis option updates aria-pressed", () => {
    renderPanel();
    const modalBtn = screen.getByTestId("solve-option-modal");
    fireEvent.click(modalBtn);
    expect(modalBtn).toHaveAttribute("aria-pressed", "true");
  });

  it("Run button disabled when no model", () => {
    renderPanel();
    const runBtn = screen.getByTestId("solve-run-linear") as HTMLButtonElement;
    expect(runBtn.disabled).toBe(true);
  });

  it("Run button enabled when model loaded", () => {
    useModelStore.setState({
      model: { id: "x", name: "T", nodes: [], elements: [], loads: [], constraints: [] },
    } as any);
    renderPanel();
    const runBtn = screen.getByTestId("solve-run-linear") as HTMLButtonElement;
    expect(runBtn.disabled).toBe(false);
  });

  it("close button calls closeLeftPanel", () => {
    renderPanel();
    fireEvent.click(screen.getByTestId("panel-solve-close"));
    expect(useWorkspaceStore.getState().currentLeftPanel).toBeNull();
  });

  it("drill-in Dinamica mostra CostPreviewCard (via setLeftTab)", () => {
    useWorkspaceStore.setState({ currentLeftTab: "dinamica" } as any);
    renderPanel();
    expect(screen.getByTestId("cost-preview-card")).toBeInTheDocument();
  });
});
