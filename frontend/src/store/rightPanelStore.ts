/**
 * RightPanel store (v3.4 Fetta E2-IA · Commit E2.2)
 *
 * Gestisce lo stato del panel destro della Shell custom (`ShellPanel`).
 *
 * Default `"open"` per non rompere il comportamento attuale: ogni utente
 * esistente, al primo render dopo l'introduzione di questo store, vede
 * il pannello aperto esattamente come prima. Lo stato viene persistito
 * in localStorage cosi' la preferenza dell'utente power sopravvive al
 * refresh.
 *
 * In una fetta futura (E2.3) si aggiungera' uno stato `"inspector"`
 * contestuale per la selezione bidirezionale viewport ↔ panel. Questo
 * store e' stato tenuto separato da `rightRailStore` (Shell legacy)
 * perche' il pattern e' diverso: ShellPanel e' un panel "sempre visibile"
 * con tabs Radix, RightRail apre overlay slide-in con sezioni distinte.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";


export type RightPanelState = "open" | "closed";


interface RightPanelStore {
  /** Stato corrente del panel destro Shell custom. */
  panelState: RightPanelState;
  /** Apre il panel (set state to "open"). */
  open: () => void;
  /** Chiude il panel: la `ShellRightReopenTab` prende il suo posto. */
  close: () => void;
  /** Inverte open ↔ closed. */
  toggle: () => void;
}


export const useRightPanelStore = create<RightPanelStore>()(
  persist(
    (set, get) => ({
      panelState: "open",
      open: () => set({ panelState: "open" }),
      close: () => set({ panelState: "closed" }),
      toggle: () =>
        set({ panelState: get().panelState === "open" ? "closed" : "open" }),
    }),
    {
      name: "feapro-right-panel",
      partialize: (s) => ({ panelState: s.panelState }),
    },
  ),
);
