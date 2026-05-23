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
import { toneFromUc, GPS_FYD, type CheckTone } from "../../lib/gpsTrust";

export function ResultsOverviewCard() {
  const staticRes = useResultsStore((s) => s.staticResults);
  const isRunning = useAnalysisStore((s) => s.isRunning);

  // v1.8.2 T3: skeleton mentre solve sta girando.
  if (!staticRes && isRunning) {
    return (
      <div className="border-b border-border p-3 space-y-1.5 bg-bg-panel" data-testid="results-overview-card-skeleton">
        <div className="text-[10px] uppercase tracking-wider text-ink-3 font-mono font-semibold">
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

  // v1.9.0 T2: GPS Strutturale - 3 verifiche normative semplificate.
  // Helper deterministici estratti in `lib/gpsTrust.ts` (v1.9.1 T1).
  // Tutti i ratio sono PURAMENTE VISIVI/DIDATTICI — non sostituiscono
  // verifica strutturale formale secondo Eurocodice / NTC.
  const checks = [
    {
      id: "s275",
      label: "S275 · UC",
      ratio: maxStressMPa / GPS_FYD.s275,
      hint: "fy = 275 MPa (acciaio S275, fyd ≈ 261 MPa con γM0 = 1.05)",
    },
    {
      id: "ec3",
      label: "EC3 · UC",
      ratio: maxStressMPa / GPS_FYD.ec3,
      hint: "EN 1993-1-1 §6.2.1 (verifica tensionale base S235)",
    },
    {
      id: "ntc",
      label: "NTC · UC",
      ratio: maxStressMPa / GPS_FYD.ntc,
      hint: "NTC 2018 §4.2.4.1 (S275 con γM0 = 1.05)",
    },
  ] as const;
  const toneClasses: Record<CheckTone, string> = {
    ok:       "bg-bg-success text-success border-success/30",
    warn:     "bg-bg-warn text-warn border-warn/30",
    critical: "bg-bg-danger text-danger border-danger/30",
  };
  const toneLabel: Record<CheckTone, string> = {
    ok: "OK",
    warn: "Attenzione",
    critical: "Critico",
  };

  return (
    <div className="border-b border-border p-3 space-y-2 bg-bg-panel" data-testid="results-overview-card">
      <div className="font-mono text-[10px] uppercase tracking-wide-3 text-ink-3 font-semibold">
        Results overview
      </div>
      <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[11px]">
        <div>
          <div className="font-mono text-[9px] uppercase tracking-wide-3 text-ink-3">Max u</div>
          <div className="text-ink font-mono font-semibold tabular-nums">
            {maxDispMm.toFixed(2)}
            <span className="text-ink-3 font-normal ml-0.5">mm</span>
          </div>
        </div>
        <div title={stressHint}>
          <div className="font-mono text-[9px] uppercase tracking-wide-3 text-ink-3">Max σ</div>
          <div className={`font-mono font-semibold tabular-nums ${stressTone}`} data-testid="results-overview-stress">
            {maxStressMPa.toFixed(1)}
            <span className="text-ink-3 font-normal ml-0.5">MPa</span>
          </div>
        </div>
      </div>
      {/* v1.9.0 T2 / v2.0 Precision: GPS Strutturale — Stato verifiche didattiche */}
      <div className="space-y-1 pt-1.5 border-t border-border" data-testid="gps-verifiche">
        <div className="font-mono text-[9px] uppercase tracking-wide-3 text-ink-3 font-semibold">
          Stato verifiche
        </div>
        {checks.map((c) => {
          const tone = toneFromUc(c.ratio);
          return (
            <div
              key={c.id}
              title={`${c.hint} · ratio ${c.ratio.toFixed(2)}`}
              className="flex items-center gap-2 text-[10px]"
              data-testid={`gps-check-${c.id}`}
            >
              <span className="text-ink-3 flex-shrink-0 w-[60px]">{c.label}</span>
              <span className="font-mono text-ink flex-1">{c.ratio.toFixed(2)}</span>
              <span className={`font-mono font-semibold px-1.5 py-px rounded border leading-none ${toneClasses[tone]}`}>
                {toneLabel[tone]}
              </span>
            </div>
          );
        })}
        <div className="text-[9px] text-ink-3 italic pt-0.5">
          Hint visivo · non sostituisce verifica formale
        </div>
      </div>
      <button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent("feapro:open-export-pdf"))}
        className="w-full inline-flex items-center justify-between gap-1 text-[11px] text-accent hover:underline font-medium pt-2 mt-1 border-t border-border"
        data-testid="results-overview-export"
      >
        <span>Genera report PDF</span>
        <span aria-hidden>→</span>
      </button>
    </div>
  );
}
