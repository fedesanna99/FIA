/**
 * v2.3.1 — test snapshotStore: takeSnapshot, renameSnapshot, removeSnapshot.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { useSnapshotStore } from "./snapshotStore";

describe("snapshotStore (v2.3.1)", () => {
  beforeEach(() => {
    useSnapshotStore.getState().clearAll();
  });

  it("takeSnapshot crea uno snapshot con label e timestamp", () => {
    useSnapshotStore.getState().takeSnapshot(
      "Test A",
      "m1",
      "Modello uno",
      "hash1",
      null,
      null,
    );
    const list = useSnapshotStore.getState().snapshots;
    expect(list.length).toBe(1);
    expect(list[0].label).toBe("Test A");
    expect(list[0].modelId).toBe("m1");
    expect(list[0].timestamp).toBeGreaterThan(0);
  });

  it("renameSnapshot aggiorna la label esistente", () => {
    useSnapshotStore.getState().takeSnapshot("Old", "m1", "M", "h", null, null);
    const id = useSnapshotStore.getState().snapshots[0].id;
    useSnapshotStore.getState().renameSnapshot(id, "New label");
    expect(useSnapshotStore.getState().snapshots[0].label).toBe("New label");
  });

  it("renameSnapshot ignora label vuota (trimmed)", () => {
    useSnapshotStore.getState().takeSnapshot("Stay", "m1", "M", "h", null, null);
    const id = useSnapshotStore.getState().snapshots[0].id;
    useSnapshotStore.getState().renameSnapshot(id, "   ");
    expect(useSnapshotStore.getState().snapshots[0].label).toBe("Stay");
  });

  it("renameSnapshot trim'a spazi esterni", () => {
    useSnapshotStore.getState().takeSnapshot("X", "m1", "M", "h", null, null);
    const id = useSnapshotStore.getState().snapshots[0].id;
    useSnapshotStore.getState().renameSnapshot(id, "  Hello  ");
    expect(useSnapshotStore.getState().snapshots[0].label).toBe("Hello");
  });

  it("renameSnapshot su id inesistente non altera lo stato", () => {
    useSnapshotStore.getState().takeSnapshot("Keep", "m1", "M", "h", null, null);
    useSnapshotStore.getState().renameSnapshot(9999, "Other");
    expect(useSnapshotStore.getState().snapshots[0].label).toBe("Keep");
  });

  it("removeSnapshot elimina lo snapshot indicato", () => {
    useSnapshotStore.getState().takeSnapshot("A", "m1", "M", "h", null, null);
    useSnapshotStore.getState().takeSnapshot("B", "m1", "M", "h", null, null);
    const id = useSnapshotStore.getState().snapshots[0].id;
    useSnapshotStore.getState().removeSnapshot(id);
    const remaining = useSnapshotStore.getState().snapshots;
    expect(remaining.length).toBe(1);
    expect(remaining[0].label).toBe("B");
  });

  it("clearAll svuota lo store", () => {
    useSnapshotStore.getState().takeSnapshot("A", "m1", "M", "h", null, null);
    useSnapshotStore.getState().takeSnapshot("B", "m1", "M", "h", null, null);
    useSnapshotStore.getState().clearAll();
    expect(useSnapshotStore.getState().snapshots.length).toBe(0);
  });
});
