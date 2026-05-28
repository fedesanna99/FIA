/**
 * ResultsVerdictStrip.test.tsx · redesign/workspace-fasi (FETTA 2b · FAM A).
 *
 * Verifica i 4 stati onesti della strip:
 *   - "—"          → non ancora calcolato
 *   - "n/a"        → non si applica alla geometria
 *   - warn-ambra   → calcolo sospetto (modello degenere)
 *   - valore vero  → tutto a posto
 *
 * Plus toggle viste (Deformata / Sforzi / Momento) collegati ai flag store.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ResultsVerdictStrip } from "./ResultsVerdictStrip";
import { useResultsStore } from "../../store/resultsStore";
import { useAnalysisStore } from "../../store/analysisStore";
import { useModelStore } from "../../store/modelStore";
import type { StaticResults } from "../../types/results";
import type { FEAModel, Element } from "../../types/model";

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

function makeBeamElement(id = 1): Element {
  return { id, type: "beam2d", nodes: [1, 2], material_id: "m1" };
}

function makeSolidElement(id = 1): Element {
  return { id, type: "solid_h8", nodes: [1, 2, 3, 4, 5, 6, 7, 8], material_id: "m1" };
}

function makeModel(elements: Element[]): FEAModel {
  return {
    id: "test", name: "Test", units: "SI", is_3d: false,
    nodes: [], elements, loads: [], constraints: [],
  };
}

describe("ResultsVerdictStrip · FETTA 2b · FAM A", () => {
  beforeEach(() => {
    useModelStore.setState({ model: null });
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

  // ── Rendering base ────────────────────────────────────────────────────
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

  // ── Stato "—" (nessun calcolo) ────────────────────────────────────────
  it("nessun calcolo: tutte le celle a '—' (tone neutral)", () => {
    render(<ResultsVerdictStrip />);
    expect(screen.getByTestId("verdict-cell-ec3").textContent).toBe("—");
    expect(screen.getByTestId("verdict-cell-sigma").textContent).toBe("—");
    expect(screen.getByTestId("verdict-cell-freccia").textContent).toBe("—");
    expect(screen.getByTestId("verdict-cell-ur").textContent).toBe("—");
    // Strip senza is-suspicious
    expect(screen.getByTestId("results-verdict-strip").className).not.toContain("is-suspicious");
  });

  // ── Stato "n/a" (geometria non normata: solo solidi/shell) ────────────
  it("modello con solo solidi + staticResults validi: EC3 e UR mostrano 'n/a' (no '—' muto)", () => {
    useModelStore.setState({ model: makeModel([makeSolidElement()]) });
    useResultsStore.setState({ staticResults: makeStaticResults() });
    render(<ResultsVerdictStrip />);
    const ec3 = screen.getByTestId("verdict-cell-ec3");
    const ur = screen.getByTestId("verdict-cell-ur");
    expect(ec3.textContent).toBe("n/a");
    expect(ur.textContent).toBe("n/a");
    expect(ec3.parentElement?.getAttribute("data-tone")).toBe("na");
    expect(ec3.parentElement?.getAttribute("title")).toContain("non applicabile");
    // sigma e freccia restano valori veri (non n/a)
    expect(screen.getByTestId("verdict-cell-sigma").textContent).toContain("178");
    expect(screen.getByTestId("verdict-cell-freccia").textContent).toMatch(/9[.,]62/);
  });

  // ── Stato "Passa ✓" (UR < 1) ──────────────────────────────────────────
  it("beam + UR < 1: EC3='Passa ✓' verde + UR='0.XX'", () => {
    useModelStore.setState({ model: makeModel([makeBeamElement()]) });
    // sigma=178 MPa, fyd ec3=235 MPa → UR=0.76
    useResultsStore.setState({ staticResults: makeStaticResults({ max_stress: 178e6 }) });
    render(<ResultsVerdictStrip />);
    const ec3 = screen.getByTestId("verdict-cell-ec3");
    expect(ec3.textContent).toContain("Passa");
    expect(ec3.parentElement?.getAttribute("data-tone")).toBe("pass");
    const ur = screen.getByTestId("verdict-cell-ur");
    expect(ur.textContent).toBe("0.76");
    expect(ur.parentElement?.getAttribute("data-tone")).toBe("pass");
  });

  // ── Stato "Non passa ✗" (UR > 1) ──────────────────────────────────────
  it("beam + UR > 1: EC3='Non passa ✗' rosso + UR='X.XX' fail", () => {
    useModelStore.setState({ model: makeModel([makeBeamElement()]) });
    // sigma=300 MPa, fyd=235 → UR=1.28
    useResultsStore.setState({ staticResults: makeStaticResults({ max_stress: 300e6 }) });
    render(<ResultsVerdictStrip />);
    const ec3 = screen.getByTestId("verdict-cell-ec3");
    expect(ec3.textContent).toContain("Non passa");
    expect(ec3.parentElement?.getAttribute("data-tone")).toBe("fail");
    const ur = screen.getByTestId("verdict-cell-ur");
    expect(ur.parentElement?.getAttribute("data-tone")).toBe("fail");
  });

  // ── Rilevatore CALCOLO SOSPETTO ───────────────────────────────────────
  it("sospetto: hasResults + sigma≈0 + freccia≈0 → EC3='⚠ Sospetto' + strip.is-suspicious", () => {
    useModelStore.setState({ model: makeModel([makeSolidElement()]) });
    useResultsStore.setState({
      staticResults: makeStaticResults({ max_stress: 0, max_displacement: 0 }),
    });
    render(<ResultsVerdictStrip />);
    const ec3 = screen.getByTestId("verdict-cell-ec3");
    expect(ec3.textContent).toContain("Sospetto");
    expect(ec3.parentElement?.getAttribute("data-tone")).toBe("warn");
    expect(ec3.parentElement?.getAttribute("title")).toContain("modello degenere");
    // Strip ha classe is-suspicious
    expect(screen.getByTestId("results-verdict-strip").className).toContain("is-suspicious");
    expect(screen.getByTestId("results-verdict-strip").getAttribute("data-suspicious")).toBe("true");
    // sigma e freccia restano 0 (vero), MA con tone warn (cornice ambra)
    expect(screen.getByTestId("verdict-cell-sigma").parentElement?.getAttribute("data-tone")).toBe("warn");
    expect(screen.getByTestId("verdict-cell-freccia").parentElement?.getAttribute("data-tone")).toBe("warn");
    // UR resta neutro (— ambra), il warning principale e' EC3
    expect(screen.getByTestId("verdict-cell-ur").parentElement?.getAttribute("data-tone")).toBe("warn");
  });

  it("sospetto vince su n/a: anche su geometria non normata, se sigma=0 e freccia=0 → 'Sospetto', non 'n/a'", () => {
    // priorita': sospetto > n/a (il calcolo degenere e' segnalazione critica)
    useModelStore.setState({ model: makeModel([makeSolidElement()]) });
    useResultsStore.setState({
      staticResults: makeStaticResults({ max_stress: 0, max_displacement: 0 }),
    });
    render(<ResultsVerdictStrip />);
    expect(screen.getByTestId("verdict-cell-ec3").textContent).toContain("Sospetto");
    expect(screen.getByTestId("verdict-cell-ec3").textContent).not.toContain("n/a");
  });

  it("sopra la soglia SUSPICIOUS_EPS: non e' piu' sospetto", () => {
    useModelStore.setState({ model: makeModel([makeSolidElement()]) });
    // un nanometro di freccia: sopra eps 1e-12 (m), quindi non sospetto
    useResultsStore.setState({
      staticResults: makeStaticResults({ max_stress: 0, max_displacement: 1e-9 }),
    });
    render(<ResultsVerdictStrip />);
    expect(screen.getByTestId("results-verdict-strip").className).not.toContain("is-suspicious");
  });

  // ── sigma/freccia: numeri veri sempre quando hasResults ──────────────
  it("freccia negativa: rende il modulo (no segno meno)", () => {
    useResultsStore.setState({
      staticResults: makeStaticResults({ max_displacement: -0.012 }),
    });
    render(<ResultsVerdictStrip />);
    const freccia = screen.getByTestId("verdict-cell-freccia").textContent ?? "";
    expect(freccia).toMatch(/12[.,]00/);
    expect(freccia).not.toContain("-");
  });

  // ── Toggle Deformata ──────────────────────────────────────────────────
  it("click Deformata: chiama toggleDeformed esistente", () => {
    render(<ResultsVerdictStrip />);
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
    fireEvent.click(screen.getByTestId("results-view-sforzi"));
    expect(useResultsStore.getState().showStressColormap).toBe(true);
  });

  // ── Toggle Momento ────────────────────────────────────────────────────
  it("click Momento da spento: accende + force diagramComponent='M'", () => {
    useAnalysisStore.setState({ showDiagrams: false, diagramComponent: "N" });
    render(<ResultsVerdictStrip />);
    fireEvent.click(screen.getByTestId("results-view-momento"));
    expect(useAnalysisStore.getState().showDiagrams).toBe(true);
    expect(useAnalysisStore.getState().diagramComponent).toBe("M");
  });

  it("click Momento gia' attivo M: spegne", () => {
    useAnalysisStore.setState({ showDiagrams: true, diagramComponent: "M" });
    render(<ResultsVerdictStrip />);
    fireEvent.click(screen.getByTestId("results-view-momento"));
    expect(useAnalysisStore.getState().showDiagrams).toBe(false);
  });

  it("Momento aria-pressed: true solo se showDiagrams && component='M'", () => {
    useAnalysisStore.setState({ showDiagrams: true, diagramComponent: "M" });
    const { rerender } = render(<ResultsVerdictStrip />);
    expect(screen.getByTestId("results-view-momento").getAttribute("aria-pressed")).toBe("true");
    useAnalysisStore.setState({ showDiagrams: true, diagramComponent: "N" });
    rerender(<ResultsVerdictStrip />);
    expect(screen.getByTestId("results-view-momento").getAttribute("aria-pressed")).toBe("false");
  });

  it("click Momento con N gia' attivo (diagrammi on): forza M senza spegnere", () => {
    useAnalysisStore.setState({ showDiagrams: true, diagramComponent: "N" });
    render(<ResultsVerdictStrip />);
    fireEvent.click(screen.getByTestId("results-view-momento"));
    expect(useAnalysisStore.getState().showDiagrams).toBe(true);
    expect(useAnalysisStore.getState().diagramComponent).toBe("M");
  });
});
