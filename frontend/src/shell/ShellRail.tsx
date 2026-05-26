// v2.6.2 Shell · Rail (collapsed w-56) · v2.6.5 D.1 expanded w-200 per A1
// v2.6.6 E.2 · refactor: usa `lib/railConfig` + `components/shell/shared/RailSections`
// + `lib/railDispatch` come single source of truth con LeftRail legacy.
//
// Due modalità:
//   - expanded (default v2.6.5+): w-200px, 4 sezioni testuali con eyebrow
//     mono uppercase (WORKSPACE / SOLVE / VERIFY / RISORSE) + 12 voci.
//     Match composition mockup FEA_Pro · Dashboard A1.
//   - collapsed (fallback): w-56, 5 workspace icon + tooltip (comportamento
//     v2.6.2). Utente può tornare a questa modalità via toggle "← Comprimi".
//
// Preferenza persistita in localStorage via `useRailExpansion()` hook
// (spostato in `lib/` in v2.6.6 E.2 per condivisione con LeftRail legacy).
//
// Mapping ai workspace v2.5.x esistenti (per backward compat):
//   modello   → workspaceStore.workspace = "model"
//   analisi   → workspaceStore.workspace = "analysis"
//   risultati → workspaceStore.workspace = "verify"  (Inspect content)
//   verifiche → workspaceStore.workspace = "verify"  (Verify content)
//   io        → workspaceStore.workspace = "tools"

import {
  Box, Cog, Activity, CheckCircle, Shuffle, Bug, BookOpen, Settings,
  ChevronRight,
} from "lucide-react";
import { useWorkspaceStore } from "../store/workspaceStore";
import { useAnalysisStore } from "../store/analysisStore";
import { useRailExpansion } from "../lib/useRailExpansion";
import { useRailDispatch } from "../lib/railDispatch";
import { type RailItem } from "../lib/railConfig";
import { RailSections } from "../components/shell/shared/RailSections";

type ShellWorkspaceId = "modello" | "analisi" | "risultati" | "verifiche" | "io";

interface RailEntry {
  id: ShellWorkspaceId;
  label: string;
  kbd: string;
  Icon: typeof Box;
}

const WORKSPACES: RailEntry[] = [
  { id: "modello", label: "Modello", kbd: "1", Icon: Box },
  { id: "analisi", label: "Analisi", kbd: "2", Icon: Cog },
  { id: "risultati", label: "Risultati", kbd: "3", Icon: Activity },
  { id: "verifiche", label: "Verifiche", kbd: "4", Icon: CheckCircle },
  { id: "io", label: "I/O & Collab", kbd: "5", Icon: Shuffle },
];

interface ShellRailProps {
  active?: ShellWorkspaceId;
  onChange?: (id: ShellWorkspaceId) => void;
}

/**
 * Mappa `ShellWorkspaceId` (active prop) → `railConfig` item id per active
 * state matching nel rendering expanded.
 *
 * NB: per `active === "analisi"`, la voce attiva dipende anche dal preset
 * corrente (Lineare/Dinamica/Sismica). Vedi `resolveActiveItemId` helper.
 */
function resolveActiveItemId(
  active: ShellWorkspaceId,
  analysisType: string,
): string | undefined {
  if (active === "verifiche") return "checks";
  if (active === "risultati") return "results";
  if (active === "modello") return "home";
  if (active === "analisi") {
    if (analysisType === "dynamic") return "dynamic";
    if (analysisType === "modal") return "seismic"; // modal = sismica
    return "linear"; // static / default
  }
  return undefined;
}

export function ShellRail({ active = "modello", onChange }: ShellRailProps) {
  const setWorkspace = useWorkspaceStore((s) => s.setWorkspace);
  const analysisType = useAnalysisStore((s) => s.analysisType);
  const { isExpanded, setExpanded } = useRailExpansion();
  const dispatch = useRailDispatch();

  // Map workspaceStore.workspace (esistente) ↔ shell workspace id legacy
  const wsToLegacy = (id: ShellWorkspaceId): "model" | "analysis" | "verify" => {
    if (id === "modello") return "model";
    if (id === "analisi") return "analysis";
    return "verify"; // risultati, verifiche, io → verify content
  };

  const handleWorkspace = (id: ShellWorkspaceId) => {
    setWorkspace(wsToLegacy(id));
    onChange?.(id);
  };

  // Wrapper sul dispatcher condiviso che ALSO chiama onChange con il
  // ShellWorkspaceId mappato dall'item (per backward compat con parent
  // della Shell custom che si aspetta callback workspace-level).
  const handleItemClick = (item: RailItem) => {
    dispatch(item);
    // Se l'azione era un workspace switch, propaga l'onChange al parent.
    if (item.workspace && (item.action === "workspace" || item.action === "workspace-with-preset")) {
      onChange?.(item.workspace);
    } else if (item.action === "navigate-home") {
      onChange?.("modello");
    }
  };

  if (isExpanded) {
    const activeItemId = resolveActiveItemId(active, analysisType);
    return (
      <RailSections
        className="shell-rail"
        activeItemId={activeItemId}
        onItemClick={handleItemClick}
        onCollapse={() => setExpanded(false)}
      />
    );
  }

  // Modalità collapsed (fallback v2.6.2): 5 workspace icon + bottom actions.
  return (
    <nav
      className="shell-rail"
      aria-label="Workspace switcher (compresso)"
      data-shell="rail"
      data-expanded="false"
    >
      {WORKSPACES.map((ws) => {
        const Icon = ws.Icon;
        const isActive = active === ws.id;
        return (
          <button
            key={ws.id}
            type="button"
            className={`rail-btn ${isActive ? "active" : ""}`}
            onClick={() => handleWorkspace(ws.id)}
            aria-label={ws.label}
            aria-current={isActive ? "page" : undefined}
            data-testid={`rail-${ws.id}`}
            data-ws={ws.id}
          >
            <Icon size={20} />
            <span className="rail-kbd">{ws.kbd}</span>
            <span className="rail-tooltip">
              {ws.label}
              <kbd>{ws.kbd}</kbd>
            </span>
          </button>
        );
      })}

      <div className="rail-sep" />

      <button
        type="button"
        className="rail-btn"
        aria-label="Auto-detect"
        data-testid="rail-autodetect"
      >
        <Bug size={18} />
        <span className="rail-tooltip">
          Auto-detect <kbd>F3</kbd>
        </span>
      </button>

      <button
        type="button"
        className="rail-btn"
        aria-label="Documentazione"
        data-testid="rail-docs"
      >
        <BookOpen size={18} />
        <span className="rail-tooltip">
          Docs <kbd>?</kbd>
        </span>
      </button>

      <div className="rail-spacer" />

      <button
        type="button"
        className="rail-btn"
        onClick={() => setExpanded(true)}
        aria-label="Espandi rail"
        data-testid="rail-toggle-expand"
      >
        <ChevronRight size={18} />
        <span className="rail-tooltip">Espandi rail</span>
      </button>

      <button
        type="button"
        className="rail-btn"
        aria-label="Impostazioni"
        data-testid="rail-settings"
      >
        <Settings size={18} />
        <span className="rail-tooltip">Impostazioni</span>
      </button>
    </nav>
  );
}
