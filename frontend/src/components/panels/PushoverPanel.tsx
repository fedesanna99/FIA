/**
 * PushoverPanel — analisi pushover a controllo di carico (FASE 6).
 *
 * Carica i parametri (λ_step, λ_max, max_steps, δ_max) e mostra:
 *  - curva di capacità λ vs δ (recharts)
 *  - lista hinge events
 *  - collapse_lambda + reason
 *
 * Riferimento: NTC 2018 §7.3.4.1, EC8 §4.3.3.4.
 */
import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer } from "recharts";
import { Play } from "lucide-react";
import { useModelStore } from "../../store/modelStore";
import { type PushoverResults } from "../../api/analysis_ext";
import { toast } from "../../store/toastStore";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Field, NumericInput } from "../ui/Input";
import { Badge } from "../ui/Badge";
import { EmptyState } from "../ui/EmptyState";
import { useCostPreview } from "../../hooks/useCostPreview";
import { useJobRun } from "../../hooks/useJobRun";
import { CostPreviewDialog } from "../dialogs/billing/CostPreviewDialog";

export function PushoverPanel() {
  const model = useModelStore((s) => s.model);
  const [lambdaStep, setLambdaStep]   = useState(0.05);
  const [lambdaMax,  setLambdaMax]    = useState(5.0);
  const [maxSteps,   setMaxSteps]     = useState(200);
  const [deltaMax,   setDeltaMax]     = useState(1.0);
  const [results,    setResults]      = useState<PushoverResults | null>(null);

  const preview = useCostPreview();

  const job = useJobRun<PushoverResults>({
    onSuccess: (r) => {
      setResults(r);
      toast("success", `Push-over: ${r.steps.length} step, ${r.hinge_events.length} hinges`);
    },
    onError: (e) => toast("error", `Errore pushover: ${e.message}`),
  });

  const handleSolve = () => {
    if (!model) {
      toast("error", "Nessun modello attivo");
      return;
    }
    const params = {
      lambda_step: lambdaStep,
      lambda_max:  lambdaMax,
      max_steps:   maxSteps,
      delta_max_for_stop: deltaMax,
    };
    preview.previewAndRun(
      { model_id: model.id, solver: "pushover", params },
      () => job.mutate({ model_id: model.id, solver: "pushover", params }),
    );
  };

  const chartData = results?.steps.map((s) => ({
    delta: s.delta_control,
    lambda: s.lambda_value,
    hinges: s.n_hinges,
  })) ?? [];

  return (
    <div className="p-3 space-y-3">
      <Card
        title="Push-over (NTC §7.3.4.1)"
        description="Analisi non lineare a controllo di carico con cerniere plastiche concentrate (elasto-plastico perfetto, solo BEAM2D). Restituisce la curva di capacità λ–δ."
      >
        <div className="grid grid-cols-2 gap-2 mb-3">
          <Field label="λ step" hint="Incremento moltiplicatore">
            <NumericInput value={lambdaStep} onChange={setLambdaStep} step={0.01} min={0.001} max={1} />
          </Field>
          <Field label="λ max" hint="Limite superiore">
            <NumericInput value={lambdaMax} onChange={setLambdaMax} step={0.1} min={0.1} max={100} />
          </Field>
          <Field label="Max steps" hint="Stop di sicurezza">
            <NumericInput value={maxSteps} onChange={setMaxSteps} step={10} min={1} max={1000} />
          </Field>
          <Field label="δ max [m]" hint="Stop su spostamento">
            <NumericInput value={deltaMax} onChange={setDeltaMax} step={0.1} min={0.01} max={10} />
          </Field>
        </div>
        <Button
          variant="primary" size="sm"
          iconLeft={<Play className="h-3.5 w-3.5" />}
          disabled={!model || job.isPending}
          loading={job.isPending}
          onClick={handleSolve}
        >
          {job.isPending ? "In esecuzione…" : "Esegui pushover"}
        </Button>
      </Card>

      <CostPreviewDialog
        open={preview.open}
        estimate={preview.estimate}
        quota={preview.quota}
        isLoading={preview.isLoading}
        onConfirm={preview.confirm}
        onCancel={preview.cancel}
      />

      {results && (
        <>
          <Card title="Curva di capacità" description="Spostamento di controllo δ vs moltiplicatore di carico λ.">
            {chartData.length > 1 ? (
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 6, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="delta" tick={{ fontSize: 10 }} label={{ value: "δ [m]", position: "insideBottom", offset: -2, fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} label={{ value: "λ", angle: -90, position: "insideLeft", fontSize: 10 }} />
                    <ReTooltip
                      contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", fontSize: 11 }}
                      formatter={(v: any) => Number(v).toFixed(4)}
                    />
                    <Line type="monotone" dataKey="lambda" stroke="var(--accent)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-xs text-ink-dim">Pochi punti per tracciare la curva.</div>
            )}
            <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
              <Stat label="Steps" value={String(results.steps.length)} />
              <Stat label="Hinges" value={String(results.hinge_events.length)} />
              <Stat label="λ collapse"
                    value={results.collapse_lambda != null ? results.collapse_lambda.toFixed(3) : "—"} />
            </div>
            {results.collapse_reason && (
              <div className="mt-2 text-[10px] text-warn bg-warn/10 border border-warn/30 rounded px-2 py-1">
                {results.collapse_reason}
              </div>
            )}
          </Card>

          {results.hinge_events.length > 0 && (
            <Card title="Hinge events" description="Cerniere plastiche formatesi durante l'incremento.">
              <div className="space-y-1 max-h-40 overflow-auto">
                {results.hinge_events.slice(0, 40).map((h, i) => (
                  <div key={i} className="flex items-center justify-between text-xs gap-2">
                    <span className="text-ink-dim">step {h.step}</span>
                    <Badge size="sm" variant="warn">λ={h.lambda_value.toFixed(3)}</Badge>
                    <span className="text-ink">El. #{h.element_id}</span>
                    <span className="text-ink-dim">end {h.end}</span>
                    <span className="font-mono text-[10px]">
                      |M|={(Math.abs(h.M) / 1e3).toFixed(1)} kNm / Mpl={(h.M_pl / 1e3).toFixed(1)} kNm
                    </span>
                  </div>
                ))}
                {results.hinge_events.length > 40 && (
                  <div className="text-[10px] text-ink-dim italic mt-1">
                    +{results.hinge_events.length - 40} altri eventi non mostrati
                  </div>
                )}
              </div>
            </Card>
          )}
        </>
      )}

      {!results && !job.isPending && (
        <EmptyState
          title="Nessun pushover eseguito"
          description="Configura i parametri e premi 'Esegui pushover'. La curva di capacità apparirà qui."
        />
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-bg/40 border border-border rounded px-2 py-1.5">
      <div className="text-[9px] uppercase tracking-wider text-ink-dim">{label}</div>
      <div className="text-sm font-mono text-ink">{value}</div>
    </div>
  );
}
