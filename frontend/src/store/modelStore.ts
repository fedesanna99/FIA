import { create } from "zustand";
import type { FEAModel, Node, Element, Load, Constraint } from "../types/model";
import { useModelHistory } from "./historyStore";

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
  /** v2.1.9 audit-fix B5: aggiorna un elemento esistente (es. apply-material). */
  updateElement: (id: number, e: Element) => void;
  removeElement: (id: number) => void;

  addLoad: (l: Load) => void;
  updateLoad: (id: number, l: Load) => void;
  removeLoad: (id: number) => void;

  addConstraint: (c: Constraint) => void;
  updateConstraint: (id: number, c: Constraint) => void;
  removeConstraint: (id: number) => void;

  /**
   * v2.3.0 undo/redo wiring.
   * Ogni mutazione produce un nuovo snapshot del modello che viene
   * spinto nello `useModelHistory`. `undo()` / `redo()` ricostruiscono
   * lo stato precedente/successivo dalla history senza toccare la
   * selezione corrente o `lastSavedAt`.
   */
  undo: () => boolean;
  redo: () => boolean;
}

/**
 * Helper interno: applica un nuovo modello mantenendo selezione e
 * `lastSavedAt`, e poi spinge lo snapshot nella history.
 */
function applyModelAndPush(
  set: (partial: Partial<ModelState>) => void,
  newModel: FEAModel,
) {
  set({ model: newModel, lastSavedAt: new Date() });
  useModelHistory.getState().push(newModel);
}

export const useModelStore = create<ModelState>((set, get) => ({
  model: null,
  setModel: (m) => {
    set({
      model: m,
      selectedNodeIds: new Set(),
      selectedElementIds: new Set(),
      lastSavedAt: m ? new Date() : null,
    });
    // v2.3.0: nuova history a ogni load di modello. Snapshot 0 = baseline
    // (loaded from server / wizard). Le mutations successive aggiungono.
    const history = useModelHistory.getState();
    history.clear();
    if (m) history.push(m);
  },

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
    applyModelAndPush(set, { ...m, nodes: [...m.nodes, n] });
  },
  updateNode: (id, patch) => {
    const m = get().model; if (!m) return;
    applyModelAndPush(set, {
      ...m,
      nodes: m.nodes.map((nd) => (nd.id === id ? { ...nd, ...patch } : nd)),
    });
  },
  removeNode: (id) => {
    const m = get().model; if (!m) return;
    applyModelAndPush(set, {
      ...m,
      nodes: m.nodes.filter((nd) => nd.id !== id),
      elements: m.elements.filter((e) => !e.nodes.includes(id)),
      constraints: m.constraints.filter((c) => c.node_id !== id),
    });
  },
  addElement: (e) => {
    const m = get().model; if (!m) return;
    applyModelAndPush(set, { ...m, elements: [...m.elements, e] });
  },
  updateElement: (id, e) => {
    const m = get().model; if (!m) return;
    applyModelAndPush(set, { ...m, elements: m.elements.map((x) => x.id === id ? e : x) });
  },
  removeElement: (id) => {
    const m = get().model; if (!m) return;
    applyModelAndPush(set, { ...m, elements: m.elements.filter((e) => e.id !== id) });
  },
  addLoad: (l) => {
    const m = get().model; if (!m) return;
    applyModelAndPush(set, { ...m, loads: [...m.loads, l] });
  },
  updateLoad: (id, l) => {
    const m = get().model; if (!m) return;
    applyModelAndPush(set, { ...m, loads: m.loads.map((x) => x.id === id ? l : x) });
  },
  removeLoad: (id) => {
    const m = get().model; if (!m) return;
    applyModelAndPush(set, { ...m, loads: m.loads.filter((l) => l.id !== id) });
  },
  addConstraint: (c) => {
    const m = get().model; if (!m) return;
    applyModelAndPush(set, { ...m, constraints: [...m.constraints, c] });
  },
  updateConstraint: (id, c) => {
    const m = get().model; if (!m) return;
    applyModelAndPush(set, { ...m, constraints: m.constraints.map((x) => x.id === id ? c : x) });
  },
  removeConstraint: (id) => {
    const m = get().model; if (!m) return;
    applyModelAndPush(set, { ...m, constraints: m.constraints.filter((c) => c.id !== id) });
  },

  undo: () => {
    const prev = useModelHistory.getState().undo();
    if (!prev) return false;
    set({ model: prev as FEAModel, lastSavedAt: new Date() });
    return true;
  },
  redo: () => {
    const next = useModelHistory.getState().redo();
    if (!next) return false;
    set({ model: next as FEAModel, lastSavedAt: new Date() });
    return true;
  },
}));
