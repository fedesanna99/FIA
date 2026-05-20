/**
 * ExportMenu — dropdown nel TopBar con i formati di export.
 *
 * Per ora attivi solo i 4 client-side (preservati dal vecchio Toolbar):
 *   - JSON (modello + risultati salvati)
 *   - CSV (displacements + modes)
 *   - DXF (geometria CAD)
 *   - PDF (jsPDF + html2canvas, screenshot viewport)
 *
 * In M6 si attiveranno gli export server-side (PDF reportlab, XLSX, DXF strutturato, IFC4).
 */
import { Download, FileJson, FileSpreadsheet, FileText, FileCog, FileImage, FileBox } from "lucide-react";
import { Button } from "../ui/Button";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from "../ui/DropdownMenu";
import { useModelStore } from "../../store/modelStore";
import { useResultsStore } from "../../store/resultsStore";
import {
  exportModelJson, exportResultsJson,
  exportDisplacementsCSV, exportModesCSV, exportModelDXF,
} from "../../utils/export";
import { generateReport, viewportCanvasDataUrl } from "../../utils/reportPdf";
import { toast } from "../../store/toastStore";

export function ExportMenu() {
  const model = useModelStore((s) => s.model);
  const { staticResults, modalResults, dynamicResults } = useResultsStore();

  function exportJson() {
    if (!model) return;
    exportModelJson(model);
    if (staticResults)  exportResultsJson(`${model.name}_static`,  staticResults);
    if (modalResults)   exportResultsJson(`${model.name}_modal`,   modalResults);
    if (dynamicResults) exportResultsJson(`${model.name}_dynamic`, dynamicResults);
    toast("success", "Export JSON completato");
  }

  function exportCsv() {
    if (!model) return;
    if (!staticResults && !modalResults) {
      toast("info", "Nessun risultato statico/modale da esportare.");
      return;
    }
    if (staticResults) exportDisplacementsCSV(model, staticResults);
    if (modalResults)  exportModesCSV(model, modalResults);
    toast("success", "Export CSV completato");
  }

  function exportDxf() {
    if (!model) return;
    exportModelDXF(model);
    toast("success", "Export DXF completato");
  }

  async function exportPdf() {
    if (!model) return;
    try {
      const viewportPng = await viewportCanvasDataUrl();
      generateReport({
        model,
        staticResults: staticResults ?? undefined,
        modalResults: modalResults ?? undefined,
        viewportPng: viewportPng ?? undefined,
      });
      toast("success", "Report PDF generato");
    } catch (e) {
      toast("error", `Errore PDF: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="ghost" iconLeft={<Download className="h-3.5 w-3.5" />} disabled={!model}>
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Client-side</DropdownMenuLabel>
        <DropdownMenuItem onSelect={exportJson}>
          <FileJson className="h-3.5 w-3.5 text-info" />
          <span className="flex-1">JSON</span>
          <span className="text-[10px] text-ink-dim">modello + risultati</span>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={exportCsv}>
          <FileSpreadsheet className="h-3.5 w-3.5 text-success" />
          <span className="flex-1">CSV</span>
          <span className="text-[10px] text-ink-dim">disp + modi</span>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={exportDxf}>
          <FileCog className="h-3.5 w-3.5 text-warn" />
          <span className="flex-1">DXF</span>
          <span className="text-[10px] text-ink-dim">geometria CAD</span>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={exportPdf}>
          <FileImage className="h-3.5 w-3.5 text-accent" />
          <span className="flex-1">PDF</span>
          <span className="text-[10px] text-ink-dim">screenshot</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuLabel>Server-side (M6)</DropdownMenuLabel>
        <DropdownMenuItem disabled>
          <FileText className="h-3.5 w-3.5" />
          <span className="flex-1">PDF reportlab</span>
          <span className="text-[10px] text-ink-dim">in arrivo</span>
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <FileSpreadsheet className="h-3.5 w-3.5" />
          <span className="flex-1">Excel multi-sheet</span>
          <span className="text-[10px] text-ink-dim">in arrivo</span>
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <FileBox className="h-3.5 w-3.5" />
          <span className="flex-1">IFC4 BIM</span>
          <span className="text-[10px] text-ink-dim">in arrivo</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
