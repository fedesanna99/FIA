/**
 * ModelStatsBadge (v2.5.8 cluster E T3, BUG-039+045).
 *
 * Componente condiviso per mostrare i contatori del modello attivo (nodi,
 * elementi, materiali, sezioni, vincoli, carichi). Centralizza un pattern
 * che prima era reimplementato inline in più punti dell'UI (`MakePanel`,
 * `StatusBar`, dialog vari).
 *
 * Due variant:
 *   - `compact`: 1-line "5 nodi · 12 elementi" — per HUD, status bar, badge
 *     inline. Italiano singolare/plurale corretto.
 *   - `detailed`: grid 4-colonne con count + label uppercase mono — per
 *     pannelli di build (es. MakePanel hub Geometria).
 *
 * Selezione delle stats da mostrare via `show` prop. Default = nodi + elementi.
 * Restituisce null se nessun modello attivo (no rendering "0 nodi" senza modello).
 */
import { useModelStore } from "../../store/modelStore";

export type ModelStatKey =
  | "nodes"
  | "elements"
  | "materials"
  | "sections"
  | "constraints"
  | "loads";

interface ModelStatsBadgeProps {
  /** Quali stats mostrare. Default: nodi + elementi. */
  show?: ReadonlyArray<ModelStatKey>;
  /** Variant visiva. Default: compact. */
  variant?: "compact" | "detailed";
  className?: string;
  "data-testid"?: string;
}

const LABELS: Record<ModelStatKey, { singular: string; plural: string; short: string }> = {
  nodes: { singular: "nodo", plural: "nodi", short: "Nodi" },
  elements: { singular: "elemento", plural: "elementi", short: "Elem." },
  materials: { singular: "materiale", plural: "materiali", short: "Mat." },
  sections: { singular: "sezione", plural: "sezioni", short: "Sez." },
  constraints: { singular: "vincolo", plural: "vincoli", short: "Vincoli" },
  loads: { singular: "carico", plural: "carichi", short: "Carichi" },
};

export function ModelStatsBadge(props: ModelStatsBadgeProps) {
  const {
    show = ["nodes", "elements"],
    variant = "compact",
    className,
    "data-testid": dataTestid,
  } = props;
  const model = useModelStore((s) => s.model);
  if (!model) return null;

  const counts: Record<ModelStatKey, number> = {
    nodes: model.nodes?.length ?? 0,
    elements: model.elements?.length ?? 0,
    materials: model.materials?.length ?? 0,
    sections: 0, // FEAModel attuale non espone sections separato; placeholder per estensione futura
    constraints: model.constraints?.length ?? 0,
    loads: model.loads?.length ?? 0,
  };

  if (variant === "detailed") {
    const cols = show.length;
    return (
      <div
        className={`grid gap-1 text-center mb-2 ${className ?? ""}`}
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        data-testid={dataTestid}
      >
        {show.map((key) => (
          <div key={key} className="bg-bg-panel border border-border px-1.5 py-1.5">
            <div className="font-mono text-base font-semibold text-ink leading-none tabular-nums">
              {counts[key]}
            </div>
            <div className="font-mono text-[9px] text-ink-3 uppercase tracking-wide-2 mt-1 font-semibold">
              {LABELS[key].short}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // compact: "5 nodi · 12 elementi"
  return (
    <span className={`inline-flex items-center gap-1 ${className ?? ""}`} data-testid={dataTestid}>
      {show.map((key, i) => {
        const n = counts[key];
        const label = n === 1 ? LABELS[key].singular : LABELS[key].plural;
        return (
          <span key={key} className="inline-flex items-center gap-1">
            {i > 0 && <span className="text-ink-3" aria-hidden>·</span>}
            <span className="tabular-nums font-semibold">{n}</span>
            <span className="text-ink-3">{label}</span>
          </span>
        );
      })}
    </span>
  );
}
