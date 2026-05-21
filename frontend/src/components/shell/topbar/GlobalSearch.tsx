/**
 * GlobalSearch (alpha.18) — Sprint 4 / Asse G3.
 *
 * Search-bar globale che apre la command palette (`Ctrl+K`) al click.
 * Look & feel mockup v1.3: input read-only stylizzato con icona +
 * placeholder + kbd shortcut a destra.
 *
 * Non e' un vero input — e' un trigger visivo per la palette. Quando
 * l'utente clicca, apre paletteOpen → la palette gestisce l'input
 * reale internamente.
 *
 * Su < md: visibile come icona search compatta.
 * Su >= md: full input bar 220-280px.
 */
import { Search } from "lucide-react";
import { useWorkspaceStore } from "../../../store/workspaceStore";


export function GlobalSearch() {
  const togglePalette = useWorkspaceStore((s) => s.togglePalette);

  return (
    <>
      {/* Desktop: search-bar visiva */}
      <button
        type="button"
        onClick={togglePalette}
        aria-label="Cerca comandi e pannelli (Ctrl+K)"
        data-testid="topbar-search"
        className={[
          "hidden md:flex items-center gap-2 px-2.5 h-7 rounded-md",
          "bg-bg-hover hover:bg-bg-elevated border border-border",
          "text-ink-muted hover:text-ink transition-colors",
          "w-[180px] lg:w-[240px] text-left text-xs",
          "focus:outline-none focus:ring-2 focus:ring-accent/60",
        ].join(" ")}
      >
        <Search className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={1.8} />
        <span className="flex-1 truncate">Cerca…</span>
        <kbd className="kbd flex-shrink-0">Ctrl K</kbd>
      </button>

      {/* Mobile/tablet: icon-only button */}
      <button
        type="button"
        onClick={togglePalette}
        aria-label="Cerca comandi e pannelli"
        data-testid="topbar-search-mobile"
        className={[
          "md:hidden w-7 h-7 rounded flex items-center justify-center",
          "text-ink-muted hover:bg-bg-hover hover:text-ink transition-colors",
        ].join(" ")}
      >
        <Search className="h-4 w-4" strokeWidth={1.8} />
      </button>
    </>
  );
}
