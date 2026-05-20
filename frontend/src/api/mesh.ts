/**
 * API mesh parametriche — FASE 11.
 * Backend: `POST /api/models/{id}/mesh/parametric`.
 *
 * Geometrie supportate:
 *   - rectangle  (b, h)
 *   - l_shape    (b, h, tf, tw)
 *   - t_shape    (b, h, tf, tw)
 *   - circle     (r, n_segments)
 *   - ring       (r_outer, r_inner, n_segments)
 */
import { api } from "./client";

export type ParametricShape = "rectangle" | "l_shape" | "t_shape" | "circle" | "ring";

export interface ParametricMeshRequest {
  shape: ParametricShape;
  /** Parametri specifici per shape (b/h/tf/tw/r/r_outer/r_inner/n_segments). */
  params: Record<string, number>;
  /** Mesh size target [m]. */
  h: number;
  /** Tipo elemento (tri3, shell_q4, ...). */
  element_type?: string;
  material_id: string;
  section_id?: string;
  /** Origine traslazione (default [0,0,0]). */
  origin?: [number, number, number];
}

export interface ParametricMeshResponse {
  added_nodes: number;
  added_elements: number;
  /** Coordinate poligonali risultanti (debug/preview). */
  polygon?: [number, number][];
}

export const parametricMeshApi = {
  generate: (modelId: string, req: ParametricMeshRequest) =>
    api.post<ParametricMeshResponse>(`/api/models/${modelId}/mesh/parametric`, req)
       .then(r => r.data),
};
