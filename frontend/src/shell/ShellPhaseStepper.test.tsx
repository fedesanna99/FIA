/**
 * ShellPhaseStepper.test.tsx · redesign/workspace-fasi (FETTA 1).
 *
 * Verifica la spina 3 fasi (Costruisci → Esegui → Risultati):
 *   - rendering dei 3 passi + separatori
 *   - cliccare un passo chiama `onChange(workspace)`
 *   - lo stato visivo riflette modelStore / analysisStore / resultsStore
 *   - mai un passo è disabilitato (è una mappa, non un wizard)
 *
 * Gli store Zustand sono singleton: reset in `beforeEach`.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ShellPhaseStepper } from "./ShellPhaseStepper";
import { useModelStore } from "../store/modelStore";
import { useAnalysisStore } from "../store/analysisStore";
import { useResultsStore } from "../store/resultsStore";
import type { FEAModel } from "../types/model";
import type { StaticResults } from "../types/results";

// Modello minimale per i test (campi non rilevanti -> any cast tramite as)
function makeModel(partial: Partial<FEAModel> = {}): FEAModel {
  return {
    id: "test-model",
    name: "Test Model",
    units: "SI",
    is_3d: false,
    nodes: [],
    elements: [],
    loads: [],
    constraints: [],
    ...partial,
  } as FEAModel;
}

// Static result minimale (modelHashAtAnalysis è gestito a parte)
function makeStaticResults(): StaticResults {
  return {
    displacements: [],
    reactions: [],
    member_forces: [],
    max_displacement: 0,
    max_stress: 0,
  } as unknown as StaticResults;
}

describe("ShellPhaseStepper · redesign/workspace-fasi (FETTA 1)", () => {
  beforeEach(() => {
    // Reset stores singleton
    useModelStore.setState({ model: null });
    useAnalysisStore.setState({ isRunning: false });
    useResultsStore.setState({
      staticResults: null,
      modalResults: null,
      dynamicResults: null,
      modelHashAtAnalysis: null,
    });
  });

  // ── Render base ─────────────────────────────────────────────────────────
  it("renderizza i 3 passi (Costruisci / Esegui / Risultati) sempre cliccabili", () => {
    const onChange = vi.fn();
    render(<ShellPhaseStepper active="modello" onChange={onChange} />);
    const build = screen.getByTestId("phase-step-build");
    const run = screen.getByTestId("phase-step-run");
    const results = screen.getByTestId("phase-step-results");

    expect(build).toBeInTheDocument();
    expect(run).toBeInTheDocument();
    expect(results).toBeInTheDocument();

    // Mai disabilitati (regola: mappa non wizard).
    expect(build).not.toBeDisabled();
    expect(run).not.toBeDisabled();
    expect(results).not.toBeDisabled();
  });

  it("ogni passo è un <button> con label visibile", () => {
    render(<ShellPhaseStepper active="modello" onChange={vi.fn()} />);
    expect(screen.getByText("Costruisci")).toBeInTheDocument();
    expect(screen.getByText("Esegui")).toBeInTheDocument();
    expect(screen.getByText("Risultati")).toBeInTheDocument();
  });

  // ── Navigation ──────────────────────────────────────────────────────────
  it("click su 'Costruisci' chiama onChange('modello')", () => {
    const onChange = vi.fn();
    render(<ShellPhaseStepper active="risultati" onChange={onChange} />);
    fireEvent.click(screen.getByTestId("phase-step-build"));
    expect(onChange).toHaveBeenCalledWith("modello");
  });

  it("click su 'Esegui' chiama onChange('analisi')", () => {
    const onChange = vi.fn();
    render(<ShellPhaseStepper active="modello" onChange={onChange} />);
    fireEvent.click(screen.getByTestId("phase-step-run"));
    expect(onChange).toHaveBeenCalledWith("analisi");
  });

  it("click su 'Risultati' chiama onChange('risultati')", () => {
    const onChange = vi.fn();
    render(<ShellPhaseStepper active="modello" onChange={onChange} />);
    fireEvent.click(screen.getByTestId("phase-step-results"));
    expect(onChange).toHaveBeenCalledWith("risultati");
  });

  // ── Highlight passo attivo ──────────────────────────────────────────────
  it("active='modello' → solo Costruisci ha is-active + aria-current='step'", () => {
    render(<ShellPhaseStepper active="modello" onChange={vi.fn()} />);
    expect(screen.getByTestId("phase-step-build").className).toContain("is-active");
    expect(screen.getByTestId("phase-step-build").getAttribute("aria-current")).toBe("step");
    expect(screen.getByTestId("phase-step-run").className).not.toContain("is-active");
    expect(screen.getByTestId("phase-step-results").className).not.toContain("is-active");
  });

  it("active='analisi' → solo Esegui è attivo", () => {
    render(<ShellPhaseStepper active="analisi" onChange={vi.fn()} />);
    expect(screen.getByTestId("phase-step-run").className).toContain("is-active");
    expect(screen.getByTestId("phase-step-build").className).not.toContain("is-active");
    expect(screen.getByTestId("phase-step-results").className).not.toContain("is-active");
  });

  it("active='risultati' → solo Risultati è attivo", () => {
    render(<ShellPhaseStepper active="risultati" onChange={vi.fn()} />);
    expect(screen.getByTestId("phase-step-results").className).toContain("is-active");
    expect(screen.getByTestId("phase-step-build").className).not.toContain("is-active");
    expect(screen.getByTestId("phase-step-run").className).not.toContain("is-active");
  });

  it("active='verifiche' (workspace fuori dalle 3 fasi) → nessuno dei 3 è attivo, restano cliccabili", () => {
    render(<ShellPhaseStepper active="verifiche" onChange={vi.fn()} />);
    expect(screen.getByTestId("phase-step-build").className).not.toContain("is-active");
    expect(screen.getByTestId("phase-step-run").className).not.toContain("is-active");
    expect(screen.getByTestId("phase-step-results").className).not.toContain("is-active");
    expect(screen.getByTestId("phase-step-build")).not.toBeDisabled();
  });

  // ── Stato Costruisci ────────────────────────────────────────────────────
  it("Build: nessun model → state='empty'", () => {
    useModelStore.setState({ model: null });
    render(<ShellPhaseStepper active="modello" onChange={vi.fn()} />);
    expect(screen.getByTestId("phase-step-build").getAttribute("data-state")).toBe("empty");
  });

  it("Build: model con solo nodi → state='partial'", () => {
    useModelStore.setState({
      model: makeModel({ nodes: [{ id: 1, x: 0, y: 0, z: 0 } as never] }),
    });
    render(<ShellPhaseStepper active="modello" onChange={vi.fn()} />);
    expect(screen.getByTestId("phase-step-build").getAttribute("data-state")).toBe("partial");
  });

  it("Build: model completo (nodi+elementi+vincoli) → state='done'", () => {
    useModelStore.setState({
      model: makeModel({
        nodes: [{ id: 1, x: 0, y: 0, z: 0 } as never],
        elements: [{ id: 1, type: "beam2d", nodes: [1, 2] } as never],
        constraints: [{ id: 1, node_id: 1, type: "FIX" } as never],
      }),
    });
    render(<ShellPhaseStepper active="modello" onChange={vi.fn()} />);
    expect(screen.getByTestId("phase-step-build").getAttribute("data-state")).toBe("done");
  });

  // ── Stato Esegui ────────────────────────────────────────────────────────
  it("Run: isRunning=false → state='empty'", () => {
    useAnalysisStore.setState({ isRunning: false });
    render(<ShellPhaseStepper active="modello" onChange={vi.fn()} />);
    expect(screen.getByTestId("phase-step-run").getAttribute("data-state")).toBe("empty");
  });

  it("Run: isRunning=true → state='running'", () => {
    useAnalysisStore.setState({ isRunning: true });
    render(<ShellPhaseStepper active="modello" onChange={vi.fn()} />);
    expect(screen.getByTestId("phase-step-run").getAttribute("data-state")).toBe("running");
  });

  // ── Stato Risultati ─────────────────────────────────────────────────────
  it("Results: nessun risultato → state='empty'", () => {
    useResultsStore.setState({ staticResults: null, modalResults: null, dynamicResults: null });
    render(<ShellPhaseStepper active="modello" onChange={vi.fn()} />);
    expect(screen.getByTestId("phase-step-results").getAttribute("data-state")).toBe("empty");
  });

  it("Results: staticResults presenti, modelHashAtAnalysis null → state='done' (non stale)", () => {
    useModelStore.setState({ model: makeModel() });
    useResultsStore.setState({
      staticResults: makeStaticResults(),
      modelHashAtAnalysis: null,
    });
    render(<ShellPhaseStepper active="modello" onChange={vi.fn()} />);
    expect(screen.getByTestId("phase-step-results").getAttribute("data-state")).toBe("done");
  });

  it("Results: staticResults + modelHashAtAnalysis diverso dall'hash corrente → state='stale'", () => {
    useModelStore.setState({ model: makeModel({ nodes: [{ id: 1, x: 0, y: 0, z: 0 } as never] }) });
    useResultsStore.setState({
      staticResults: makeStaticResults(),
      // hash arbitrario, diverso dal modelHash(model) corrente
      modelHashAtAnalysis: "hash-vecchio-non-matchante",
    });
    render(<ShellPhaseStepper active="modello" onChange={vi.fn()} />);
    expect(screen.getByTestId("phase-step-results").getAttribute("data-state")).toBe("stale");
  });

  it("Stale results: la classe shell-phase-step--stale è applicata al pill", () => {
    useModelStore.setState({ model: makeModel({ nodes: [{ id: 1, x: 0, y: 0, z: 0 } as never] }) });
    useResultsStore.setState({
      staticResults: makeStaticResults(),
      modelHashAtAnalysis: "qualunque-hash-vecchio",
    });
    render(<ShellPhaseStepper active="modello" onChange={vi.fn()} />);
    expect(screen.getByTestId("phase-step-results").className).toContain("shell-phase-step--stale");
  });
});
