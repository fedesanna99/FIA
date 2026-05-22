import * as THREE from "three";
import type { Node } from "../types/model";

export const NODE_INSTANCE_COLORS = {
  normal: "#00d4ff",
  hovered: "#00ff88",
  selected: "#ffaa00",
} as const;

export function createNodeInstanceIndex(nodes: Node[]) {
  return nodes.map((node) => node.id);
}

export function nodeInstanceColor(selected: boolean, hovered: boolean, target = new THREE.Color()) {
  return target.set(selected
    ? NODE_INSTANCE_COLORS.selected
    : hovered
      ? NODE_INSTANCE_COLORS.hovered
      : NODE_INSTANCE_COLORS.normal);
}

export function composeNodeInstanceMatrix(
  node: Node,
  radius: number,
  target = new THREE.Matrix4(),
) {
  return target.compose(
    new THREE.Vector3(node.x, node.y, node.z),
    new THREE.Quaternion(),
    new THREE.Vector3(radius, radius, radius),
  );
}

