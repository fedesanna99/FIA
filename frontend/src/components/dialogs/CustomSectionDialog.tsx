/**
 * CustomSectionDialog (v2.2.0 audit-fix B4).
 *
 * Editor minimal per aggiungere una sezione personalizzata alla libreria.
 *
 * Modalità:
 *   - **Rettangolare**: input h, b → calcolo automatico A, Iy, Iz, Wely, Welz
 *   - **Circolare**: input D (diametro) → calcolo automatico
 *   - **Custom**: input diretto A, Iy, Iz, J (per profili speciali)
 *
 * POST a `/api/sections` via `materialsApi.addSection`. Su success invalida
 * la cache React Query `["sections"]` → SectionPicker si rinfresca.
 */
import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { materialsApi } from "../../api/client";
import { toast } from "../../store/toastStore";
import type { Section } from "../../types/material";
import { Dialog } from "./Dialog";


interface Props {
  open: boolean;
  onClose: () => void;
  /** Callback con l'id creato (auto-select nel picker). */
  onCreated?: (sectionId: string) => void;
}


type SectionType = "rectangular" | "circular" | "custom";

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


/** Calcoli geometrici dalla forma. Input in mm, output in SI (m, m², m⁴). */
function rectangleProps(hMm: number, bMm: number) {
  const h = hMm / 1000, b = bMm / 1000;
  const A = b * h;
  const Iy = (b * h ** 3) / 12;
  const Iz = (h * b ** 3) / 12;
  const Wely = Iy / (h / 2);
  const Welz = Iz / (b / 2);
  // Saint-Venant torsion for rectangle (β depends on h/b ratio, approx 0.229 per quadrato)
  const J = (1 / 3) * (Math.min(b, h)) ** 3 * Math.max(b, h);
  return { A, Iy, Iz, Wely, Welz, J, h, b };
}

function circleProps(dMm: number) {
  const D = dMm / 1000;
  const r = D / 2;
  const A = Math.PI * r * r;
  const Iy = (Math.PI * D ** 4) / 64;
  const Iz = Iy;
  const Wely = Iy / r;
  const Welz = Wely;
  const J = (Math.PI * D ** 4) / 32;
  return { A, Iy, Iz, Wely, Welz, J, h: D, b: D };
}


export function CustomSectionDialog({ open, onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [type, setType] = useState<SectionType>("rectangular");
  // Rettangolare/circolare
  const [hMm, setHMm] = useState("300");
  const [bMm, setBMm] = useState("200");
  const [dMm, setDMm] = useState("200");
  // Custom (input diretto)
  const [aCm2, setACm2] = useState("100");
  const [iyCm4, setIyCm4] = useState("8333");
  const [izCm4, setIzCm4] = useState("8333");
  const [jCm4, setJCm4] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const qc = useQueryClient();

  // Preview proprietà calcolate dalla geometria.
  const preview = useMemo(() => {
    if (type === "rectangular") {
      const h = Number(hMm); const b = Number(bMm);
      if (!Number.isFinite(h) || !Number.isFinite(b) || h <= 0 || b <= 0) return null;
      return rectangleProps(h, b);
    }
    if (type === "circular") {
      const D = Number(dMm);
      if (!Number.isFinite(D) || D <= 0) return null;
      return circleProps(D);
    }
    // Custom: converti da cm² / cm⁴ → m² / m⁴
    const A = Number(aCm2) * 1e-4;
    const Iy = Number(iyCm4) * 1e-8;
    const Iz = Number(izCm4) * 1e-8;
    const J = Number(jCm4) * 1e-8;
    if (!Number.isFinite(A) || A <= 0) return null;
    if (!Number.isFinite(Iy) || !Number.isFinite(Iz)) return null;
    return { A, Iy, Iz, Wely: 0, Welz: 0, J, h: undefined, b: undefined };
  }, [type, hMm, bMm, dMm, aCm2, iyCm4, izCm4, jCm4]);

  function reset() {
    setName(""); setType("rectangular"); setHMm("300"); setBMm("200"); setDMm("200");
    setACm2("100"); setIyCm4("8333"); setIzCm4("8333"); setJCm4("0");
    setError(null);
  }
  function handleClose() {
    reset();
    onClose();
  }

  const mutation = useMutation({
    mutationFn: () => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error("Nome obbligatorio");
      if (!preview) throw new Error("Geometria/proprietà non valide");
      const payload: Section = {
        id: `custom_${slugify(trimmed)}_${Date.now().toString(36)}`,
        name: trimmed,
        type: type === "custom" ? "custom" : (type === "rectangular" ? "rectangular" : "circular"),
        A: preview.A,
        Iy: preview.Iy,
        Iz: preview.Iz,
        J: preview.J,
        // Wely/Welz/Wply/Wplz sono opzionali nel backend (default 0); il
        // type frontend ha solo Wply/Wplz. Per non duplicare lo schema TS
        // li passiamo come 0 e lasciamo che il backend usi i propri default
        // se servono per EC3 (computati dal solver da Iy/h).
        Wply: 0,
        Wplz: 0,
        h: preview.h,
        b: preview.b,
      };
      return materialsApi.addSection(payload);
    },
    onSuccess: (s) => {
      qc.invalidateQueries({ queryKey: ["sections"] });
      toast("success", `Sezione "${s.name}" creata.`);
      onCreated?.(s.id);
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
      title="Sezione personalizzata"
      width={480}
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
            form="custom-section-form"
            disabled={mutation.isPending || !preview}
            data-testid="custom-section-submit"
            className="bg-accent text-white border border-accent px-4 py-1.5 text-sm font-medium hover:bg-accent-hover disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
          >
            {mutation.isPending ? "Salvataggio…" : "Crea sezione"}
          </button>
        </>
      }
    >
      <form id="custom-section-form" onSubmit={handleSubmit} className="space-y-3" noValidate>
        <label className="block">
          <span className={fieldLabel}>Nome <span className="text-coral">*</span></span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Es. Trave 400×200"
            data-testid="custom-section-name"
            required
            autoFocus
            className={inputCls}
          />
        </label>

        <div>
          <span className={fieldLabel}>Forma</span>
          <div className="grid grid-cols-3 border border-border bg-bg-panel p-0.5">
            {(["rectangular", "circular", "custom"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                data-testid={`custom-section-type-${t}`}
                className={`py-1.5 font-mono text-[11px] uppercase tracking-wide-1 font-semibold transition-colors ${
                  type === t ? "bg-accent text-white" : "text-ink-3 hover:text-ink hover:bg-bg-hover"
                }`}
              >
                {t === "rectangular" ? "Rettangolare" : t === "circular" ? "Circolare" : "Custom"}
              </button>
            ))}
          </div>
        </div>

        {type === "rectangular" && (
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className={fieldLabel}>h (mm)</span>
              <input type="number" step="any" min="0" value={hMm}
                onChange={(e) => setHMm(e.target.value)}
                data-testid="custom-section-h"
                className={`${inputCls} font-mono tabular-nums`} />
            </label>
            <label className="block">
              <span className={fieldLabel}>b (mm)</span>
              <input type="number" step="any" min="0" value={bMm}
                onChange={(e) => setBMm(e.target.value)}
                data-testid="custom-section-b"
                className={`${inputCls} font-mono tabular-nums`} />
            </label>
          </div>
        )}

        {type === "circular" && (
          <label className="block">
            <span className={fieldLabel}>Diametro D (mm)</span>
            <input type="number" step="any" min="0" value={dMm}
              onChange={(e) => setDMm(e.target.value)}
              data-testid="custom-section-d"
              className={`${inputCls} font-mono tabular-nums`} />
          </label>
        )}

        {type === "custom" && (
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className={fieldLabel}>A (cm²)</span>
              <input type="number" step="any" min="0" value={aCm2}
                onChange={(e) => setACm2(e.target.value)}
                data-testid="custom-section-A"
                className={`${inputCls} font-mono tabular-nums`} />
            </label>
            <label className="block">
              <span className={fieldLabel}>J torsione (cm⁴)</span>
              <input type="number" step="any" min="0" value={jCm4}
                onChange={(e) => setJCm4(e.target.value)}
                data-testid="custom-section-J"
                className={`${inputCls} font-mono tabular-nums`} />
            </label>
            <label className="block">
              <span className={fieldLabel}>Iy (cm⁴)</span>
              <input type="number" step="any" min="0" value={iyCm4}
                onChange={(e) => setIyCm4(e.target.value)}
                data-testid="custom-section-Iy"
                className={`${inputCls} font-mono tabular-nums`} />
            </label>
            <label className="block">
              <span className={fieldLabel}>Iz (cm⁴)</span>
              <input type="number" step="any" min="0" value={izCm4}
                onChange={(e) => setIzCm4(e.target.value)}
                data-testid="custom-section-Iz"
                className={`${inputCls} font-mono tabular-nums`} />
            </label>
          </div>
        )}

        {/* Preview proprietà calcolate */}
        {preview && (
          <div className="border border-border-light bg-bg-elevated p-2.5 text-[11px] space-y-1" data-testid="custom-section-preview">
            <div className="font-mono text-[9px] uppercase tracking-wide-1 text-ink-3 font-semibold">
              Proprietà calcolate
            </div>
            <div className="grid grid-cols-3 gap-x-3 gap-y-1 font-mono text-[11px] tabular-nums">
              <span className="text-ink-3">A</span>
              <span className="text-ink col-span-2">{(preview.A * 1e4).toFixed(2)} cm²</span>
              <span className="text-ink-3">Iy</span>
              <span className="text-ink col-span-2">{(preview.Iy * 1e8).toFixed(1)} cm⁴</span>
              <span className="text-ink-3">Iz</span>
              <span className="text-ink col-span-2">{(preview.Iz * 1e8).toFixed(1)} cm⁴</span>
              {preview.Wely > 0 && (
                <>
                  <span className="text-ink-3">Wely</span>
                  <span className="text-ink col-span-2">{(preview.Wely * 1e6).toFixed(1)} cm³</span>
                </>
              )}
              <span className="text-ink-3">J</span>
              <span className="text-ink col-span-2">{(preview.J * 1e8).toFixed(1)} cm⁴</span>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 px-3 py-2 bg-bg-danger border border-danger/40 text-sm text-danger" role="alert">
            <span className="font-mono text-[11px] uppercase tracking-wide-1 font-semibold flex-shrink-0">!</span>
            <span>{error}</span>
          </div>
        )}

        <div className="text-[11px] text-ink-3 leading-snug pt-1 border-t border-border">
          Le formule sono <span className="font-mono">A=bh</span> e
          {" "}<span className="font-mono">I=bh³/12</span> per rettangoli,
          {" "}<span className="font-mono">πD⁴/64</span> per cerchi. La modalità
          custom permette input diretto di A, Iy, Iz, J (per profili speciali).
        </div>
      </form>
    </Dialog>
  );
}
