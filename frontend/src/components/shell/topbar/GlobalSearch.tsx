/**
 * GlobalSearch (Precision v2.0 PR18 batch A · v2.1.6 platform-aware kbd).
 *
 * Apre la command palette (Ctrl+K / ⌘ K) al click. Look mockup A1: bg-bg-panel,
 * hairline border, icon + placeholder + kbd shortcut a destra.
 * Su < md: icon-only button compatto.
 *
 * v2.1.6: il modifier mostrato è platform-aware:
 *   - macOS  → "⌘ K"
 *   - Linux/Windows → "Ctrl K"
 * Detection via `navigator.platform` (deprecata ma ancora supportata e
 * fallback affidabile). In jsdom-test l'env default è Linux → "Ctrl K".
 */
import { Search } from "lucide-react";
import { useWorkspaceStore } from "../../../store/workspaceStore";


function isMacPlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  // `navigator.platform` resta il check più affidabile per "darwin family"
  // (Mac, iPhone, iPad). userAgentData.platform è incompleto su Safari.
  const p = (navigator.platform || "").toLowerCase();
  return p.includes("mac") || p.includes("iphone") || p.includes("ipad") || p.includes("ipod");
}

const MOD_LABEL = isMacPlatform() ? "⌘ K" : "Ctrl K";
const MOD_ARIA  = isMacPlatform() ? "Cmd+K" : "Ctrl+K";


export function GlobalSearch() {
  const togglePalette = useWorkspaceStore((s) => s.togglePalette);

  return (
    <>
      {/* Desktop: search-bar visiva Precision */}
      <button
        type="button"
        onClick={togglePalette}
        aria-label={`Cerca comandi e pannelli (${MOD_ARIA})`}
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
          {MOD_LABEL}
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
