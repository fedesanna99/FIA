/**
 * quickExport.test (v2.5.3 T4 fix bug #2).
 *
 * Regression guard sui due path UI quick-export che l'audit v2.3.2 segnalava
 * morti:
 *
 *   - PDF: ora mostra toast success dopo `generateReport` (prima silente).
 *   - XLSX: ora chiama `exportModelToXlsx` (audit-fix B6 v2.2.1) invece di
 *     `exportDisplacementsCSV` + `exportModesCSV` (CSV piatti, codice
 *     obsoleto pre-fix).
 *
 * Test diretti sul modulo `quickExport.ts` (estratto da CommandPalette per
 * testabilità — opzione 1 del brief).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { quickExport } from "./quickExport";
import type { FEAModel } from "../types/model";

vi.mock("../utils/reportPdf", () => ({
  generateReport: vi.fn(),
}));

vi.mock("../utils/exportXlsx", () => ({
  exportModelToXlsx: vi.fn(() => true),
}));

vi.mock("../utils/export", () => ({
  exportModelJson: vi.fn(),
  exportResultsJson: vi.fn(),
  exportDisplacementsCSV: vi.fn(),
  exportModesCSV: vi.fn(),
}));

function makeModel(): FEAModel {
  return {
    id: "m1",
    name: "Test model",
    units: "SI",
    is_3d: false,
    nodes: [],
    elements: [],
    loads: [],
    constraints: [],
  };
}

const emptyResults = { staticResults: null, modalResults: null };

const makeDeps = () => ({
  toast: vi.fn(),
  getViewportPng: vi.fn<() => string | undefined>(() => undefined),
});

describe("quickExport · PDF (v2.5.3 fix bug #2 Path C PDF)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("PDF chiama generateReport e mostra toast success", async () => {
    const { generateReport } = await import("../utils/reportPdf");
    const deps = makeDeps();

    await quickExport({ format: "pdf" }, makeModel(), emptyResults, deps);

    expect(generateReport).toHaveBeenCalledTimes(1);
    expect(generateReport).toHaveBeenCalledWith(
      expect.objectContaining({ model: expect.objectContaining({ id: "m1" }) }),
    );
    expect(deps.toast).toHaveBeenCalledWith("success", expect.stringMatching(/pdf/i));
  });

  it("PDF passa il viewportPng se disponibile", async () => {
    const { generateReport } = await import("../utils/reportPdf");
    const deps = makeDeps();
    deps.getViewportPng = vi.fn(() => "data:image/png;base64,xxx");

    await quickExport({ format: "pdf" }, makeModel(), emptyResults, deps);

    expect(generateReport).toHaveBeenCalledWith(
      expect.objectContaining({ viewportPng: "data:image/png;base64,xxx" }),
    );
  });
});

describe("quickExport · XLSX (v2.5.3 fix bug #2 Path C XLSX sub-bug)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("XLSX usa exportModelToXlsx (NON CSV piatti)", async () => {
    const { exportModelToXlsx } = await import("../utils/exportXlsx");
    const { exportDisplacementsCSV, exportModesCSV } = await import("../utils/export");
    const deps = makeDeps();

    await quickExport({ format: "xlsx" }, makeModel(), emptyResults, deps);

    expect(exportModelToXlsx).toHaveBeenCalledTimes(1);
    // Regression guard: il pre-fix v2.5.3 chiamava queste due funzioni
    expect(exportDisplacementsCSV).not.toHaveBeenCalled();
    expect(exportModesCSV).not.toHaveBeenCalled();
    expect(deps.toast).toHaveBeenCalledWith("success", expect.stringMatching(/xlsx/i));
  });

  it("XLSX mostra toast error se exportModelToXlsx ritorna false", async () => {
    const { exportModelToXlsx } = await import("../utils/exportXlsx");
    (exportModelToXlsx as ReturnType<typeof vi.fn>).mockReturnValueOnce(false);
    const deps = makeDeps();

    await quickExport({ format: "xlsx" }, makeModel(), emptyResults, deps);

    expect(deps.toast).toHaveBeenCalledWith("error", expect.stringMatching(/xlsx/i));
  });
});

describe("quickExport · fallback + altri formati (regression non-target)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("format sconosciuto produce toast info", async () => {
    const deps = makeDeps();
    await quickExport({ format: "unknown_kind" }, makeModel(), emptyResults, deps);
    expect(deps.toast).toHaveBeenCalledWith("info", expect.stringContaining("unknown_kind"));
  });

  it("csv-nodes senza staticResults produce toast error", async () => {
    const deps = makeDeps();
    await quickExport({ format: "csv-nodes" }, makeModel(), emptyResults, deps);
    expect(deps.toast).toHaveBeenCalledWith("error", expect.stringMatching(/statica/i));
  });
});
