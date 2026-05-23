/**
 * InsightPanel (Precision v2.0) — Card insight con border-left tonale.
 *
 * Mockup C6 di handoff Claude Design + uso generale. Card per evidenziare
 * conclusioni post-solve o avvertimenti pre-solve. Composizione:
 *   - Border-left 2px tonale (success/warn/danger/info)
 *   - Eyebrow uppercase mono
 *   - Titolo display
 *   - Lista insight (icon + testo)
 *   - Footer azione opzionale (link "Vai al dettaglio →")
 *
 * Animations:
 *   - Mount: `animate-slide-up` (220ms) — entra dal basso, sensazione che
 *     "appare un risultato"
 *   - Singolo insight item: `animate-fade-in` con stagger leggero via
 *     animation-delay (rendering con `style={{ animationDelay: `${i*60}ms`}}`)
 *   - Hover su action link: `underline` con `transition`
 */
import { type ReactNode } from "react";
import { ArrowRight, Check, AlertTriangle, X, Info, type LucideIcon } from "lucide-react";
import { cn } from "../ui/cn";

export type InsightTone = "info" | "success" | "warn" | "danger";

interface InsightItem {
  icon?: LucideIcon;
  text: ReactNode;
}

interface Props {
  tone?: InsightTone;
  /** Eyebrow uppercase mono ("CRITICAL ELEMENT", "READY TO SOLVE"). */
  eyebrow?: string;
  /** Titolo display (Inter Tight). */
  title: string;
  /** Sub paragraph mono opzionale ("UC max 0.88 su B1"). */
  sub?: string;
  /** Lista di insight item con icon + testo. */
  items?: readonly InsightItem[];
  /** Azione opzionale (link "Vai al dettaglio →" o button). */
  action?: {
    label: string;
    onClick?: () => void;
    /** Se omesso, l'azione si renderizza come button text-accent. */
    href?: string;
  };
  className?: string;
}

const TONE_META: Record<InsightTone, { borderClass: string; eyebrowClass: string; defaultIcon: LucideIcon }> = {
  info:    { borderClass: "border-l-accent",  eyebrowClass: "text-accent",  defaultIcon: Info },
  success: { borderClass: "border-l-success", eyebrowClass: "text-success", defaultIcon: Check },
  warn:    { borderClass: "border-l-warn",    eyebrowClass: "text-warn",    defaultIcon: AlertTriangle },
  danger:  { borderClass: "border-l-danger",  eyebrowClass: "text-danger",  defaultIcon: X },
};

export function InsightPanel({
  tone = "info",
  eyebrow,
  title,
  sub,
  items,
  action,
  className,
}: Props) {
  const toneMeta = TONE_META[tone];
  const DefaultIcon = toneMeta.defaultIcon;

  return (
    <section
      className={cn(
        "bg-bg-panel border border-border border-l-2 animate-slide-up",
        toneMeta.borderClass,
        className,
      )}
      role="region"
      aria-label={title}
      data-testid="insight-panel"
      data-tone={tone}
    >
      <div className="px-4 py-3 flex flex-col gap-2">
        {eyebrow && (
          <div className={cn(
            "font-mono text-[10px] uppercase tracking-wide-4 font-semibold",
            toneMeta.eyebrowClass,
          )}>
            {eyebrow}
          </div>
        )}
        <h3 className="font-display text-lg font-semibold tracking-tight-2 text-ink leading-snug">
          {title}
        </h3>
        {sub && <p className="font-mono text-xs text-ink-2 tabular-nums">{sub}</p>}

        {items && items.length > 0 && (
          <ul className="mt-2 flex flex-col gap-1.5">
            {items.map((it, i) => {
              const Icon = it.icon ?? DefaultIcon;
              return (
                <li
                  key={i}
                  className="flex items-start gap-2 text-base text-ink-2 leading-relaxed animate-fade-in"
                  style={{ animationDelay: `${i * 60}ms`, animationFillMode: "both" }}
                >
                  <Icon
                    className={cn("w-3.5 h-3.5 mt-0.5 flex-shrink-0", toneMeta.eyebrowClass)}
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                  <span className="min-w-0">{it.text}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {action && (
        <div className="border-t border-border px-4 py-2">
          {action.href ? (
            <a
              href={action.href}
              className={cn(
                "inline-flex items-center gap-1.5 text-md font-medium",
                "hover:underline transition-all duration-fast",
                toneMeta.eyebrowClass,
              )}
            >
              {action.label}
              <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} aria-hidden="true" />
            </a>
          ) : (
            <button
              type="button"
              onClick={action.onClick}
              className={cn(
                "inline-flex items-center gap-1.5 text-md font-medium",
                "hover:underline transition-all duration-fast",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                toneMeta.eyebrowClass,
              )}
              data-testid="insight-panel-action"
            >
              {action.label}
              <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} aria-hidden="true" />
            </button>
          )}
        </div>
      )}
    </section>
  );
}
