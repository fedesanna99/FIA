/**
 * ToolsPanel (Sprint 5 G11 / alpha.26) — brief v1.2.1 Step 7.5.
 *
 * Macro-panel "Tools" rail destro: NESSUN tab, sezioni per Modello /
 * Cloud / Pro / Validation / I/O. Shortcut a vari workflow tool.
 */
import {
  IconTool, IconRuler, IconCamera, IconFileBarcode,
  IconCertificate, IconDownload,
} from "@tabler/icons-react";
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
  /** Group heading (2 sezioni post Task 22) */
  section: "modello" | "output";
}


// alpha.31 Task 22: dal pannello rimosse le 3 voci "soon" (Compare A/B,
// BIM viewer IFC, Topology opt.) — restavano spazialmente come voci
// attive ma erano disabled. Le rivedremo quando saranno feature reali.
// Tools raggruppati in 2 sezioni invece di 5 per ridurre il rumore.
const TOOLS: ToolEntry[] = [
  // ── Modello ───────────────────────────────────────────────────────────
  { id: "measure",   label: "Misurazioni",   description: "Distanze e angoli 3D",     icon: IconRuler,       section: "modello", workspace: "model" },
  { id: "snapshot",  label: "Snapshot",      description: "Congela stato risultati",  icon: IconCamera,      section: "modello", workspace: "results" },
  { id: "cost",      label: "Cost preview",  description: "Stima crediti pre-run",    icon: IconFileBarcode, section: "modello", workspace: "analysis" },

  // ── Output ────────────────────────────────────────────────────────────
  { id: "export",     label: "Export PDF/Excel",   description: "Report multi-sheet",   icon: IconDownload,    section: "output", workspace: "io" },
  { id: "validation", label: "Validazione NAFEMS", description: "Benchmark HTML",       icon: IconCertificate, section: "output", workspace: "verify" },
];


const SECTION_LABELS: Record<ToolEntry["section"], string> = {
  modello: "Modello",
  output:  "Output",
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
    if (!t.workspace) return;
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
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleClick(t)}
                    data-testid={`tools-${t.id}`}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-sm text-left transition-colors hover:bg-bg-hover cursor-pointer text-ink"
                  >
                    <Icon size={14} className="text-accent" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium truncate">{t.label}</div>
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
