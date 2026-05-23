/**
 * GlobalSearch (Precision v2.0 PR18 batch A) — search trigger Precision.
 *
 * Apre la command palette (Ctrl+K) al click. Look mockup A1: bg-bg-panel,
 * hairline border, icon + placeholder + kbd shortcut a destra.
 * Su < md: icon-only button compatto.
 */
import { Search } from "lucide-react";
import { useWorkspaceStore } from "../../../store/workspaceStore";


export function GlobalSearch() {
  const togglePalette = useWorkspaceStore((s) => s.togglePalette);

  return (
    <>
      {/* Desktop: search-bar visiva Precision */}
      <button
        type="button"
        onClick={togglePalette}
        aria-label="Cerca comandi e pannelli (Ctrl+K)"
        data-testid="topbar-search"
        className={[
          "hidden md:flex items-center gap-2 px-2.5 h-7",
          "bg-bg-panel hover:bg-bg-elevated border border-border-light hover:border-accent/40",
          "text-ink-3 hover:text-ink transition-colors",
          "w-[200px] lg:w-[280px] text-left text-xs",
          "focus:outline-none focus:border-accent",
        ].join(" ")}
      >
        <Search className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={1.8} />
        <span className="flex-1 truncate">Cerca strumenti, modelli…</span>
        <kbd className="flex-shrink-0 font-mono text-[10px] uppercase tracking-wide-1 bg-bg-hover border border-border-light text-ink-2 px-1 py-0.5 font-medium">
          ⌘ K
        </kbd>
      </button>

      {/* Mobile: icon-only button */}
      <button
        type="button"
        onClick={togglePalette}
        aria-label="Cerca comandi e pannelli"
        data-testid="topbar-search-mobile"
        className={[
          "md:hidden w-7 h-7 flex items-center justify-center",
          "text-ink-3 hover:bg-bg-hover hover:text-ink transition-colors",
        ].join(" ")}
      >
        <Search className="h-4 w-4" strokeWidth={1.8} />
      </button>
    </>
  );
}
