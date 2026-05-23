/**
 * snapshotStore — snapshot dei risultati per confronto.
 *
 * v2.3.2: aggiunta persistenza localStorage via zustand `persist`.
 * Gli snapshot ora sopravvivono refresh / chiusura tab. Il counter
 * vive dentro lo state (non più module-level) per evitare collisioni
 * di id dopo rehydrate.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { StaticResults, ModalResults } from "../types/results";

export interface Snapshot {
  id: number;
  label: string;
  timestamp: number;
  modelId: string;
  modelName: string;
  modelHash: string;
  staticResults: StaticResults | null;
  modalResults: ModalResults | null;
}

interface SnapshotState {
  snapshots: Snapshot[];
  /** Auto-incrementing id seed (persistente). v2.3.2. */
  _counter: number;
  takeSnapshot: (
    label: string,
    modelId: string,
    modelName: string,
    modelHash: string,
    staticResults: StaticResults | null,
    modalResults: ModalResults | null,
  ) => void;
  /**
   * v2.3.1: rinomina inline uno snapshot esistente. Se la label è
   * stringa vuota dopo trim, mantiene la label precedente.
   */
  renameSnapshot: (id: number, label: string) => void;
  removeSnapshot: (id: number) => void;
  clearAll: () => void;
}

export const useSnapshotStore = create<SnapshotState>()(
  persist(
    (set) => ({
      snapshots: [],
      _counter: 0,
      takeSnapshot: (label, modelId, modelName, modelHash, staticResults, modalResults) =>
        set((s) => {
          const nextId = s._counter + 1;
          return {
            _counter: nextId,
            snapshots: [
              ...s.snapshots,
              {
                id: nextId,
                label,
                timestamp: Date.now(),
                modelId,
                modelName,
                modelHash,
                staticResults,
                modalResults,
              },
            ],
          };
        }),
      renameSnapshot: (id, label) =>
        set((s) => {
          const trimmed = label.trim();
          if (!trimmed) return s; // no-op se label vuota
          return {
            snapshots: s.snapshots.map((x) =>
              x.id === id ? { ...x, label: trimmed } : x,
            ),
          };
        }),
      removeSnapshot: (id) =>
        set((s) => ({ snapshots: s.snapshots.filter((x) => x.id !== id) })),
      clearAll: () => set({ snapshots: [], _counter: 0 }),
    }),
    {
      name: "feapro-snapshots",
      // version 1 = persistence introdotta in v2.3.2; bump per future migrations
      version: 1,
      partialize: (s) => ({ snapshots: s.snapshots, _counter: s._counter }),
    },
  ),
);
