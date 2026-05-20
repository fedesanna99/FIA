/**
 * Jobs API — coda persistente FEA Pro (Sprint 1 — A5).
 */
import { api } from "../client";
import type { CostEstimate, SolverKind } from "../billing";

export type JobStatus = "queued" | "running" | "done" | "failed" | "cancelled";
export type JobPriority = "standard" | "fast" | "urgent";

export interface Job {
  job_id: string;
  user_id: string;
  solver: SolverKind;
  model_id: string;
  params: Record<string, unknown>;
  estimate: CostEstimate;
  priority: JobPriority;
  status: JobStatus;
  created_at: number;
  started_at: number | null;
  ended_at: number | null;
  attempts: number;
  max_retries: number;
  error: string | null;
  result_ref: string | null;
}

export interface JobSubmitRequest {
  model_id: string;
  solver: SolverKind;
  params?: Record<string, unknown>;
  priority?: JobPriority;
  user_id?: string;
  max_retries?: number;
}

export async function submitJob(req: JobSubmitRequest): Promise<Job> {
  const { data } = await api.post<Job>("/api/jobs", req);
  return data;
}

export async function getJob(jobId: string): Promise<Job> {
  const { data } = await api.get<Job>(`/api/jobs/${encodeURIComponent(jobId)}`);
  return data;
}

export async function listJobs(opts: {
  user_id?: string;
  status?: JobStatus;
  limit?: number;
} = {}): Promise<Job[]> {
  const { data } = await api.get<Job[]>("/api/jobs", { params: opts });
  return data;
}

export async function cancelJob(jobId: string): Promise<Job> {
  const { data } = await api.delete<Job>(`/api/jobs/${encodeURIComponent(jobId)}`);
  return data;
}


export interface JobEvent {
  type: "job_started" | "job_progress" | "job_done" | "job_failed" | "job_retry";
  job_id: string;
  solver?: string;
  result_ref?: string;
  error?: string;
  progress?: number;
  message?: string;
  attempts?: number;
}


/** Apre un WS verso /ws/jobs/{user_id}. Ritorna l'istanza, da chiudere on unmount. */
export function openJobsSocket(
  userId: string,
  onEvent: (ev: JobEvent) => void,
): WebSocket {
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  const host = window.location.host;
  const ws = new WebSocket(`${proto}://${host}/ws/jobs/${encodeURIComponent(userId)}`);
  ws.onmessage = (ev) => {
    try { onEvent(JSON.parse(ev.data)); } catch { /* ignore */ }
  };
  return ws;
}
