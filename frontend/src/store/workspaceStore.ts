/**
 * Workspace store — Sprint 5 alpha.23 (brief-aligned).
 *
 * Estende il vecchio schema con i campi del brief v1.2.1
 * (currentLeftPanel, currentRightPanel, isEmptyState, ecc.) mantenendo
 * backward compat con il vecchio API (`workspace`, `activeTab`, ecc.).
 *
 * Bridge bidirezionale:
 *   - `setWorkspace("model")` → sincronizza `currentLeftPanel = "make"`
 *   - `openLeftPanel("make")` → sincronizza `workspace = "model"`
 *
 * Cleanup completo dei campi legacy in alpha.27.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { LeftPanelId, RightPanelId, ShellState, ShellActions } from "../shell/types";
import { LEFT_TO_LEGACY, LEGACY_TO_LEFT } from "../shell/types";


// ── Tipi legacy (mantenuti per backward compat) ────────────────────────────
export type Workspace =
  | "model"      // 🏗️ Modello → mappato a LeftPanelId "make"
  | "analysis"   // ⚙️ Analisi → mappato a LeftPanelId "solve"
  | "results"    // 📊 Risultati → ora accessibile via RightRail "inspect"
  | "verify"     // ✅ Verifiche → mappato a LeftPanelId "verify"
  | "io"         // 🔄 I/O → ora via Tools panel + Export menu
  | "docs";      // ⓘ Docs / Help — overlay

export type WorkspaceTab = string;


/** Tab della bottom tabbar su mobile (v1.5 Task 30). */
export type MobileTab = "model" | "make" | "solve" | "results" | "more";


// ── Stato completo: legacy + shell brief ───────────────────────────────────
interface WorkspaceState extends ShellState, ShellActions {
  // Legacy (backward compat)
  workspace: Workspace;
  activeTab: Record<Workspace, WorkspaceTab>;
  helpOpen: boolean;
  paletteOpen: boolean;

  setWorkspace: (ws: Workspace) => void;
  setTab: (ws: Workspace, tab: WorkspaceTab) => void;
  toggleHelp: () => void;
  setHelp: (open: boolean) => void;
  togglePalette: () => void;
  setPalette: (open: boolean) => void;

  // v1.5 Task 30 — mobile bottom tabbar
  currentMobileTab: MobileTab | null;
  setMobileTab: (tab: MobileTab | null) => void;
}


const DEFAULT_TAB: Record<Workspace, WorkspaceTab> = {
  model:    "tree",
  analysis: "linear",
  results:  "viewport",
  verify:   "ec3",
  io:       "import",
  docs:     "overview",
};


export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      // ─── Legacy state ────────────────────────────────────────────────────
      workspace: "model",
      activeTab: { ...DEFAULT_TAB },
      helpOpen: false,
      paletteOpen: false,

      // ─── Shell state (brief schema) ─────────────────────────────────────
      currentLeftPanel: "make" as LeftPanelId,    // bridge da workspace="model"
      currentRightPanel: null as RightPanelId,
      currentLeftTab: null,
      currentRightTab: null,
      isAiPanelOpen: false,
      isSettingsOpen: false,
      isEmptyState: false,

      // ─── Legacy actions ──────────────────────────────────────────────────
      setWorkspace: (ws) => {
        // Bridge: aggiorna anche currentLeftPanel se mappabile
        const leftId = LEGACY_TO_LEFT[ws] as LeftPanelId | undefined;
        set({
          workspace: ws,
          ...(leftId ? { currentLeftPanel: leftId, isEmptyState: false } : {}),
        });
      },
      setTab: (ws, tab) =>
        set({ activeTab: { ...get().activeTab, [ws]: tab } }),
      toggleHelp: () => set({ helpOpen: !get().helpOpen }),
      setHelp: (open) => set({ helpOpen: open }),
      togglePalette: () => set({ paletteOpen: !get().paletteOpen }),
      setPalette: (open) => set({ paletteOpen: open }),

      // v1.5 Task 30 — mobile tabbar state (non persistito).
      currentMobileTab: null,
      setMobileTab: (tab) => set({ currentMobileTab: tab }),

      // ─── Shell actions (brief schema) ───────────────────────────────────
      openLeftPanel: (id, tab) => {
        // Bridge: aggiorna anche workspace legacy
        const legacyWs = LEFT_TO_LEGACY[id] as Workspace | undefined;
        set({
          currentLeftPanel: id,
          currentLeftTab: tab ?? null,
          isEmptyState: false,
          ...(legacyWs ? { workspace: legacyWs } : {}),
        });
      },
      closeLeftPanel: () =>
        set({ currentLeftPanel: null, currentLeftTab: null }),
      openRightPanel: (id, tab) =>
        set({
          currentRightPanel: id,
          currentRightTab: tab ?? null,
          isEmptyState: false,
        }),
      closeRightPanel: () =>
        set({ currentRightPanel: null, currentRightTab: null }),
      setLeftTab: (tab) => set({ currentLeftTab: tab }),
      setRightTab: (tab) => set({ currentRightTab: tab }),
      toggleAiPanel: () => set((s) => ({ isAiPanelOpen: !s.isAiPanelOpen })),
      toggleSettings: () => set((s) => ({ isSettingsOpen: !s.isSettingsOpen })),
      enterEmptyState: () =>
        set({
          currentLeftPanel: null,
          currentRightPanel: null,
          currentLeftTab: null,
          currentRightTab: null,
          isAiPanelOpen: false,
          isSettingsOpen: false,
          isEmptyState: true,
        }),
      exitEmptyState: () => set({ isEmptyState: false }),
    }),
    {
      name: "feapro-workspace",
      partialize: (s) => ({
        // Persisti SIA legacy che brief — alpha.27 fa cleanup
        workspace: s.workspace,
        activeTab: s.activeTab,
        currentLeftPanel: s.currentLeftPanel,
        currentRightPanel: s.currentRightPanel,
        currentLeftTab: s.currentLeftTab,
        currentRightTab: s.currentRightTab,
      }),
    },
  ),
);
