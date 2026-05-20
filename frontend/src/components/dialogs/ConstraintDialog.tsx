/**
 * ConstraintDialog — vincoli (Fixed/Pinned/Roller/Custom/Spring).
 *
 * Estensione M2:
 *   - type=spring: input 6× spring_k [N/m] per i 6 GdL
 *   - flag `compression_only` (active-set, vedi FASE 9) — terreno no-tension
 */
import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog } from "./Dialog";
import { modelsApi } from "../../api/client";
import { useModelStore } from "../../store/modelStore";
import { toast } from "../../store/toastStore";
import type { ConstraintType } from "../../types/model";
import { TipBubble } from "../ui/TipBubble";

const CONSTRAINT_TYPES: { value: ConstraintType; label: string }[] = [
  { value: "fixed",    label: "Incastro (Fixed)" },
  { value: "pinned",   label: "Cerniera (Pinned)" },
  { value: "roller_x", label: "Carrello asse X" },
  { value: "roller_y", label: "Carrello asse Y" },
  { value: "roller_z", label: "Carrello asse Z" },
  { value: "custom",   label: "Personalizzato (6 GdL)" },
  { value: "spring",   label: "Molla elastica" },
];

const DOF_LABELS = ["uₓ", "uᵧ", "u_z", "θₓ", "θᵧ", "θ_z"];

interface Props {
  open: boolean;
  onClose: () => void;
  editConstraintId?: number | null;
}

export function ConstraintDialog({ open, onClose, editConstraintId = null }: Props) {
  const model = useModelStore((s) => s.model);
  const addConstraint = useModelStore((s) => s.addConstraint);
  const updateConstraintStore = useModelStore((s) => s.updateConstraint);
  const selectedNodes = useModelStore((s) => s.selectedNodeIds);
  const editing = editConstraintId != null
    ? model?.constraints.find((c) => c.id === editConstraintId)
    : null;
  const nextId = (model?.constraints.reduce((m, c) => Math.max(m, c.id), 0) ?? 0) + 1;
  const firstSelected = selectedNodes.values().next().value ?? 1;

  const [type, setType] = useState<ConstraintType>(editing?.type ?? "fixed");
  const [nodeId, setNodeId] = useState(editing?.node_id ?? firstSelected);
  const [dofs, setDofs] = useState<boolean[]>(
    editing?.dofs ?? [true, true, true, false, false, false],
  );
  const [springK, setSpringK] = useState<string[]>(
    (editing?.spring_k ?? [1e7, 1e7, 1e7, 0, 0, 0]).map(String),
  );
  const [compressionOnly, setCompressionOnly] = useState<boolean>(editing?.compression_only ?? false);
  const qc = useQueryClient();

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setType(editing.type);
      setNodeId(editing.node_id);
      setDofs(editing.dofs ?? [true, true, true, false, false, false]);
      setSpringK((editing.spring_k ?? [1e7, 1e7, 1e7, 0, 0, 0]).map(String));
      setCompressionOnly(editing.compression_only ?? false);
    }
  }, [open, editing]);

  const mutation = useMutation({
    mutationFn: () => {
      if (!model) throw new Error("Nessun modello");
      const useId = editing ? editing.id : nextId;
      const payload: any = {
        id: useId, type, node_id: nodeId,
        dofs: type === "custom" ? dofs : undefined,
      };
      if (type === "spring") {
        payload.spring_k = springK.map((s) => {
          const n = Number(s);
          return Number.isFinite(n) ? n : 0;
        });
        payload.compression_only = compressionOnly;
      }
      return editing
        ? modelsApi.updateConstraint(model.id, editing.id, payload)
        : modelsApi.addConstraint(model.id, payload);
    },
    onSuccess: (c) => {
      if (editing) {
        updateConstraintStore(editing.id, c);
        toast("success", `Vincolo #${c.id} aggiornato`);
      } else {
        addConstraint(c);
        toast("success", `Vincolo #${c.id} aggiunto`);
      }
      qc.invalidateQueries({ queryKey: ["model", model?.id] });
      onClose();
    },
  });

  return (
    <Dialog open={open} onClose={onClose}
      title={editing ? `Modifica vincolo #${editing.id}` : "Aggiungi vincolo"}
      width={460}
      footer={
        <>
          <button className="btn" onClick={onClose}>Annulla</button>
          <button className="btn btn-primary" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {editing ? "Salva" : "Aggiungi"}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        {mutation.isError && (
          <div className="text-accent-danger text-xs">{(mutation.error as Error).message}</div>
        )}
        <div>
          <label className="label block mb-1">Tipo</label>
          <select className="input" value={type} onChange={(e) => setType(e.target.value as ConstraintType)}>
            {CONSTRAINT_TYPES.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
          </select>
        </div>
        <div>
          <label className="label block mb-1">Nodo</label>
          <input type="number" className="input" value={nodeId}
                 onChange={(e) => setNodeId(Number(e.target.value))} />
        </div>

        {type === "custom" && (
          <div>
            <label className="label block mb-2">GdL bloccati</label>
            <div className="grid grid-cols-6 gap-1">
              {DOF_LABELS.map((d, i) => (
                <button
                  key={i}
                  className={`btn text-[10px] py-1 ${dofs[i] ? "btn-success" : ""}`}
                  onClick={() => setDofs(dofs.map((v, j) => j === i ? !v : v))}
                >{d}</button>
              ))}
            </div>
          </div>
        )}

        {type === "spring" && (
          <div className="space-y-2">
            <div>
              <label className="label block mb-2">Rigidezze molla [N/m, Nm/rad]</label>
              <div className="grid grid-cols-3 gap-2">
                {DOF_LABELS.map((d, i) => (
                  <div key={i}>
                    <label className="text-[10px] text-ink-dim block mb-0.5">{d}</label>
                    <input className="input numeric text-center"
                           placeholder="0"
                           value={springK[i]}
                           onChange={(e) => {
                             const next = [...springK];
                             next[i] = e.target.value;
                             setSpringK(next);
                           }} />
                  </div>
                ))}
              </div>
              <div className="text-[10px] text-ink-dim mt-1">
                Lascia 0 per GdL liberi. Tipici per suolo: 1e7–1e8 N/m sui GdL traslazionali.
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input type="checkbox" checked={compressionOnly}
                     onChange={(e) => setCompressionOnly(e.target.checked)} />
              <span>Solo compressione (no-tension)</span>
              <TipBubble tipId="compression-only" />
            </label>
            <div className="text-[10px] text-ink-dim leading-relaxed">
              Se attivo, la molla si disattiva quando in trazione → usa il risolutore
              unilaterale (active-set, FASE 9). Utile per modellare terreno che non
              resiste a trazione, contatti con gap, parti che si possono sollevare.
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}
