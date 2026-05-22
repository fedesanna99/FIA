/**
 * ReportExportDialog (v1.9.0 T4) — Demo Slice GPS Strutturale.
 *
 * Modal wrapper sopra l'utility `generateReport` (reportPdf.ts).
 * Mostra una checklist delle sezioni che verranno incluse nel PDF +
 * bottone download.
 *
 * Apertura: il bottone "Genera report PDF →" in ResultsOverviewCard
 * dispatcha `feapro:open-export-pdf` (ascoltato da App.tsx).
 *
 * Dismiss: ESC / backdrop / swipe-back (regola UI v1.7 T5).
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
    try {
      generateReport({
        model,
        staticResults: staticRes ?? null,
        modalResults: modalRes ?? null,
      });
      notify("success", "Report PDF generato", `${pageCount} sezioni · ${model.name}`);
      onClose();
    } catch (e) {
      toast("error", `Errore generazione PDF: ${(e as Error).message}`);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Genera report PDF" width={520}>
      <div className="space-y-3" data-testid="report-export-dialog">
        <div className="flex items-start gap-2.5 bg-bg-info border border-ink-info/30 rounded-md p-2.5">
          <FileText className="w-4 h-4 text-ink-info flex-shrink-0 mt-0.5" />
          <div className="text-[11px] text-ink leading-snug">
            Il report include solo le sezioni selezionate. La generazione è
            client-side (jsPDF) — nessun upload al server.
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-[10px] uppercase tracking-wider text-ink-muted font-mono font-semibold mb-1">
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
                className="w-full flex items-start gap-2.5 p-2 rounded-md hover:bg-bg-hover transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
              >
                {on ? (
                  <CheckSquare className="w-4 h-4 text-ink-info flex-shrink-0 mt-0.5" />
                ) : (
                  <Square className="w-4 h-4 text-ink-muted flex-shrink-0 mt-0.5" />
                )}
                <div className="min-w-0 flex-1">
                  <div className={`text-sm font-semibold ${on ? "text-ink" : "text-ink-muted"}`}>
                    {s.label}
                  </div>
                  <div className="text-[11px] text-ink-muted leading-snug">{s.description}</div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="pt-2 border-t border-border flex items-center gap-2">
          <div className="text-[10px] text-ink-muted flex-1">
            Output: <span className="font-mono text-ink">{model?.name ?? "modello"}.pdf</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            data-testid="report-cancel"
            className="px-3 py-1.5 text-xs text-ink-muted hover:text-ink rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={!model || !staticRes}
            data-testid="report-download"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white text-xs font-medium rounded-md hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
          >
            <Download className="w-3.5 h-3.5" />
            Scarica PDF
          </button>
        </div>

        {!staticRes && (
          <div className="text-[10px] text-ink-warn italic">
            Esegui un'analisi statica prima per popolare le sezioni
            Risultati/Criticità.
          </div>
        )}
      </div>
    </Dialog>
  );
}
