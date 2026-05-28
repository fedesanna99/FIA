// redesign/workspace-fasi · FETTA 2b · FAMIGLIA B · Sintesi
//
// Sostituisce l'embed di InspectPanel nella scheda Sintesi del workspace
// Risultati. Layout aderente al prototipo HTML condiviso da Federico:
//   - banner ambra "Calcolo sospetto" in cima quando isSuspicious()
//     (mai applausi su un calcolo banale)
//   - 3 metric card aggregate (UR EC3, σ max con elemento, freccia con
//     nodo) coi 4 stati onesti — "—" / "n/a" / "warn" / valore vero
//   - badge affidabilità (reliabilityFromModel) — Validato / Stima / Mista
//   - 3 toggle vista (Deformata / Sforzi / Momento) collegati agli stessi
//     flag store usati anche dalla ResultsVerdictStrip
//   - footer bottoni "↺ Itera" (torna a Costruisci) + "⤓ Genera report"
//     (placeholder alert)
//
// VINCOLI FETTA 2b:
//   - Solo CHROME + presentazione. NIENTE nuova logica di dominio.
//     Tutti gli store-read riusano `resultsHonest.ts` (Famiglia A) e
//     gli stessi store-flag della Strip.
//   - Mai inventare valori. Vedi "Cell" helper sotto.

import { AlertTriangle, CheckCircle2, Activity, RotateCcw, Download, XCircle } from "lucide-react";
import { useModelStore } from "../../store/modelStore";
import { useResultsStore } from "../../store/resultsStore";
import { useAnalysisStore } from "../../store/analysisStore";
import {
  isEC3Applicable,
  isSuspicious,
  computeUREC3,
  reliabilityFromModel,
  SUSPICIOUS_REASON,
  EC3_NA_REASON,
} from "./resultsHonest";

interface ResultsSintesiProps {
  /** Chiamato dal bottone "Itera" → torna al workspace Costruisci. */
  onIterate?: () => void;
}

type MetricTone = "empty" | "na" | "warn" | "pass" | "fail" | "neutral";

export function ResultsSintesi({ onIterate }: ResultsSintesiProps) {
  const model = useModelStore((s) => s.model);
  const staticResults = useResultsStore((s) => s.staticResults);
  const showDeformed = useResultsStore((s) => s.showDeformed);
  const showStress = useResultsStore((s) => s.showStressColormap);
  const showDiagrams = useAnalysisStore((s) => s.showDiagrams);
  const diagramComponent = useAnalysisStore((s) => s.diagramComponent);

  const toggleDeformed = useResultsStore((s) => s.toggleDeformed);
  const toggleStress = useResultsStore((s) => s.toggleStressColormap);
  const toggleDiagrams = useAnalysisStore((s) => s.toggleDiagrams);
  const setDiagramComponent = useAnalysisStore((s) => s.setDiagramComponent);

  const hasResults = !!staticResults;
  const suspicious = isSuspicious(staticResults);
  const ec3Applicable = isEC3Applicable(model);
  const reliability = reliabilityFromModel(model);

  // ── Metric UR EC3 ────────────────────────────────────────────────────
  const urEC3 =
    hasResults && ec3Applicable && !suspicious
      ? computeUREC3(staticResults!.max_stress)
      : null;
  const urMetric: MetricCellProps = (() => {
    if (!hasResults) {
      return {
        label: "UR EC3",
        valueText: "—",
        tone: "empty",
        testid: "sintesi-metric-ur",
      };
    }
    if (suspicious) {
      return {
        label: "UR EC3",
        valueText: "—",
        sub: "calcolo sospetto",
        tone: "warn",
        tooltip: SUSPICIOUS_REASON,
        testid: "sintesi-metric-ur",
      };
    }
    if (!ec3Applicable) {
      return {
        label: "UR EC3",
        valueText: "n/a",
        sub: "geometria non normata",
        tone: "na",
        tooltip: EC3_NA_REASON,
        testid: "sintesi-metric-ur",
      };
    }
    return {
      label: "UR EC3",
      valueText: urEC3!.toFixed(2),
      sub: urEC3! <= 1 ? "✓ in sicurezza" : "✗ supera la resistenza",
      tone: urEC3! <= 1 ? "pass" : "fail",
      testid: "sintesi-metric-ur",
    };
  })();

  // ── Metric σ max ──────────────────────────────────────────────────────
  const sigmaMaxElement = pickElementWithMaxStress(staticResults);
  const sigmaMetric: MetricCellProps = (() => {
    if (!hasResults) {
      return {
        label: "σ max",
        valueText: "—",
        tone: "empty",
        testid: "sintesi-metric-sigma",
      };
    }
    const mpa = (staticResults!.max_stress / 1e6).toLocaleString("it-IT", {
      maximumFractionDigits: 0,
    });
    const sub = sigmaMaxElement
      ? `MPa · elemento E${sigmaMaxElement}`
      : "MPa";
    return {
      label: "σ max",
      valueText: mpa,
      sub,
      tone: suspicious ? "warn" : "neutral",
      tooltip: suspicious ? SUSPICIOUS_REASON : undefined,
      testid: "sintesi-metric-sigma",
    };
  })();

  // ── Metric freccia ────────────────────────────────────────────────────
  const dispMaxNode = pickNodeWithMaxDisplacement(staticResults);
  const frecciaMetric: MetricCellProps = (() => {
    if (!hasResults) {
      return {
        label: "freccia max",
        valueText: "—",
        tone: "empty",
        testid: "sintesi-metric-freccia",
      };
    }
    const mm = (
      Math.abs(staticResults!.max_displacement) * 1000
    ).toLocaleString("it-IT", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const sub = dispMaxNode ? `mm · nodo N${dispMaxNode}` : "mm";
    return {
      label: "freccia max",
      valueText: mm,
      sub,
      tone: suspicious ? "warn" : "neutral",
      tooltip: suspicious ? SUSPICIOUS_REASON : undefined,
      testid: "sintesi-metric-freccia",
    };
  })();

  // ── Toggle viste (riuso stesso pattern strip) ─────────────────────────
  const momentoActive = showDiagrams && diagramComponent === "M";
  const handleMomento = () => {
    if (momentoActive) {
      toggleDiagrams();
    } else {
      setDiagramComponent("M");
      if (!showDiagrams) toggleDiagrams();
    }
  };

  const handleReport = () => {
    // Placeholder: nessuna logica nuova in chrome (Federico: "alert
    // placeholder per ora"). Report PDF/Excel arrivera' in fetta successiva.
    // eslint-disable-next-line no-alert
    window.alert(
      "Genera report — in arrivo. Per ora puoi esportare CSV dalla tab Dati (quando disponibile) o aprire il viewport con le opzioni di vista."
    );
  };

  return (
    <div className="results-sintesi" data-testid="results-sintesi">
      {/* Banner SOSPETTO in cima (FETTA 2b · FAM A bridge) */}
      {suspicious && (
        <div
          className="results-sintesi-warn"
          data-testid="results-sintesi-warn"
          role="alert"
        >
          <AlertTriangle size={18} aria-hidden />
          <div>
            <strong>Calcolo sospetto</strong>
            <p>{SUSPICIOUS_REASON}</p>
          </div>
        </div>
      )}

      {/* Metric cards aggregate */}
      <div className="results-sintesi-metrics">
        <MetricCell {...urMetric} />
        <MetricCell {...sigmaMetric} />
        <MetricCell {...frecciaMetric} />
      </div>

      {/* Visualizza nel modello — 3 toggle viewport (collegati ai flag store) */}
      <div className="results-sintesi-sec">
        <span className="results-sintesi-sec-label">Visualizza nel modello</span>
        <div className="results-sintesi-views" role="toolbar" aria-label="Vista risultati">
          <button
            type="button"
            className={`results-sintesi-view${showDeformed ? " is-on" : ""}`}
            data-testid="sintesi-view-deformata"
            aria-pressed={showDeformed}
            onClick={() => toggleDeformed()}
          >
            Deformata
          </button>
          <button
            type="button"
            className={`results-sintesi-view${showStress ? " is-on" : ""}`}
            data-testid="sintesi-view-sforzi"
            aria-pressed={showStress}
            onClick={() => toggleStress()}
          >
            Sforzi σ
          </button>
          <button
            type="button"
            className={`results-sintesi-view${momentoActive ? " is-on" : ""}`}
            data-testid="sintesi-view-momento"
            aria-pressed={momentoActive}
            onClick={handleMomento}
          >
            Momento
          </button>
        </div>
      </div>

      {/* Affidabilità del calcolo — badge Validato / Stima / Mista */}
      <div className="results-sintesi-sec">
        <span className="results-sintesi-sec-label">Affidabilità del calcolo</span>
        <div
          className={`results-sintesi-trust results-sintesi-trust--${reliability.tone}`}
          data-testid="sintesi-trust-badge"
          data-tone={reliability.tone}
          title={reliability.tooltip}
        >
          {reliability.tone === "validated" ? (
            <CheckCircle2 size={14} aria-hidden />
          ) : (
            <Activity size={14} aria-hidden />
          )}
          <strong>{reliability.label}</strong>
          <span className="results-sintesi-trust-tip">{reliability.tooltip}</span>
        </div>
      </div>

      {/* Azioni: Itera + Genera report */}
      <div className="results-sintesi-actions">
        <button
          type="button"
          className="results-sintesi-btn results-sintesi-btn--ghost"
          data-testid="sintesi-action-iterate"
          onClick={() => onIterate?.()}
          disabled={!onIterate}
        >
          <RotateCcw size={14} aria-hidden />
          Itera
        </button>
        <button
          type="button"
          className="results-sintesi-btn results-sintesi-btn--dark"
          data-testid="sintesi-action-report"
          onClick={handleReport}
        >
          <Download size={14} aria-hidden />
          Genera report
        </button>
      </div>
    </div>
  );
}

// ─── Helpers (presentazione pura) ────────────────────────────────────

interface MetricCellProps {
  label: string;
  valueText: string;
  sub?: string;
  tone: MetricTone;
  tooltip?: string;
  testid: string;
}

function MetricCell({ label, valueText, sub, tone, tooltip, testid }: MetricCellProps) {
  return (
    <div
      className={`results-sintesi-metric results-sintesi-metric--${tone}`}
      data-tone={tone}
      title={tooltip}
    >
      <span className="results-sintesi-metric-k">{label}</span>
      <span className="results-sintesi-metric-v" data-testid={testid}>
        {valueText}
        {sub && <small> {sub}</small>}
      </span>
      {tone === "fail" && (
        <span className="results-sintesi-metric-icon" aria-hidden>
          <XCircle size={14} />
        </span>
      )}
      {tone === "pass" && (
        <span className="results-sintesi-metric-icon" aria-hidden>
          <CheckCircle2 size={14} />
        </span>
      )}
    </div>
  );
}

/**
 * Identifica l'elemento con max(von_mises). Ritorna l'element_id oppure
 * null se element_stresses è vuoto/non disponibile. NESSUNA invenzione:
 * se non ho dati pulisco a null e il chiamante non mostra il sub.
 */
function pickElementWithMaxStress(r: import("../../types/results").StaticResults | null): number | null {
  if (!r || !r.element_stresses || r.element_stresses.length === 0) return null;
  let bestId: number | null = null;
  let bestVal = -Infinity;
  for (const es of r.element_stresses) {
    if (es.von_mises > bestVal) {
      bestVal = es.von_mises;
      bestId = es.element_id;
    }
  }
  return bestId;
}

/**
 * Identifica il nodo con massima norma traslazionale. Ritorna node_id o
 * null se displacements vuoto.
 */
function pickNodeWithMaxDisplacement(r: import("../../types/results").StaticResults | null): number | null {
  if (!r || !r.displacements || r.displacements.length === 0) return null;
  let bestId: number | null = null;
  let bestVal = -Infinity;
  for (const d of r.displacements) {
    const mag = Math.sqrt(d.ux * d.ux + d.uy * d.uy + d.uz * d.uz);
    if (mag > bestVal) {
      bestVal = mag;
      bestId = d.node_id;
    }
  }
  return bestId;
}
