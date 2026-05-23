/**
 * NonlinearPanel — analisi statica non-lineare (BL-1).
 *
 * Solver: Newton-Raphson load-controlled con K_T = K_E + K_G (per beam) e
 * cavi tension-only (Cable2D/Cable3D con Ernst modulus). Restituisce la
 * cronologia per step (load factor, residuo, iterazioni, cavi attivi/slack)
 * + spostamenti / sollecitazioni finali.
 *
 * Riferimento: Crisfield (1991) Non-Linear FE Analysis, vol. 1.
 */
import { useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as ReTooltip, ResponsiveContainer,
} from "recharts";
import { Play, GitBranch } from "lucide-react";
import { useModelStore } from "../../store/modelStore";
import { useResultsStore } from "../../store/resultsStore";
import { type NonLinearResults } from "../../api/analysis_ext";
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

export function NonlinearPanel() {
  const model = useModelStore((s) => s.model);
  const setStatic = useResultsStore((s) => s.setStatic);
  const [nSteps,       setNSteps]       = useState(10);
  const [maxIter,      setMaxIter]      = useState(25);
  const [tol,          setTol]          = useState(1e-6);
  const [includeKgBeam, setIncludeKgBeam] = useState(true);
  const [results, setResults] = useState<NonLinearResults | null>(null);

  const job = useJobRun<NonLinearResults>({
    onSuccess: (r) => {
      setResults(r);
      const staticLike: StaticResults = {
        analysis_type: "static",
        model_id: r.model_id,
        displacements: r.final_displacements,
        reactions: [],
        element_forces: (r.final_element_forces ?? []).map((f) => ({
          element_id: f.element_id,
          N_i: f.N_i ?? 0, Vy_i: f.Vy_i ?? 0, Vz_i: f.Vz_i ?? 0,
          Mx_i: 0, My_i: f.My_i ?? 0, Mz_i: f.Mz_i ?? 0,
          N_j: f.N_j ?? 0, Vy_j: f.Vy_j ?? 0, Vz_j: f.Vz_j ?? 0,
          Mx_j: 0, My_j: f.My_j ?? 0, Mz_j: f.Mz_j ?? 0,
        })),
        element_stresses: [],
        max_displacement: r.max_displacement,
        max_stress: 0,
        n_dofs: 0,
        solve_time_ms: r.solve_time_ms,
      };
      setStatic(staticLike);
      toast(
        r.converged ? "success" : "warning",
        r.converged
          ? `Newton-Raphson: ${r.steps.length} step convergenti — deformata nel viewport`
          : `Newton-Raphson: ${r.steps.filter(s => s.converged).length}/${r.steps.length} step convergenti — deformata nel viewport`,
      );
    },
    onError: (e) => toast("error", `Errore non-lineare: ${e.message}`),
  });

  const preview = useCostPreview();
  const handleSolve = () => {
    if (!model) {
      toast("error", "Nessun modello attivo");
      return;
    }
    const params = {
      n_steps:        nSteps,
      max_iter:       maxIter,
      tol,
      include_kg_beam: includeKgBeam,
    };
    preview.previewAndRun(
      { model_id: model.id, solver: "nonlinear", params: { n_steps: nSteps, max_iter: maxIter } },
      () => job.mutate({ model_id: model.id, solver: "nonlinear", params }),
    );
  };

  const chartData = results?.steps.map((s) => ({
    lambda: s.load_factor,
    delta: s.max_displacement,
    iter: s.iterations,
  })) ?? [];

  return (
    <div className="p-3 space-y-3">
      <Card
        title="Statica non-lineare (Newton-Raphson)"
        description="Solver path-following con rigidezza tangente K_T = K_E + K_G (geometrica per beam) e cavi tension-only con modulo di Ernst (cable sag)."
      >
        <div className="grid grid-cols-2 gap-2 mb-3">
          <Field label="N° step" hint="Incrementi di carico">
            <NumericInput value={nSteps} onChange={setNSteps} step={1} min={1} max={500} />
          </Field>
          <Field label="Max iter / step" hint="Tetto NR per step">
            <NumericInput value={maxIter} onChange={setMaxIter} step={1} min={1} max={200} />
          </Field>
          <Field label="Tolleranza" hint="‖r‖ / ‖F‖ residuo relativo">
            <NumericInput value={tol} onChange={setTol} step={1e-7} min={1e-12} max={1e-2} />
          </Field>
          <Field label="K_G beam" hint="Includi K geom. per beam">
            <label className="flex items-center gap-2 cursor-pointer text-xs h-8">
              <input
                type="checkbox"
                checked={includeKgBeam}
                onChange={(e) => setIncludeKgBeam(e.target.checked)}
              />
              <span>{includeKgBeam ? "Attivo" : "Disattivato"}</span>
            </label>
          </Field>
        </div>
        <Button
          variant="run" size="sm"
          iconLeft={<Play className="h-3.5 w-3.5" />}
          disabled={!model || job.isPending}
          loading={job.isPending}
          onClick={handleSolve}
        >
          {job.isPending ? "In esecuzione…" : "Esegui non-lineare"}
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
            title="Curva carico-spostamento"
            description="λ vs max ‖u‖ — non-lineare path."
          >
            {chartData.length > 1 ? (
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 6, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.06)" />
                    <XAxis
                      dataKey="delta"
                      type="number"
                      tick={{ fontSize: 10 }}
                      label={{ value: "max |u| [m]", position: "insideBottom", offset: -2, fontSize: 10 }}
                    />
                    <YAxis
                      tick={{ fontSize: 10 }}
                      label={{ value: "λ", angle: -90, position: "insideLeft", fontSize: 10 }}
                    />
                    <ReTooltip
                      contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", fontSize: 11 }}
                      formatter={(v: any) => Number(v).toExponential(3)}
                    />
                    <Line type="monotone" dataKey="lambda" stroke="var(--accent)" strokeWidth={2} dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-xs text-ink-3">Pochi step per tracciare la curva.</div>
            )}
            <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
              <Stat label="Steps" value={String(results.steps.length)} />
              <Stat label="Convergenza"
                    value={results.converged ? "OK" : "Parziale"}
                    highlight={results.converged ? "ok" : "warn"} />
              <Stat label="max |u|" value={results.max_displacement.toExponential(2) + " m"} />
            </div>
            <div className="mt-2 text-[10px] text-ink-3">
              Tempo solver: {results.solve_time_ms.toFixed(0)} ms
            </div>
          </Card>

          <Card
            title="Cronologia step"
            description="Dettaglio per ogni incremento di carico."
          >
            <div className="space-y-0.5 max-h-40 overflow-auto">
              {results.steps.map((s) => (
                <div
                  key={s.step}
                  className="flex items-center justify-between text-[11px] gap-2 font-mono"
                >
                  <span className="text-ink-3 w-12">#{s.step}</span>
                  <Badge size="sm" variant={s.converged ? "success" : "warn"}>
                    λ={s.load_factor.toFixed(3)}
                  </Badge>
                  <span className="text-ink-3">it={s.iterations}</span>
                  <span className="text-ink-3">
                    r={s.residual_norm.toExponential(1)}
                  </span>
                  {(s.active_cables > 0 || s.slack_cables > 0) && (
                    <span className="text-accent flex items-center gap-1">
                      <GitBranch className="h-3 w-3" />
                      {s.active_cables}↑/{s.slack_cables}↓
                    </span>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {!results && !job.isPending && (
        <EmptyState
          title="Nessuna analisi non-lineare eseguita"
          description="Configura i parametri e premi 'Esegui non-lineare'. Indicato per modelli con cavi (tension-only), travi snelle o carichi rilevanti rispetto al buckling."
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
