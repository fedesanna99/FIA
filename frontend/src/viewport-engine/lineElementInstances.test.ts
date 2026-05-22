/**
 * lineElementInstances tests (v1.6.1 T4 · BUG-5).
 *
 * Copre classification (isLineElement), index creation, endpoint resolution,
 * matrix composition (incluso edge case degenerato) e color.
 */
import { describe, it, expect } from "vitest";
import * as THREE from "three";
import type { Element, Node } from "../types/model";
import {
  composeLineElementInstanceMatrix,
  createLineElementInstanceIndex,
  isLineElement,
  lineElementEndpoints,
  lineElementInstanceColor,
  type LineElementInstance,
} from "./lineElementInstances";

const mkEl = (id: number, type: Element["type"], nodes: number[]): Element => ({
  id,
  type,
  nodes,
  material_id: "S275",
});

describe("lineElementInstances", () => {
  describe("isLineElement", () => {
    it("riconosce tutti i tipi line (beam/truss/cable 2d/3d)", () => {
      expect(isLineElement(mkEl(1, "beam2d", [1, 2]))).toBe(true);
      expect(isLineElement(mkEl(2, "beam3d", [1, 2]))).toBe(true);
      expect(isLineElement(mkEl(3, "truss2d", [1, 2]))).toBe(true);
      expect(isLineElement(mkEl(4, "truss3d", [1, 2]))).toBe(true);
      expect(isLineElement(mkEl(5, "cable2d", [1, 2]))).toBe(true);
      expect(isLineElement(mkEl(6, "cable3d", [1, 2]))).toBe(true);
    });
    it("rifiuta shell e solid", () => {
      expect(isLineElement(mkEl(1, "shell_q4", [1, 2, 3, 4]))).toBe(false);
      expect(isLineElement(mkEl(2, "shell_q4_mitc", [1, 2, 3, 4]))).toBe(false);
      expect(isLineElement(mkEl(3, "tri3", [1, 2, 3]))).toBe(false);
      expect(isLineElement(mkEl(4, "solid_h8", [1, 2, 3, 4, 5, 6, 7, 8]))).toBe(false);
      expect(isLineElement(mkEl(5, "solid_t4", [1, 2, 3, 4]))).toBe(false);
    });
  });

  describe("createLineElementInstanceIndex", () => {
    it("ritorna gli id elementi nell'ordine input", () => {
      const instances: LineElementInstance[] = [
        { element: mkEl(11, "beam3d", [1, 2]), p1: [0, 0, 0], p2: [1, 0, 0], radius: 0.05, color: "#fff" },
        { element: mkEl(22, "truss3d", [3, 4]), p1: [0, 0, 0], p2: [0, 1, 0], radius: 0.05, color: "#fff" },
      ];
      expect(createLineElementInstanceIndex(instances)).toEqual([11, 22]);
    });
  });

  describe("lineElementEndpoints", () => {
    it("ritorna p1/p2 leggendo da nodesById", () => {
      const nodes = new Map<number, Node>([
        [1, { id: 1, x: 0, y: 0, z: 0 }],
        [2, { id: 2, x: 1, y: 0, z: 0 }],
      ]);
      const result = lineElementEndpoints(mkEl(99, "beam2d", [1, 2]), nodes);
      expect(result).not.toBeNull();
      expect(result!.p1).toEqual([0, 0, 0]);
      expect(result!.p2).toEqual([1, 0, 0]);
    });
    it("ritorna null se uno dei due nodi e' mancante (modello sporco)", () => {
      const nodes = new Map<number, Node>([[1, { id: 1, x: 0, y: 0, z: 0 }]]);
      expect(lineElementEndpoints(mkEl(99, "beam2d", [1, 2]), nodes)).toBeNull();
    });
  });

  describe("composeLineElementInstanceMatrix", () => {
    it("colloca il midpoint tra p1 e p2 e applica scale.y = length", () => {
      const matrix = composeLineElementInstanceMatrix([0, 0, 0], [0, 2, 0], 0.1);
      const position = new THREE.Vector3();
      const scale = new THREE.Vector3();
      const quat = new THREE.Quaternion();
      matrix.decompose(position, quat, scale);
      expect(position.y).toBeCloseTo(1);
      expect(scale.y).toBeCloseTo(2);
      expect(scale.x).toBeCloseTo(0.1);
      expect(scale.z).toBeCloseTo(0.1);
    });
    it("orienta il cilindro lungo Y dopo rotazione (asse arbitrario)", () => {
      // Cilindro mesh ha asse default Y. Per direzione +X la rotazione
      // setFromUnitVectors(Y, X) deve portare il vettore (0,1,0) → (1,0,0).
      const matrix = composeLineElementInstanceMatrix([0, 0, 0], [1, 0, 0], 0.05);
      const yLocal = new THREE.Vector3(0, 1, 0);
      const yWorld = yLocal.applyMatrix4(matrix).sub(new THREE.Vector3(0.5, 0, 0)).normalize();
      // After centering subtract midpoint (0.5,0,0), risultante deve puntare +X.
      expect(yWorld.x).toBeCloseTo(1, 4);
    });
    it("gestisce elemento degenere (length 0) senza crash", () => {
      const matrix = composeLineElementInstanceMatrix([1, 2, 3], [1, 2, 3], 0.05);
      expect(matrix.isMatrix4).toBe(true);
      const scale = new THREE.Vector3();
      matrix.decompose(new THREE.Vector3(), new THREE.Quaternion(), scale);
      expect(scale.y).toBeCloseTo(0);
    });
  });

  describe("lineElementInstanceColor", () => {
    it("converte hex string in THREE.Color valido", () => {
      const c = lineElementInstanceColor("#ff8800");
      expect(c.getHexString()).toBe("ff8800");
    });
    it("scrive nel target esterno se fornito", () => {
      const target = new THREE.Color();
      const ret = lineElementInstanceColor("#00aaff", target);
      expect(ret).toBe(target);
    });
  });
});
