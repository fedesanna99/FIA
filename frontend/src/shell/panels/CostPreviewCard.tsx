/**
 * CostPreviewCard (Sprint 5 G10 / alpha.25) — brief v1.2.1 Step 7.4.
 *
 * **Flagship feature** del SolvePanel. Sempre visibile sopra i parametri
 * dell'analisi selezionata, mostra la stima costo pre-run con gradient
 * **blu-viola** distintivo del mockup v1.3.
 *
 * Layout:
 *   ┌─────────────────────────────────────────┐
 *   │ STIMA COSTO              [ETA ~3s] │ ← header
 *   │ RAM picco            ~40 MB         │
 *   │ CPU·s                2.1            │
 *   │ WS events            ~12            │
 *   │ ──────────────────────────────       │
 *   │ Crediti              **0.4** ≈€0.04 │ ← totale
 *   └─────────────────────────────────────────┘
 *
 * Data source: prima chiama l'API reale `/api/billing/estimate` (se
 * `model_id` disponibile). Se la chiamata fallisce o non c'e' un model,
 * fallback su mock client-side per UX preview immediata.
 */
import { useEffect, useState } from "react";
import { useModelStore } from "../../store/modelStore";
import { estimateCost, type CostEstimate, type EstimateRequest } from "../../api/billing";


/** Mock client-side per UX immediata (no network round-trip). */
const MOCK_BY_SOLVER: Record<string, CostEstimate> = {
  static:    { solver: "static" as never,    n_dof: 600, cpu_min: 0.04, ram_mb: 40,  eta_s: 3,  credits: 0.4, explanation: "Stima mock" },
  modal:     { solver: "modal" as never,     n_dof: 600, cpu_min: 0.06, ram_mb: 60,  eta_s: 5,  credits: 0.8, explanation: "Stima mock" },
  buckling:  { solver: "buckling" as never,  n_dof: 600, cpu_min: 0.09, ram_mb: 80,  eta_s: 8,  credits: 1.2, explanation: "Stima mock" },
  dynamic:   { solver: "dynamic" as never,   n_dof: 600, cpu_min: 0.30, ram_mb: 120, eta_s: 18, credits: 4.0, explanation: "Stima mock" },
  pushover:  { solver: "pushover" as never,  n_dof: 600, cpu_min: 0.40, ram_mb: 150, eta_s: 24, credits: 5.5, explanation: "Stima mock" },
  seismic:   { solver: "seismic" as never,   n_dof: 600, cpu_min: 0.50, ram_mb: 200, eta_s: 30, credits: 7.0, explanation: "Stima mock" },
  nonlinear: { solver: "nonlinear" as never, n_dof: 600, cpu_min: 0.35, ram_mb: 140, eta_s: 21, credits: 4.8, explanation: "Stima mock" },
  arclength: { solver: "arclength" as never, n_dof: 600, cpu_min: 0.45, ram_mb: 180, eta_s: 27, credits: 6.2, explanation: "Stima mock" },
};


interface Props {
  /** Solver corrente (es. "static", "modal", "dynamic", ...). */
  analysisId: string;
}


export function CostPreviewCard({ analysisId }: Props) {
  const model = useModelStore((s) => s.model);
  const [estimate, setEstimate] = useState<CostEstimate | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Mostra subito il mock per UX immediata
    const mock = MOCK_BY_SOLVER[analysisId] ?? null;
    setEstimate(mock);

    // Se abbiamo un modello, prova a recuperare la stima reale dal backend
    if (!model?.id) return;

    let cancelled = false;
    setLoading(true);

    const req: EstimateRequest = {
      model_id: model.id,
      solver: analysisId as EstimateRequest["solver"],
      params: {},
    };

    estimateCost(req)
      .then((real) => { if (!cancelled) setEstimate(real); })
      .catch(() => { /* fallback su mock gia' settato */ })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [analysisId, model?.id]);

  if (!estimate) return null;

  return (
    <div
      className="mx-3 my-2.5 p-3 rounded-md border text-xs relative overflow-hidden"
      style={{
        // Gradient blu-viola (mockup v1.3 flagship)
        background: "linear-gradient(135deg, rgb(var(--c-bg-info)) 0%, rgb(var(--c-bg-purple)) 100%)",
        borderColor: "rgba(24,95,165,0.20)",
        color: "var(--ink-info)",
      }}
      data-testid="cost-preview-card"
    >
      {/* Loading shimmer overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white/5 pointer-events-none feapro-pulse" aria-hidden />
      )}

      <header className="flex items-center justify-between mb-2.5">
        <span className="text-[10px] uppercase tracking-wider font-semibold opacity-85">
          Stima costo pre-run
        </span>
        <span className="bg-black/10 px-1.5 py-0.5 rounded-full text-[10px] font-mono">
          ETA ~{estimate.eta_s.toFixed(0)}s
        </span>
      </header>

      <Row label="RAM picco" value={`~${estimate.ram_mb.toFixed(0)} MB`} />
      <Row label="CPU·min" value={estimate.cpu_min.toFixed(2)} />
      <Row label="N. DoF" value={estimate.n_dof.toLocaleString("it")} />

      <div className="h-px my-2" style={{ background: "rgba(24,95,165,0.20)" }} aria-hidden />

      <div className="flex items-baseline justify-between text-sm font-semibold">
        <span>Crediti</span>
        <span>
          <span className="text-lg font-bold font-mono">
            {estimate.credits.toFixed(2)}
          </span>
          <span className="text-[10px] opacity-70 ml-1.5">
            ≈ €{(estimate.credits * 0.1).toFixed(2)}
          </span>
        </span>
      </div>

      {estimate.explanation && (
        <p className="mt-2 text-[10px] opacity-70 leading-relaxed line-clamp-2">
          {estimate.explanation}
        </p>
      )}
    </div>
  );
}


function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-0.5 text-[11px]">
      <span className="opacity-85">{label}</span>
      <strong className="font-mono font-semibold">{value}</strong>
    </div>
  );
}
