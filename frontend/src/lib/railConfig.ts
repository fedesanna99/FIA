/**
 * railConfig (v2.6.6 E.2 + Fetta E2.5a 29/05 sera) — single source of
 * truth per le 10 voci della rail expanded di FEA Pro (sia Shell custom
 * v2.6.x che chrome legacy).
 *
 * Match composition mockup `FEA_Pro · Dashboard A1.pdf`:
 *   - 4 sezioni testuali: WORKSPACE / SOLVE / VERIFY / RISORSE
 *   - 10 voci totali con Lucide icons + label + action kind
 *     (era 12 fino a v3.4 — vedi nota Fetta E2.5a sotto)
 *
 * Action dispatch: vedi `frontend/src/lib/railDispatch.ts` per la mappa
 * action kind → effetto (workspace switch, dialog open, toast prerequisite).
 *
 * Importato da:
 *   - `frontend/src/shell/ShellRail.tsx` (Shell custom v2.6.x)
 *   - `frontend/src/components/shell/LeftRail.tsx` (chrome legacy, home dashboard)
 *
 * v3.4 Fetta E2.5a 29/05 sera (autorizzazione esplicita Federico, ADR 003
 * mapping 6 → 3 workspace): rimosse 2 voci VERIFY:
 *   - `checks` (workspace=verifiche) → diventerà tab dentro panel DX di
 *     Verifica (E2.5c). Per ora raggiungibile via ⌘K palette.
 *   - `view` (workspace=view) → diventerà toolbar viewport (E2.5
 *     successiva). Per ora raggiungibile via ⌘K palette.
 *
 * STOP: 10 voci LOCKED. Modifiche richiedono autorizzazione PM esplicita.
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
  FileText,
  BookOpen,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";
// v3.4 Fetta E2.5a 29/05: CheckSquare e Eye rimossi dagli import
// dopo eliminazione voci VERIFY/checks e VERIFY/view dal rail.

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
      // v3.4 Fetta E2.5b (29/05 sera): label "Risultati" → "Verifica"
      // (id "results" invariato per compat railDispatch + test).
      label: "Verifica",
      icon: BarChart3,
      action: "workspace",
      workspace: "risultati",
      requiresModel: true,
    },
    {
      id: "report",
      label: "Report",
      icon: FileText,
      action: "open-report-dialog",
      requiresModel: true,
    },
    // v3.4 Fetta E2.5a 29/05 sera: rimosse `checks` (workspace=verifiche
    // → futuro tab dentro panel DX di Verifica, E2.5c) e `view`
    // (workspace=view → futuro toolbar viewport). Raggiungibili oggi
    // tramite ⌘K palette finche' non arriva la migrazione.
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
