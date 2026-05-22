import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MissionBar, computeHint } from "./MissionBar";
import { useModelStore } from "../../store/modelStore";
import { useResultsStore } from "../../store/resultsStore";

// Helper modello fake usable nei test
const fakeModel = (overrides: Partial<{
  constraints: unknown[];
  loads: unknown[];
}> = {}) =>
  ({
    id: "m",
    name: "Test",
    nodes: [],
    elements: [],
    loads: [],
    constraints: [],
    units: "SI",
    is_3d: true,
    ...overrides,
  } as any);

describe("MissionBar · computeHint (rule engine puro)", () => {
  it("null model → null hint", () => {
    expect(computeHint(null, false)).toBeNull();
  });

  it("model senza vincoli → status wip + 'aggiungi vincolo'", () => {
    const h = computeHint({ constraints: [], loads: [] }, false);
    expect(h?.status).toBe("wip");
    expect(h?.text).toMatch(/vincolo/i);
  });

  it("model con vincoli ma senza carichi → 'aggiungi carico'", () => {
    const h = computeHint({ constraints: [{}], loads: [] }, false);
    expect(h?.status).toBe("wip");
    expect(h?.text).toMatch(/carico/i);
  });

  it("model completo senza risultati → 'lancia analisi statica'", () => {
    const h = computeHint({ constraints: [{}], loads: [{}] }, false);
    expect(h?.status).toBe("wip");
    expect(h?.text).toMatch(/F5|Esegui|statica/i);
  });

  it("staticResults presenti → status solved + 'verifica risultati'", () => {
    const h = computeHint({ constraints: [{}], loads: [{}] }, true);
    expect(h?.status).toBe("solved");
    expect(h?.text).toMatch(/Inspect|risultati|report/i);
  });
});

describe("MissionBar · rendering", () => {
  it("non renderizza nulla quando model e' null", () => {
    useModelStore.setState({ model: null } as any);
    const { container } = render(<MissionBar />);
    expect(container.firstChild).toBeNull();
  });

  it("renderizza badge 'Da completare' + hint quando il modello e' incompleto", () => {
    useModelStore.setState({ model: fakeModel() } as any);
    useResultsStore.setState({ staticResults: null } as any);
    render(<MissionBar />);
    expect(screen.getByTestId("mission-bar")).toBeInTheDocument();
    expect(screen.getByTestId("mission-bar-status")).toHaveTextContent(/Da completare/i);
    expect(screen.getByTestId("mission-bar-hint")).toHaveTextContent(/vincolo/i);
  });

  it("renderizza badge 'Risolto' quando ci sono risultati statici", () => {
    useModelStore.setState({
      model: fakeModel({ constraints: [{}], loads: [{}] }),
    } as any);
    useResultsStore.setState({ staticResults: { max_displacement: 0.001 } } as any);
    render(<MissionBar />);
    expect(screen.getByTestId("mission-bar-status")).toHaveTextContent(/Risolto/i);
  });
});
