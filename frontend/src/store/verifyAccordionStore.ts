/**
 * VerifyAccordion store (v3.4 Fetta E2.5c · 29/05 sera).
 *
 * Gestisce lo stato delle 4 sezioni collassabili del panel DX di
 * "Verifica" (workspace `risultati`). Pattern accordion **multi-open**:
 * l'utente puo' aprire piu' sezioni contemporaneamente per confrontare
 * (es. Spostamenti + Reazioni aperti insieme).
 *
 * La sezione "Sintesi" NON e' gestita da questo store: e' sempre
 * visibile in cima al panel DX (junior tile UR/σ/freccia/verdict +
 * trust badge + bottoni Itera/Report). Filosofia "junior fuori,
 * senior dentro" decisa con Federico 29/05 sera (Tensione 1 Opzione A).
 *
 * Default `openSections = []` (tutte chiuse): all'utente la prima volta
 * vede solo Sintesi. Quando apre una sezione, lo stato viene persistito
 * cosi' la sua preferenza sopravvive al refresh.
 *
 * Mockup di riferimento:
 *   `socio/05-prototipi-workspace-v3/fea-pro-prototipo-risultati-senior.html`
 *   (era a 5 tabs orizzontali; Federico li ha bocciati per scroll-x in
 *    larghezza 380px → adottiamo accordion verticale).
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";


export type VerifySectionKey =
  | "displacements" // Spostamenti (DisplacementTable)
  | "forces"        // Sollecitazioni (ResultsDatiSollecitazioni)
  | "reactions"     // Reazioni (ResultsDatiReazioni)
  | "ec3";          // Verifica EC3 (ResultsVerifiche)


interface VerifyAccordionStore {
  /** Sezioni attualmente aperte. Array per supportare la persist
   *  middleware (Set non serializza nativamente in JSON). */
  openSections: VerifySectionKey[];
  /** Inverte lo stato di una sezione (open ↔ closed). Comportamento
   *  multi-open di default (desktop): tap apre/chiude una sezione
   *  senza toccare le altre. */
  toggle: (key: VerifySectionKey) => void;
  /** Apre la sezione (idempotente). */
  open: (key: VerifySectionKey) => void;
  /** Chiude la sezione (idempotente). */
  close: (key: VerifySectionKey) => void;
  /** Apre la sezione chiudendo TUTTE le altre. Single-open exclusive
   *  mode — usato dal bottom sheet mobile (Fetta M4-polish 30/05/2026):
   *  su mobile lo spazio verticale e' prezioso e l'utente vuole vedere
   *  sempre la sezione che ha tappato, senza scroll lunghi per arrivarci
   *  oltre quelle gia' aperte. Vedi ADR 004 "Revisione 30/05 notte". */
  openExclusive: (key: VerifySectionKey) => void;
  /** Chiude tutte le sezioni (reset). */
  closeAll: () => void;
}


export const useVerifyAccordionStore = create<VerifyAccordionStore>()(
  persist(
    (set, get) => ({
      openSections: [],
      toggle: (key) => {
        const cur = get().openSections;
        if (cur.includes(key)) {
          set({ openSections: cur.filter((k) => k !== key) });
        } else {
          set({ openSections: [...cur, key] });
        }
      },
      open: (key) => {
        const cur = get().openSections;
        if (!cur.includes(key)) {
          set({ openSections: [...cur, key] });
        }
      },
      close: (key) => {
        const cur = get().openSections;
        if (cur.includes(key)) {
          set({ openSections: cur.filter((k) => k !== key) });
        }
      },
      openExclusive: (key) => set({ openSections: [key] }),
      closeAll: () => set({ openSections: [] }),
    }),
    {
      name: "feapro-verify-accordion",
      partialize: (s) => ({ openSections: s.openSections }),
    },
  ),
);


/** Helper hook per check rapido se una sezione e' aperta (subscribe-only). */
export function useIsSectionOpen(key: VerifySectionKey): boolean {
  return useVerifyAccordionStore((s) => s.openSections.includes(key));
}
