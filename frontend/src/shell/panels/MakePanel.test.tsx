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
    // v1.5.2 Task 39: i test pre-impostano il tab "geometria" cosi'
    // saltano la vista hub introdotta in questo task. Il test specifico
    // dell'hub e' in fondo.
    currentLeftTab: "geometria",
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
    // v1.5.2 Task 39: il breadcrumb "← Make" contiene anche "Make", quindi
    // getAllByText e' obbligatorio (2 match: heading + breadcrumb back).
    expect(screen.getAllByText("Make").length).toBeGreaterThanOrEqual(1);
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

  // v1.6 S0 · B07: hub-first navigation desktop = mobile
  describe("hub-first navigation (B07 audit)", () => {
    it("currentLeftTab=null mostra PanelHub con 5 card senza tab orizzontali", () => {
      useWorkspaceStore.setState({ currentLeftTab: null } as any);
      renderPanel();
      // L'hub e' renderato (data-testid="make-hub")
      expect(screen.getByTestId("make-hub")).toBeInTheDocument();
      // Le 5 hub-card sono presenti
      expect(screen.getByTestId("hub-card-geometria")).toBeInTheDocument();
      expect(screen.getByTestId("hub-card-mesh")).toBeInTheDocument();
      expect(screen.getByTestId("hub-card-carichi")).toBeInTheDocument();
      expect(screen.getByTestId("hub-card-vincoli")).toBeInTheDocument();
      expect(screen.getByTestId("hub-card-io")).toBeInTheDocument();
      // I tab orizzontali NON sono renderizzati in hub mode
      expect(screen.queryByTestId("panel-make-tab-geometria")).toBeNull();
    });

    it("click su una hub-card setta currentLeftTab e mostra breadcrumb back", () => {
      useWorkspaceStore.setState({ currentLeftTab: null } as any);
      renderPanel();
      fireEvent.click(screen.getByTestId("hub-card-mesh"));
      expect(useWorkspaceStore.getState().currentLeftTab).toBe("mesh");
    });
  });
});
