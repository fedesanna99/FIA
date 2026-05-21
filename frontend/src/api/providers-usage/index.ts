/**
 * Providers Usage API client (Sprint 2 F6 + alpha.9 UI).
 *
 * Frontend client per gli endpoint backend REST:
 *   GET /api/providers/usage/summary  — aggregato per (domain, provider, endpoint)
 *   GET /api/providers/usage/timeline — bin temporali (hour/day/week)
 *   GET /api/providers/usage/health   — stato cumulativo del tracker
 */
import { api } from "../client";


export interface ProviderUsageRow {
  domain: string;
  provider: string;
  endpoint: string;
  n_calls: number;
  n_cache_hits: number;
  n_errors: number;
  cache_hit_ratio: number;
  error_ratio: number;
  avg_latency_ms: number;
  total_latency_ms: number;
  last_call_ts: number; // epoch ms
}


export interface ProviderUsageSummary {
  window_days: number;
  domain: string | null;
  provider: string | null;
  user_id: string | null;
  rows: ProviderUsageRow[];
  totals: {
    n_calls: number;
    n_cache_hits: number;
    n_errors: number;
    cache_hit_ratio: number;
    error_ratio: number;
  };
}


export interface TimelineBin {
  bin_start_ts: number; // epoch ms
  n_calls: number;
  n_cache_hits: number;
  n_errors: number;
  avg_latency_ms: number;
}


export interface ProviderUsageTimeline {
  granularity: "hour" | "day" | "week";
  window_days: number;
  domain: string | null;
  provider: string | null;
  bins: TimelineBin[];
}


export interface ProviderUsageHealth {
  enabled: boolean;
  db_path: string;
  total_records: number;
  earliest_ts: number;
  latest_ts: number;
  by_domain: Record<string, number>;
}


export async function getProvidersSummary(params: {
  domain?: string;
  provider?: string;
  endpoint?: string;
  user_id?: string;
  window_days?: number;
} = {}): Promise<ProviderUsageSummary> {
  const { data } = await api.get<ProviderUsageSummary>(
    "/api/providers/usage/summary",
    { params },
  );
  return data;
}


export async function getProvidersTimeline(params: {
  granularity?: "hour" | "day" | "week";
  domain?: string;
  provider?: string;
  user_id?: string;
  window_days?: number;
} = {}): Promise<ProviderUsageTimeline> {
  const { data } = await api.get<ProviderUsageTimeline>(
    "/api/providers/usage/timeline",
    { params },
  );
  return data;
}


export async function getProvidersHealth(): Promise<ProviderUsageHealth> {
  const { data } = await api.get<ProviderUsageHealth>(
    "/api/providers/usage/health",
  );
  return data;
}
