import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

vi.mock("../api/jobs", () => ({
  submitJob: vi.fn(),
  openJobsSocket: vi.fn(),
}));

vi.mock("axios", () => {
  const get = vi.fn();
  const post = vi.fn();
  const del = vi.fn();
  const interceptorUse = vi.fn();
  const instance = {
    get, post, delete: del,
    interceptors: { request: { use: interceptorUse }, response: { use: interceptorUse } },
  };
  return {
    default: {
      ...instance,
      create: vi.fn(() => instance),
    },
    get, post,
  };
});

import axios from "axios";
import { submitJob, openJobsSocket } from "../api/jobs";
import { useJobRun } from "./useJobRun";


function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}


type MockWs = {
  close: ReturnType<typeof vi.fn>;
  fire: (ev: any) => void;
};

function makeMockWs(): MockWs {
  let handler: ((ev: any) => void) | undefined;
  (openJobsSocket as unknown as ReturnType<typeof vi.fn>).mockImplementation(
    (_uid: string, onEvent: (ev: any) => void) => {
      handler = onEvent;
      return { close: vi.fn() };
    },
  );
  return {
    close: vi.fn(),
    fire: (ev: any) => handler?.(ev),
  };
}


const baseJob = {
  job_id: "j1",
  user_id: "demo_user",
  solver: "linear",
  model_id: "m1",
  params: {},
  estimate: {
    solver: "linear", n_dof: 60, cpu_min: 0.01, ram_mb: 80,
    eta_s: 0.1, credits: 0.5, explanation: "",
  },
  priority: "standard",
  status: "queued",
  created_at: 0,
  started_at: null, ended_at: null,
  attempts: 0, max_retries: 1, error: null, result_ref: null,
};


beforeEach(() => {
  vi.clearAllMocks();
});


describe("useJobRun", () => {
  it("calls onSuccess when WS sends job_done", async () => {
    const ws = makeMockWs();
    (submitJob as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(baseJob);
    (axios.get as unknown as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ data: { ...baseJob, status: "done", result_ref: "r:m1:linear" } })
      .mockResolvedValueOnce({ data: { steps: [1, 2, 3] } });

    const onSuccess = vi.fn();
    const { result } = renderHook(() => useJobRun<any>({ onSuccess }), { wrapper });

    let runPromise: Promise<any>;
    await act(async () => {
      runPromise = result.current.mutate({ model_id: "m1", solver: "linear" });
      // fire WS event dopo che submit ha resolved
      await Promise.resolve();
      ws.fire({ type: "job_done", job_id: "j1", result_ref: "r:m1:linear" });
      await runPromise!;
    });

    expect(submitJob).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });
    expect(onSuccess.mock.calls[0][0]).toEqual({ steps: [1, 2, 3] });
  });

  it("calls onError when WS sends job_failed", async () => {
    const ws = makeMockWs();
    (submitJob as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(baseJob);

    const onError = vi.fn();
    const { result } = renderHook(() => useJobRun<any>({ onError }), { wrapper });

    await act(async () => {
      const p = result.current.mutate({ model_id: "m1", solver: "linear" }).catch(() => undefined);
      await Promise.resolve();
      ws.fire({ type: "job_failed", job_id: "j1", error: "boom" });
      await p;
    });

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0].message).toContain("boom");
  });

  it("polling fallback: if WS never fires, polling sees done", async () => {
    makeMockWs();
    (submitJob as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(baseJob);
    // Le prime 2 chiamate polling: status=running, la terza: done. Poi /result.
    (axios.get as unknown as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ data: { ...baseJob, status: "running" } })
      .mockResolvedValueOnce({ data: { ...baseJob, status: "done" } })
      .mockResolvedValueOnce({ data: { ok: true } });

    const onSuccess = vi.fn();
    const { result } = renderHook(() => useJobRun<any>({ onSuccess }), { wrapper });

    await act(async () => {
      await result.current.mutate({ model_id: "m1", solver: "linear" });
    });

    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onSuccess.mock.calls[0][0]).toEqual({ ok: true });
  });

  it("ignores WS events for other job_ids", async () => {
    const ws = makeMockWs();
    (submitJob as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(baseJob);
    (axios.get as unknown as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ data: { ...baseJob, status: "done" } })
      .mockResolvedValueOnce({ data: { ok: true } });

    const onSuccess = vi.fn();
    const { result } = renderHook(() => useJobRun<any>({ onSuccess }), { wrapper });

    await act(async () => {
      const p = result.current.mutate({ model_id: "m1", solver: "linear" });
      await Promise.resolve();
      ws.fire({ type: "job_done", job_id: "OTHER", result_ref: "r" });
      // Polling completa il flow
      await p;
    });

    // onSuccess viene chiamato comunque (via polling fallback), ma NON dall'evento OTHER
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });
});
