/**
 * EditModelDialog (Precision v2.0 PR17 T3) — Precision-aligned.
 *
 * Modifica nome, descrizione, unità di un modello esistente.
 * Stesso linguaggio NewModelDialog: field-label mono uppercase,
 * input hairline border, segmented control unità.
 */
import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog } from "./Dialog";
import { modelsApi } from "../../api/client";
import { useModelStore } from "../../store/modelStore";

interface Props {
  open: boolean;
  onClose: () => void;
}

const UNIT_OPTIONS = [
  { value: "SI" as const,   label: "SI",   sub: "m · N · Pa" },
  { value: "kN-m" as const, label: "kN·m", sub: "m · kN · kPa" },
  { value: "N-mm" as const, label: "N·mm", sub: "mm · N · MPa" },
];

export function EditModelDialog({ open, onClose }: Props) {
  const model = useModelStore((s) => s.model);
  const setModel = useModelStore((s) => s.setModel);
  const qc = useQueryClient();
  const [name, setName] = useState(model?.name ?? "");
  const [description, setDescription] = useState(model?.description ?? "");
  const [units, setUnits] = useState<"SI" | "kN-m" | "N-mm">(model?.units ?? "SI");

  useEffect(() => {
    if (open && model) {
      setName(model.name);
      setDescription(model.description ?? "");
      setUnits(model.units);
    }
  }, [open, model]);

  const mut = useMutation({
    mutationFn: () => {
      if (!model) throw new Error("Nessun modello");
      const patched = { ...model, name, description, units };
      return modelsApi.update(model.id, patched);
    },
    onSuccess: (m) => {
      setModel(m);
      qc.invalidateQueries({ queryKey: ["models"] });
      qc.invalidateQueries({ queryKey: ["model", m.id] });
      onClose();
    },
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Modifica modello"
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
            onClick={() => mut.mutate()}
            disabled={mut.isPending || !model || !name.trim()}
            data-testid="edit-model-save"
            className="inline-flex items-center gap-1.5 bg-accent text-white border border-accent px-4 py-1.5 text-sm font-medium hover:bg-accent-hover disabled:opacity-50 disabled:cursor-wait"
          >
            {mut.isPending && (
              <span className="inline-block w-3 h-3 border-[1.5px] border-white/40 border-t-white animate-spin" />
            )}
            {mut.isPending ? "Salvo…" : "Salva modifiche"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <label className="block">
          <span className="block font-mono text-[10px] uppercase tracking-wide-1 text-ink-3 mb-1.5">
            Nome modello
          </span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            data-testid="edit-model-name"
            className="w-full px-2.5 py-1.5 text-sm bg-bg-elevated border border-border-light text-ink focus:border-accent focus:outline-none transition-colors"
          />
        </label>

        <label className="block">
          <span className="block font-mono text-[10px] uppercase tracking-wide-1 text-ink-3 mb-1.5">
            Descrizione
          </span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-2.5 py-1.5 text-sm bg-bg-elevated border border-border-light text-ink focus:border-accent focus:outline-none transition-colors resize-none"
          />
        </label>

        <div>
          <span className="block font-mono text-[10px] uppercase tracking-wide-1 text-ink-3 mb-1.5">
            Unità di misura
          </span>
          <div className="grid grid-cols-3 gap-0 border border-border bg-bg-panel p-0.5">
            {UNIT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setUnits(opt.value)}
                className={[
                  "flex flex-col items-center justify-center gap-0.5 py-2 text-sm font-medium transition-colors",
                  units === opt.value
                    ? "bg-accent text-white"
                    : "text-ink-3 hover:text-ink hover:bg-bg-hover",
                ].join(" ")}
              >
                <span>{opt.label}</span>
                <span className={[
                  "font-mono text-[9px] tracking-wide-1",
                  units === opt.value ? "text-white/80" : "text-ink-4",
                ].join(" ")}>
                  {opt.sub}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
