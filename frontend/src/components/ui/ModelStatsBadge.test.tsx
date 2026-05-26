/**
 * ModelStatsBadge.test (v2.5.8 cluster E T3, BUG-039+045).
 */
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ModelStatsBadge } from "./ModelStatsBadge";
import { useModelStore } from "../../store/modelStore";
import type { FEAModel } from "../../types/model";

function makeModel(opts: { nodes?: number; elements?: number; loads?: number; constraints?: number } = {}): FEAModel {
  const { nodes = 0, elements = 0, loads = 0, constraints = 0 } = opts;
  return {
    id: "test-m",
    name: "Test",
    units: "SI",
    is_3d: false,
    nodes: Array.from({ length: nodes }, (_, i) => ({ id: i + 1, x: 0, y: 0, z: 0 })),
    elements: Array.from({ length: elements }, (_, i) => ({
      id: i + 1,
      type: "beam2d" as const,
      nodes: [1, 2],
      material_id: "S275",
    })),
    constraints: Array.from({ length: constraints }, (_, i) => ({
      id: i + 1,
      type: "fixed" as const,
      node_id: 1,
    })),
    loads: Array.from({ length: loads }, (_, i) => ({
      id: i + 1,
      type: "nodal" as const,
      target_id: 1,
    })),
  };
}

beforeEach(() => {
  useModelStore.setState({ model: null } as never);
});

describe("ModelStatsBadge · v2.5.8 cluster E T3", () => {
  it("ritorna null se nessun modello attivo", () => {
    const { container } = render(<ModelStatsBadge />);
    expect(container.firstChild).toBeNull();
  });

  it("compact default mostra '0 nodi · 0 elementi' con modello vuoto", () => {
    useModelStore.setState({ model: makeModel() } as never);
    render(<ModelStatsBadge data-testid="badge" />);
    const badge = screen.getByTestId("badge");
    expect(badge).toHaveTextContent("0");
    expect(badge).toHaveTextContent("nodi");
    expect(badge).toHaveTextContent("elementi");
  });

  it("singolare italiano per count=1: '1 nodo' (non '1 nodi')", () => {
    useModelStore.setState({ model: makeModel({ nodes: 1, elements: 1 }) } as never);
    render(<ModelStatsBadge data-testid="badge" />);
    const badge = screen.getByTestId("badge");
    expect(badge).toHaveTextContent("nodo");
    expect(badge.textContent).not.toMatch(/1\s*nodi/);
    expect(badge).toHaveTextContent("elemento");
  });

  it("show estesa mostra anche carichi+vincoli con singolare/plurale corretto", () => {
    useModelStore.setState({
      model: makeModel({ nodes: 3, elements: 2, loads: 5, constraints: 1 }),
    } as never);
    render(
      <ModelStatsBadge
        show={["nodes", "elements", "loads", "constraints"]}
        data-testid="badge"
      />,
    );
    const badge = screen.getByTestId("badge");
    // I count e i label vivono in <span> separati che jsdom legge senza spazio
    // ("5carichi" non "5 carichi"). Asserisco i token singolarmente.
    expect(badge.textContent).toMatch(/3.*nodi/);
    expect(badge.textContent).toMatch(/2.*elementi/);
    expect(badge.textContent).toMatch(/5.*carichi/);
    expect(badge.textContent).toMatch(/1.*vincolo/);
    expect(badge.textContent).not.toMatch(/1.*vincoli/); // singolare per count=1
  });

  it("variant detailed rendera grid con label uppercase mono", () => {
    useModelStore.setState({
      model: makeModel({ nodes: 7, elements: 3, loads: 2, constraints: 4 }),
    } as never);
    render(
      <ModelStatsBadge
        variant="detailed"
        show={["nodes", "elements", "loads", "constraints"]}
        data-testid="badge"
      />,
    );
    const badge = screen.getByTestId("badge");
    expect(badge).toHaveTextContent("7");
    expect(badge).toHaveTextContent("3");
    expect(badge).toHaveTextContent("2");
    expect(badge).toHaveTextContent("4");
    // Le label short sono "Nodi · Elem. · Carichi · Vincoli"
    expect(badge).toHaveTextContent("Nodi");
    expect(badge).toHaveTextContent("Elem.");
  });
});
