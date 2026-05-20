/**
 * Usage API — aggregato consumo crediti per utente (Sprint 1 follow-up).
 */
import { api } from "../client";
import type { SolverKind } from "../billing";

export interface UsageSummary {
  user_id: string;
  window_days: number;
  n_jobs: number;
  total_credits: number;
  jobs_by_solver: Partial<Record<SolverKind, number>>;
  jobs_by_status: Record<string, number>;
  last_job_at: number | null;
}

export async function getUsageSummary(userId: string, windowDays = 30): Promise<UsageSummary> {
  const { data } = await api.get<UsageSummary>(
    `/api/usage/${encodeURIComponent(userId)}/summary`,
    { params: { window_days: windowDays } },
  );
  return data;
}


// --- Quota admin (estensione api/billing) ---
export async function resetQuota(userId: string) {
  const { data } = await api.post(`/api/quotas/${encodeURIComponent(userId)}/reset`);
  return data;
}

export async function addQuotaBonus(userId: string, credits: number) {
  const { data } = await api.post(
    `/api/quotas/${encodeURIComponent(userId)}/bonus`,
    { credits },
  );
  return data;
}
