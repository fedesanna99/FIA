/**
 * ReportExportDialog (Precision v2.0 PR17 T9 + v2.6.4 A.1 watermark preview).
 *
 * Modal wrapper sopra `generateReport` (reportPdf.ts). Compone:
 *   - Banner TrustLayer (warn quando preliminary, success quando firmato)
 *   - Preview iframe via ReportPreview (con watermark overlay se preliminary)
 *   - Checklist sezioni laterale (compact)
 *   - Footer [Annulla] [Esporta PDF]
 *
 * Apertura via custom event `feapro:open-export-pdf`. Il PDF scaricato è
 * sempre PULITO (no watermark hard-coded nel PDF) — il watermark è UI
 * signal, non marker legale. Vedi c7-trust-layer-pdf-integration.md §3.
 */
import { useCallback, useMemo, useState } from "react";
import { FileText, Download, CheckSquare, Square } from "lucide-react";
import { Dialog } from "./Dialog";
import { useModalBackButton } from "../../hooks/useModalBackButton";
import { useModelStore } from "../../store/modelStore";
import { useResultsStore } from "../../store/resultsStore";
import { generateReport, generateReportBlob } from "../../utils/reportPdf";
import { notify } from "../../store/notificationsStore";
import { toast } from "../../store/toastStore";
import { toastApiError } from "../../lib/apiErrors";
import { TrustLayerBadge } from "../shell/TrustLayerBadge";
import { ReportPreview } from "../report/ReportPreview";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface SectionToggle {
  id: "cover" | "model" | "results" | "criticality" | "conclusions";
  label: string;
  description: string;
  defaultEnabled: boolean;
}

const SECTIONS: SectionToggle[] = [
  {
    id: "cover",
    label: "Cover",
    description: "Frontespizio con nome modello, data, autore",
    defaultEnabled: true,
  },
  {
    id: "model",
    label: "Modello",
    description: "Geometria, sezioni, materiali, vincoli, carichi",
    defaultEnabled: true,
  },
  {
    id: "results",
    label: "Risultati",
    description: "Max u, Max σ, solve time, DOF, tabella spostamenti",
    defaultEnabled: true,
  },
  {
    id: "criticality",
    label: "Criticità GPS",
    description: "UC verifiche S275 / EC3 / NTC con tonali",
    defaultEnabled: true,
  },
  {
    id: "conclusions",
    label: "Conclusioni",
    description: "Sintesi automatica + raccomandazioni",
    defaultEnabled: false,
  },
];

export function ReportExportDialog({ open, onClose }: Props) {
  useModalBackButton(open, onClose);
  const model = useModelStore((s) => s.model);
  const staticRes = useResultsStore((s) => s.staticResults);
  const modalRes = useResultsStore((s) => s.modalResults);
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(SECTIONS.map((s) => [s.id, s.defaultEnabled])),
  );
  const [downloading, setDownloading] = useState(false);

  const pageCount = useMemo(
    () => Object.values(enabled).filter(Boolean).length || 1,
    [enabled],
  );

  // v2.6.4 A.1: il modello è "preliminary" finché non ha `qualifiedBy` set
  // (firma del tecnico abilitato). Mostriamo banner+watermark warn in tal caso.
  // FEAModel attuale non ha ancora il campo qualifiedBy nello schema — uso
  // un cast difensivo che resterà `undefined` finché lo schema si estende.
  const qualifiedBy = (model as { qualifiedBy?: string } | null)?.qualifiedBy;
  const preliminary = !qualifiedBy;

  function toggle(id: string) {
    setEnabled((e) => ({ ...e, [id]: !e[id] }));
  }

  // v2.6.4 A.1: factory stabile per `generatePdfBlob`. Usata da
  // ReportPreview che ha la useEffect dependency su `generatePdfBlob`.
  // useCallback evita rigeneration ad ogni render dei sections toggle.
  const generatePdfBlob = useCallback((): Blob => {
    if (!model) throw new Error("Nessun modello attivo");
    return generateReportBlob({
      model,
      staticResults: staticRes ?? null,
      modalResults: modalRes ?? null,
    });
  }, [model, staticRes, modalRes]);

  function handleDownload() {
    if (!model) {
      toast("warning", "Apri un modello prima di esportare il report.");
      return;
    }
    setDownloading(true);
    try {
      generateReport({
        model,
        staticResults: staticRes ?? null,
        modalResults: modalRes ?? null,
      });
      notify("success", "Report PDF generato", `${pageCount} sezioni · ${model.name}`);
      setDownloading(false);
      onClose();
    } catch (e) {
      setDownloading(false);
      toastApiError(e, "Errore generazione PDF");
    }
  }

  // v2.6.4 A.1: dialog allargato a 900px per ospitare preview iframe leggibile.
  // Layout 2-col: preview ~580px (1fr) + sidebar checklist ~280px.
  return (
    <Dialog open={open} onClose={onClose} title="Genera report PDF" width={900}>
      <div className="space-y-3" data-testid="report-export-dialog">
        {/* Trust Layer banner — warn (preliminary) o success (firmato) */}
        <TrustLayerBadge
          variant="banner"
          qualifiedBy={qualifiedBy}
        />

        {!staticRes ? (
          /* No results yet → warning + checklist senza preview */
          <div className="flex items-start gap-2 px-3 py-2 bg-bg-warn border border-warn/40 text-sm text-warn">
            <span className="font-mono text-[11px] uppercase tracking-wide-1 font-semibold flex-shrink-0">!</span>
            <span>Esegui un'analisi statica prima per popolare le sezioni Risultati/Criticità.</span>
          </div>
        ) : (
          /* Preview + Checklist 2-col */
          <div className="grid grid-cols-[1fr_240px] gap-3 min-h-0">
            {/* Preview iframe + watermark overlay */}
            <div className="border border-border bg-bg-viewport" style={{ height: "60vh", maxHeight: 520 }}>
              <ReportPreview
                generatePdfBlob={generatePdfBlob}
                preliminary={preliminary}
                className="h-full"
              />
            </div>

            {/* Checklist sezioni laterale */}
            <div className="space-y-0.5">
              <div className="font-mono text-[10px] uppercase tracking-wide-2 text-ink-3 font-semibold mb-2">
                Sezioni · {pageCount} attive
              </div>
              {SECTIONS.map((s) => {
                const on = enabled[s.id];
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggle(s.id)}
                    data-testid={`report-section-${s.id}`}
                    className="w-full flex items-start gap-2.5 px-2.5 py-2 hover:bg-bg-hover transition-colors text-left focus-visible:outline-none focus-visible:border-accent border border-transparent"
                  >
                    {on ? (
                      <CheckSquare className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                    ) : (
                      <Square className="w-4 h-4 text-ink-3 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className={`text-sm font-semibold ${on ? "text-ink" : "text-ink-3"}`}>
                        {s.label}
                      </div>
                      <div className="text-[10px] text-ink-3 leading-snug">{s.description}</div>
                    </div>
                  </button>
                );
              })}

              {/* Info card client-side generation */}
              <div className="flex items-start gap-2 bg-bg-info border border-accent/20 px-2.5 py-2 mt-2">
                <FileText className="w-3.5 h-3.5 text-accent flex-shrink-0 mt-0.5" />
                <div className="text-[10px] text-ink-2 leading-snug">
                  Generazione client-side (jsPDF). Il PDF scaricato è pulito,
                  il watermark è solo UI signal.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="pt-3 border-t border-border flex items-center gap-2 flex-wrap">
          <div className="text-[11px] text-ink-3 flex-1 min-w-0">
            Output: <span className="font-mono text-ink-2">{model?.name ?? "modello"}.pdf</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            data-testid="report-cancel"
            className="px-3 py-1.5 text-sm font-medium text-ink-2 hover:text-ink hover:bg-bg-hover"
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={!model || !staticRes || downloading}
            data-testid="report-download"
            className="inline-flex items-center gap-1.5 bg-accent text-white border border-accent px-4 py-1.5 text-sm font-medium hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {downloading ? (
              <span className="inline-block w-3 h-3 border-[1.5px] border-white/40 border-t-white animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            {downloading ? "Generazione…" : "Esporta PDF"}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
