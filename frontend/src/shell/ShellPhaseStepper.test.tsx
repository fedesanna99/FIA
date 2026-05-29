/**
 * ShellPhaseStepper.test.tsx · redesign/workspace-fasi (FETTA 1
 * + Fix blocco skip 29/05/2026 sera).
 *
 * Verifica la spina 3 fasi (Costruisci → Esegui → Risultati):
 *   - rendering dei 3 passi + separatori
 *   - cliccare un passo abilitato chiama `onChange(workspace)`
 *   - lo stato visivo riflette modelStore / analysisStore / resultsStore
 *   - **blocco skip in avanti**: Esegui disabled senza modello "done",
 *     Risultati disabled senza analisi. Costruisci sempre cliccabile.
 *   - **active escape**: la fase attiva resta cliccabile anche se
 *     diventa "blocked" (utente puo' rimanere dov'e').
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

  /** Helper: modello "done" (≥1 nodo + ≥1 elemento + ≥1 vincolo) per
   *  sbloccare la fase Esegui senza dover ripetere i campi ovunque. */
  function setDoneModel() {
    useModelStore.setState({
      model: makeModel({
        nodes: [{ id: 1, x: 0, y: 0, z: 0 } as never],
        elements: [{ id: 1, type: "beam2d", nodes: [1, 2] } as never],
        constraints: [{ id: 1, node_id: 1, type: "FIX" } as never],
      }),
    });
  }

  /** Helper: stato "analisi eseguita" (sblocca Risultati). */
  function setAnalysisDone() {
    setDoneModel();
    useResultsStore.setState({
      staticResults: makeStaticResults(),
      modelHashAtAnalysis: null,
    });
  }

  // ── Render base ─────────────────────────────────────────────────────────
  it("renderizza i 3 passi (Costruisci / Esegui / Risultati)", () => {
    render(<ShellPhaseStepper active="modello" onChange={vi.fn()} />);
    expect(screen.getByTestId("phase-step-build")).toBeInTheDocument();
    expect(screen.getByTestId("phase-step-run")).toBeInTheDocument();
    expect(screen.getByTestId("phase-step-results")).toBeInTheDocument();
  });

  it("ogni passo è un <button> con label visibile", () => {
    render(<ShellPhaseStepper active="modello" onChange={vi.fn()} />);
    expect(screen.getByText("Costruisci")).toBeInTheDocument();
    expect(screen.getByText("Esegui")).toBeInTheDocument();
    expect(screen.getByText("Risultati")).toBeInTheDocument();
  });

  // ── Navigation ──────────────────────────────────────────────────────────
  it("click su 'Costruisci' chiama onChange('modello') (sempre cliccabile)", () => {
    const onChange = vi.fn();
    setAnalysisDone();
    render(<ShellPhaseStepper active="risultati" onChange={onChange} />);
    fireEvent.click(screen.getByTestId("phase-step-build"));
    expect(onChange).toHaveBeenCalledWith("modello");
  });

  it("click su 'Esegui' con modello done → chiama onChange('analisi')", () => {
    const onChange = vi.fn();
    setDoneModel();
    render(<ShellPhaseStepper active="modello" onChange={onChange} />);
    fireEvent.click(screen.getByTestId("phase-step-run"));
    expect(onChange).toHaveBeenCalledWith("analisi");
  });

  it("click su 'Risultati' con analisi eseguita → chiama onChange('risultati')", () => {
    const onChange = vi.fn();
    setAnalysisDone();
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

  it("active='verifiche' (workspace fuori dalle 3 fasi) → nessuno dei 3 è attivo", () => {
    render(<ShellPhaseStepper active="verifiche" onChange={vi.fn()} />);
    expect(screen.getByTestId("phase-step-build").className).not.toContain("is-active");
    expect(screen.getByTestId("phase-step-run").className).not.toContain("is-active");
    expect(screen.getByTestId("phase-step-results").className).not.toContain("is-active");
    // Build resta SEMPRE cliccabile (prima fase, canEnter=true).
    expect(screen.getByTestId("phase-step-build")).not.toBeDisabled();
  });

  // ── Blocco skip in avanti (Fix 29/05/2026 sera) ─────────────────────────
  it("BLOCCO: senza modello, Esegui e Verifica sono disabled (Costruisci no)", () => {
    useModelStore.setState({ model: null });
    render(<ShellPhaseStepper active="modello" onChange={vi.fn()} />);
    expect(screen.getByTestId("phase-step-build")).not.toBeDisabled();
    expect(screen.getByTestId("phase-step-run")).toBeDisabled();
    expect(screen.getByTestId("phase-step-results")).toBeDisabled();
    // aria-disabled + data-blocked anche per a11y/CSS
    expect(screen.getByTestId("phase-step-run").getAttribute("aria-disabled")).toBe("true");
    expect(screen.getByTestId("phase-step-run").getAttribute("data-blocked")).toBe("true");
  });

  it("BLOCCO: click su Esegui bloccato è no-op (onChange NON chiamato)", () => {
    const onChange = vi.fn();
    useModelStore.setState({ model: null });
    render(<ShellPhaseStepper active="modello" onChange={onChange} />);
    fireEvent.click(screen.getByTestId("phase-step-run"));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("BLOCCO: click su Risultati bloccato (no analisi) è no-op", () => {
    const onChange = vi.fn();
    setDoneModel(); // modello ok ma niente risultati
    render(<ShellPhaseStepper active="modello" onChange={onChange} />);
    fireEvent.click(screen.getByTestId("phase-step-results"));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("BLOCCO: con modello done, Esegui si sblocca; Risultati resta bloccato", () => {
    setDoneModel();
    useResultsStore.setState({
      staticResults: null, modalResults: null, dynamicResults: null,
    });
    render(<ShellPhaseStepper active="modello" onChange={vi.fn()} />);
    expect(screen.getByTestId("phase-step-run")).not.toBeDisabled();
    expect(screen.getByTestId("phase-step-results")).toBeDisabled();
  });

  it("BLOCCO: con analisi eseguita, anche Risultati si sblocca", () => {
    setAnalysisDone();
    render(<ShellPhaseStepper active="modello" onChange={vi.fn()} />);
    expect(screen.getByTestId("phase-step-run")).not.toBeDisabled();
    expect(screen.getByTestId("phase-step-results")).not.toBeDisabled();
  });

  it("BLOCCO: risultati STALE → Risultati resta sbloccato (l'utente puo' tornare a vedere)", () => {
    setDoneModel();
    useResultsStore.setState({
      staticResults: makeStaticResults(),
      modelHashAtAnalysis: "hash-vecchio",
    });
    render(<ShellPhaseStepper active="modello" onChange={vi.fn()} />);
    expect(screen.getByTestId("phase-step-results")).not.toBeDisabled();
    expect(screen.getByTestId("phase-step-results").getAttribute("data-state")).toBe("stale");
  });

  it("ACTIVE ESCAPE: la fase attiva resta cliccabile anche se canEnter=false", () => {
    // Utente in Risultati, poi resetta tutto. La fase risultati e' bloccata
    // logicamente (no model, no analisi) MA siccome e' active, resta non-disabled
    // — cosi' l'utente puo' rimanere dov'e' senza che la spina lo cacci via.
    useModelStore.setState({ model: null });
    useResultsStore.setState({
      staticResults: null, modalResults: null, dynamicResults: null,
    });
    render(<ShellPhaseStepper active="risultati" onChange={vi.fn()} />);
    expect(screen.getByTestId("phase-step-results")).not.toBeDisabled();
    expect(screen.getByTestId("phase-step-results").className).toContain("is-active");
    // Esegui invece NON e' active, quindi blocked
    expect(screen.getByTestId("phase-step-run")).toBeDisabled();
  });

  it("BLOCCO: tooltip differenziato (title) per stato blocked", () => {
    useModelStore.setState({ model: null });
    render(<ShellPhaseStepper active="modello" onChange={vi.fn()} />);
    const run = screen.getByTestId("phase-step-run");
    expect(run.getAttribute("title")).toContain("Completa 'Costruisci'");
    const results = screen.getByTestId("phase-step-results");
    expect(results.getAttribute("title")).toContain("Esegui un'analisi");
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
  it("Run: isRunning=false + nessun risultato → state='empty'", () => {
    useAnalysisStore.setState({ isRunning: false });
    useResultsStore.setState({ staticResults: null, modalResults: null, dynamicResults: null });
    render(<ShellPhaseStepper active="modello" onChange={vi.fn()} />);
    expect(screen.getByTestId("phase-step-run").getAttribute("data-state")).toBe("empty");
  });

  it("Run: isRunning=true → state='running' (spinner)", () => {
    useAnalysisStore.setState({ isRunning: true });
    render(<ShellPhaseStepper active="modello" onChange={vi.fn()} />);
    expect(screen.getByTestId("phase-step-run").getAttribute("data-state")).toBe("running");
  });

  it("Run: calcolo fresco (results + hash matching) → state='done' (✓ Esegui)", () => {
    useModelStore.setState({ model: makeModel() });
    useResultsStore.setState({
      staticResults: makeStaticResults(),
      // null modelHashAtAnalysis = mai stale (pattern StaleResultsBanner)
      modelHashAtAnalysis: null,
    });
    useAnalysisStore.setState({ isRunning: false });
    render(<ShellPhaseStepper active="modello" onChange={vi.fn()} />);
    expect(screen.getByTestId("phase-step-run").getAttribute("data-state")).toBe("done");
    // E Risultati anche done
    expect(screen.getByTestId("phase-step-results").getAttribute("data-state")).toBe("done");
  });

  it("Run: risultati STALE → state='empty' (la ✓ si stacca, va con Risultati⚠)", () => {
    useModelStore.setState({ model: makeModel({ nodes: [{ id: 1, x: 0, y: 0, z: 0 } as never] }) });
    useResultsStore.setState({
      staticResults: makeStaticResults(),
      modelHashAtAnalysis: "hash-vecchio-non-matchante",
    });
    useAnalysisStore.setState({ isRunning: false });
    render(<ShellPhaseStepper active="modello" onChange={vi.fn()} />);
    expect(screen.getByTestId("phase-step-run").getAttribute("data-state")).toBe("empty");
    // Risultati invece passa a stale (la spina racconta "rilancia")
    expect(screen.getByTestId("phase-step-results").getAttribute("data-state")).toBe("stale");
  });

  it("Run: isRunning=true prevale sullo stale (mostra spinner anche se stale)", () => {
    useModelStore.setState({ model: makeModel({ nodes: [{ id: 1, x: 0, y: 0, z: 0 } as never] }) });
    useResultsStore.setState({
      staticResults: makeStaticResults(),
      modelHashAtAnalysis: "hash-vecchio",
    });
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
