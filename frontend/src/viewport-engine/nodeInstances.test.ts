/**
 * nodeInstances tests (v1.6.1 T4 · BUG-5).
 *
 * Copre createNodeInstanceIndex, nodeInstanceColor, composeNodeInstanceMatrix.
 */
import { describe, it, expect } from "vitest";
import * as THREE from "three";
import type { Node } from "../types/model";
import {
  composeNodeInstanceMatrix,
  createNodeInstanceIndex,
  nodeInstanceColor,
  NODE_INSTANCE_COLORS,
} from "./nodeInstances";

const mkNode = (id: number, x = 0, y = 0, z = 0): Node => ({ id, x, y, z });

describe("nodeInstances", () => {
  describe("createNodeInstanceIndex", () => {
    it("ritorna gli id nodi nell'ordine input", () => {
      expect(createNodeInstanceIndex([mkNode(1), mkNode(5), mkNode(10)])).toEqual([1, 5, 10]);
    });
    it("gestisce array vuoto", () => {
      expect(createNodeInstanceIndex([])).toEqual([]);
    });
    it("preserva ordine non-sequenziale (es. dopo delete intermedio)", () => {
      expect(createNodeInstanceIndex([mkNode(7), mkNode(2), mkNode(11)])).toEqual([7, 2, 11]);
    });
  });

  describe("nodeInstanceColor", () => {
    it("normale = colore default", () => {
      const c = nodeInstanceColor(false, false);
      expect(c.getHexString()).toBe(new THREE.Color(NODE_INSTANCE_COLORS.normal).getHexString());
    });
    it("hovered se non selected", () => {
      const c = nodeInstanceColor(false, true);
      expect(c.getHexString()).toBe(new THREE.Color(NODE_INSTANCE_COLORS.hovered).getHexString());
    });
    it("selected ha priorita' su hovered (selected XOR hovered → selected)", () => {
      const c = nodeInstanceColor(true, true);
      expect(c.getHexString()).toBe(new THREE.Color(NODE_INSTANCE_COLORS.selected).getHexString());
    });
    it("scrive nel target color esterno se fornito", () => {
      const target = new THREE.Color();
      const ret = nodeInstanceColor(true, false, target);
      expect(ret).toBe(target);
      expect(target.getHexString()).toBe(new THREE.Color(NODE_INSTANCE_COLORS.selected).getHexString());
    });
  });

  describe("composeNodeInstanceMatrix", () => {
    it("la matrice colloca il nodo nelle coordinate corrette", () => {
      const matrix = composeNodeInstanceMatrix(mkNode(1, 5, 10, 15), 0.1);
      const position = new THREE.Vector3();
      const scale = new THREE.Vector3();
      const quat = new THREE.Quaternion();
      matrix.decompose(position, quat, scale);
      expect(position.x).toBeCloseTo(5);
      expect(position.y).toBeCloseTo(10);
      expect(position.z).toBeCloseTo(15);
      expect(scale.x).toBeCloseTo(0.1);
      expect(scale.y).toBeCloseTo(0.1);
      expect(scale.z).toBeCloseTo(0.1);
    });
    it("usa il target Matrix4 esterno se fornito", () => {
      const target = new THREE.Matrix4();
      const ret = composeNodeInstanceMatrix(mkNode(1, 0, 0, 0), 0.05, target);
      expect(ret).toBe(target);
    });
  });
});
