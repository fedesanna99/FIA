// v2.6.2 Shell · Rail (w-56px)
//
// Replica del mockup §3.3: 5 workspace verticali + separator + Auto-detect/Docs
// + spacer + Settings in fondo. Tooltip slide-in da destra con kbd shortcut.
//
// Mapping ai workspace v2.5.x esistenti:
//   modello   → workspaceStore.workspace = "model"
//   analisi   → workspaceStore.workspace = "analysis"
//   risultati → workspaceStore.workspace = "verify"  (Inspect content)
//   verifiche → workspaceStore.workspace = "verify"  (Verify content)
//   io        → workspaceStore.workspace = "tools"
//
// (Refactor mapping completo: scope Fase 5)

import { Box, Cog, Activity, CheckCircle, Shuffle, Bug, BookOpen, Settings } from "lucide-react";
import { useWorkspaceStore } from "../store/workspaceStore";

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

// Map workspaceStore.workspace (esistente) ↔ shell workspace id
const WS_TO_LEGACY: Record<ShellWorkspaceId, "model" | "analysis" | "verify"> = {
  modello: "model",
  analisi: "analysis",
  risultati: "verify",
  verifiche: "verify",
  io: "verify", // placeholder
};

interface ShellRailProps {
  active?: ShellWorkspaceId;
  onChange?: (id: ShellWorkspaceId) => void;
}

export function ShellRail({ active = "modello", onChange }: ShellRailProps) {
  const setWorkspace = useWorkspaceStore((s) => s.setWorkspace);

  const handleClick = (id: ShellWorkspaceId) => {
    setWorkspace(WS_TO_LEGACY[id]);
    onChange?.(id);
  };

  return (
    <nav className="shell-rail" aria-label="Workspace switcher" data-shell="rail">
      {WORKSPACES.map((ws) => {
        const Icon = ws.Icon;
        const isActive = active === ws.id;
        return (
          <button
            key={ws.id}
            type="button"
            className={`rail-btn ${isActive ? "active" : ""}`}
            onClick={() => handleClick(ws.id)}
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
        aria-label="Impostazioni"
        data-testid="rail-settings"
      >
        <Settings size={18} />
        <span className="rail-tooltip">Impostazioni</span>
      </button>
    </nav>
  );
}
