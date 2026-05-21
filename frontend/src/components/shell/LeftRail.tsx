/**
 * LeftRail — barra verticale 48 px (alpha.22 Sprint 4 G7).
 *
 * Toggle slide-in pattern (mockup v1.3 viewport-first):
 *  - Click su Make/Solve/Verify → apre LeftSlidePanel con il workspace
 *  - Click sulla STESSA voce attiva → chiude il panel (toggle)
 *  - Click su voce diversa → sostituisce contenuto del panel
 *
 * Comportamento equivalente al RightRail (alpha.17): persistente
 * tramite `leftRailStore`. Il vecchio `WorkspacePanel` 380px fisso e'
 * stato rimosso in alpha.22 — il viewport e' ora full-width tra i
 * due rail.
 */
import {
  Hammer,
  Cpu,
  ShieldCheck,
  BarChart3,
  ArrowRightLeft,
  HelpCircle,
  Search,
} from "lucide-react";
import { useWorkspaceStore, type Workspace } from "../../store/workspaceStore";
import { useLeftRailStore } from "../../store/leftRailStore";
import { Tooltip } from "../ui/Tooltip";
import { ThemeToggle } from "./ThemeToggle";
import { cn } from "../ui/cn";

interface RailItem {
  key: Workspace;
  label: string;
  description: string;
  icon: typeof Hammer;
  shortcut?: string;
  /** Se true: posizionato in fondo al rail (separato da divider). */
  secondary?: boolean;
}

const ITEMS: RailItem[] = [
  // Voci principali (mockup v1.3): tre fasi del workflow
  { key: "model",    label: "Make",     description: "Geometria · carichi · vincoli · mesh", icon: Hammer,         shortcut: "1" },
  { key: "analysis", label: "Solve",    description: "Statica · modale · dinamica · buckling · pushover", icon: Cpu, shortcut: "2" },
  { key: "verify",   label: "Verify",   description: "EC2/3/5/8 · NTC · fatica · convergenza", icon: ShieldCheck, shortcut: "3" },
  // Voci secondarie (deep-link backward compat — di solito si usa il RightRail)
  { key: "results",  label: "Risultati (legacy)", description: "Deprecato: usa Inspect del rail destro per i risultati", icon: BarChart3, shortcut: "4", secondary: true },
  { key: "io",       label: "I/O (legacy)",       description: "Deprecato: usa Tools per import/export e collab",       icon: ArrowRightLeft, shortcut: "5", secondary: true },
];

function RailButton({ item }: { item: RailItem }) {
  // alpha.22: il rail e' ora TOGGLE slide-in. workspace store rimane
  // sincronizzato con la sezione attiva (per breadcrumb + palette + tab),
  // ma e' il leftRailStore.openSection a guidare la visibilita' del panel.
  const setWorkspace = useWorkspaceStore((s) => s.setWorkspace);
  const openSection = useLeftRailStore((s) => s.openSection);
  const toggle = useLeftRailStore((s) => s.toggle);
  const Icon = item.icon;
  const active = openSection === item.key;

  function handleClick() {
    // Sincronizza sempre il workspace store (per components che lo leggono)
    setWorkspace(item.key);
    // Toggle slide-in panel
    toggle(item.key);
  }

  return (
    <Tooltip
      side="right"
      content={
        <div>
          <div className="font-semibold flex items-center gap-2">
            {item.label}
            {item.shortcut && (
              <kbd className="text-[10px] bg-bg-hover px-1 rounded border border-border">
                {item.shortcut}
              </kbd>
            )}
          </div>
          <div className="text-ink-muted text-[11px] mt-0.5">{item.description}</div>
        </div>
      }
    >
      <button
        type="button"
        onClick={handleClick}
        aria-label={item.label}
        aria-current={active ? "page" : undefined}
        aria-expanded={active}
        data-testid={`left-rail-${item.key}`}
        className={cn(
          "relative w-9 h-9 rounded-md flex items-center justify-center",
          "transition-colors duration-fast outline-none",
          "focus-visible:ring-2 focus-visible:ring-accent/60",
          active
            ? "bg-accent-subtle text-accent"
            : item.secondary
              ? "text-ink-faint hover:bg-bg-hover hover:text-ink-muted"
              : "text-ink-muted hover:bg-bg-hover hover:text-ink",
        )}
      >
        <Icon className="h-4 w-4" strokeWidth={1.8} />
        {active && (
          <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-r bg-accent" aria-hidden />
        )}
      </button>
    </Tooltip>
  );
}


export function LeftRail() {
  const togglePalette = useWorkspaceStore((s) => s.togglePalette);
  const mainItems = ITEMS.filter((i) => !i.secondary);
  const secondaryItems = ITEMS.filter((i) => i.secondary);

  return (
    <nav
      className="w-12 flex-shrink-0 border-r border-border bg-bg-panel flex flex-col py-2 gap-1 items-center"
      aria-label="Workspace navigation"
      data-testid="left-rail"
    >
      {/* Voci principali (Make / Solve / Verify) */}
      {mainItems.map((it) => <RailButton key={it.key} item={it} />)}

      <div className="my-1 w-7 border-t border-border" aria-hidden />

      {/* Command palette */}
      <Tooltip side="right" content={<>Comandi <kbd className="text-[10px] ml-1.5 bg-bg-hover px-1 rounded border border-border">Ctrl K</kbd></>}>
        <button
          type="button"
          onClick={togglePalette}
          aria-label="Apri comandi"
          data-testid="left-rail-palette"
          className="w-9 h-9 rounded-md flex items-center justify-center text-ink-muted hover:bg-bg-hover hover:text-ink transition-colors duration-fast"
        >
          <Search className="h-4 w-4" strokeWidth={1.8} />
        </button>
      </Tooltip>

      <div className="flex-1" />

      {/* Voci secondarie (legacy: Results / I/O) sopra theme/help */}
      {secondaryItems.length > 0 && (
        <>
          <div className="my-1 w-7 border-t border-border" aria-hidden />
          {secondaryItems.map((it) => <RailButton key={it.key} item={it} />)}
        </>
      )}

      {/* Theme toggle (dark/light/system) */}
      <ThemeToggle compact />

      {/* Docs/Help */}
      <Tooltip side="right" content="Documentazione">
        <button
          type="button"
          onClick={() => useWorkspaceStore.getState().setHelp(true)}
          aria-label="Apri documentazione"
          data-testid="left-rail-help"
          className="w-9 h-9 rounded-md flex items-center justify-center text-ink-muted hover:bg-bg-hover hover:text-ink transition-colors duration-fast"
        >
          <HelpCircle className="h-4 w-4" strokeWidth={1.8} />
        </button>
      </Tooltip>
    </nav>
  );
}
