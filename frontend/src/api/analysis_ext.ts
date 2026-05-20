/**
 * API estese per le analisi avanzate (M3):
 *   - Push-over (FASE 6)
 *   - Sismica time-history multi-componente (FASE 12)
 *   - Fatica Rainflow + Miner (FASE 14)
 *
 * Gli endpoint Rayleigh / FFT / Response Spectrum sono già in `client.ts`
 * (analysisApi); qui aggiungiamo solo le tre novità di M3.
 */
import { api } from "./client";

// ============================================================================
// Push-over
// ============================================================================

export interface PushoverRequest {
  lambda_step?: number;        // default 0.05
  lambda_max?: number;         // default 5.0
  max_steps?: number;          // default 200
  delta_max_for_stop?: number; // default 1.0 [m]
}

export interface PushoverStep {
  step: number;
  lambda_value: number;
  delta_control: number;
  n_hinges: number;
  converged: boolean;
}

export interface HingeEvent {
  step: number;
  lambda_value: number;
  element_id: number;
  end: "i" | "j";
  M: number;
  M_pl: number;
}

export interface PushoverResults {
  analysis_type: "pushover";
  model_id: string;
  steps: PushoverStep[];
  hinge_events: HingeEvent[];
  collapse_lambda: number | null;
  collapse_reason: string;
  solve_time_ms: number;
}

// ============================================================================
// Sismica time-history
// ============================================================================

export interface SeismicTHRequest {
  /** {"X": [[t, ag], …], "Y": …, "Z": …} — almeno una componente. */
  components: Record<"X" | "Y" | "Z", [number, number][]> | Record<string, [number, number][]>;
  dt?: number;              // default 0.01
  t_end?: number | null;    // default = max(t)
  damping_xi?: number;      // default 0.05
  omega_lo_hz?: number;     // default 0.5
  omega_hi_hz?: number;     // default 10.0
  save_every?: number;      // default 1
  store_nodes?: number[] | null;
}

// La risposta è `DynamicResults` (vedi types/results.ts) — riusiamo quella.

// ============================================================================
// Fatica Rainflow
// ============================================================================

export interface FatigueRequest {
  signal: number[];                // segnale di tensione [MPa]
  ec3_category?: number | null;    // default 80
  delta_sigma_C?: number | null;   // alternativo, [MPa]
  gamma_Mf?: number;               // default 1.0
  n_bins?: number;                 // default 10
}

export interface FatigueCycle {
  range: number;
  mean: number;
  count: number;  // 1.0 o 0.5
}

export interface FatigueHistogram {
  bins: { lo: number; hi: number }[];
  counts: number[];
}

export interface SNCurveSummary {
  delta_sigma_C: number;
  m1: number; m2: number;
  N_C: number; N_D: number; N_L: number;
}

export interface FatigueResponse {
  cycles: FatigueCycle[];
  histogram: FatigueHistogram;
  damage_D: number;
  n_cycles_total: number;
  delta_sigma_max: number;
  sn_curve: SNCurveSummary;
  gamma_Mf: number;
  n_turning_points: number;
}

// ============================================================================
// BL-1 — Statica non-lineare (Newton-Raphson) + cavi tension-only
// ============================================================================

export interface NonLinearRequest {
  n_steps?: number;        // default 10
  max_iter?: number;       // default 25
  tol?: number;            // default 1e-6
  include_kg_beam?: boolean; // default true
}

export interface NonLinearStep {
  step: number;
  load_factor: number;
  iterations: number;
  residual_norm: number;
  converged: boolean;
  max_displacement: number;
  active_cables: number;
  slack_cables: number;
}

export interface NonLinearResults {
  analysis_type: "nonlinear_static";
  model_id: string;
  converged: boolean;
  n_steps: number;
  steps: NonLinearStep[];
  final_displacements: Array<{
    node_id: number;
    ux: number; uy: number; uz: number;
    rx: number; ry: number; rz: number;
  }>;
  final_element_forces: Array<{
    element_id: number;
    N_i?: number; N_j?: number;
    Vy_i?: number; Vz_i?: number;
    My_i?: number; Mz_i?: number;
    Vy_j?: number; Vz_j?: number;
    My_j?: number; Mz_j?: number;
  }>;
  max_displacement: number;
  solve_time_ms: number;
  diagnostics: Record<string, unknown>;
}

// ============================================================================
// BL-2 — Arc-length post-buckling (Crisfield)
// ============================================================================

export interface ArcLengthRequest {
  n_steps?: number;          // default 30
  delta_s?: number | null;   // default auto
  max_iter?: number;         // default 25
  tol?: number;              // default 1e-6
  control_dof?: number | null;
  lambda_max?: number;       // default 50
  delta_max?: number;        // default 1.0
  initial_lambda?: number;   // default 0.05
}

export interface ArcLengthStep {
  step: number;
  load_factor: number;
  iterations: number;
  residual_norm: number;
  converged: boolean;
  arc_length: number;
  max_displacement: number;
  control_displacement: number;
}

export interface ArcLengthResults {
  analysis_type: "arc_length";
  model_id: string;
  converged_all: boolean;
  steps: ArcLengthStep[];
  lambda_curve: number[];
  delta_curve: number[];
  final_displacements: NonLinearResults["final_displacements"];
  solve_time_ms: number;
  diagnostics: Record<string, unknown>;
}

// ============================================================================
// Client
// ============================================================================

export const analysisExtApi = {
  /** POST /api/analysis/pushover/{model_id} */
  pushover: (modelId: string, req: PushoverRequest = {}) =>
    api.post<PushoverResults>(`/api/analysis/pushover/${modelId}`, req)
       .then((r) => r.data),

  /** POST /api/analysis/seismic_th/{model_id} — restituisce DynamicResults. */
  seismicTH: (modelId: string, req: SeismicTHRequest) =>
    api.post(`/api/analysis/seismic_th/${modelId}`, req)
       .then((r) => r.data),

  /** POST /api/analysis/fatigue — calcolo Rainflow + Miner. */
  fatigue: (req: FatigueRequest) =>
    api.post<FatigueResponse>(`/api/analysis/fatigue`, req)
       .then((r) => r.data),

  /** POST /api/analysis/nonlinear/{model_id} — Newton-Raphson + cavi (BL-1). */
  nonlinear: (modelId: string, req: NonLinearRequest = {}) =>
    api.post<NonLinearResults>(`/api/analysis/nonlinear/${modelId}`, req)
       .then((r) => r.data),

  /** POST /api/analysis/arclength/{model_id} — Crisfield path-following (BL-2). */
  arcLength: (modelId: string, req: ArcLengthRequest = {}) =>
    api.post<ArcLengthResults>(`/api/analysis/arclength/${modelId}`, req)
       .then((r) => r.data),
};
