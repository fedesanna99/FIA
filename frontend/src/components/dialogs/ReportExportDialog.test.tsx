/**
 * ReportExportDialog.test.tsx (v1.9.1 T3 · v2.6.4 A.1 preview+watermark).
 *
 * Smoke test sul dialog: render, toggle sezioni (con staticRes), contatore,
 * bottone download disabled senza staticResults. v2.6.4: il dialog ora ospita
 * una `<ReportPreview>` quando i risultati sono disponibili; la checklist
 * sezioni vive nella sidebar laterale del layout grid 1fr/240px.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ReportExportDialog } from "./ReportExportDialog";
import { useModelStore } from "../../store/modelStore";
import { useResultsStore } from "../../store/resultsStore";
import type { FEAModel } from "../../types/model";
import type { StaticResults } from "../../types/results";

// v2.6.4 A.1: mock generateReport (save) + generateReportBlob (preview).
// Per generateReportBlob ritorniamo un Blob vuoto fake, ReportPreview userà
// URL.createObjectURL su jsdom ma è no-op safe (jsdom espone l'API stub).
vi.mock("../../utils/reportPdf", () => ({
  generateReport: vi.fn(),
  generateReportBlob: vi.fn(() => new Blob([new Uint8Array(0)], { type: "application/pdf" })),
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


describe("ReportExportDialog (v2.6.4 preview+watermark)", () => {
  it("non renderizza nulla quando open=false", () => {
    render(<ReportExportDialog open={false} onClose={vi.fn()} />);
    expect(screen.queryByTestId("report-export-dialog")).toBeNull();
  });

  it("senza staticResults: mostra warning ma NON la preview/checklist", () => {
    render(<ReportExportDialog open={true} onClose={vi.fn()} />);
    expect(screen.getByTestId("report-export-dialog")).toBeInTheDocument();
    expect(screen.getByText(/Esegui un'analisi statica/)).toBeInTheDocument();
    // Checklist NON renderizzata senza staticRes
    expect(screen.queryByTestId("report-section-cover")).toBeNull();
    // Preview NON renderizzata
    expect(screen.queryByTestId("report-preview")).toBeNull();
    expect(screen.queryByTestId("report-preview-loading")).toBeNull();
  });

  it("con staticResults: renderizza preview + checklist sidebar (4 attive default)", () => {
    useModelStore.setState({ model: MOCK_MODEL } as never);
    useResultsStore.setState({ staticResults: MOCK_STATIC } as never);
    render(<ReportExportDialog open={true} onClose={vi.fn()} />);
    // Checklist sezioni
    expect(screen.getByTestId("report-section-cover")).toBeInTheDocument();
    expect(screen.getByTestId("report-section-model")).toBeInTheDocument();
    expect(screen.getByTestId("report-section-results")).toBeInTheDocument();
    expect(screen.getByTestId("report-section-criticality")).toBeInTheDocument();
    expect(screen.getByTestId("report-section-conclusions")).toBeInTheDocument();
    // Counter: 4 attive di default (conclusions OFF)
    expect(screen.getByText(/4 attive/)).toBeInTheDocument();
    // Preview placeholder (loading o pronta) — ReportPreview wrapper presente
    const preview = screen.queryByTestId("report-preview") ?? screen.queryByTestId("report-preview-loading");
    expect(preview).not.toBeNull();
  });

  it("click su una sezione cambia il counter", () => {
    useModelStore.setState({ model: MOCK_MODEL } as never);
    useResultsStore.setState({ staticResults: MOCK_STATIC } as never);
    render(<ReportExportDialog open={true} onClose={vi.fn()} />);
    expect(screen.getByText(/4 attive/)).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("report-section-cover")); // disattiva
    expect(screen.getByText(/3 attive/)).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("report-section-conclusions")); // attiva
    expect(screen.getByText(/4 attive/)).toBeInTheDocument();
  });

  it("bottone download disabled senza staticResults (anche con modello)", () => {
    useModelStore.setState({ model: MOCK_MODEL } as never);
    render(<ReportExportDialog open={true} onClose={vi.fn()} />);
    const btn = screen.getByTestId("report-download") as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
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

  it("v2.6.4 A.1: banner TrustLayerBadge presente (variant=banner draft)", () => {
    useModelStore.setState({ model: MOCK_MODEL } as never);
    useResultsStore.setState({ staticResults: MOCK_STATIC } as never);
    render(<ReportExportDialog open={true} onClose={vi.fn()} />);
    // TrustLayerBadge variant=banner senza qualifiedBy → draft testid
    expect(screen.getByTestId("trust-banner-draft")).toBeInTheDocument();
  });
});
