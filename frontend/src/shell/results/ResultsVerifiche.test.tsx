/**
 * ResultsVerifiche.test.tsx · FETTA 2b · FAM D.
 *
 * Verifica:
 *  - testata EC3 con UR vero (pass/fail) su beam
 *  - "n/a" su geometria non normata (cubo solido)
 *  - sospetto in cima + UR "—" warn
 *  - empty (nessun calcolo) → header empty + UR "—"
 *  - formula in chiaro presente solo quando applicabile e non sospetto
 *  - "altre verifiche" Taglio/Freccia/LTB con badge corretti
 *  - LTB sempre "estimate"
 *  - messaggio n/a fallback rimanda a tab Dati
 */
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ResultsVerifiche } from "./ResultsVerifiche";
import { useModelStore } from "../../store/modelStore";
import { useResultsStore } from "../../store/resultsStore";
import type { StaticResults } from "../../types/results";
import type { FEAModel, Element } from "../../types/model";

function makeResults(partial: Partial<StaticResults> = {}): StaticResults {
  return {
    analysis_type: "static", model_id: "x",
    displacements: [], reactions: [],
    element_forces: [], element_stresses: [],
    max_displacement: 0.00962,
    max_stress: 178e6,
    n_dofs: 12, solve_time_ms: 10,
    ...partial,
  };
}
function makeBeam(id = 1): Element {
  return { id, type: "beam2d", nodes: [1, 2], material_id: "m1" };
}
function makeSolid(id = 1): Element {
  return { id, type: "solid_h8", nodes: [1, 2, 3, 4, 5, 6, 7, 8], material_id: "m1" };
}
function makeModel(elements: Element[]): FEAModel {
  return {
    id: "t", name: "t", units: "SI", is_3d: false,
    nodes: [], elements, loads: [], constraints: [],
  };
}

describe("ResultsVerifiche · FAM D", () => {
  beforeEach(() => {
    useModelStore.setState({ model: null });
    useResultsStore.setState({ staticResults: null, modalResults: null, dynamicResults: null });
  });

  // ── Empty (nessun calcolo) ─────────────────────────────────────────────
  it("nessun calcolo: header empty con UR '—', nessuna formula, nessuna altra riga", () => {
    render(<ResultsVerifiche />);
    const head = screen.getByTestId("verifiche-header");
    expect(head.getAttribute("data-tone")).toBe("empty");
    expect(screen.getByTestId("verifiche-header-ur").textContent).toContain("—");
    expect(screen.queryByTestId("verifiche-formula")).toBeNull();
    expect(screen.queryByTestId("verifiche-others")).toBeNull();
  });

  // ── Sospetto vince ──────────────────────────────────────────────────────
  it("sospetto: banner ambra + header 'Calcolo sospetto' + UR '—' warn", () => {
    useModelStore.setState({ model: makeModel([makeBeam()]) });
    useResultsStore.setState({
      staticResults: makeResults({ max_stress: 0, max_displacement: 0 }),
    });
    render(<ResultsVerifiche />);
    expect(screen.getByTestId("verifiche-warn")).toBeInTheDocument();
    const head = screen.getByTestId("verifiche-header");
    expect(head.getAttribute("data-tone")).toBe("warn");
    expect(head.textContent).toContain("Calcolo sospetto");
    expect(screen.getByTestId("verifiche-header-ur").textContent).toContain("—");
    // Nessuna formula in chiaro su calcolo sospetto
    expect(screen.queryByTestId("verifiche-formula")).toBeNull();
  });

  // ── n/a su geometria non normata ───────────────────────────────────────
  it("solidi only + results: header 'EC3 · non applicabile' + UR 'n/a' + fallback box rimanda a Dati", () => {
    useModelStore.setState({ model: makeModel([makeSolid()]) });
    useResultsStore.setState({ staticResults: makeResults() });
    render(<ResultsVerifiche />);
    const head = screen.getByTestId("verifiche-header");
    expect(head.getAttribute("data-tone")).toBe("na");
    expect(head.textContent).toContain("non applicabile");
    expect(screen.getByTestId("verifiche-header-ur").textContent).toContain("n/a");
    // Niente formula in chiaro né altre verifiche su n/a
    expect(screen.queryByTestId("verifiche-formula")).toBeNull();
    expect(screen.queryByTestId("verifiche-others")).toBeNull();
    // Fallback box presente
    const na = screen.getByTestId("verifiche-na");
    expect(na.textContent).toContain("EC3 non applicabile");
    expect(na.textContent).toContain("Dati");
  });

  // ── Pass: beam con UR < 1 ──────────────────────────────────────────────
  it("beam + UR=0.76: header pass, UR='0.76', formula presente con σ/f_yd/γM0", () => {
    useModelStore.setState({ model: makeModel([makeBeam()]) });
    useResultsStore.setState({ staticResults: makeResults({ max_stress: 178e6 }) });
    render(<ResultsVerifiche />);
    const head = screen.getByTestId("verifiche-header");
    expect(head.getAttribute("data-tone")).toBe("pass");
    expect(head.textContent).toContain("Passa");
    expect(screen.getByTestId("verifiche-header-ur").textContent).toBe("UR 0.76");

    // Formula in chiaro
    const formula = screen.getByTestId("verifiche-formula");
    expect(formula).toBeInTheDocument();
    expect(formula.textContent).toContain("σ_max");
    expect(formula.textContent).toContain("178");
    expect(formula.textContent).toContain("f_yd");
    expect(formula.textContent).toContain("235");
    expect(formula.textContent).toContain("γM0");
    expect(formula.textContent).toContain("1.00");
    expect(formula.textContent).toContain("UR = σ_max / f_yd");
    expect(formula.textContent).toContain("0.76");
    expect(formula.textContent).toContain("✓");

    // Nota onesta: la verifica e' semplificata
    expect(formula.textContent).toContain("semplificata");
  });

  // ── Fail: beam con UR > 1 ──────────────────────────────────────────────
  it("beam + UR=1.28: header fail, formula con ✗", () => {
    useModelStore.setState({ model: makeModel([makeBeam()]) });
    useResultsStore.setState({ staticResults: makeResults({ max_stress: 300e6 }) });
    render(<ResultsVerifiche />);
    const head = screen.getByTestId("verifiche-header");
    expect(head.getAttribute("data-tone")).toBe("fail");
    expect(head.textContent).toContain("Non passa");
    const formula = screen.getByTestId("verifiche-formula");
    expect(formula.textContent).toMatch(/1[.,]28/);
    expect(formula.textContent).toContain("✗");
  });

  // ── Altre verifiche ────────────────────────────────────────────────────
  it("altre verifiche presenti solo quando ec3Applicable + hasResults + !sospetto", () => {
    useModelStore.setState({ model: makeModel([makeBeam()]) });
    useResultsStore.setState({ staticResults: makeResults() });
    render(<ResultsVerifiche />);
    expect(screen.getByTestId("verifiche-others")).toBeInTheDocument();
    expect(screen.getByTestId("verifiche-row-taglio")).toBeInTheDocument();
    expect(screen.getByTestId("verifiche-row-freccia")).toBeInTheDocument();
    expect(screen.getByTestId("verifiche-row-ltb")).toBeInTheDocument();
  });

  it("Taglio e Freccia: badge 'in arrivo' (empty tone), niente UR finto", () => {
    useModelStore.setState({ model: makeModel([makeBeam()]) });
    useResultsStore.setState({ staticResults: makeResults() });
    render(<ResultsVerifiche />);
    const taglio = screen.getByTestId("verifiche-row-taglio");
    const freccia = screen.getByTestId("verifiche-row-freccia");
    expect(taglio.textContent).toContain("UR —");
    expect(freccia.textContent).toContain("UR —");
    expect(screen.getByTestId("verifiche-row-taglio-badge").textContent).toContain("in arrivo");
    expect(screen.getByTestId("verifiche-row-freccia-badge").textContent).toContain("in arrivo");
    expect(taglio.getAttribute("data-tone")).toBe("empty");
    expect(freccia.getAttribute("data-tone")).toBe("empty");
  });

  it("LTB: badge 'stima' (estimate tone) — sempre, anche con UR ancora '—'", () => {
    useModelStore.setState({ model: makeModel([makeBeam()]) });
    useResultsStore.setState({ staticResults: makeResults() });
    render(<ResultsVerifiche />);
    const ltb = screen.getByTestId("verifiche-row-ltb");
    expect(ltb.getAttribute("data-tone")).toBe("estimate");
    expect(screen.getByTestId("verifiche-row-ltb-badge").textContent).toContain("stima");
  });

  it("modello vuoto + sospetto: nessuna 'altre verifiche'", () => {
    useModelStore.setState({ model: makeModel([makeBeam()]) });
    useResultsStore.setState({ staticResults: makeResults({ max_stress: 0, max_displacement: 0 }) });
    render(<ResultsVerifiche />);
    expect(screen.queryByTestId("verifiche-others")).toBeNull();
  });

  it("solidi only: nessuna 'altre verifiche' (n/a path)", () => {
    useModelStore.setState({ model: makeModel([makeSolid()]) });
    useResultsStore.setState({ staticResults: makeResults() });
    render(<ResultsVerifiche />);
    expect(screen.queryByTestId("verifiche-others")).toBeNull();
  });
});
