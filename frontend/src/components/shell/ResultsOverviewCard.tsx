/**
 * ResultsOverviewCard (v1.8.1 P1).
 *
 * Card 3 della sidebar densa destra (mockup 08). Mostra metriche
 * sintetiche dei risultati: max displacement, max stress, link
 * "Genera report" per export PDF.
 *
 * Si nasconde quando staticResults = null. Estensibile per
 * UC/criticita' (v1.9 Demo Slice GPS Strutturale).
 */
import { useResultsStore } from "../../store/resultsStore";

export function ResultsOverviewCard() {
  const staticRes = useResultsStore((s) => s.staticResults);
  if (!staticRes) return null;

  const maxDispMm = staticRes.max_displacement * 1000;
  const maxStressMPa = staticRes.max_stress / 1e6;

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
        <div>
          <div className="text-ink-muted text-[9px] uppercase tracking-wider">Max σ</div>
          <div className="text-ink font-mono font-semibold">
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
