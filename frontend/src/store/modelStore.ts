import { create } from "zustand";
import type { FEAModel, Node, Element, Load, Constraint } from "../types/model";

export type HoverTarget =
  | { kind: "node"; id: number; x: number; y: number; z: number }
  | { kind: "element"; id: number; type: string; nodes: number[] }
  | null;

interface ModelState {
  model: FEAModel | null;
  setModel: (m: FEAModel | null) => void;
  selectedNodeIds: Set<number>;
  selectedElementIds: Set<number>;
  selectNode: (id: number, additive?: boolean) => void;
  selectElement: (id: number, additive?: boolean) => void;
  clearSelection: () => void;
  hover: HoverTarget;
  setHover: (h: HoverTarget) => void;

  /**
   * Timestamp dell'ultima sincronizzazione del modello con il backend.
   * Aggiornato automaticamente in `setModel` e in tutte le mutations
   * (add/update/remove di nodi/elementi/loads/constraints): l'UI TopBar
   * mostra "✓ Salvato HH:MM" basandosi su questo.
   */
  lastSavedAt: Date | null;
  setLastSavedAt: (d: Date | null) => void;

  addNode: (n: Node) => void;
  updateNode: (id: number, n: Partial<Node>) => void;
  removeNode: (id: number) => void;

  addElement: (e: Element) => void;
  removeElement: (id: number) => void;

  addLoad: (l: Load) => void;
  updateLoad: (id: number, l: Load) => void;
  removeLoad: (id: number) => void;

  addConstraint: (c: Constraint) => void;
  updateConstraint: (id: number, c: Constraint) => void;
  removeConstraint: (id: number) => void;
}

export const useModelStore = create<ModelState>((set, get) => ({
  model: null,
  setModel: (m) => set({
    model: m,
    selectedNodeIds: new Set(),
    selectedElementIds: new Set(),
    lastSavedAt: m ? new Date() : null,
  }),

  lastSavedAt: null,
  setLastSavedAt: (d) => set({ lastSavedAt: d }),

  selectedNodeIds: new Set(),
  selectedElementIds: new Set(),

  selectNode: (id, additive = false) => set((s) => {
    const next = new Set(additive ? s.selectedNodeIds : []);
    if (next.has(id)) next.delete(id); else next.add(id);
    return { selectedNodeIds: next, selectedElementIds: additive ? s.selectedElementIds : new Set() };
  }),

  selectElement: (id, additive = false) => set((s) => {
    const next = new Set(additive ? s.selectedElementIds : []);
    if (next.has(id)) next.delete(id); else next.add(id);
    return { selectedElementIds: next, selectedNodeIds: additive ? s.selectedNodeIds : new Set() };
  }),

  clearSelection: () => set({ selectedNodeIds: new Set(), selectedElementIds: new Set() }),

  hover: null,
  setHover: (h) => set({ hover: h }),

  addNode: (n) => {
    const m = get().model; if (!m) return;
    set({ lastSavedAt: new Date(), model: { ...m, nodes: [...m.nodes, n] } });
  },
  updateNode: (id, patch) => {
    const m = get().model; if (!m) return;
    set({
      lastSavedAt: new Date(),
      model: {
        ...m,
        nodes: m.nodes.map((nd) => (nd.id === id ? { ...nd, ...patch } : nd)),
      },
    });
  },
  removeNode: (id) => {
    const m = get().model; if (!m) return;
    set({
      lastSavedAt: new Date(),
      model: {
        ...m,
        nodes: m.nodes.filter((nd) => nd.id !== id),
        elements: m.elements.filter((e) => !e.nodes.includes(id)),
        constraints: m.constraints.filter((c) => c.node_id !== id),
      },
    });
  },
  addElement: (e) => {
    const m = get().model; if (!m) return;
    set({ lastSavedAt: new Date(), model: { ...m, elements: [...m.elements, e] } });
  },
  removeElement: (id) => {
    const m = get().model; if (!m) return;
    set({ lastSavedAt: new Date(), model: { ...m, elements: m.elements.filter((e) => e.id !== id) } });
  },
  addLoad: (l) => {
    const m = get().model; if (!m) return;
    set({ lastSavedAt: new Date(), model: { ...m, loads: [...m.loads, l] } });
  },
  updateLoad: (id, l) => {
    const m = get().model; if (!m) return;
    set({ lastSavedAt: new Date(), model: { ...m, loads: m.loads.map((x) => x.id === id ? l : x) } });
  },
  removeLoad: (id) => {
    const m = get().model; if (!m) return;
    set({ lastSavedAt: new Date(), model: { ...m, loads: m.loads.filter((l) => l.id !== id) } });
  },
  addConstraint: (c) => {
    const m = get().model; if (!m) return;
    set({ lastSavedAt: new Date(), model: { ...m, constraints: [...m.constraints, c] } });
  },
  updateConstraint: (id, c) => {
    const m = get().model; if (!m) return;
    set({ lastSavedAt: new Date(), model: { ...m, constraints: m.constraints.map((x) => x.id === id ? c : x) } });
  },
  removeConstraint: (id) => {
    const m = get().model; if (!m) return;
    set({ lastSavedAt: new Date(), model: { ...m, constraints: m.constraints.filter((c) => c.id !== id) } });
  },
}));
