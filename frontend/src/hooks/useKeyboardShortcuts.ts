import { useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useModelStore } from "../store/modelStore";
import { useAnalysisStore } from "../store/analysisStore";
import { useRunAnalysis } from "./useAnalysis";
import { modelsApi } from "../api/client";

type DialogOpener = (kind: "node" | "element" | "load" | "constraint" | "mesh" | "help") => void;

/**
 * Shortcut globali stile CAD/FEM:
 *   Delete / Backspace → elimina selezione (nodi e/o elementi) lato backend
 *   Escape             → deseleziona
 *   N                  → aggiungi nodo
 *   E                  → aggiungi elemento
 *   L                  → aggiungi carico
 *   C                  → aggiungi vincolo
 *   M                  → mesh wizard
 *   F5 / Ctrl+Enter    → esegui analisi corrente
 *
 * Gli shortcut sono inattivi quando il focus è su input/textarea.
 */
export function useKeyboardShortcuts(openDialog: DialogOpener) {
  const model = useModelStore((s) => s.model);
  const selNodes = useModelStore((s) => s.selectedNodeIds);
  const selElems = useModelStore((s) => s.selectedElementIds);
  const removeNode = useModelStore((s) => s.removeNode);
  const removeElement = useModelStore((s) => s.removeElement);
  const clearSelection = useModelStore((s) => s.clearSelection);
  const viewportTool = useAnalysisStore((s) => s.viewportTool);
  const setViewportTool = useAnalysisStore((s) => s.setViewportTool);
  const qc = useQueryClient();
  const runAnalysis = useRunAnalysis();

  const del = useMutation({
    mutationFn: async () => {
      if (!model) return;
      for (const nid of selNodes) {
        await modelsApi.deleteNode(model.id, nid);
        removeNode(nid);
      }
      for (const eid of selElems) {
        await modelsApi.deleteElement(model.id, eid);
        removeElement(eid);
      }
      qc.invalidateQueries({ queryKey: ["model", model.id] });
    },
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if ((e.target as HTMLElement | null)?.isContentEditable) return;

      if ((e.key === "Delete" || e.key === "Backspace") && (selNodes.size + selElems.size > 0)) {
        e.preventDefault();
        del.mutate();
        return;
      }
      if (e.key === "Escape") {
        if (viewportTool !== "select") setViewportTool("select");
        else clearSelection();
        return;
      }
      if (e.key === "F5" || ((e.ctrlKey || e.metaKey) && e.key === "Enter")) {
        e.preventDefault();
        runAnalysis();
        return;
      }
      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        openDialog("help"); return;
      }
      if (e.ctrlKey || e.altKey || e.metaKey || e.shiftKey) return;

      switch (e.key.toLowerCase()) {
        case "n": openDialog("node"); break;
        case "e": openDialog("element"); break;
        case "l": openDialog("load"); break;
        case "c": openDialog("constraint"); break;
        case "m": openDialog("mesh"); break;
        case "p": setViewportTool(viewportTool === "create_node" ? "select" : "create_node"); break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [del, openDialog, selNodes, selElems, clearSelection, runAnalysis, viewportTool, setViewportTool]);
}
