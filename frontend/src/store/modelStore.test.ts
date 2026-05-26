/**
 * v2.3.0 — test integrazione modelStore <-> historyStore.
 *
 * Verifica che ogni mutation pushi uno snapshot e che undo/redo
 * ripristinino correttamente lo stato.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { useModelStore } from "./modelStore";
import { useModelHistory } from "./historyStore";
import type { FEAModel } from "../types/model";

function makeBaseModel(): FEAModel {
  return {
    id: "m1",
    name: "Test model",
    units: "SI",
    is_3d: false,
    nodes: [
      { id: 1, x: 0, y: 0, z: 0 },
      { id: 2, x: 1, y: 0, z: 0 },
    ],
    elements: [],
    loads: [],
    constraints: [],
  };
}

describe("modelStore undo/redo wiring (v2.3.0)", () => {
  beforeEach(() => {
    // Reset
    useModelStore.getState().setModel(null);
    useModelHistory.getState().clear();
  });

  it("setModel inizializza la history con la baseline", () => {
    const m = makeBaseModel();
    useModelStore.getState().setModel(m);
    expect(useModelHistory.getState().past.length).toBe(1);
    expect(useModelHistory.getState().canUndo()).toBe(false); // baseline soltanto
  });

  it("addNode pusha snapshot e abilita undo", () => {
    const m = makeBaseModel();
    useModelStore.getState().setModel(m);
    useModelStore.getState().addNode({ id: 3, x: 2, y: 0, z: 0 });
    expect(useModelHistory.getState().past.length).toBe(2);
    expect(useModelHistory.getState().canUndo()).toBe(true);
    expect(useModelStore.getState().model?.nodes.length).toBe(3);
  });

  it("undo ripristina lo stato precedente", () => {
    const m = makeBaseModel();
    useModelStore.getState().setModel(m);
    useModelStore.getState().addNode({ id: 3, x: 2, y: 0, z: 0 });
    const ok = useModelStore.getState().undo();
    expect(ok).toBe(true);
    expect(useModelStore.getState().model?.nodes.length).toBe(2);
    expect(useModelHistory.getState().canRedo()).toBe(true);
  });

  it("redo ripristina lo stato annullato", () => {
    const m = makeBaseModel();
    useModelStore.getState().setModel(m);
    useModelStore.getState().addNode({ id: 3, x: 2, y: 0, z: 0 });
    useModelStore.getState().undo();
    expect(useModelStore.getState().model?.nodes.length).toBe(2);
    const ok = useModelStore.getState().redo();
    expect(ok).toBe(true);
    expect(useModelStore.getState().model?.nodes.length).toBe(3);
  });

  it("setModel resetta la history (no carry-over fra modelli)", () => {
    const m1 = makeBaseModel();
    useModelStore.getState().setModel(m1);
    useModelStore.getState().addNode({ id: 3, x: 2, y: 0, z: 0 });
    expect(useModelHistory.getState().past.length).toBe(2);

    const m2 = { ...m1, id: "m2", name: "Other" };
    useModelStore.getState().setModel(m2);
    // history reset → solo la baseline del nuovo modello
    expect(useModelHistory.getState().past.length).toBe(1);
    expect(useModelHistory.getState().canUndo()).toBe(false);
    expect(useModelHistory.getState().future.length).toBe(0);
  });

  it("removeElement pusha snapshot e undo lo ripristina", () => {
    const m: FEAModel = {
      ...makeBaseModel(),
      elements: [{ id: 100, type: "beam2d", nodes: [1, 2], material_id: "S275" }],
    };
    useModelStore.getState().setModel(m);
    useModelStore.getState().removeElement(100);
    expect(useModelStore.getState().model?.elements.length).toBe(0);
    useModelStore.getState().undo();
    expect(useModelStore.getState().model?.elements.length).toBe(1);
  });

  it("undo senza past extra ritorna false", () => {
    const m = makeBaseModel();
    useModelStore.getState().setModel(m);
    // Solo baseline → undo non ha effetto
    const ok = useModelStore.getState().undo();
    expect(ok).toBe(false);
  });

  it("redo senza future ritorna false", () => {
    const m = makeBaseModel();
    useModelStore.getState().setModel(m);
    const ok = useModelStore.getState().redo();
    expect(ok).toBe(false);
  });

  it("nuova mutation dopo undo invalida la future", () => {
    const m = makeBaseModel();
    useModelStore.getState().setModel(m);
    useModelStore.getState().addNode({ id: 3, x: 2, y: 0, z: 0 });
    useModelStore.getState().undo();
    expect(useModelHistory.getState().future.length).toBe(1);

    useModelStore.getState().addNode({ id: 4, x: 3, y: 0, z: 0 });
    expect(useModelHistory.getState().future.length).toBe(0);
    expect(useModelHistory.getState().canRedo()).toBe(false);
  });
});


describe("setModel · history preservation (v2.5.4 fix bug #9)", () => {
  beforeEach(() => {
    useModelStore.getState().setModel(null);
    useModelHistory.getState().clear();
  });

  it("setModel con id diverso azzera la history", () => {
    const m1 = makeBaseModel();
    useModelStore.getState().setModel(m1);
    useModelStore.getState().addNode({ id: 3, x: 2, y: 0, z: 0 });
    expect(useModelHistory.getState().past.length).toBe(2);

    const m2: FEAModel = { ...makeBaseModel(), id: "m2", name: "Other" };
    useModelStore.getState().setModel(m2);
    expect(useModelHistory.getState().past.length).toBe(1);
    expect((useModelHistory.getState().past[0] as FEAModel).id).toBe("m2");
  });

  it("setModel con stesso id e snapshot identico NON pusha (refetch idempotente)", () => {
    const baseline = makeBaseModel();
    useModelStore.getState().setModel(baseline);
    expect(useModelHistory.getState().past.length).toBe(1);

    // Simula la mutation: addNode pusha già internamente lo snapshot post-mutation
    useModelStore.getState().addNode({ id: 3, x: 2, y: 0, z: 0 });
    expect(useModelHistory.getState().past.length).toBe(2);

    // Simula il refetch post-invalidate: stesso id, stesso contenuto dell'ultimo snapshot
    const refetched = useModelStore.getState().model!;
    useModelStore.getState().setModel(refetched);

    // refetched coincide con last snapshot → no push, no clear
    expect(useModelHistory.getState().past.length).toBe(2);
    expect(useModelHistory.getState().canUndo()).toBe(true);
  });

  it("setModel con stesso id e snapshot divergente pusha (refetch divergente)", () => {
    const baseline = makeBaseModel();
    useModelStore.getState().setModel(baseline);
    expect(useModelHistory.getState().past.length).toBe(1);

    // Simula refetch divergente (es. backend ha aggiunto un nodo non nello store locale)
    const divergent: FEAModel = {
      ...baseline,
      nodes: [...baseline.nodes, { id: 99, x: 10, y: 0, z: 0 }],
    };
    useModelStore.getState().setModel(divergent);

    // diverge da last → push, history estesa
    expect(useModelHistory.getState().past.length).toBe(2);
    expect(useModelHistory.getState().canUndo()).toBe(true);
  });

  it("undo dopo refetch post-mutation rimuove davvero la modifica", () => {
    const baseline = makeBaseModel();
    useModelStore.getState().setModel(baseline);
    const baselineNodeCount = baseline.nodes.length;
    expect(useModelHistory.getState().past.length).toBe(1);

    useModelStore.getState().addNode({ id: 3, x: 2, y: 0, z: 0 });
    expect(useModelStore.getState().model!.nodes.length).toBe(baselineNodeCount + 1);
    expect(useModelHistory.getState().past.length).toBe(2);

    // Simula refetch TanStack Query post-invalidate (passa lo stesso modello)
    useModelStore.getState().setModel(useModelStore.getState().model!);
    expect(useModelHistory.getState().past.length).toBe(2);

    // Undo: ora funziona davvero (era il bug #9 broken in produzione)
    const ok = useModelStore.getState().undo();
    expect(ok).toBe(true);
    expect(useModelStore.getState().model!.nodes.length).toBe(baselineNodeCount);
  });
});
