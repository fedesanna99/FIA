/**
 * Billing API — cost estimate + quota management (Sprint 1 — A1/A3/A4).
 */
import { api } from "../client";

export type SolverKind =
  | "linear"
  | "modal"
  | "buckling"
  | "pushover"
  | "response_spectrum"
  | "dynamic_th"
  | "seismic_th"
  | "nonlinear"
  | "arclength"
  | "winkler";

export type Tier = "free" | "starter" | "pro" | "enterprise";

export interface CostEstimate {
  solver: SolverKind;
  n_dof: number;
  cpu_min: number;
  ram_mb: number;
  eta_s: number;
  credits: number;
  explanation: string;
}

export interface EstimateRequest {
  model_id: string;
  solver: SolverKind;
  params?: Record<string, unknown>;
}

export interface UserQuota {
  user_id: string;
  tier: Tier;
  month: string;
  used_credits: number;
  cap_credits: number;
  bonus_credits: number;
}

export async function estimateCost(req: EstimateRequest): Promise<CostEstimate> {
  const { data } = await api.post<CostEstimate>("/api/billing/estimate", req);
  return data;
}

export async function getQuota(userId: string): Promise<UserQuota> {
  const { data } = await api.get<UserQuota>(`/api/quotas/${encodeURIComponent(userId)}`);
  return data;
}

export async function setQuotaTier(userId: string, tier: Tier): Promise<UserQuota> {
  const { data } = await api.post<UserQuota>(
    `/api/quotas/${encodeURIComponent(userId)}/tier`,
    { tier },
  );
  return data;
}
