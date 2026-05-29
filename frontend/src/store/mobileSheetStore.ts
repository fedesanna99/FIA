/**
 * MobileSheet store (v3.4 Fetta M4 · 30/05/2026 notte).
 *
 * Gestisce lo stato del bottom sheet "Verifica" su mobile (Shell custom).
 *
 * Su mobile, il panel destro Verifica e' renderizzato come bottom sheet
 * sticky (position: fixed bottom) — vedi `ShellPanelMobileSheet.tsx`.
 * Due stati:
 *   - "peek" (default): solo header visibile in fondo (~64px), il
 *     viewport 3D resta visibile sopra. Junior tile "Verifica · Statica
 *     completata" + chevron-up.
 *   - "expanded": sheet espanso a ~80vh, mostra l'accordion completo
 *     (Sintesi sempre aperta + 4 sezioni collassabili — pattern E2.5c).
 *
 * Pattern filosofico "junior fuori, senior dentro" (ADR 004 D5):
 *   - header sempre visibile (peek) → l'utente sa che c'e' info
 *   - tap su header → expand → vede l'accordion ricco
 *   - tap di nuovo o chevron-down → peek (compatta senza chiudere)
 *
 * Default "peek": all'utente la prima volta su mobile in fase Verifica
 * vede il sheet collassato in fondo, viewport pieno sopra. Stato
 * persistito in localStorage (key `feapro-mobile-sheet`) cosi' la
 * preferenza power-user sopravvive al refresh.
 *
 * Visibilita': il componente che lo consuma renderizza il sheet solo
 * quando `isMobile && activeWs === "risultati"` (vedi Shell.tsx). Nelle
 * altre fasi (Costruisci / Esegui) il sheet non e' montato — viewport
 * pieno. Su desktop il sheet non e' montato — il ShellPanel desktop
 * 380px nel grid prende il suo posto.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";


export type MobileSheetState = "peek" | "expanded";


interface MobileSheetStore {
  /** Stato corrente del bottom sheet. */
  sheetState: MobileSheetState;
  /** Espande il sheet a ~80vh (mostra accordion completo). */
  expand: () => void;
  /** Collassa il sheet a header peek (~64px). */
  collapse: () => void;
  /** Inverte peek ↔ expanded. */
  toggle: () => void;
}


export const useMobileSheetStore = create<MobileSheetStore>()(
  persist(
    (set, get) => ({
      sheetState: "peek",
      expand: () => set({ sheetState: "expanded" }),
      collapse: () => set({ sheetState: "peek" }),
      toggle: () =>
        set({
          sheetState: get().sheetState === "peek" ? "expanded" : "peek",
        }),
    }),
    {
      name: "feapro-mobile-sheet",
      partialize: (s) => ({ sheetState: s.sheetState }),
    },
  ),
);
