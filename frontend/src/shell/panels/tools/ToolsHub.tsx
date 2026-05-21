/**
 * ToolsHub (v1.5 Task 28).
 *
 * Vista principale del Tools panel: 4 card grandi colorate (info/success/
 * purple/coral). Click su una card → drill-in nella sub-view dedicata.
 *
 * Sostituisce la lista piatta di 5 voci in 2 sezioni di alpha.31 con un
 * pattern "hub navigation" piu' leggibile e meno affastellato.
 */
import { Ruler, Download, ShieldCheck, Receipt, ChevronRight, type LucideIcon } from "lucide-react";
import type { ToolsView } from "../ToolsPanel";


type Tone = "info" | "success" | "purple" | "coral";


interface Hub {
  id: Exclude<ToolsView, "hub">;
  label: string;
  sub: string;
  icon: LucideIcon;
  tone: Tone;
}


const HUBS: Hub[] = [
  {
    id: "measure-snapshot",
    label: "Misure e snapshot",
    sub: "Distanze · angoli · congela stato",
    icon: Ruler,
    tone: "info",
  },
  {
    id: "export",
    label: "Esporta",
    sub: "Report PDF · Excel multi-sheet · CSV dati",
    icon: Download,
    tone: "success",
  },
  {
    id: "validation",
    label: "Validazione",
    sub: "Benchmark NAFEMS · diagnosi modello",
    icon: ShieldCheck,
    tone: "purple",
  },
  {
    id: "cost-preview",
    label: "Cost preview",
    sub: "Stima crediti pre-run",
    icon: Receipt,
    tone: "coral",
  },
];


const TONE_STYLE: Record<Tone, string> = {
  info:    "bg-bg-info text-ink-info",
  success: "bg-bg-success text-ink-success",
  purple:  "bg-bg-purple text-ink-purple",
  coral:   "bg-bg-coral text-ink-coral",
};


export function ToolsHub({ onSelect }: { onSelect: (v: Exclude<ToolsView, "hub">) => void }) {
  return (
    <div className="p-3 space-y-2 overflow-y-auto">
      {HUBS.map((hub) => {
        const Icon = hub.icon;
        return (
          <button
            key={hub.id}
            type="button"
            onClick={() => onSelect(hub.id)}
            data-testid={`tools-hub-${hub.id}`}
            className="w-full bg-bg-panel border border-border hover:border-accent/40 rounded-lg p-3.5 flex items-start gap-3 text-left transition group"
          >
            <div className={`w-9 h-9 rounded-lg ${TONE_STYLE[hub.tone]} flex items-center justify-center shrink-0`}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-ink">{hub.label}</div>
              <div className="text-[11px] text-ink-muted leading-snug mt-0.5">{hub.sub}</div>
            </div>
            <ChevronRight className="w-4 h-4 text-ink-muted mt-2 group-hover:text-ink-info shrink-0" />
          </button>
        );
      })}
    </div>
  );
}
