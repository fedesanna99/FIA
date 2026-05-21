/**
 * Breadcrumb (alpha.18) — Sprint 4 / Asse G3.
 *
 * Mostra contesto live: modello attivo › workspace attivo › (tab attiva
 * se rilevante). Stile mockup v1.3: chevron separator, segmenti
 * cliccabili per "tornare indietro" (workspace → top-level).
 *
 * Es: `Demo Portal frame › Analisi › Statica`
 *
 * Su mobile/tablet (< md) si nasconde per recuperare spazio.
 */
import { ChevronRight, FolderOpen } from "lucide-react";
import { useModelStore } from "../../../store/modelStore";
import { useWorkspaceStore, type Workspace } from "../../../store/workspaceStore";


// Allineato al LeftRail v3 (alpha.20): label corti workflow-oriented
const WORKSPACE_LABELS: Record<Workspace, string> = {
  model:    "Make",
  analysis: "Solve",
  verify:   "Verify",
  results:  "Risultati",
  io:       "I/O & Collab",
  docs:     "Docs",
};


export function Breadcrumb() {
  const model = useModelStore((s) => s.model);
  const workspace = useWorkspaceStore((s) => s.workspace);
  const setWorkspace = useWorkspaceStore((s) => s.setWorkspace);

  return (
    <nav
      aria-label="breadcrumb"
      className="hidden lg:flex items-center gap-1 text-xs text-ink-muted min-w-0 pl-1"
      data-testid="topbar-breadcrumb"
    >
      <FolderOpen className="h-3 w-3 flex-shrink-0 text-ink-dim" strokeWidth={1.8} />

      <span
        className="truncate max-w-[160px] text-ink"
        data-testid="breadcrumb-model"
        title={model?.name ?? "Nessun modello"}
      >
        {model?.name ?? <span className="text-ink-dim">Nessun modello</span>}
      </span>

      <ChevronRight className="h-3 w-3 flex-shrink-0 text-ink-dim" strokeWidth={1.8} />

      <button
        type="button"
        onClick={() => setWorkspace(workspace)}
        className="hover:text-ink transition-colors truncate"
        data-testid="breadcrumb-workspace"
        title={WORKSPACE_LABELS[workspace]}
      >
        {WORKSPACE_LABELS[workspace]}
      </button>
    </nav>
  );
}
