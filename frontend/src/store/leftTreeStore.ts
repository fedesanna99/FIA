/**
 * LeftTree store (v3.4 Fetta E2-IA · Commit E2.4)
 *
 * Gestisce lo stato del panel sinistro "Albero modello" della Shell
 * custom (`ShellLeftTreePanel`).
 *
 * Default `"closed"` per non rompere la grid esistente della Shell custom
 * (3-col: rail / viewport / panel). Quando `"open"` la grid passa a 4-col
 * (rail / albero / viewport / panel destro) tramite override CSS in
 * `shell.css`.
 *
 * Pattern simmetrico al `rightPanelStore` (Fetta E2.2): stesso shape,
 * stesso pattern persisted, stesso pattern di action triplice
 * `open` / `close` / `toggle`.
 *
 * Cablato al toggle Albero della ShellTopBar (E2.1, oggi placeholder
 * `useState(treeOpen)` → rimpiazzato da `useLeftTreeStore` in E2.4).
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";


export type LeftTreeState = "open" | "closed";


interface LeftTreeStore {
  /** Stato corrente del panel albero modello (sinistro). */
  treeState: LeftTreeState;
  /** Apre il panel (set state to "open"). */
  open: () => void;
  /** Chiude il panel: la seconda colonna grid collassa a 0. */
  close: () => void;
  /** Inverte open ↔ closed (usato dal toggle Albero in topbar). */
  toggle: () => void;
}


export const useLeftTreeStore = create<LeftTreeStore>()(
  persist(
    (set, get) => ({
      treeState: "closed",
      open: () => set({ treeState: "open" }),
      close: () => set({ treeState: "closed" }),
      toggle: () =>
        set({ treeState: get().treeState === "open" ? "closed" : "open" }),
    }),
    {
      name: "feapro-left-tree",
      partialize: (s) => ({ treeState: s.treeState }),
    },
  ),
);
