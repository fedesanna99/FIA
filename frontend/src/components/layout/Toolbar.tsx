import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { FEAModel } from "../../types/model";
import { useAnalysisStore } from "../../store/analysisStore";
import { useRunAnalysis } from "../../hooks/useAnalysis";
import { useModelStore } from "../../store/modelStore";
import { useResultsStore } from "../../store/resultsStore";
import { modelsApi } from "../../api/client";
import {
  exportModelJson, exportResultsJson,
  exportDisplacementsCSV, exportModesCSV, exportModelDXF,
} from "../../utils/export";
import { generateReport, viewportCanvasDataUrl } from "../../utils/reportPdf";
import { NewModelDialog } from "../dialogs/NewModelDialog";
import { EditModelDialog } from "../dialogs/EditModelDialog";

interface Props {
  models: FEAModel[];
  activeId: string | null;
  onSelect: (id: string) => void;
}

export function Toolbar({ models, activeId, onSelect }: Props) {
  const { analysisType, setAnalysisType, isRunning } = useAnalysisStore();
  const run = useRunAnalysis();
  const model = useModelStore((s) => s.model);
  const { staticResults, modalResults, dynamicResults } = useResultsStore();
  const [newOpen, setNewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const qc = useQueryClient();
  const dup = useMutation({
    mutationFn: (id: string) => modelsApi.duplicate(id),
    onSuccess: (m) => {
      qc.invalidateQueries({ queryKey: ["models"] });
      onSelect(m.id);
    },
  });

  const handleExport = (format: "json" | "csv") => {
    if (!model) return;
    if (format === "json") {
      exportModelJson(model);
      if (staticResults) exportResultsJson(`${model.name}_static`, staticResults);
      if (modalResults) exportResultsJson(`${model.name}_modal`, modalResults);
      if (dynamicResults) exportResultsJson(`${model.name}_dynamic`, dynamicResults);
    } else {
      if (staticResults) exportDisplacementsCSV(model, staticResults);
      if (modalResults) exportModesCSV(model, modalResults);
    }
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-bg-panel">
      <div className="flex items-center gap-2 pr-3 border-r border-border">
        <div className="w-6 h-6 rounded bg-accent-primary/20 border border-accent-primary/40 flex items-center justify-center">
          <span className="text-accent-primary text-sm font-bold">F</span>
        </div>
        <span className="font-semibold text-sm">FEA Pro</span>
      </div>

      <button className="btn" onClick={() => setNewOpen(true)}>+ Nuovo</button>
      <button className="btn" disabled={!activeId || dup.isPending}
              onClick={() => activeId && dup.mutate(activeId)} title="Duplica modello corrente">
        ⎘ Duplica
      </button>
      <button className="btn" disabled={!activeId}
              onClick={() => setEditOpen(true)} title="Modifica nome/descrizione/unità">
        ✎ Modifica
      </button>

      <select
        className="bg-bg border border-border rounded px-2 py-1 text-xs min-w-[200px]"
        value={activeId ?? ""}
        onChange={(e) => onSelect(e.target.value)}
      >
        <option value="">— scegli modello —</option>
        {models.map((m) => (
          <option key={m.id} value={m.id}>{m.name}</option>
        ))}
      </select>

      <div className="flex items-center gap-1 px-3 border-l border-border ml-2">
        <span className="label mr-2">Analisi</span>
        {(["static", "modal", "dynamic", "buckling"] as const).map((t) => (
          <button
            key={t}
            className={`btn ${analysisType === t ? "btn-primary" : ""}`}
            onClick={() => setAnalysisType(t)}
          >
            {t === "static" ? "Statica"
              : t === "modal" ? "Modale"
              : t === "dynamic" ? "Dinamica"
              : "Buckling"}
          </button>
        ))}
      </div>

      <button
        className="btn btn-success"
        disabled={isRunning || !model}
        onClick={run}
      >
        {isRunning ? "Esecuzione..." : "▶  Esegui Analisi"}
      </button>

      <div className="flex-1" />

      <button className="btn" onClick={() => handleExport("json")} disabled={!model}>
        Export JSON
      </button>
      <button className="btn" onClick={() => handleExport("csv")} disabled={!model}>
        Export CSV
      </button>
      <button
        className="btn"
        onClick={() => model && exportModelDXF(model)}
        disabled={!model}
        title="Esporta geometria per CAD"
      >
        Export DXF
      </button>
      <button
        className="btn btn-success"
        disabled={!model}
        onClick={() => {
          if (!model) return;
          generateReport({
            model,
            staticResults,
            modalResults,
            viewportPng: viewportCanvasDataUrl(),
          });
        }}
        title="Report PDF con tabelle e immagine viewport"
      >
        📄 Report PDF
      </button>

      <NewModelDialog
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onCreated={(id) => onSelect(id)}
      />
      <EditModelDialog open={editOpen} onClose={() => setEditOpen(false)} />
    </div>
  );
}
