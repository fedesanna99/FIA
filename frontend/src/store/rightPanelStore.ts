/**
 * RightPanel store (v3.4 Fetta E2-IA · Commit E2.2)
 *
 * Gestisce lo stato del panel destro della Shell custom (`ShellPanel`).
 *
 * Default `"open"` per non rompere il comportamento attuale: ogni utente
 * esistente, al primo render dopo l'introduzione di questo store, vede
 * il pannello aperto esattamente come prima. Lo stato `"open"`/`"closed"`
 * viene persistito in localStorage cosi' la preferenza dell'utente power
 * sopravvive al refresh.
 *
 * v3.4 Fetta E2.3 (30/05/2026 mattina): aggiunto terzo stato `"inspector"`
 * contestuale per la selezione bidirezionale viewport ↔ Albero ↔ panel.
 * Quando l'utente seleziona un nodo (click in viewport o in Albero), il
 * panel automaticamente passa a `"inspector"` mostrando le proprieta'
 * dell'entita' selezionata via `ShellInspectorPanel`. Quando l'utente
 * chiude l'inspector (X) o cambia selezione a niente, torna a `"open"`.
 *
 * IMPORTANTE: lo stato `"inspector"` NON viene persistito (ephemeral) —
 * è legato alla selezione corrente del `selectionStore` che e' anch'esso
 * in-memory. Al refresh, l'inspector ricomincia chiuso e panelState
 * torna all'ultimo valore persisted (`open` o `closed`). Il `partialize`
 * filtra solo `open`/`closed` ignorando `inspector`.
 *
 * Questo store e' stato tenuto separato da `rightRailStore` (Shell legacy)
 * perche' il pattern e' diverso: ShellPanel e' un panel "sempre visibile"
 * con tabs Radix, RightRail apre overlay slide-in con sezioni distinte.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";


export type RightPanelState = "open" | "closed" | "inspector";


interface RightPanelStore {
  /** Stato corrente del panel destro Shell custom. */
  panelState: RightPanelState;
  /** Apre il panel mostrando il content della fase corrente. */
  open: () => void;
  /** Chiude il panel: la `ShellRightReopenTab` prende il suo posto. */
  close: () => void;
  /** Inverte open ↔ closed (NON tocca inspector — se in inspector, chiude
   *  e torna a closed; questo permette al toggle keyboard di restare
   *  binario senza inserire inspector in una semantica unrelated). */
  toggle: () => void;
  /** v3.4 E2.3: apre il panel in modalità inspector (selezione attiva).
   *  Usato dai click handler di ShellLeftTreePanel foglie + dai
   *  renderer viewport quando selectNode/selectElement viene chiamato.
   *  Il content effettivo (NodeDetail vs ElementDetail) è derivato
   *  dal selectionStore in `ShellInspectorPanel`. */
  openInspector: () => void;
}


export const useRightPanelStore = create<RightPanelStore>()(
  persist(
    (set, get) => ({
      panelState: "open",
      open: () => set({ panelState: "open" }),
      close: () => set({ panelState: "closed" }),
      toggle: () =>
        set({
          panelState:
            get().panelState === "open" ? "closed" : "open",
        }),
      openInspector: () => set({ panelState: "inspector" }),
    }),
    {
      name: "feapro-right-panel",
      // v3.4 E2.3: persisti SOLO `open`/`closed` (preferenza utente).
      // `inspector` è ephemeral (legato a selectionStore in-memory) →
      // se al momento del save lo stato è inspector, salva come "open"
      // così al refresh il panel torna alla vista fase corrente invece
      // di restare in inspector vuoto.
      partialize: (s) => ({
        panelState:
          s.panelState === "inspector" ? ("open" as const) : s.panelState,
      }),
    },
  ),
);
