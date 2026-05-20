/**
 * LeftRail — barra verticale 48 px con 6 icone workspace.
 * Switch workspace via Zustand `workspaceStore`.
 *
 * UX:
 *  - Hover → tooltip lato destro
 *  - Active → background accent-subtle + barra verticale 2px accent
 *  - Keyboard: `1`–`5` switchano workspace (gestito in CommandPalette / shortcuts)
 */
import {
  Boxes,
  Cpu,
  BarChart3,
  ShieldCheck,
  ArrowRightLeft,
  HelpCircle,
  Search,
} from "lucide-react";
import { useWorkspaceStore, type Workspace } from "../../store/workspaceStore";
import { Tooltip } from "../ui/Tooltip";
import { ThemeToggle } from "./ThemeToggle";
import { cn } from "../ui/cn";

interface RailItem {
  key: Workspace;
  label: string;
  description: string;
  icon: typeof Boxes;
  shortcut?: string;
}

const ITEMS: RailItem[] = [
  { key: "model",    label: "Modello",   description: "Geometria, carichi, vincoli", icon: Boxes,           shortcut: "1" },
  { key: "analysis", label: "Analisi",   description: "Statica · modale · dinamica · buckling", icon: Cpu,  shortcut: "2" },
  { key: "results",  label: "Risultati", description: "Deformata, stress, diagrammi", icon: BarChart3,      shortcut: "3" },
  { key: "verify",   label: "Verifiche", description: "EC2/3/5/8 · NTC · fatica",     icon: ShieldCheck,    shortcut: "4" },
  { key: "io",       label: "I/O & Collab", description: "Import/export · AI · multi-utente", icon: ArrowRightLeft, shortcut: "5" },
];

export function LeftRail() {
  const workspace = useWorkspaceStore((s) => s.workspace);
  const setWorkspace = useWorkspaceStore((s) => s.setWorkspace);
  const togglePalette = useWorkspaceStore((s) => s.togglePalette);

  return (
    <nav
      className="w-12 flex-shrink-0 border-r border-border bg-bg-panel flex flex-col py-2 gap-1 items-center"
      aria-label="Workspace navigation"
    >
      {ITEMS.map((it) => {
        const Icon = it.icon;
        const active = workspace === it.key;
        return (
          <Tooltip
            key={it.key}
            side="right"
            content={
              <div>
                <div className="font-semibold flex items-center gap-2">
                  {it.label}
                  {it.shortcut && (
                    <kbd className="text-[10px] bg-bg-hover px-1 rounded border border-border">
                      {it.shortcut}
                    </kbd>
                  )}
                </div>
                <div className="text-ink-muted text-[11px] mt-0.5">{it.description}</div>
              </div>
            }
          >
            <button
              type="button"
              onClick={() => setWorkspace(it.key)}
              aria-label={it.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative w-9 h-9 rounded-md flex items-center justify-center",
                "transition-colors duration-fast outline-none",
                "focus-visible:ring-2 focus-visible:ring-accent/60",
                active
                  ? "bg-accent-subtle text-accent"
                  : "text-ink-muted hover:bg-bg-hover hover:text-ink",
              )}
            >
              <Icon className="h-4.5 w-4.5" strokeWidth={1.8} />
              {active && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-r bg-accent" aria-hidden />
              )}
            </button>
          </Tooltip>
        );
      })}

      <div className="my-1 w-7 border-t border-border" aria-hidden />

      {/* Command palette */}
      <Tooltip side="right" content={<>Comandi <kbd className="text-[10px] ml-1.5 bg-bg-hover px-1 rounded border border-border">Ctrl K</kbd></>}>
        <button
          type="button"
          onClick={togglePalette}
          aria-label="Apri comandi"
          className="w-9 h-9 rounded-md flex items-center justify-center text-ink-muted hover:bg-bg-hover hover:text-ink transition-colors duration-fast"
        >
          <Search className="h-4 w-4" strokeWidth={1.8} />
        </button>
      </Tooltip>

      <div className="flex-1" />

      {/* Theme toggle (dark/light/system) */}
      <ThemeToggle compact />

      {/* Docs/Help */}
      <Tooltip side="right" content="Documentazione">
        <button
          type="button"
          onClick={() => useWorkspaceStore.getState().setHelp(true)}
          aria-label="Apri documentazione"
          className="w-9 h-9 rounded-md flex items-center justify-center text-ink-muted hover:bg-bg-hover hover:text-ink transition-colors duration-fast"
        >
          <HelpCircle className="h-4 w-4" strokeWidth={1.8} />
        </button>
      </Tooltip>
    </nav>
  );
}
