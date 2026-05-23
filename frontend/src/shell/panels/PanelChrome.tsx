/**
 * PanelChrome (Sprint 5 G9 / alpha.24 · v2.1.6 nav-dedup).
 *
 * Componente base unificato per i 6 macro-panel (Make/Solve/Verify a
 * sinistra; Inspect/View/Tools a destra). Include:
 *   - Header con icona + titolo + sottotitolo + bottone close X (desktop)
 *   - Tabs orizzontali opzionali (sotto header)
 *   - Body scrollabile per il content
 *
 * v2.1.6 (nav-dedup): su mobile l'header viene OMESSO. Il `MobilePanel`
 * wrapping fornisce già titolo + back-arrow nell'header globale. Per
 * evitare 4 intestazioni sovrapposte ("Verifiche / Verify / Verify ›
 * Verifiche live / VERIFICHE LIVE · UC NORMATIVI") sincronizziamo il
 * titolo nel `panelHeaderStore` così il MobilePanel può comporre un
 * unico header "Verifiche · Live" con back-arrow smart.
 *
 * Stile mockup v1.3: ankora absolute al rail (left-14 o right-14), 276px
 * wide, sfondo `bg-bg-elevated`, border laterale, transition slide.
 */
import { IconX, type Icon as TablerIcon } from "@tabler/icons-react";
import clsx from "clsx";
import { useEffect, type ReactNode } from "react";

import { useIsMobile } from "../../hooks/useIsMobile";
import { usePanelHeaderStore } from "../../store/panelHeaderStore";


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

  const isMobile = useIsMobile();
  const setPanelHeader = usePanelHeaderStore((s) => s.set);
  const clearPanelHeader = usePanelHeaderStore((s) => s.clear);

  // v2.1.6: sync title nel panelHeaderStore così MobilePanel può comporre
  // l'header unificato. PanelBreadcrumb (se presente) aggiungerà `current`
  // per il drill-in. Cleanup su unmount.
  useEffect(() => {
    setPanelHeader({ title });
    return () => clearPanelHeader();
  }, [title, setPanelHeader, clearPanelHeader]);

  return (
    <section
      className={clsx(
        "flex-shrink-0 bg-bg-panel flex flex-col overflow-hidden min-h-0",
        // Hotfix mobile: full-width <md (su mobile il PanelChrome e' montato
        // dentro MobilePanel che ha gia' absolute inset-0). Da md in su
        // torna alle width fisse come prima.
        "w-full md:w-[300px] lg:w-[340px] xl:w-[380px]",
        "animate-slide-right",
        // Su mobile niente border laterale (il MobilePanel ha gia' il proprio
        // contenitore). Su desktop manteniamo border-r/l del rail.
        !isMobile && (side === "left" ? "border-r border-border" : "border-l border-border"),
      )}
      data-testid={testId ?? `panel-${side}`}
    >
      {/* v2.1.6: Header Precision visibile SOLO su desktop. Su mobile la sua
          funzione (titolo + close) è ricoperta dal MobilePanel parent. */}
      {!isMobile && (
        <header className="flex items-center px-3 h-11 gap-2 border-b border-border flex-shrink-0 bg-bg-elevated">
          <Icon size={16} className="text-accent flex-shrink-0" />
          <span className="font-display text-sm font-semibold tracking-tight-1 text-ink truncate">{title}</span>
          {subtitle && (
            <span className="ml-1 font-mono text-[10px] uppercase tracking-wide-1 text-ink-3 truncate">
              · {subtitle}
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi pannello"
            data-testid={`${testId ?? `panel-${side}`}-close`}
            className="ml-auto w-6 h-6 flex items-center justify-center text-ink-3 hover:bg-bg-hover hover:text-ink transition-colors"
          >
            <IconX size={14} />
          </button>
        </header>
      )}

      {/* Tabs (opzionali) — visibili anche su mobile perché sono navigazione
          intra-panel di pari livello, non duplicazione del titolo. */}
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
                "font-mono text-[10px] uppercase tracking-wide-1 px-2.5 py-2 cursor-pointer whitespace-nowrap font-semibold",
                "border-b-2 -mb-px transition-colors",
                activeTab === t.id
                  ? "text-accent border-accent"
                  : "text-ink-3 hover:text-ink border-transparent",
              )}
            >
              {t.label}
            </button>
          ))}
        </nav>
      )}

      {/* Body */}
      {/* v2.1.5 mobile-fix: overflow-x-hidden previene che children con contenuto
          ampio (es. tabelle HTML 7 colonne in Verify) spingano il pannello
          fuori dal viewport su mobile 375px. */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 min-w-0">{children}</div>
    </section>
  );
}
