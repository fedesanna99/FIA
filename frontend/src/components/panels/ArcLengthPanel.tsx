/**
 * ArcLengthPanel — solver post-buckling Crisfield (BL-2).
 *
 * Path-following cylindrical arc-length: il predittore avanza nello spazio
 * (λ, u) con un passo di lunghezza Δs, il correttore risolve un vincolo
 * quadratico (a·δλ² + b·δλ + c = 0) selezionando la radice col massimo
 * prodotto scalare (criterio Crisfield 1981).
 *
 * Adatto a snap-through, snap-back e post-buckling con softening.
 */
import { useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as ReTooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { Play, Compass } from "lucide-react";
import { useModelStore } from "../../store/modelStore";
import { useResultsStore } from "../../store/resultsStore";
import { type ArcLengthResults } from "../../api/analysis_ext";
import { toast } from "../../store/toastStore";
import type { StaticResults } from "../../types/results";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Field, NumericInput } from "../ui/Input";
import { Badge } from "../ui/Badge";
import { EmptyState } from "../ui/EmptyState";
import { useCostPreview } from "../../hooks/useCostPreview";
import { useJobRun } from "../../hooks/useJobRun";
import { CostPreviewDialog } from "../dialogs/billing/CostPreviewDialog";

export function ArcLengthPanel() {
  const model = useModelStore((s) => s.model);
  const setStatic = useResultsStore((s) => s.setStatic);
  const [nSteps,        setNSteps]        = useState(30);
  const [deltaS,        setDeltaS]        = useState(0);          // 0 = auto
  const [maxIter,       setMaxIter]       = useState(25);
  const [tol,           setTol]           = useState(1e-6);
  const [controlDof,    setControlDof]    = useState<number | "">("");
  const [lambdaMax,     setLambdaMax]     = useState(50);
  const [deltaMax,      setDeltaMax]      = useState(1.0);
  const [initialLambda, setInitialLambda] = useState(0.05);
  const [results, setResults] = useState<ArcLengthResults | null>(null);

  const job = useJobRun<ArcLengthResults>({
    onSuccess: (r) => {
      setResults(r);
      const staticLike: StaticResults = {
        analysis_type: "static",
        model_id: r.model_id,
        displacements: r.final_displacements,
        reactions: [],
        element_forces: [],
        element_stresses: [],
        max_displacement: r.steps.length > 0
          ? Math.max(...r.steps.map((s) => s.max_displacement))
          : 0,
        max_stress: 0,
        n_dofs: 0,
        solve_time_ms: r.solve_time_ms,
      };
      setStatic(staticLike);
      toast(
        r.converged_all ? "success" : "warning",
        r.converged_all
          ? `Arc-length: ${r.steps.length} step path-following — deformata nel viewport`
          : `Arc-length: ${r.steps.filter(s => s.converged).length}/${r.steps.length} step convergenti — deformata nel viewport`,
      );
    },
    onError: (e) => toast("error", `Errore arc-length: ${e.message}`),
  });

  const preview = useCostPreview();
  const handleSolve = () => {
    if (!model) {
      toast("error", "Nessun modello attivo");
      return;
    }
    const params = {
      n_steps:        nSteps,
      delta_s:        deltaS > 0 ? deltaS : null,
      max_iter:       maxIter,
      tol,
      control_dof:    controlDof === "" ? null : controlDof,
      lambda_max:     lambdaMax,
      delta_max:      deltaMax,
      initial_lambda: initialLambda,
    };
    preview.previewAndRun(
      { model_id: model.id, solver: "arclength", params: { n_steps: nSteps } },
      () => job.mutate({ model_id: model.id, solver: "arclength", params }),
    );
  };

  const chartData = results
    ? results.lambda_curve.map((lam, i) => ({
        lambda: lam,
        delta: results.delta_curve[i] ?? 0,
      }))
    : [];

  const lambdaPeak = results ? Math.max(...results.lambda_curve) : 0;

  return (
    <div className="p-3 space-y-3">
      <Card
        title="Arc-length (Crisfield 1981)"
        description="Path-following cylindrical: utile per post-buckling, snap-through e softening dove Newton-Raphson load-controlled fallisce."
      >
        <div className="grid grid-cols-2 gap-2 mb-3">
          <Field label="N° step" hint="Punti del path">
            <NumericInput value={nSteps} onChange={setNSteps} step={1} min={2} max={500} />
          </Field>
          <Field label="Δs (0=auto)" hint="Lunghezza arc step">
            <NumericInput value={deltaS} onChange={setDeltaS} step={0.01} min={0} max={10} />
          </Field>
          <Field label="Max iter/step" hint="Iterazioni corrector">
            <NumericInput value={maxIter} onChange={setMaxIter} step={1} min={1} max={200} />
          </Field>
          <Field label="Tolleranza" hint="‖r‖ residuo relativo">
            <NumericInput value={tol} onChange={setTol} step={1e-7} min={1e-12} max={1e-2} />
          </Field>
          <Field label="DoF di controllo" hint="opzionale, vuoto = max |u|">
            <input
              type="number"
              className="input"
              placeholder="auto"
              value={controlDof === "" ? "" : controlDof}
              onChange={(e) =>
                setControlDof(e.target.value === "" ? "" : Number(e.target.value))
              }
            />
          </Field>
          <Field label="λ_init" hint="Predittore primo step">
            <NumericInput value={initialLambda} onChange={setInitialLambda} step={0.01} min={1e-4} max={1} />
          </Field>
          <Field label="λ_max" hint="Stop di sicurezza">
            <NumericInput value={lambdaMax} onChange={setLambdaMax} step={1} min={1} max={1000} />
          </Field>
          <Field label="δ_max [m]" hint="Stop su spostamento">
            <NumericInput value={deltaMax} onChange={setDeltaMax} step={0.1} min={0.01} max={100} />
          </Field>
        </div>
        <Button
          variant="run" size="sm"
          iconLeft={<Play className="h-3.5 w-3.5" />}
          disabled={!model || job.isPending}
          loading={job.isPending}
          onClick={handleSolve}
        >
          {job.isPending ? "In esecuzione…" : "Esegui arc-length"}
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
          <Card
            title="Equilibrium path λ vs δ"
            description="Traccia continua del percorso; può tornare indietro (snap-back)."
          >
            {chartData.length > 1 ? (
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 6, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.06)" />
                    <XAxis
                      dataKey="delta" type="number"
                      tick={{ fontSize: 10 }}
                      label={{ value: "δ controllo [m]", position: "insideBottom", offset: -2, fontSize: 10 }}
                    />
                    <YAxis
                      tick={{ fontSize: 10 }}
                      label={{ value: "λ", angle: -90, position: "insideLeft", fontSize: 10 }}
                    />
                    <ReTooltip
                      contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", fontSize: 11 }}
                      formatter={(v: any) => Number(v).toFixed(4)}
                    />
                    <ReferenceLine y={lambdaPeak} stroke="var(--accent-warning)" strokeDasharray="3 3" />
                    <Line type="monotone" dataKey="lambda" stroke="var(--accent)" strokeWidth={2} dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-xs text-ink-3">Pochi step per tracciare il path.</div>
            )}
            <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
              <Stat label="Steps" value={String(results.steps.length)} />
              <Stat label="λ peak" value={lambdaPeak.toFixed(3)} highlight="ok" />
              <Stat label="Convergenza"
                    value={results.converged_all ? "Tutti OK" : "Parziale"}
                    highlight={results.converged_all ? "ok" : "warn"} />
            </div>
            <div className="mt-2 text-[10px] text-ink-3">
              Tempo solver: {results.solve_time_ms.toFixed(0)} ms
            </div>
          </Card>

          <Card
            title="Cronologia step"
            description="Δs (auto-adattato), iter, max |u| per ciascun arc step."
          >
            <div className="space-y-0.5 max-h-40 overflow-auto">
              {results.steps.slice(0, 60).map((s) => (
                <div
                  key={s.step}
                  className="flex items-center justify-between text-[11px] gap-2 font-mono"
                >
                  <span className="text-ink-3 w-8">#{s.step}</span>
                  <Badge size="sm" variant={s.converged ? "success" : "warn"}>
                    λ={s.load_factor.toFixed(3)}
                  </Badge>
                  <span className="text-ink-3">it={s.iterations}</span>
                  <span className="text-ink-3">Δs={s.arc_length.toExponential(1)}</span>
                  <span className="text-accent flex items-center gap-1">
                    <Compass className="h-3 w-3" />
                    δ={s.control_displacement.toExponential(2)}
                  </span>
                </div>
              ))}
              {results.steps.length > 60 && (
                <div className="text-[10px] text-ink-3 italic mt-1">
                  +{results.steps.length - 60} step non mostrati
                </div>
              )}
            </div>
          </Card>
        </>
      )}

      {!results && !job.isPending && (
        <EmptyState
          title="Nessun arc-length eseguito"
          description="Configura e premi 'Esegui arc-length'. Path-following adatto a snap-through, snap-back, post-buckling."
        />
      )}
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: "ok" | "warn" }) {
  const color = highlight === "warn" ? "text-warn" : highlight === "ok" ? "text-accent-success" : "text-ink";
  return (
    <div className="bg-bg/40 border border-border rounded px-2 py-1.5">
      <div className="font-mono text-[9px] uppercase tracking-wide-2 font-semibold text-ink-3">{label}</div>
      <div className={`text-sm font-mono ${color}`}>{value}</div>
    </div>
  );
}
