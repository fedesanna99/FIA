/**
 * ReportPreview.test.tsx (v2.6.4 A.1).
 *
 * Test sul wrapper iframe + watermark overlay. Verifica:
 *   - Loading state finché generatePdfBlob non risolve
 *   - Watermark renderizzato quando preliminary=true
 *   - Watermark assente quando preliminary=false
 *   - URL.revokeObjectURL chiamato on unmount (cleanup memoria)
 *   - Error state se generatePdfBlob throws
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ReportPreview } from "./ReportPreview";

beforeEach(() => {
  // jsdom espone URL.createObjectURL come stub. Spy per verificare cleanup.
  vi.spyOn(URL, "createObjectURL").mockImplementation(() => "blob:fake-url-" + Math.random());
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

const makeBlob = () => new Blob([new Uint8Array(4)], { type: "application/pdf" });

describe("ReportPreview", () => {
  it("renders loading state initially", () => {
    const generate = vi.fn(() => new Promise<Blob>(() => {})); // never resolves
    render(<ReportPreview generatePdfBlob={generate} preliminary={false} />);
    expect(screen.getByTestId("report-preview-loading")).toBeInTheDocument();
    expect(screen.getByText(/Generazione anteprima/)).toBeInTheDocument();
  });

  it("renders iframe + watermark when preliminary=true", async () => {
    const generate = vi.fn(() => makeBlob());
    render(<ReportPreview generatePdfBlob={generate} preliminary={true} />);
    await waitFor(() => {
      expect(screen.getByTestId("report-preview")).toBeInTheDocument();
    });
    // Watermark presente (TrustLayerBadge variant=watermark testid)
    expect(screen.getByTestId("trust-watermark")).toBeInTheDocument();
    // Iframe presente
    const iframe = screen.getByTitle("Anteprima report PDF");
    expect(iframe.tagName.toLowerCase()).toBe("iframe");
  });

  it("renders iframe WITHOUT watermark when preliminary=false", async () => {
    const generate = vi.fn(() => makeBlob());
    render(<ReportPreview generatePdfBlob={generate} preliminary={false} />);
    await waitFor(() => {
      expect(screen.getByTestId("report-preview")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("trust-watermark")).toBeNull();
  });

  // NB: `URL.createObjectURL was called` è coperto implicitamente dagli
  // altri test che renderizzano effettivamente l'iframe (la chiamata avviene
  // prima del React commit). Lo skip esplicito qui evita un test isolato
  // che innesca SecurityError jsdom su localStorage opaque-origin per iframe
  // blob: URL.

  it("calls URL.revokeObjectURL on unmount (memory cleanup)", async () => {
    const generate = vi.fn(() => makeBlob());
    const { unmount } = render(<ReportPreview generatePdfBlob={generate} preliminary={true} />);
    await waitFor(() => {
      expect(URL.createObjectURL).toHaveBeenCalled();
    });
    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });

  it("renders error state when generatePdfBlob throws", async () => {
    const generate = vi.fn(() => {
      throw new Error("PDF generation failed");
    });
    render(<ReportPreview generatePdfBlob={generate} preliminary={false} />);
    await waitFor(() => {
      expect(screen.getByTestId("report-preview-error")).toBeInTheDocument();
    });
    expect(screen.getByText(/PDF generation failed/)).toBeInTheDocument();
  });
});
