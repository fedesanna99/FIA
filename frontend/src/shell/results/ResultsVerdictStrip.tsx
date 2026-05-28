// redesign/workspace-fasi · FETTA 2a · Striscia verdetto + toggle viste
//
// Overlay del viewport quando il workspace attivo e' "risultati":
//   - top-center: striscia con 4 metriche (Verifica EC3, σ max, freccia, UR)
//     - σ max e freccia: derivati DIRETTAMENTE da resultsStore.staticResults
//       (valori gia' disponibili, formattati in MPa/mm)
//     - Verifica EC3 e UR: "—" perche' richiedono un check normativo non
//       sincronizzato sincronamente in store. Verra' cablato nello step 2b
//       (oggi vivono in VerifyPanel che fa fetch on-demand /api/verify_ext).
//   - top-right: 3 toggle viste (Deformata / Sforzi σ / Momento) collegati
//     ai toggle GIA' presenti negli store:
//       - showDeformed / toggleDeformed                 (resultsStore)
//       - showStressColormap / toggleStressColormap     (resultsStore)
//       - showDiagrams / toggleDiagrams + diagramComponent (analysisStore)
//     Non riscriviamo overlay viewport: solo nuovi entry-point UI per i
//     flag esistenti.

import { useResultsStore } from "../../store/resultsStore";
import { useAnalysisStore } from "../../store/analysisStore";

export function ResultsVerdictStrip() {
  const staticResults = useResultsStore((s) => s.staticResults);
  const showDeformed = useResultsStore((s) => s.showDeformed);
  const showStress = useResultsStore((s) => s.showStressColormap);
  const showDiagrams = useAnalysisStore((s) => s.showDiagrams);
  const diagramComponent = useAnalysisStore((s) => s.diagramComponent);

  const toggleDeformed = useResultsStore((s) => s.toggleDeformed);
  const toggleStress = useResultsStore((s) => s.toggleStressColormap);
  const toggleDiagrams = useAnalysisStore((s) => s.toggleDiagrams);
  const setDiagramComponent = useAnalysisStore((s) => s.setDiagramComponent);

  // σ max: backend salva in Pa. UI rende in MPa. Se il valore manca,
  // mostriamo solo "—" senza unità (non "— MPa", che e' rumore visivo).
  const sigmaAvailable = staticResults?.max_stress != null;
  const sigmaMaxMPa = sigmaAvailable
    ? (staticResults!.max_stress / 1e6).toLocaleString("it-IT", {
        maximumFractionDigits: 0,
      })
    : null;

  // freccia: backend salva in m, in valore assoluto rende mm.
  const frecciaAvailable = staticResults?.max_displacement != null;
  const frecciaMaxMm = frecciaAvailable
    ? (Math.abs(staticResults!.max_displacement) * 1000).toLocaleString(
        "it-IT",
        { minimumFractionDigits: 2, maximumFractionDigits: 2 }
      )
    : null;

  const momentoActive = showDiagrams && diagramComponent === "M";
  const handleMomento = () => {
    // Click su "Momento":
    //   - se gia' attivo (showDiagrams=true && component=M): spegne
    //   - altrimenti: accende showDiagrams + forza component="M"
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
        className="results-verdict"
        data-testid="results-verdict-strip"
        role="status"
        aria-label="Verdetto risultati"
      >
        <div className="results-verdict-cell">
          <span className="k">Verifica EC3</span>
          <span className="v" data-testid="verdict-cell-ec3">—</span>
        </div>
        <div className="results-verdict-cell">
          <span className="k">σ max</span>
          <span className="v" data-testid="verdict-cell-sigma">
            {sigmaMaxMPa ?? "—"}
            {sigmaMaxMPa !== null && <small> MPa</small>}
          </span>
        </div>
        <div className="results-verdict-cell">
          <span className="k">freccia</span>
          <span className="v" data-testid="verdict-cell-freccia">
            {frecciaMaxMm ?? "—"}
            {frecciaMaxMm !== null && <small> mm</small>}
          </span>
        </div>
        <div className="results-verdict-cell">
          <span className="k">UR</span>
          <span className="v" data-testid="verdict-cell-ur">—</span>
        </div>
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
