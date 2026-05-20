/**
 * API verifiche estese (M5):
 *   - EC2 bending / shear (CA)
 *   - EC5 timber (legno)
 *   - EC8 spectrum / q_factor (sismica)
 *   - NTC combinations (SLU/SLE)
 *
 * Endpoint sotto `/api/verify/{ec2|ec5|ec8|ntc}/...`.
 */
import { api } from "./client";

// ── EC2 ──────────────────────────────────────────────────────────────────────

export interface EC2BendingRequest {
  b: number; d: number; A_s: number;
  fck: number;          // [Pa]
  fyk?: number;         // [Pa], default 450e6
  M_Ed?: number;        // [Nm], opzionale per UR
}

export interface EC2BendingResponse {
  M_Rd: number;
  x: number; z: number; x_over_d: number;
  is_ductile: boolean;
  f_cd: number; f_yd: number;
  A_s: number; A_s_min: number; A_s_ok: boolean;
  M_Ed: number; UR: number;
  status: "OK" | "FAIL";
  notes: string;
}

export interface EC2ShearRequest {
  b_w: number; d: number; A_sl: number; fck: number;
  A_sw?: number; s?: number; fywk?: number;
  cot_theta?: number;
  sigma_cp?: number;
  V_Ed?: number;
}

export interface EC2ShearResponse {
  V_Rd: number; V_Rd_c: number; V_Rd_s: number; V_Rd_max: number;
  needs_stirrups: boolean;
  V_Ed: number; UR: number;
  status: "OK" | "FAIL";
  notes: string;
}

// ── EC5 ──────────────────────────────────────────────────────────────────────

export type TimberClassId = "C24" | "C30" | "GL24h" | "GL28h";
export type LoadDurationStr =
  | "permanent" | "long-term" | "medium-term"
  | "short-term" | "instantaneous";

export interface EC5TimberRequest {
  timber_class: TimberClassId;
  service_class: 1 | 2 | 3;
  load_duration: LoadDurationStr;
  sigma_t_0_Ed?: number;
  sigma_c_0_Ed?: number;
  sigma_m_Ed?: number;
  tau_v_Ed?: number;
}

export interface EC5TimberResponse {
  timber_class: TimberClassId;
  service_class: number;
  load_duration: string;
  k_mod: number;
  gamma_M: number;
  f_t_0_d: number;
  f_c_0_d: number;
  f_m_d: number;
  f_v_d: number;
  UR_t: number; UR_c: number; UR_m: number; UR_v: number;
  UR_tm: number; UR_cm: number;
  UR_max: number;
  status: "OK" | "FAIL";
}

// ── EC8 ──────────────────────────────────────────────────────────────────────

export interface EC8SpectrumRequest {
  spectrum_type: "1" | "2";
  ground: "A" | "B" | "C" | "D" | "E";
  a_g: number;             // [m/s²]
  xi_pct?: number;         // default 5
  T_min?: number;          // default 0
  T_max?: number;          // default 4
  n_points?: number;       // default 200
  q?: number | null;       // se valorizzato, calcola anche Sd
  beta?: number;
}

export interface EC8SpectrumResponse {
  T: number[];
  Se: number[];
  Sd: number[] | null;
  params: { S: number; T_B: number; T_C: number; T_D: number };
  a_g: number;
  spectrum_type: "1" | "2";
  ground: string;
  xi_pct: number;
  q: number | null;
}

export type StructuralSystemId =
  | "frame_concrete" | "wall_concrete"
  | "frame_steel" | "concentric_braced_steel" | "eccentric_braced_steel"
  | "frame_timber";
export type DuctilityClass = "DCL" | "DCM" | "DCH";

export interface EC8QRequest {
  system: StructuralSystemId;
  ductility_class: DuctilityClass;
  alpha_u_over_alpha_1?: number;
  k_w?: number;
}

export interface EC8QResponse {
  q: number;
  system: StructuralSystemId;
  ductility_class: DuctilityClass;
  alpha_u_over_alpha_1: number;
  k_w: number;
}

// ── NTC combinazioni ─────────────────────────────────────────────────────────

export type ActionType = "G1" | "G2" | "P" | "Q" | "E" | "A";
export type LoadCategory =
  | "A_residential" | "B_office" | "C_assembly" | "D_shopping"
  | "E_storage" | "F_parking_light" | "G_parking_heavy" | "H_roof"
  | "snow_low" | "snow_high" | "wind" | "temperature";
export type CombinationType =
  | "SLU_fundamental" | "SLE_characteristic" | "SLE_frequent"
  | "SLE_quasi_permanent" | "SLU_seismic" | "SLU_accidental";

export interface ActionDTO {
  name: string;
  type: ActionType;
  value: number;
  category?: LoadCategory | null;
}

export interface CombinationsRequest {
  actions: ActionDTO[];
  combination_type: CombinationType;
}

export interface CombinationResult {
  name: string;
  type: CombinationType;
  factors: Record<string, number>;
  value: number;
}

export interface CombinationsResponse {
  combination_type: CombinationType;
  n_combinations: number;
  combinations: CombinationResult[];
  envelope: { max: number; min: number };
  actions_summary: ActionDTO[];
}

// ── Client ───────────────────────────────────────────────────────────────────

export const verifyExtApi = {
  ec2Bending: (req: EC2BendingRequest) =>
    api.post<EC2BendingResponse>(`/api/verify/ec2/bending`, req).then((r) => r.data),

  ec2Shear: (req: EC2ShearRequest) =>
    api.post<EC2ShearResponse>(`/api/verify/ec2/shear`, req).then((r) => r.data),

  ec5Timber: (req: EC5TimberRequest) =>
    api.post<EC5TimberResponse>(`/api/verify/ec5/timber`, req).then((r) => r.data),

  ec8Spectrum: (req: EC8SpectrumRequest) =>
    api.post<EC8SpectrumResponse>(`/api/verify/ec8/spectrum`, req).then((r) => r.data),

  ec8QFactor: (req: EC8QRequest) =>
    api.post<EC8QResponse>(`/api/verify/ec8/q_factor`, req).then((r) => r.data),

  ntcCombinations: (req: CombinationsRequest) =>
    api.post<CombinationsResponse>(`/api/verify/ntc/combinations`, req).then((r) => r.data),
};
