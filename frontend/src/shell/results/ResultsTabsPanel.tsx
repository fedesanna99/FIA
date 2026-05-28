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
import { InspectPanel } from "../panels/InspectPanel";
import { VerifyPanel } from "../panels/VerifyPanel";
import { DisplacementTable } from "../../components/results/DisplacementTable";

type ResultsTab = "sintesi" | "dati" | "verifiche";
type DatiSubTab = "spostamenti" | "sollecitazioni" | "reazioni";

const ANALYSIS_LABEL: Record<string, string> = {
  static: "Statica lineare",
  modal: "Modale",
  dynamic: "Dinamica",
  buckling: "Buckling",
};

export function ResultsTabsPanel() {
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
          <div className="results-panel-t">Risultati</div>
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
          {/* FETTA 2a: embed InspectPanel esistente come placeholder onesto
              della Sintesi finche' lo step 2b non rifa l'aggregato metriche +
              affidabilita' del prototipo. */}
          <InspectPanel />
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
            {subtab === "sollecitazioni" && (
              <ResultsPlaceholder>
                Tabella sollecitazioni (N · V · M per elemento) — in arrivo
                nello <b>step 2b</b>. Per ora le solleci­tazioni sono leggibili
                via overlay viewport o dalle card di Sintesi.
              </ResultsPlaceholder>
            )}
            {subtab === "reazioni" && (
              <ResultsPlaceholder>
                Tabella reazioni vincolari + somma di controllo (ΣR ≟ −ΣF) —
                in arrivo nello <b>step 2b</b>.
              </ResultsPlaceholder>
            )}
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
          {/* FETTA 2a: embed VerifyPanel esistente. Il workspace "verifiche"
              continua ad averlo come full-area (takeover) come prima; qui lo
              mostriamo anche dentro Risultati come anteprima senior. */}
          <VerifyPanel />
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
