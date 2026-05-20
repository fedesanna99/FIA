/**
 * API postprocess avanzato (M4):
 *   - Drift (FASE 12)
 *   - Mode superposition (FASE 16)
 *   - Convergence (FASE 19)
 *   - ZZ Error (FASE 19)
 *   - Iso-lines tri3 (FASE 16)
 */
import { api } from "./client";

// ── Drift ────────────────────────────────────────────────────────────────────

export interface DriftRequest {
  levels: number[];                  // node_id ordinati dal basso
  axis?: "ux" | "uy" | "uz";         // default ux
  h_storey?: number | null;          // [m]
  analysis_type?: "dynamic" | "seismic_th";
}

export interface DriftResponse {
  axis: string;
  levels: number[];
  history: Record<number, number[]>;       // {storey_idx: [drift(t0), ...]}
  max_drift_per_storey: Record<number, number>;
  drift_ratios: Record<number, number> | null;
  h_storey: number | null;
}

// ── Mode superposition ───────────────────────────────────────────────────────

export interface ModeSuperRequest {
  weights: number[];
  amplitude?: number;
  normalize?: boolean;
}

export interface ModeSuperResponse {
  deformed: { node_id: number; ux: number; uy: number; uz: number }[];
  n_modes_used: number;
  weights_used: number[];
  amplitude: number;
  normalize: boolean;
}

// ── Convergence ──────────────────────────────────────────────────────────────

export interface ConvergenceRequest {
  values: number[];     // q(h), q(h/r), ...
  ratio?: number;       // default 2
  fs?: number;          // default 1.25
}

export interface ConvergenceResponse {
  values: number[];
  apparent_order: number;
  extrapolated_value: number;
  gci_fine: number;
  is_monotonic: boolean;
}

// ── ZZ Error ─────────────────────────────────────────────────────────────────

export interface ZZRequest {
  element_values: Record<number, number>;  // {element_id: σ_h}
  refine_fraction?: number;                // default 0.2
}

export interface ZZResponse {
  element_errors: Record<number, number>;
  global_error: number;
  relative_error: number;
  refinement_candidates: number[];
  n_elements: number;
}

// ── Iso-lines ────────────────────────────────────────────────────────────────

export interface IsolineRequest {
  field: Record<number, number>;
  levels?: number[];
  n_auto_levels?: number;
}

export interface IsoSegmentJSON {
  p1: [number, number, number];
  p2: [number, number, number];
}

export interface IsolineResponse {
  levels: number[];
  segments_per_level: Record<string, IsoSegmentJSON[]>;
  n_triangles: number;
}

// ── Iso-surfaces 3D (BL-7) ───────────────────────────────────────────────────

export interface IsosurfaceRequest {
  field: Record<number, number>;
  levels?: number[];
  n_auto_levels?: number;
}

export interface IsoTriangleJSON {
  p1: [number, number, number];
  p2: [number, number, number];
  p3: [number, number, number];
}

export interface IsosurfaceResponse {
  levels: number[];
  triangles_per_level: Record<string, IsoTriangleJSON[]>;
  area_per_level: Record<string, number>;
  n_tets: number;
  n_hexes: number;
}

// ── Client ───────────────────────────────────────────────────────────────────

export const postprocessApi = {
  drift: (modelId: string, req: DriftRequest) =>
    api.post<DriftResponse>(`/api/postprocess/${modelId}/drift`, req).then((r) => r.data),

  modeSuperposition: (modelId: string, req: ModeSuperRequest) =>
    api.post<ModeSuperResponse>(`/api/postprocess/${modelId}/mode_superposition`, req).then((r) => r.data),

  convergence: (req: ConvergenceRequest) =>
    api.post<ConvergenceResponse>(`/api/postprocess/convergence`, req).then((r) => r.data),

  zzError: (modelId: string, req: ZZRequest) =>
    api.post<ZZResponse>(`/api/postprocess/${modelId}/zz_error`, req).then((r) => r.data),

  isolines: (modelId: string, req: IsolineRequest) =>
    api.post<IsolineResponse>(`/api/postprocess/${modelId}/isolines`, req).then((r) => r.data),

  isosurfaces: (modelId: string, req: IsosurfaceRequest) =>
    api.post<IsosurfaceResponse>(`/api/postprocess/${modelId}/isosurfaces`, req).then((r) => r.data),
};
