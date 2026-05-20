/**
 * Store per misure 3D nel viewport: distanze tra coppie di nodi, angoli
 * tra 3 nodi, somma di archi (multi-segmento).
 *
 * Tipi di misura:
 *   - distance : 2 nodi → distanza euclidea
 *   - angle    : 3 nodi (vertex al centro) → angolo in gradi
 *   - chain    : N nodi → lunghezza totale del percorso
 *
 * I valori vengono ricalcolati al volo da nodi del modello.
 */
import { create } from "zustand";
import type { Node } from "../types/model";

export type MeasurementKind = "distance" | "angle" | "chain";

export interface Measurement {
  id: number;
  kind: MeasurementKind;
  nodeIds: number[];
  label?: string;
  createdAt: number;
}

interface MeasurementsState {
  measurements: Measurement[];
  add: (kind: MeasurementKind, nodeIds: number[], label?: string) => Measurement;
  remove: (id: number) => void;
  clear: () => void;
}

let _nextId = 1;

export const useMeasurementsStore = create<MeasurementsState>((set) => ({
  measurements: [],

  add: (kind, nodeIds, label) => {
    if (kind === "distance" && nodeIds.length !== 2)
      throw new Error(`Misura 'distance' richiede 2 nodi, ricevuti ${nodeIds.length}`);
    if (kind === "angle" && nodeIds.length !== 3)
      throw new Error(`Misura 'angle' richiede 3 nodi (vertex al centro), ricevuti ${nodeIds.length}`);
    if (kind === "chain" && nodeIds.length < 2)
      throw new Error(`Misura 'chain' richiede almeno 2 nodi, ricevuti ${nodeIds.length}`);

    const m: Measurement = {
      id: _nextId++,
      kind,
      nodeIds: [...nodeIds],
      label,
      createdAt: Date.now(),
    };
    set((s) => ({ measurements: [...s.measurements, m] }));
    return m;
  },

  remove: (id) =>
    set((s) => ({ measurements: s.measurements.filter((m) => m.id !== id) })),

  clear: () => {
    set({ measurements: [] });
    _nextId = 1;
  },
}));

// ─────────────────── utility geometriche ───────────────────

export function distance3D(n1: Node, n2: Node): number {
  const dx = n2.x - n1.x;
  const dy = n2.y - n1.y;
  const dz = (n2.z ?? 0) - (n1.z ?? 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Angolo (in gradi) tra i vettori (B-A) e (C-A), con A vertex.
 */
export function angleDeg(a: Node, b: Node, c: Node): number {
  const v1 = [b.x - a.x, b.y - a.y, (b.z ?? 0) - (a.z ?? 0)];
  const v2 = [c.x - a.x, c.y - a.y, (c.z ?? 0) - (a.z ?? 0)];
  const dot = v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2];
  const n1 = Math.sqrt(v1[0] ** 2 + v1[1] ** 2 + v1[2] ** 2);
  const n2 = Math.sqrt(v2[0] ** 2 + v2[1] ** 2 + v2[2] ** 2);
  if (n1 === 0 || n2 === 0) return 0;
  const cosTheta = Math.max(-1, Math.min(1, dot / (n1 * n2)));
  return (Math.acos(cosTheta) * 180) / Math.PI;
}

/**
 * Lunghezza totale di un percorso composto da nodi consecutivi.
 */
export function chainLength(nodes: Node[]): number {
  let total = 0;
  for (let i = 1; i < nodes.length; i++) {
    total += distance3D(nodes[i - 1], nodes[i]);
  }
  return total;
}

/**
 * Calcola il valore numerico di una misura dato il modello.
 * Restituisce NaN se uno dei nodi non esiste.
 */
export function evaluateMeasurement(
  m: Measurement,
  nodesById: Map<number, Node>,
): number {
  const ns = m.nodeIds.map((id) => nodesById.get(id));
  if (ns.some((n) => !n)) return NaN;
  const nn = ns as Node[];
  switch (m.kind) {
    case "distance":
      return distance3D(nn[0], nn[1]);
    case "angle":
      return angleDeg(nn[0], nn[1], nn[2]);
    case "chain":
      return chainLength(nn);
  }
}
