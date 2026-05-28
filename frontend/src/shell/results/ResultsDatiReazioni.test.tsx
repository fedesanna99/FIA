/**
 * ResultsDatiReazioni.test.tsx · FETTA 2b · FAM C.
 *
 * Verifica:
 *  - placeholder onesto senza staticResults
 *  - tabella reazioni filtrata per nodi vincolati
 *  - colonne Mx/My/Mz a "n/a" su modello senza beam/shell
 *  - somma controllo ΣR + ΣF = Δ con stato ok/warn
 *  - banner sospetto se isSuspicious
 */
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ResultsDatiReazioni } from "./ResultsDatiReazioni";
import { useModelStore } from "../../store/modelStore";
import { useResultsStore } from "../../store/resultsStore";
import type { StaticResults, NodalReaction } from "../../types/results";
import type { FEAModel, Element, Load, Constraint } from "../../types/model";

function makeReaction(node_id: number, partial: Partial<NodalReaction> = {}): NodalReaction {
  return {
    node_id, fx: 0, fy: 0, fz: 0, mx: 0, my: 0, mz: 0, ...partial,
  };
}
function makeResults(reactions: NodalReaction[], max_displacement = 0.01, max_stress = 178e6): StaticResults {
  return {
    analysis_type: "static", model_id: "x",
    displacements: [], reactions,
    element_forces: [], element_stresses: [],
    max_displacement, max_stress,
    n_dofs: 12, solve_time_ms: 10,
  };
}
function makeModel(
  elements: Element[],
  constraints: Constraint[] = [],
  loads: Load[] = [],
): FEAModel {
  return {
    id: "t", name: "t", units: "SI", is_3d: false,
    nodes: [], elements, loads, constraints,
  };
}

describe("ResultsDatiReazioni · FAM C", () => {
  beforeEach(() => {
    useModelStore.setState({ model: null });
    useResultsStore.setState({ staticResults: null, modalResults: null, dynamicResults: null });
  });

  it("placeholder senza staticResults", () => {
    render(<ResultsDatiReazioni />);
    expect(screen.getByTestId("results-placeholder")).toBeInTheDocument();
    expect(screen.queryByTestId("reazioni-table")).toBeNull();
  });

  it("renderizza tabella + 1 riga per ogni nodo vincolato", () => {
    useModelStore.setState({
      model: makeModel(
        [{ id: 1, type: "beam2d", nodes: [1, 2], material_id: "m1" }],
        [
          { id: 1, type: "fixed", node_id: 1 },
          { id: 2, type: "pinned", node_id: 2 },
        ],
      ),
    });
    useResultsStore.setState({
      staticResults: makeResults([
        makeReaction(1, { fy: 30000 }),
        makeReaction(2, { fy: 30000 }),
        makeReaction(99, { fy: 999 }), // non vincolato → escluso
      ]),
    });
    render(<ResultsDatiReazioni />);
    expect(screen.getByTestId("reazioni-table")).toBeInTheDocument();
    expect(screen.getByTestId("reazioni-row-1")).toBeInTheDocument();
    expect(screen.getByTestId("reazioni-row-2")).toBeInTheDocument();
    expect(screen.queryByTestId("reazioni-row-99")).toBeNull();
  });

  it("modello SENZA beam/shell: colonne Mx/My/Mz a 'n/a'", () => {
    useModelStore.setState({
      model: makeModel(
        [{ id: 1, type: "truss2d", nodes: [1, 2], material_id: "m1" }],
        [{ id: 1, type: "fixed", node_id: 1 }],
      ),
    });
    useResultsStore.setState({
      staticResults: makeResults([makeReaction(1, { fy: 30000 })]),
    });
    render(<ResultsDatiReazioni />);
    const row = screen.getByTestId("reazioni-row-1");
    const cells = row.querySelectorAll("td");
    // nodo | Rx | Ry | Rz | Mx | My | Mz
    expect(cells.length).toBe(7);
    expect(cells[4].textContent?.trim()).toBe("n/a"); // Mx
    expect(cells[5].textContent?.trim()).toBe("n/a"); // My
    expect(cells[6].textContent?.trim()).toBe("n/a"); // Mz
  });

  it("modello CON beam: colonne Mx/My/Mz mostrano valori", () => {
    useModelStore.setState({
      model: makeModel(
        [{ id: 1, type: "beam2d", nodes: [1, 2], material_id: "m1" }],
        [{ id: 1, type: "fixed", node_id: 1 }],
      ),
    });
    useResultsStore.setState({
      staticResults: makeResults([makeReaction(1, { mz: 12000 })]),
    });
    render(<ResultsDatiReazioni />);
    const cells = screen.getByTestId("reazioni-row-1").querySelectorAll("td");
    expect(cells[6].textContent?.trim()).not.toBe("n/a"); // Mz è 12 kNm
  });

  it("somma controllo: in equilibrio (ΣR + ΣF ≈ 0) → row '≈ 0 ✓' is-ok", () => {
    useModelStore.setState({
      model: makeModel(
        [{ id: 1, type: "beam2d", nodes: [1, 2], material_id: "m1" }],
        [
          { id: 1, type: "fixed", node_id: 1 },
          { id: 2, type: "pinned", node_id: 2 },
        ],
        [
          { id: 1, type: "nodal", target_id: 3, fy: -60000 }, // -60 kN applicato
        ],
      ),
    });
    // Reazioni: 30 kN + 30 kN = 60 kN → ΣR + ΣF = 0 ✓
    useResultsStore.setState({
      staticResults: makeResults([
        makeReaction(1, { fy: 30000 }),
        makeReaction(2, { fy: 30000 }),
      ]),
    });
    render(<ResultsDatiReazioni />);
    const delta = screen.getByTestId("reazioni-sum-delta");
    expect(delta.getAttribute("data-equilibrium")).toBe("true");
    expect(delta.textContent).toContain("≈ 0 ✓");
    expect(delta.className).toContain("is-ok");
  });

  it("somma controllo: NON in equilibrio → row delta numerica + is-warn", () => {
    useModelStore.setState({
      model: makeModel(
        [{ id: 1, type: "beam2d", nodes: [1, 2], material_id: "m1" }],
        [{ id: 1, type: "fixed", node_id: 1 }],
        [{ id: 1, type: "nodal", target_id: 3, fy: -60000 }],
      ),
    });
    // Solo 10 kN di reazione → 50 kN sbilanciato
    useResultsStore.setState({
      staticResults: makeResults([makeReaction(1, { fy: 10000 })]),
    });
    render(<ResultsDatiReazioni />);
    const delta = screen.getByTestId("reazioni-sum-delta");
    expect(delta.getAttribute("data-equilibrium")).toBe("false");
    expect(delta.textContent).toContain("✗");
    expect(delta.className).toContain("is-warn");
  });

  it("banner sospetto se isSuspicious (σ=0 + freccia=0)", () => {
    useModelStore.setState({
      model: makeModel(
        [{ id: 1, type: "beam2d", nodes: [1, 2], material_id: "m1" }],
        [{ id: 1, type: "fixed", node_id: 1 }],
      ),
    });
    useResultsStore.setState({
      staticResults: makeResults([makeReaction(1)], 0, 0),
    });
    render(<ResultsDatiReazioni />);
    expect(screen.getByTestId("results-data-reazioni-warn")).toBeInTheDocument();
  });

  it("0 vincoli: tabella vuota con 'Nessuna reazione'", () => {
    useModelStore.setState({
      model: makeModel([{ id: 1, type: "beam2d", nodes: [1, 2], material_id: "m1" }]),
    });
    useResultsStore.setState({ staticResults: makeResults([]) });
    render(<ResultsDatiReazioni />);
    expect(screen.getByTestId("reazioni-table").textContent).toContain("Nessuna reazione");
  });
});
