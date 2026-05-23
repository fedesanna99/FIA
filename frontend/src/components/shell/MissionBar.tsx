/**
 * MissionBar (v1.8 T3).
 *
 * Barra minima sotto la TopBar che mostra:
 *   - Stato del modello (empty / wip / solved)
 *   - "Prossimo passo" suggerito da rule-engine deterministico
 *     (algoritmo > AI, nessuna chiamata esterna).
 *
 * Si nasconde quando model = null (la Home gestisce gia' empty con
 * la sua hero CTA doppia Studio Pro / Percorsi). Compare appena viene
 * caricato un modello.
 */
import { useModelStore } from "../../store/modelStore";
import { useResultsStore } from "../../store/resultsStore";

type Status = "wip" | "solved";

interface Hint {
  status: Status;
  label: string;
  text: string;
}

/**
 * Rule engine pure-data: in base allo stato del modello + risultati,
 * suggerisce il prossimo passo deterministicamente. Niente AI.
 */
function computeHint(
  model: { constraints?: unknown[]; loads?: unknown[] } | null,
  hasStaticResults: boolean,
): Hint | null {
  if (!model) return null;

  if (hasStaticResults) {
    return {
      status: "solved",
      label: "Risolto",
      text: "Verifica i risultati nel pannello Inspect o esporta il report.",
    };
  }

  const nConstraints = model.constraints?.length ?? 0;
  const nLoads = model.loads?.length ?? 0;

  if (nConstraints === 0) {
    return {
      status: "wip",
      label: "Da completare",
      text: "Aggiungi almeno un vincolo (struttura attualmente labile).",
    };
  }
  if (nLoads === 0) {
    return {
      status: "wip",
      label: "Da completare",
      text: "Aggiungi almeno un carico per poter lanciare l'analisi.",
    };
  }
  return {
    status: "wip",
    label: "Pronto",
    text: "Lancia l'analisi statica · tasto F5 o ▶ Esegui.",
  };
}

export { computeHint };

export function MissionBar() {
  const model = useModelStore((s) => s.model);
  const staticRes = useResultsStore((s) => s.staticResults);
  const hint = computeHint(model, !!staticRes);

  if (!hint) return null;

  const toneClass =
    hint.status === "solved"
      ? "bg-bg-success text-success border-success/40"
      : "bg-bg-warn text-warn border-warn/40";

  return (
    <div
      className="h-9 flex-shrink-0 border-b border-border bg-bg-panel px-3 flex items-center gap-2.5 text-[12px] overflow-hidden"
      data-testid="mission-bar"
    >
      <span
        className={`px-1.5 py-0.5 font-mono uppercase tracking-wide-2 text-[10px] font-semibold border ${toneClass} flex-shrink-0`}
        data-testid="mission-bar-status"
      >
        {hint.label}
      </span>
      <span className="font-mono uppercase tracking-wide-2 text-[10px] text-ink-3 flex-shrink-0 font-semibold">
        Prossimo passo
      </span>
      <span className="text-ink-2 truncate" data-testid="mission-bar-hint">
        {hint.text}
      </span>
    </div>
  );
}
