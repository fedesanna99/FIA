import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog } from "./Dialog";
import { modelsApi } from "../../api/client";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: (id: string) => void;
}

export function NewModelDialog({ open, onClose, onCreated }: Props) {
  const [name, setName] = useState("Nuovo modello");
  const [description, setDescription] = useState("");
  const [is3d, setIs3d] = useState(true);
  const qc = useQueryClient();

  const create = useMutation({
    mutationFn: () => modelsApi.create({ name, description, is_3d: is3d }),
    onSuccess: (m) => {
      qc.invalidateQueries({ queryKey: ["models"] });
      onCreated?.(m.id);
      onClose();
    },
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Nuovo modello FEA"
      footer={
        <>
          <button className="btn" onClick={onClose} disabled={create.isPending}>Annulla</button>
          <button
            className="btn btn-primary"
            onClick={() => create.mutate()}
            disabled={create.isPending || !name.trim()}
          >
            {create.isPending ? "Creazione..." : "Crea"}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="label block mb-1">Nome</label>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>
        <div>
          <label className="label block mb-1">Descrizione</label>
          <textarea
            className="input min-h-[60px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div>
          <label className="label block mb-1">Tipo</label>
          <div className="flex gap-2">
            <button
              className={`btn flex-1 ${is3d ? "" : "btn-primary"}`}
              onClick={() => setIs3d(false)}
            >2D (piano XY)</button>
            <button
              className={`btn flex-1 ${is3d ? "btn-primary" : ""}`}
              onClick={() => setIs3d(true)}
            >3D (spaziale)</button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
