import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog } from "./Dialog";
import { materialsApi } from "../../api/client";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function MaterialDialog({ open, onClose }: Props) {
  const qc = useQueryClient();
  const [id, setId] = useState("custom_mat_1");
  const [name, setName] = useState("Materiale personalizzato 1");
  const [E_GPa, setE_GPa] = useState(200);
  const [nu, setNu] = useState(0.3);
  const [rho, setRho] = useState(7850);
  const [fy_MPa, setFy_MPa] = useState<number | null>(null);
  const [color, setColor] = useState("#7a8896");

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
    <Dialog open={open} onClose={onClose} title="Crea materiale personalizzato" width={460}
      footer={
        <>
          <button className="btn" onClick={onClose}>Annulla</button>
          <button className="btn btn-primary" onClick={() => mut.mutate()} disabled={mut.isPending}>
            {mut.isPending ? "Salvo..." : "Salva in libreria"}
          </button>
        </>
      }
    >
      <div className="space-y-3 text-xs">
        <div className="grid grid-cols-2 gap-2">
          <div><label className="label block mb-1">ID</label>
            <input className="input numeric" value={id} onChange={(e) => setId(e.target.value)} /></div>
          <div><label className="label block mb-1">Nome</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label block mb-1">E [GPa]</label>
            <input type="number" step="0.1" className="input numeric" value={E_GPa}
                   onChange={(e) => setE_GPa(Number(e.target.value))} />
          </div>
          <div>
            <label className="label block mb-1">ν (Poisson)</label>
            <input type="number" step="0.01" min={0} max={0.5} className="input numeric" value={nu}
                   onChange={(e) => setNu(Number(e.target.value))} />
          </div>
          <div>
            <label className="label block mb-1">ρ densità [kg/m³]</label>
            <input type="number" step="10" className="input numeric" value={rho}
                   onChange={(e) => setRho(Number(e.target.value))} />
          </div>
          <div>
            <label className="label block mb-1">fy snervamento [MPa] (opz.)</label>
            <input type="number" step="1" className="input numeric"
                   value={fy_MPa ?? ""}
                   onChange={(e) => setFy_MPa(e.target.value === "" ? null : Number(e.target.value))} />
          </div>
        </div>
        <div>
          <label className="label block mb-1">Colore</label>
          <div className="flex items-center gap-2">
            <input type="color" className="w-10 h-8 rounded cursor-pointer"
                   value={color} onChange={(e) => setColor(e.target.value)} />
            <input className="input numeric flex-1" value={color}
                   onChange={(e) => setColor(e.target.value)} />
          </div>
        </div>

        <div className="border-t border-border pt-2 numeric text-[11px] text-ink-muted">
          <div className="text-[10px] uppercase text-ink-muted mb-1">Anteprima derivati</div>
          <div className="flex justify-between">
            <span>G = E / (2(1+ν))</span>
            <span className="text-ink">{(E_GPa / (2 * (1 + nu))).toFixed(2)} GPa</span>
          </div>
          <div className="flex justify-between">
            <span>K = E / (3(1−2ν))</span>
            <span className="text-ink">{nu < 0.49 ? (E_GPa / (3 * (1 - 2 * nu))).toFixed(2) : "∞"} GPa</span>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
