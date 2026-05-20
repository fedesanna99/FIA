/**
 * Workspace store — gestisce il workspace attivo (rail sinistro).
 * Vedi UI_REDESIGN_SPEC.md §5 per il catalogo delle aree.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Workspace =
  | "model"      // 🏗️ Modello — geometria + carichi + vincoli + schema
  | "analysis"   // ⚙️ Analisi — run + parametri + monitor
  | "results"    // 📊 Risultati — viewer + diagrammi + postprocess
  | "verify"     // ✅ Verifiche — EC2/3/5/8 + NTC + fatica + convergenza
  | "io"         // 🔄 I/O & Collab — import/export, AI, multi-utente, auto-detect
  | "docs";      // ⓘ Docs / Help — aperto da rail (overlay)

/** Tab attiva all'interno di ogni workspace. Default "primaria" del workspace. */
export type WorkspaceTab = string;

interface WorkspaceState {
  workspace: Workspace;
  /** Map workspace → tab attiva (memorizza l'ultima tab per workspace). */
  activeTab: Record<Workspace, WorkspaceTab>;
  /** Se true, mostra la HelpSheet contestuale al workspace. */
  helpOpen: boolean;
  /** Se true, la command palette (Ctrl+K) è aperta. */
  paletteOpen: boolean;

  setWorkspace: (ws: Workspace) => void;
  setTab: (ws: Workspace, tab: WorkspaceTab) => void;
  toggleHelp: () => void;
  setHelp: (open: boolean) => void;
  togglePalette: () => void;
  setPalette: (open: boolean) => void;
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
      workspace: "model",
      activeTab: { ...DEFAULT_TAB },
      helpOpen: false,
      paletteOpen: false,

      setWorkspace: (ws) => set({ workspace: ws }),
      setTab: (ws, tab) =>
        set({ activeTab: { ...get().activeTab, [ws]: tab } }),
      toggleHelp: () => set({ helpOpen: !get().helpOpen }),
      setHelp: (open) => set({ helpOpen: open }),
      togglePalette: () => set({ paletteOpen: !get().paletteOpen }),
      setPalette: (open) => set({ paletteOpen: open }),
    }),
    {
      name: "feapro-workspace",
      partialize: (s) => ({ workspace: s.workspace, activeTab: s.activeTab }),
    },
  ),
);
