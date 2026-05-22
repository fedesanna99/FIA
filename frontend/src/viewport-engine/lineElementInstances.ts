import * as THREE from "three";
import type { Element, Node } from "../types/model";

export interface LineElementInstance {
  element: Element;
  p1: [number, number, number];
  p2: [number, number, number];
  radius: number;
  color: string;
}

const LINE_ELEMENT_TYPES = new Set([
  "beam2d",
  "beam3d",
  "truss2d",
  "truss3d",
  "cable2d",
  "cable3d",
]);

export function isLineElement(element: Element) {
  return LINE_ELEMENT_TYPES.has(element.type);
}

export function createLineElementInstanceIndex(instances: LineElementInstance[]) {
  return instances.map((instance) => instance.element.id);
}

export function composeLineElementInstanceMatrix(
  p1: [number, number, number],
  p2: [number, number, number],
  radius: number,
  target = new THREE.Matrix4(),
) {
  const a = new THREE.Vector3(...p1);
  const b = new THREE.Vector3(...p2);
  const direction = new THREE.Vector3().subVectors(b, a);
  const length = direction.length();
  const midpoint = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
  const rotation = new THREE.Quaternion();

  if (length > 1e-12) {
    rotation.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  }

  return target.compose(
    midpoint,
    rotation,
    new THREE.Vector3(radius, length, radius),
  );
}

export function lineElementInstanceColor(color: string, target = new THREE.Color()) {
  return target.set(color);
}

export function lineElementEndpoints(element: Element, nodesById: Map<number, Node>) {
  const n1 = nodesById.get(element.nodes[0]);
  const n2 = nodesById.get(element.nodes[1]);
  if (!n1 || !n2) return null;
  return {
    p1: [n1.x, n1.y, n1.z] as [number, number, number],
    p2: [n2.x, n2.y, n2.z] as [number, number, number],
  };
}

