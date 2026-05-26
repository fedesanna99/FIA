// v2.6.2.1 polish F2 · hook dispatcher condiviso per command palette
//
// Estrazione dalla `execute()` function di `CommandPalette.tsx` legacy
// (Sprint 4 G6) in un hook React riutilizzabile, per consentire alla nuova
// `ShellCommandPalette` di leggere il registry `paletteItems` esistente
// senza duplicare il dispatcher (~250 righe).
//
// Pattern: l'hook restituisce `(item, onComplete?) => void` che:
//   1. Rispetta preconditions (needsModel, soon)
//   2. Switch su `actionKind` → applica la mutation/navigazione corretta
//   3. Chiama `onComplete?.()` (tipicamente per chiudere la palette)
//
// I caller (CommandPalette legacy + ShellCommandPalette nuova) si limitano
// a renderizzare l'UI cmdk e chiamare questo hook su Command.Item.onSelect.

import { useQueryClient } from "@tanstack/react-query";
import { modelsApi } from "../api/client";
import { useWorkspaceStore } from "../store/workspaceStore";
import { useRightRailStore } from "../store/rightRailStore";
import { useLeftRailStore } from "../store/leftRailStore";
import { useUIStore } from "../store/uiStore";
import { useAnalysisStore, type ViewPreset } from "../store/analysisStore";
import { useModelStore } from "../store/modelStore";
import { useResultsStore } from "../store/resultsStore";
import { useThemeStore } from "../store/themeStore";
import { useAuthStore } from "../store/authStore";
import { useSelectionStore } from "../store/selectionStore";
import { useWizardStore, type WizardKind } from "../store/wizardStore";
import { useRunAnalysis } from "../hooks/useAnalysis";
import { toast } from "../store/toastStore";
import { viewportCanvasDataUrl } from "../utils/reportPdf";
import { quickExport } from "./quickExport";
import type { PaletteItem } from "./paletteItems";

export function usePaletteDispatch(): (item: PaletteItem, onComplete?: () => void) => void {
  const setWorkspace = useWorkspaceStore((s) => s.setWorkspace);
  const setHelp = useWorkspaceStore((s) => s.setHelp);
  const setDialog = useUIStore((s) => s.setOpenDialog);
  const setAnalysisType = useAnalysisStore((s) => s.setAnalysisType);
  const setTheme = useThemeStore((s) => s.setMode);
  const authLogout = useAuthStore((s) => s.logout);
  const setOpenSection = useRightRailStore((s) => s.open);
  const run = useRunAnalysis();
  const qc = useQueryClient();

  return (item: PaletteItem, onComplete?: () => void) => {
    const model = useModelStore.getState().model;
    if (item.needsModel && !model) return;
    if (item.soon) return;

    switch (item.actionKind) {
      case "workspace": {
        const target = item.payload as Parameters<typeof setWorkspace>[0];
        setWorkspace(target);
        if (target !== "docs") {
          useLeftRailStore.getState().open(target);
        }
        break;
      }
      case "right-panel":
        setOpenSection(item.payload as Parameters<typeof setOpenSection>[0]);
        break;
      case "tools-view": {
        const view = item.payload as string;
        setOpenSection("tools");
        window.setTimeout(() => {
          window.dispatchEvent(new CustomEvent("feapro:tools-view", { detail: { view } }));
        }, 0);
        break;
      }
      case "dialog":
        setDialog(item.payload as Parameters<typeof setDialog>[0]);
        break;
      case "theme":
        setTheme(item.payload as Parameters<typeof setTheme>[0]);
        break;
      case "run-analysis":
        if (!model) return;
        setAnalysisType(item.payload as Parameters<typeof setAnalysisType>[0]);
        setOpenSection("inspect");
        void run();
        break;
      case "external-link":
        window.open((item.payload as { url: string }).url, "_blank", "noopener");
        break;
      case "openHelp":
        setHelp(true);
        break;
      case "openAccount":
        window.dispatchEvent(new CustomEvent("feapro:open-account"));
        break;
      case "openLocation":
        window.dispatchEvent(new CustomEvent("feapro:open-location"));
        break;
      case "openAuth":
        // v2.1.4 auth-gate: legacy no-op
        break;
      case "openExport":
        setOpenSection("tools");
        break;
      case "logout":
        authLogout();
        break;
      case "open-template-gallery":
        window.dispatchEvent(new Event("feapro:open-template-gallery"));
        break;
      case "open-wizard": {
        const { wizard, ...rest } = (item.payload ?? {}) as {
          wizard?: WizardKind;
          [k: string]: unknown;
        };
        if (!wizard) break;
        useWizardStore.getState().open(wizard, rest);
        break;
      }
      case "open-import-wizard": {
        const payload = (item.payload ?? {}) as { source?: string };
        window.dispatchEvent(
          new CustomEvent("feapro:open-import-wizard", {
            detail: payload.source ? { source: payload.source } : undefined,
          }),
        );
        break;
      }
      case "apply-material": {
        const ms = useModelStore.getState();
        const sel = ms.selectedElementIds;
        const m = ms.model;
        const matId = (item.payload as { materialId: string }).materialId;
        if (!m) { toast("info", "Apri un modello per applicare materiali."); break; }
        if (sel.size === 0) {
          toast("info", `Seleziona elementi prima di applicare ${matId}.`);
          break;
        }
        void applyMaterialToSelection(m.id, m.elements, sel, matId, qc);
        break;
      }
      case "apply-section": {
        const ms = useModelStore.getState();
        const sel = ms.selectedElementIds;
        const m = ms.model;
        const secId = (item.payload as { sectionId: string }).sectionId;
        if (!m) { toast("info", "Apri un modello per applicare sezioni."); break; }
        if (sel.size === 0) {
          toast("info", `Seleziona elementi prima di applicare ${secId}.`);
          break;
        }
        void applySectionToSelection(m.id, m.elements, sel, secId, qc);
        break;
      }
      case "toggle-view": {
        const flag = (item.payload as { flag: string }).flag;
        const a = useAnalysisStore.getState();
        const r = useResultsStore.getState();
        switch (flag) {
          case "showGrid":           a.toggleGrid(); break;
          case "showLoads":          a.toggleLoads(); break;
          case "showConstraints":    a.toggleConstraints(); break;
          case "showNodeLabels":     a.toggleNodeLabels(); break;
          case "showDiagrams":       a.toggleDiagrams(); break;
          case "showPrincipals":     a.togglePrincipals(); break;
          case "showDeformed":       r.toggleDeformed(); break;
          case "showStressColormap": r.toggleStressColormap(); break;
          case "showIsosurfaces":    r.toggleIsosurfaces(); break;
          case "cycleViewportMode": {
            const next: typeof a.viewportMode =
              a.viewportMode === "wireframe" ? "solid" :
              a.viewportMode === "solid"     ? "transparent" :
                                                "wireframe";
            a.setViewportMode(next);
            toast("info", `Vista: ${next}`, 1500);
            break;
          }
          default:
            toast("info", `Toggle "${flag}" non riconosciuto.`);
        }
        break;
      }
      case "view-preset": {
        const preset = item.payload as Exclude<ViewPreset, "custom">;
        useAnalysisStore.getState().applyViewPreset(preset);
        useRightRailStore.getState().open("view");
        toast("info", `Vista preset: ${preset}`, 1500);
        break;
      }
      case "quick-export": {
        const m = useModelStore.getState().model;
        if (!m) { toast("error", "Nessun modello caricato."); break; }
        const r = useResultsStore.getState();
        const payload = item.payload as { format: string; scope?: string };
        void quickExport(
          payload,
          m,
          { staticResults: r.staticResults, modalResults: r.modalResults },
          { toast, getViewportPng: viewportCanvasDataUrl },
        );
        break;
      }
      case "goto-node": {
        const { nodeId } = item.payload as { nodeId: number };
        const ms = useModelStore.getState();
        if (!ms.model) break;
        const exists = ms.model.nodes.some((n) => n.id === nodeId);
        if (!exists) {
          toast("error", `Nodo N${nodeId} non trovato nel modello.`);
          break;
        }
        ms.clearSelection();
        ms.selectNode(nodeId, false);
        useSelectionStore.getState().selectNode(nodeId);
        useRightRailStore.getState().open("inspect");
        useWorkspaceStore.getState().openRightPanel("inspect");
        toast("info", `Nodo N${nodeId} selezionato.`, 1500);
        break;
      }
      case "goto-element": {
        const { elementId } = item.payload as { elementId: number };
        const ms = useModelStore.getState();
        if (!ms.model) break;
        const exists = ms.model.elements.some((e) => e.id === elementId);
        if (!exists) {
          toast("error", `Elemento E${elementId} non trovato nel modello.`);
          break;
        }
        ms.clearSelection();
        ms.selectElement(elementId, false);
        useSelectionStore.getState().selectElement(elementId);
        useRightRailStore.getState().open("inspect");
        useWorkspaceStore.getState().openRightPanel("inspect");
        toast("info", `Elemento E${elementId} selezionato.`, 1500);
        break;
      }
      case "focus-toggle": {
        const ws = useWorkspaceStore.getState();
        if (ws.isEmptyState) {
          ws.exitEmptyState();
        } else {
          useLeftRailStore.getState().close();
          ws.enterEmptyState();
          useRightRailStore.getState().close();
        }
        break;
      }
      case "togglePalette":
      default:
        break;
    }
    onComplete?.();
  };
}

// ── Helper interni (estratti da CommandPalette.tsx legacy) ─────────────

async function applyMaterialToSelection(
  modelId: string,
  elements: import("../types/model").Element[],
  selection: Set<number>,
  materialId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  qc: any,
): Promise<void> {
  return applyPropertyToSelection(modelId, elements, selection, qc, (el) => ({
    ...el, material_id: materialId,
  }), `Materiale ${materialId}`);
}

async function applySectionToSelection(
  modelId: string,
  elements: import("../types/model").Element[],
  selection: Set<number>,
  sectionId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  qc: any,
): Promise<void> {
  return applyPropertyToSelection(modelId, elements, selection, qc, (el) => ({
    ...el, section_id: sectionId,
  }), `Sezione ${sectionId}`);
}

async function applyPropertyToSelection(
  modelId: string,
  elements: import("../types/model").Element[],
  selection: Set<number>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  qc: any,
  mapper: (el: import("../types/model").Element) => import("../types/model").Element,
  label: string,
): Promise<void> {
  const targets = elements.filter((e) => selection.has(e.id));
  if (targets.length === 0) return;
  const updateLocal = useModelStore.getState().updateElement;
  const results = await Promise.allSettled(
    targets.map(async (el) => {
      const updated = await modelsApi.updateElement(modelId, el.id, mapper(el));
      updateLocal(el.id, updated);
      return updated;
    }),
  );
  const ok = results.filter((r) => r.status === "fulfilled").length;
  const fail = results.length - ok;
  qc.invalidateQueries({ queryKey: ["model", modelId] });
  qc.invalidateQueries({ queryKey: ["models"] });
  if (fail === 0) {
    toast("success", `${label} applicato a ${ok} elementi.`);
  } else if (ok > 0) {
    toast("warning", `${label}: ${ok} ok · ${fail} falliti.`);
  } else {
    toast("error", `Impossibile applicare ${label} (${fail} errori).`);
  }
}
