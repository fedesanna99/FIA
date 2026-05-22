/**
 * ResultsOverviewCard (v1.8.1 P1, esteso v1.8.2 T3).
 *
 * Card 3 della sidebar densa destra (mockup 08). Mostra metriche
 * sintetiche dei risultati: max displacement, max stress, link
 * "Genera report" per export PDF.
 *
 * Si nasconde quando staticResults = null E nessun job sta girando.
 * v1.8.2 T3: skeleton durante solve. Estensibile per
 * UC/criticita' (v1.9 Demo Slice GPS Strutturale).
 */
import { useResultsStore } from "../../store/resultsStore";
import { useAnalysisStore } from "../../store/analysisStore";

export function ResultsOverviewCard() {
  const staticRes = useResultsStore((s) => s.staticResults);
  const isRunning = useAnalysisStore((s) => s.isRunning);

  // v1.8.2 T3: skeleton mentre solve sta girando.
  if (!staticRes && isRunning) {
    return (
      <div className="border-b border-border p-3 space-y-1.5 bg-bg-panel" data-testid="results-overview-card-skeleton">
        <div className="text-[10px] uppercase tracking-wider text-ink-muted font-mono font-semibold">
          Results overview
        </div>
        <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
          <div className="space-y-1">
            <div className="h-2 bg-bg-hover rounded animate-pulse w-1/2" />
            <div className="h-3 bg-bg-hover rounded animate-pulse w-3/4" />
          </div>
          <div className="space-y-1">
            <div className="h-2 bg-bg-hover rounded animate-pulse w-1/2" />
            <div className="h-3 bg-bg-hover rounded animate-pulse w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  if (!staticRes) return null;

  const maxDispMm = staticRes.max_displacement * 1000;
  const maxStressMPa = staticRes.max_stress / 1e6;

  // v1.8.3 T4: tonale "safety hint" per Max σ. Soglia statica 235 MPa
  // (S235 standard) puramente VISIVA — non normativa, non sostituisce
  // verifica strutturale reale. Aiuta solo a riconoscere a colpo d'occhio
  // se l'analisi corrente è "tranquilla" (verde), "vicina al limite"
  // (giallo) o "oltre" (rosso). Title tooltip lo chiarisce.
  const SAFETY_THRESHOLD_MPA = 235;
  const safetyRatio = maxStressMPa / SAFETY_THRESHOLD_MPA;
  const stressTone =
    safetyRatio >= 1.0 ? "text-ink-coral" :
    safetyRatio >= 0.7 ? "text-ink-warn" :
    "text-ink-success";
  const stressHint = `σ / 235 MPa = ${safetyRatio.toFixed(2)} (riferimento S235, solo visivo)`;

  return (
    <div className="border-b border-border p-3 space-y-1.5 bg-bg-panel" data-testid="results-overview-card">
      <div className="text-[10px] uppercase tracking-wider text-ink-muted font-mono font-semibold">
        Results overview
      </div>
      <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[11px]">
        <div>
          <div className="text-ink-muted text-[9px] uppercase tracking-wider">Max u</div>
          <div className="text-ink font-mono font-semibold">
            {maxDispMm.toFixed(2)}
            <span className="text-ink-muted font-normal ml-0.5">mm</span>
          </div>
        </div>
        <div title={stressHint}>
          <div className="text-ink-muted text-[9px] uppercase tracking-wider">Max σ</div>
          <div className={`font-mono font-semibold ${stressTone}`} data-testid="results-overview-stress">
            {maxStressMPa.toFixed(1)}
            <span className="text-ink-muted font-normal ml-0.5">MPa</span>
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent("feapro:open-export-pdf"))}
        className="w-full text-[11px] text-ink-info hover:underline text-left pt-1"
        data-testid="results-overview-export"
      >
        Genera report PDF →
      </button>
    </div>
  );
}
