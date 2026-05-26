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

/**
 * v2.5.4 fix bug #9 — confronto strutturale rapido fra due snapshot del modello,
 * usato da `setModel` per decidere se un refetch dello stesso `model.id` ha
 * effettivamente alterato il contenuto rispetto all'ultimo snapshot in history.
 *
 * Fast path: stessa reference o id diverso → decisione immediata.
 * Slow path: confronto length delle 4 liste mutabili, poi stringify mirato
 * (per cogliere le `update*` mutations che non cambiano i conteggi).
 * `materials?` è escluso (non mutato dai dialog di modello, escluderlo evita
 * false-positivi di divergenza quando il backend lo normalizza).
 */
function modelSnapshotsEqual(a: FEAModel, b: FEAModel): boolean {
  if (a === b) return true;
  if (a.id !== b.id) return false;
  if (a.nodes.length !== b.nodes.length) return false;
  if (a.elements.length !== b.elements.length) return false;
  if (a.constraints.length !== b.constraints.length) return false;
  if (a.loads.length !== b.loads.length) return false;
  return (
    JSON.stringify(a.nodes) === JSON.stringify(b.nodes) &&
    JSON.stringify(a.elements) === JSON.stringify(b.elements) &&
    JSON.stringify(a.constraints) === JSON.stringify(b.constraints) &&
    JSON.stringify(a.loads) === JSON.stringify(b.loads)
  );
}

export const useModelStore = create<ModelState>((set, get) => ({
  model: null,
  setModel: (m) => {
    const current = get().model;
    const history = useModelHistory.getState();

    // Reset (logout/no-op): wipe esplicito, niente push.
    if (m === null) {
      set({
        model: null,
        selectedNodeIds: new Set(),
        selectedElementIds: new Set(),
        lastSavedAt: null,
      });
      history.clear();
      return;
    }

    set({
      model: m,
      selectedNodeIds: new Set(),
      selectedElementIds: new Set(),
      lastSavedAt: new Date(),
    });

    // v2.3.0 baseline behavior — clear + push:
    //   - primo load (current === null)
    //   - switch ad altro modello (m.id !== current.id)
    const isSameModel = current !== null && current.id === m.id;
    if (!isSameModel) {
      history.clear();
      history.push(m);
      return;
    }

    // v2.5.4 fix bug #9 — refetch dello stesso modello post-mutation:
    // preserva la history. La mutation ha già pushato lo snapshot aggiornato;
    // pusha di nuovo solo se il refetched diverge dall'ultimo (defensive vs
    // normalizzazioni server).
    if (history.past.length === 0) {
      history.push(m);
      return;
    }
    const last = history.past[history.past.length - 1] as FEAModel;
    if (!modelSnapshotsEqual(last, m)) {
      history.push(m);
    }
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
