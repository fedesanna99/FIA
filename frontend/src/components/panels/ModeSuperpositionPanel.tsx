/**
 * ModeSuperpositionPanel — sovrapposizione modale (FASE 16).
 *
 * Per ciascun modo modale disponibile, uno slider weight ∈ [-1, +1].
 * La combinazione u = Σ w_i · φ_i viene normalizzata a max=1 e
 * amplificata di `amplitude`. Output: deformata risultante (tabella),
 * pronta per essere visualizzata nel viewport in M4-stretch.
 */
import { useState, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { Layers } from "lucide-react";
import { useModelStore } from "../../store/modelStore";
import { useResultsStore } from "../../store/resultsStore";
import { postprocessApi, type ModeSuperResponse } from "../../api/postprocess";
import { toast } from "../../store/toastStore";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { EmptyState } from "../ui/EmptyState";

export function ModeSuperpositionPanel() {
  const model = useModelStore((s) => s.model);
  const { modalResults } = useResultsStore();

  const nModes = modalResults?.modes?.length ?? 0;
  const [weights, setWeights] = useState<number[]>([]);
  const [amplitude, setAmplitude] = useState(1.0);
  const [normalize, setNormalize] = useState(true);
  const [result, setResult] = useState<ModeSuperResponse | null>(null);

  // Inizializza weights quando arrivano i modi
  useMemo(() => {
    if (nModes > 0 && weights.length !== nModes) {
      const initial = new Array(nModes).fill(0);
      if (nModes > 0) initial[0] = 1;
      setWeights(initial);
    }
  }, [nModes]);

  const mut = useMutation({
    mutationFn: () => {
      if (!model) throw new Error("Nessun modello");
      if (weights.length === 0) throw new Error("Nessun modo disponibile");
      return postprocessApi.modeSuperposition(model.id, {
        weights, amplitude, normalize,
      });
    },
    onSuccess: (r) => {
      setResult(r);
      toast("success", `Sovrapposizione: ${r.n_modes_used} modi, max nodale calcolato`);
    },
    onError: (e) => toast("error", `Errore: ${(e as Error).message}`),
  });

  const updateWeight = (i: number, v: number) => {
    setWeights((s) => s.map((w, j) => (j === i ? v : w)));
  };

  if (nModes === 0) {
    return (
      <div className="p-3">
        <EmptyState
          title="Nessun risultato modale"
          description="Esegui un'analisi modale per attivare la sovrapposizione."
        />
      </div>
    );
  }

  return (
    <div className="p-3 space-y-3">
      <Card
        title="Sovrapposizione modale"
        description="Combina modi propri come u = Σ w_i · φ_i. Usato per superposition time-history o visualizzazione modi misti."
      >
        <div className="space-y-2">
          {modalResults!.modes.slice(0, nModes).map((mode, i) => (
            <div key={i} className="space-y-0.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-ink">
                  Modo #{i + 1}
                  <span className="text-ink-dim ml-1.5 font-mono">
                    {mode.frequency_hz.toFixed(2)} Hz
                  </span>
                </span>
                <span className="text-ink font-mono">{weights[i]?.toFixed(2) ?? "0.00"}</span>
              </div>
              <input
                type="range" min="-1" max="1" step="0.05"
                value={weights[i] ?? 0}
                onChange={(e) => updateWeight(i, Number(e.target.value))}
                className="w-full accent-accent"
              />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-border">
          <div>
            <label className="text-xs font-medium text-ink-muted block mb-1">Amplitude</label>
            <input
              type="number" step="0.1" min="0.01"
              className="w-full h-8 px-2.5 rounded-md text-sm font-mono bg-bg-elevated border border-border text-ink"
              value={amplitude} onChange={(e) => setAmplitude(Number(e.target.value) || 1)}
            />
          </div>
          <label className="flex items-center gap-2 text-xs mt-5">
            <input type="checkbox" checked={normalize}
                   onChange={(e) => setNormalize(e.target.checked)} />
            <span>Normalizza max|u|=1</span>
          </label>
        </div>

        <div className="flex items-center gap-2 mt-3">
          <Button variant="primary" size="sm"
                  iconLeft={<Layers className="h-3.5 w-3.5" />}
                  disabled={!model || mut.isPending}
                  loading={mut.isPending}
                  onClick={() => mut.mutate()}>
            Calcola sovrapposizione
          </Button>
          <Badge size="sm" variant="muted">{nModes} modi disponibili</Badge>
        </div>
      </Card>

      {result && (
        <Card title="Deformata combinata"
              description={`${result.deformed.length} nodi · pesi [${result.weights_used.map((w) => w.toFixed(2)).join(", ")}]`}>
          <div className="space-y-1 max-h-48 overflow-auto">
            {result.deformed.slice(0, 20).map((d) => {
              const mag = Math.hypot(d.ux, d.uy, d.uz);
              return (
                <div key={d.node_id} className="flex items-center justify-between text-xs font-mono">
                  <span className="text-ink-dim">#{d.node_id}</span>
                  <span>ux={d.ux.toExponential(2)}</span>
                  <span>uy={d.uy.toExponential(2)}</span>
                  <span>uz={d.uz.toExponential(2)}</span>
                  <Badge size="sm" variant={mag > 0.7 ? "accent" : "muted"}>
                    |u|={mag.toExponential(1)}
                  </Badge>
                </div>
              );
            })}
            {result.deformed.length > 20 && (
              <div className="text-[10px] text-ink-dim italic">
                +{result.deformed.length - 20} nodi non mostrati
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
