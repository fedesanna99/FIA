/**
 * ReportPreview (v2.6.4 A.1) — anteprima iframe del PDF con watermark overlay.
 *
 * Architettura 3-layer (vedi c7-trust-layer-pdf-integration.md §1):
 *   z-0: <iframe src={blobUrl}> — PDF renderizzato dal browser
 *   z-5: <TrustLayerBadge variant="watermark"> — overlay diagonale
 *        `pointer-events: none` (CRITICO per non bloccare scroll iframe)
 *   z-10: chrome del dialog (banner header, footer buttons)
 *
 * Lifecycle:
 *   1. Mount → `generatePdfBlob()` (async) → set blobUrl con URL.createObjectURL
 *   2. Unmount o blob change → URL.revokeObjectURL per liberare memoria
 *
 * NB watermark è UI signal (avviso di stato), NON marker legale: il PDF
 * scaricato è pulito (vedi `generateReport` in reportPdf.ts).
 */
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { TrustLayerBadge } from "../shell/TrustLayerBadge";

interface Props {
  /**
   * Funzione che genera il blob PDF (sincrona o asincrona). Tipicamente
   * `() => generateReportBlob({ model, staticResults, ... })`.
   */
  generatePdfBlob: () => Blob | Promise<Blob>;
  /**
   * Quando true, sovrappone il watermark "PRELIMINARY" diagonale. Tipicamente
   * `true` finché l'analisi non è validata (modello senza `qualifiedBy`).
   */
  preliminary: boolean;
  /** className opzionale propagata al container outer. */
  className?: string;
}

export function ReportPreview({ generatePdfBlob, preliminary, className }: Props) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let revokeUrl: string | null = null;
    let cancelled = false;

    Promise.resolve()
      .then(() => generatePdfBlob())
      .then((blob) => {
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        revokeUrl = url;
        setBlobUrl(url);
        setError(null);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Errore generazione preview");
      });

    return () => {
      cancelled = true;
      if (revokeUrl) URL.revokeObjectURL(revokeUrl);
    };
  }, [generatePdfBlob]);

  if (error) {
    return (
      <div
        className={`report-preview report-preview--error ${className ?? ""}`}
        data-testid="report-preview-error"
      >
        <div className="font-mono text-[11px] text-danger px-4 py-6">
          Errore: {error}
        </div>
      </div>
    );
  }

  if (!blobUrl) {
    return (
      <div
        className={`report-preview report-preview--loading ${className ?? ""}`}
        data-testid="report-preview-loading"
      >
        <div className="flex items-center justify-center gap-2 text-ink-3 text-sm py-12">
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          <span>Generazione anteprima…</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`report-preview ${className ?? ""}`}
      data-testid="report-preview"
    >
      <iframe
        src={blobUrl}
        title="Anteprima report PDF"
        className="report-preview__frame"
      />
      {preliminary && (
        <TrustLayerBadge
          variant="watermark"
          className="report-preview__watermark"
        />
      )}
    </div>
  );
}
