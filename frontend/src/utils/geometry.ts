import type { FEAModel, Node } from "../types/model";

/**
 * Hash compatto del modello (cambia se nodi/elementi/carichi/vincoli sono modificati).
 * Usato per rilevare se i risultati salvati sono ancora coerenti col modello corrente.
 */
export function modelHash(model: FEAModel | null): string {
  if (!model) return "";
  const parts = [
    model.nodes.length, model.elements.length,
    model.loads.length, model.constraints.length,
    model.nodes.reduce((s, n) => s + n.x + n.y + n.z, 0).toFixed(6),
    model.elements.map((e) => `${e.id}:${e.type}:${e.nodes.join("_")}:${e.material_id}:${e.section_id ?? ""}`).join("|"),
    model.loads.map((l) => `${l.id}:${l.type}:${l.target_id}:${l.fx ?? 0}:${l.fy ?? 0}:${l.fz ?? 0}:${l.qy ?? 0}:${l.mass ?? 0}`).join("|"),
    model.constraints.map((c) => `${c.id}:${c.type}:${c.node_id}`).join("|"),
  ].join("#");
  let h = 0;
  for (let i = 0; i < parts.length; i++) h = ((h << 5) - h + parts.charCodeAt(i)) | 0;
  return h.toString(16);
}

export function nodeById(model: FEAModel | null): Map<number, Node> {
  const m = new Map<number, Node>();
  model?.nodes.forEach((n) => m.set(n.id, n));
  return m;
}

export function modelBounds(model: FEAModel | null) {
  if (!model || model.nodes.length === 0) {
    return { min: [-1, -1, -1] as [number, number, number],
             max: [1, 1, 1] as [number, number, number],
             center: [0, 0, 0] as [number, number, number],
             size: 2 };
  }
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (const n of model.nodes) {
    if (n.x < minX) minX = n.x; if (n.x > maxX) maxX = n.x;
    if (n.y < minY) minY = n.y; if (n.y > maxY) maxY = n.y;
    if (n.z < minZ) minZ = n.z; if (n.z > maxZ) maxZ = n.z;
  }
  const center: [number, number, number] = [
    (minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2,
  ];
  const size = Math.max(maxX - minX, maxY - minY, maxZ - minZ, 1);
  return { min: [minX, minY, minZ] as [number, number, number],
           max: [maxX, maxY, maxZ] as [number, number, number],
           center, size };
}
