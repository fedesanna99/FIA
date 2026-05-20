import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

vi.mock("../../../api/jobs", () => ({
  listJobs: vi.fn(),
  cancelJob: vi.fn(),
  openJobsSocket: vi.fn(() => ({
    close: vi.fn(),
    onopen: null,
    onclose: null,
    onerror: null,
  })),
}));

import { listJobs, cancelJob } from "../../../api/jobs";
import { JobsPanel } from "./JobsPanel";


function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}


const baseJob = {
  user_id: "demo_user",
  solver: "linear" as const,
  model_id: "m1",
  params: {},
  estimate: {
    solver: "linear" as const, n_dof: 60, cpu_min: 0.01,
    ram_mb: 80, eta_s: 0.1, credits: 0.5, explanation: "t",
  },
  priority: "standard" as const,
  created_at: 0, started_at: null, ended_at: null,
  attempts: 0, max_retries: 1, error: null, result_ref: null,
};


beforeEach(() => {
  vi.clearAllMocks();
});


describe("JobsPanel", () => {
  it("renders empty state with no jobs", async () => {
    (listJobs as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    render(<JobsPanel />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText(/Nessun job/i)).toBeInTheDocument();
    });
  });

  it("filters jobs by status via dropdown", async () => {
    (listJobs as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([
      { ...baseJob, job_id: "j1", status: "running" },
    ]);
    render(<JobsPanel />, { wrapper });
    await waitFor(() => {
      expect(screen.getByTestId("job-row-j1")).toBeInTheDocument();
    });
    fireEvent.change(screen.getByTestId("jobs-status-filter"), {
      target: { value: "done" },
    });
    // ultimo invoke ha status=done
    await waitFor(() => {
      const calls = (listJobs as unknown as ReturnType<typeof vi.fn>).mock.calls;
      const last = calls[calls.length - 1][0];
      expect(last.status).toBe("done");
    });
  });

  it("cancels a job via button click", async () => {
    (listJobs as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([
      { ...baseJob, job_id: "jq", status: "queued" },
    ]);
    (cancelJob as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseJob, job_id: "jq", status: "cancelled",
    });
    render(<JobsPanel />, { wrapper });
    await waitFor(() => screen.getByTestId("job-cancel-jq"));
    fireEvent.click(screen.getByTestId("job-cancel-jq"));
    await waitFor(() => {
      expect(cancelJob).toHaveBeenCalledWith("jq");
    });
  });

  it("clicking a row opens the detail card", async () => {
    (listJobs as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([
      { ...baseJob, job_id: "jd", status: "done" },
    ]);
    render(<JobsPanel />, { wrapper });
    await waitFor(() => screen.getByTestId("job-row-jd"));
    fireEvent.click(screen.getByTestId("job-row-jd"));
    await waitFor(() => {
      expect(screen.getByTestId("job-detail")).toBeInTheDocument();
    });
  });

  it("shows status badge for each job", async () => {
    (listJobs as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([
      { ...baseJob, job_id: "ja", status: "running" },
      { ...baseJob, job_id: "jb", status: "done" },
    ]);
    render(<JobsPanel />, { wrapper });
    await waitFor(() => {
      expect(screen.getByTestId("job-badge-ja")).toBeInTheDocument();
      expect(screen.getByTestId("job-badge-jb")).toBeInTheDocument();
    });
  });
});
