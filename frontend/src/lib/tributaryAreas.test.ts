import { describe, it, expect } from "vitest";

import { computeTributaryAreas } from "./tributaryAreas";
import type { FEAModel } from "../types/model";


function model0(): FEAModel {
  return {
    id: "t", name: "t", units: "SI", is_3d: false,
    nodes: [], elements: [], loads: [], constraints: [],
  };
}


describe("computeTributaryAreas", () => {
  it("modello vuoto → stats zero, niente crash", () => {
    const r = computeTributaryAreas(model0());
    expect(r.by_node.size).toBe(0);
    expect(r.stats.n_nodes_with_tributary).toBe(0);
    expect(r.stats.area_mean_m2).toBe(0);
  });

  it("3 nodi senza elementi → tutti isolati", () => {
    const m: FEAModel = {
      ...model0(),
      nodes: [
        { id: 1, x: 0, y: 0, z: 0 },
        { id: 2, x: 1, y: 0, z: 0 },
        { id: 3, x: 2, y: 0, z: 0 },
      ],
    };
    const r = computeTributaryAreas(m);
    expect(r.stats.n_nodes_isolated).toBe(3);
    expect(r.stats.n_nodes_with_tributary).toBe(0);
    for (const t of r.by_node.values()) {
      expect(t.tributary_area_m2).toBe(0);
      expect(t.tributary_length_m).toBe(0);
    }
  });

  it("trave beam2d 6m con 2 nodi: ogni nodo 3m tributary length", () => {
    const m: FEAModel = {
      ...model0(),
      nodes: [
        { id: 1, x: 0, y: 0, z: 0 },
        { id: 2, x: 6, y: 0, z: 0 },
      ],
      elements: [{ id: 1, type: "beam2d", nodes: [1, 2], material_id: "m1" }],
    };
    const r = computeTributaryAreas(m);
    expect(r.by_node.get(1)?.tributary_length_m).toBeCloseTo(3.0);
    expect(r.by_node.get(2)?.tributary_length_m).toBeCloseTo(3.0);
    // area = length × facade_width default 1 m
    expect(r.by_node.get(1)?.tributary_area_m2).toBeCloseTo(3.0);
  });

  it("trave 6m suddivisa in 6 beam 1m: nodi interni 1m, estremi 0.5m", () => {
    const m: FEAModel = {
      ...model0(),
      nodes: [
        { id: 1, x: 0, y: 0, z: 0 },
        { id: 2, x: 1, y: 0, z: 0 },
        { id: 3, x: 2, y: 0, z: 0 },
        { id: 4, x: 3, y: 0, z: 0 },
        { id: 5, x: 4, y: 0, z: 0 },
        { id: 6, x: 5, y: 0, z: 0 },
        { id: 7, x: 6, y: 0, z: 0 },
      ],
      elements: [
        { id: 1, type: "beam2d", nodes: [1, 2], material_id: "m1" },
        { id: 2, type: "beam2d", nodes: [2, 3], material_id: "m1" },
        { id: 3, type: "beam2d", nodes: [3, 4], material_id: "m1" },
        { id: 4, type: "beam2d", nodes: [4, 5], material_id: "m1" },
        { id: 5, type: "beam2d", nodes: [5, 6], material_id: "m1" },
        { id: 6, type: "beam2d", nodes: [6, 7], material_id: "m1" },
      ],
    };
    const r = computeTributaryAreas(m);
    // Estremi (1, 7): 1 elemento adiacente di lunghezza 1 → 0.5 m
    expect(r.by_node.get(1)?.tributary_length_m).toBeCloseTo(0.5);
    expect(r.by_node.get(7)?.tributary_length_m).toBeCloseTo(0.5);
    // Interni (2-6): 2 elementi × 0.5 = 1 m
    expect(r.by_node.get(2)?.tributary_length_m).toBeCloseTo(1.0);
    expect(r.by_node.get(4)?.tributary_length_m).toBeCloseTo(1.0);
    expect(r.by_node.get(6)?.tributary_length_m).toBeCloseTo(1.0);
  });

  it("facade_width custom moltiplica", () => {
    const m: FEAModel = {
      ...model0(),
      nodes: [
        { id: 1, x: 0, y: 0, z: 0 },
        { id: 2, x: 4, y: 0, z: 0 },
      ],
      elements: [{ id: 1, type: "beam2d", nodes: [1, 2], material_id: "m1" }],
    };
    const r = computeTributaryAreas(m, 2.5); // facade_width=2.5m
    // length = 4, half = 2, area = 2 × 2.5 = 5
    expect(r.by_node.get(1)?.tributary_area_m2).toBeCloseTo(5.0);
  });

  it("shell Q4 unitario: ogni nodo prende A/4", () => {
    // Q4 sul piano xy, lato 1m × 1m
    const m: FEAModel = {
      ...model0(),
      nodes: [
        { id: 1, x: 0, y: 0, z: 0 },
        { id: 2, x: 1, y: 0, z: 0 },
        { id: 3, x: 1, y: 1, z: 0 },
        { id: 4, x: 0, y: 1, z: 0 },
      ],
      elements: [
        { id: 1, type: "shell_q4", nodes: [1, 2, 3, 4], material_id: "m1" },
      ],
    };
    const r = computeTributaryAreas(m);
    for (const id of [1, 2, 3, 4]) {
      expect(r.by_node.get(id)?.tributary_area_shell_m2).toBeCloseTo(0.25);
      expect(r.by_node.get(id)?.tributary_area_m2).toBeCloseTo(0.25);
    }
  });

  it("shell Q4 2×2 (area 4): nodi corner 1, edge 2, interno 4", () => {
    // Mesh 2×2 di shell Q4 (1m × 1m ciascuno)
    // Nodi: 3×3 = 9
    const m: FEAModel = {
      ...model0(),
      nodes: [
        { id: 1, x: 0, y: 0, z: 0 },
        { id: 2, x: 1, y: 0, z: 0 },
        { id: 3, x: 2, y: 0, z: 0 },
        { id: 4, x: 0, y: 1, z: 0 },
        { id: 5, x: 1, y: 1, z: 0 }, // centro
        { id: 6, x: 2, y: 1, z: 0 },
        { id: 7, x: 0, y: 2, z: 0 },
        { id: 8, x: 1, y: 2, z: 0 },
        { id: 9, x: 2, y: 2, z: 0 },
      ],
      elements: [
        { id: 1, type: "shell_q4", nodes: [1, 2, 5, 4], material_id: "m1" },
        { id: 2, type: "shell_q4", nodes: [2, 3, 6, 5], material_id: "m1" },
        { id: 3, type: "shell_q4", nodes: [4, 5, 8, 7], material_id: "m1" },
        { id: 4, type: "shell_q4", nodes: [5, 6, 9, 8], material_id: "m1" },
      ],
    };
    const r = computeTributaryAreas(m);
    // Corner (1, 3, 7, 9): 1 shell × 0.25 = 0.25
    expect(r.by_node.get(1)?.tributary_area_m2).toBeCloseTo(0.25);
    expect(r.by_node.get(9)?.tributary_area_m2).toBeCloseTo(0.25);
    // Edge (2, 4, 6, 8): 2 shells × 0.25 = 0.5
    expect(r.by_node.get(2)?.tributary_area_m2).toBeCloseTo(0.5);
    expect(r.by_node.get(8)?.tributary_area_m2).toBeCloseTo(0.5);
    // Interno (5): 4 shells × 0.25 = 1.0
    expect(r.by_node.get(5)?.tributary_area_m2).toBeCloseTo(1.0);
  });

  it("tri3 unitario: ogni nodo A/3", () => {
    // Triangolo retto 1m × 1m, area = 0.5
    const m: FEAModel = {
      ...model0(),
      nodes: [
        { id: 1, x: 0, y: 0, z: 0 },
        { id: 2, x: 1, y: 0, z: 0 },
        { id: 3, x: 0, y: 1, z: 0 },
      ],
      elements: [{ id: 1, type: "tri3", nodes: [1, 2, 3], material_id: "m1" }],
    };
    const r = computeTributaryAreas(m);
    for (const id of [1, 2, 3]) {
      expect(r.by_node.get(id)?.tributary_area_shell_m2).toBeCloseTo(0.5 / 3, 4);
    }
  });

  it("modello misto beam + shell", () => {
    const m: FEAModel = {
      ...model0(),
      nodes: [
        { id: 1, x: 0, y: 0, z: 0 },
        { id: 2, x: 2, y: 0, z: 0 },
        { id: 3, x: 2, y: 2, z: 0 },
        { id: 4, x: 0, y: 2, z: 0 },
      ],
      elements: [
        // Beam su edge 1-2 (lungh 2)
        { id: 1, type: "beam2d", nodes: [1, 2], material_id: "m1" },
        // Shell che riempie il quadrato 2x2 (area 4)
        { id: 2, type: "shell_q4", nodes: [1, 2, 3, 4], material_id: "m1" },
      ],
    };
    const r = computeTributaryAreas(m);
    // Node 1: beam half_length=1 + shell quarter=1 = total area = 1 + 1 = 2
    expect(r.by_node.get(1)?.tributary_length_m).toBeCloseTo(1.0);
    expect(r.by_node.get(1)?.tributary_area_shell_m2).toBeCloseTo(1.0);
    expect(r.by_node.get(1)?.tributary_area_m2).toBeCloseTo(2.0);
    expect(r.by_node.get(1)?.n_adjacent_elements).toBe(2);
    // Node 3: solo shell quarter=1
    expect(r.by_node.get(3)?.tributary_length_m).toBeCloseTo(0);
    expect(r.by_node.get(3)?.tributary_area_m2).toBeCloseTo(1.0);
    expect(r.by_node.get(3)?.n_adjacent_elements).toBe(1);
  });

  it("solid elements vengono ignorati (out of scope v1.4)", () => {
    const m: FEAModel = {
      ...model0(),
      nodes: [
        { id: 1, x: 0, y: 0, z: 0 },
        { id: 2, x: 1, y: 0, z: 0 },
        { id: 3, x: 1, y: 1, z: 0 },
        { id: 4, x: 0, y: 1, z: 0 },
        { id: 5, x: 0, y: 0, z: 1 },
        { id: 6, x: 1, y: 0, z: 1 },
        { id: 7, x: 1, y: 1, z: 1 },
        { id: 8, x: 0, y: 1, z: 1 },
      ],
      elements: [
        { id: 1, type: "solid_h8", nodes: [1, 2, 3, 4, 5, 6, 7, 8], material_id: "m1" },
      ],
    };
    const r = computeTributaryAreas(m);
    for (const t of r.by_node.values()) {
      expect(t.tributary_area_m2).toBe(0);
      expect(t.n_adjacent_elements).toBe(0);
    }
    expect(r.stats.n_nodes_isolated).toBe(8);
  });

  it("stats: media + median + min/max", () => {
    const m: FEAModel = {
      ...model0(),
      nodes: [
        { id: 1, x: 0, y: 0, z: 0 },
        { id: 2, x: 1, y: 0, z: 0 },
        { id: 3, x: 3, y: 0, z: 0 },
        { id: 4, x: 6, y: 0, z: 0 },
      ],
      elements: [
        { id: 1, type: "beam2d", nodes: [1, 2], material_id: "m1" },
        { id: 2, type: "beam2d", nodes: [2, 3], material_id: "m1" },
        { id: 3, type: "beam2d", nodes: [3, 4], material_id: "m1" },
      ],
    };
    const r = computeTributaryAreas(m);
    // 1: 0.5 (half of beam1=1)
    // 2: 0.5 + 1 = 1.5 (half of beam1 + half of beam2=2)
    // 3: 1 + 1.5 = 2.5 (half of beam2 + half of beam3=3)
    // 4: 1.5 (half of beam3)
    expect(r.stats.area_min_m2).toBeCloseTo(0.5);
    expect(r.stats.area_max_m2).toBeCloseTo(2.5);
    // mean = (0.5 + 1.5 + 2.5 + 1.5) / 4 = 1.5
    expect(r.stats.area_mean_m2).toBeCloseTo(1.5);
    // sorted: [0.5, 1.5, 1.5, 2.5] → median = (1.5 + 1.5)/2 = 1.5
    expect(r.stats.area_median_m2).toBeCloseTo(1.5);
    expect(r.stats.n_nodes_with_tributary).toBe(4);
    expect(r.stats.n_nodes_isolated).toBe(0);
  });

  it("trave 3D (beam3d): length usa coords 3D", () => {
    const m: FEAModel = {
      ...model0(), is_3d: true,
      nodes: [
        { id: 1, x: 0, y: 0, z: 0 },
        { id: 2, x: 3, y: 4, z: 12 }, // length = sqrt(9 + 16 + 144) = 13
      ],
      elements: [{ id: 1, type: "beam3d", nodes: [1, 2], material_id: "m1" }],
    };
    const r = computeTributaryAreas(m);
    expect(r.by_node.get(1)?.tributary_length_m).toBeCloseTo(6.5);
  });

  it("element con nodi non esistenti viene saltato senza crash", () => {
    const m: FEAModel = {
      ...model0(),
      nodes: [{ id: 1, x: 0, y: 0, z: 0 }],
      elements: [
        { id: 1, type: "beam2d", nodes: [1, 99], material_id: "m1" },
      ],
    };
    const r = computeTributaryAreas(m);
    // Node 99 non esiste → beamLength ritorna 0 → niente contributo
    expect(r.by_node.get(1)?.tributary_length_m).toBe(0);
  });

  it("median con numero pari di campioni", () => {
    const m: FEAModel = {
      ...model0(),
      nodes: [
        { id: 1, x: 0, y: 0, z: 0 },
        { id: 2, x: 2, y: 0, z: 0 },
      ],
      elements: [{ id: 1, type: "beam2d", nodes: [1, 2], material_id: "m1" }],
    };
    const r = computeTributaryAreas(m);
    // 2 nodi entrambi con area 1.0
    expect(r.stats.area_median_m2).toBeCloseTo(1.0);
  });
});
