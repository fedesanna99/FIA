/**
 * Shell types (Sprint 5 G8 / alpha.23) — schema da `CLAUDE_CODE_BRIEF_v1_2_1.md`.
 *
 * Single-source-of-truth per tutta la shell v1.2.1. Tutto il codice nuovo
 * dei macro-panel (MakePanel/SolvePanel/etc) usa questi tipi. I tipi del
 * workspaceStore esistente (`Workspace = "model"|"analysis"|...`) restano
 * per backward compat e sono **mappati 1:1** ai LeftPanelId del brief:
 *
 *   workspace "model"    ↔ LeftPanelId "make"
 *   workspace "analysis" ↔ LeftPanelId "solve"
 *   workspace "verify"   ↔ LeftPanelId "verify"
 *
 * Cleanup completo (rimozione campi legacy) in alpha.27.
 */

/** Pannelli laterali sinistra (rail Make/Solve/Verify). */
export type LeftPanelId = "make" | "solve" | "verify" | null;

/** Pannelli laterali destra (rail Inspect/View/Tools). */
export type RightPanelId = "inspect" | "view" | "tools" | null;


/** Stato della shell (campi nuovi dal brief). */
export interface ShellState {
  currentLeftPanel: LeftPanelId;
  currentRightPanel: RightPanelId;
  currentLeftTab: string | null;       // es: "geometria", "lineari"
  currentRightTab: string | null;      // es: "statica", "iso3d"
  isAiPanelOpen: boolean;
  isSettingsOpen: boolean;
  isEmptyState: boolean;               // true = solo viewport (Shift+Space)
}


/** Action methods per la shell (campi nuovi). */
export interface ShellActions {
  openLeftPanel: (id: NonNullable<LeftPanelId>, tab?: string) => void;
  closeLeftPanel: () => void;
  openRightPanel: (id: NonNullable<RightPanelId>, tab?: string) => void;
  closeRightPanel: () => void;
  setLeftTab: (tab: string | null) => void;
  setRightTab: (tab: string) => void;
  toggleAiPanel: () => void;
  toggleSettings: () => void;
  enterEmptyState: () => void;
  exitEmptyState: () => void;
}


// ── Mapping bidirezionale legacy ↔ brief ───────────────────────────────────
//
// Le viste legacy "results" e "io" non hanno una controparte nel brief
// perche' nel mockup v1.3 sono accessibili via RightRail (Inspect) o via
// Tools panel. Quindi:
//   workspace "results" → currentRightPanel "inspect" (open via right rail)
//   workspace "io" → currentRightPanel "tools" + tab specifica
//
// Le funzioni helper sotto vivono in `shell/mapping.ts` (creato in alpha.23).

/** Mappa workspace legacy → LeftPanelId nuovo. */
export const LEGACY_TO_LEFT: Record<string, NonNullable<LeftPanelId>> = {
  model:    "make",
  analysis: "solve",
  verify:   "verify",
};

/** Mappa LeftPanelId nuovo → workspace legacy. */
export const LEFT_TO_LEGACY: Record<NonNullable<LeftPanelId>, string> = {
  make:   "model",
  solve:  "analysis",
  verify: "verify",
};
