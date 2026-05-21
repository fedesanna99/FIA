/**
 * ToolsPanelContent — alpha.17.
 *
 * Shortcut a strumenti: cost preview, BIM viewer, comparazione, snapshot,
 * misurazioni. In alpha.20 sostituira' la tab Compare/Snapshot del
 * WorkspacePanel.
 */
import { GitCompareArrows, Ruler, Camera, FileBarChart, Boxes } from "lucide-react";
import { useWorkspaceStore } from "../../../store/workspaceStore";
import { useRightRailStore } from "../../../store/rightRailStore";


interface ToolRow {
  key: string;
  label: string;
  description: string;
  icon: typeof Ruler;
  /** Se present, click switcha al workspace dedicato. */
  workspace?: "model" | "analysis" | "results" | "verify" | "io";
  /** alpha.20 placeholder — non implementato ancora. */
  soon?: boolean;
}


const TOOLS: ToolRow[] = [
  { key: "cost",    label: "Cost preview",  description: "Apri il pannello Analisi per la stima credits pre-run", icon: FileBarChart, workspace: "analysis" },
  { key: "compare", label: "Compare A/B",   description: "Confronta 2 modelli o due run",   icon: GitCompareArrows, soon: true },
  { key: "measure", label: "Misurazioni",   description: "Distanze e angoli 3D nel viewport", icon: Ruler, workspace: "model" },
  { key: "snap",    label: "Snapshot",      description: "Congela stato risultati per confronto", icon: Camera, workspace: "results" },
  { key: "bim",     label: "BIM viewer IFC", description: "Apri IFC over modello (Asse D)",    icon: Boxes, soon: true },
];


export function ToolsPanelContent() {
  const setWorkspace = useWorkspaceStore((s) => s.setWorkspace);
  const closeRail = useRightRailStore((s) => s.close);

  return (
    <div className="space-y-1">
      <p className="text-ink-muted leading-relaxed mb-2">
        Strumenti rapidi. Click per saltare al workspace dedicato.
      </p>

      {TOOLS.map((t) => {
        const Icon = t.icon;
        const disabled = !!t.soon;
        return (
          <button
            key={t.key}
            type="button"
            disabled={disabled}
            onClick={() => {
              if (t.workspace) {
                setWorkspace(t.workspace);
                closeRail();
              }
            }}
            data-testid={`tools-row-${t.key}`}
            className={[
              "w-full flex items-center gap-2 px-2 py-1.5 rounded-sm text-left",
              "transition-colors",
              disabled
                ? "text-ink-faint cursor-not-allowed"
                : "hover:bg-bg-hover cursor-pointer text-ink",
            ].join(" ")}
          >
            <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${disabled ? "text-ink-faint" : "text-accent"}`} />
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
  );
}
