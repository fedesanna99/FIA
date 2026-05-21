import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@radix-ui/react-tooltip";

import { MakePanel } from "./MakePanel";
import { useWorkspaceStore } from "../../store/workspaceStore";
import { useModelStore } from "../../store/modelStore";
import { useUIStore } from "../../store/uiStore";


function renderPanel() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <TooltipProvider><MakePanel /></TooltipProvider>
    </QueryClientProvider>
  );
}


beforeEach(() => {
  useWorkspaceStore.setState({
    workspace: "model",
    activeTab: {} as any,
    currentLeftPanel: "make",
    currentRightPanel: null,
    currentLeftTab: null,
    currentRightTab: null,
    isAiPanelOpen: false,
    isSettingsOpen: false,
    isEmptyState: false,
    helpOpen: false,
    paletteOpen: false,
  });
  useModelStore.setState({ model: null } as any);
  useUIStore.setState({ openDialog: null } as any);
  window.localStorage.clear();
});


describe("MakePanel (Sprint 5 G9 / alpha.24)", () => {
  it("renders header with title 'Make' + close button", () => {
    renderPanel();
    expect(screen.getByText("Make")).toBeInTheDocument();
    expect(screen.getByTestId("panel-make-close")).toBeInTheDocument();
  });

  it("renders all 5 tabs (Geometria/Mesh/Carichi/Vincoli/I/O)", () => {
    renderPanel();
    expect(screen.getByTestId("panel-make-tab-geometria")).toBeInTheDocument();
    expect(screen.getByTestId("panel-make-tab-mesh")).toBeInTheDocument();
    expect(screen.getByTestId("panel-make-tab-carichi")).toBeInTheDocument();
    expect(screen.getByTestId("panel-make-tab-vincoli")).toBeInTheDocument();
    expect(screen.getByTestId("panel-make-tab-io")).toBeInTheDocument();
  });

  it("default tab is 'geometria' showing empty state when no model", () => {
    renderPanel();
    expect(screen.getByText(/Nessun modello caricato/i)).toBeInTheDocument();
  });

  it("click on Mesh tab switches and shows mesh wizard button", () => {
    renderPanel();
    fireEvent.click(screen.getByTestId("panel-make-tab-mesh"));
    expect(useWorkspaceStore.getState().currentLeftTab).toBe("mesh");
    expect(screen.getByTestId("make-open-mesh-wizard")).toBeInTheDocument();
  });

  it("click on Carichi tab shows Add load button (disabled if no model)", () => {
    renderPanel();
    fireEvent.click(screen.getByTestId("panel-make-tab-carichi"));
    const btn = screen.getByTestId("make-add-load") as HTMLButtonElement;
    expect(btn).toBeInTheDocument();
    expect(btn.disabled).toBe(true); // no model
  });

  it("Add load button enabled when model exists", () => {
    useModelStore.setState({
      model: { id: "x", name: "Test", nodes: [], elements: [], loads: [], constraints: [] },
    } as any);
    renderPanel();
    fireEvent.click(screen.getByTestId("panel-make-tab-carichi"));
    const btn = screen.getByTestId("make-add-load") as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });

  it("Click Add load opens 'load' dialog via uiStore", () => {
    useModelStore.setState({
      model: { id: "x", name: "Test", nodes: [], elements: [], loads: [], constraints: [] },
    } as any);
    renderPanel();
    fireEvent.click(screen.getByTestId("panel-make-tab-carichi"));
    fireEvent.click(screen.getByTestId("make-add-load"));
    expect(useUIStore.getState().openDialog).toBe("load");
  });

  it("Close button calls closeLeftPanel", () => {
    renderPanel();
    fireEvent.click(screen.getByTestId("panel-make-close"));
    expect(useWorkspaceStore.getState().currentLeftPanel).toBeNull();
  });

  it("aria-selected on active tab", () => {
    useWorkspaceStore.setState({ currentLeftTab: "vincoli" } as any);
    renderPanel();
    expect(screen.getByTestId("panel-make-tab-vincoli"))
      .toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("panel-make-tab-geometria"))
      .toHaveAttribute("aria-selected", "false");
  });
});
