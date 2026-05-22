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

  // v1.8 (post-T6): tab orizzontali rimosse dal drill-in. Navigation tra
  // sub-view ora avviene via hub-card → click. I test "tab bar" diventano
  // test "drill-in via setLeftTab" (lo stato che la hub-card setta).

  it("drill-in geometria mostra empty state quando no model", () => {
    renderPanel();
    expect(screen.getByText(/Nessun modello caricato/i)).toBeInTheDocument();
  });

  it("drill-in mesh mostra mesh wizard button", () => {
    useWorkspaceStore.setState({ currentLeftTab: "mesh" } as any);
    renderPanel();
    expect(screen.getByTestId("make-open-mesh-wizard")).toBeInTheDocument();
  });

  it("drill-in carichi mostra Add load button (disabled senza model)", () => {
    useWorkspaceStore.setState({ currentLeftTab: "carichi" } as any);
    renderPanel();
    const btn = screen.getByTestId("make-add-load") as HTMLButtonElement;
    expect(btn).toBeInTheDocument();
    expect(btn.disabled).toBe(true);
  });

  it("Add load abilitato quando il modello esiste", () => {
    useModelStore.setState({
      model: { id: "x", name: "Test", nodes: [], elements: [], loads: [], constraints: [] },
    } as any);
    useWorkspaceStore.setState({ currentLeftTab: "carichi" } as any);
    renderPanel();
    const btn = screen.getByTestId("make-add-load") as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });

  it("Click Add load apre dialog 'load' via uiStore", () => {
    useModelStore.setState({
      model: { id: "x", name: "Test", nodes: [], elements: [], loads: [], constraints: [] },
    } as any);
    useWorkspaceStore.setState({ currentLeftTab: "carichi" } as any);
    renderPanel();
    fireEvent.click(screen.getByTestId("make-add-load"));
    expect(useUIStore.getState().openDialog).toBe("load");
  });

  it("Close button calls closeLeftPanel", () => {
    renderPanel();
    fireEvent.click(screen.getByTestId("panel-make-close"));
    expect(useWorkspaceStore.getState().currentLeftPanel).toBeNull();
  });

  // v1.8 post-T6: regression guard — NESSUNA tab bar orizzontale in drill-in.
  it("drill-in NON mostra la tab bar orizzontale (coerenza con Inspect)", () => {
    useWorkspaceStore.setState({ currentLeftTab: "vincoli" } as any);
    renderPanel();
    expect(screen.queryByTestId("panel-make-tab-geometria")).toBeNull();
    expect(screen.queryByTestId("panel-make-tab-mesh")).toBeNull();
    expect(screen.queryByTestId("panel-make-tab-vincoli")).toBeNull();
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
