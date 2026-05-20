import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog } from "./Dialog";
import { modelsApi } from "../../api/client";
import { useModelStore } from "../../store/modelStore";

interface Props {
  open: boolean;
  onClose: () => void;
}

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
    <Dialog open={open} onClose={onClose} title="Modifica modello"
      footer={
        <>
          <button className="btn" onClick={onClose}>Annulla</button>
          <button className="btn btn-primary" onClick={() => mut.mutate()} disabled={mut.isPending || !model}>
            {mut.isPending ? "Salvo..." : "Salva"}
          </button>
        </>
      }
    >
      <div className="space-y-3 text-xs">
        <div>
          <label className="label block mb-1">Nome</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>
        <div>
          <label className="label block mb-1">Descrizione</label>
          <textarea className="input min-h-[60px]" value={description}
                    onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div>
          <label className="label block mb-1">Unità di misura</label>
          <select className="input" value={units} onChange={(e) => setUnits(e.target.value as any)}>
            <option value="SI">SI (m, N, Pa)</option>
            <option value="kN-m">kN-m (m, kN, kPa)</option>
            <option value="N-mm">N-mm (mm, N, MPa)</option>
          </select>
        </div>
      </div>
    </Dialog>
  );
}
