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
  /**
   * v3.4 Fetta M4-polish (30/05/2026): comportamento accordion.
   *
   * - `false` (default, desktop): multi-open — l'utente puo' aprire piu'
   *   sezioni contemporaneamente per confrontare (es. Spostamenti +
   *   Reazioni per verifica equilibrio sui 380px del panel DX desktop).
   * - `true` (mobile, passato da ShellPanelMobileSheet): single-open
   *   exclusive — tap su sezione X chiude tutte le altre. Razionale:
   *   sul bottom sheet 80vh (~650px) lo spazio verticale e' prezioso,
   *   l'utente vuole vedere sempre la sezione che ha tappato senza
   *   scroll lunghi per arrivarci oltre quelle gia' aperte.
   *
   * La Sintesi sempre-aperta in cima NON e' toccata da questo flag
   * (resta sempre visibile in entrambi i mode).
   *
   * Vedi ADR 004 "Revisione 30/05 notte · M4-polish" per il razionale UX.
   */
  singleOpen?: boolean;
}


const ANALYSIS_LABEL: Record<string, string> = {
  static: "Statica lineare",
  modal: "Modale",
  dynamic: "Dinamica",
  buckling: "Buckling",
};


export function ResultsTabsPanel({ onIterate, singleOpen = false }: ResultsTabsPanelProps = {}) {
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
        singleOpen={singleOpen}
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
        singleOpen={singleOpen}
      >
        <ResultsDatiSollecitazioni />
      </AccordionSection>

      <AccordionSection
        sectionKey="reactions"
        label="Reazioni"
        testid="results-section-reactions"
        singleOpen={singleOpen}
      >
        <ResultsDatiReazioni />
      </AccordionSection>

      <AccordionSection
        sectionKey="ec3"
        label="Verifica EC3"
        testid="results-section-ec3"
        singleOpen={singleOpen}
      >
        <ResultsVerifiche />
      </AccordionSection>
    </div>
  );
}


/** Sezione accordion del panel DX di Verifica. Cabla allo store per
 *  toggle e read-only state; il body viene renderizzato solo quando
 *  aperto (no display:none per evitare costo render dei tab pesanti).
 *
 *  v3.4 Fetta M4-polish (30/05/2026): prop `singleOpen` cambia il
 *  comportamento del click:
 *  - default (multi-open desktop): toggle classico, le altre sezioni
 *    restano com'erano (puoi avere Spostamenti + Reazioni aperti
 *    insieme per confrontare).
 *  - singleOpen (mobile bottom sheet): tap su sezione chiusa →
 *    openExclusive (chiude tutte le altre); tap su sezione aperta →
 *    close (la chiude, niente apre). Garantisce che al massimo 1
 *    sezione collassabile sia visibile insieme alla Sintesi sempre-open.
 */
interface AccordionSectionProps {
  sectionKey: VerifySectionKey;
  label: string;
  testid: string;
  children: ReactNode;
  /** Comportamento del click: multi-open (false, desktop) o
   *  exclusive single-open (true, mobile sheet). */
  singleOpen?: boolean;
}

function AccordionSection({
  sectionKey,
  label,
  testid,
  children,
  singleOpen = false,
}: AccordionSectionProps) {
  // useState locale non basta: lo stato e' persistito via Zustand store
  // cosi' sopravvive a refresh + e' condiviso fra istanze (Shell HMR-safe).
  const isOpen = useVerifyAccordionStore((s) =>
    s.openSections.includes(sectionKey),
  );
  const toggle = useVerifyAccordionStore((s) => s.toggle);
  const close = useVerifyAccordionStore((s) => s.close);
  const openExclusive = useVerifyAccordionStore((s) => s.openExclusive);

  const handleClick = () => {
    if (singleOpen) {
      if (isOpen) close(sectionKey);
      else openExclusive(sectionKey);
    } else {
      toggle(sectionKey);
    }
  };

  return (
    <section
      className={`results-section${isOpen ? " is-open" : ""}`}
      data-testid={testid}
      data-state={isOpen ? "open" : "closed"}
    >
      <button
        type="button"
        className="results-section-head"
        onClick={handleClick}
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
