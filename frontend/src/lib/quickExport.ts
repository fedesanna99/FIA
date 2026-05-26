/**
 * quickExport (v2.5.3 T3, fix bug #2).
 *
 * Handler estratto da `CommandPalette.tsx case "quick-export"` per due
 * motivi:
 *
 *   1. Testabilità — la funzione è pura, riceve dipendenze via DI
 *      (toast helper + viewport PNG getter). I test possono mockarle
 *      direttamente senza dover montare l'intero CommandPalette.
 *   2. Code-split — il workbook XLSX builder (`exportModelToXlsx`, lib SheetJS
 *      ~300kB gzipped) viene importato lazy solo quando l'utente seleziona la
 *      voce palette `exp-xlsx`, non al primo render della palette.
 *
 * Fix v2.5.3:
 *   - `pdf` ora produce un toast "success" dopo `generateReport` (prima era
 *     silente → utente percepiva la voce come morta).
 *   - `xlsx` usa `exportModelToXlsx` (audit-fix B6 v2.2.1) — workbook
 *     multi-sheet SheetJS — invece di `exportDisplacementsCSV` +
 *     `exportModesCSV` (CSV piatti, codice obsoleto).
 */
import type { FEAModel } from "../types/model";
import type { StaticResults, ModalResults } from "../types/results";
import type { ToastLevel } from "../store/toastStore";
import { generateReport } from "../utils/reportPdf";
import {
  exportModelJson,
  exportResultsJson,
  exportDisplacementsCSV,
  exportModesCSV,
} from "../utils/export";

export interface QuickExportPayload {
  format: string;
  scope?: string;
}

export interface QuickExportResults {
  staticResults: StaticResults | null;
  modalResults: ModalResults | null;
}

export type QuickExportToast = (
  level: ToastLevel,
  message: string,
  ttlMs?: number,
) => void;

export interface QuickExportDeps {
  toast: QuickExportToast;
  /**
   * Lazy getter del PNG del viewport per embed nel PDF.
   * Ritorna undefined se canvas non disponibile (e.g. jsdom o viewport non montato).
   */
  getViewportPng: () => string | undefined;
}

export async function quickExport(
  payload: QuickExportPayload,
  model: FEAModel,
  results: QuickExportResults,
  deps: QuickExportDeps,
): Promise<void> {
  const { toast, getViewportPng } = deps;
  const { staticResults, modalResults } = results;

  try {
    switch (payload.format) {
      case "pdf": {
        const viewportPng = getViewportPng();
        generateReport({
          model,
          staticResults,
          modalResults,
          viewportPng,
        });
        toast("success", "Report PDF scaricato.");
        break;
      }
      case "xlsx": {
        // v2.5.3 fix: workbook XLSX multi-sheet (audit-fix B6 v2.2.1).
        // Lazy import per non gonfiare il bundle iniziale (~300kB la lib).
        const { exportModelToXlsx } = await import("../utils/exportXlsx");
        const ok = exportModelToXlsx(model, { staticResults, modalResults });
        if (ok) {
          toast("success", "Workbook XLSX scaricato.");
        } else {
          toast("error", "Export XLSX fallito (modello non disponibile).");
        }
        break;
      }
      case "csv-nodes":
        if (!staticResults) {
          toast("error", "Servono risultati statica.");
          break;
        }
        exportDisplacementsCSV(model, staticResults);
        break;
      case "csv-modes":
        if (!modalResults) {
          toast("error", "Servono risultati modale.");
          break;
        }
        exportModesCSV(model, modalResults);
        break;
      case "json":
        exportModelJson(model);
        if (staticResults) exportResultsJson(model.name, staticResults);
        break;
      case "dxf":
        toast("info", "Export DXF: usa il pannello Tools → Esporta.");
        break;
      default:
        toast("info", `Format "${payload.format}" non riconosciuto.`);
    }
  } catch (e) {
    toast("error", `Errore export: ${(e as Error).message}`);
  }
}
