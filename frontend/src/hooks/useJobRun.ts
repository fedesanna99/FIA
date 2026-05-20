/**
 * useJobRun (Sprint 1 follow-up — A5 frontend migration).
 *
 * Wrappa il flow REST+WS della queue persistente in un'interfaccia mutation-like:
 *   const job = useJobRun<PushoverResults>();
 *   job.mutate({ model_id, solver: "pushover", params, onSuccess: (r) => {...} });
 *
 * Flow:
 *   1. POST /api/jobs                                  -> Job queued
 *   2. apre WS /ws/jobs/{user_id} + polling fallback   -> attende job_done
 *   3. GET /api/jobs/{job_id}/result                    -> payload solver
 *   4. onSuccess(result, job)
 */
import { useCallback, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import axios from "axios";

import {
  submitJob,
  openJobsSocket,
  type Job,
  type JobEvent,
  type JobSubmitRequest,
} from "../api/jobs";
import { DEFAULT_USER_ID } from "./useCostPreview";


export interface UseJobRunOptions<T> {
  onSuccess?: (result: T, job: Job) => void;
  onError?: (error: Error) => void;
  /** Override del DEFAULT_USER_ID per il WS subscription. */
  userId?: string;
}


type SubmitOptions<T> = Omit<JobSubmitRequest, "user_id"> & {
  user_id?: string;
  onSuccess?: (result: T, job: Job) => void;
  onError?: (error: Error) => void;
};


const TIMEOUT_MS = 5 * 60 * 1000;
const POLL_INTERVAL_MS = 1000;


async function waitForJobDone(
  jobId: string,
  userId: string,
): Promise<Job> {
  return new Promise<Job>((resolve, reject) => {
    let settled = false;
    let ws: WebSocket | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let timeoutTimer: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (ws) { try { ws.close(); } catch { /* noop */ } ws = null; }
      if (pollTimer !== null) { clearInterval(pollTimer); pollTimer = null; }
      if (timeoutTimer !== null) { clearTimeout(timeoutTimer); timeoutTimer = null; }
    };

    const done = (job: Job) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(job);
    };
    const fail = (err: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(err);
    };

    ws = openJobsSocket(userId, (ev: JobEvent) => {
      if (ev.job_id !== jobId) return;
      if (ev.type === "job_done") {
        // recupera il job aggiornato (status=done, result_ref settato)
        axios.get<Job>(`/api/jobs/${encodeURIComponent(jobId)}`)
          .then((r) => done(r.data))
          .catch(() => done({ job_id: jobId, status: "done" } as Job));
      } else if (ev.type === "job_failed") {
        fail(new Error(ev.error ?? "job failed"));
      }
    });

    // Polling fallback: copre il caso WS non si connette / si chiude / perde eventi.
    pollTimer = setInterval(async () => {
      try {
        const { data: cur } = await axios.get<Job>(
          `/api/jobs/${encodeURIComponent(jobId)}`,
        );
        if (cur.status === "done") done(cur);
        else if (cur.status === "failed" || cur.status === "cancelled") {
          fail(new Error(cur.error ?? cur.status));
        }
      } catch { /* transient network blip */ }
    }, POLL_INTERVAL_MS);

    timeoutTimer = setTimeout(
      () => fail(new Error("job_run_timeout: 5min senza job_done")),
      TIMEOUT_MS,
    );
  });
}


export function useJobRun<T = unknown>(globalOpts: UseJobRunOptions<T> = {}) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastJobId, setLastJobId] = useState<string | null>(null);
  const lastAbort = useRef<AbortController | null>(null);
  const qc = useQueryClient();

  const fetchResult = useCallback(async (jobId: string): Promise<T> => {
    const { data } = await axios.get<T>(`/api/jobs/${encodeURIComponent(jobId)}/result`);
    return data;
  }, []);

  const mutate = useCallback(async (opts: SubmitOptions<T>) => {
    // Abort eventuale run precedente in volo
    if (lastAbort.current) lastAbort.current.abort();
    lastAbort.current = new AbortController();

    setError(null);
    setIsPending(true);
    const userId = opts.user_id ?? globalOpts.userId ?? DEFAULT_USER_ID;
    const onSuccess = opts.onSuccess ?? globalOpts.onSuccess;
    const onError = opts.onError ?? globalOpts.onError;

    try {
      const job = await submitJob({
        model_id: opts.model_id,
        solver: opts.solver,
        params: opts.params,
        priority: opts.priority ?? "standard",
        max_retries: opts.max_retries,
        user_id: userId,
      });
      setLastJobId(job.job_id);
      qc.invalidateQueries({ queryKey: ["jobs", userId] });

      const finalJob = await waitForJobDone(job.job_id, userId);
      const result = await fetchResult(finalJob.job_id);
      qc.invalidateQueries({ queryKey: ["jobs", userId] });
      onSuccess?.(result, finalJob);
      setIsPending(false);
      return result;
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      setError(err);
      setIsPending(false);
      onError?.(err);
      throw err;
    }
  }, [globalOpts, qc, fetchResult]);

  return {
    mutate,
    isPending,
    error,
    lastJobId,
  };
}
