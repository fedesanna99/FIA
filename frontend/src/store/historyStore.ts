/**
 * Store generico undo/redo basato su snapshot.
 *
 * Strategia:
 *   - Mantiene 2 stack: past[] e future[].
 *   - push(snapshot) salva lo stato attuale in past e svuota future.
 *   - undo() sposta past.top in future, ritorna past.top-1 (lo stato prima
 *     della modifica).
 *   - redo() sposta future.top in past e lo ritorna come stato corrente.
 *   - limit N: quando past supera N, scarta i più vecchi (queue circolare).
 *
 * Tipico uso: integrarlo con modelStore.subscribe per snapshot automatico.
 */
import { create } from "zustand";

export interface HistoryStateMethods<T> {
  past: T[];
  future: T[];
  limit: number;
  canUndo: () => boolean;
  canRedo: () => boolean;
  push: (snapshot: T) => void;
  undo: () => T | null;
  redo: () => T | null;
  clear: () => void;
  setLimit: (n: number) => void;
}

/**
 * Crea uno store undo/redo per il tipo T.
 *
 * @param limit massimo numero di snapshot conservati (default 50)
 */
export function createHistoryStore<T>(limit = 50) {
  return create<HistoryStateMethods<T>>((set, get) => ({
    past: [],
    future: [],
    limit,

    // canUndo richiede ALMENO due snapshot in past: lo snapshot 0 e' la
    // baseline (modello caricato), quindi undo ha senso solo se ci sono
    // mutations sopra. Senza questa guardia il pulsante undo apparirebbe
    // attivo anche per il modello appena caricato.
    canUndo: () => get().past.length > 1,
    canRedo: () => get().future.length > 0,

    push: (snapshot) =>
      set((s) => {
        const next = [...s.past, snapshot];
        // Mantiene solo gli ultimi `limit` elementi
        const trimmed = next.length > s.limit ? next.slice(next.length - s.limit) : next;
        return { past: trimmed, future: [] };
      }),

    undo: () => {
      const s = get();
      if (s.past.length === 0) return null;
      const last = s.past[s.past.length - 1];
      set({
        past: s.past.slice(0, -1),
        future: [last, ...s.future],
      });
      // Ritorna lo stato che ora dovrebbe essere applicato (l'ultimo rimasto in past,
      // oppure null se past si è svuotato — in tal caso il caller dovrà gestirlo).
      const newPast = s.past.slice(0, -1);
      return newPast.length > 0 ? newPast[newPast.length - 1] : null;
    },

    redo: () => {
      const s = get();
      if (s.future.length === 0) return null;
      const next = s.future[0];
      set({
        past: [...s.past, next],
        future: s.future.slice(1),
      });
      return next;
    },

    clear: () => set({ past: [], future: [] }),

    setLimit: (n) =>
      set((s) => {
        const trimmed =
          s.past.length > n ? s.past.slice(s.past.length - n) : s.past;
        return { past: trimmed, limit: n };
      }),
  }));
}

/**
 * Istanza pre-creata per il modello FEA (oggetto generico).
 * Usata da modelStore per integrare l'undo/redo.
 */
export const useModelHistory = createHistoryStore<unknown>(50);
