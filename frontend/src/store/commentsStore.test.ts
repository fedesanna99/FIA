/**
 * Test store commenti.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { useCommentsStore } from "./commentsStore";

describe("useCommentsStore", () => {
  beforeEach(() => {
    useCommentsStore.getState().clear();
  });

  it("starts empty", () => {
    expect(useCommentsStore.getState().comments).toEqual([]);
  });

  it("add returns Comment with incremental id", () => {
    const c1 = useCommentsStore
      .getState()
      .add({ kind: "node", id: 7 }, "Punto critico", "alice");
    const c2 = useCommentsStore
      .getState()
      .add({ kind: "element", id: 12 }, "Da verificare", "bob");
    expect(c1.id).toBe(1);
    expect(c2.id).toBe(2);
    expect(useCommentsStore.getState().comments).toHaveLength(2);
  });

  it("byTarget filters by node id", () => {
    useCommentsStore.getState().add({ kind: "node", id: 5 }, "A");
    useCommentsStore.getState().add({ kind: "node", id: 5 }, "B");
    useCommentsStore.getState().add({ kind: "node", id: 6 }, "C");
    const matches = useCommentsStore
      .getState()
      .byTarget({ kind: "node", id: 5 });
    expect(matches.map((c) => c.text).sort()).toEqual(["A", "B"]);
  });

  it("byTarget filters by element id", () => {
    useCommentsStore.getState().add({ kind: "element", id: 1 }, "EL1");
    useCommentsStore.getState().add({ kind: "node", id: 1 }, "ND1");
    const elComments = useCommentsStore
      .getState()
      .byTarget({ kind: "element", id: 1 });
    expect(elComments).toHaveLength(1);
    expect(elComments[0].text).toBe("EL1");
  });

  it("update changes text but keeps id", () => {
    const c = useCommentsStore
      .getState()
      .add({ kind: "model" }, "original");
    useCommentsStore.getState().update(c.id, "edited");
    const updated = useCommentsStore.getState().comments.find((x) => x.id === c.id);
    expect(updated?.text).toBe("edited");
  });

  it("remove deletes by id", () => {
    const c = useCommentsStore.getState().add({ kind: "model" }, "tmp");
    expect(useCommentsStore.getState().comments).toHaveLength(1);
    useCommentsStore.getState().remove(c.id);
    expect(useCommentsStore.getState().comments).toHaveLength(0);
  });

  it("clear resets id counter", () => {
    const c1 = useCommentsStore.getState().add({ kind: "model" }, "x");
    useCommentsStore.getState().clear();
    const c2 = useCommentsStore.getState().add({ kind: "model" }, "y");
    expect(c2.id).toBe(1);
    expect(c2.id).toBeLessThanOrEqual(c1.id);
  });

  it("byTarget on position matches exact coords", () => {
    useCommentsStore
      .getState()
      .add({ kind: "position", x: 1, y: 2, z: 3 }, "spot");
    const found = useCommentsStore
      .getState()
      .byTarget({ kind: "position", x: 1, y: 2, z: 3 });
    expect(found).toHaveLength(1);
    const notFound = useCommentsStore
      .getState()
      .byTarget({ kind: "position", x: 0, y: 0, z: 0 });
    expect(notFound).toHaveLength(0);
  });

  it("default author is 'anonymous'", () => {
    const c = useCommentsStore.getState().add({ kind: "model" }, "test");
    expect(c.author).toBe("anonymous");
  });

  it("createdAt is set to a recent timestamp", () => {
    const before = Date.now();
    const c = useCommentsStore.getState().add({ kind: "model" }, "ts");
    const after = Date.now();
    expect(c.createdAt).toBeGreaterThanOrEqual(before);
    expect(c.createdAt).toBeLessThanOrEqual(after);
  });
});
