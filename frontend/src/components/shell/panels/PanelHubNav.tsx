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
 * Tonalita' allineate ai design token CSS (bg-bg-info, text-accent,
 * shadow-pop). 6 toni disponibili: info / success / purple / coral / warn / gray.
 *
 * v1.7 T1: aggiunto tono "gray" come 6° tono neutro per hub-card non
 * categorizzate (allinea mockup_reference.html sezione 03/04).
 */
import { ArrowLeft, ChevronRight, type LucideIcon } from "lucide-react";
import { useEffect } from "react";

import { useIsMobile } from "../../../hooks/useIsMobile";
import { usePanelHeaderStore } from "../../../store/panelHeaderStore";
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
  info:    "bg-bg-info text-accent",
  success: "bg-bg-success text-success",
  purple:  "bg-bg-purple text-purple",
  coral:   "bg-bg-coral text-coral",
  warn:    "bg-bg-warn text-warn",
  gray:    "bg-bg-gray text-ink-3",
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
              "w-full bg-bg-elevated border border-border p-3.5 flex items-start gap-3 text-left transition-colors group focus-visible:outline-none focus-visible:border-accent",
              card.disabled
                ? "opacity-50 cursor-not-allowed"
                : "hover:border-accent/50 hover:bg-bg-hover cursor-pointer",
            )}
          >
            <div
              className={cn(
                "w-10 h-10 border border-border-light flex items-center justify-center flex-shrink-0",
                TONE_STYLE[card.tone],
              )}
            >
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-display font-semibold text-[15px] tracking-tight-1 text-ink flex items-center gap-1.5">
                <span className="truncate">{card.label}</span>
                {card.soonBadge && (
                  <span className="font-mono text-[9px] uppercase tracking-wide-1 bg-bg-purple text-purple border border-purple/30 px-1 py-0.5 font-semibold">
                    soon
                  </span>
                )}
              </div>
              <div className="text-[11px] text-ink-3 leading-snug mt-1">
                {card.sub}
              </div>
            </div>
            {!card.disabled && (
              <ChevronRight className="w-4 h-4 text-ink-3 mt-2 group-hover:text-accent flex-shrink-0 transition-colors" />
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
  // v2.1.6 nav-dedup: pubblica current + popDrillIn nel panelHeaderStore
  // così MobilePanel può comporre l'header unificato "Verifiche · Live"
  // con back-arrow smart. Cleanup su unmount (= ritorno al hub).
  const setPanelHeader = usePanelHeaderStore((s) => s.set);
  const isMobile = useIsMobile();

  useEffect(() => {
    setPanelHeader({ current, popDrillIn: onBack });
    return () => setPanelHeader({ current: null, popDrillIn: null });
  }, [current, onBack, setPanelHeader]);

  // Su mobile la breadcrumb è ridondante: MobilePanel header mostra già
  // "Verifiche · Live" + back-arrow smart. Niente render.
  if (isMobile) return null;

  return (
    <div
      className="px-3.5 py-2 border-b border-border flex items-center gap-2 font-mono text-[10px] uppercase tracking-wide-1 flex-shrink-0 bg-bg-panel"
      data-testid={testId ?? "panel-breadcrumb"}
    >
      <button
        type="button"
        onClick={onBack}
        className="text-ink-3 hover:text-accent inline-flex items-center gap-1 transition-colors font-semibold"
        data-testid="panel-breadcrumb-back"
      >
        <ArrowLeft className="w-3 h-3" /> {root}
      </button>
      <ChevronRight className="w-2.5 h-2.5 text-ink-4" />
      <span className="font-semibold text-ink-2 truncate normal-case tracking-normal">{current}</span>
    </div>
  );
}
