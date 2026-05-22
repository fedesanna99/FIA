import * as THREE from "three";
import type { Element, Node } from "../types/model";

export interface SolidElementGeometryData {
  geometry: THREE.BufferGeometry;
  edgeGeometry: THREE.BufferGeometry;
  elementIdsByTriangle: number[];
  elementIdsByEdge: number[];
}

const SOLID_ELEMENT_TYPES = new Set(["solid_h8", "solid_t4", "solid_t10"]);

export function isSolidElement(element: Element) {
  return SOLID_ELEMENT_TYPES.has(element.type);
}

export function solidElementVertexIds(element: Element) {
  if (element.type === "solid_h8") return element.nodes.slice(0, 8);
  if (element.type === "solid_t4" || element.type === "solid_t10") return element.nodes.slice(0, 4);
  return [];
}

export function solidElementFaces(element: Element) {
  if (element.type === "solid_h8") {
    return [
      [0, 1, 2, 3], [4, 5, 6, 7],
      [0, 1, 5, 4], [2, 3, 7, 6],
      [1, 2, 6, 5], [0, 3, 7, 4],
    ];
  }
  if (element.type === "solid_t4" || element.type === "solid_t10") {
    return [[0, 1, 2], [0, 3, 1], [0, 2, 3], [1, 3, 2]];
  }
  return [];
}

export function triangulateSolidFace(face: number[]) {
  if (face.length === 3) return [[face[0], face[1], face[2]]];
  if (face.length === 4) return [[face[0], face[1], face[2]], [face[0], face[2], face[3]]];
  return [];
}

export function solidElementEdgePairs(element: Element) {
  if (element.type === "solid_h8") {
    return [
      [0, 1], [1, 2], [2, 3], [3, 0],
      [4, 5], [5, 6], [6, 7], [7, 4],
      [0, 4], [1, 5], [2, 6], [3, 7],
    ];
  }
  if (element.type === "solid_t4" || element.type === "solid_t10") {
    return [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]];
  }
  return [];
}

export function createSolidElementGeometry(
  elements: Element[],
  nodesById: Map<number, Node>,
  colorForElement: (element: Element) => string,
): SolidElementGeometryData {
  const positions: number[] = [];
  const colors: number[] = [];
  const edgePositions: number[] = [];
  const elementIdsByTriangle: number[] = [];
  const elementIdsByEdge: number[] = [];
  const color = new THREE.Color();

  for (const element of elements) {
    if (!isSolidElement(element)) continue;
    const nodeIds = solidElementVertexIds(element);
    const points = nodeIds.map((id) => nodesById.get(id));
    if (points.some((point) => !point)) continue;

    const vertices = points as Node[];
    color.set(colorForElement(element));

    for (const face of solidElementFaces(element)) {
      for (const triangle of triangulateSolidFace(face)) {
        for (const vertexIndex of triangle) {
          const point = vertices[vertexIndex];
          positions.push(point.x, point.y, point.z);
          colors.push(color.r, color.g, color.b);
        }
        elementIdsByTriangle.push(element.id);
      }
    }

    for (const [a, b] of solidElementEdgePairs(element)) {
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

