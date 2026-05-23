import { useMutation } from "@tanstack/react-query";
import { useAnalysisStore } from "../../store/analysisStore";
import { useResultsStore } from "../../store/resultsStore";
import { analysisApi } from "../../api/client";

export function AnalysisSettings() {
  const {
    analysisType, staticParams, modalParams, dynamicParams,
    setStaticParams, setModalParams, setDynamicParams,
  } = useAnalysisStore();
  const modalResults = useResultsStore((s) => s.modalResults);

  const rayleighMut = useMutation({
    mutationFn: (req: { f1_hz: number; f2_hz: number; damping_ratio: number }) =>
      analysisApi.rayleigh(req),
    onSuccess: (data) => {
      setDynamicParams({ rayleigh_alpha: data.alpha, rayleigh_beta: data.beta });
    },
  });

  const autoRayleigh = () => {
    if (!modalResults || modalResults.modes.length === 0) return;
    const f1 = modalResults.modes[0].frequency_hz;
    const f2 = modalResults.modes[Math.min(1, modalResults.modes.length - 1)].frequency_hz;
    rayleighMut.mutate({ f1_hz: f1, f2_hz: f2, damping_ratio: 0.05 });
  };

  return (
    <div className="p-3 text-xs">
      <div className="panel-header pl-0 border-b-0 mb-2">Parametri analisi</div>

      {analysisType === "static" && (
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={staticParams.include_self_weight}
              onChange={(e) => setStaticParams({ include_self_weight: e.target.checked })}
            />
            <span>Peso proprio</span>
          </label>
          <div>
            <label className="label block mb-1">g [m/s²]</label>
            <input
              type="number" step="0.01" className="input"
              value={staticParams.g}
              onChange={(e) => setStaticParams({ g: Number(e.target.value) })}
            />
          </div>
        </div>
      )}

      {analysisType === "modal" && (
        <div>
          <label className="label block mb-1">N. modi</label>
          <input
            type="number" min={1} max={50} className="input"
            value={modalParams.n_modes}
            onChange={(e) => setModalParams({ n_modes: Number(e.target.value) })}
          />
        </div>
      )}

      {analysisType === "buckling" && (
        <div className="text-ink-3 text-[11px] leading-relaxed">
          L'analisi di buckling lineare risolve K φ = λ K_G φ a partire dalla statica
          preliminare con i carichi correnti.<br />Apri il tab "Risultati" per lanciarla.
        </div>
      )}

      {analysisType === "dynamic" && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label block mb-1">Δt [s]</label>
            <input type="number" step="0.001" className="input"
                   value={dynamicParams.dt}
                   onChange={(e) => setDynamicParams({ dt: Number(e.target.value) })} />
          </div>
          <div>
            <label className="label block mb-1">t_end [s]</label>
            <input type="number" step="0.1" className="input"
                   value={dynamicParams.t_end}
                   onChange={(e) => setDynamicParams({ t_end: Number(e.target.value) })} />
          </div>
          <div>
            <label className="label block mb-1">β Newmark</label>
            <input type="number" step="0.01" className="input"
                   value={dynamicParams.beta}
                   onChange={(e) => setDynamicParams({ beta: Number(e.target.value) })} />
          </div>
          <div>
            <label className="label block mb-1">γ Newmark</label>
            <input type="number" step="0.01" className="input"
                   value={dynamicParams.gamma}
                   onChange={(e) => setDynamicParams({ gamma: Number(e.target.value) })} />
          </div>
          <div>
            <label className="label block mb-1">α Rayleigh</label>
            <input type="number" step="0.01" className="input"
                   value={dynamicParams.rayleigh_alpha}
                   onChange={(e) => setDynamicParams({ rayleigh_alpha: Number(e.target.value) })} />
          </div>
          <div>
            <label className="label block mb-1">β Rayleigh</label>
            <input type="number" step="0.0001" className="input"
                   value={dynamicParams.rayleigh_beta}
                   onChange={(e) => setDynamicParams({ rayleigh_beta: Number(e.target.value) })} />
          </div>
          <div className="col-span-2 mt-1">
            <button
              className="btn btn-primary w-full"
              disabled={!modalResults || modalResults.modes.length < 2 || rayleighMut.isPending}
              onClick={autoRayleigh}
              title="Calcola α,β di Rayleigh dalle prime due frequenze proprie (ξ=5%)"
            >
              {rayleighMut.isPending
                ? "Calcolo..."
                : modalResults && modalResults.modes.length >= 2
                  ? `Auto Rayleigh (f₁=${modalResults.modes[0].frequency_hz.toFixed(2)}, f₂=${modalResults.modes[1].frequency_hz.toFixed(2)} Hz)`
                  : "Auto Rayleigh (richiede analisi modale ≥ 2 modi)"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
