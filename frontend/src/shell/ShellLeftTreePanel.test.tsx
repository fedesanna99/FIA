/**
 * Test ShellLeftTreePanel (v3.4 Fetta E2-IA · Commit E2.4)
 *
 * Verifica il rendering del panel SX "Albero modello": header, empty
 * state quando model=null, 5 sezioni con count quando model presente,
 * count dinamici da modelStore, chiusura via X bottone.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { ShellLeftTreePanel } from "./ShellLeftTreePanel";
import { useLeftTreeStore } from "../store/leftTreeStore";
import { useModelStore } from "../store/modelStore";
import type { FEAModel } from "../types/model";


/** Helper per costruire un FEAModel fittizio di test rispettando il
 *  contratto di tipo senza dover compilare nodi/elementi reali. */
function buildModel(opts: Partial<FEAModel> & { name: string }): FEAModel {
  return {
    id: opts.id ?? "test-id",
    name: opts.name,
    units: opts.units ?? "SI",
    is_3d: opts.is_3d ?? false,
    nodes: opts.nodes ?? [],
    elements: opts.elements ?? [],
    loads: opts.loads ?? [],
    constraints: opts.constraints ?? [],
    materials: opts.materials,
  };
}


beforeEach(() => {
  useLeftTreeStore.setState({ treeState: "open" });
  useModelStore.setState({ model: null });
  try { window.localStorage.removeItem("feapro-left-tree"); } catch { /* ignore */ }
});


describe("ShellLeftTreePanel", () => {
  it("renderizza il container con il titolo 'Albero modello'", () => {
    render(<ShellLeftTreePanel />);
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "Albero modello",
    );
    expect(screen.getByTestId("shell-left-tree-panel")).toBeInTheDocument();
  });

  it("mostra empty state quando model === null", () => {
    render(<ShellLeftTreePanel />);
    expect(screen.getByTestId("shell-left-tree-empty")).toBeInTheDocument();
    expect(screen.getByText(/nessun modello caricato/i)).toBeInTheDocument();
    // Nelle 5 sezioni NON renderizzate quando empty
    expect(screen.queryByTestId("shell-left-tree-nodes")).toBeNull();
  });

  it("model presente ma vuoto: 6 sezioni in ordine prototipo v3, count=0 per le prime 5", () => {
    useModelStore.setState({
      model: buildModel({ name: "Modello vuoto" }),
    });
    render(<ShellLeftTreePanel />);
    // 6 sezioni nell'ordine canonico del prototipo v3
    expect(screen.getByTestId("shell-left-tree-nodes")).toBeInTheDocument();
    expect(screen.getByTestId("shell-left-tree-elements")).toBeInTheDocument();
    expect(screen.getByTestId("shell-left-tree-sections-materials")).toBeInTheDocument();
    expect(screen.getByTestId("shell-left-tree-loads")).toBeInTheDocument();
    expect(screen.getByTestId("shell-left-tree-constraints")).toBeInTheDocument();
    expect(screen.getByTestId("shell-left-tree-combinations")).toBeInTheDocument();
    // count = 0 per le sezioni cablate al modello
    expect(screen.getByTestId("shell-left-tree-nodes-count").textContent).toBe("0");
    expect(screen.getByTestId("shell-left-tree-elements-count").textContent).toBe("0");
    expect(screen.getByTestId("shell-left-tree-sections-materials-count").textContent).toBe("0");
    expect(screen.getByTestId("shell-left-tree-constraints-count").textContent).toBe("0");
    expect(screen.getByTestId("shell-left-tree-loads-count").textContent).toBe("0");
    // 4 stati onesti: combinazioni "—" (non implementato nel modello dominio)
    expect(screen.getByTestId("shell-left-tree-combinations-count").textContent).toBe("—");
  });

  it("ordine sezioni rispetta il prototipo v3: nodi → elementi → sezioni·materiali → carichi → vincoli → combinazioni", () => {
    useModelStore.setState({
      model: buildModel({ name: "Test ordine" }),
    });
    render(<ShellLeftTreePanel />);
    const list = screen.getByRole("list", { name: /sezioni del modello/i });
    const items = Array.from(list.querySelectorAll("[data-testid^='shell-left-tree-']"))
      .filter((el) => /^shell-left-tree-(nodes|elements|sections-materials|loads|constraints|combinations)$/.test(
        el.getAttribute("data-testid") || "",
      ))
      .map((el) => el.getAttribute("data-testid"));
    expect(items).toEqual([
      "shell-left-tree-nodes",
      "shell-left-tree-elements",
      "shell-left-tree-sections-materials",
      "shell-left-tree-loads",
      "shell-left-tree-constraints",
      "shell-left-tree-combinations",
    ]);
  });

  it("mostra i count reali letti da modelStore (verita' di dominio)", () => {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    useModelStore.setState({
      model: buildModel({
        name: "Telaio portale 2D",
        nodes: [{} as any, {} as any, {} as any],          // 3
        elements: [
          { id: 1, type: "beam2d", nodes: [1, 2], material_id: "s355", section_id: "IPE300" } as any,
          { id: 2, type: "beam2d", nodes: [2, 3], material_id: "s355", section_id: "IPE300" } as any,
        ], // 2 elementi, 1 sezione unica
        loads: [{} as any],                                 // 1
        constraints: [{} as any, {} as any],                // 2
        materials: [{ id: "s355", name: "S355" }],         // 1 (per fallback)
      }),
    });
    /* eslint-enable @typescript-eslint/no-explicit-any */
    render(<ShellLeftTreePanel />);
    expect(screen.getByTestId("shell-left-tree-nodes-count").textContent).toBe("3");
    expect(screen.getByTestId("shell-left-tree-elements-count").textContent).toBe("2");
    // sezioni-materiali: 1 section_id unico → count=1
    expect(screen.getByTestId("shell-left-tree-sections-materials-count").textContent).toBe("1");
    expect(screen.getByTestId("shell-left-tree-constraints-count").textContent).toBe("2");
    expect(screen.getByTestId("shell-left-tree-loads-count").textContent).toBe("1");
    // Combinazioni resta "—" anche con modello completo (non implementato)
    expect(screen.getByTestId("shell-left-tree-combinations-count").textContent).toBe("—");
  });

  it("sezioni·materiali: 2 section_id distinti → count=2", () => {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    useModelStore.setState({
      model: buildModel({
        name: "Misto IPE+HEB",
        elements: [
          { id: 1, type: "beam2d", nodes: [1, 2], material_id: "s355", section_id: "IPE300" } as any,
          { id: 2, type: "beam2d", nodes: [2, 3], material_id: "s355", section_id: "HEB200" } as any,
        ],
      }),
    });
    /* eslint-enable @typescript-eslint/no-explicit-any */
    render(<ShellLeftTreePanel />);
    expect(screen.getByTestId("shell-left-tree-sections-materials-count").textContent).toBe("2");
  });

  it("sezioni·materiali: fallback su materials count se nessun section_id e' definito", () => {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    useModelStore.setState({
      model: buildModel({
        name: "Legacy senza section_id",
        elements: [{ id: 1, type: "beam2d", nodes: [1, 2], material_id: "s355" } as any], // no section_id
        materials: [{ id: "s355" }, { id: "s275" }],
      }),
    });
    /* eslint-enable @typescript-eslint/no-explicit-any */
    render(<ShellLeftTreePanel />);
    // Fallback su materials.length perche' nessun section_id presente
    expect(screen.getByTestId("shell-left-tree-sections-materials-count").textContent).toBe("2");
  });

  it("tree-note del prototipo v3 visibile quando il modello e' presente", () => {
    useModelStore.setState({ model: buildModel({ name: "Test" }) });
    render(<ShellLeftTreePanel />);
    const note = screen.getByTestId("shell-left-tree-note");
    expect(note).toBeInTheDocument();
    expect(note.textContent).toContain("chiuso");
    expect(note.textContent).toContain("da solo");
    expect(note.textContent).toContain("50 elementi");
  });

  it("tree-note NON visibile in empty state (sostituito dal call-to-action)", () => {
    useModelStore.setState({ model: null });
    render(<ShellLeftTreePanel />);
    expect(screen.queryByTestId("shell-left-tree-note")).toBeNull();
    expect(screen.getByTestId("shell-left-tree-empty")).toBeInTheDocument();
  });

  it("mostra il nome del modello nell'header (slot eyebrow)", () => {
    useModelStore.setState({
      model: buildModel({ name: "Mensola lineare UC4" }),
    });
    render(<ShellLeftTreePanel />);
    expect(screen.getByTestId("shell-left-tree-model-name").textContent).toBe(
      "Mensola lineare UC4",
    );
  });

  it("placeholder '—' nel nome quando model=null", () => {
    render(<ShellLeftTreePanel />);
    expect(screen.getByTestId("shell-left-tree-model-name").textContent).toBe("—");
  });

  it("X click chiude il panel via leftTreeStore.close()", () => {
    render(<ShellLeftTreePanel />);
    expect(useLeftTreeStore.getState().treeState).toBe("open");
    fireEvent.click(screen.getByTestId("shell-left-tree-close"));
    expect(useLeftTreeStore.getState().treeState).toBe("closed");
  });

  it("X bottone ha aria-label 'Chiudi albero' (a11y)", () => {
    render(<ShellLeftTreePanel />);
    expect(
      screen.getByRole("button", { name: /chiudi albero/i }),
    ).toBeInTheDocument();
  });

  // ── v3.4 Fetta E2.3 (30/05/2026): espansione foglie + selezione ───
  describe("E2.3 espansione foglie + selezione bidirezionale", () => {
    it("sezione Nodi: header e' un button cliccabile (expandable)", async () => {
      const { useSelectionStore } = await import("../store/selectionStore");
      useSelectionStore.setState({ selectedNodeId: null, selectedElementId: null });
      useModelStore.setState({
        model: buildModel({
          name: "Test",
          nodes: [
            { id: 1, x: 0, y: 0, z: 0 },
            { id: 2, x: 1, y: 0, z: 0 },
          ],
        }),
      });
      render(<ShellLeftTreePanel />);
      const head = screen.getByTestId("shell-left-tree-nodes-head");
      expect(head.tagName).toBe("BUTTON");
      expect(head.getAttribute("aria-expanded")).toBe("false");
      // Foglie non visibili finche' non espansa
      expect(screen.queryByTestId("shell-left-tree-nodes-leaves")).toBeNull();
    });

    it("click sezione Nodi: espande e mostra foglie N1/N2", async () => {
      const { useSelectionStore } = await import("../store/selectionStore");
      useSelectionStore.setState({ selectedNodeId: null, selectedElementId: null });
      useModelStore.setState({
        model: buildModel({
          name: "Test",
          nodes: [
            { id: 1, x: 0, y: 0, z: 0 },
            { id: 2, x: 1, y: 0, z: 0 },
          ],
        }),
      });
      render(<ShellLeftTreePanel />);
      fireEvent.click(screen.getByTestId("shell-left-tree-nodes-head"));
      expect(screen.getByTestId("shell-left-tree-nodes-leaves")).toBeInTheDocument();
      expect(screen.getByTestId("shell-left-tree-leaf-node-1")).toBeInTheDocument();
      expect(screen.getByTestId("shell-left-tree-leaf-node-2")).toBeInTheDocument();
      // aria-expanded ora true
      expect(screen.getByTestId("shell-left-tree-nodes-head").getAttribute("aria-expanded"))
        .toBe("true");
    });

    it("click foglia N1: aggiorna selectionStore + apre Inspector", async () => {
      const { useSelectionStore } = await import("../store/selectionStore");
      const { useRightPanelStore } = await import("../store/rightPanelStore");
      useSelectionStore.setState({ selectedNodeId: null, selectedElementId: null });
      useRightPanelStore.setState({ panelState: "open" });
      useModelStore.setState({
        model: buildModel({
          name: "Test",
          nodes: [{ id: 1, x: 0, y: 0, z: 0 }],
        }),
      });
      render(<ShellLeftTreePanel />);
      fireEvent.click(screen.getByTestId("shell-left-tree-nodes-head"));
      fireEvent.click(screen.getByTestId("shell-left-tree-leaf-node-1"));
      expect(useSelectionStore.getState().selectedNodeId).toBe(1);
      expect(useRightPanelStore.getState().panelState).toBe("inspector");
    });

    it("foglia attiva ha class is-active + aria-current quando selectedNodeId match", async () => {
      const { useSelectionStore } = await import("../store/selectionStore");
      useSelectionStore.setState({ selectedNodeId: 2, selectedElementId: null });
      useModelStore.setState({
        model: buildModel({
          name: "Test",
          nodes: [
            { id: 1, x: 0, y: 0, z: 0 },
            { id: 2, x: 1, y: 0, z: 0 },
          ],
        }),
      });
      render(<ShellLeftTreePanel />);
      // Auto-expand grazie a useEffect (selectedNodeId !== null)
      const leaf2 = screen.getByTestId("shell-left-tree-leaf-node-2");
      expect(leaf2.className).toContain("is-active");
      expect(leaf2.getAttribute("aria-current")).toBe("true");
      // Foglia 1 NON e' attiva
      const leaf1 = screen.getByTestId("shell-left-tree-leaf-node-1");
      expect(leaf1.className).not.toContain("is-active");
    });

    it("cambio selectedNodeId da fuori auto-espande sezione Nodi", async () => {
      const { useSelectionStore } = await import("../store/selectionStore");
      useSelectionStore.setState({ selectedNodeId: null, selectedElementId: null });
      useModelStore.setState({
        model: buildModel({
          name: "Test",
          nodes: [{ id: 5, x: 0, y: 0, z: 0 }],
        }),
      });
      const { rerender } = render(<ShellLeftTreePanel />);
      // Inizialmente sezione chiusa
      expect(screen.queryByTestId("shell-left-tree-nodes-leaves")).toBeNull();
      // Simulo selezione da viewport
      useSelectionStore.setState({ selectedNodeId: 5, selectedElementId: null });
      rerender(<ShellLeftTreePanel />);
      // Sezione auto-aperta + foglia visibile
      expect(screen.getByTestId("shell-left-tree-nodes-leaves")).toBeInTheDocument();
      expect(screen.getByTestId("shell-left-tree-leaf-node-5")).toBeInTheDocument();
    });

    it("sezioni non-expandable (Materiali/Vincoli/Carichi/Combinazioni) sono disabled", async () => {
      useModelStore.setState({
        model: buildModel({ name: "Test", nodes: [{ id: 1, x: 0, y: 0, z: 0 }] }),
      });
      render(<ShellLeftTreePanel />);
      const sectionsMaterials = screen.getByTestId("shell-left-tree-sections-materials-head") as HTMLButtonElement;
      const loads = screen.getByTestId("shell-left-tree-loads-head") as HTMLButtonElement;
      const constraints = screen.getByTestId("shell-left-tree-constraints-head") as HTMLButtonElement;
      const combinations = screen.getByTestId("shell-left-tree-combinations-head") as HTMLButtonElement;
      expect(sectionsMaterials.disabled).toBe(true);
      expect(loads.disabled).toBe(true);
      expect(constraints.disabled).toBe(true);
      expect(combinations.disabled).toBe(true);
      // Nodi/Elementi invece NON disabled
      expect((screen.getByTestId("shell-left-tree-nodes-head") as HTMLButtonElement).disabled).toBe(false);
      expect((screen.getByTestId("shell-left-tree-elements-head") as HTMLButtonElement).disabled).toBe(false);
    });

    it("foglia elemento: click aggiorna selectedElementId", async () => {
      const { useSelectionStore } = await import("../store/selectionStore");
      useSelectionStore.setState({ selectedNodeId: null, selectedElementId: null });
      useModelStore.setState({
        model: buildModel({
          name: "Test",
          nodes: [{ id: 1, x: 0, y: 0, z: 0 }, { id: 2, x: 1, y: 0, z: 0 }],
          elements: [{ id: 1, type: "beam2d", nodes: [1, 2], material_id: "steel" }],
        }),
      });
      render(<ShellLeftTreePanel />);
      fireEvent.click(screen.getByTestId("shell-left-tree-elements-head"));
      fireEvent.click(screen.getByTestId("shell-left-tree-leaf-element-1"));
      expect(useSelectionStore.getState().selectedElementId).toBe(1);
      // Anche selectedNodeId si azzera (mutual exclusion del selectionStore)
      expect(useSelectionStore.getState().selectedNodeId).toBeNull();
    });

    it("empty state foglie: 'Nessun nodo' quando model.nodes vuoto", async () => {
      useModelStore.setState({
        model: buildModel({ name: "Test", nodes: [] }),
      });
      render(<ShellLeftTreePanel />);
      fireEvent.click(screen.getByTestId("shell-left-tree-nodes-head"));
      const leaves = screen.getByTestId("shell-left-tree-nodes-leaves");
      expect(leaves.textContent).toContain("Nessun nodo");
    });
  });
});
