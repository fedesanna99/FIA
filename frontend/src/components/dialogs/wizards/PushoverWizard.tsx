/**
 * PushoverWizard (v2.2.4 — feature) — wizard 3-step per analisi pushover
 * NTC 2018 §7.3.4.1, EC8 §4.3.3.4.
 *
 * Sostituisce la scorciatoia "apri SolvePanel · dinamica" introdotta in
 * v2.2.0 B8 con un vero wizard guidato:
 *
 *   1. Strategia        → preset Standard NTC / Conservativo / Esplorativo
 *                         (selettore di lambda_step, lambda_max, ecc.)
 *   2. Parametri        → tuning fine + criteri di terminazione
 *   3. Esegui           → riepilogo + bottone Run + risultati inline
 *
 * Riusa: useJobRun, useCostPreview, modelStore. Solver "pushover" backend.
 */
import { useMemo, useState } from "react";
import { Activity, TrendingUp, Play, AlertTriangle, Check } from "lucide-react";

import { useModelStore } from "../../../store/modelStore";
import { useCostPreview } from "../../../hooks/useCostPreview";
import { useJobRun } from "../../../hooks/useJobRun";
import { toast } from "../../../store/toastStore";
import type { PushoverResults } from "../../../api/analysis_ext";
import { CostPreviewDialog } from "../billing/CostPreviewDialog";
import { WizardShell } from "./WizardShell";


type PushoverPreset = "ntc_standard" | "conservativo" | "esplorativo" | "custom";


interface PushoverConfig {
  lambda_step: number;
  lambda_max: number;
  max_steps: number;
  delta_max_for_stop: number;
}


const PRESETS: Record<Exclude<PushoverPreset, "custom">, { name: string; description: string; cfg: PushoverConfig }> = {
  ntc_standard: {
    name: "Standard NTC §7.3.4.1",
    description: "Incrementi piccoli, λ_max realistico. Adatto a verifiche pushover normative tipiche.",
    cfg: { lambda_step: 0.05, lambda_max: 5.0, max_steps: 200, delta_max_for_stop: 1.0 },
  },
  conservativo: {
    name: "Conservativo (capacità reale)",
    description: "λ_step finissimo (0.02), δ_max 0.5m. Cattura le prime cerniere senza overshoot. Più lento.",
    cfg: { lambda_step: 0.02, lambda_max: 3.0, max_steps: 500, delta_max_for_stop: 0.5 },
  },
  esplorativo: {
    name: "Esplorativo (rapido)",
    description: "Step grossi (0.10), λ_max 10. Per sgrossare la curva e identificare zone interessanti.",
    cfg: { lambda_step: 0.10, lambda_max: 10.0, max_steps: 100, delta_max_for_stop: 2.0 },
  },
};


interface Props {
  open: boolean;
  onClose: () => void;
}


export function PushoverWizard({ open, onClose }: Props) {
  const model = useModelStore((s) => s.model);
  const [step, setStep] = useState(0);
  const [preset, setPreset] = useState<PushoverPreset>("ntc_standard");
  const [cfg, setCfg] = useState<PushoverConfig>(PRESETS.ntc_standard.cfg);
  const [results, setResults] = useState<PushoverResults | null>(null);

  const preview = useCostPreview();
  const job = useJobRun<PushoverResults>({
    onSuccess: (r) => {
      setResults(r);
      toast("success", `Pushover: ${r.steps.length} step, ${r.hinge_events.length} cerniere plastiche`);
    },
    onError: (e) => toast("error", `Errore pushover: ${e.message}`),
  });

  function handleClose() {
    onClose();
    setStep(0);
    setResults(null);
    setPreset("ntc_standard");
    setCfg(PRESETS.ntc_standard.cfg);
  }

  function applyPreset(p: PushoverPreset) {
    setPreset(p);
    if (p !== "custom") setCfg(PRESETS[p].cfg);
  }

  function updateCfg(patch: Partial<PushoverConfig>) {
    setCfg((c) => ({ ...c, ...patch }));
    setPreset("custom");
  }

  function handleRun() {
    if (!model) {
      toast("error", "Nessun modello attivo");
      return;
    }
    const params: Record<string, unknown> = { ...cfg };
    preview.previewAndRun(
      { model_id: model.id, solver: "pushover", params },
      () => job.mutate({ model_id: model.id, solver: "pushover", params }),
    );
  }

  const canProceed = useMemo(() => {
    if (step === 0) return !!preset;
    if (step === 1) {
      return cfg.lambda_step > 0 && cfg.lambda_max > 0
        && cfg.max_steps >= 1 && cfg.delta_max_for_stop > 0;
    }
    return true;
  }, [step, preset, cfg]);

  return (
    <>
      <WizardShell
        open={open}
        title="Pushover · NTC §7.3.4.1"
        breadcrumb={[
          { label: "Solve", icon: Activity },
          { label: "Pushover", icon: TrendingUp },
        ]}
        steps={[
          { id: "strategy", label: "Strategia" },
          { id: "params",   label: "Parametri" },
          { id: "run",      label: "Esegui" },
        ]}
        currentStep={step}
        onClose={handleClose}
        onBack={step > 0 ? () => setStep((s) => s - 1) : undefined}
        onNext={step < 2 ? () => setStep((s) => (s + 1) as 0 | 1 | 2) : undefined}
        onSubmit={step === 2 ? handleRun : undefined}
        canProceed={canProceed}
        isSubmitting={job.isPending}
        submitLabel={results ? "Esegui di nuovo" : "Esegui pushover"}
      >
        {step === 0 && <StrategyStep preset={preset} onSelect={applyPreset} />}
        {step === 1 && <ParametersStep cfg={cfg} update={updateCfg} preset={preset} />}
        {step === 2 && <RunStep cfg={cfg} preset={preset} results={results} isPending={job.isPending} />}
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


// ── Step 1: Strategy ───────────────────────────────────────────────────────
function StrategyStep({ preset, onSelect }: { preset: PushoverPreset; onSelect: (p: PushoverPreset) => void }) {
  return (
    <div className="space-y-3">
      <p className="text-[12px] text-ink-3 leading-relaxed">
        Scegli una strategia di incremento del moltiplicatore di carico
        <span className="font-mono"> λ</span>. Ogni preset è ottimizzato per uno scenario
        diverso. Potrai affinare i parametri nello step successivo.
      </p>
      <div className="space-y-2">
        {(Object.keys(PRESETS) as Exclude<PushoverPreset, "custom">[]).map((id) => {
          const p = PRESETS[id];
          const active = preset === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelect(id)}
              data-testid={`pushover-preset-${id}`}
              className={`w-full text-left p-3 border transition ${
                active
                  ? "border-accent bg-bg-info"
                  : "border-border bg-bg-panel hover:border-accent/40 hover:bg-bg-hover"
              }`}
            >
              <div className="flex items-start gap-2.5">
                <div className={`w-3.5 h-3.5 rounded-full border-2 mt-0.5 flex-shrink-0 ${
                  active ? "border-accent bg-accent" : "border-border-light"
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-ink">{p.name}</div>
                  <div className="text-[11px] text-ink-3 leading-snug mt-0.5">{p.description}</div>
                  <div className="font-mono text-[10px] text-ink-3 mt-1">
                    λ_step={p.cfg.lambda_step} · λ_max={p.cfg.lambda_max} · max_steps={p.cfg.max_steps}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}


// ── Step 2: Parameters ─────────────────────────────────────────────────────
function ParametersStep({
  cfg, update, preset,
}: {
  cfg: PushoverConfig;
  update: (patch: Partial<PushoverConfig>) => void;
  preset: PushoverPreset;
}) {
  return (
    <div className="space-y-4">
      <div className="bg-bg-info border border-accent/20 p-3">
        <div className="text-[11px] font-semibold text-accent mb-1">Preset attivo</div>
        <div className="text-[11px] text-ink-3">
          {preset === "custom" ? "Personalizzato — hai modificato i valori" : PRESETS[preset].name}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="λ step"
          hint="Incremento moltiplicatore (tipico 0.02–0.10)"
          value={cfg.lambda_step}
          onChange={(v) => update({ lambda_step: v })}
          step={0.01} min={0.001} max={1}
        />
        <NumberField
          label="λ max"
          hint="Limite superiore (stop quando raggiunto)"
          value={cfg.lambda_max}
          onChange={(v) => update({ lambda_max: v })}
          step={0.1} min={0.1} max={100}
        />
        <NumberField
          label="Max steps"
          hint="Stop di sicurezza (incrementi totali)"
          value={cfg.max_steps}
          onChange={(v) => update({ max_steps: Math.round(v) })}
          step={10} min={1} max={2000}
        />
        <NumberField
          label="δ max [m]"
          hint="Stop su spostamento controllo (collasso)"
          value={cfg.delta_max_for_stop}
          onChange={(v) => update({ delta_max_for_stop: v })}
          step={0.1} min={0.01} max={10}
        />
      </div>
      <div className="text-[10px] text-ink-3 italic">
        Solo elementi BEAM2D con cerniere plastiche concentrate (elasto-plastico perfetto).
      </div>
    </div>
  );
}


// ── Step 3: Run + Results ─────────────────────────────────────────────────
function RunStep({
  cfg, preset, results, isPending,
}: {
  cfg: PushoverConfig;
  preset: PushoverPreset;
  results: PushoverResults | null;
  isPending: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="bg-accent-subtle/40 border border-accent/30 p-3 space-y-1.5">
        <div className="text-sm font-semibold text-ink">Pronto a lanciare il pushover</div>
        <div className="grid grid-cols-[100px_1fr] gap-x-3 gap-y-1 text-[11px]">
          <span className="text-ink-3">Strategia</span>
          <span className="text-ink">{preset === "custom" ? "Custom" : PRESETS[preset].name}</span>
          <span className="text-ink-3">Parametri</span>
          <span className="text-ink font-mono">
            λ_step={cfg.lambda_step} · λ_max={cfg.lambda_max} · max={cfg.max_steps} step · δ_max={cfg.delta_max_for_stop}m
          </span>
        </div>
      </div>

      {!results && !isPending && (
        <div className="text-[11px] text-ink-3 leading-snug">
          Click su "Esegui pushover" qui sotto. Vedrai il preview costo, poi la
          curva di capacità apparirà a fine analisi.
        </div>
      )}

      {isPending && (
        <div className="bg-bg-info border border-accent/30 p-3 text-[11px] flex items-center gap-2">
          <Play className="w-3.5 h-3.5 text-accent animate-pulse" />
          Solver pushover in esecuzione… (incrementi λ, ricerca cerniere plastiche)
        </div>
      )}

      {results && (
        <div className="space-y-2">
          <div className={`border p-3 ${
            results.collapse_lambda != null
              ? "bg-bg-warn border-warn/30"
              : "bg-bg-success border-success/30"
          }`}>
            <div className="flex items-center gap-2 mb-1.5">
              {results.collapse_lambda != null
                ? <AlertTriangle className="w-3.5 h-3.5 text-warn" />
                : <Check className="w-3.5 h-3.5 text-success" />
              }
              <span className="text-sm font-semibold text-ink">
                {results.collapse_lambda != null ? "Collasso rilevato" : "Curva completata"}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-[11px] font-mono">
              <Stat label="Steps" value={String(results.steps.length)} />
              <Stat label="Cerniere" value={String(results.hinge_events.length)} />
              <Stat
                label="λ collapse"
                value={results.collapse_lambda != null ? results.collapse_lambda.toFixed(3) : "—"}
              />
            </div>
            {results.collapse_reason && (
              <div className="mt-2 text-[10px] text-warn">{results.collapse_reason}</div>
            )}
          </div>
          <div className="text-[10px] text-ink-3 italic">
            Per la curva λ–δ completa apri il pannello Solve · Dinamica · Pushover.
          </div>
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


function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-bg-elevated border border-border-light px-2 py-1.5">
      <div className="font-mono text-[9px] uppercase tracking-wide-2 text-ink-3 font-semibold">{label}</div>
      <div className="text-sm font-mono text-ink tabular-nums">{value}</div>
    </div>
  );
}
