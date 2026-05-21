/**
 * LeftRail slide-in store (alpha.22 — Sprint 4 G7).
 *
 * Mirror del `rightRailStore`: gestisce l'apertura del panel slide-in
 * ankorato a sinistra (subito dopo il LeftRail). Toggle pattern: click
 * su una sezione gia' aperta → chiude. Click su sezione diversa →
 * sostituisce.
 *
 * Le "sezioni" sono i workspace operativi (model/analysis/verify) +
 * secondary legacy (results/io). Quando aperto, il panel mostra il
 * content del workspace corrispondente.
 *
 * Persistenza: salva `openSection` in localStorage `feapro-left-rail`
 * cosi' al refresh l'app riprende dove l'utente l'aveva lasciato.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { Workspace } from "./workspaceStore";


interface LeftRailState {
  /** Workspace aperto nel slide-in panel. `null` = panel chiuso. */
  openSection: Workspace | null;
  /** Apre o chiude (toggle) una sezione. */
  toggle: (section: Workspace) => void;
  /** Apre esplicitamente (no-toggle). */
  open: (section: Workspace) => void;
  /** Chiude il panel. */
  close: () => void;
}


export const useLeftRailStore = create<LeftRailState>()(
  persist(
    (set, get) => ({
      // Default: panel aperto su "model" cosi' l'utente vede gli editor di
      // geometria al primo accesso (esperienza onboarding).
      openSection: "model",
      toggle: (section) =>
        set({ openSection: get().openSection === section ? null : section }),
      open: (section) => set({ openSection: section }),
      close: () => set({ openSection: null }),
    }),
    {
      name: "feapro-left-rail",
      partialize: (s) => ({ openSection: s.openSection }),
    },
  ),
);
