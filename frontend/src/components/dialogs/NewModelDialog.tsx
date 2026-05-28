/**
 * NewModelDialog (Precision v2.0 PR17 T3) — Precision-aligned.
 *
 * Crea un nuovo modello FEA via API. Stile precision: hairline borders,
 * field-label mono uppercase, segmented control 2D/3D.
 */
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Box, Square } from "lucide-react";
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
      title="Nuovo modello"
      width={440}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={create.isPending}
            className="px-3 py-1.5 text-sm font-medium text-ink-2 hover:text-ink hover:bg-bg-hover disabled:opacity-50"
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={() => create.mutate()}
            disabled={create.isPending || !name.trim()}
            data-testid="new-model-create"
            className="inline-flex items-center gap-1.5 bg-accent text-white border border-accent px-4 py-1.5 text-sm font-medium hover:bg-accent-hover disabled:opacity-50 disabled:cursor-wait"
          >
            {create.isPending && (
              <span className="inline-block w-3 h-3 border-[1.5px] border-white/40 border-t-white animate-spin" />
            )}
            {create.isPending ? "Creazione…" : "Crea modello"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Field: Nome */}
        <label className="block">
          <span className="block font-mono text-[10px] uppercase tracking-wide-1 text-ink-3 mb-1.5">
            Nome modello
          </span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            data-testid="new-model-name"
            className="w-full px-2.5 py-1.5 text-sm bg-bg-elevated border border-border-light text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none transition-colors"
          />
        </label>

        {/* Field: Descrizione */}
        <label className="block">
          <span className="block font-mono text-[10px] uppercase tracking-wide-1 text-ink-3 mb-1.5">
            Descrizione <span className="text-ink-4 normal-case tracking-normal">· opzionale</span>
          </span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Note didattiche o riferimenti normativi…"
            className="w-full px-2.5 py-1.5 text-sm bg-bg-elevated border border-border-light text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none transition-colors resize-none"
          />
        </label>

        {/* Field: 2D/3D segmented control */}
        <div>
          <span className="block font-mono text-[10px] uppercase tracking-wide-1 text-ink-3 mb-1.5">
            Dimensione
          </span>
          <div className="grid grid-cols-2 gap-0 border border-border bg-bg-panel p-0.5">
            <button
              type="button"
              onClick={() => setIs3d(false)}
              data-testid="new-model-2d"
              className={[
                "inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium transition-colors",
                !is3d
                  ? "bg-accent text-white"
                  : "text-ink-3 hover:text-ink hover:bg-bg-hover",
              ].join(" ")}
            >
              <Square className="w-3.5 h-3.5" />
              2D <span className="font-mono text-[10px] opacity-80">· piano XY</span>
            </button>
            <button
              type="button"
              onClick={() => setIs3d(true)}
              data-testid="new-model-3d"
              className={[
                "inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium transition-colors",
                is3d
                  ? "bg-accent text-white"
                  : "text-ink-3 hover:text-ink hover:bg-bg-hover",
              ].join(" ")}
            >
              <Box className="w-3.5 h-3.5" />
              3D <span className="font-mono text-[10px] opacity-80">· spaziale</span>
            </button>
          </div>
        </div>

        {/* Note didattica */}
        <div className="text-[11px] text-ink-3 leading-snug pt-1 border-t border-border">
          Il modello verrà creato vuoto. Aggiungi nodi, elementi e carichi
          dal pannello <b className="text-ink-2">Make</b>, oppure parti da un{" "}
          <b className="text-ink-2">template</b> precaricato.
        </div>
      </div>
    </Dialog>
  );
}
