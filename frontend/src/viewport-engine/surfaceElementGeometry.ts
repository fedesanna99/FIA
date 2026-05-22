import * as THREE from "three";
import type { Element, Node } from "../types/model";

export interface SurfaceElementGeometryData {
  geometry: THREE.BufferGeometry;
  edgeGeometry: THREE.BufferGeometry;
  elementIdsByTriangle: number[];
  elementIdsByEdge: number[];
}

const SURFACE_ELEMENT_TYPES = new Set(["tri3", "shell_q4", "shell_q4_mitc"]);

export function isSurfaceElement(element: Element) {
  return SURFACE_ELEMENT_TYPES.has(element.type);
}

export function surfaceElementVertexIds(element: Element) {
  if (element.type === "tri3") return element.nodes.slice(0, 3);
  if (element.type === "shell_q4" || element.type === "shell_q4_mitc") return element.nodes.slice(0, 4);
  return [];
}

export function triangulateSurfaceElement(element: Element) {
  if (element.type === "tri3") return [[0, 1, 2]];
  if (element.type === "shell_q4" || element.type === "shell_q4_mitc") return [[0, 1, 2], [0, 2, 3]];
  return [];
}

export function surfaceElementEdgePairs(element: Element) {
  if (element.type === "tri3") return [[0, 1], [1, 2], [2, 0]];
  if (element.type === "shell_q4" || element.type === "shell_q4_mitc") {
    return [[0, 1], [1, 2], [2, 3], [3, 0]];
  }
  return [];
}

export function createSurfaceElementGeometry(
  elements: Element[],
  nodesById: Map<number, Node>,
  colorForElement: (element: Element) => string,
): SurfaceElementGeometryData {
  const positions: number[] = [];
  const colors: number[] = [];
  const edgePositions: number[] = [];
  const elementIdsByTriangle: number[] = [];
  const elementIdsByEdge: number[] = [];
  const color = new THREE.Color();

  for (const element of elements) {
    if (!isSurfaceElement(element)) continue;
    const nodeIds = surfaceElementVertexIds(element);
    const points = nodeIds.map((id) => nodesById.get(id));
    if (points.some((point) => !point)) continue;

    const vertices = points as Node[];
    color.set(colorForElement(element));

    for (const triangle of triangulateSurfaceElement(element)) {
      for (const vertexIndex of triangle) {
        const point = vertices[vertexIndex];
        positions.push(point.x, point.y, point.z);
        colors.push(color.r, color.g, color.b);
      }
      elementIdsByTriangle.push(element.id);
    }

    for (const [a, b] of surfaceElementEdgePairs(element)) {
      const p1 = vertices[a];
      const p2 = vertices[b];
      edgePositions.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
      elementIdsByEdge.push(element.id);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(colors), 3));
  geometry.computeVertexNormals();

  const edgeGeometry = new THREE.BufferGeometry();
  edgeGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(edgePositions), 3));

  return { geometry, edgeGeometry, elementIdsByTriangle, elementIdsByEdge };
}

