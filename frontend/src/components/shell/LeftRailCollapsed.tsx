/**
 * LeftRailCollapsed (v2.6.6 E.2) — fallback icon-only del chrome legacy.
 *
 * Pattern: w-12 (48px) verticale con 3 voci workflow (Make/Solve/Verify),
 * SectionLabel `FASI`/`CMD`/`UI`, tooltip on hover, disabled state quando
 * `noModel`.
 *
 * Estratto dall'originale `LeftRail.tsx` pre-v2.6.6 (cfr. git history per
 * il file completo intatto). Backward compat 100% — questa è la versione
 * "compressa" che si vede su mobile (≤768px) o dopo click "Comprimi" nella
 * versione expanded.
 *
 * Props:
 *   - onExpand: callback chiamato dal toggle `Espandi rail` per riportare
 *     l'utente alla modalità expanded (v2.6.6 E.2: aggiunto bottone toggle).
 */
import {
  Hammer,
  Cpu,
  ShieldCheck,
  HelpCircle,
  Search,
  ChevronRight,
} from "lucide-react";
import { useWorkspaceStore, type Workspace } from "../../store/workspaceStore";
import { useLeftRailStore } from "../../store/leftRailStore";
import { useModelStore } from "../../store/modelStore";
import { Tooltip } from "../ui/Tooltip";
import { ThemeToggle } from "./ThemeToggle";
import { cn } from "../ui/cn";

interface RailItem {
  key: Workspace;
  label: string;
  description: string;
  icon: typeof Hammer;
  shortcut?: string;
}

// v1.5.2 Task 35: rimosse le voci legacy "Risultati (legacy)" + "I/O (legacy)".
// Il workflow utente ora è Make → Solve → Verify e i risultati vivono nel
// rail destro (Inspect), import/export in Tools.
const ITEMS: RailItem[] = [
  { key: "model",    label: "Make",     description: "Geometria · carichi · vincoli · mesh", icon: Hammer,         shortcut: "1" },
  { key: "analysis", label: "Solve",    description: "Statica · modale · dinamica · buckling · pushover", icon: Cpu, shortcut: "2" },
  { key: "verify",   label: "Verify",   description: "EC2/3/5/8 · NTC · fatica · convergenza", icon: ShieldCheck, shortcut: "3" },
];

function RailButton({ item, disabled }: { item: RailItem; disabled: boolean }) {
  const setWorkspace = useWorkspaceStore((s) => s.setWorkspace);
  const openSection = useLeftRailStore((s) => s.openSection);
  const toggle = useLeftRailStore((s) => s.toggle);
  const Icon = item.icon;
  const active = openSection === item.key;

  function handleClick() {
    if (disabled) return;
    setWorkspace(item.key);
    toggle(item.key);
  }

  return (
    <Tooltip
      side="right"
      disabled={active && !disabled}
      content={
        disabled ? (
          <div className="text-[11px]">
            Apri o crea un modello per iniziare
          </div>
        ) : (
          <div>
            <div className="font-semibold flex items-center gap-2">
              {item.label}
              {item.shortcut && (
                <kbd className="font-mono text-[10px] uppercase tracking-wide-1 bg-bg-hover border border-border-light text-ink-2 px-1 py-0.5 font-medium">
                  {item.shortcut}
                </kbd>
              )}
            </div>
            <div className="text-ink-3 text-[11px] mt-0.5">{item.description}</div>
          </div>
        )
      }
    >
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        aria-label={item.label}
        aria-current={active ? "page" : undefined}
        aria-expanded={active}
        aria-disabled={disabled}
        data-testid={`left-rail-${item.key}`}
        className={cn(
          "relative w-9 h-9 flex items-center justify-center",
          "transition-colors outline-none",
          "focus-visible:border focus-visible:border-accent",
          disabled
            ? "opacity-30 cursor-not-allowed text-ink-3"
            : active
              ? "bg-accent-subtle text-accent border-r-2 border-accent"
              : "text-ink-3 hover:bg-bg-hover hover:text-ink",
        )}
      >
        <Icon className="h-4 w-4" strokeWidth={1.8} />
        {active && !disabled && (
          <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] bg-accent" aria-hidden />
        )}
      </button>
    </Tooltip>
  );
}

interface LeftRailCollapsedProps {
  /** Callback per espandere la rail (chiamato dal toggle `Espandi rail`). */
  onExpand?: () => void;
}

export function LeftRailCollapsed({ onExpand }: LeftRailCollapsedProps) {
  const togglePalette = useWorkspaceStore((s) => s.togglePalette);
  const noModel = useModelStore((s) => s.model === null);

  return (
    <nav
      className="w-12 flex-shrink-0 border-r border-border bg-bg-panel flex flex-col py-2 gap-0.5 items-center"
      aria-label="Workspace navigation (compresso)"
      data-testid="left-rail-collapsed"
    >
      <SectionLabel text="FASI" />
      {ITEMS.map((it) => <RailButton key={it.key} item={it} disabled={noModel} />)}

      <SectionLabel text="CMD" />
      <Tooltip side="right" content={<>Comandi <kbd className="font-mono text-[10px] uppercase tracking-wide-1 ml-1.5 bg-bg-hover border border-border-light text-ink-2 px-1 py-0.5 font-medium">⌘ K</kbd></>}>
        <button
          type="button"
          onClick={togglePalette}
          aria-label="Apri comandi"
          data-testid="left-rail-palette"
          className="w-9 h-9 flex items-center justify-center text-ink-3 hover:bg-bg-hover hover:text-ink transition-colors"
        >
          <Search className="h-4 w-4" strokeWidth={1.8} />
        </button>
      </Tooltip>

      <div className="flex-1" />

      {/* v2.6.6 E.2: toggle Espandi rail (riporta a expanded mode). */}
      {onExpand && (
        <Tooltip side="right" content="Espandi navigazione">
          <button
            type="button"
            onClick={onExpand}
            aria-label="Espandi rail"
            data-testid="left-rail-toggle-expand"
            className="w-9 h-9 flex items-center justify-center text-ink-3 hover:bg-bg-hover hover:text-ink transition-colors"
          >
            <ChevronRight className="h-4 w-4" strokeWidth={1.8} />
          </button>
        </Tooltip>
      )}

      <SectionLabel text="UI" />
      <ThemeToggle compact />

      <Tooltip side="right" content="Documentazione">
        <button
          type="button"
          onClick={() => useWorkspaceStore.getState().setHelp(true)}
          aria-label="Apri documentazione"
          data-testid="left-rail-help"
          className="w-9 h-9 flex items-center justify-center text-ink-3 hover:bg-bg-hover hover:text-ink transition-colors"
        >
          <HelpCircle className="h-4 w-4" strokeWidth={1.8} />
        </button>
      </Tooltip>
    </nav>
  );
}

/**
 * SectionLabel — micro-label uppercase 7px per separare gruppi semantici
 * nella LeftRail w-12. Coerente con sezioni del mockup ridotte alla
 * larghezza disponibile.
 */
function SectionLabel({ text }: { text: string }) {
  return (
    <div
      className="text-[7px] uppercase tracking-[0.15em] text-ink-4 font-mono font-semibold mt-1.5 mb-0.5 select-none"
      aria-hidden
    >
      {text}
    </div>
  );
}
