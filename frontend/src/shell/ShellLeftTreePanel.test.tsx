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

  it("model presente ma vuoto: 5 sezioni con count=0 (pattern '4 stati onesti')", () => {
    useModelStore.setState({
      model: buildModel({ name: "Modello vuoto" }),
    });
    render(<ShellLeftTreePanel />);
    expect(screen.getByTestId("shell-left-tree-nodes")).toBeInTheDocument();
    expect(screen.getByTestId("shell-left-tree-elements")).toBeInTheDocument();
    expect(screen.getByTestId("shell-left-tree-materials")).toBeInTheDocument();
    expect(screen.getByTestId("shell-left-tree-constraints")).toBeInTheDocument();
    expect(screen.getByTestId("shell-left-tree-loads")).toBeInTheDocument();
    // Tutti i count = 0
    expect(screen.getByTestId("shell-left-tree-nodes-count").textContent).toBe("0");
    expect(screen.getByTestId("shell-left-tree-elements-count").textContent).toBe("0");
    expect(screen.getByTestId("shell-left-tree-materials-count").textContent).toBe("0");
    expect(screen.getByTestId("shell-left-tree-constraints-count").textContent).toBe("0");
    expect(screen.getByTestId("shell-left-tree-loads-count").textContent).toBe("0");
  });

  it("mostra i count reali letti da modelStore (verita' di dominio)", () => {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    useModelStore.setState({
      model: buildModel({
        name: "Telaio portale 2D",
        nodes: [{} as any, {} as any, {} as any],          // 3
        elements: [{} as any, {} as any],                   // 2
        loads: [{} as any],                                 // 1
        constraints: [{} as any, {} as any],                // 2
        materials: [{ id: "s275", name: "S275" }],         // 1
      }),
    });
    /* eslint-enable @typescript-eslint/no-explicit-any */
    render(<ShellLeftTreePanel />);
    expect(screen.getByTestId("shell-left-tree-nodes-count").textContent).toBe("3");
    expect(screen.getByTestId("shell-left-tree-elements-count").textContent).toBe("2");
    expect(screen.getByTestId("shell-left-tree-materials-count").textContent).toBe("1");
    expect(screen.getByTestId("shell-left-tree-constraints-count").textContent).toBe("2");
    expect(screen.getByTestId("shell-left-tree-loads-count").textContent).toBe("1");
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
});
