/**
 * ConstraintDialog (Precision v2.0 PR17 T7) — vincoli Precision-aligned.
 *
 * Vincoli Fixed/Pinned/Roller/Custom/Spring + flag compression_only
 * (active-set per terreno no-tension). Hairline borders, mono labels.
 */
import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog } from "./Dialog";
import { modelsApi } from "../../api/client";
import { useModelStore } from "../../store/modelStore";
import { toast } from "../../store/toastStore";
import type { ConstraintType } from "../../types/model";
import { TipBubble } from "../ui/TipBubble";

// v2.1.8 audit-fix: label esplicite sulla convention del solver. La
// nomenclatura `roller_X` indica "blocca traslazione X" (lascia libere Y, Z e
// rotazioni). Non confondere con altri software (Ansys/SAP usano la convention
// opposta "asse di scorrimento"). Per trave bi-appoggiata orizzontale lungo X
// con gravità in -Y: pinned a sx + roller_y a dx.
const CONSTRAINT_TYPES: { value: ConstraintType; label: string; hint: string }[] = [
  { value: "fixed",    label: "Incastro (tutti i GdL)",       hint: "Blocca uₓ uᵧ u_z θₓ θᵧ θ_z" },
  { value: "pinned",   label: "Cerniera (3 traslazioni)",     hint: "Blocca uₓ uᵧ u_z · rotazioni libere" },
  { value: "roller_x", label: "Carrello — blocca uₓ",         hint: "Solo uₓ vincolato · libero in Y e Z" },
  { value: "roller_y", label: "Carrello — blocca uᵧ",         hint: "Solo uᵧ vincolato · libero in X e Z · classico carrello bi-appoggiata" },
  { value: "roller_z", label: "Carrello — blocca u_z",        hint: "Solo u_z vincolato · libero in X e Y" },
  { value: "custom",   label: "Personalizzato — 6 GdL",       hint: "Scegli quali DOF bloccare" },
  { value: "spring",   label: "Molla elastica",               hint: "Rigidezze K per ogni DOF" },
];

const DOF_LABELS = ["uₓ", "uᵧ", "u_z", "θₓ", "θᵧ", "θ_z"];

const fieldLabel = "block font-mono text-[10px] uppercase tracking-wide-1 text-ink-3 mb-1.5";
const inputCls = "w-full px-2.5 py-1.5 text-sm bg-bg-elevated border border-border-light text-ink focus:border-accent focus:outline-none transition-colors";

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    <Dialog
      open={open}
      onClose={onClose}
      title={editing ? `Modifica vincolo #${editing.id}` : "Aggiungi vincolo"}
      width={480}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-sm font-medium text-ink-2 hover:text-ink hover:bg-bg-hover"
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            data-testid="constraint-save"
            className="inline-flex items-center gap-1.5 bg-accent text-white border border-accent px-4 py-1.5 text-sm font-medium hover:bg-accent-hover disabled:opacity-50 disabled:cursor-wait"
          >
            {mutation.isPending && (
              <span className="inline-block w-3 h-3 border-[1.5px] border-white/40 border-t-white animate-spin" />
            )}
            {editing ? "Salva" : "Aggiungi vincolo"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {mutation.isError && (
          <div className="flex items-start gap-2 px-3 py-2 bg-bg-danger border border-danger/40 text-sm text-danger">
            <span className="font-mono text-[11px] uppercase tracking-wide-1 font-semibold flex-shrink-0">!</span>
            <span>{(mutation.error as Error).message}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className={fieldLabel}>Tipo vincolo</span>
            <select className={inputCls} value={type} onChange={(e) => setType(e.target.value as ConstraintType)}>
              {CONSTRAINT_TYPES.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
            </select>
          </label>
          <label className="block">
            <span className={fieldLabel}>Nodo</span>
            <input type="number" className={`${inputCls} font-mono tabular-nums`} value={nodeId}
                   onChange={(e) => setNodeId(Number(e.target.value))} />
          </label>
        </div>

        {/* v2.1.8 audit-fix: hint esplicativo del vincolo selezionato.
            Risolve ambiguità "roller_X = blocca X" (convention codice) vs
            "roller_X = asse di scorrimento X" (convention Ansys/SAP). */}
        <div className="px-3 py-2 border border-border-light bg-bg-elevated text-[11px] text-ink-2 leading-snug" data-testid="constraint-hint">
          <span className="font-mono text-[9px] uppercase tracking-wide-1 text-ink-3 font-semibold mr-1.5">Cosa fa</span>
          {CONSTRAINT_TYPES.find((t) => t.value === type)?.hint ?? ""}
        </div>

        {type === "custom" && (
          <div>
            <div className={fieldLabel}>GdL bloccati</div>
            <div className="grid grid-cols-6 gap-1 border border-border bg-bg-panel p-0.5">
              {DOF_LABELS.map((d, i) => (
                <button
                  key={i}
                  type="button"
                  className={[
                    "py-1.5 font-mono text-[11px] font-semibold transition-colors",
                    dofs[i]
                      ? "bg-success text-white"
                      : "text-ink-3 hover:text-ink hover:bg-bg-hover",
                  ].join(" ")}
                  onClick={() => setDofs(dofs.map((v, j) => j === i ? !v : v))}
                >{d}</button>
              ))}
            </div>
            <div className="text-[11px] text-ink-3 mt-1.5 leading-snug">
              Click su un GdL per bloccarlo (verde) o liberarlo.
            </div>
          </div>
        )}

        {type === "spring" && (
          <div className="space-y-3">
            <div>
              <div className={fieldLabel}>
                Rigidezze molla <span className="text-ink-4 normal-case tracking-normal">· [N/m, Nm/rad]</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {DOF_LABELS.map((d, i) => (
                  <div key={i}>
                    <div className="font-mono text-[10px] text-ink-3 mb-0.5">{d}</div>
                    <input className={`${inputCls} font-mono tabular-nums text-center`}
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
              <div className="text-[11px] text-ink-3 mt-1.5 leading-snug">
                Lascia 0 per GdL liberi. Tipici per suolo: 1e7–1e8 N/m sui GdL traslazionali.
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                checked={compressionOnly}
                onChange={(e) => setCompressionOnly(e.target.checked)}
                className="w-3.5 h-3.5 border border-border-light accent-accent"
              />
              <span className="text-ink-2">Solo compressione (no-tension)</span>
              <TipBubble tipId="compression-only" />
            </label>
            <div className="text-[11px] text-ink-3 leading-snug">
              Se attivo, la molla si disattiva quando in trazione → usa il solver unilaterale
              (active-set). Utile per modellare terreno che non resiste a trazione, contatti con
              gap, parti che si possono sollevare.
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}
