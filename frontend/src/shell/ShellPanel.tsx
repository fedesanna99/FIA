// v2.6.2 Shell · Right Panel (w-380px)
//
// Layout §3.5: header (icon + title + ?) + description + tabs Radix
// + body scrollabile con sezioni eyebrow + content.
//
// In Fase 2 il body ospita i workspace content esistenti via passthrough:
//   - modello   → MakePanel
//   - analisi   → SolvePanel
//   - risultati → InspectPanel
//   - verifiche → VerifyPanel
//   - io        → ToolsPanel
//
// Refactor del content interno (metric grids, UR-strip, inspector card) =
// scope Fase 3+. Il chrome del pannello è già del design system nuovo.

import { ReactNode } from "react";
import { Box, Cog, Activity, CheckCircle, Shuffle, Eye, X } from "lucide-react";
import * as Tabs from "@radix-ui/react-tabs";
// v3.4 Fetta E2-IA Commit E2.2: store del panel destro Shell custom per
// chiudere il pannello via bottone X nell'header (vedi sp-close sotto).
// Default "open" → comportamento attuale invariato.
import { useRightPanelStore } from "../store/rightPanelStore";

type ShellWorkspaceId = "modello" | "analisi" | "risultati" | "verifiche" | "io" | "view";

interface ShellPanelConfig {
  icon: typeof Box;
  title: string;
  desc: string;
  tabs: Array<{ id: string; label: string; count?: number | string }>;
  defaultTab: string;
}

const CONFIG: Record<ShellWorkspaceId, ShellPanelConfig> = {
  modello: {
    icon: Box,
    title: "Modello",
    desc: "Costruisci la struttura: geometria, mesh, sezioni, materiali.",
    tabs: [
      { id: "albero", label: "Albero" },
      { id: "mesh", label: "Mesh" },
      { id: "sezioni", label: "Sezioni · Materiali" },
    ],
    defaultTab: "albero",
  },
  analisi: {
    icon: Cog,
    title: "Analisi",
    desc: "Scegli il tipo di analisi, configura i parametri, lancia il solver.",
    tabs: [
      { id: "lineari", label: "Lineari" },
      { id: "nonlineari", label: "Non lineari" },
      { id: "monitor", label: "Monitor" },
    ],
    defaultTab: "lineari",
  },
  risultati: {
    icon: Activity,
    // v3.4 Fetta E2.5b (29/05 sera): label "Risultati" → "Verifica".
    // Workspace id `risultati` resta invariato (store/route legacy).
    title: "Verifica",
    desc: "Visualizza e interpreta i risultati dell'ultima analisi.",
    tabs: [
      { id: "viewport", label: "Viewport" },
      { id: "diagrammi", label: "Diagrammi" },
      { id: "qualita", label: "Qualità" },
    ],
    defaultTab: "viewport",
  },
  verifiche: {
    icon: CheckCircle,
    title: "Verifiche",
    desc: "Confronto domanda vs resistenza secondo Eurocodici e NTC 2018.",
    tabs: [
      { id: "ec3", label: "EC3" },
      { id: "ec2", label: "EC2", count: "NEW" },
      { id: "ec8", label: "EC8", count: "NEW" },
    ],
    defaultTab: "ec3",
  },
  io: {
    icon: Shuffle,
    title: "I/O & Collab",
    desc: "Import/Export, compare A/B, AI Copilot.",
    tabs: [
      { id: "import", label: "Import" },
      { id: "export", label: "Export" },
      { id: "ai", label: "AI · Collab" },
    ],
    defaultTab: "import",
  },
  // v3.1 Fase 2c: View workspace (ViewPanel = overlay viewport + view preset)
  view: {
    icon: Eye,
    title: "View",
    desc: "Overlay viewport (deformata, colormap, diagrammi, vincoli, etichette) e view preset.",
    tabs: [
      { id: "overlay", label: "Overlay" },
      { id: "preset", label: "Preset" },
    ],
    defaultTab: "overlay",
  },
};

interface ShellPanelProps {
  workspace?: ShellWorkspaceId;
  children?: ReactNode;
}

export function ShellPanel({ workspace = "modello", children }: ShellPanelProps) {
  const config = CONFIG[workspace];
  const HeaderIcon = config.icon;

  return (
    <aside className="shell-panel" aria-label={`Pannello ${config.title}`} data-shell="panel">
      <div className="sp-head">
        <div className="sp-head-row">
          <div className="sp-icon">
            <HeaderIcon size={16} />
          </div>
          <h2>{config.title}</h2>
          <button type="button" className="sp-help" aria-label="Aiuto" title="Aiuto">
            ?
          </button>
          {/* v3.4 Fetta E2-IA Commit E2.2: bottone X chiusura panel destro.
              Click → rightPanelStore.close() → Shell.tsx rimpiazza
              ShellPanel con ShellRightReopenTab (tab verticale 32px). */}
          <button
            type="button"
            className="sp-close"
            onClick={() => useRightPanelStore.getState().close()}
            aria-label="Chiudi pannello"
            title="Chiudi pannello"
            data-testid="shell-panel-close"
          >
            <X size={14} strokeWidth={1.8} aria-hidden />
          </button>
        </div>
        <p className="sp-desc">{config.desc}</p>
      </div>

      <Tabs.Root defaultValue={config.defaultTab} className="contents">
        <Tabs.List className="sp-tabs" aria-label="Tabs workspace">
          {config.tabs.map((tab) => (
            <Tabs.Trigger
              key={tab.id}
              value={tab.id}
              className="sp-tab"
              data-state-active="active"
            >
              {tab.label}
              {tab.count != null && <span className="sp-tab-count">{tab.count}</span>}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <div className="sp-body">{children}</div>
      </Tabs.Root>
    </aside>
  );
}

/**
 * Helper per sezione panel — usabile dai workspace content per coerenza
 * con il design system Soft v2.1.
 */
interface ShellPanelSectionProps {
  eyebrow: string;
  action?: ReactNode;
  children: ReactNode;
}

export function ShellPanelSection({ eyebrow, action, children }: ShellPanelSectionProps) {
  return (
    <div className="sp-section">
      <div className="sp-section-head">
        <span className="sp-section-title">{eyebrow}</span>
        {action && <span className="sp-section-action">{action}</span>}
      </div>
      {children}
    </div>
  );
}
