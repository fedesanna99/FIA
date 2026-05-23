/**
 * MaterialDialog (Precision v2.0 PR17 T7) — crea materiale custom Precision-aligned.
 *
 * Aggiunge un materiale personalizzato alla libreria. Mostra anteprima derivati
 * G (shear modulus) e K (bulk modulus).
 */
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog } from "./Dialog";
import { materialsApi } from "../../api/client";

interface Props {
  open: boolean;
  onClose: () => void;
}

const fieldLabel = "block font-mono text-[10px] uppercase tracking-wide-1 text-ink-3 mb-1.5";
const inputCls = "w-full px-2.5 py-1.5 text-sm bg-bg-elevated border border-border-light text-ink focus:border-accent focus:outline-none transition-colors";
const numInputCls = `${inputCls} font-mono tabular-nums`;

export function MaterialDialog({ open, onClose }: Props) {
  const qc = useQueryClient();
  const [id, setId] = useState("custom_mat_1");
  const [name, setName] = useState("Materiale personalizzato 1");
  const [E_GPa, setE_GPa] = useState(200);
  const [nu, setNu] = useState(0.3);
  const [rho, setRho] = useState(7850);
  const [fy_MPa, setFy_MPa] = useState<number | null>(null);
  const [color, setColor] = useState("#0891B2");

  const mut = useMutation({
    mutationFn: () => materialsApi.addMaterial({
      id, name,
      E: E_GPa * 1e9,
      nu,
      rho,
      fy: fy_MPa !== null && Number.isFinite(fy_MPa) ? fy_MPa * 1e6 : undefined,
      color,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["materials"] });
      onClose();
    },
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Crea materiale personalizzato"
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
            onClick={() => mut.mutate()}
            disabled={mut.isPending}
            className="inline-flex items-center gap-1.5 bg-accent text-white border border-accent px-4 py-1.5 text-sm font-medium hover:bg-accent-hover disabled:opacity-50 disabled:cursor-wait"
          >
            {mut.isPending && (
              <span className="inline-block w-3 h-3 border-[1.5px] border-white/40 border-t-white animate-spin" />
            )}
            {mut.isPending ? "Salvo…" : "Salva in libreria"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className={fieldLabel}>ID materiale</span>
            <input className={numInputCls} value={id} onChange={(e) => setId(e.target.value)} />
          </label>
          <label className="block">
            <span className={fieldLabel}>Nome</span>
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className={fieldLabel}>
              E <span className="text-ink-4 normal-case tracking-normal">· modulo elastico [GPa]</span>
            </span>
            <input type="number" step="0.1" className={numInputCls} value={E_GPa}
                   onChange={(e) => setE_GPa(Number(e.target.value))} />
          </label>
          <label className="block">
            <span className={fieldLabel}>
              ν <span className="text-ink-4 normal-case tracking-normal">· Poisson</span>
            </span>
            <input type="number" step="0.01" min={0} max={0.5} className={numInputCls} value={nu}
                   onChange={(e) => setNu(Number(e.target.value))} />
          </label>
          <label className="block">
            <span className={fieldLabel}>
              ρ <span className="text-ink-4 normal-case tracking-normal">· densità [kg/m³]</span>
            </span>
            <input type="number" step="10" className={numInputCls} value={rho}
                   onChange={(e) => setRho(Number(e.target.value))} />
          </label>
          <label className="block">
            <span className={fieldLabel}>
              fy <span className="text-ink-4 normal-case tracking-normal">· snervamento [MPa] · opz.</span>
            </span>
            <input type="number" step="1" className={numInputCls}
                   value={fy_MPa ?? ""}
                   onChange={(e) => setFy_MPa(e.target.value === "" ? null : Number(e.target.value))} />
          </label>
        </div>

        <div>
          <div className={fieldLabel}>Colore visualizzazione</div>
          <div className="flex items-center gap-2">
            <input type="color" className="w-12 h-9 border border-border-light cursor-pointer"
                   value={color} onChange={(e) => setColor(e.target.value)} />
            <input className={`${numInputCls} flex-1`} value={color}
                   onChange={(e) => setColor(e.target.value)} />
          </div>
        </div>

        <div className="border-t border-border pt-3">
          <div className="font-mono text-[10px] uppercase tracking-wide-2 text-ink-3 font-semibold mb-2">
            Anteprima derivati
          </div>
          <div className="grid grid-cols-2 gap-2 font-mono text-[12px]">
            <div className="flex justify-between bg-bg-panel border border-border px-2.5 py-1.5">
              <span className="text-ink-3">G = E/(2(1+ν))</span>
              <span className="text-ink font-semibold">{(E_GPa / (2 * (1 + nu))).toFixed(2)}<span className="text-ink-3 ml-1">GPa</span></span>
            </div>
            <div className="flex justify-between bg-bg-panel border border-border px-2.5 py-1.5">
              <span className="text-ink-3">K = E/(3(1−2ν))</span>
              <span className="text-ink font-semibold">{nu < 0.49 ? (E_GPa / (3 * (1 - 2 * nu))).toFixed(2) : "∞"}<span className="text-ink-3 ml-1">GPa</span></span>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
