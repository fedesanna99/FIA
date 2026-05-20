import { create } from "zustand";
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
  takeSnapshot: (
    label: string,
    modelId: string,
    modelName: string,
    modelHash: string,
    staticResults: StaticResults | null,
    modalResults: ModalResults | null,
  ) => void;
  removeSnapshot: (id: number) => void;
  clearAll: () => void;
}

let counter = 0;

export const useSnapshotStore = create<SnapshotState>((set) => ({
  snapshots: [],
  takeSnapshot: (label, modelId, modelName, modelHash, staticResults, modalResults) =>
    set((s) => ({
      snapshots: [
        ...s.snapshots,
        {
          id: ++counter,
          label,
          timestamp: Date.now(),
          modelId,
          modelName,
          modelHash,
          staticResults,
          modalResults,
        },
      ],
    })),
  removeSnapshot: (id) => set((s) => ({ snapshots: s.snapshots.filter((x) => x.id !== id) })),
  clearAll: () => set({ snapshots: [] }),
}));
