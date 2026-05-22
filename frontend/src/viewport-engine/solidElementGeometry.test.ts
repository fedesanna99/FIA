/**
 * solidElementGeometry tests (v1.6.1 T4 · BUG-5).
 *
 * Copre classification (isSolidElement), faces/triangulation, edge pairs,
 * e build di una BufferGeometry consistente per H8/T4.
 */
import { describe, it, expect } from "vitest";
import type { Element, Node } from "../types/model";
import {
  createSolidElementGeometry,
  isSolidElement,
  solidElementEdgePairs,
  solidElementFaces,
  solidElementVertexIds,
  triangulateSolidFace,
} from "./solidElementGeometry";

const mkEl = (id: number, type: Element["type"], nodes: number[]): Element => ({
  id,
  type,
  nodes,
  material_id: "C30/37",
});

describe("solidElementGeometry", () => {
  describe("isSolidElement", () => {
    it("riconosce solid_h8, solid_t4, solid_t10", () => {
      expect(isSolidElement(mkEl(1, "solid_h8", [1, 2, 3, 4, 5, 6, 7, 8]))).toBe(true);
      expect(isSolidElement(mkEl(2, "solid_t4", [1, 2, 3, 4]))).toBe(true);
      expect(isSolidElement(mkEl(3, "solid_t10", [1, 2, 3, 4]))).toBe(true);
    });
    it("rifiuta line e surface", () => {
      expect(isSolidElement(mkEl(1, "beam3d", [1, 2]))).toBe(false);
      expect(isSolidElement(mkEl(2, "shell_q4", [1, 2, 3, 4]))).toBe(false);
      expect(isSolidElement(mkEl(3, "tri3", [1, 2, 3]))).toBe(false);
    });
  });

  describe("solidElementVertexIds", () => {
    it("solid_h8 → 8 vertici", () => {
      expect(solidElementVertexIds(mkEl(1, "solid_h8", [1, 2, 3, 4, 5, 6, 7, 8])))
        .toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    });
    it("solid_t4 → 4 vertici", () => {
      expect(solidElementVertexIds(mkEl(1, "solid_t4", [1, 2, 3, 4]))).toEqual([1, 2, 3, 4]);
    });
    it("solid_t10 → primi 4 vertici (corner-only per rendering)", () => {
      expect(solidElementVertexIds(mkEl(1, "solid_t10", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])))
        .toEqual([1, 2, 3, 4]);
    });
  });

  describe("solidElementFaces", () => {
    it("solid_h8 → 6 facce quadrilatere", () => {
      const faces = solidElementFaces(mkEl(1, "solid_h8", [1, 2, 3, 4, 5, 6, 7, 8]));
      expect(faces).toHaveLength(6);
      faces.forEach((f) => expect(f).toHaveLength(4));
    });
    it("solid_t4 → 4 facce triangolari", () => {
      const faces = solidElementFaces(mkEl(1, "solid_t4", [1, 2, 3, 4]));
      expect(faces).toHaveLength(4);
      faces.forEach((f) => expect(f).toHaveLength(3));
    });
  });

  describe("triangulateSolidFace", () => {
    it("3 vertici → 1 triangolo", () => {
      expect(triangulateSolidFace([0, 1, 2])).toEqual([[0, 1, 2]]);
    });
    it("4 vertici → 2 triangoli (fan)", () => {
      expect(triangulateSolidFace([0, 1, 2, 3])).toEqual([
        [0, 1, 2],
        [0, 2, 3],
      ]);
    });
    it("forma non supportata → array vuoto", () => {
      expect(triangulateSolidFace([0])).toEqual([]);
      expect(triangulateSolidFace([0, 1])).toEqual([]);
    });
  });

  describe("solidElementEdgePairs", () => {
    it("solid_h8 → 12 edge (cubo)", () => {
      expect(solidElementEdgePairs(mkEl(1, "solid_h8", [1, 2, 3, 4, 5, 6, 7, 8]))).toHaveLength(12);
    });
    it("solid_t4 → 6 edge (tetraedro)", () => {
      expect(solidElementEdgePairs(mkEl(1, "solid_t4", [1, 2, 3, 4]))).toHaveLength(6);
    });
  });

  describe("createSolidElementGeometry", () => {
    it("genera 12 triangoli per ogni solid_h8 (6 facce × 2 tri)", () => {
      const nodes = new Map<number, Node>(
        [
          [1, 0, 0, 0],
          [2, 1, 0, 0],
          [3, 1, 1, 0],
          [4, 0, 1, 0],
          [5, 0, 0, 1],
          [6, 1, 0, 1],
          [7, 1, 1, 1],
          [8, 0, 1, 1],
        ].map(([id, x, y, z]) => [id, { id, x, y, z } as Node]),
      );
      const data = createSolidElementGeometry(
        [mkEl(1, "solid_h8", [1, 2, 3, 4, 5, 6, 7, 8])],
        nodes,
        () => "#444",
      );
      expect(data.elementIdsByTriangle).toHaveLength(12);
      expect(data.elementIdsByEdge).toHaveLength(12);
    });
    it("genera 4 triangoli per ogni solid_t4 (tetraedro)", () => {
      const nodes = new Map<number, Node>([
        [1, { id: 1, x: 0, y: 0, z: 0 }],
        [2, { id: 2, x: 1, y: 0, z: 0 }],
        [3, { id: 3, x: 0, y: 1, z: 0 }],
        [4, { id: 4, x: 0, y: 0, z: 1 }],
      ]);
      const data = createSolidElementGeometry(
        [mkEl(1, "solid_t4", [1, 2, 3, 4])],
        nodes,
        () => "#444",
      );
      expect(data.elementIdsByTriangle).toHaveLength(4);
      expect(data.elementIdsByEdge).toHaveLength(6);
    });
    it("ignora elementi non-solid", () => {
      const data = createSolidElementGeometry(
        [mkEl(1, "shell_q4", [1, 2, 3, 4])],
        new Map(),
        () => "#fff",
      );
      expect(data.elementIdsByTriangle).toHaveLength(0);
    });
  });
});
