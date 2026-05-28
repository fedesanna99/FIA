/**
 * ResultsVerdictStrip.test.tsx · redesign/workspace-fasi (FETTA 2a).
 *
 * Verifica la striscia verdetto + i 3 toggle viste:
 *   - σ max e freccia derivati da resultsStore.staticResults (Pa→MPa, m→mm)
 *   - EC3 e UR sempre "—" (cablamento step 2b)
 *   - toggle collegati ai flag esistenti senza scrivere nuova logica
 */
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ResultsVerdictStrip } from "./ResultsVerdictStrip";
import { useResultsStore } from "../../store/resultsStore";
import { useAnalysisStore } from "../../store/analysisStore";
import type { StaticResults } from "../../types/results";

function makeStaticResults(partial: Partial<StaticResults> = {}): StaticResults {
  return {
    analysis_type: "static",
    model_id: "x",
    displacements: [],
    reactions: [],
    element_forces: [],
    element_stresses: [],
    max_displacement: 0.00962, // 9.62 mm
    max_stress: 178e6,         // 178 MPa
    n_dofs: 12,
    solve_time_ms: 10,
    ...partial,
  };
}

describe("ResultsVerdictStrip · FETTA 2a", () => {
  beforeEach(() => {
    useResultsStore.setState({
      staticResults: null,
      modalResults: null,
      dynamicResults: null,
      showDeformed: false,
      showStressColormap: false,
    });
    useAnalysisStore.setState({
      showDiagrams: false,
      diagramComponent: "M",
    });
  });

  // ── Striscia verdetto ──────────────────────────────────────────────────
  it("renderizza le 4 celle (EC3, σ max, freccia, UR) + i 3 toggle", () => {
    render(<ResultsVerdictStrip />);
    expect(screen.getByTestId("results-verdict-strip")).toBeInTheDocument();
    expect(screen.getByTestId("verdict-cell-ec3")).toBeInTheDocument();
    expect(screen.getByTestId("verdict-cell-sigma")).toBeInTheDocument();
    expect(screen.getByTestId("verdict-cell-freccia")).toBeInTheDocument();
    expect(screen.getByTestId("verdict-cell-ur")).toBeInTheDocument();
    expect(screen.getByTestId("results-view-deformata")).toBeInTheDocument();
    expect(screen.getByTestId("results-view-sforzi")).toBeInTheDocument();
    expect(screen.getByTestId("results-view-momento")).toBeInTheDocument();
  });

  it("senza staticResults: σ max e freccia mostrano '—' (no dati finti)", () => {
    render(<ResultsVerdictStrip />);
    expect(screen.getByTestId("verdict-cell-sigma").textContent).toContain("—");
    expect(screen.getByTestId("verdict-cell-freccia").textContent).toContain("—");
  });

  it("con staticResults: σ max in MPa, freccia in mm (valori reali, niente lookup mock)", () => {
    useResultsStore.setState({ staticResults: makeStaticResults() });
    render(<ResultsVerdictStrip />);
    // 178e6 Pa → 178 MPa
    expect(screen.getByTestId("verdict-cell-sigma").textContent).toContain("178");
    expect(screen.getByTestId("verdict-cell-sigma").textContent).toContain("MPa");
    // 0.00962 m → 9.62 mm (locale it-IT: usa la virgola decimale)
    const freccia = screen.getByTestId("verdict-cell-freccia").textContent ?? "";
    expect(freccia).toMatch(/9[.,]62/);
    expect(freccia).toContain("mm");
  });

  it("EC3 e UR sempre '—' (placeholder onesto, step 2b cablera')", () => {
    useResultsStore.setState({ staticResults: makeStaticResults() });
    render(<ResultsVerdictStrip />);
    expect(screen.getByTestId("verdict-cell-ec3").textContent).toBe("—");
    expect(screen.getByTestId("verdict-cell-ur").textContent).toBe("—");
  });

  it("freccia con max_displacement negativa: rende il modulo (non il segno)", () => {
    useResultsStore.setState({ staticResults: makeStaticResults({ max_displacement: -0.012 }) });
    render(<ResultsVerdictStrip />);
    const freccia = screen.getByTestId("verdict-cell-freccia").textContent ?? "";
    expect(freccia).toMatch(/12[.,]00/);
    expect(freccia).not.toContain("-");
  });

  // ── Toggle Deformata ──────────────────────────────────────────────────
  it("click Deformata: chiama toggleDeformed esistente", () => {
    render(<ResultsVerdictStrip />);
    expect(useResultsStore.getState().showDeformed).toBe(false);
    fireEvent.click(screen.getByTestId("results-view-deformata"));
    expect(useResultsStore.getState().showDeformed).toBe(true);
    fireEvent.click(screen.getByTestId("results-view-deformata"));
    expect(useResultsStore.getState().showDeformed).toBe(false);
  });

  it("Deformata attiva: aria-pressed=true + classe is-on", () => {
    useResultsStore.setState({ showDeformed: true });
    render(<ResultsVerdictStrip />);
    const btn = screen.getByTestId("results-view-deformata");
    expect(btn.getAttribute("aria-pressed")).toBe("true");
    expect(btn.className).toContain("is-on");
  });

  // ── Toggle Sforzi ─────────────────────────────────────────────────────
  it("click Sforzi: chiama toggleStressColormap esistente", () => {
    render(<ResultsVerdictStrip />);
    expect(useResultsStore.getState().showStressColormap).toBe(false);
    fireEvent.click(screen.getByTestId("results-view-sforzi"));
    expect(useResultsStore.getState().showStressColormap).toBe(true);
  });

  // ── Toggle Momento (showDiagrams + diagramComponent="M") ──────────────
  it("click Momento (da spento): accende showDiagrams + force diagramComponent='M'", () => {
    useAnalysisStore.setState({ showDiagrams: false, diagramComponent: "N" });
    render(<ResultsVerdictStrip />);
    fireEvent.click(screen.getByTestId("results-view-momento"));
    expect(useAnalysisStore.getState().showDiagrams).toBe(true);
    expect(useAnalysisStore.getState().diagramComponent).toBe("M");
  });

  it("click Momento (gia' attivo M): spegne showDiagrams", () => {
    useAnalysisStore.setState({ showDiagrams: true, diagramComponent: "M" });
    render(<ResultsVerdictStrip />);
    fireEvent.click(screen.getByTestId("results-view-momento"));
    expect(useAnalysisStore.getState().showDiagrams).toBe(false);
  });

  it("Momento aria-pressed: true solo se showDiagrams && component='M' (NON con component='N')", () => {
    useAnalysisStore.setState({ showDiagrams: true, diagramComponent: "M" });
    const { rerender } = render(<ResultsVerdictStrip />);
    expect(screen.getByTestId("results-view-momento").getAttribute("aria-pressed")).toBe("true");
    useAnalysisStore.setState({ showDiagrams: true, diagramComponent: "N" });
    rerender(<ResultsVerdictStrip />);
    expect(screen.getByTestId("results-view-momento").getAttribute("aria-pressed")).toBe("false");
  });

  it("click Momento da component='N' (diagrammi gia' on per altro): forza component='M' senza spegnere", () => {
    useAnalysisStore.setState({ showDiagrams: true, diagramComponent: "N" });
    render(<ResultsVerdictStrip />);
    fireEvent.click(screen.getByTestId("results-view-momento"));
    expect(useAnalysisStore.getState().showDiagrams).toBe(true);
    expect(useAnalysisStore.getState().diagramComponent).toBe("M");
  });
});
