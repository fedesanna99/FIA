/**
 * ResultsTabsPanel.test.tsx · redesign/workspace-fasi (FETTA 2a).
 *
 * Verifica il guscio Risultati: 3 schede + sotto-linguette in Dati.
 * Embed di InspectPanel/VerifyPanel/DisplacementTable: mock per non
 * tirar dentro il loro tree (gia' coperti dai propri test esistenti).
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ResultsTabsPanel } from "./ResultsTabsPanel";
import { useResultsStore } from "../../store/resultsStore";
import { useAnalysisStore } from "../../store/analysisStore";
import type { StaticResults } from "../../types/results";

// Embed mocks
vi.mock("../panels/VerifyPanel", () => ({
  VerifyPanel: () => <div data-testid="mock-verify-panel">VerifyPanel</div>,
}));
vi.mock("../../components/results/DisplacementTable", () => ({
  DisplacementTable: () => (
    <div data-testid="mock-displacement-table">DisplacementTable</div>
  ),
}));
// FETTA 2b · FAM B: la Sintesi ora e' ResultsSintesi (non piu' InspectPanel
// embed). Mock per testare l'orchestrazione dei tab senza il tree completo.
vi.mock("./ResultsSintesi", () => ({
  ResultsSintesi: ({ onIterate }: { onIterate?: () => void }) => (
    <div data-testid="mock-results-sintesi" data-has-iterate={onIterate ? "true" : "false"}>
      ResultsSintesi
    </div>
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

describe("ResultsTabsPanel · FETTA 2a", () => {
  beforeEach(() => {
    useResultsStore.setState({
      staticResults: null,
      modalResults: null,
      dynamicResults: null,
    });
    useAnalysisStore.setState({ analysisType: "static", isRunning: false });
  });

  it("renderizza header + 3 tab Sintesi/Dati/Verifiche", () => {
    render(<ResultsTabsPanel />);
    expect(screen.getByTestId("results-tab-sintesi")).toBeInTheDocument();
    expect(screen.getByTestId("results-tab-dati")).toBeInTheDocument();
    expect(screen.getByTestId("results-tab-verifiche")).toBeInTheDocument();
    expect(screen.getByText("Risultati")).toBeInTheDocument();
  });

  it("default Sintesi: monta ResultsSintesi (FAM B, niente piu' InspectPanel)", () => {
    render(<ResultsTabsPanel />);
    expect(screen.getByTestId("mock-results-sintesi")).toBeInTheDocument();
  });

  it("FAM B: onIterate viene propagato a ResultsSintesi", () => {
    const onIterate = vi.fn();
    render(<ResultsTabsPanel onIterate={onIterate} />);
    expect(screen.getByTestId("mock-results-sintesi").getAttribute("data-has-iterate")).toBe("true");
  });

  it("FAM B: senza onIterate prop ResultsSintesi NON riceve callback", () => {
    render(<ResultsTabsPanel />);
    expect(screen.getByTestId("mock-results-sintesi").getAttribute("data-has-iterate")).toBe("false");
  });

  it("click su tab Dati: mostra le 3 sotto-linguette", () => {
    render(<ResultsTabsPanel />);
    fireEvent.click(screen.getByTestId("results-tab-dati"));
    expect(screen.getByTestId("results-subtab-spostamenti")).toBeInTheDocument();
    expect(screen.getByTestId("results-subtab-sollecitazioni")).toBeInTheDocument();
    expect(screen.getByTestId("results-subtab-reazioni")).toBeInTheDocument();
  });

  it("Dati > Spostamenti senza staticResults: placeholder onesto (no DisplacementTable)", () => {
    useResultsStore.setState({ staticResults: null });
    render(<ResultsTabsPanel />);
    fireEvent.click(screen.getByTestId("results-tab-dati"));
    // Spostamenti e' il default subtab
    expect(screen.queryByTestId("mock-displacement-table")).toBeNull();
    expect(screen.getByTestId("results-placeholder")).toBeInTheDocument();
  });

  it("Dati > Spostamenti CON staticResults: monta DisplacementTable embedded", () => {
    useResultsStore.setState({ staticResults: makeStaticResults() });
    render(<ResultsTabsPanel />);
    fireEvent.click(screen.getByTestId("results-tab-dati"));
    expect(screen.getByTestId("mock-displacement-table")).toBeInTheDocument();
  });

  it("Dati > Sollecitazioni: placeholder 'in arrivo step 2b' (no dati finti)", () => {
    useResultsStore.setState({ staticResults: makeStaticResults() });
    render(<ResultsTabsPanel />);
    fireEvent.click(screen.getByTestId("results-tab-dati"));
    fireEvent.click(screen.getByTestId("results-subtab-sollecitazioni"));
    expect(screen.getByTestId("results-placeholder")).toBeInTheDocument();
    expect(screen.queryByTestId("mock-displacement-table")).toBeNull();
  });

  it("Dati > Reazioni: placeholder 'in arrivo step 2b'", () => {
    render(<ResultsTabsPanel />);
    fireEvent.click(screen.getByTestId("results-tab-dati"));
    fireEvent.click(screen.getByTestId("results-subtab-reazioni"));
    expect(screen.getByTestId("results-placeholder")).toBeInTheDocument();
  });

  it("click su tab Verifiche: embed VerifyPanel visibile", () => {
    render(<ResultsTabsPanel />);
    fireEvent.click(screen.getByTestId("results-tab-verifiche"));
    expect(screen.getByTestId("mock-verify-panel")).toBeInTheDocument();
  });

  it("subtab attivo ha aria-selected=true e is-active class", () => {
    render(<ResultsTabsPanel />);
    fireEvent.click(screen.getByTestId("results-tab-dati"));
    const spostamenti = screen.getByTestId("results-subtab-spostamenti");
    expect(spostamenti.getAttribute("aria-selected")).toBe("true");
    expect(spostamenti.className).toContain("is-active");

    fireEvent.click(screen.getByTestId("results-subtab-reazioni"));
    expect(screen.getByTestId("results-subtab-reazioni").getAttribute("aria-selected")).toBe("true");
    expect(spostamenti.getAttribute("aria-selected")).toBe("false");
  });

  it("sottotitolo: 'Statica lineare · completata' quando ha results, altrimenti 'Nessun calcolo'", () => {
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
});
