import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog } from "./Dialog";
import { modelsApi } from "../../api/client";
import { useModelStore } from "../../store/modelStore";
import { toast } from "../../store/toastStore";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Se valorizzato, modifica un nodo esistente invece di crearne uno nuovo. */
  editNodeId?: number | null;
}

export function NodeDialog({ open, onClose, editNodeId = null }: Props) {
  const model = useModelStore((s) => s.model);
  const addNode = useModelStore((s) => s.addNode);
  const updateNode = useModelStore((s) => s.updateNode);
  const editing = editNodeId != null
    ? model?.nodes.find((n) => n.id === editNodeId)
    : null;

  const nextId = (model?.nodes.reduce((m, n) => Math.max(m, n.id), 0) ?? 0) + 1;
  const [id, setId] = useState(editing?.id ?? nextId);
  const [x, setX] = useState(editing?.x ?? 0);
  const [y, setY] = useState(editing?.y ?? 0);
  const [z, setZ] = useState(editing?.z ?? 0);
  const [label, setLabel] = useState(editing?.label ?? "");
  const qc = useQueryClient();

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setId(editing.id);
      setX(editing.x); setY(editing.y); setZ(editing.z);
      setLabel(editing.label ?? "");
    } else {
      setId(nextId);
      setX(0); setY(0); setZ(0); setLabel("");
    }
  }, [open, editing, nextId]);

  const mutation = useMutation({
    mutationFn: () => {
      if (!model) throw new Error("Nessun modello");
      const payload = { id, x, y, z, label: label || undefined };
      if (editing) {
        return modelsApi.updateNode(model.id, editing.id, payload);
      }
      return modelsApi.addNode(model.id, payload);
    },
    onSuccess: (n) => {
      if (editing) {
        updateNode(editing.id, n);
        toast("success", `Nodo #${n.id} aggiornato`);
      } else {
        addNode(n);
        toast("success", `Nodo #${n.id} aggiunto`);
      }
      qc.invalidateQueries({ queryKey: ["model", model?.id] });
      onClose();
    },
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={editing ? `Modifica nodo #${editing.id}` : "Aggiungi nodo"}
      footer={
        <>
          <button className="btn" onClick={onClose}>Annulla</button>
          <button className="btn btn-primary" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "..." : (editing ? "Salva" : "Aggiungi")}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label block mb-1">ID</label>
          <input type="number" className="input" value={id}
                 onChange={(e) => setId(Number(e.target.value))}
                 disabled={!!editing} />
        </div>
        <div>
          <label className="label block mb-1">Etichetta</label>
          <input className="input" value={label} onChange={(e) => setLabel(e.target.value)} />
        </div>
        <div>
          <label className="label block mb-1">X [m]</label>
          <input type="number" step="0.1" className="input numeric" value={x}
                 onChange={(e) => setX(Number(e.target.value))} autoFocus={!!editing} />
        </div>
        <div>
          <label className="label block mb-1">Y [m]</label>
          <input type="number" step="0.1" className="input numeric" value={y}
                 onChange={(e) => setY(Number(e.target.value))} />
        </div>
        <div>
          <label className="label block mb-1">Z [m]</label>
          <input type="number" step="0.1" className="input numeric" value={z}
                 onChange={(e) => setZ(Number(e.target.value))} />
        </div>
      </div>
    </Dialog>
  );
}
