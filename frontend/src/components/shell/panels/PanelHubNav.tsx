/**
 * PanelHubNav (v1.5.2 Task 39, v1.7 T1) — primitivi riusabili per
 * progressive disclosure dentro i pannelli (Solve, Verify, Make, Tools,
 * futuri).
 *
 * Pattern (stesso del Tools hub del Task 28):
 *   - PanelHub: lista di card grandi tono-colorate (info/success/purple/
 *     coral/warn/gray) con icona + label + sub-text + chevron drill-in.
 *     Click su una card chiama onSelect(id).
 *   - PanelBreadcrumb: header sticky "← Root › Current" che riporta
 *     l'utente all'hub root (onBack).
 *
 * Tonalita' allineate ai design token CSS (bg-bg-info, text-ink-info,
 * shadow-pop). 6 toni disponibili: info / success / purple / coral / warn / gray.
 *
 * v1.7 T1: aggiunto tono "gray" come 6° tono neutro per hub-card non
 * categorizzate (allinea mockup_reference.html sezione 03/04).
 */
import { ArrowLeft, ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "../../ui/cn";


export type HubTone = "info" | "success" | "purple" | "coral" | "warn" | "gray";


export interface HubCard {
  id: string;
  label: string;
  sub: string;
  icon: LucideIcon;
  tone: HubTone;
  /** Se true: card grigia e non cliccabile. */
  disabled?: boolean;
  /** Se true: mostra chip "soon" accanto al label. */
  soonBadge?: boolean;
}


const TONE_STYLE: Record<HubTone, string> = {
  info:    "bg-bg-info text-ink-info",
  success: "bg-bg-success text-ink-success",
  purple:  "bg-bg-purple text-ink-purple",
  coral:   "bg-bg-coral text-ink-coral",
  warn:    "bg-bg-warn text-ink-warn",
  gray:    "bg-bg-gray text-ink-gray",
};


export function PanelHub({
  cards,
  onSelect,
  testId,
}: {
  cards: HubCard[];
  onSelect: (id: string) => void;
  testId?: string;
}) {
  return (
    <div
      className="p-3 space-y-2 overflow-y-auto"
      data-testid={testId ?? "panel-hub"}
    >
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <button
            key={card.id}
            type="button"
            onClick={() => !card.disabled && onSelect(card.id)}
            disabled={card.disabled}
            data-testid={`hub-card-${card.id}`}
            className={cn(
              "w-full bg-bg-surface border border-border rounded-lg p-3.5 flex items-start gap-3 text-left transition group",
              card.disabled
                ? "opacity-50 cursor-not-allowed"
                : "hover:border-ink-info/40 hover:shadow-pop cursor-pointer",
            )}
          >
            <div
              className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
                TONE_STYLE[card.tone],
              )}
            >
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm flex items-center gap-1.5">
                <span className="truncate">{card.label}</span>
                {card.soonBadge && (
                  <span className="chip chip-purple text-[9px]">soon</span>
                )}
              </div>
              <div className="text-[11px] text-ink-muted leading-snug mt-0.5">
                {card.sub}
              </div>
            </div>
            {!card.disabled && (
              <ChevronRight className="w-4 h-4 text-ink-muted mt-2 group-hover:text-ink-info flex-shrink-0" />
            )}
          </button>
        );
      })}
    </div>
  );
}


export function PanelBreadcrumb({
  root,
  current,
  onBack,
  testId,
}: {
  root: string;
  current: string;
  onBack: () => void;
  testId?: string;
}) {
  return (
    <div
      className="px-3.5 py-2.5 border-b border-border flex items-center gap-1.5 text-[11px] flex-shrink-0"
      data-testid={testId ?? "panel-breadcrumb"}
    >
      <button
        type="button"
        onClick={onBack}
        className="text-ink-muted hover:text-ink flex items-center gap-1 transition-colors"
        data-testid="panel-breadcrumb-back"
      >
        <ArrowLeft className="w-3 h-3" /> {root}
      </button>
      <ChevronRight className="w-2.5 h-2.5 text-ink-dim" />
      <span className="font-semibold text-ink truncate">{current}</span>
    </div>
  );
}
