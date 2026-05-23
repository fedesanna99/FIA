/**
 * ReportExportDialog.test.tsx (v1.9.1 T3).
 * Smoke test sul dialog: render, toggle sezioni, contatore, bottone
 * download disabled senza staticResults.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ReportExportDialog } from "./ReportExportDialog";
import { useModelStore } from "../../store/modelStore";
import { useResultsStore } from "../../store/resultsStore";
import type { FEAModel } from "../../types/model";
import type { StaticResults } from "../../types/results";

// Mock jsPDF — non vogliamo davvero generare un PDF nei test.
vi.mock("../../utils/reportPdf", () => ({
  generateReport: vi.fn(),
}));


const MOCK_MODEL: FEAModel = {
  id: "ex_simple_beam_2d",
  name: "Trave test",
  units: "SI",
  is_3d: false,
  nodes: [],
  elements: [],
  loads: [],
  constraints: [],
};

const MOCK_STATIC: StaticResults = {
  displacements: [],
  reactions: [],
  element_forces: [],
  max_displacement: 0.012,
  max_stress: 89_000_000,
  solve_time_ms: 23,
} as unknown as StaticResults;


beforeEach(() => {
  window.history.replaceState({}, "");
  useModelStore.setState({ model: null } as never);
  useResultsStore.setState({ staticResults: null, modalResults: null } as never);
});


describe("ReportExportDialog", () => {
  it("non renderizza nulla quando open=false", () => {
    render(<ReportExportDialog open={false} onClose={vi.fn()} />);
    expect(screen.queryByTestId("report-export-dialog")).toBeNull();
  });

  it("apre con tutte le sezioni default attive tranne 'conclusions'", () => {
    render(<ReportExportDialog open={true} onClose={vi.fn()} />);
    expect(screen.getByTestId("report-section-cover")).toBeInTheDocument();
    expect(screen.getByTestId("report-section-model")).toBeInTheDocument();
    expect(screen.getByTestId("report-section-results")).toBeInTheDocument();
    expect(screen.getByTestId("report-section-criticality")).toBeInTheDocument();
    expect(screen.getByTestId("report-section-conclusions")).toBeInTheDocument();
    // Counter: 4 attive di default
    expect(screen.getByText(/4 attive/)).toBeInTheDocument();
  });

  it("click su una sezione cambia il counter", () => {
    render(<ReportExportDialog open={true} onClose={vi.fn()} />);
    expect(screen.getByText(/4 attive/)).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("report-section-cover"));  // disattiva
    expect(screen.getByText(/3 attive/)).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("report-section-conclusions"));  // attiva
    expect(screen.getByText(/4 attive/)).toBeInTheDocument();
  });

  it("bottone download disabled senza staticResults (anche con modello)", () => {
    useModelStore.setState({ model: MOCK_MODEL } as never);
    render(<ReportExportDialog open={true} onClose={vi.fn()} />);
    const btn = screen.getByTestId("report-download") as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    // Hint italic visibile
    expect(screen.getByText(/Esegui un'analisi statica/)).toBeInTheDocument();
  });

  it("bottone download disabled senza modello", () => {
    useResultsStore.setState({ staticResults: MOCK_STATIC } as never);
    render(<ReportExportDialog open={true} onClose={vi.fn()} />);
    const btn = screen.getByTestId("report-download") as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it("bottone download abilitato con modello + staticResults", () => {
    useModelStore.setState({ model: MOCK_MODEL } as never);
    useResultsStore.setState({ staticResults: MOCK_STATIC } as never);
    render(<ReportExportDialog open={true} onClose={vi.fn()} />);
    const btn = screen.getByTestId("report-download") as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });

  it("click su Annulla chiama onClose", () => {
    const onClose = vi.fn();
    render(<ReportExportDialog open={true} onClose={onClose} />);
    fireEvent.click(screen.getByTestId("report-cancel"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("nome file output mostra modello.name + .pdf", () => {
    useModelStore.setState({ model: MOCK_MODEL } as never);
    render(<ReportExportDialog open={true} onClose={vi.fn()} />);
    expect(screen.getByText(/Trave test\.pdf/)).toBeInTheDocument();
  });
});
