/**
 * ResultsSintesi.test.tsx · redesign/workspace-fasi (FETTA 2b · FAM B).
 *
 * Verifica i 4 stati onesti delle 3 metric card (UR · σ max · freccia) +
 * banner "Calcolo sospetto" + badge affidabilita' + toggle viste + Itera/Report.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ResultsSintesi } from "./ResultsSintesi";
import { useModelStore } from "../../store/modelStore";
import { useResultsStore } from "../../store/resultsStore";
import { useAnalysisStore } from "../../store/analysisStore";
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

function makeBeam(id = 1): Element {
  return { id, type: "beam2d", nodes: [1, 2], material_id: "m1" };
}
function makeShell(id = 1): Element {
  return { id, type: "shell_q4", nodes: [1, 2, 3, 4], material_id: "m1" };
}
function makeSolid(id = 1): Element {
  return { id, type: "solid_h8", nodes: [1, 2, 3, 4, 5, 6, 7, 8], material_id: "m1" };
}

function makeModel(elements: Element[]): FEAModel {
  return {
    id: "test", name: "Test", units: "SI", is_3d: false,
    nodes: [], elements, loads: [], constraints: [],
  };
}

describe("ResultsSintesi · FETTA 2b · FAM B", () => {
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

  // ── Banner sospetto ────────────────────────────────────────────────────
  it("banner 'Calcolo sospetto' in cima quando isSuspicious (σ=0 + freccia=0)", () => {
    useModelStore.setState({ model: makeModel([makeSolid()]) });
    useResultsStore.setState({
      staticResults: makeStaticResults({ max_stress: 0, max_displacement: 0 }),
    });
    render(<ResultsSintesi />);
    const warn = screen.getByTestId("results-sintesi-warn");
    expect(warn).toBeInTheDocument();
    expect(warn.textContent).toContain("Calcolo sospetto");
    expect(warn.textContent?.toLowerCase()).toContain("modello degenere");
  });

  it("nessun banner quando i risultati sono solidi (es. beam con sigma > 0)", () => {
    useModelStore.setState({ model: makeModel([makeBeam()]) });
    useResultsStore.setState({ staticResults: makeStaticResults() });
    render(<ResultsSintesi />);
    expect(screen.queryByTestId("results-sintesi-warn")).toBeNull();
  });

  it("nessun banner quando NON ci sono ancora risultati (stato '—')", () => {
    render(<ResultsSintesi />);
    expect(screen.queryByTestId("results-sintesi-warn")).toBeNull();
  });

  // ── Metric UR EC3 ──────────────────────────────────────────────────────
  it("UR: '—' empty quando nessun calcolo", () => {
    render(<ResultsSintesi />);
    const ur = screen.getByTestId("sintesi-metric-ur");
    expect(ur.textContent).toContain("—");
    expect(ur.parentElement?.getAttribute("data-tone")).toBe("empty");
  });

  it("UR: 'n/a' su geometria non normata (solo solidi)", () => {
    useModelStore.setState({ model: makeModel([makeSolid()]) });
    useResultsStore.setState({ staticResults: makeStaticResults() });
    render(<ResultsSintesi />);
    const ur = screen.getByTestId("sintesi-metric-ur");
    expect(ur.textContent).toContain("n/a");
    expect(ur.parentElement?.getAttribute("data-tone")).toBe("na");
    expect(ur.parentElement?.getAttribute("title")).toContain("EC3 non applicabile");
  });

  it("UR: 'Passa ✓' verde su beam con UR < 1 (sigma=178/235=0.76)", () => {
    useModelStore.setState({ model: makeModel([makeBeam()]) });
    useResultsStore.setState({ staticResults: makeStaticResults({ max_stress: 178e6 }) });
    render(<ResultsSintesi />);
    const ur = screen.getByTestId("sintesi-metric-ur");
    expect(ur.textContent).toContain("0.76");
    expect(ur.textContent).toContain("✓");
    expect(ur.parentElement?.getAttribute("data-tone")).toBe("pass");
  });

  it("UR: 'Non passa ✗' rosso su beam con UR > 1 (sigma=300/235=1.28)", () => {
    useModelStore.setState({ model: makeModel([makeBeam()]) });
    useResultsStore.setState({ staticResults: makeStaticResults({ max_stress: 300e6 }) });
    render(<ResultsSintesi />);
    const ur = screen.getByTestId("sintesi-metric-ur");
    expect(ur.textContent).toMatch(/1[.,]28/);
    expect(ur.textContent?.toLowerCase()).toContain("supera");
    expect(ur.parentElement?.getAttribute("data-tone")).toBe("fail");
  });

  it("UR: warn '—' quando suspicious anche su beam (sospetto vince su pass)", () => {
    useModelStore.setState({ model: makeModel([makeBeam()]) });
    useResultsStore.setState({
      staticResults: makeStaticResults({ max_stress: 0, max_displacement: 0 }),
    });
    render(<ResultsSintesi />);
    const ur = screen.getByTestId("sintesi-metric-ur");
    expect(ur.parentElement?.getAttribute("data-tone")).toBe("warn");
    expect(ur.textContent).toContain("sospetto");
  });

  // ── Metric σ max ───────────────────────────────────────────────────────
  it("σ max: '—' empty quando nessun calcolo", () => {
    render(<ResultsSintesi />);
    expect(screen.getByTestId("sintesi-metric-sigma").textContent).toContain("—");
  });

  it("σ max: numero MPa con suffisso 'elemento Exx' se element_stresses presente", () => {
    useResultsStore.setState({
      staticResults: makeStaticResults({
        max_stress: 178e6,
        element_stresses: [
          { element_id: 6, sigma_x: 0, sigma_y: 0, sigma_z: 0, tau_xy: 0, tau_yz: 0, tau_xz: 0, von_mises: 178e6, sigma_max: 0, sigma_min: 0 },
          { element_id: 1, sigma_x: 0, sigma_y: 0, sigma_z: 0, tau_xy: 0, tau_yz: 0, tau_xz: 0, von_mises: 50e6, sigma_max: 0, sigma_min: 0 },
        ],
      }),
    });
    render(<ResultsSintesi />);
    const sigma = screen.getByTestId("sintesi-metric-sigma");
    expect(sigma.textContent).toContain("178");
    expect(sigma.textContent).toContain("MPa");
    expect(sigma.textContent).toContain("E6");
  });

  it("σ max: con element_stresses vuoto, nessun suffisso 'elemento'", () => {
    useResultsStore.setState({ staticResults: makeStaticResults({ element_stresses: [] }) });
    render(<ResultsSintesi />);
    const sigma = screen.getByTestId("sintesi-metric-sigma");
    expect(sigma.textContent).toContain("MPa");
    expect(sigma.textContent).not.toContain("elemento");
  });

  // ── Metric freccia ─────────────────────────────────────────────────────
  it("freccia: '—' empty quando nessun calcolo", () => {
    render(<ResultsSintesi />);
    expect(screen.getByTestId("sintesi-metric-freccia").textContent).toContain("—");
  });

  it("freccia: mm con suffisso 'nodo Nxx' se displacements presente", () => {
    useResultsStore.setState({
      staticResults: makeStaticResults({
        max_displacement: 0.00962,
        displacements: [
          { node_id: 6, ux: 0, uy: -0.00962, uz: 0, rx: 0, ry: 0, rz: 0 },
          { node_id: 1, ux: 0, uy: -0.005, uz: 0, rx: 0, ry: 0, rz: 0 },
        ],
      }),
    });
    render(<ResultsSintesi />);
    const f = screen.getByTestId("sintesi-metric-freccia");
    expect(f.textContent).toMatch(/9[.,]62/);
    expect(f.textContent).toContain("mm");
    expect(f.textContent).toContain("N6");
  });

  it("freccia: rende il modulo anche con max_displacement negativo", () => {
    useResultsStore.setState({
      staticResults: makeStaticResults({ max_displacement: -0.012 }),
    });
    render(<ResultsSintesi />);
    const f = screen.getByTestId("sintesi-metric-freccia").textContent ?? "";
    expect(f).toMatch(/12[.,]00/);
    expect(f).not.toContain("-");
  });

  // ── Trust badge (Validato / Stima / Mista) ────────────────────────────
  it("trust: 'Validato' verde su solo beam/aste", () => {
    useModelStore.setState({ model: makeModel([makeBeam()]) });
    render(<ResultsSintesi />);
    const trust = screen.getByTestId("sintesi-trust-badge");
    expect(trust.textContent).toContain("Validato");
    expect(trust.getAttribute("data-tone")).toBe("validated");
  });

  it("trust: 'Stima' ambra su solo shell", () => {
    useModelStore.setState({ model: makeModel([makeShell()]) });
    render(<ResultsSintesi />);
    const trust = screen.getByTestId("sintesi-trust-badge");
    expect(trust.textContent).toContain("Stima");
    expect(trust.getAttribute("data-tone")).toBe("estimate");
  });

  it("trust: 'Stima' ambra su solo solidi", () => {
    useModelStore.setState({ model: makeModel([makeSolid()]) });
    render(<ResultsSintesi />);
    expect(screen.getByTestId("sintesi-trust-badge").textContent).toContain("Stima");
  });

  it("trust: 'Mista' su beam + solidi (anello debole)", () => {
    useModelStore.setState({ model: makeModel([makeBeam(1), makeSolid(2)]) });
    render(<ResultsSintesi />);
    const trust = screen.getByTestId("sintesi-trust-badge");
    expect(trust.textContent).toContain("Mista");
    expect(trust.getAttribute("data-tone")).toBe("mixed");
  });

  // ── Toggle viste ───────────────────────────────────────────────────────
  it("click toggle Deformata: aggiorna resultsStore.showDeformed", () => {
    render(<ResultsSintesi />);
    expect(useResultsStore.getState().showDeformed).toBe(false);
    fireEvent.click(screen.getByTestId("sintesi-view-deformata"));
    expect(useResultsStore.getState().showDeformed).toBe(true);
  });

  it("click toggle Sforzi: aggiorna resultsStore.showStressColormap", () => {
    render(<ResultsSintesi />);
    fireEvent.click(screen.getByTestId("sintesi-view-sforzi"));
    expect(useResultsStore.getState().showStressColormap).toBe(true);
  });

  it("click toggle Momento (da spento): accende + force diagramComponent='M'", () => {
    useAnalysisStore.setState({ showDiagrams: false, diagramComponent: "N" });
    render(<ResultsSintesi />);
    fireEvent.click(screen.getByTestId("sintesi-view-momento"));
    expect(useAnalysisStore.getState().showDiagrams).toBe(true);
    expect(useAnalysisStore.getState().diagramComponent).toBe("M");
  });

  it("aria-pressed riflette stato attivo dei toggle", () => {
    useResultsStore.setState({ showDeformed: true });
    render(<ResultsSintesi />);
    expect(screen.getByTestId("sintesi-view-deformata").getAttribute("aria-pressed")).toBe("true");
  });

  // ── Footer azioni ──────────────────────────────────────────────────────
  it("Itera: bottone disabilitato senza onIterate prop", () => {
    render(<ResultsSintesi />);
    const btn = screen.getByTestId("sintesi-action-iterate") as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it("Itera: con onIterate prop, click chiama il callback", () => {
    const onIterate = vi.fn();
    render(<ResultsSintesi onIterate={onIterate} />);
    const btn = screen.getByTestId("sintesi-action-iterate") as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    fireEvent.click(btn);
    expect(onIterate).toHaveBeenCalledOnce();
  });

  it("Genera report: click apre alert placeholder (no logica nuova)", () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => undefined);
    render(<ResultsSintesi />);
    fireEvent.click(screen.getByTestId("sintesi-action-report"));
    expect(alertSpy).toHaveBeenCalledOnce();
    expect(alertSpy.mock.calls[0][0]).toContain("Genera report");
    alertSpy.mockRestore();
  });
});
