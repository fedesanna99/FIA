/**
 * NodeDialog (Precision v2.0 PR17 T7) — Precision-aligned.
 *
 * @deprecated v1.5 Task 32 — sostituito da NodeDetail nel RightPanel Inspect.
 * Resta per retrocompatibilita' (shortcut N, doppio-click nodo, palette).
 */
import { useState, useEffect, useMemo } from "react";
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

/** Reusable precision input field with mono uppercase label. */
function FieldInput({
  label, value, onChange, unit, disabled, autoFocus, type = "text", step,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  unit?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  type?: string;
  step?: string;
}) {
  return (
    <label className="block">
      <span className="block font-mono text-[10px] uppercase tracking-wide-1 text-ink-3 mb-1.5">
        {label}
        {unit && <span className="text-ink-4 normal-case tracking-normal ml-1">{unit}</span>}
      </span>
      <input
        type={type}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        autoFocus={autoFocus}
        className={[
          "w-full px-2.5 py-1.5 text-sm bg-bg-elevated border border-border-light text-ink",
          "focus:border-accent focus:outline-none transition-colors",
          "disabled:bg-bg-hover disabled:text-ink-3 disabled:cursor-not-allowed",
          type === "number" ? "font-mono tabular-nums" : "",
        ].join(" ")}
      />
    </label>
  );
}

export function NodeDialog({ open, onClose, editNodeId = null }: Props) {
  const model = useModelStore((s) => s.model);
  const addNode = useModelStore((s) => s.addNode);
  const updateNode = useModelStore((s) => s.updateNode);
  const editing = editNodeId != null
    ? model?.nodes.find((n) => n.id === editNodeId)
    : null;

  // v3.3.0 audit-fix L3.2-P0-1: nextId in useMemo deps stabili (era ricomputato
  // ad ogni render → effect ri-trigger → state utente sovrascritto live).
  // Memoizziamo solo su model.nodes (length+ids) snapshot.
  const nextId = useMemo(
    () => (model?.nodes.reduce((m, n) => Math.max(m, n.id), 0) ?? 0) + 1,
    [model?.nodes],
  );
  const [id, setId] = useState(editing?.id ?? nextId);
  const [x, setX] = useState(editing?.x ?? 0);
  const [y, setY] = useState(editing?.y ?? 0);
  const [z, setZ] = useState(editing?.z ?? 0);
  const [label, setLabel] = useState(editing?.label ?? "");
  const qc = useQueryClient();

  // v3.3.0 audit-fix L3.2-P0-1: effect dipende SOLO da `open` + `editing?.id`
  // (NON da nextId che cambia con model.nodes). Calcoliamo nextId al volo
  // dentro l'effect solo in modalità add (no editing). Risultato: utente
  // che sta scrivendo le coord NON vede più i campi sovrascritti se un
  // altro thread aggiunge un nodo.
  useEffect(() => {
    if (!open) return;
    if (editing) {
      setId(editing.id);
      setX(editing.x); setY(editing.y); setZ(editing.z);
      setLabel(editing.label ?? "");
    } else {
      const freshNextId = (model?.nodes.reduce((m, n) => Math.max(m, n.id), 0) ?? 0) + 1;
      setId(freshNextId);
      setX(0); setY(0); setZ(0); setLabel("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.id]);

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
      width={440}
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
            data-testid="node-save"
            className="inline-flex items-center gap-1.5 bg-accent text-white border border-accent px-4 py-1.5 text-sm font-medium hover:bg-accent-hover disabled:opacity-50 disabled:cursor-wait"
          >
            {mutation.isPending && (
              <span className="inline-block w-3 h-3 border-[1.5px] border-white/40 border-t-white animate-spin" />
            )}
            {mutation.isPending ? "..." : (editing ? "Salva" : "Aggiungi nodo")}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <FieldInput
          label="ID nodo"
          value={id}
          onChange={(v) => setId(Number(v))}
          disabled={!!editing}
          type="number"
        />
        <FieldInput
          label="Etichetta"
          unit="· opzionale"
          value={label}
          onChange={setLabel}
        />
        <FieldInput
          label="Coord. X"
          unit="[m]"
          type="number"
          step="0.1"
          value={x}
          onChange={(v) => setX(Number(v))}
          autoFocus={!!editing}
        />
        <FieldInput
          label="Coord. Y"
          unit="[m]"
          type="number"
          step="0.1"
          value={y}
          onChange={(v) => setY(Number(v))}
        />
        <FieldInput
          label="Coord. Z"
          unit="[m]"
          type="number"
          step="0.1"
          value={z}
          onChange={(v) => setZ(Number(v))}
        />
      </div>
    </Dialog>
  );
}
