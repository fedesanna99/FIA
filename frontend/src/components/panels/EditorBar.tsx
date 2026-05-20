import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useModelStore } from "../../store/modelStore";
import { useUIStore } from "../../store/uiStore";
import { useAnalysisStore } from "../../store/analysisStore";
import { modelsApi } from "../../api/client";
import { NodeDialog } from "../dialogs/NodeDialog";
import { ElementDialog } from "../dialogs/ElementDialog";
import { LoadDialog } from "../dialogs/LoadDialog";
import { ConstraintDialog } from "../dialogs/ConstraintDialog";
import { MeshWizardDialog } from "../dialogs/MeshWizardDialog";

export function EditorBar() {
  const open = useUIStore((s) => s.openDialog);
  const setOpen = useUIStore((s) => s.setOpenDialog);
  const editNodeId = useUIStore((s) => s.editNodeId);
  const editElementId = useUIStore((s) => s.editElementId);
  const editLoadId = useUIStore((s) => s.editLoadId);
  const editConstraintId = useUIStore((s) => s.editConstraintId);
  const viewportTool = useAnalysisStore((s) => s.viewportTool);
  const setViewportTool = useAnalysisStore((s) => s.setViewportTool);
  const model = useModelStore((s) => s.model);
  const selNodes = useModelStore((s) => s.selectedNodeIds);
  const selElems = useModelStore((s) => s.selectedElementIds);
  const removeNode = useModelStore((s) => s.removeNode);
  const removeElement = useModelStore((s) => s.removeElement);
  const qc = useQueryClient();

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

  const hasSelection = selNodes.size + selElems.size > 0;
  const disabled = !model;

  return (
    <>
      <div className="px-3 py-2 border-b border-border flex items-center gap-1 flex-wrap text-xs">
        <span className="label mr-1">Editor</span>
        <button className="btn" disabled={disabled} onClick={() => setOpen("node")} title="Aggiungi nodo (N)">+ Nodo</button>
        <button
          className={`btn ${viewportTool === "create_node" ? "btn-primary" : ""}`}
          disabled={disabled}
          onClick={() => setViewportTool(viewportTool === "create_node" ? "select" : "create_node")}
          title="Click sul viewport per piazzare nodi (P) — Esc per uscire"
        >
          {viewportTool === "create_node" ? "🎯 Esci" : "🎯 Place"}
        </button>
        <button className="btn" disabled={disabled} onClick={() => setOpen("element")} title="Aggiungi elemento (E)">+ Elem</button>
        <button className="btn" disabled={disabled} onClick={() => setOpen("load")} title="Aggiungi carico (L)">+ Carico</button>
        <button className="btn" disabled={disabled} onClick={() => setOpen("constraint")} title="Aggiungi vincolo (C)">+ Vinc</button>
        <button className="btn" disabled={disabled} onClick={() => setOpen("mesh")} title="Wizard mesh (M)">⊞ Mesh</button>
        <button
          className="btn btn-danger ml-auto"
          disabled={disabled || !hasSelection || del.isPending}
          onClick={() => del.mutate()}
          title="Elimina selezione (Del)"
        >
          🗑 Elimina
        </button>
      </div>
      <NodeDialog open={open === "node"} onClose={() => setOpen(null)} editNodeId={editNodeId} />
      <ElementDialog open={open === "element"} onClose={() => setOpen(null)} editElementId={editElementId} />
      <LoadDialog open={open === "load"} onClose={() => setOpen(null)} editLoadId={editLoadId} />
      <ConstraintDialog open={open === "constraint"} onClose={() => setOpen(null)} editConstraintId={editConstraintId} />
      <MeshWizardDialog open={open === "mesh"} onClose={() => setOpen(null)} />
    </>
  );
}
