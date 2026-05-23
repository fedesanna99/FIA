/**
 * ReportExportDialog (Precision v2.0 PR17 T9 finalize) — export PDF Precision.
 *
 * Modal wrapper sopra `generateReport` (reportPdf.ts). Checklist sezioni
 * + bottone download. Apertura via custom event `feapro:open-export-pdf`.
 * TrustLayerBadge banner sopra (PR15 T2). Footer Precision con filename
 * mono + spinner inline.
 */
import { useMemo, useState } from "react";
import { FileText, Download, CheckSquare, Square } from "lucide-react";
import { Dialog } from "./Dialog";
import { useModalBackButton } from "../../hooks/useModalBackButton";
import { useModelStore } from "../../store/modelStore";
import { useResultsStore } from "../../store/resultsStore";
import { generateReport } from "../../utils/reportPdf";
import { notify } from "../../store/notificationsStore";
import { toast } from "../../store/toastStore";
import { TrustLayerBadge } from "../shell/TrustLayerBadge";

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

  function toggle(id: string) {
    setEnabled((e) => ({ ...e, [id]: !e[id] }));
  }

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
      toast("error", `Errore generazione PDF: ${(e as Error).message}`);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Genera report PDF" width={540}>
      <div className="space-y-4" data-testid="report-export-dialog">
        {/* Trust Layer banner */}
        <TrustLayerBadge variant="banner" />

        {/* Info card */}
        <div className="flex items-start gap-2.5 bg-bg-info border border-accent/20 px-3 py-2.5">
          <FileText className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
          <div className="text-[11px] text-ink-2 leading-snug">
            Il report include solo le sezioni selezionate. La generazione è
            client-side (jsPDF) · nessun upload al server.
          </div>
        </div>

        {/* Sezioni checklist */}
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
                  <div className="text-[11px] text-ink-3 leading-snug">{s.description}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Warning if no results */}
        {!staticRes && (
          <div className="flex items-start gap-2 px-3 py-2 bg-bg-warn border border-warn/40 text-sm text-warn">
            <span className="font-mono text-[11px] uppercase tracking-wide-1 font-semibold flex-shrink-0">!</span>
            <span>Esegui un'analisi statica prima per popolare le sezioni Risultati/Criticità.</span>
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
            {downloading ? "Generazione…" : "Scarica PDF"}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
