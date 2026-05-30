/**
 * Test ShellInspectorPanel (v3.4 Fetta E2.3 · 30/05/2026 mattina)
 *
 * Verifica:
 *   - render empty state quando niente selezionato
 *   - render NodeDetail (mock) quando selectedNodeId set
 *   - render ElementDetailPlaceholder quando selectedElementId set
 *   - Subtitle dinamico (Nodo N / Elemento E / "Nessuna selezione")
 *   - Click X: clear selection + apre panel "open"
 *   - mutual exclusion del selectionStore rispettata
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ShellInspectorPanel } from "./ShellInspectorPanel";
import { useSelectionStore } from "../store/selectionStore";
import { useRightPanelStore } from "../store/rightPanelStore";
import { useModelStore } from "../store/modelStore";

// NodeDetail (esistente Sprint 5 G11) ha dipendenze pesanti: stub semplice
// per testare l'orchestrazione del ShellInspectorPanel senza il tree dei
// suoi child (gia' coperti dai loro test dedicati).
vi.mock("./panels/inspect/NodeDetail", () => ({
  NodeDetail: ({ nodeId }: { nodeId: number }) => (
    <div data-testid="mock-node-detail" data-node-id={nodeId}>
      NodeDetail({nodeId})
    </div>
  ),
}));


function renderWithQc() {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <ShellInspectorPanel />
    </QueryClientProvider>,
  );
}


beforeEach(() => {
  useSelectionStore.setState({ selectedNodeId: null, selectedElementId: null });
  useRightPanelStore.setState({ panelState: "inspector" });
  useModelStore.setState({ model: null });
});


describe("ShellInspectorPanel", () => {
  it("renderizza il container + header 'Ispeziona'", () => {
    renderWithQc();
    expect(screen.getByTestId("shell-inspector-panel")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /ispeziona/i })).toBeInTheDocument();
  });

  it("empty state quando niente selezionato", () => {
    renderWithQc();
    expect(screen.getByTestId("shell-inspector-empty")).toBeInTheDocument();
    expect(screen.getByText(/niente selezionato/i)).toBeInTheDocument();
    // Subtitle riflette nessuna selezione
    expect(screen.getByTestId("shell-inspector-subtitle").textContent)
      .toBe("Nessuna selezione");
  });

  it("renderizza NodeDetail quando selectedNodeId set", () => {
    useSelectionStore.setState({ selectedNodeId: 3, selectedElementId: null });
    renderWithQc();
    const nodeDetail = screen.getByTestId("mock-node-detail");
    expect(nodeDetail).toBeInTheDocument();
    expect(nodeDetail.getAttribute("data-node-id")).toBe("3");
    // Empty state NON visibile
    expect(screen.queryByTestId("shell-inspector-empty")).toBeNull();
  });

  it("subtitle dinamico per nodo: 'Nodo 3'", () => {
    useSelectionStore.setState({ selectedNodeId: 3, selectedElementId: null });
    renderWithQc();
    expect(screen.getByTestId("shell-inspector-subtitle").textContent).toBe("Nodo 3");
  });

  it("renderizza ElementDetailPlaceholder quando selectedElementId set", () => {
    useSelectionStore.setState({ selectedNodeId: null, selectedElementId: 2 });
    useModelStore.setState({
      model: {
        id: "m", name: "Test", units: "SI", is_3d: false,
        nodes: [{ id: 1, x: 0, y: 0, z: 0 }, { id: 2, x: 1, y: 0, z: 0 }],
        elements: [{ id: 2, type: "beam2d", nodes: [1, 2], material_id: "steel" }],
        loads: [], constraints: [],
      },
    });
    renderWithQc();
    expect(screen.getByTestId("shell-inspector-element-2")).toBeInTheDocument();
    expect(screen.getByText(/dettagli completi.*in arrivo/i)).toBeInTheDocument();
  });

  it("subtitle dinamico per elemento: 'Elemento 2'", () => {
    useSelectionStore.setState({ selectedNodeId: null, selectedElementId: 2 });
    useModelStore.setState({
      model: {
        id: "m", name: "Test", units: "SI", is_3d: false,
        nodes: [], elements: [{ id: 2, type: "beam2d", nodes: [1, 2], material_id: "x" }],
        loads: [], constraints: [],
      },
    });
    renderWithQc();
    expect(screen.getByTestId("shell-inspector-subtitle").textContent).toBe("Elemento 2");
  });

  it("placeholder element mostra fallback se element non trovato", () => {
    useSelectionStore.setState({ selectedNodeId: null, selectedElementId: 99 });
    useModelStore.setState({
      model: {
        id: "m", name: "Test", units: "SI", is_3d: false,
        nodes: [], elements: [], loads: [], constraints: [],
      },
    });
    renderWithQc();
    expect(screen.getByTestId("shell-inspector-element-missing")).toBeInTheDocument();
    expect(screen.getByText(/non trovato nel modello corrente/i)).toBeInTheDocument();
  });

  it("click X: clear selectionStore + apre rightPanelStore", () => {
    useSelectionStore.setState({ selectedNodeId: 5, selectedElementId: null });
    useRightPanelStore.setState({ panelState: "inspector" });
    renderWithQc();
    fireEvent.click(screen.getByTestId("shell-inspector-close"));
    expect(useSelectionStore.getState().selectedNodeId).toBeNull();
    expect(useSelectionStore.getState().selectedElementId).toBeNull();
    expect(useRightPanelStore.getState().panelState).toBe("open");
  });

  it("X bottone ha aria-label 'Chiudi inspector' (a11y)", () => {
    renderWithQc();
    expect(screen.getByRole("button", { name: /chiudi inspector/i })).toBeInTheDocument();
  });
});
