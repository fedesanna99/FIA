/**
 * ExportView (v1.5 Task 28).
 *
 * Sub-view del Tools hub: 5 opzioni di export con titoletto + descrizione +
 * bottone per ognuna. Riusa `utils/export.ts` e `utils/reportPdf.ts` gia'
 * usati dal AvatarMenu dropdown (alpha.31 Task 18).
 */
import { useState } from "react";
import { FileText, FileSpreadsheet, Database, FileJson } from "lucide-react";
import { useModelStore } from "../../../store/modelStore";
import { useResultsStore } from "../../../store/resultsStore";
import {
  exportModelJson,
  exportResultsJson,
  exportDisplacementsCSV,
  exportModesCSV,
} from "../../../utils/export";
import { generateReport, viewportCanvasDataUrl } from "../../../utils/reportPdf";
import { toast } from "../../../store/toastStore";


export function ExportView() {
  const model = useModelStore((s) => s.model);
  const staticResults = useResultsStore((s) => s.staticResults);
  const modalResults = useResultsStore((s) => s.modalResults);
  const [busy, setBusy] = useState<string | null>(null);

  const doPdf = async () => {
    if (!model) return;
    setBusy("pdf");
    try {
      const viewportPng = viewportCanvasDataUrl();
      await generateReport({ model, staticResults, modalResults, viewportPng });
      toast("success", "Report PDF generato.");
    } catch (e) {
      toast("error", `Errore export PDF: ${(e as Error)?.message ?? e}`);
    } finally {
      setBusy(null);
    }
  };

  const doExcel = () => {
    if (!model) return;
    setBusy("xlsx");
    try {
      // XLSX dedicato non ancora wired — usiamo CSV piatti (displacements + modi)
      // come placeholder finche' non arriva un generatore multi-sheet.
      if (staticResults) exportDisplacementsCSV(model, staticResults);
      if (modalResults) exportModesCSV(model, modalResults);
      toast("success", "Export Excel: scaricati i CSV piatti.");
    } finally {
      setBusy(null);
    }
  };

  const doCsvNodes = () => {
    if (!model || !staticResults) return;
    setBusy("csv-nodes");
    try {
      exportDisplacementsCSV(model, staticResults);
      toast("success", "CSV displacements scaricato.");
    } finally {
      setBusy(null);
    }
  };

  const doCsvModes = () => {
    if (!model || !modalResults) return;
    setBusy("csv-modes");
    try {
      exportModesCSV(model, modalResults);
      toast("success", "CSV modi scaricato.");
    } finally {
      setBusy(null);
    }
  };

  const doJson = () => {
    if (!model) return;
    setBusy("json");
    try {
      exportModelJson(model);
      if (staticResults) exportResultsJson(model.name, staticResults);
      toast("success", "JSON nativo scaricato.");
    } finally {
      setBusy(null);
    }
  };

  const noModel = !model;

  return (
    <div className="p-3 space-y-2.5 overflow-y-auto">
      <ExportRow
        icon={FileText}
        title="Report PDF"
        description="Documento multi-pagina con summary, deformata, stress, modi."
        onAction={doPdf}
        loading={busy === "pdf"}
        disabled={noModel}
        ctaLabel="Esporta PDF"
        hint={noModel ? "Richiede un modello caricato." : undefined}
      />
      <ExportRow
        icon={FileSpreadsheet}
        title="Excel multi-sheet"
        description="Workbook XLSX con sheet separati (placeholder: per ora 2 CSV)."
        onAction={doExcel}
        loading={busy === "xlsx"}
        disabled={noModel || (!staticResults && !modalResults)}
        ctaLabel="Esporta XLSX"
        hint={!staticResults && !modalResults ? "Esegui un'analisi prima." : undefined}
      />
      <ExportRow
        icon={Database}
        title="CSV displacements"
        description="CSV piatto con id, ux/uy/uz/rx/ry/rz per ogni nodo (statica)."
        onAction={doCsvNodes}
        loading={busy === "csv-nodes"}
        disabled={noModel || !staticResults}
        ctaLabel="Esporta CSV"
        hint={!staticResults ? "Esegui un'analisi statica prima." : undefined}
      />
      <ExportRow
        icon={Database}
        title="CSV modi"
        description="CSV con frequenze e shape modali per analisi modale."
        onAction={doCsvModes}
        loading={busy === "csv-modes"}
        disabled={noModel || !modalResults}
        ctaLabel="Esporta CSV"
        hint={!modalResults ? "Esegui un'analisi modale prima." : undefined}
      />
      <ExportRow
        icon={FileJson}
        title="JSON nativo"
        description="Modello + risultati in formato JSON FEA Pro (re-import lossless)."
        onAction={doJson}
        loading={busy === "json"}
        disabled={noModel}
        ctaLabel="Esporta JSON"
      />
    </div>
  );
}


function ExportRow({
  icon: Icon, title, description, onAction, loading, disabled, ctaLabel, hint,
}: {
  icon: typeof FileText;
  title: string;
  description: string;
  onAction: () => void;
  loading?: boolean;
  disabled?: boolean;
  ctaLabel: string;
  hint?: string;
}) {
  return (
    <div className="border border-border rounded-md p-2.5 bg-bg-panel">
      <div className="flex items-start gap-2.5">
        <Icon className="w-4 h-4 text-ink-success mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-ink">{title}</div>
          <p className="text-[11px] text-ink-muted leading-snug mt-0.5">{description}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onAction}
        disabled={disabled || loading}
        className="w-full mt-2 bg-bg-success/60 hover:bg-bg-success text-ink-success border border-success/30 disabled:opacity-40 disabled:cursor-not-allowed text-[11px] font-medium py-1.5 rounded-md transition-colors"
      >
        {loading ? "Esportazione…" : ctaLabel}
      </button>
      {hint && (
        <p className="text-[10px] text-ink-dim mt-1 italic">{hint}</p>
      )}
    </div>
  );
}
