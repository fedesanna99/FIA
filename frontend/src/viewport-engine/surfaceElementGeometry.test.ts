/**
 * surfaceElementGeometry tests (v1.6.1 T4 · BUG-5).
 *
 * Copre classification (isSurfaceElement), vertex IDs, triangulation,
 * edge pairs, e build di una BufferGeometry consistente.
 */
import { describe, it, expect } from "vitest";
import type { Element, Node } from "../types/model";
import {
  createSurfaceElementGeometry,
  isSurfaceElement,
  surfaceElementEdgePairs,
  surfaceElementVertexIds,
  triangulateSurfaceElement,
} from "./surfaceElementGeometry";

const mkEl = (id: number, type: Element["type"], nodes: number[]): Element => ({
  id,
  type,
  nodes,
  material_id: "C30/37",
});

describe("surfaceElementGeometry", () => {
  describe("isSurfaceElement", () => {
    it("riconosce tri3, shell_q4, shell_q4_mitc", () => {
      expect(isSurfaceElement(mkEl(1, "tri3", [1, 2, 3]))).toBe(true);
      expect(isSurfaceElement(mkEl(2, "shell_q4", [1, 2, 3, 4]))).toBe(true);
      expect(isSurfaceElement(mkEl(3, "shell_q4_mitc", [1, 2, 3, 4]))).toBe(true);
    });
    it("rifiuta beam, truss e solid", () => {
      expect(isSurfaceElement(mkEl(1, "beam3d", [1, 2]))).toBe(false);
      expect(isSurfaceElement(mkEl(2, "truss3d", [1, 2]))).toBe(false);
      expect(isSurfaceElement(mkEl(3, "solid_h8", [1, 2, 3, 4, 5, 6, 7, 8]))).toBe(false);
    });
  });

  describe("surfaceElementVertexIds", () => {
    it("tri3 → 3 vertici", () => {
      expect(surfaceElementVertexIds(mkEl(1, "tri3", [10, 20, 30, 99]))).toEqual([10, 20, 30]);
    });
    it("shell_q4 → 4 vertici", () => {
      expect(surfaceElementVertexIds(mkEl(1, "shell_q4", [1, 2, 3, 4]))).toEqual([1, 2, 3, 4]);
    });
    it("shell_q4_mitc → 4 vertici", () => {
      expect(surfaceElementVertexIds(mkEl(1, "shell_q4_mitc", [1, 2, 3, 4]))).toEqual([1, 2, 3, 4]);
    });
    it("tipo non-surface → array vuoto", () => {
      expect(surfaceElementVertexIds(mkEl(1, "beam2d", [1, 2]))).toEqual([]);
    });
  });

  describe("triangulateSurfaceElement", () => {
    it("tri3 → 1 triangolo", () => {
      expect(triangulateSurfaceElement(mkEl(1, "tri3", [1, 2, 3]))).toEqual([[0, 1, 2]]);
    });
    it("shell_q4 → 2 triangoli (fan 0-1-2 + 0-2-3)", () => {
      expect(triangulateSurfaceElement(mkEl(1, "shell_q4", [1, 2, 3, 4]))).toEqual([
        [0, 1, 2],
        [0, 2, 3],
      ]);
    });
  });

  describe("surfaceElementEdgePairs", () => {
    it("tri3 → 3 edge (chiusura triangolo)", () => {
      expect(surfaceElementEdgePairs(mkEl(1, "tri3", [1, 2, 3]))).toEqual([
        [0, 1],
        [1, 2],
        [2, 0],
      ]);
    });
    it("shell_q4 → 4 edge (chiusura quadrilatero)", () => {
      expect(surfaceElementEdgePairs(mkEl(1, "shell_q4", [1, 2, 3, 4]))).toEqual([
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 0],
      ]);
    });
  });

  describe("createSurfaceElementGeometry", () => {
    it("costruisce BufferGeometry con triangoli per ogni shell_q4", () => {
      const nodes = new Map<number, Node>([
        [1, { id: 1, x: 0, y: 0, z: 0 }],
        [2, { id: 2, x: 1, y: 0, z: 0 }],
        [3, { id: 3, x: 1, y: 1, z: 0 }],
        [4, { id: 4, x: 0, y: 1, z: 0 }],
      ]);
      const data = createSurfaceElementGeometry(
        [mkEl(1, "shell_q4", [1, 2, 3, 4])],
        nodes,
        () => "#888",
      );
      expect(data.elementIdsByTriangle).toEqual([1, 1]);
      expect(data.elementIdsByEdge).toEqual([1, 1, 1, 1]);
      // 2 triangoli × 3 vertici × 3 coord = 18 floats
      const pos = data.geometry.getAttribute("position");
      expect(pos.count).toBe(6);
    });
    it("skip silenziosamente elementi con nodi mancanti", () => {
      const nodes = new Map<number, Node>([[1, { id: 1, x: 0, y: 0, z: 0 }]]);
      const data = createSurfaceElementGeometry(
        [mkEl(1, "tri3", [1, 999, 3])],
        nodes,
        () => "#fff",
      );
      expect(data.elementIdsByTriangle).toEqual([]);
    });
    it("ignora elementi non-surface", () => {
      const nodes = new Map<number, Node>([
        [1, { id: 1, x: 0, y: 0, z: 0 }],
        [2, { id: 2, x: 1, y: 0, z: 0 }],
      ]);
      const data = createSurfaceElementGeometry(
        [mkEl(1, "beam2d", [1, 2])],
        nodes,
        () => "#fff",
      );
      expect(data.elementIdsByTriangle).toEqual([]);
      expect(data.elementIdsByEdge).toEqual([]);
    });
  });
});
