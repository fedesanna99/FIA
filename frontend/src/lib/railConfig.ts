/**
 * railConfig (v2.6.6 E.2) — single source of truth per le 12 voci della
 * rail expanded di FEA Pro (sia Shell custom v2.6.x che chrome legacy).
 *
 * Match composition mockup `FEA_Pro · Dashboard A1.pdf`:
 *   - 4 sezioni testuali: WORKSPACE / SOLVE / VERIFY / RISORSE
 *   - 12 voci totali con Lucide icons + label + action kind
 *
 * Action dispatch: vedi `frontend/src/lib/railDispatch.ts` per la mappa
 * action kind → effetto (workspace switch, dialog open, toast prerequisite).
 *
 * Importato da:
 *   - `frontend/src/shell/ShellRail.tsx` (Shell custom v2.6.x)
 *   - `frontend/src/components/shell/LeftRail.tsx` (chrome legacy, home dashboard)
 *
 * STOP: 12 voci LOCKED. Modifiche richiedono autorizzazione PM esplicita.
 */
import {
  Home,
  Layers,
  Activity,
  Clock,
  Zap,
  Waves,
  Triangle,
  BarChart3,
  CheckSquare,
  FileText,
  BookOpen,
  HelpCircle,
  Eye,
  type LucideIcon,
} from "lucide-react";

/**
 * Tipo workspace condiviso (ShellRail custom + LeftRail legacy).
 * Match `ShellWorkspaceId` in `shell/ShellRail.tsx` per backward compat.
 */
// v3.1 Fase 2c: aggiunto "view" come 6° workspace per esporre ViewPanel
// (overlay viewport: deformata/colormap/diagrammi/grid/labels + 4 view preset).
// Prima raggiungibile solo via right-rail legacy (= mobile/focus mode) o palette.
export type WorkspaceId = "modello" | "analisi" | "verifiche" | "risultati" | "io" | "view";

/** Preset analisi default per le voci SOLVE (Lineare/Dinamica/Sismica). */
export type AnalysisPreset = "static" | "dynamic" | "seismic";

/** Kind di azione che una voce rail può scatenare. */
export type RailActionKind =
  | "navigate-home"
  | "open-models-browser"
  | "placeholder-toast"
  | "workspace"
  | "workspace-with-preset"
  | "open-report-dialog"
  | "open-template-gallery"
  | "open-docs-help";

export interface RailItem {
  /** Identificatore stabile per data-testid e active state matching. */
  id: string;
  /** Label visibile (capitalize, Italiano). */
  label: string;
  /** Lucide icon component. */
  icon: LucideIcon;
  /** Kind di azione (dispatcher decide effetto). */
  action: RailActionKind;
  /** Workspace target (solo per action `workspace` / `workspace-with-preset`). */
  workspace?: WorkspaceId;
  /** Preset analisi (solo per action `workspace-with-preset`). */
  preset?: AnalysisPreset;
  /** Messaggio personalizzato per `placeholder-toast`. */
  message?: string;
  /**
   * Se true, voce richiede un modello attivo per essere eseguita. Senza
   * modello, dispatcher mostra toast educativo con CTA "Apri galleria template"
   * invece di disabilitare. Pattern coerente con DEC-A4 FeatureButton.
   */
  requiresModel?: boolean;
}

/** Ordine LOCKED delle sezioni come renderizzate nella rail. */
export const RAIL_SECTION_ORDER = ["WORKSPACE", "SOLVE", "VERIFY", "RISORSE"] as const;
export type RailSectionId = (typeof RAIL_SECTION_ORDER)[number];

/**
 * Configurazione completa delle sezioni rail con le loro voci.
 *
 * NB: voci con `requiresModel: true` mostrano toast prerequisite quando
 * cliccate in stato `activeModelId === null` (home dashboard).
 */
export const RAIL_SECTIONS: Record<RailSectionId, RailItem[]> = {
  WORKSPACE: [
    { id: "home", label: "Home", icon: Home, action: "navigate-home" },
    { id: "models", label: "Modelli", icon: Layers, action: "open-models-browser" },
    {
      id: "jobs",
      label: "Jobs",
      icon: Activity,
      action: "placeholder-toast",
      message: "Pannello Jobs in arrivo (v2.7)",
    },
    {
      id: "history",
      label: "Cronologia",
      icon: Clock,
      action: "placeholder-toast",
      message: "Pannello Cronologia in arrivo (v2.7)",
    },
  ],
  SOLVE: [
    {
      id: "linear",
      label: "Lineare",
      icon: Zap,
      action: "workspace-with-preset",
      workspace: "analisi",
      preset: "static",
      requiresModel: true,
    },
    {
      id: "dynamic",
      label: "Dinamica",
      icon: Waves,
      action: "workspace-with-preset",
      workspace: "analisi",
      preset: "dynamic",
      requiresModel: true,
    },
    {
      id: "seismic",
      label: "Sismica",
      icon: Triangle,
      action: "workspace-with-preset",
      workspace: "analisi",
      preset: "seismic",
      requiresModel: true,
    },
  ],
  VERIFY: [
    {
      id: "results",
      label: "Risultati",
      icon: BarChart3,
      action: "workspace",
      workspace: "risultati",
      requiresModel: true,
    },
    {
      id: "checks",
      label: "Checks",
      icon: CheckSquare,
      action: "workspace",
      workspace: "verifiche",
      requiresModel: true,
    },
    {
      id: "report",
      label: "Report",
      icon: FileText,
      action: "open-report-dialog",
      requiresModel: true,
    },
    // v3.1 Fase 2c: voce View esposta (overlay viewport, view preset)
    {
      id: "view",
      label: "View",
      icon: Eye,
      action: "workspace",
      workspace: "view",
      requiresModel: true,
    },
  ],
  RISORSE: [
    {
      id: "templates",
      label: "Template",
      icon: BookOpen,
      action: "open-template-gallery",
    },
    {
      id: "docs",
      label: "Docs",
      icon: HelpCircle,
      action: "open-docs-help",
    },
  ],
};

/**
 * Helper: trova la voce rail per id, attraversando tutte le sezioni.
 * Utile per active state matching e debugging.
 */
export function findRailItem(id: string): RailItem | undefined {
  for (const section of RAIL_SECTION_ORDER) {
    const item = RAIL_SECTIONS[section].find((i) => i.id === id);
    if (item) return item;
  }
  return undefined;
}

/**
 * Helper: lista flat di tutte le voci (12 in totale). Utile per test e
 * smoke E2E che verificano "12 voci presenti".
 */
export function getAllRailItems(): RailItem[] {
  return RAIL_SECTION_ORDER.flatMap((section) => RAIL_SECTIONS[section]);
}
