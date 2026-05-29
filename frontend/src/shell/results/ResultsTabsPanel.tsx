// redesign/workspace-fasi · FETTA 2a · Risultati — guscio 3 schede
//
// Nuovo panel-content del workspace "risultati" (sostituisce InspectPanel
// come content di default del workspace, ma NON cancella InspectPanel:
// e' embeddato come Sintesi finche' lo step 2b non rifa quel contenuto).
//
// Struttura (bersaglio prototipo):
//   [Header] Risultati · Statica lineare · stato
//   [Tabs]   Sintesi | Dati | Verifiche
//     Sintesi   -> <InspectPanel/> (hub esistente, embed onesto)
//     Dati      -> subtab Spostamenti | Sollecitazioni | Reazioni
//       Spostamenti    -> <DisplacementTable/> (esistente) o placeholder
//       Sollecitazioni -> placeholder onesto "in arrivo step 2b"
//       Reazioni       -> placeholder onesto "in arrivo step 2b"
//     Verifiche -> <VerifyPanel/> (esistente, embed onesto)
//
// VINCOLI FETTA 2a:
//   - Solo CHROME: niente nuova logica, niente nuovi store-read oltre
//     quelli gia' presenti nei componenti embeddati.
//   - Placeholder onesti: se non c'e' contenuto reale, lo dico esplicitamente.
//   - InspectPanel/VerifyPanel restano come workspace-content di altri
//     workspace (verifiche), questo wrapper li EMBEDDA solo qui.

import { useState } from "react";
import { Activity } from "lucide-react";
import { useResultsStore } from "../../store/resultsStore";
import { useAnalysisStore } from "../../store/analysisStore";
import { DisplacementTable } from "../../components/results/DisplacementTable";
// FETTA 2b · FAM B: nuovo content scheda Sintesi (sostituisce InspectPanel
// embed). InspectPanel.tsx resta nel codebase ma non e' piu' importato qui.
import { ResultsSintesi } from "./ResultsSintesi";
// FETTA 2b · FAM C: tabelle Sollecitazioni e Reazioni con banner sospetto
// e somma di controllo (sostituiscono i placeholder "in arrivo step 2b").
import { ResultsDatiSollecitazioni } from "./ResultsDatiSollecitazioni";
import { ResultsDatiReazioni } from "./ResultsDatiReazioni";
// FETTA 2b · FAM D: nuova scheda Verifiche con EC3 in chiaro + n/a +
// banner sospetto. Sostituisce embed VerifyPanel (incoerente in Risultati).
// VerifyPanel resta nel codebase per il workspace "verifiche" full-area.
import { ResultsVerifiche } from "./ResultsVerifiche";

interface ResultsTabsPanelProps {
  /** Callback "Itera" → torna al workspace Costruisci (passato da Shell.tsx). */
  onIterate?: () => void;
}

type ResultsTab = "sintesi" | "dati" | "verifiche";
type DatiSubTab = "spostamenti" | "sollecitazioni" | "reazioni";

const ANALYSIS_LABEL: Record<string, string> = {
  static: "Statica lineare",
  modal: "Modale",
  dynamic: "Dinamica",
  buckling: "Buckling",
};

export function ResultsTabsPanel({ onIterate }: ResultsTabsPanelProps = {}) {
  const [tab, setTab] = useState<ResultsTab>("sintesi");
  const [subtab, setSubtab] = useState<DatiSubTab>("spostamenti");
  const hasStatic = useResultsStore((s) => !!s.staticResults);
  const hasModal = useResultsStore((s) => !!s.modalResults);
  const hasDynamic = useResultsStore((s) => !!s.dynamicResults);
  const analysisType = useAnalysisStore((s) => s.analysisType);
  const isRunning = useAnalysisStore((s) => s.isRunning);

  const hasAnyResults = hasStatic || hasModal || hasDynamic;
  const subtitle = isRunning
    ? "Calcolo in corso…"
    : hasAnyResults
    ? `${ANALYSIS_LABEL[analysisType] ?? "Analisi"} · completata`
    : "Nessun calcolo. Premi Esegui per vedere i risultati.";

  return (
    <div className="results-panel" data-shell-panel="risultati">
      <header className="results-panel-h">
        <span className="results-panel-ic" aria-hidden>
          <Activity size={16} />
        </span>
        <div className="results-panel-h-text">
          <div className="results-panel-t">Verifica</div>{/* v3.4 Fetta E2.5b */}
          <div className="results-panel-s">{subtitle}</div>
        </div>
      </header>

      {/* Tab list: state locale, niente Radix (Radix Tabs in jsdom non
          triggera onValueChange via fireEvent.click affidabilmente;
          allineato anche al prototipo HTML che usa state JS semplice). */}
      <div className="results-tabs" role="tablist" aria-label="Schede risultati">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "sintesi"}
          aria-controls="results-tab-body-sintesi"
          className={`results-tab${tab === "sintesi" ? " is-active" : ""}`}
          data-state={tab === "sintesi" ? "active" : "inactive"}
          data-testid="results-tab-sintesi"
          onClick={() => setTab("sintesi")}
        >
          Sintesi
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "dati"}
          aria-controls="results-tab-body-dati"
          className={`results-tab${tab === "dati" ? " is-active" : ""}`}
          data-state={tab === "dati" ? "active" : "inactive"}
          data-testid="results-tab-dati"
          onClick={() => setTab("dati")}
        >
          Dati
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "verifiche"}
          aria-controls="results-tab-body-verifiche"
          className={`results-tab${tab === "verifiche" ? " is-active" : ""}`}
          data-state={tab === "verifiche" ? "active" : "inactive"}
          data-testid="results-tab-verifiche"
          onClick={() => setTab("verifiche")}
        >
          Verifiche
        </button>
      </div>

      {tab === "sintesi" && (
        <div
          id="results-tab-body-sintesi"
          role="tabpanel"
          className="results-tab-body"
          data-testid="results-tab-body-sintesi"
        >
          {/* FETTA 2b · FAM B: nuovo content Sintesi (metriche aggregate +
              affidabilita' + toggle + Itera/Report). Banner ambra "calcolo
              sospetto" in cima quando isSuspicious — niente applausi
              su un calcolo banale. InspectPanel.tsx resta nel codebase
              ma non e' piu' embeddato qui. */}
          <ResultsSintesi onIterate={onIterate} />
        </div>
      )}

      {tab === "dati" && (
        <div
          id="results-tab-body-dati"
          role="tabpanel"
          className="results-tab-body"
          data-testid="results-tab-body-dati"
        >
          <div
            className="results-subtabs"
            role="tablist"
            aria-label="Tipo di dato"
          >
            <button
              type="button"
              role="tab"
              aria-selected={subtab === "spostamenti"}
              className={`results-subtab${subtab === "spostamenti" ? " is-active" : ""}`}
              data-testid="results-subtab-spostamenti"
              onClick={() => setSubtab("spostamenti")}
            >
              Spostamenti
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={subtab === "sollecitazioni"}
              className={`results-subtab${subtab === "sollecitazioni" ? " is-active" : ""}`}
              data-testid="results-subtab-sollecitazioni"
              onClick={() => setSubtab("sollecitazioni")}
            >
              Sollecitazioni
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={subtab === "reazioni"}
              className={`results-subtab${subtab === "reazioni" ? " is-active" : ""}`}
              data-testid="results-subtab-reazioni"
              onClick={() => setSubtab("reazioni")}
            >
              Reazioni
            </button>
          </div>

          <div className="results-subtab-body">
            {subtab === "spostamenti" &&
              (hasStatic ? (
                <DisplacementTable />
              ) : (
                <ResultsPlaceholder>
                  Nessun calcolo statico disponibile. Lancia un'analisi statica
                  dal passo <b>Esegui</b> per vedere la tabella spostamenti.
                </ResultsPlaceholder>
              ))}
            {/* FETTA 2b · FAM C: tabelle reali. I 2 componenti gestiscono
                anche lo stato "nessun calcolo" (placeholder onesto interno)
                e il banner ambra "calcolo sospetto" in cima. */}
            {subtab === "sollecitazioni" && <ResultsDatiSollecitazioni />}
            {subtab === "reazioni" && <ResultsDatiReazioni />}
          </div>
        </div>
      )}

      {tab === "verifiche" && (
        <div
          id="results-tab-body-verifiche"
          role="tabpanel"
          className="results-tab-body"
          data-testid="results-tab-body-verifiche"
        >
          {/* FETTA 2b · FAM D: nuova scheda Verifiche aderente al prototipo
              (testata EC3 + formula in chiaro + altre verifiche con badge
              validato/stima/"in arrivo"). VerifyPanel resta usato dal
              workspace "verifiche" full-area (takeover) come prima. */}
          <ResultsVerifiche />
        </div>
      )}
    </div>
  );
}

function ResultsPlaceholder({ children }: { children: React.ReactNode }) {
  return (
    <div className="results-placeholder" data-testid="results-placeholder">
      {children}
    </div>
  );
}
