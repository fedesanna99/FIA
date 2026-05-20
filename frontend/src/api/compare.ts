/**
 * API confronto modelli A vs B — FASE 18.
 * Backend: `POST /api/models/compare`.
 */
import { api } from "./client";

// ── ModelDiff: differenze strutturali ────────────────────────────────────────

export interface ModelDiff {
  nodes_added: number[];
  nodes_removed: number[];
  nodes_moved: number[]; // node ids che hanno cambiato coordinate oltre tol
  elements_added: number[];
  elements_removed: number[];
  elements_modified: number[]; // material/section/nodes/releases cambiati
  loads_added: number[];
  loads_removed: number[];
  loads_modified: number[];
  constraints_added: number[];
  constraints_removed: number[];
  constraints_modified: number[];
}

export interface NodeDelta {
  node_id: number;
  delta_ux: number;
  delta_uy: number;
  delta_uz?: number;
  delta_magnitude: number;
}

export interface ElementForceDelta {
  element_id: number;
  delta_N: number;
  delta_Vy: number;
  delta_Mz: number;
}

export interface StaticResultsDiff {
  max_delta_magnitude: number;
  max_delta_node_id: number;
  node_deltas: NodeDelta[];
  element_force_deltas: ElementForceDelta[];
}

export interface CompareResponse {
  model_a: string;
  model_b: string;
  model_diff: ModelDiff;
  static_diff?: StaticResultsDiff;
}

export interface CompareRequest {
  model_a: string;
  model_b: string;
  /** Tolleranza posizione nodi [m]. */
  pos_tol?: number;
  /** Se true, runa static su entrambi e calcola anche StaticResultsDiff. */
  include_static_diff?: boolean;
}

export const compareApi = {
  models: (req: CompareRequest) =>
    api.post<CompareResponse>("/api/models/compare", req).then(r => r.data),
};
