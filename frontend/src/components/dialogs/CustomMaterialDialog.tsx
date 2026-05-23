/**
 * CustomMaterialDialog (v2.2.0 audit-fix B4).
 *
 * Editor minimal per aggiungere un materiale personalizzato alla libreria.
 * Sostituisce il toast "Editor custom in arrivo nello Sprint 2".
 *
 * Campi essenziali:
 *   - Nome (string, libero) → genera automaticamente l'id slug
 *   - E [GPa] (input numerico — convertito a Pa per il backend)
 *   - ν Poisson (default 0.3)
 *   - ρ densità [kg/m³]
 *   - fy snervamento [MPa] opzionale (per metalli)
 *   - fck compressione [MPa] opzionale (per calcestruzzo)
 *
 * POST a `/api/materials` via `materialsApi.addMaterial`. Su success
 * invalida `["materials"]` React Query cache → MaterialPicker si rinfresca
 * con la nuova voce.
 */
import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { materialsApi } from "../../api/client";
import { toast } from "../../store/toastStore";
import type { Material } from "../../types/material";
import { Dialog } from "./Dialog";


interface Props {
  open: boolean;
  onClose: () => void;
  /** Callback con l'id creato (es. per auto-selezionarlo nel picker). */
  onCreated?: (materialId: string) => void;
}


const fieldLabel = "block font-mono text-[10px] uppercase tracking-wide-1 text-ink-3 mb-1.5 font-semibold";
const inputCls = "w-full px-2.5 py-1.5 text-sm bg-bg-elevated border border-border-light text-ink focus:border-accent focus:outline-none transition-colors";


function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[àáâãä]/g, "a")
    .replace(/[èéêë]/g, "e")
    .replace(/[ìíîï]/g, "i")
    .replace(/[òóôõö]/g, "o")
    .replace(/[ùúûü]/g, "u")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/(^_|_$)/g, "");
}


export function CustomMaterialDialog({ open, onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [eGPa, setEGPa] = useState("210");
  const [nu, setNu] = useState("0.30");
  const [rho, setRho] = useState("7850");
  const [fyMPa, setFyMPa] = useState("");
  const [fckMPa, setFckMPa] = useState("");
  const [error, setError] = useState<string | null>(null);
  const qc = useQueryClient();

  function reset() {
    setName(""); setEGPa("210"); setNu("0.30"); setRho("7850");
    setFyMPa(""); setFckMPa(""); setError(null);
  }
  function handleClose() {
    reset();
    onClose();
  }

  const mutation = useMutation({
    mutationFn: () => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error("Nome obbligatorio");
      const E_Pa = Number(eGPa) * 1e9;
      const nuVal = Number(nu);
      const rhoVal = Number(rho);
      if (!Number.isFinite(E_Pa) || E_Pa <= 0) throw new Error("E deve essere > 0 GPa");
      if (!Number.isFinite(nuVal) || nuVal < -0.5 || nuVal >= 0.5) throw new Error("ν deve essere in [-0.5, 0.5)");
      if (!Number.isFinite(rhoVal) || rhoVal <= 0) throw new Error("ρ deve essere > 0 kg/m³");
      const payload: Material = {
        id: `custom_${slugify(trimmed)}_${Date.now().toString(36)}`,
        name: trimmed,
        E: E_Pa,
        nu: nuVal,
        rho: rhoVal,
        color: "#9ca3af",
      };
      if (fyMPa.trim()) {
        const fy = Number(fyMPa) * 1e6;
        if (Number.isFinite(fy) && fy > 0) payload.fy = fy;
      }
      if (fckMPa.trim()) {
        const fck = Number(fckMPa) * 1e6;
        if (Number.isFinite(fck) && fck > 0) payload.fck = fck;
      }
      return materialsApi.addMaterial(payload);
    },
    onSuccess: (m) => {
      qc.invalidateQueries({ queryKey: ["materials"] });
      toast("success", `Materiale "${m.name}" creato.`);
      onCreated?.(m.id);
      handleClose();
    },
    onError: (e) => setError((e as Error).message),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    mutation.mutate();
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Materiale personalizzato"
      width={460}
      footer={
        <>
          <button
            type="button"
            onClick={handleClose}
            className="px-3 py-1.5 text-sm font-medium text-ink-2 hover:text-ink hover:bg-bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
          >
            Annulla
          </button>
          <button
            type="submit"
            form="custom-material-form"
            disabled={mutation.isPending}
            data-testid="custom-material-submit"
            className="bg-accent text-white border border-accent px-4 py-1.5 text-sm font-medium hover:bg-accent-hover disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
          >
            {mutation.isPending ? "Salvataggio…" : "Crea materiale"}
          </button>
        </>
      }
    >
      <form id="custom-material-form" onSubmit={handleSubmit} className="space-y-3" noValidate>
        <label className="block">
          <span className={fieldLabel}>Nome <span className="text-coral">*</span></span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Es. S355 calibrato"
            data-testid="custom-material-name"
            required
            autoFocus
            className={inputCls}
          />
        </label>

        <div className="grid grid-cols-3 gap-2">
          <label className="block">
            <span className={fieldLabel}>E (GPa)</span>
            <input type="number" step="any" min="0" value={eGPa}
              onChange={(e) => setEGPa(e.target.value)}
              data-testid="custom-material-E"
              className={`${inputCls} font-mono tabular-nums`} />
          </label>
          <label className="block">
            <span className={fieldLabel}>ν (−)</span>
            <input type="number" step="0.01" min="-0.5" max="0.499" value={nu}
              onChange={(e) => setNu(e.target.value)}
              data-testid="custom-material-nu"
              className={`${inputCls} font-mono tabular-nums`} />
          </label>
          <label className="block">
            <span className={fieldLabel}>ρ (kg/m³)</span>
            <input type="number" step="any" min="0" value={rho}
              onChange={(e) => setRho(e.target.value)}
              data-testid="custom-material-rho"
              className={`${inputCls} font-mono tabular-nums`} />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className={fieldLabel}>fy (MPa) <span className="text-ink-4 normal-case tracking-normal">opz.</span></span>
            <input type="number" step="any" min="0" value={fyMPa}
              onChange={(e) => setFyMPa(e.target.value)}
              placeholder="Snervamento (metalli)"
              data-testid="custom-material-fy"
              className={`${inputCls} font-mono tabular-nums`} />
          </label>
          <label className="block">
            <span className={fieldLabel}>fck (MPa) <span className="text-ink-4 normal-case tracking-normal">opz.</span></span>
            <input type="number" step="any" min="0" value={fckMPa}
              onChange={(e) => setFckMPa(e.target.value)}
              placeholder="Compressione (cls)"
              data-testid="custom-material-fck"
              className={`${inputCls} font-mono tabular-nums`} />
          </label>
        </div>

        {error && (
          <div className="flex items-start gap-2 px-3 py-2 bg-bg-danger border border-danger/40 text-sm text-danger" role="alert">
            <span className="font-mono text-[11px] uppercase tracking-wide-1 font-semibold flex-shrink-0">!</span>
            <span>{error}</span>
          </div>
        )}

        <div className="text-[11px] text-ink-3 leading-snug pt-1 border-t border-border">
          Salvato come <span className="font-mono">custom_*</span> nella libreria.
          G = E / 2(1+ν) viene calcolato automaticamente dal solver.
        </div>
      </form>
    </Dialog>
  );
}
