/**
 * NewModelTileSection · Fetta E3.3 (redesign workspace-fasi)
 *
 * Action zone: 1 tile primaria "Nuovo modello" grande (CTA cyan accent) +
 * 2 link sobri laterali ("Apri da template", "Segui un percorso").
 *
 * Sostituisce la vecchia ActionRow v2.7.1 (3 ActionTile uguali). Decisione
 * IA Dashboard #2 di Federico: "1 sola tile + link sobri" (Round 1
 * controproposta confermata "mantieni card 2 righe per link sobri").
 *
 * Replica mockup Claude Design Round 2 `Dashboard.html` sezione
 * `<section class="action-zone">`. Stili in `dashboard-soft.css`.
 */
import { Plus, LayoutGrid, TrendingUp, ArrowRight } from "lucide-react";

export interface NewModelTileSectionProps {
  onNewModel?: () => void;
  onTemplate?: () => void;
  onPercorso?: () => void;
}

export function NewModelTileSection({
  onNewModel,
  onTemplate,
  onPercorso,
}: NewModelTileSectionProps) {
  return (
    <section className="action-zone" data-testid="dash-action-zone">
      {/* Tile primaria — CTA "Nuovo modello" grande accent */}
      <a
        className="new-model-tile"
        href="#"
        onClick={(e) => {
          e.preventDefault();
          if (onNewModel) onNewModel();
          else window.dispatchEvent(new Event("feapro:open-new-model"));
        }}
        data-testid="dash-new-model-tile"
      >
        <span className="nmt-icon" aria-hidden>
          <Plus strokeWidth={2.2} />
        </span>
        <span className="nmt-body">
          <h2>Nuovo modello</h2>
          <p>Costruisci da zero in Studio Pro — unità, sistema di coordinate, canvas. Controllo totale.</p>
        </span>
        <span className="nmt-tail" aria-hidden>
          <span className="nmt-kbd">
            <kbd>⌘</kbd>
            <kbd>N</kbd>
          </span>
          <span className="nmt-go">
            <ArrowRight strokeWidth={2} />
          </span>
        </span>
      </a>

      {/* Link sobri laterali — 2 azioni secondarie */}
      <div className="action-aside" data-testid="dash-action-aside">
        <a
          className="action-link"
          href="#template-gallery"
          onClick={(e) => {
            e.preventDefault();
            if (onTemplate) onTemplate();
            else window.dispatchEvent(new Event("feapro:open-template-gallery"));
          }}
          data-testid="dash-action-template"
        >
          <span className="al-icon" aria-hidden>
            <LayoutGrid strokeWidth={1.8} />
          </span>
          <span className="al-body">
            <span className="al-title">Apri da template</span>
            <span className="al-sub">9 modelli pronti, configurati EC / NTC 18</span>
          </span>
          <span className="al-arrow" aria-hidden>
            <ArrowRight strokeWidth={2} />
          </span>
        </a>
        <a
          className="action-link"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            if (onPercorso) onPercorso();
            else window.dispatchEvent(new Event("feapro:open-percorso-uc1"));
          }}
          data-testid="dash-action-percorso"
        >
          <span className="al-icon" aria-hidden>
            <TrendingUp strokeWidth={1.8} />
          </span>
          <span className="al-body">
            <span className="al-title">Segui un percorso</span>
            <span className="al-sub">Onboarding guidato, step verificabili</span>
          </span>
          <span className="al-arrow" aria-hidden>
            <ArrowRight strokeWidth={2} />
          </span>
        </a>
      </div>
    </section>
  );
}
