/**
 * RecentModelsGrid (v2.6.5 D.2) — sezione "Modelli recenti" home dashboard
 * (mockup FEA_Pro · Dashboard A1 §Inizia-da-qui).
 *
 * Layout:
 *   - Header: title "Modelli recenti" (display sm) + "Vedi tutti →" link
 *     (apre ModelliBrowser via event)
 *   - Grid: 4 card responsive (4-col desktop, 2-col mid, 1-col mobile)
 *
 * Empty state: NESSUN render se 0 modelli utente. La sezione non si crea
 * per chi non ha modelli (regola UX "non disturbare nuovi utenti").
 *
 * v2.6.5 D.2: pattern prop-driven (`onSelect`) coerente con Dashboard.tsx
 * (parent passa `setActiveId` callback). Niente event dispatch globale
 * per `select-model` (gap pre-esistente in App.tsx, vedi ModelliBrowser).
 */
import { useRecentModels } from "../../lib/recentModels";
import { RecentModelCard } from "./RecentModelCard";

interface Props {
  /** Callback al click su una card → parent setta activeId del modello. */
  onSelect: (id: string) => void;
}

export function RecentModelsGrid({ onSelect }: Props) {
  const { data: models, isLoading, isError } = useRecentModels(4);

  // Loading state: niente render (non vogliamo flash skeleton sotto "Inizia da qui")
  if (isLoading) return null;

  // Error o empty: sezione invisibile (no empty state placeholder)
  if (isError || !models || models.length === 0) return null;

  const handleSeeAll = () => {
    window.dispatchEvent(new Event("feapro:open-models-list"));
  };

  return (
    <section className="recent-models" data-testid="recent-models-grid">
      <div className="recent-models__header">
        <h2 className="recent-models__title">Modelli recenti</h2>
        <button
          type="button"
          className="recent-models__see-all"
          onClick={handleSeeAll}
          data-testid="recent-models-see-all"
        >
          Vedi tutti →
        </button>
      </div>
      <div className="recent-models__grid">
        {models.map((model) => (
          <RecentModelCard
            key={model.id}
            model={model}
            onClick={() => onSelect(model.id)}
          />
        ))}
      </div>
    </section>
  );
}
