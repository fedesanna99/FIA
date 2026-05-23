/**
 * NonlinearWizard (v2.2.4 — feature) — wizard 3-step Newton-Raphson o
 * Arc-Length Crisfield per analisi non-lineari geometriche.
 *
 * Sostituisce la scorciatoia "apri SolvePanel · nonlin" introdotta in
 * v2.2.0 B8 con un vero wizard guidato:
 *
 *   1. Algoritmo   → Newton-Raphson (incrementale-iterativo) o
 *                    Arc-Length Crisfield (snap-through / cavi)
 *   2. Parametri   → n_steps + max_iter + tol + (Kg beam toggle)
 *   3. Esegui      → riepilogo + Run + risultati convergenza
 *
 * Backend solver: "nonlinear" (NR) o "arclength" (Crisfield).
 */
import { useMemo, useState } from "react";
import { Activity, RefreshCw, Play, Check, AlertTriangle } from "lucide-react";

import { useModelStore } from "../../../store/modelStore";
import { useCostPreview } from "../../../hooks/useCostPreview";
import { useJobRun } from "../../../hooks/useJobRun";
import { toast } from "../../../store/toastStore";
import { CostPreviewDialog } from "../billing/CostPreviewDialog";
import { WizardShell } from "./WizardShell";


type NonlinearAlgo = "newton_raphson" | "arclength";


interface NonlinearConfig {
  n_steps: number;
  max_iter: number;
  tol: number;
  include_kg_beam: boolean;
  // Arc-Length only
  initial_increment?: number;
  max_increment_ratio?: number;
}


const DEFAULT_CFG: NonlinearConfig = {
  n_steps: 10,
  max_iter: 25,
  tol: 1e-6,
  include_kg_beam: true,
  initial_increment: 0.1,
  max_increment_ratio: 3.0,
};


interface Props {
  open: boolean;
  onClose: () => void;
}


export function NonlinearWizard({ open, onClose }: Props) {
  const model = useModelStore((s) => s.model);
  const [step, setStep] = useState(0);
  const [algo, setAlgo] = useState<NonlinearAlgo>("newton_raphson");
  const [cfg, setCfg] = useState<NonlinearConfig>(DEFAULT_CFG);
  const [done, setDone] = useState<{ converged: boolean; steps: number } | null>(null);

  const preview = useCostPreview();
  const job = useJobRun<{ converged?: boolean; steps?: unknown[] }>({
    onSuccess: (r) => {
      const c = r.converged ?? true;
      const n = (r.steps?.length ?? cfg.n_steps);
      setDone({ converged: c, steps: n });
      toast(
        c ? "success" : "warning",
        c ? `${algo === "newton_raphson" ? "Newton-Raphson" : "Arc-Length"}: ${n} step convergenti`
          : `Solver completato con avvisi (vedi pannello Solve · Nonlin)`,
      );
    },
    onError: (e) => toast("error", `Errore non-lineare: ${e.message}`),
  });

  function handleClose() {
    onClose();
    setStep(0);
    setDone(null);
  }

  function handleRun() {
    if (!model) {
      toast("error", "Nessun modello attivo");
      return;
    }
    const params = algo === "newton_raphson"
      ? {
          n_steps: cfg.n_steps,
          max_iter: cfg.max_iter,
          tol: cfg.tol,
          include_kg_beam: cfg.include_kg_beam,
        }
      : {
          n_steps: cfg.n_steps,
          max_iter: cfg.max_iter,
          tol: cfg.tol,
          initial_increment: cfg.initial_increment,
          max_increment_ratio: cfg.max_increment_ratio,
        };
    const solver = algo === "newton_raphson" ? "nonlinear" : "arclength";
    preview.previewAndRun(
      { model_id: model.id, solver, params },
      () => job.mutate({ model_id: model.id, solver, params }),
    );
  }

  const canProceed = useMemo(() => {
    if (step === 0) return !!algo;
    if (step === 1) {
      return cfg.n_steps >= 1 && cfg.max_iter >= 1 && cfg.tol > 0;
    }
    return true;
  }, [step, algo, cfg]);

  return (
    <>
      <WizardShell
        open={open}
        title="Analisi non-lineare"
        breadcrumb={[
          { label: "Solve", icon: Activity },
          { label: "Non-lineare", icon: RefreshCw },
        ]}
        steps={[
          { id: "algo",   label: "Algoritmo" },
          { id: "params", label: "Parametri" },
          { id: "run",    label: "Esegui" },
        ]}
        currentStep={step}
        onClose={handleClose}
        onBack={step > 0 ? () => setStep((s) => s - 1) : undefined}
        onNext={step < 2 ? () => setStep((s) => (s + 1) as 0 | 1 | 2) : undefined}
        onSubmit={step === 2 ? handleRun : undefined}
        canProceed={canProceed}
        isSubmitting={job.isPending}
        submitLabel={done ? "Esegui di nuovo" : "Esegui"}
      >
        {step === 0 && <AlgoStep algo={algo} setAlgo={setAlgo} />}
        {step === 1 && <ParamsStep algo={algo} cfg={cfg} update={(p) => setCfg((c) => ({ ...c, ...p }))} />}
        {step === 2 && <RunStep algo={algo} cfg={cfg} done={done} isPending={job.isPending} />}
      </WizardShell>
      <CostPreviewDialog
        open={preview.open}
        estimate={preview.estimate}
        quota={preview.quota}
        isLoading={preview.isLoading}
        onConfirm={preview.confirm}
        onCancel={preview.cancel}
      />
    </>
  );
}


// ── Step 1: Algorithm ──────────────────────────────────────────────────────
function AlgoStep({ algo, setAlgo }: { algo: NonlinearAlgo; setAlgo: (a: NonlinearAlgo) => void }) {
  const algos: Array<{ id: NonlinearAlgo; name: string; description: string; when: string }> = [
    {
      id: "newton_raphson",
      name: "Newton-Raphson",
      description: "Incrementale-iterativo. Standard per non-linearità geometriche moderate (P-Δ, grandi spostamenti).",
      when: "Telai svelti · pilastri esili · effetti P-Δ · strutture con K_geom rilevante",
    },
    {
      id: "arclength",
      name: "Arc-Length Crisfield",
      description: "Controllo a lunghezza d'arco. Naviga snap-through, snap-back, punti limite dove NR fallisce.",
      when: "Cavi compressione-only · gusci instabili · post-buckling · pull-out curves",
    },
  ];
  return (
    <div className="space-y-3">
      <p className="text-[12px] text-ink-3 leading-relaxed">
        Scegli l'algoritmo di risoluzione. Newton-Raphson è il default
        razionale; Arc-Length è necessario solo se il sistema attraversa
        instabilità geometriche con perdita di controllo del carico.
      </p>
      {algos.map((a) => {
        const active = algo === a.id;
        return (
          <button
            key={a.id}
            type="button"
            onClick={() => setAlgo(a.id)}
            data-testid={`nonlinear-algo-${a.id}`}
            className={`w-full text-left p-3 border transition ${
              active ? "border-accent bg-bg-info" : "border-border bg-bg-panel hover:border-accent/40 hover:bg-bg-hover"
            }`}
          >
            <div className="flex items-start gap-2.5">
              <div className={`w-3.5 h-3.5 rounded-full border-2 mt-0.5 flex-shrink-0 ${
                active ? "border-accent bg-accent" : "border-border-light"
              }`} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-ink">{a.name}</div>
                <div className="text-[11px] text-ink-3 leading-snug mt-0.5">{a.description}</div>
                <div className="text-[10px] text-ink-2 mt-1 italic">{a.when}</div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}


// ── Step 2: Parameters ─────────────────────────────────────────────────────
function ParamsStep({
  algo, cfg, update,
}: {
  algo: NonlinearAlgo;
  cfg: NonlinearConfig;
  update: (patch: Partial<NonlinearConfig>) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="bg-bg-info border border-accent/20 p-3">
        <div className="text-[11px] font-semibold text-accent mb-1">
          Algoritmo selezionato
        </div>
        <div className="text-[11px] text-ink-3">
          {algo === "newton_raphson" ? "Newton-Raphson incrementale-iterativo" : "Arc-Length Crisfield"}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="n_steps"
          hint="Incrementi di carico totali"
          value={cfg.n_steps}
          onChange={(v) => update({ n_steps: Math.max(1, Math.round(v)) })}
          step={1} min={1} max={500}
        />
        <NumberField
          label="max_iter"
          hint="Iterazioni NR per step"
          value={cfg.max_iter}
          onChange={(v) => update({ max_iter: Math.max(1, Math.round(v)) })}
          step={1} min={1} max={200}
        />
        <NumberField
          label="tol"
          hint="Tolleranza residuo (norma 2)"
          value={cfg.tol}
          onChange={(v) => update({ tol: v })}
          step={1e-7} min={1e-12} max={1e-2}
        />
        {algo === "newton_raphson" ? (
          <label className="flex items-start gap-2 cursor-pointer pt-5">
            <input
              type="checkbox"
              checked={cfg.include_kg_beam}
              onChange={(e) => update({ include_kg_beam: e.target.checked })}
              className="w-3.5 h-3.5 accent-accent mt-0.5"
              data-testid="nonlinear-kg-beam"
            />
            <div>
              <div className="text-[11px] font-semibold text-ink">K_geom beam</div>
              <div className="text-[10px] text-ink-3">Includi matrice geometrica beam (P-Δ)</div>
            </div>
          </label>
        ) : (
          <NumberField
            label="Δλ iniziale"
            hint="Incremento iniziale arc-length"
            value={cfg.initial_increment ?? 0.1}
            onChange={(v) => update({ initial_increment: v })}
            step={0.01} min={0.001} max={1}
          />
        )}
        {algo === "arclength" && (
          <NumberField
            label="Δλ max ratio"
            hint="Massima espansione ratio (vs Δλ iniziale)"
            value={cfg.max_increment_ratio ?? 3.0}
            onChange={(v) => update({ max_increment_ratio: v })}
            step={0.5} min={1} max={10}
          />
        )}
      </div>

      <div className="text-[10px] text-ink-3 italic">
        {algo === "newton_raphson"
          ? "Convergenza tipica: 3–8 iterazioni per step su problemi ben condizionati."
          : "Arc-Length cattura snap-through automaticamente: monitorare il segno di Δλ."}
      </div>
    </div>
  );
}


// ── Step 3: Run + Result ───────────────────────────────────────────────────
function RunStep({
  algo, cfg, done, isPending,
}: {
  algo: NonlinearAlgo;
  cfg: NonlinearConfig;
  done: { converged: boolean; steps: number } | null;
  isPending: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="bg-accent-subtle/40 border border-accent/30 p-3 space-y-1.5">
        <div className="text-sm font-semibold text-ink">Riepilogo</div>
        <div className="grid grid-cols-[100px_1fr] gap-x-3 gap-y-1 text-[11px]">
          <span className="text-ink-3">Algoritmo</span>
          <span className="text-ink">{algo === "newton_raphson" ? "Newton-Raphson" : "Arc-Length Crisfield"}</span>
          <span className="text-ink-3">Steps</span>
          <span className="text-ink font-mono">{cfg.n_steps}</span>
          <span className="text-ink-3">Max iter</span>
          <span className="text-ink font-mono">{cfg.max_iter} · tol = {cfg.tol.toExponential(0)}</span>
          {algo === "newton_raphson" && (
            <>
              <span className="text-ink-3">K_geom beam</span>
              <span className="text-ink">{cfg.include_kg_beam ? "Sì (P-Δ)" : "No (solo K linear)"}</span>
            </>
          )}
        </div>
      </div>

      {isPending && (
        <div className="bg-bg-info border border-accent/30 p-3 text-[11px] flex items-center gap-2">
          <Play className="w-3.5 h-3.5 text-accent animate-pulse" />
          Solver {algo === "newton_raphson" ? "Newton-Raphson" : "Arc-Length"} in esecuzione…
        </div>
      )}

      {done && (
        <div className={`border p-3 ${
          done.converged ? "bg-bg-success border-success/30" : "bg-bg-warn border-warn/30"
        }`}>
          <div className="flex items-center gap-2 mb-1.5">
            {done.converged
              ? <Check className="w-3.5 h-3.5 text-success" />
              : <AlertTriangle className="w-3.5 h-3.5 text-warn" />}
            <span className="text-sm font-semibold text-ink">
              {done.converged ? "Convergenza raggiunta" : "Convergenza parziale"}
            </span>
          </div>
          <div className="text-[11px] text-ink-2">
            {done.steps} step elaborati · deformata finale applicata al viewport.
            Per dettagli convergenza vai a <span className="font-semibold">Solve · Non-lin</span>.
          </div>
        </div>
      )}

      {!done && !isPending && (
        <div className="text-[11px] text-ink-3 leading-snug">
          Click su "Esegui" per lanciare il solver. Vedrai il preview costo,
          poi un riepilogo della convergenza al termine.
        </div>
      )}
    </div>
  );
}


// ── Sub-components ─────────────────────────────────────────────────────────
function NumberField({
  label, hint, value, onChange, step, min, max,
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
}) {
  return (
    <label className="block">
      <div className="font-mono text-[10px] uppercase tracking-wide-1 text-ink-3 font-semibold mb-1">{label}</div>
      <input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          if (!Number.isNaN(v)) onChange(v);
        }}
        step={step}
        min={min}
        max={max}
        className="w-full h-8 px-2 bg-bg-elevated border border-border-light text-ink font-mono text-sm focus:outline-none focus:border-accent"
      />
      {hint && <div className="text-[10px] text-ink-3 mt-1">{hint}</div>}
    </label>
  );
}
