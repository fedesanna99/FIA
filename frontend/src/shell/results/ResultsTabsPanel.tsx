// v3.4 Fetta E2.5c (29/05 sera) · Panel DX di Verifica — accordion
//
// REFACTOR (era 3 tabs orizzontali Sintesi/Dati/Verifiche): adottato
// accordion verticale come deciso con Federico (Tensione 1 · Opzione A,
// vedi `socio/05-prototipi-workspace-v3/`):
//
//   [Header]   ✓ Verifica · Statica · SLU · completata        [✕]
//   ──────────────────────────────────────────────────────────
//   ▼ SINTESI (sempre aperta — NON collassabile)
//       UR / σmax / δmax + verdict + trust badge + [Itera] [Report]
//   ──────────────────────────────────────────────────────────
//   ▸ Spostamenti                                          ⌄
//   ▸ Sollecitazioni                                       ⌄
//   ▸ Reazioni                                             ⌄
//   ▸ Verifica EC3                                         ⌄
//
// Filosofia "junior fuori, senior dentro":
//   - Sintesi sempre visibile in cima (dati fondamentali per studente/
//     ingegnere junior: UR · σmax · freccia · verdict EC3 · trust badge)
//   - 4 sezioni collassabili sotto (per chi vuole approfondire: tabelle
//     per nodo/elemento, reazioni con equilibrio, formula EC3 in chiaro)
//   - Multi-open: l'utente puo' aprire piu' sezioni contemporaneamente
//     per confrontare (gestito da `verifyAccordionStore`)
//
// IMPORTANTE — niente perdita di content rispetto al passato:
//   - Sintesi  → ResultsSintesi (FAM B, invariato)
//   - Spostamenti → DisplacementTable (FAM C, era subtab Dati)
//   - Sollecitazioni → ResultsDatiSollecitazioni (FAM C, era subtab Dati)
//   - Reazioni → ResultsDatiReazioni (FAM C, era subtab Dati)
//   - Verifica EC3 → ResultsVerifiche (FAM D, era tab Verifiche)
//
// Workspace `verifiche` takeover (VerifyPanel full-hub con 6 norme:
// Live/EC2/EC3/EC5/EC8/NTC18) resta raggiungibile via ⌘K palette per
// chi vuole il flusso power-user con breadcrumb. Sara' candidato a
// rimozione in una fetta successiva quando ResultsVerifiche avra'
// assorbito quel contenuto (oggi `ResultsVerifiche` e' la versione
// junior-friendly allineata al prototipo `risultati-senior.html`).

import { ReactNode } from "react";
import { Activity, ChevronRight } from "lucide-react";

import { useResultsStore } from "../../store/resultsStore";
import { useAnalysisStore } from "../../store/analysisStore";
import {
  useVerifyAccordionStore,
  type VerifySectionKey,
} from "../../store/verifyAccordionStore";
import { DisplacementTable } from "../../components/results/DisplacementTable";
import { ResultsSintesi } from "./ResultsSintesi";
import { ResultsDatiSollecitazioni } from "./ResultsDatiSollecitazioni";
import { ResultsDatiReazioni } from "./ResultsDatiReazioni";
import { ResultsVerifiche } from "./ResultsVerifiche";


interface ResultsTabsPanelProps {
  /** Callback "Itera" → torna al workspace Costruisci (passato da Shell.tsx). */
  onIterate?: () => void;
}


const ANALYSIS_LABEL: Record<string, string> = {
  static: "Statica lineare",
  modal: "Modale",
  dynamic: "Dinamica",
  buckling: "Buckling",
};


export function ResultsTabsPanel({ onIterate }: ResultsTabsPanelProps = {}) {
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
          <div className="results-panel-t">Verifica</div>
          <div className="results-panel-s">{subtitle}</div>
        </div>
      </header>

      {/* SINTESI · sempre aperta in cima (junior tile fondamentali) */}
      <section
        className="results-section results-section--always-open"
        data-testid="results-section-sintesi"
      >
        <div className="results-section-body">
          <ResultsSintesi onIterate={onIterate} />
        </div>
      </section>

      {/* 4 sezioni accordion (multi-open via verifyAccordionStore) */}
      <AccordionSection
        sectionKey="displacements"
        label="Spostamenti"
        testid="results-section-displacements"
      >
        {hasStatic ? (
          <DisplacementTable />
        ) : (
          <ResultsPlaceholder>
            Nessun calcolo statico disponibile. Lancia un'analisi statica
            dal passo <b>Esegui</b> per vedere la tabella spostamenti.
          </ResultsPlaceholder>
        )}
      </AccordionSection>

      <AccordionSection
        sectionKey="forces"
        label="Sollecitazioni"
        testid="results-section-forces"
      >
        <ResultsDatiSollecitazioni />
      </AccordionSection>

      <AccordionSection
        sectionKey="reactions"
        label="Reazioni"
        testid="results-section-reactions"
      >
        <ResultsDatiReazioni />
      </AccordionSection>

      <AccordionSection
        sectionKey="ec3"
        label="Verifica EC3"
        testid="results-section-ec3"
      >
        <ResultsVerifiche />
      </AccordionSection>
    </div>
  );
}


/** Sezione accordion del panel DX di Verifica. Cabla allo store per
 *  toggle e read-only state; il body viene renderizzato solo quando
 *  aperto (no display:none per evitare costo render dei tab pesanti). */
interface AccordionSectionProps {
  sectionKey: VerifySectionKey;
  label: string;
  testid: string;
  children: ReactNode;
}

function AccordionSection({
  sectionKey,
  label,
  testid,
  children,
}: AccordionSectionProps) {
  // useState locale non basta: lo stato e' persistito via Zustand store
  // cosi' sopravvive a refresh + e' condiviso fra istanze (Shell HMR-safe).
  const isOpen = useVerifyAccordionStore((s) =>
    s.openSections.includes(sectionKey),
  );
  const toggle = useVerifyAccordionStore((s) => s.toggle);

  return (
    <section
      className={`results-section${isOpen ? " is-open" : ""}`}
      data-testid={testid}
      data-state={isOpen ? "open" : "closed"}
    >
      <button
        type="button"
        className="results-section-head"
        onClick={() => toggle(sectionKey)}
        aria-expanded={isOpen}
        aria-controls={`${testid}-body`}
        data-testid={`${testid}-head`}
      >
        <ChevronRight
          className="results-section-chevron"
          size={14}
          strokeWidth={2}
          aria-hidden
        />
        <span className="results-section-label">{label}</span>
      </button>
      {isOpen && (
        <div
          id={`${testid}-body`}
          className="results-section-body"
          data-testid={`${testid}-body`}
        >
          {children}
        </div>
      )}
    </section>
  );
}


function ResultsPlaceholder({ children }: { children: ReactNode }) {
  return (
    <div className="results-placeholder" data-testid="results-placeholder">
      {children}
    </div>
  );
}
