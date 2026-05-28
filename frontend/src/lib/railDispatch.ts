/**
 * railDispatch (v2.6.6 E.2) — hook condiviso che mappa una `RailItem`
 * a un effetto concreto (workspace switch, dialog open, navigazione,
 * toast prerequisite).
 *
 * Utilizzato da:
 *   - `frontend/src/shell/ShellRail.tsx` (Shell custom v2.6.x)
 *   - `frontend/src/components/shell/LeftRail.tsx` (chrome legacy, home dashboard)
 *
 * Pattern: hook React che ritorna una funzione `dispatch(item)`. Internamente
 * legge gli store necessari (workspace, analysis, model) e dispatcha eventi
 * o aggiorna gli store.
 *
 * Click guard `requiresModel`: voci SOLVE/VERIFY/Report richiedono modello
 * attivo. Senza modello, dispatcher emette toast educational con CTA
 * "Apri galleria template" invece di disabilitare il button. Pattern
 * coerente con DEC-A4 FeatureButton preconditions registry.
 */
import { useCallback } from "react";
import type { AnalysisType } from "../types/results";
import { useWorkspaceStore } from "../store/workspaceStore";
import { useAnalysisStore } from "../store/analysisStore";
import { useModelStore } from "../store/modelStore";
import { toast } from "../store/toastStore";
import type {
  AnalysisPreset,
  RailItem,
  WorkspaceId,
} from "./railConfig";

/**
 * Mappa `WorkspaceId` (italiano, usato da railConfig) → workspace legacy
 * (`Workspace` type in workspaceStore: `"model" | "analysis" | "verify"`).
 *
 * Match `WS_TO_LEGACY` interno di ShellRail.tsx pre-v2.6.6 per backward compat.
 */
export const WORKSPACE_TO_LEGACY: Record<WorkspaceId, "model" | "analysis" | "verify"> = {
  modello: "model",
  analisi: "analysis",
  verifiche: "verify",
  risultati: "verify", // Inspect content vive in workspace "verify" (right rail)
  io: "verify", // placeholder I/O & Collab → workspace verify temporaneamente
  // v3.1 Fase 2c: View overlay/preset workspace (vive in legacy "verify" content)
  view: "verify",
};

/**
 * Mappa `AnalysisPreset` (railConfig) → `AnalysisType` (analysisStore).
 *
 * Note:
 *   - "seismic" non esiste come AnalysisType nativo. Sismica usa "modal"
 *     (analisi modale + spettro di risposta). Match comportamento
 *     ShellRail v2.6.5 D.1.
 */
export const PRESET_TO_ANALYSIS_TYPE: Record<AnalysisPreset, AnalysisType> = {
  static: "static",
  dynamic: "dynamic",
  seismic: "modal",
};

/**
 * Hook che ritorna una funzione `dispatch(item)` per gestire click sulle
 * voci della rail. Centralizza tutta la logica side-effect (event dispatch,
 * store update, toast prerequisite).
 */
export function useRailDispatch() {
  const setWorkspace = useWorkspaceStore((s) => s.setWorkspace);
  const setAnalysisType = useAnalysisStore((s) => s.setAnalysisType);
  // NB: legge il modello in modo non-reactive (dentro la closure callback).
  // Lo stato corrente è preso al momento del click — non rerendera la rail
  // quando il modello cambia.

  return useCallback(
    (item: RailItem) => {
      const activeModel = useModelStore.getState().model;
      const hasModel = activeModel !== null;

      // 1. Placeholder toast (Jobs, Cronologia)
      if (item.action === "placeholder-toast") {
        toast("info", item.message ?? `${item.label}: in arrivo`, 4000);
        return;
      }

      // 2. Click guard: voce richiede modello ma activeModel === null.
      //    Toast educational con CTA "Apri galleria template" invece di
      //    disabilitare. Pattern coerente DEC-A4 FeatureButton.
      if (item.requiresModel && !hasModel) {
        toast(
          "info",
          `Carica un modello per accedere a "${item.label}".`,
          6000,
          {
            label: "Apri galleria template",
            onClick: () =>
              window.dispatchEvent(new Event("feapro:open-template-gallery")),
          },
        );
        return;
      }

      // 3. Dispatch normale
      switch (item.action) {
        case "navigate-home": {
          // Home = workspace default "modello" + chiusura panel laterali.
          // Reset workspace = "model" che porta alla home dashboard quando
          // activeId === null. Se modello attivo, resta nel viewport con
          // workspace make.
          setWorkspace(WORKSPACE_TO_LEGACY.modello);
          break;
        }
        case "open-models-browser": {
          window.dispatchEvent(new Event("feapro:open-models-list"));
          break;
        }
        case "workspace": {
          if (item.workspace) {
            setWorkspace(WORKSPACE_TO_LEGACY[item.workspace]);
          }
          break;
        }
        case "workspace-with-preset": {
          if (item.workspace) {
            setWorkspace(WORKSPACE_TO_LEGACY[item.workspace]);
          }
          if (item.preset) {
            setAnalysisType(PRESET_TO_ANALYSIS_TYPE[item.preset]);
          }
          break;
        }
        case "open-report-dialog": {
          window.dispatchEvent(new Event("feapro:open-export-pdf"));
          break;
        }
        case "open-template-gallery": {
          window.dispatchEvent(new Event("feapro:open-template-gallery"));
          break;
        }
        case "open-docs-help": {
          // HelpSheet sliding panel via workspaceStore.setHelp(true).
          useWorkspaceStore.getState().setHelp(true);
          break;
        }
        default: {
          // Exhaustiveness check (TypeScript verifica che tutti i kind siano gestiti).
          const _exhaustive: never = item.action;
          void _exhaustive;
        }
      }
    },
    [setWorkspace, setAnalysisType],
  );
}
