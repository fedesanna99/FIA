/**
 * ExportServerPanel — export server-side (FASE 10/17/24).
 *
 * 4 formati:
 *  - PDF reportlab (parametrico, 7 sezioni)
 *  - Excel multi-sheet (openpyxl, 5-8 sheet)
 *  - DXF strutturato (layer FEA_NODES/BEAMS/SHELLS/CONSTRAINTS/LOADS)
 *  - IFC4 (gerarchia Project/Site/Building/Storey)
 */
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { FileText, FileSpreadsheet, FileCog, FileBox } from "lucide-react";
import { exportApi } from "../../api/io";
import { useModelStore } from "../../store/modelStore";
import { useResultsStore } from "../../store/resultsStore";
import { toast } from "../../store/toastStore";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";

export function ExportServerPanel() {
  const model = useModelStore((s) => s.model);
  const { staticResults, modalResults } = useResultsStore();
  const [includeStatic, setIncludeStatic] = useState(true);
  const [includeModal, setIncludeModal] = useState(true);

  const pdfMut = useMutation({
    mutationFn: () => exportApi.pdf(model!.id, model!.name, { include_static: includeStatic, include_modal: includeModal }),
    onSuccess: () => toast("success", "PDF generato e scaricato"),
    onError: (e) => toast("error", `Errore PDF: ${(e as Error).message}`),
  });
  const xlsxMut = useMutation({
    mutationFn: () => exportApi.xlsx(model!.id, model!.name, { include_static: includeStatic, include_modal: includeModal }),
    onSuccess: () => toast("success", "Excel generato e scaricato"),
    onError: (e) => toast("error", `Errore Excel: ${(e as Error).message}`),
  });
  const dxfMut = useMutation({
    mutationFn: () => exportApi.dxf(model!.id, model!.name),
    onSuccess: () => toast("success", "DXF generato e scaricato"),
    onError: (e) => toast("error", `Errore DXF: ${(e as Error).message}`),
  });
  const ifcMut = useMutation({
    mutationFn: () => exportApi.ifc(model!.id, model!.name),
    onSuccess: () => toast("success", "IFC generato e scaricato"),
    onError: (e) => toast("error", `Errore IFC: ${(e as Error).message}`),
  });

  return (
    <div className="p-3 space-y-3">
      <Card
        title="Opzioni inclusione risultati"
        description="Valido per PDF / Excel. DXF e IFC esportano solo la geometria del modello."
      >
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={includeStatic} disabled={!staticResults}
                   onChange={(e) => setIncludeStatic(e.target.checked)} />
            <span>Includi risultati statici</span>
            {staticResults
              ? <Badge size="sm" variant="success">disponibile</Badge>
              : <Badge size="sm" variant="muted">non eseguito</Badge>}
          </label>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={includeModal} disabled={!modalResults}
                   onChange={(e) => setIncludeModal(e.target.checked)} />
            <span>Includi modi propri</span>
            {modalResults
              ? <Badge size="sm" variant="success">{modalResults.modes.length} modi</Badge>
              : <Badge size="sm" variant="muted">non eseguito</Badge>}
          </label>
        </div>
      </Card>

      <Card title="Formati disponibili">
        <div className="grid grid-cols-2 gap-2">
          <ExportButton
            icon={<FileText className="h-4 w-4 text-accent" />}
            title="PDF Report"
            desc="reportlab · 7 sezioni"
            onClick={() => pdfMut.mutate()}
            loading={pdfMut.isPending}
            disabled={!model}
          />
          <ExportButton
            icon={<FileSpreadsheet className="h-4 w-4 text-success" />}
            title="Excel"
            desc="openpyxl · multi-sheet"
            onClick={() => xlsxMut.mutate()}
            loading={xlsxMut.isPending}
            disabled={!model}
          />
          <ExportButton
            icon={<FileCog className="h-4 w-4 text-warn" />}
            title="DXF strutturato"
            desc="layer per entità FEA"
            onClick={() => dxfMut.mutate()}
            loading={dxfMut.isPending}
            disabled={!model}
          />
          <ExportButton
            icon={<FileBox className="h-4 w-4 text-accent" />}
            title="IFC4"
            desc="BIM Project/Site/Building"
            onClick={() => ifcMut.mutate()}
            loading={ifcMut.isPending}
            disabled={!model}
          />
        </div>
      </Card>

      <div className="text-[10px] text-ink-3">
        Gli export client-side (PDF screenshot, JSON, CSV) restano disponibili nel menu Export del TopBar.
      </div>
    </div>
  );
}

function ExportButton({ icon, title, desc, onClick, loading, disabled }: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  onClick: () => void;
  loading: boolean;
  disabled: boolean;
}) {
  return (
    <button
      className="text-left p-3 rounded border border-border bg-bg/40 hover:bg-bg-hover hover:border-accent/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      onClick={onClick}
      disabled={disabled || loading}
    >
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-sm font-medium text-ink">{title}</span>
        {loading && <span className="text-[10px] text-ink-3 ml-auto">…</span>}
      </div>
      <div className="text-[10px] text-ink-3">{desc}</div>
    </button>
  );
}
