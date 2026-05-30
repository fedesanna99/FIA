/**
 * RecentModelsGrid (v2.6.5 D.2 → v2.6.6 E.3 empty state + skeleton).
 *
 * Sezione "Modelli recenti" home dashboard A1 (mockup §Inizia-da-qui).
 *
 * Layout:
 *   - Header: title "Modelli recenti" (display sm) + "Vedi tutti →" link
 *     (apre ModelliBrowser via event)
 *   - Grid: 4 card responsive (4-col desktop, 2-col mid, 1-col mobile)
 *
 * Stati (v2.6.6 E.3):
 *   - **loading**: skeleton 4 card placeholder shimmer (no flash bianco)
 *   - **empty** (0 modelli user-created): empty state esplicito con icona
 *     + messaggio + 2 CTA ("Apri galleria template" + "Nuovo modello da zero")
 *   - **error**: sezione invisibile (return null)
 *   - **populated**: grid con N card (max 4)
 *
 * v2.6.6 E.3: pattern empty state coerente con mockup A1 che mostra sezione
 * sempre visibile. Risolve gap composition pre-v2.6.6 dove la sezione era
 * auto-hide quando l'utente non aveva modelli user-created (i 9 esempi `ex_*`
 * sono esclusi dal filtro `useRecentModels`).
 */
import { FolderOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useRecentModels } from "../../lib/recentModels";
import { RecentModelCard } from "./RecentModelCard";

interface Props {
  /** Callback al click su una card → parent setta activeId del modello. */
  onSelect: (id: string) => void;
}

export function RecentModelsGrid({ onSelect }: Props) {
  const navigate = useNavigate();
  const { data: models, isLoading, isError } = useRecentModels(4);

  // Loading state: skeleton placeholder (no flash bianco né null intermittente)
  if (isLoading) {
    return <RecentModelsSkeleton />;
  }

  // Error: sezione invisibile (network failure non degna di empty state UI)
  if (isError) return null;

  // Empty state: utenti vergini senza modelli user-created. v2.6.6 E.3:
  // mostra placeholder + CTA invece di nascondere la sezione (match A1).
  if (!models || models.length === 0) {
    return <RecentModelsEmpty />;
  }

  // MOD-1 (31/05/2026): era emit `feapro:open-models-list` (apriva overlay
  // ModelliBrowser). Ora naviga alla page route reale `/modelli` che mostra
  // la stessa lista (riusa il componente puro `ModelsList`). URL
  // condivisibile/bookmark-able + DashTopBar nav consistente.
  const handleSeeAll = () => {
    navigate("/modelli");
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

/**
 * Empty state placeholder (v2.6.6 E.3) — sezione sempre visibile con CTA
 * educational. Match mockup A1 che mostra "Modelli recenti" come surface
 * di onboarding anche per utenti vergini.
 */
function RecentModelsEmpty() {
  const handleOpenTemplates = () => {
    window.dispatchEvent(new Event("feapro:open-template-gallery"));
  };
  const handleCreateNew = () => {
    window.dispatchEvent(new Event("feapro:open-new-model"));
  };

  return (
    <section
      className="recent-models recent-models--empty"
      data-testid="recent-models-empty"
      aria-label="Modelli recenti"
    >
      <div className="recent-models__header">
        <h2 className="recent-models__title">Modelli recenti</h2>
      </div>
      <div className="recent-models__empty-state" role="status">
        <FolderOpen
          className="recent-models__empty-icon"
          aria-hidden="true"
          strokeWidth={1.5}
        />
        <p className="recent-models__empty-message">
          Non hai ancora salvato modelli.
          <br />
          Inizia da un template o crea da zero.
        </p>
        <div className="recent-models__empty-ctas">
          <button
            type="button"
            className="recent-models__empty-cta recent-models__empty-cta--primary"
            onClick={handleOpenTemplates}
            data-testid="recent-empty-cta-templates"
          >
            Apri galleria template →
          </button>
          <button
            type="button"
            className="recent-models__empty-cta recent-models__empty-cta--secondary"
            onClick={handleCreateNew}
            data-testid="recent-empty-cta-new"
          >
            Nuovo modello da zero
          </button>
        </div>
      </div>
    </section>
  );
}

/**
 * Loading skeleton (v2.6.6 E.3) — 4 card placeholder con animazione shimmer
 * durante il fetch iniziale. Evita flash bianco e dà feedback visivo.
 */
function RecentModelsSkeleton() {
  return (
    <section
      className="recent-models recent-models--loading"
      data-testid="recent-models-skeleton"
      aria-busy="true"
      aria-label="Caricamento modelli recenti"
    >
      <div className="recent-models__header">
        <h2 className="recent-models__title">Modelli recenti</h2>
      </div>
      <div className="recent-models__grid">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="recent-model-card recent-model-card--skeleton"
            aria-hidden="true"
            data-testid={`recent-model-skeleton-${i}`}
          >
            <div className="recent-model-card__thumbnail skeleton-shimmer" />
            <div className="recent-model-card__info">
              <div className="skeleton-line skeleton-line--lg" />
              <div className="skeleton-line skeleton-line--sm" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
