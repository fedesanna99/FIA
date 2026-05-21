/**
 * SelectionStore (v1.5 Task 32) — single-selection per inspect contestuale.
 *
 * Distinzione dal `modelStore.selectedNodeIds/selectedElementIds` (multi-set):
 *   - modelStore tracks le *selezioni multiple* nel viewport (highlight tutti
 *     i nodi/elementi selezionati per operazioni bulk: delete, apply, ...).
 *   - selectionStore tracks *l'entita' singola* che sta venendo ispezionata
 *     nel RightPanel "Inspect" (contestuale, sempre uno solo alla volta).
 *
 * I due store sono complementari: il click su un nodo dispatcha entrambi.
 * Il click su "X" del NodeDetail svuota solo `selectionStore` lasciando il
 * `modelStore` intatto (la selezione viewport non viene persa).
 */
import { create } from "zustand";


interface SelectionState {
  selectedNodeId: number | null;
  selectedElementId: number | null;
  selectNode: (id: number | null) => void;
  selectElement: (id: number | null) => void;
  clear: () => void;
}


export const useSelectionStore = create<SelectionState>((set) => ({
  selectedNodeId: null,
  selectedElementId: null,
  selectNode: (id) => set({ selectedNodeId: id, selectedElementId: null }),
  selectElement: (id) => set({ selectedElementId: id, selectedNodeId: null }),
  clear: () => set({ selectedNodeId: null, selectedElementId: null }),
}));
