/**
 * RailSections (v2.6.6 E.2) — componente UI condiviso per il rendering
 * della rail expanded (200px) con 4 sezioni testuali + 12 voci + toggle
 * Comprimi.
 *
 * Match composition mockup `FEA_Pro · Dashboard A1.pdf`.
 *
 * Utilizzato da:
 *   - `frontend/src/shell/ShellRail.tsx` (Shell custom v2.6.x)
 *   - `frontend/src/components/shell/LeftRail.tsx` (chrome legacy)
 *
 * Pattern: presentational component senza side-effect. Riceve `activeItemId`
 * e callback `onItemClick` / `onCollapse` dal parent. Il parent decide
 * come implementare la action dispatch (vedi `useRailDispatch`).
 */
import { ChevronLeft } from "lucide-react";
import {
  RAIL_SECTIONS,
  RAIL_SECTION_ORDER,
  type RailItem,
  type RailSectionId,
} from "../../../lib/railConfig";

interface RailSectionsProps {
  /**
   * Item id attualmente attivo (es. "checks", "linear"). La voce
   * corrispondente riceve `data-active="true"`. Undefined = nessuna attiva.
   */
  activeItemId?: string;
  /** Callback chiamato con il `RailItem` cliccato. */
  onItemClick: (item: RailItem) => void;
  /** Callback chiamato quando l'utente clicca il toggle "Comprimi". */
  onCollapse: () => void;
  /** Label custom per il toggle Comprimi (default "Comprimi"). */
  collapseLabel?: string;
  /** Sezioni da mostrare (default: tutte le 4). Utile per varianti future. */
  sections?: readonly RailSectionId[];
  /** className aggiuntivo per il `<nav>` wrapper (es. test variants). */
  className?: string;
}

/**
 * Rail expanded multi-sezione. Renderizza le sezioni nell'ordine `RAIL_SECTION_ORDER`
 * (o subset via prop `sections`).
 *
 * data-testid convention (v2.6.6 E.2 + E.5 smoke):
 *   - `rail-section-{SECTION_ID}` su ciascun eyebrow (es. `rail-section-WORKSPACE`)
 *   - `rail-item-{item.id}` su ciascun button (es. `rail-item-linear`)
 *   - `rail-collapse-toggle` sul bottone Comprimi
 */
export function RailSections({
  activeItemId,
  onItemClick,
  onCollapse,
  collapseLabel = "Comprimi",
  sections = RAIL_SECTION_ORDER,
  className,
}: RailSectionsProps) {
  return (
    <nav
      className={`rail-sections${className ? ` ${className}` : ""}`}
      aria-label="Navigazione principale"
      data-shell="rail"
      data-expanded="true"
    >
      {sections.map((sectionId) => (
        <div className="rail-section" key={sectionId}>
          <div
            className="rail-section-eyebrow"
            data-testid={`rail-section-${sectionId}`}
          >
            {sectionId}
          </div>
          <ul className="rail-section-items">
            {RAIL_SECTIONS[sectionId].map((item) => {
              const Icon = item.icon;
              const isActive = activeItemId === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className="rail-item"
                    onClick={() => onItemClick(item)}
                    data-active={isActive ? "true" : undefined}
                    data-action={item.action}
                    data-testid={`rail-item-${item.id}`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <Icon className="rail-item-icon" size={14} strokeWidth={1.8} />
                    <span className="rail-item-label">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      <div className="rail-spacer" />

      <button
        type="button"
        className="rail-collapse"
        onClick={onCollapse}
        data-testid="rail-collapse-toggle"
        aria-label="Comprimi rail"
      >
        <ChevronLeft className="rail-collapse-icon" size={12} strokeWidth={2} />
        <span>{collapseLabel}</span>
      </button>
    </nav>
  );
}
