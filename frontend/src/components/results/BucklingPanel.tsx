import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { analysisApi } from "../../api/client";
import { useModelStore } from "../../store/modelStore";

export function BucklingPanel() {
  const model = useModelStore((s) => s.model);
  const [nModes, setNModes] = useState(3);
  const mut = useMutation({
    mutationFn: () => analysisApi.buckling(model!.id, { n_modes: nModes }),
  });

  if (!model) return null;

  return (
    <div className="space-y-3 text-xs">
      <div>
        <label className="label block mb-1">N. modi di buckling</label>
        <input type="number" min={1} max={20} className="input"
               value={nModes} onChange={(e) => setNModes(Number(e.target.value))} />
      </div>
      <button className="btn btn-primary w-full" onClick={() => mut.mutate()} disabled={mut.isPending}>
        {mut.isPending ? "Risolvo..." : "Calcola buckling lineare"}
      </button>

      {mut.error && (
        <div className="text-accent-danger text-[11px]">{(mut.error as Error).message}</div>
      )}

      {mut.data && (
        <div className="numeric">
          {mut.data.message && (
            <div className="text-accent-warning mb-2 text-[11px]">{mut.data.message}</div>
          )}
          <div className="mb-2">
            <span className="text-ink-3">Moltiplicatore critico λ₁:</span>{" "}
            <span className="text-accent-primary font-bold">
              {mut.data.critical_factor.toFixed(4)}
            </span>
          </div>
          <div className="text-[10px] text-ink-3 mb-1 uppercase">Tutti i moltiplicatori</div>
          <div className="divide-y divide-border">
            {mut.data.load_factors.map((lf, i) => (
              <div key={i} className="flex justify-between py-1">
                <span className="text-ink-3">Modo {i + 1}</span>
                <span className="text-ink">λ = {lf.toFixed(4)}</span>
              </div>
            ))}
          </div>
          <div className="text-[10px] text-ink-3 mt-2">
            Tempo solver: {mut.data.solve_time_ms.toFixed(0)} ms
          </div>
        </div>
      )}
    </div>
  );
}
