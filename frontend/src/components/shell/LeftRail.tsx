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
  HelpCircle,
  Search,
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

// v1.5.2 Task 35: rimosse le voci legacy "Risultati (legacy)" + "I/O (legacy)"
// (chiave "results" / "io"). Il workflow utente ora e' Make → Solve → Verify
// e i risultati vivono nel rail destro (Inspect), import/export in Tools.
const ITEMS: RailItem[] = [
  { key: "model",    label: "Make",     description: "Geometria · carichi · vincoli · mesh", icon: Hammer,         shortcut: "1" },
  { key: "analysis", label: "Solve",    description: "Statica · modale · dinamica · buckling · pushover", icon: Cpu, shortcut: "2" },
  { key: "verify",   label: "Verify",   description: "EC2/3/5/8 · NTC · fatica · convergenza", icon: ShieldCheck, shortcut: "3" },
];

function RailButton({ item, disabled }: { item: RailItem; disabled: boolean }) {
  // alpha.22: il rail e' ora TOGGLE slide-in. workspace store rimane
  // sincronizzato con la sezione attiva (per breadcrumb + palette + tab),
  // ma e' il leftRailStore.openSection a guidare la visibilita' del panel.
  // v1.6 S0 · B03: disabled quando model===null (nessun modello attivo).
  const setWorkspace = useWorkspaceStore((s) => s.setWorkspace);
  const openSection = useLeftRailStore((s) => s.openSection);
  const toggle = useLeftRailStore((s) => s.toggle);
  const Icon = item.icon;
  const active = openSection === item.key;

  function handleClick() {
    if (disabled) return;
    // Sincronizza sempre il workspace store (per components che lo leggono)
    setWorkspace(item.key);
    // Toggle slide-in panel
    toggle(item.key);
  }

  return (
    <Tooltip
      side="right"
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


export function LeftRail() {
  const togglePalette = useWorkspaceStore((s) => s.togglePalette);
  // v1.6 S0 · B03: senza modello attivo, le 3 fasi workflow (Make/Solve/
  // Verify) non hanno senso → opacity 30% + cursor not-allowed + tooltip
  // dedicato. Theme + palette + help restano sempre attivi.
  const noModel = useModelStore((s) => s.model === null);

  return (
    <nav
      className="w-12 flex-shrink-0 border-r border-border bg-bg-panel flex flex-col py-2 gap-0.5 items-center"
      aria-label="Workspace navigation"
      data-testid="left-rail"
    >
      {/* v1.8 T5: sezioni categoriali label-uppercase coerenti con mockup
          01/08. Su rail stretto 48px usiamo micro-label 7px tracking-widest
          centrate per separare i gruppi semantici. */}
      <SectionLabel text="FASI" />
      {ITEMS.map((it) => <RailButton key={it.key} item={it} disabled={noModel} />)}

      <SectionLabel text="CMD" />
      {/* Command palette */}
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

      <SectionLabel text="UI" />
      {/* Theme toggle (dark/light/system) */}
      <ThemeToggle compact />

      {/* Docs/Help */}
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
 * SectionLabel (v1.8 T5) — micro-label uppercase 7px per separare gruppi
 * semantici nella LeftRail w-12. Coerente con sezioni del mockup 01/08
 * (WORKSPACES, MAKE, RESULTS, ecc) ridotte alla larghezza disponibile.
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
