/**
 * ResultsInsightAuto (Precision v2.0 PR15 T3).
 *
 * Wrapper auto-derivante che mostra un `<InsightPanel>` nella sidebar destra
 * QUANDO l'analisi statica ha rilevato UC ratio critico o sopra soglia warn.
 *
 * Soglie (coerenti con `gpsTrust.toneFromUc`):
 *   - UC ≥ 1.0   → tone "danger" + eyebrow "CRITICAL ELEMENT"
 *   - UC ≥ 0.85  → tone "warn"   + eyebrow "ATTENZIONE"
 *   - UC < 0.85  → non renderizza nulla (no insight necessario)
 *
 * Si nasconde quando `staticResults === null`. Calcola UC vs S275 (=275 MPa)
 * come unico riferimento normativo "didattico" (allineato a `ResultsOverviewCard`).
 *
 * Action: link "Apri Inspect →" che apre il right rail Inspect dove
 * l'utente può navigare al dettaglio elemento.
 */
import { useResultsStore } from "../../store/resultsStore";
import { useRightRailStore } from "../../store/rightRailStore";
import { GPS_FYD, toneFromUc } from "../../lib/gpsTrust";
import { InsightPanel } from "./InsightPanel";

export function ResultsInsightAuto() {
  const staticRes = useResultsStore((s) => s.staticResults);
  if (!staticRes) return null;

  const maxStressMPa = staticRes.max_stress / 1e6;
  const ucS275 = maxStressMPa / GPS_FYD.s275;
  const tone = toneFromUc(ucS275);

  // Niente insight se UC sotto soglia warn
  if (tone === "ok") return null;

  const isCritical = tone === "critical";
  const insightTone = isCritical ? "danger" : "warn";
  const eyebrow = isCritical ? "CRITICAL ELEMENT" : "ATTENZIONE";
  const title = isCritical
    ? "Tensione sopra fy"
    : "Tensione vicina al limite";
  const sub = `Max σ = ${maxStressMPa.toFixed(1)} MPa · UC S275 = ${ucS275.toFixed(2)}`;

  const items = [
    {
      text: isCritical
        ? "Riduci sezione, aumenta classe acciaio o ridistribuisci carichi."
        : "Margine di sicurezza < 15%. Valuta verifica per stati limite di esercizio.",
    },
    {
      text: "Hint visivo · non sostituisce verifica formale EN 1993-1-1 / NTC 2018.",
    },
  ] as const;

  return (
    <div className="border-b border-border p-3" data-testid="results-insight-auto">
      <InsightPanel
        tone={insightTone}
        eyebrow={eyebrow}
        title={title}
        sub={sub}
        items={items}
        action={{
          label: "Apri Inspect",
          onClick: () => useRightRailStore.getState().open("inspect"),
        }}
      />
    </div>
  );
}
