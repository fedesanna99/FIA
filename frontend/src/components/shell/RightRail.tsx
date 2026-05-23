/**
 * RightRail (alpha.17) — Sprint 4 / Asse G.
 *
 * Barra verticale 48px sul lato destro con 4 icone: Inspect / View /
 * Tools + History (spacer bottom). Mirror del LeftRail. Click su
 * un'icona apre un SlidePanel ancorato a sinistra del rail (mockup
 * v1.3 §"6-rail").
 *
 * Coesistenza con WorkspacePanel: in alpha.17 il rail e' opzionale
 * (panel chiuso di default). In alpha.20 il WorkspacePanel sara'
 * rimosso e il rail destro diventera' la home delle viste/tool.
 */
import { Eye, Layers, Wrench, History } from "lucide-react";
import {
  useRightRailStore,
  type RightSection,
} from "../../store/rightRailStore";
import { useModelStore } from "../../store/modelStore";
import { Tooltip } from "../ui/Tooltip";
import { cn } from "../ui/cn";


interface RailItem {
  key: RightSection;
  label: string;
  description: string;
  icon: typeof Eye;
}


const TOP_ITEMS: RailItem[] = [
  { key: "inspect", label: "Inspect", description: "Statica · modale · iso 3D · fatica", icon: Eye },
  { key: "view",    label: "View",    description: "Layer · scala def. · colormap · annotazioni", icon: Layers },
  { key: "tools",   label: "Tools",   description: "Compare · misure · cost preview · BIM viewer", icon: Wrench },
];

const BOTTOM_ITEMS: RailItem[] = [
  { key: "history", label: "History", description: "Snapshot e undo timeline", icon: History },
];


function RailButton({ item, disabled }: { item: RailItem; disabled: boolean }) {
  const openSection = useRightRailStore((s) => s.openSection);
  const toggle = useRightRailStore((s) => s.toggle);
  const Icon = item.icon;
  const active = openSection === item.key;

  return (
    <Tooltip
      side="left"
      content={
        disabled ? (
          <div className="text-[11px]">Apri o crea un modello per iniziare</div>
        ) : (
          <div>
            <div className="font-semibold">{item.label}</div>
            <div className="text-ink-3 text-[11px] mt-0.5">{item.description}</div>
          </div>
        )
      }
    >
      <button
        type="button"
        onClick={() => !disabled && toggle(item.key)}
        disabled={disabled}
        aria-label={item.label}
        aria-current={active ? "page" : undefined}
        aria-expanded={active}
        aria-disabled={disabled}
        data-testid={`right-rail-${item.key}`}
        className={cn(
          "relative w-9 h-9 flex items-center justify-center",
          "transition-colors outline-none",
          "focus-visible:border focus-visible:border-accent",
          disabled
            ? "opacity-30 cursor-not-allowed text-ink-3"
            : active
              ? "bg-accent-subtle text-accent"
              : "text-ink-3 hover:bg-bg-hover hover:text-ink",
        )}
      >
        <Icon className="h-4 w-4" strokeWidth={1.8} />
        {active && !disabled && (
          <span
            className="absolute right-0 top-1.5 bottom-1.5 w-[2px] bg-accent"
            aria-hidden
          />
        )}
      </button>
    </Tooltip>
  );
}


export function RightRail() {
  // v1.6 S0 · B03: senza modello, Inspect/View vanno disabled (mostrano
  // dati derivati). Tools resta abilitato perche' contiene Validation
  // NAFEMS che non richiede un modello caricato. History idem (snapshot
  // store globale).
  const noModel = useModelStore((s) => s.model === null);

  return (
    <nav
      className="w-12 flex-shrink-0 border-l border-border bg-bg-panel flex flex-col py-2 gap-1 items-center"
      aria-label="Right rail (Inspect, View, Tools)"
      data-testid="right-rail"
    >
      {TOP_ITEMS.map((it) => (
        <RailButton
          key={it.key}
          item={it}
          disabled={noModel && it.key === "inspect"}
        />
      ))}

      <div className="flex-1" />

      {BOTTOM_ITEMS.map((it) => <RailButton key={it.key} item={it} disabled={false} />)}
    </nav>
  );
}
