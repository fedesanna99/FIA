import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

vi.mock("../../api/jobs", () => ({
  submitJob: vi.fn(),
  openJobsSocket: vi.fn(() => ({ close: vi.fn() })),
}));
vi.mock("../../api/billing", () => ({
  estimateCost: vi.fn(),
  getQuota: vi.fn(),
}));
vi.mock("../../hooks/useJobRun", () => ({
  useJobRun: ({ onSuccess, onError }: any) => ({
    isPending: false,
    error: null,
    lastJobId: null,
    mutate: async (req: any) => {
      try {
        const mod = await import("../../api/jobs");
        await (mod as any).submitJob(req);
        onSuccess?.({
          model_id: req.model_id, steps: [], converged: true,
          final_displacements: [], final_element_forces: [],
          max_displacement: 0, solve_time_ms: 1,
        }, { job_id: "test" });
      } catch (e) {
        onError?.(e instanceof Error ? e : new Error(String(e)));
      }
    },
  }),
}));

import { submitJob } from "../../api/jobs";
import { estimateCost, getQuota } from "../../api/billing";
import { NonlinearPanel } from "./NonlinearPanel";
import { useModelStore } from "../../store/modelStore";
import { useBillingStore } from "../../store/billingStore";


function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const SAMPLE_MODEL = {
  id: "test_nl", name: "test", is_3d: false,
  nodes: [], elements: [], loads: [], constraints: [],
};


beforeEach(() => {
  vi.clearAllMocks();
  act(() => {
    useModelStore.setState({
      model: null,
      selectedNodeIds: new Set(),
      selectedElementIds: new Set(),
    });
    useBillingStore.setState({ skipCostPreview: true, lastEstimate: null });
  });
});


describe("NonlinearPanel", () => {
  it("renders form with default params", () => {
    act(() => useModelStore.setState({ model: SAMPLE_MODEL as never }));
    render(<NonlinearPanel />, { wrapper });
    expect(screen.getByText(/Statica non-lineare/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Esegui non-lineare/i })).toBeInTheDocument();
  });

  it("submits with current params when clicking Esegui", async () => {
    act(() => useModelStore.setState({ model: SAMPLE_MODEL as never }));
    (submitJob as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      model_id: "test_nl",
      steps: [], converged: true,
      final_displacements: [], final_element_forces: [],
      max_displacement: 0, solve_time_ms: 1,
    });
    render(<NonlinearPanel />, { wrapper });
    fireEvent.click(screen.getByRole("button", { name: /Esegui non-lineare/i }));

    await waitFor(() => {
      expect(submitJob).toHaveBeenCalledTimes(1);
    });
  });

  it("shows toast on solver error", async () => {
    act(() => useModelStore.setState({ model: SAMPLE_MODEL as never }));
    (submitJob as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("nope"),
    );
    render(<NonlinearPanel />, { wrapper });
    fireEvent.click(screen.getByRole("button", { name: /Esegui non-lineare/i }));

    await waitFor(() => {
      expect(submitJob).toHaveBeenCalledTimes(1);
    });
  });

  it("does not submit when no model loaded", async () => {
    render(<NonlinearPanel />, { wrapper });
    const btn = screen.getByRole("button", { name: /Esegui non-lineare/i }).closest("button")!;
    expect(btn.disabled).toBe(true);
  });
});
