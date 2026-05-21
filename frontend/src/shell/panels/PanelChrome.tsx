/**
 * PanelChrome (Sprint 5 G9 / alpha.24) — brief v1.2.1 Step 7.1.
 *
 * Componente base unificato per i 6 macro-panel (Make/Solve/Verify a
 * sinistra; Inspect/View/Tools a destra). Include:
 *   - Header con icona + titolo + sottotitolo + bottone close X
 *   - Tabs orizzontali opzionali (sotto header)
 *   - Body scrollabile per il content
 *
 * Stile mockup v1.3: ankora absolute al rail (left-14 o right-14), 276px
 * wide, sfondo `bg-bg-surface`, border laterale, transition slide.
 */
import { IconX, type Icon as TablerIcon } from "@tabler/icons-react";
import clsx from "clsx";
import type { ReactNode } from "react";


export interface PanelTab {
  id: string;
  label: string;
}


interface PanelChromeProps {
  side: "left" | "right";
  title: string;
  Icon: TablerIcon;
  subtitle?: string;
  tabs?: PanelTab[];
  activeTab?: string;
  onTabChange?: (id: string) => void;
  onClose: () => void;
  children: ReactNode;
  /** data-testid suffix per il container (default `panel-${side}`). */
  testId?: string;
}


export function PanelChrome(props: PanelChromeProps) {
  const {
    side, title, Icon, subtitle, tabs, activeTab, onTabChange, onClose,
    children, testId,
  } = props;

  return (
    <section
      className={clsx(
        "flex-shrink-0 bg-bg-panel flex flex-col overflow-hidden min-h-0",
        "w-[300px] lg:w-[340px] xl:w-[380px]",
        "animate-slide-right",
        side === "left" ? "border-r border-border" : "border-l border-border",
      )}
      data-testid={testId ?? `panel-${side}`}
    >
      {/* Header */}
      <header className="flex items-center px-3 h-10 gap-2 border-b border-border flex-shrink-0">
        <Icon size={16} className="text-accent flex-shrink-0" />
        <span className="text-sm font-semibold text-ink truncate">{title}</span>
        {subtitle && (
          <span className="ml-1 text-[11px] font-mono font-normal text-ink-muted truncate">
            · {subtitle}
          </span>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Chiudi pannello"
          data-testid={`${testId ?? `panel-${side}`}-close`}
          className="ml-auto w-6 h-6 rounded flex items-center justify-center text-ink-muted hover:bg-bg-hover hover:text-ink transition-colors"
        >
          <IconX size={14} />
        </button>
      </header>

      {/* Tabs (opzionali) */}
      {tabs && tabs.length > 0 && (
        <nav
          className="flex px-2 border-b border-border overflow-x-auto flex-shrink-0"
          role="tablist"
          aria-label={`${title} tabs`}
        >
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={activeTab === t.id}
              onClick={() => onTabChange?.(t.id)}
              data-testid={`${testId ?? `panel-${side}`}-tab-${t.id}`}
              className={clsx(
                "text-[11px] px-2.5 py-2 cursor-pointer whitespace-nowrap font-medium",
                "border-b-2 -mb-px transition-colors",
                activeTab === t.id
                  ? "text-accent border-accent"
                  : "text-ink-muted hover:text-ink border-transparent",
              )}
            >
              {t.label}
            </button>
          ))}
        </nav>
      )}

      {/* Body */}
      <div className="flex-1 overflow-y-auto min-h-0">{children}</div>
    </section>
  );
}
