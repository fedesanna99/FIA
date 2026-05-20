import { describe, it, expect } from "vitest";
import { nodeById, modelBounds, modelHash } from "./geometry";
import type { FEAModel } from "../types/model";

const M: FEAModel = {
  id: "t", name: "test", units: "SI", is_3d: true,
  nodes: [
    { id: 1, x: 0, y: 0, z: 0 },
    { id: 2, x: 2, y: 1, z: 0.5 },
    { id: 3, x: -1, y: 3, z: 1 },
  ],
  elements: [
    { id: 1, type: "beam2d", nodes: [1, 2], material_id: "steel_s355", section_id: "ipe_300" },
  ],
  loads: [],
  constraints: [],
};

describe("geometry utils", () => {
  it("nodeById maps id → node", () => {
    const m = nodeById(M);
    expect(m.get(2)?.x).toBe(2);
    expect(m.get(999)).toBeUndefined();
  });

  it("modelBounds computes correct extents and center", () => {
    const b = modelBounds(M);
    expect(b.min[0]).toBe(-1);
    expect(b.max[1]).toBe(3);
    expect(b.size).toBeGreaterThan(0);
  });

  it("modelBounds returns fallback for empty/null", () => {
    expect(modelBounds(null).size).toBe(2);
    const empty = { ...M, nodes: [] };
    expect(modelBounds(empty).size).toBe(2);
  });

  it("modelHash returns stable string", () => {
    const h1 = modelHash(M);
    const h2 = modelHash({ ...M, nodes: [...M.nodes] });
    expect(h1).toBe(h2);
  });

  it("modelHash changes when model changes", () => {
    const h1 = modelHash(M);
    const modified = { ...M, nodes: [...M.nodes, { id: 4, x: 10, y: 10, z: 10 }] };
    const h2 = modelHash(modified);
    expect(h1).not.toBe(h2);
  });
});
