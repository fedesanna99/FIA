/**
 * RightRail store (alpha.17 — Asse G Sprint 4)
 *
 * Gestisce il rail destro (Inspect / View / Tools) e il panel slide-in
 * associato. Comportamento toggle: click su icona apre il panel; click
 * sulla STESSA icona attiva → chiude.
 *
 * Persistenza: salva l'ultimo `section` aperto cosi' al refresh il
 * panel rimane nello stato precedente (utente power-user).
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";


export type RightSection = "inspect" | "view" | "tools" | "history";


interface RightRailState {
  /** Sezione attualmente aperta. `null` = panel chiuso. */
  openSection: RightSection | null;
  /** Apre una sezione (o la chiude se gia' aperta). */
  toggle: (section: RightSection) => void;
  /** Apre una sezione esplicitamente (no-toggle). */
  open: (section: RightSection) => void;
  /** Chiude il panel slide-in. */
  close: () => void;
}


export const useRightRailStore = create<RightRailState>()(
  persist(
    (set, get) => ({
      openSection: null,
      toggle: (section) =>
        set({ openSection: get().openSection === section ? null : section }),
      open: (section) => set({ openSection: section }),
      close: () => set({ openSection: null }),
    }),
    {
      name: "feapro-right-rail",
      partialize: (s) => ({ openSection: s.openSection }),
    },
  ),
);
