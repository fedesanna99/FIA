/**
 * Test store undo/redo generico.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { createHistoryStore } from "./historyStore";

describe("createHistoryStore", () => {
  let store: ReturnType<typeof createHistoryStore<number>>;
  beforeEach(() => {
    store = createHistoryStore<number>(3);
  });

  it("starts empty, no undo/redo available", () => {
    const s = store.getState();
    expect(s.canUndo()).toBe(false);
    expect(s.canRedo()).toBe(false);
  });

  it("push adds snapshots and enables undo", () => {
    store.getState().push(1);
    store.getState().push(2);
    expect(store.getState().canUndo()).toBe(true);
    expect(store.getState().past.length).toBe(2);
  });

  it("undo moves snapshot to future", () => {
    store.getState().push(1);
    store.getState().push(2);
    store.getState().push(3);
    expect(store.getState().past).toEqual([1, 2, 3]);
    const prev = store.getState().undo();
    // Dopo undo del 3, lo stato "applicato" è il 2 (l'ultimo di past)
    expect(prev).toBe(2);
    expect(store.getState().past).toEqual([1, 2]);
    expect(store.getState().future).toEqual([3]);
  });

  it("redo restores from future to past", () => {
    store.getState().push(1);
    store.getState().push(2);
    store.getState().undo();
    expect(store.getState().future).toEqual([2]);
    const next = store.getState().redo();
    expect(next).toBe(2);
    expect(store.getState().past).toEqual([1, 2]);
    expect(store.getState().future).toEqual([]);
  });

  it("push clears future stack", () => {
    store.getState().push(1);
    store.getState().push(2);
    store.getState().undo();
    expect(store.getState().future).toEqual([2]);
    store.getState().push(99);
    expect(store.getState().future).toEqual([]);
  });

  it("respects limit by dropping oldest", () => {
    const s = createHistoryStore<number>(3);
    s.getState().push(1);
    s.getState().push(2);
    s.getState().push(3);
    s.getState().push(4); // overflow
    expect(s.getState().past).toEqual([2, 3, 4]);
  });

  it("clear empties both stacks", () => {
    store.getState().push(1);
    store.getState().push(2);
    store.getState().clear();
    expect(store.getState().past).toEqual([]);
    expect(store.getState().future).toEqual([]);
  });

  it("undo on empty returns null", () => {
    expect(store.getState().undo()).toBeNull();
  });

  it("redo on empty returns null", () => {
    expect(store.getState().redo()).toBeNull();
  });

  it("setLimit truncates past when shrinking", () => {
    store.getState().push(1);
    store.getState().push(2);
    store.getState().push(3);
    store.getState().setLimit(2);
    expect(store.getState().past).toEqual([2, 3]);
    expect(store.getState().limit).toBe(2);
  });
});
