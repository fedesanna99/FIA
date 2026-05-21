/**
 * ToolsPanel (Sprint 5 G11 / alpha.26) — brief v1.2.1 Step 7.5.
 *
 * Macro-panel "Tools" rail destro: NESSUN tab, sezioni per Modello /
 * Cloud / Pro / Validation / I/O. Shortcut a vari workflow tool.
 */
import {
  IconTool, IconGitCompare, IconRuler, IconCamera, IconFileBarcode,
  IconBox, IconCertificate, IconDownload,
} from "@tabler/icons-react";
import clsx from "clsx";
import { useWorkspaceStore } from "../../store/workspaceStore";
import { useRightRailStore } from "../../store/rightRailStore";
import { useUIStore } from "../../store/uiStore";
import { PanelChrome } from "./PanelChrome";


interface ToolEntry {
  id: string;
  label: string;
  description: string;
  icon: typeof IconTool;
  /** Workspace target oppure null se solo placeholder */
  workspace?: "model" | "analysis" | "results" | "verify" | "io";
  /** Se true mostra chip "soon" */
  soon?: boolean;
  /** Group heading */
  section: "modello" | "cloud" | "pro" | "validation" | "io";
}


const TOOLS: ToolEntry[] = [
  { id: "measure",   label: "Misurazioni",    description: "Distanze e angoli 3D",          icon: IconRuler,        section: "modello", workspace: "model" },
  { id: "compare",   label: "Compare A/B",    description: "Confronta 2 modelli o run",     icon: IconGitCompare,   section: "modello", soon: true },

  { id: "cost",      label: "Cost preview",   description: "Stima crediti pre-run",          icon: IconFileBarcode,  section: "cloud",   workspace: "analysis" },
  { id: "snapshot",  label: "Snapshot",       description: "Congela stato risultati",        icon: IconCamera,       section: "cloud",   workspace: "results" },

  { id: "bim",       label: "BIM viewer IFC", description: "Apri IFC over modello (Asse D)", icon: IconBox,          section: "pro",     soon: true },
  { id: "topology",  label: "Topology opt.",  description: "Ottimizzazione struttura",       icon: IconTool,         section: "pro",     soon: true },

  { id: "validation", label: "Validazione NAFEMS", description: "Report HTML benchmark",   icon: IconCertificate,  section: "validation", workspace: "verify" },

  { id: "export",    label: "Export PDF/Excel", description: "Report multi-sheet",          icon: IconDownload,     section: "io",      workspace: "io" },
];


const SECTION_LABELS: Record<ToolEntry["section"], string> = {
  modello:    "Modello",
  cloud:      "Cloud",
  pro:        "Pro v1.3+",
  validation: "Validazione",
  io:         "I/O",
};


export function ToolsPanel() {
  const closeRight = useWorkspaceStore((s) => s.closeRightPanel);
  const closeRail = useRightRailStore((s) => s.close);
  const setWorkspace = useWorkspaceStore((s) => s.setWorkspace);
  const setDialog = useUIStore((s) => s.setOpenDialog);

  function handleClose() {
    closeRight();
    closeRail();
  }

  function handleClick(t: ToolEntry) {
    if (t.soon || !t.workspace) return;
    setWorkspace(t.workspace);
    handleClose();
  }

  // Raggruppa per section
  const grouped = TOOLS.reduce<Record<string, ToolEntry[]>>((acc, t) => {
    (acc[t.section] = acc[t.section] || []).push(t);
    return acc;
  }, {});

  return (
    <PanelChrome
      side="right"
      title="Tools"
      Icon={IconTool}
      subtitle="Strumenti"
      onClose={handleClose}
      testId="panel-tools"
    >
      <div className="p-2 space-y-3">
        {(Object.keys(grouped) as ToolEntry["section"][]).map((section) => (
          <section key={section}>
            <h3 className="text-[10px] uppercase tracking-wider text-ink-muted font-semibold px-2 mb-1.5">
              {SECTION_LABELS[section]}
            </h3>
            <div className="space-y-0.5">
              {grouped[section].map((t) => {
                const Icon = t.icon;
                const disabled = !!t.soon;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleClick(t)}
                    disabled={disabled}
                    data-testid={`tools-${t.id}`}
                    className={clsx(
                      "w-full flex items-center gap-2 px-2 py-1.5 rounded-sm text-left transition-colors",
                      disabled
                        ? "text-ink-faint cursor-not-allowed"
                        : "hover:bg-bg-hover cursor-pointer text-ink",
                    )}
                  >
                    <Icon size={14} className={disabled ? "text-ink-faint" : "text-accent"} />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium truncate flex items-center gap-1.5">
                        {t.label}
                        {disabled && <span className="chip text-[9px]">soon</span>}
                      </div>
                      <div className="text-[11px] text-ink-muted truncate">{t.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </PanelChrome>
  );
}
