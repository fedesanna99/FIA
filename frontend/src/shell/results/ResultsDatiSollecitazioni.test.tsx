/**
 * ResultsDatiSollecitazioni.test.tsx · FETTA 2b · FAM C.
 *
 * Verifica:
 *  - placeholder onesto senza staticResults
 *  - tabella con M/V/N/σ per beam (numeri reali)
 *  - colonna M/V/N a "n/a" su elementi non lineari (solidi/shell)
 *  - row max evidenziata (is-max)
 *  - sort: default σ desc, click su intestazione cambia
 *  - banner sospetto se isSuspicious
 *  - export CSV: bottone placeholder onesto
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ResultsDatiSollecitazioni } from "./ResultsDatiSollecitazioni";
import { useModelStore } from "../../store/modelStore";
import { useResultsStore } from "../../store/resultsStore";
import { useToastStore } from "../../store/toastStore";
import type { StaticResults, ElementForces, ElementStress } from "../../types/results";
import type { FEAModel, Element } from "../../types/model";

function makeForces(id: number, partial: Partial<ElementForces> = {}): ElementForces {
  return {
    element_id: id,
    N_i: 0, Vy_i: 0, Vz_i: 0, Mx_i: 0, My_i: 0, Mz_i: 0,
    N_j: 0, Vy_j: 0, Vz_j: 0, Mx_j: 0, My_j: 0, Mz_j: 0,
    ...partial,
  };
}
function makeStress(id: number, von_mises: number): ElementStress {
  return {
    element_id: id, sigma_x: 0, sigma_y: 0, sigma_z: 0,
    tau_xy: 0, tau_yz: 0, tau_xz: 0,
    von_mises, sigma_max: 0, sigma_min: 0,
  };
}
function makeResults(
  forces: ElementForces[],
  stresses: ElementStress[],
  max_displacement = 0.01,
  max_stress = 178e6,
): StaticResults {
  return {
    analysis_type: "static", model_id: "x",
    displacements: [], reactions: [],
    element_forces: forces, element_stresses: stresses,
    max_displacement, max_stress,
    n_dofs: 12, solve_time_ms: 10,
  };
}
function makeModel(elements: Element[]): FEAModel {
  return {
    id: "t", name: "t", units: "SI", is_3d: false,
    nodes: [], elements, loads: [], constraints: [],
  };
}

describe("ResultsDatiSollecitazioni · FAM C", () => {
  beforeEach(() => {
    useModelStore.setState({ model: null });
    useResultsStore.setState({ staticResults: null, modalResults: null, dynamicResults: null });
    useToastStore.setState({ toasts: [] });
  });

  it("placeholder onesto senza staticResults", () => {
    render(<ResultsDatiSollecitazioni />);
    expect(screen.getByTestId("results-placeholder")).toBeInTheDocument();
    expect(screen.queryByTestId("sollec-table")).toBeNull();
  });

  it("monta tabella con header ordinabili e righe per element", () => {
    useModelStore.setState({
      model: makeModel([
        { id: 1, type: "beam2d", nodes: [1, 2], material_id: "m1" },
        { id: 2, type: "beam2d", nodes: [2, 3], material_id: "m1" },
      ]),
    });
    useResultsStore.setState({
      staticResults: makeResults(
        [makeForces(1, { N_i: 30000, Vy_i: 24000, Mz_i: 45000 }),
         makeForces(2, { N_i: 10000 })],
        [makeStress(1, 178e6), makeStress(2, 50e6)],
      ),
    });
    render(<ResultsDatiSollecitazioni />);
    expect(screen.getByTestId("sollec-table")).toBeInTheDocument();
    expect(screen.getByTestId("sollec-row-1")).toBeInTheDocument();
    expect(screen.getByTestId("sollec-row-2")).toBeInTheDocument();
  });

  it("row con σ max ha class is-max + tag 'max'", () => {
    useModelStore.setState({
      model: makeModel([
        { id: 1, type: "beam2d", nodes: [1, 2], material_id: "m1" },
        { id: 6, type: "beam2d", nodes: [6, 7], material_id: "m1" },
      ]),
    });
    useResultsStore.setState({
      staticResults: makeResults(
        [makeForces(1), makeForces(6)],
        [makeStress(1, 50e6), makeStress(6, 178e6)],
      ),
    });
    render(<ResultsDatiSollecitazioni />);
    const rowMax = screen.getByTestId("sollec-row-6");
    expect(rowMax.getAttribute("data-max")).toBe("true");
    expect(rowMax.textContent).toContain("max");
    expect(screen.getByTestId("sollec-row-1").getAttribute("data-max")).toBeNull();
  });

  it("solido h8: M/V/N a 'n/a', σ valore vero", () => {
    useModelStore.setState({
      model: makeModel([
        { id: 1, type: "solid_h8", nodes: [1, 2, 3, 4, 5, 6, 7, 8], material_id: "m1" },
      ]),
    });
    useResultsStore.setState({
      staticResults: makeResults(
        [makeForces(1)],
        [makeStress(1, 100e6)],
      ),
    });
    render(<ResultsDatiSollecitazioni />);
    const row = screen.getByTestId("sollec-row-1");
    const cells = row.querySelectorAll("td");
    // 5 colonne: elem | M | V | N | σ
    expect(cells.length).toBe(5);
    expect(cells[1].textContent?.trim()).toBe("n/a"); // M
    expect(cells[2].textContent?.trim()).toBe("n/a"); // V
    expect(cells[3].textContent?.trim()).toBe("n/a"); // N
    expect(cells[4].textContent).toContain("100");    // σ
  });

  it("truss puro: M e V 'n/a', N valore vero (assiale)", () => {
    useModelStore.setState({
      model: makeModel([
        { id: 1, type: "truss2d", nodes: [1, 2], material_id: "m1" },
      ]),
    });
    useResultsStore.setState({
      staticResults: makeResults(
        [makeForces(1, { N_i: 50000 })],
        [makeStress(1, 80e6)],
      ),
    });
    render(<ResultsDatiSollecitazioni />);
    const row = screen.getByTestId("sollec-row-1");
    const cells = row.querySelectorAll("td");
    expect(cells[1].textContent?.trim()).toBe("n/a"); // M
    expect(cells[2].textContent?.trim()).toBe("n/a"); // V
    expect(cells[3].textContent?.trim()).not.toBe("n/a"); // N valore vero (50 kN)
  });

  it("sort di default: σ desc (elemento con σ max in prima riga)", () => {
    useModelStore.setState({
      model: makeModel([
        { id: 1, type: "beam2d", nodes: [1, 2], material_id: "m1" },
        { id: 2, type: "beam2d", nodes: [2, 3], material_id: "m1" },
      ]),
    });
    useResultsStore.setState({
      staticResults: makeResults(
        [makeForces(1), makeForces(2)],
        [makeStress(1, 50e6), makeStress(2, 178e6)],
      ),
    });
    render(<ResultsDatiSollecitazioni />);
    const rows = document.querySelectorAll("[data-testid^='sollec-row-']");
    expect(rows[0].getAttribute("data-testid")).toBe("sollec-row-2"); // 178 MPa
    expect(rows[1].getAttribute("data-testid")).toBe("sollec-row-1"); // 50 MPa
  });

  it("click su intestazione 'elem': sort per element_id", () => {
    useModelStore.setState({
      model: makeModel([
        { id: 5, type: "beam2d", nodes: [1, 2], material_id: "m1" },
        { id: 1, type: "beam2d", nodes: [2, 3], material_id: "m1" },
      ]),
    });
    useResultsStore.setState({
      staticResults: makeResults(
        [makeForces(5), makeForces(1)],
        [makeStress(5, 50e6), makeStress(1, 178e6)],
      ),
    });
    render(<ResultsDatiSollecitazioni />);
    fireEvent.click(screen.getByTestId("sollec-th-element"));
    const rows = document.querySelectorAll("[data-testid^='sollec-row-']");
    // Default direzione di un nuovo sort è desc → element_id 5 prima di 1
    expect(rows[0].getAttribute("data-testid")).toBe("sollec-row-5");
  });

  it("banner sospetto in cima quando isSuspicious (σ=0 + freccia=0)", () => {
    useModelStore.setState({
      model: makeModel([{ id: 1, type: "beam2d", nodes: [1, 2], material_id: "m1" }]),
    });
    useResultsStore.setState({
      staticResults: makeResults([makeForces(1)], [makeStress(1, 0)], 0, 0),
    });
    render(<ResultsDatiSollecitazioni />);
    expect(screen.getByTestId("results-data-sollec-warn")).toBeInTheDocument();
  });

  it("nessun banner quando hasResults solido (non sospetto)", () => {
    useModelStore.setState({
      model: makeModel([{ id: 1, type: "beam2d", nodes: [1, 2], material_id: "m1" }]),
    });
    useResultsStore.setState({
      staticResults: makeResults([makeForces(1)], [makeStress(1, 100e6)]),
    });
    render(<ResultsDatiSollecitazioni />);
    expect(screen.queryByTestId("results-data-sollec-warn")).toBeNull();
  });

  it("rifinitura 2d FIX A: export CSV click → toast info onesto, NO alert silenzioso", () => {
    // Regressione testing dell'exploratory testing dal vivo: prima il
    // bottone usava window.alert (intrusivo + bloccabile da popup-blocker).
    // Ora deve usare il toast system → feedback visibile, non-bloccante.
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => undefined);
    useModelStore.setState({
      model: makeModel([{ id: 1, type: "beam2d", nodes: [1, 2], material_id: "m1" }]),
    });
    useResultsStore.setState({
      staticResults: makeResults([makeForces(1)], [makeStress(1, 100e6)]),
    });
    render(<ResultsDatiSollecitazioni />);

    expect(useToastStore.getState().toasts.length).toBe(0);
    fireEvent.click(screen.getByTestId("sollec-export-csv"));

    // 1. Mai più window.alert (UX bug pre-fix)
    expect(alertSpy).not.toHaveBeenCalled();
    // 2. Toast info pushato col messaggio onesto richiesto da prompt
    const toasts = useToastStore.getState().toasts;
    expect(toasts.length).toBe(1);
    expect(toasts[0].level).toBe("info");
    expect(toasts[0].message).toContain("Esportazione CSV");
    expect(toasts[0].message).toContain("in arrivo");

    alertSpy.mockRestore();
  });
});
