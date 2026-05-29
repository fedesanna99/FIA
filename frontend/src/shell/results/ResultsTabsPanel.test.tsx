/**
 * ResultsTabsPanel.test.tsx · v3.4 Fetta E2.5c (29/05 sera).
 *
 * REFACTOR completo: era 3-tabs + sub-tabs Radix, ora e' accordion
 * verticale con Sintesi sempre aperta in cima + 4 sezioni collassabili
 * (Spostamenti / Sollecitazioni / Reazioni / Verifica EC3) gestite da
 * `verifyAccordionStore` multi-open.
 *
 * Embed mocks: tengo i mock dei 5 content (ResultsSintesi, le 3 tabelle
 * Dati, ResultsVerifiche) per testare l'orchestrazione accordion senza
 * il tree dei loro contenuti (gia' coperti dai loro test dedicati).
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ResultsTabsPanel } from "./ResultsTabsPanel";
import { useResultsStore } from "../../store/resultsStore";
import { useAnalysisStore } from "../../store/analysisStore";
import { useVerifyAccordionStore } from "../../store/verifyAccordionStore";
import type { StaticResults } from "../../types/results";

// Embed mocks (invariati rispetto a Fetta 2a — content non cambia, solo chrome)
vi.mock("../../components/results/DisplacementTable", () => ({
  DisplacementTable: () => (
    <div data-testid="mock-displacement-table">DisplacementTable</div>
  ),
}));
vi.mock("./ResultsSintesi", () => ({
  ResultsSintesi: ({ onIterate }: { onIterate?: () => void }) => (
    <div data-testid="mock-results-sintesi" data-has-iterate={onIterate ? "true" : "false"}>
      ResultsSintesi
    </div>
  ),
}));
vi.mock("./ResultsDatiSollecitazioni", () => ({
  ResultsDatiSollecitazioni: () => (
    <div data-testid="mock-results-data-sollecitazioni">Sollecitazioni</div>
  ),
}));
vi.mock("./ResultsDatiReazioni", () => ({
  ResultsDatiReazioni: () => (
    <div data-testid="mock-results-data-reazioni">Reazioni</div>
  ),
}));
vi.mock("./ResultsVerifiche", () => ({
  ResultsVerifiche: () => (
    <div data-testid="mock-results-verifiche">Verifiche</div>
  ),
}));

function makeStaticResults(): StaticResults {
  return {
    analysis_type: "static",
    model_id: "x",
    displacements: [],
    reactions: [],
    element_forces: [],
    element_stresses: [],
    max_displacement: 0.00962,
    max_stress: 178e6,
    n_dofs: 12,
    solve_time_ms: 10,
  };
}

describe("ResultsTabsPanel · v3.4 Fetta E2.5c (accordion verticale)", () => {
  beforeEach(() => {
    useResultsStore.setState({
      staticResults: null,
      modalResults: null,
      dynamicResults: null,
    });
    useAnalysisStore.setState({ analysisType: "static", isRunning: false });
    // v3.4 Fetta E2.5c: reset accordion (default tutte chiuse).
    useVerifyAccordionStore.setState({ openSections: [] });
    try { window.localStorage.removeItem("feapro-verify-accordion"); } catch { /* ignore */ }
  });

  // ── Header invariato ────────────────────────────────────────────────────
  it("renderizza header con titolo 'Verifica' (v3.4 Fetta E2.5b label)", () => {
    render(<ResultsTabsPanel />);
    expect(screen.getByText("Verifica")).toBeInTheDocument();
  });

  it("sottotitolo: 'Statica lineare · completata' con results, 'Nessun calcolo' senza", () => {
    const { rerender } = render(<ResultsTabsPanel />);
    expect(screen.getByText(/nessun calcolo/i)).toBeInTheDocument();
    useResultsStore.setState({ staticResults: makeStaticResults() });
    rerender(<ResultsTabsPanel />);
    expect(screen.getByText(/statica lineare · completata/i)).toBeInTheDocument();
  });

  it("sottotitolo: 'Calcolo in corso…' quando isRunning=true", () => {
    useAnalysisStore.setState({ isRunning: true });
    render(<ResultsTabsPanel />);
    expect(screen.getByText(/calcolo in corso/i)).toBeInTheDocument();
  });

  // ── Sintesi sempre aperta (junior tile fondamentali) ────────────────────
  it("Sintesi sempre aperta in cima (senza click): ResultsSintesi montato", () => {
    render(<ResultsTabsPanel />);
    expect(screen.getByTestId("results-section-sintesi")).toBeInTheDocument();
    expect(screen.getByTestId("mock-results-sintesi")).toBeInTheDocument();
  });

  it("Sintesi: onIterate propagato a ResultsSintesi", () => {
    const onIterate = vi.fn();
    render(<ResultsTabsPanel onIterate={onIterate} />);
    expect(screen.getByTestId("mock-results-sintesi").getAttribute("data-has-iterate")).toBe("true");
  });

  it("Sintesi: senza onIterate prop, ResultsSintesi NON riceve callback", () => {
    render(<ResultsTabsPanel />);
    expect(screen.getByTestId("mock-results-sintesi").getAttribute("data-has-iterate")).toBe("false");
  });

  // ── 4 sezioni accordion: rendering header + default chiuso ──────────────
  it("renderizza le 4 sezioni accordion (Spostamenti/Sollecitazioni/Reazioni/Verifica EC3)", () => {
    render(<ResultsTabsPanel />);
    expect(screen.getByTestId("results-section-displacements")).toBeInTheDocument();
    expect(screen.getByTestId("results-section-forces")).toBeInTheDocument();
    expect(screen.getByTestId("results-section-reactions")).toBeInTheDocument();
    expect(screen.getByTestId("results-section-ec3")).toBeInTheDocument();
  });

  it("default: tutte le 4 sezioni collassabili sono chiuse (body non renderizzato)", () => {
    render(<ResultsTabsPanel />);
    expect(screen.queryByTestId("results-section-displacements-body")).toBeNull();
    expect(screen.queryByTestId("results-section-forces-body")).toBeNull();
    expect(screen.queryByTestId("results-section-reactions-body")).toBeNull();
    expect(screen.queryByTestId("results-section-ec3-body")).toBeNull();
    // I 4 content non sono montati (no DOM cost)
    expect(screen.queryByTestId("mock-displacement-table")).toBeNull();
    expect(screen.queryByTestId("mock-results-data-sollecitazioni")).toBeNull();
    expect(screen.queryByTestId("mock-results-data-reazioni")).toBeNull();
    expect(screen.queryByTestId("mock-results-verifiche")).toBeNull();
  });

  // ── Toggle accordion ────────────────────────────────────────────────────
  it("click su Spostamenti head: apre la sezione (body visibile + content montato)", () => {
    useResultsStore.setState({ staticResults: makeStaticResults() });
    render(<ResultsTabsPanel />);
    fireEvent.click(screen.getByTestId("results-section-displacements-head"));
    expect(screen.getByTestId("results-section-displacements-body")).toBeInTheDocument();
    expect(screen.getByTestId("mock-displacement-table")).toBeInTheDocument();
  });

  it("click di nuovo su Spostamenti head: chiude (body smontato)", () => {
    useResultsStore.setState({ staticResults: makeStaticResults() });
    render(<ResultsTabsPanel />);
    const head = screen.getByTestId("results-section-displacements-head");
    fireEvent.click(head);
    expect(screen.getByTestId("results-section-displacements-body")).toBeInTheDocument();
    fireEvent.click(head);
    expect(screen.queryByTestId("results-section-displacements-body")).toBeNull();
  });

  it("Spostamenti senza staticResults: placeholder onesto al posto della tabella", () => {
    useResultsStore.setState({ staticResults: null });
    render(<ResultsTabsPanel />);
    fireEvent.click(screen.getByTestId("results-section-displacements-head"));
    expect(screen.queryByTestId("mock-displacement-table")).toBeNull();
    expect(screen.getByTestId("results-placeholder")).toBeInTheDocument();
  });

  it("Sollecitazioni: click apre + monta ResultsDatiSollecitazioni", () => {
    render(<ResultsTabsPanel />);
    fireEvent.click(screen.getByTestId("results-section-forces-head"));
    expect(screen.getByTestId("mock-results-data-sollecitazioni")).toBeInTheDocument();
  });

  it("Reazioni: click apre + monta ResultsDatiReazioni", () => {
    render(<ResultsTabsPanel />);
    fireEvent.click(screen.getByTestId("results-section-reactions-head"));
    expect(screen.getByTestId("mock-results-data-reazioni")).toBeInTheDocument();
  });

  it("Verifica EC3: click apre + monta ResultsVerifiche", () => {
    render(<ResultsTabsPanel />);
    fireEvent.click(screen.getByTestId("results-section-ec3-head"));
    expect(screen.getByTestId("mock-results-verifiche")).toBeInTheDocument();
  });

  // ── Multi-open (caratteristica chiave dell'accordion) ───────────────────
  it("multi-open: posso aprire piu' sezioni contemporaneamente", () => {
    useResultsStore.setState({ staticResults: makeStaticResults() });
    render(<ResultsTabsPanel />);
    fireEvent.click(screen.getByTestId("results-section-displacements-head"));
    fireEvent.click(screen.getByTestId("results-section-reactions-head"));
    fireEvent.click(screen.getByTestId("results-section-ec3-head"));
    // Tutte e 3 visibili contemporaneamente
    expect(screen.getByTestId("mock-displacement-table")).toBeInTheDocument();
    expect(screen.getByTestId("mock-results-data-reazioni")).toBeInTheDocument();
    expect(screen.getByTestId("mock-results-verifiche")).toBeInTheDocument();
  });

  it("toggle di una sezione non chiude le altre (multi-open preservato)", () => {
    render(<ResultsTabsPanel />);
    fireEvent.click(screen.getByTestId("results-section-forces-head"));
    fireEvent.click(screen.getByTestId("results-section-ec3-head"));
    // Chiudo solo forces
    fireEvent.click(screen.getByTestId("results-section-forces-head"));
    expect(screen.queryByTestId("mock-results-data-sollecitazioni")).toBeNull();
    expect(screen.getByTestId("mock-results-verifiche")).toBeInTheDocument();
  });

  // ── A11y: aria-expanded ─────────────────────────────────────────────────
  it("aria-expanded riflette stato open/closed sulla header button", () => {
    render(<ResultsTabsPanel />);
    const head = screen.getByTestId("results-section-displacements-head");
    expect(head.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(head);
    expect(head.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(head);
    expect(head.getAttribute("aria-expanded")).toBe("false");
  });

  // ── Persistenza store (refresh-proof) ──────────────────────────────────
  it("stato accordion persistito via verifyAccordionStore", () => {
    render(<ResultsTabsPanel />);
    fireEvent.click(screen.getByTestId("results-section-reactions-head"));
    expect(useVerifyAccordionStore.getState().openSections).toContain("reactions");
  });
});
