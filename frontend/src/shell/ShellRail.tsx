// v2.6.2 Shell · Rail (collapsed w-56) · v2.6.5 D.1 expanded w-200 per A1
//
// Due modalità:
//   - expanded (default v2.6.5+): w-200px, 4 sezioni testuali con eyebrow
//     mono uppercase (WORKSPACE / SOLVE / VERIFY / RISORSE) + 12 voci.
//     Match composition mockup FEA_Pro · Dashboard A1.
//   - collapsed (fallback): w-56, 5 workspace icon + tooltip (comportamento
//     v2.6.2). Utente può tornare a questa modalità via toggle "← Comprimi".
//
// Preferenza persistita in localStorage via `useRailExpansion()` hook.
// Default expanded=true (nuovo comportamento). Utenti pre-v2.6.5 che non
// hanno mai impostato la preference vedono expanded al primo load.
//
// Mapping ai workspace v2.5.x esistenti (per backward compat):
//   modello   → workspaceStore.workspace = "model"
//   analisi   → workspaceStore.workspace = "analysis"
//   risultati → workspaceStore.workspace = "verify"  (Inspect content)
//   verifiche → workspaceStore.workspace = "verify"  (Verify content)
//   io        → workspaceStore.workspace = "tools"

import {
  Box, Cog, Activity, CheckCircle, Shuffle, Bug, BookOpen, Settings,
  Home, Layers, Clock, Briefcase, Zap, Waves, Triangle, BarChart3,
  CheckSquare, FileText, HelpCircle, ChevronLeft, ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { useWorkspaceStore } from "../store/workspaceStore";
import { useAnalysisStore } from "../store/analysisStore";
import { toast } from "../store/toastStore";
import { useRailExpansion } from "./useRailExpansion";

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

// v2.6.5 D.1: sezioni testuali della rail expanded per Dashboard A1 mockup.
// Mapping 12 voci → workspace switch / event dispatch / placeholder toast.
type RailSectionItem = {
  label: string;
  icon: LucideIcon;
  /** Workspace da attivare (mutually exclusive con `action`). */
  workspace?: ShellWorkspaceId;
  /** Analysis preset da settare quando si attiva il workspace (solo per `analisi`). */
  preset?: "static" | "modal" | "dynamic" | "buckling";
  /** Custom action (dispatch event / open dialog / ecc.). */
  action?: () => void;
  /** data-testid suffix. */
  testId: string;
};

interface RailSection {
  eyebrow: string;
  items: RailSectionItem[];
}

const RAIL_SECTIONS: RailSection[] = [
  {
    eyebrow: "WORKSPACE",
    items: [
      {
        label: "Home",
        icon: Home,
        workspace: "modello", // torna alla home dashboard via workspace default
        testId: "rail-item-home",
      },
      {
        label: "Modelli",
        icon: Layers,
        action: () => window.dispatchEvent(new Event("feapro:open-models-list")),
        testId: "rail-item-modelli",
      },
      {
        label: "Jobs",
        icon: Briefcase,
        // v2.6.5 D.1: placeholder — Jobs panel non esiste ancora come UI dedicata.
        // Carry-over a v2.7+ (Jobs dashboard con cronologia esecuzioni).
        action: () => toast("info", "Jobs panel: in arrivo in v2.7"),
        testId: "rail-item-jobs",
      },
      {
        label: "Cronologia",
        icon: Clock,
        // v2.6.5 D.1: placeholder — Cronologia panel non esiste ancora.
        // Carry-over a v2.7+ (audit log + history navigation).
        action: () => toast("info", "Cronologia: in arrivo in v2.7"),
        testId: "rail-item-cronologia",
      },
    ],
  },
  {
    eyebrow: "SOLVE",
    items: [
      {
        label: "Lineare",
        icon: Zap,
        workspace: "analisi",
        preset: "static",
        testId: "rail-item-lineare",
      },
      {
        label: "Dinamica",
        icon: Waves,
        workspace: "analisi",
        preset: "dynamic",
        testId: "rail-item-dinamica",
      },
      {
        label: "Sismica",
        icon: Triangle,
        workspace: "analisi",
        preset: "modal", // sismica = modale + spettro di risposta (default)
        testId: "rail-item-sismica",
      },
    ],
  },
  {
    eyebrow: "VERIFY",
    items: [
      {
        label: "Risultati",
        icon: BarChart3,
        workspace: "risultati",
        testId: "rail-item-risultati",
      },
      {
        label: "Checks",
        icon: CheckSquare,
        workspace: "verifiche",
        testId: "rail-item-checks",
      },
      {
        label: "Report",
        icon: FileText,
        action: () => window.dispatchEvent(new Event("feapro:open-export-pdf")),
        testId: "rail-item-report",
      },
    ],
  },
  {
    eyebrow: "RISORSE",
    items: [
      {
        label: "Template",
        icon: BookOpen,
        action: () => window.dispatchEvent(new Event("feapro:open-template-gallery")),
        testId: "rail-item-template",
      },
      {
        label: "Docs",
        icon: HelpCircle,
        // v2.6.5 D.1: placeholder — docs portal non esiste come UI app.
        // Carry-over a v2.7+ (in-app docs viewer o link esterno).
        action: () => toast("info", "Docs portal: in arrivo in v2.7"),
        testId: "rail-item-docs",
      },
    ],
  },
];

interface ShellRailProps {
  active?: ShellWorkspaceId;
  onChange?: (id: ShellWorkspaceId) => void;
}

export function ShellRail({ active = "modello", onChange }: ShellRailProps) {
  const setWorkspace = useWorkspaceStore((s) => s.setWorkspace);
  const setAnalysisType = useAnalysisStore((s) => s.setAnalysisType);
  const { isExpanded, setExpanded } = useRailExpansion();

  const handleWorkspace = (id: ShellWorkspaceId) => {
    setWorkspace(WS_TO_LEGACY[id]);
    onChange?.(id);
  };

  const handleItemClick = (item: RailSectionItem) => {
    if (item.workspace) {
      setWorkspace(WS_TO_LEGACY[item.workspace]);
      if (item.preset) {
        setAnalysisType(item.preset);
      }
      onChange?.(item.workspace);
    } else if (item.action) {
      item.action();
    }
  };

  /**
   * Match per attivo: l'item rail-item-X è attivo se il suo workspace coincide
   * con `active` corrente. Per item action-only (Home/Modelli/Jobs/...), match
   * solo se `active === "modello"` per Home (default workspace).
   */
  const isItemActive = (item: RailSectionItem): boolean => {
    if (item.workspace) return active === item.workspace;
    // Home è considerato "active" solo quando workspace è default modello E
    // l'utente è sulla home dashboard. Approssimazione: active === "modello".
    if (item.testId === "rail-item-home") return active === "modello";
    return false;
  };

  if (isExpanded) {
    return (
      <nav
        className="shell-rail"
        aria-label="Workspace switcher (espanso)"
        data-shell="rail"
        data-expanded="true"
      >
        {RAIL_SECTIONS.map((section) => (
          <div className="rail-section" key={section.eyebrow}>
            <div className="rail-section-eyebrow">{section.eyebrow}</div>
            <ul className="rail-section-items">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isItemActive(item);
                return (
                  <li key={item.testId}>
                    <button
                      type="button"
                      className="rail-item"
                      onClick={() => handleItemClick(item)}
                      data-active={active ? "true" : undefined}
                      data-testid={item.testId}
                      aria-current={active ? "page" : undefined}
                    >
                      <Icon className="rail-item-icon" size={14} strokeWidth={1.8} />
                      <span className="rail-item-label">{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        <div className="rail-spacer" />

        <button
          type="button"
          className="rail-collapse"
          onClick={() => setExpanded(false)}
          data-testid="rail-toggle-collapse"
          aria-label="Comprimi rail"
        >
          <ChevronLeft className="rail-collapse-icon" size={12} strokeWidth={2} />
          <span>Comprimi</span>
        </button>
      </nav>
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
