// redesign/workspace-fasi · FETTA 2b · Striscia verdetto onesta
//
// Overlay del viewport quando il workspace attivo e' "risultati":
//   - top-center: striscia con 4 celle metriche (EC3 / sigma max / freccia / UR)
//   - top-right: 3 toggle viste (Deformata / Sforzi / Momento)
//
// FAMIGLIA A (FETTA 2b):
//   - Cella EC3: legge UR vero e lo classifica (Passa ✓ verde / Non passa ✗
//     rosso). "n/a" se geometria non normata. "—" se non ancora calcolato.
//   - Cella UR: numero vero / "n/a" / "—"
//   - RILEVATORE CALCOLO SOSPETTO: se max_stress ≈ 0 && max_disp ≈ 0 (con
//     risultati presenti), la cella EC3 diventa "⚠ Calcolo sospetto" ambra,
//     e tutte le celle (sigma/freccia/UR) prendono il bordo ambra. No
//     applausi verdi su modelli degeneri.

import { useModelStore } from "../../store/modelStore";
import { useResultsStore } from "../../store/resultsStore";
import { useAnalysisStore } from "../../store/analysisStore";
import {
  isEC3Applicable,
  isSuspicious,
  computeUREC3,
  SUSPICIOUS_REASON,
  EC3_NA_REASON,
} from "./resultsHonest";

type EC3Tone = "neutral" | "pass" | "fail" | "na" | "warn";

interface CellState {
  text: string;
  unit?: string;
  tone: EC3Tone;
  tooltip?: string;
  testid: string;
}

export function ResultsVerdictStrip() {
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

  // ── Stati onesti delle 4 celle ────────────────────────────────────────
  // Calcolo UR EC3 (solo se applicabile + ha results + non sospetto)
  const urEC3 =
    hasResults && ec3Applicable && !suspicious
      ? computeUREC3(staticResults!.max_stress)
      : null;

  // Cella EC3 (verdetto Passa/Non passa/n/a/—/sospetto)
  const ec3Cell: CellState = (() => {
    if (suspicious) {
      return {
        text: "⚠ Sospetto",
        tone: "warn",
        tooltip: SUSPICIOUS_REASON,
        testid: "verdict-cell-ec3",
      };
    }
    if (!hasResults) {
      return { text: "—", tone: "neutral", testid: "verdict-cell-ec3" };
    }
    if (!ec3Applicable) {
      return {
        text: "n/a",
        tone: "na",
        tooltip: EC3_NA_REASON,
        testid: "verdict-cell-ec3",
      };
    }
    return urEC3! <= 1
      ? { text: "Passa ✓", tone: "pass", testid: "verdict-cell-ec3" }
      : { text: "Non passa ✗", tone: "fail", testid: "verdict-cell-ec3" };
  })();

  // Cella σ max
  const sigmaCell: CellState = (() => {
    if (!hasResults) {
      return { text: "—", tone: "neutral", testid: "verdict-cell-sigma" };
    }
    const sigmaMPa = (staticResults!.max_stress / 1e6).toLocaleString("it-IT", {
      maximumFractionDigits: 0,
    });
    return {
      text: sigmaMPa,
      unit: "MPa",
      tone: suspicious ? "warn" : "neutral",
      tooltip: suspicious ? SUSPICIOUS_REASON : undefined,
      testid: "verdict-cell-sigma",
    };
  })();

  // Cella freccia
  const frecciaCell: CellState = (() => {
    if (!hasResults) {
      return { text: "—", tone: "neutral", testid: "verdict-cell-freccia" };
    }
    const mm = (Math.abs(staticResults!.max_displacement) * 1000).toLocaleString(
      "it-IT",
      { minimumFractionDigits: 2, maximumFractionDigits: 2 }
    );
    return {
      text: mm,
      unit: "mm",
      tone: suspicious ? "warn" : "neutral",
      tooltip: suspicious ? SUSPICIOUS_REASON : undefined,
      testid: "verdict-cell-freccia",
    };
  })();

  // Cella UR (numero o n/a / — / —, NON warn — quel ruolo e' di EC3)
  const urCell: CellState = (() => {
    if (suspicious) {
      // Sospetto: numero non significativo, ma cornice ambra per coerenza
      return {
        text: "—",
        tone: "warn",
        tooltip: SUSPICIOUS_REASON,
        testid: "verdict-cell-ur",
      };
    }
    if (!hasResults) {
      return { text: "—", tone: "neutral", testid: "verdict-cell-ur" };
    }
    if (!ec3Applicable) {
      return {
        text: "n/a",
        tone: "na",
        tooltip: EC3_NA_REASON,
        testid: "verdict-cell-ur",
      };
    }
    return {
      text: urEC3!.toFixed(2),
      tone: urEC3! <= 1 ? "pass" : "fail",
      testid: "verdict-cell-ur",
    };
  })();

  // ── Toggle Momento (showDiagrams + diagramComponent="M") ──────────────
  const momentoActive = showDiagrams && diagramComponent === "M";
  const handleMomento = () => {
    if (momentoActive) {
      toggleDiagrams();
    } else {
      setDiagramComponent("M");
      if (!showDiagrams) toggleDiagrams();
    }
  };

  return (
    <>
      <div
        className={`results-verdict${suspicious ? " is-suspicious" : ""}`}
        data-testid="results-verdict-strip"
        data-suspicious={suspicious ? "true" : undefined}
        role="status"
        aria-label="Verdetto risultati"
      >
        <VerdictCell label="Verifica EC3" cell={ec3Cell} />
        <VerdictCell label="σ max" cell={sigmaCell} />
        <VerdictCell label="freccia" cell={frecciaCell} />
        <VerdictCell label="UR" cell={urCell} />
      </div>

      <div
        className="results-view-toggles"
        role="toolbar"
        aria-label="Vista risultati nel viewport"
      >
        <button
          type="button"
          className={`results-view-toggle${showDeformed ? " is-on" : ""}`}
          data-testid="results-view-deformata"
          aria-pressed={showDeformed}
          onClick={() => toggleDeformed()}
        >
          Deformata
        </button>
        <button
          type="button"
          className={`results-view-toggle${showStress ? " is-on" : ""}`}
          data-testid="results-view-sforzi"
          aria-pressed={showStress}
          onClick={() => toggleStress()}
        >
          Sforzi σ
        </button>
        <button
          type="button"
          className={`results-view-toggle${momentoActive ? " is-on" : ""}`}
          data-testid="results-view-momento"
          aria-pressed={momentoActive}
          onClick={handleMomento}
        >
          Momento
        </button>
      </div>
    </>
  );
}

function VerdictCell({ label, cell }: { label: string; cell: CellState }) {
  return (
    <div
      className={`results-verdict-cell results-verdict-cell--${cell.tone}`}
      data-tone={cell.tone}
      title={cell.tooltip}
    >
      <span className="k">{label}</span>
      <span className="v" data-testid={cell.testid}>
        {cell.text}
        {cell.unit && <small> {cell.unit}</small>}
      </span>
    </div>
  );
}
