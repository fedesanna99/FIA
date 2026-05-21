/**
 * tributaryAreas — helper puro che deriva "area di influenza" per ogni nodo
 * dalla topologia del modello FEA.
 *
 * Regole semplificate (v1.4.0-alpha.5):
 *   - beam2d / beam3d / truss / cable: ogni nodo prende meta' lunghezza
 *     dell'elemento adiacente. tributary_length_m += L/2.
 *   - shell_q4 / shell_q4_mitc: ogni nodo prende 1/4 dell'area Q4.
 *   - tri3: ogni nodo prende 1/3 dell'area del triangolo.
 *   - solid (tet/hex): NON contribuiscono al tributary (i carichi nodali
 *     da pressione di superficie richiedono identificazione delle facce
 *     esposte — out of scope v1.4).
 *
 * Per convertire la "linea" beam in "area" usiamo `default_facade_width`
 * (default 1 m): tributary_area_from_beams = tributary_length × width.
 *
 * Risultato: `tributary_area_m2[node]` direttamente moltiplicabile per
 * q_p_z10 (kN/m²) o s_design (kN/m²) per ottenere F_kN/nodo.
 */
import type { FEAModel, Node, Element } from "../types/model";


export interface NodeTributary {
  node_id: number;
  /** Somma 1/2 della lunghezza di tutti i beam/truss/cable adiacenti. */
  tributary_length_m: number;
  /** Somma 1/4 (Q4) o 1/3 (Tri3) dell'area di tutti gli shell adiacenti. */
  tributary_area_shell_m2: number;
  /** Area equivalente combinata: tributary_length × facade_width + shell area. */
  tributary_area_m2: number;
  /** Numero elementi adiacenti (sanity check). */
  n_adjacent_elements: number;
}


export interface TributaryStats {
  n_nodes_with_tributary: number;
  n_nodes_isolated: number; // tributary == 0 (nodo isolato senza element)
  area_min_m2: number;
  area_max_m2: number;
  area_mean_m2: number;
  area_median_m2: number;
}


export interface TributaryResult {
  /** Map nodeId -> NodeTributary. */
  by_node: Map<number, NodeTributary>;
  stats: TributaryStats;
}


const BEAM_LIKE_TYPES = new Set<string>([
  "beam2d", "beam3d", "truss2d", "truss3d", "cable2d", "cable3d",
]);

const SHELL_LIKE_TYPES = new Set<string>([
  "shell_q4", "shell_q4_mitc", "tri3",
]);


export function computeTributaryAreas(
  model: FEAModel,
  facadeWidthM = 1.0,
): TributaryResult {
  // Index nodi per accesso O(1)
  const nodeMap = new Map<number, Node>();
  for (const n of model.nodes) {
    nodeMap.set(n.id, n);
  }

  // Init tributary zero per ogni nodo
  const byNode = new Map<number, NodeTributary>();
  for (const n of model.nodes) {
    byNode.set(n.id, {
      node_id: n.id,
      tributary_length_m: 0,
      tributary_area_shell_m2: 0,
      tributary_area_m2: 0,
      n_adjacent_elements: 0,
    });
  }

  // Itera sugli elementi, aggiungi contributo a ciascun nodo
  for (const el of model.elements ?? []) {
    if (BEAM_LIKE_TYPES.has(el.type)) {
      const L = beamLength(el, nodeMap);
      if (L <= 0) continue;
      const half = L / 2.0;
      for (const nodeId of el.nodes) {
        const t = byNode.get(nodeId);
        if (t) {
          t.tributary_length_m += half;
          t.n_adjacent_elements++;
        }
      }
    } else if (SHELL_LIKE_TYPES.has(el.type)) {
      const A = shellArea(el, nodeMap);
      if (A <= 0) continue;
      // Q4 has 4 nodes (quarter each), Tri3 has 3 (third each)
      const share = A / Math.max(el.nodes.length, 1);
      for (const nodeId of el.nodes) {
        const t = byNode.get(nodeId);
        if (t) {
          t.tributary_area_shell_m2 += share;
          t.n_adjacent_elements++;
        }
      }
    }
    // solid: skip (out of scope)
  }

  // Combina length × width + shell area
  for (const t of byNode.values()) {
    t.tributary_area_m2 =
      t.tributary_length_m * facadeWidthM + t.tributary_area_shell_m2;
  }

  return {
    by_node: byNode,
    stats: computeStats(byNode),
  };
}


function beamLength(el: Element, nodeMap: Map<number, Node>): number {
  if (el.nodes.length < 2) return 0;
  const n1 = nodeMap.get(el.nodes[0]);
  const n2 = nodeMap.get(el.nodes[1]);
  if (!n1 || !n2) return 0;
  return Math.sqrt(
    (n2.x - n1.x) ** 2 +
    (n2.y - n1.y) ** 2 +
    (n2.z - n1.z) ** 2,
  );
}


function shellArea(el: Element, nodeMap: Map<number, Node>): number {
  if (el.type === "tri3") {
    if (el.nodes.length < 3) return 0;
    const n1 = nodeMap.get(el.nodes[0]);
    const n2 = nodeMap.get(el.nodes[1]);
    const n3 = nodeMap.get(el.nodes[2]);
    if (!n1 || !n2 || !n3) return 0;
    return triangleArea(n1, n2, n3);
  }
  // Q4: split in 2 triangoli (diagonale 1-3)
  if (el.nodes.length < 4) return 0;
  const n1 = nodeMap.get(el.nodes[0]);
  const n2 = nodeMap.get(el.nodes[1]);
  const n3 = nodeMap.get(el.nodes[2]);
  const n4 = nodeMap.get(el.nodes[3]);
  if (!n1 || !n2 || !n3 || !n4) return 0;
  return triangleArea(n1, n2, n3) + triangleArea(n1, n3, n4);
}


function triangleArea(p1: Node, p2: Node, p3: Node): number {
  // Area = 0.5 |AB × AC|
  const abx = p2.x - p1.x;
  const aby = p2.y - p1.y;
  const abz = p2.z - p1.z;
  const acx = p3.x - p1.x;
  const acy = p3.y - p1.y;
  const acz = p3.z - p1.z;
  const cx = aby * acz - abz * acy;
  const cy = abz * acx - abx * acz;
  const cz = abx * acy - aby * acx;
  return 0.5 * Math.sqrt(cx * cx + cy * cy + cz * cz);
}


function computeStats(byNode: Map<number, NodeTributary>): TributaryStats {
  const areas: number[] = [];
  let isolated = 0;
  for (const t of byNode.values()) {
    if (t.tributary_area_m2 > 0) {
      areas.push(t.tributary_area_m2);
    } else {
      isolated++;
    }
  }
  if (areas.length === 0) {
    return {
      n_nodes_with_tributary: 0,
      n_nodes_isolated: isolated,
      area_min_m2: 0, area_max_m2: 0, area_mean_m2: 0, area_median_m2: 0,
    };
  }
  areas.sort((a, b) => a - b);
  const sum = areas.reduce((s, x) => s + x, 0);
  const mid = Math.floor(areas.length / 2);
  const median =
    areas.length % 2 === 0
      ? (areas[mid - 1] + areas[mid]) / 2
      : areas[mid];
  return {
    n_nodes_with_tributary: areas.length,
    n_nodes_isolated: isolated,
    area_min_m2: areas[0],
    area_max_m2: areas[areas.length - 1],
    area_mean_m2: sum / areas.length,
    area_median_m2: median,
  };
}
