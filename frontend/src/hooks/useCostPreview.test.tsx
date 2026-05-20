import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { useCostPreview } from "./useCostPreview";
import { useBillingStore } from "../store/billingStore";


vi.mock("../api/billing", () => ({
  estimateCost: vi.fn(),
  getQuota: vi.fn(),
}));

import { estimateCost, getQuota } from "../api/billing";


function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}


beforeEach(() => {
  vi.clearAllMocks();
  act(() => {
    useBillingStore.setState({ skipCostPreview: false, lastEstimate: null });
  });
});


describe("useCostPreview", () => {
  it("calls run() directly when skipPreview is true", async () => {
    act(() => useBillingStore.setState({ skipCostPreview: true }));
    const run = vi.fn();
    const { result } = renderHook(() => useCostPreview(), { wrapper });

    await act(async () => {
      await result.current.previewAndRun(
        { model_id: "m1", solver: "linear" },
        run,
      );
    });

    expect(run).toHaveBeenCalledTimes(1);
    expect(estimateCost).not.toHaveBeenCalled();
    expect(result.current.open).toBe(false);
  });

  it("fetches estimate and opens dialog when skipPreview is false", async () => {
    (estimateCost as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      solver: "linear", n_dof: 60, cpu_min: 0.01, ram_mb: 80,
      eta_s: 0.1, credits: 0.5, explanation: "t",
    });
    const run = vi.fn();
    const { result } = renderHook(() => useCostPreview(), { wrapper });

    await act(async () => {
      await result.current.previewAndRun(
        { model_id: "m1", solver: "linear" },
        run,
      );
    });

    expect(estimateCost).toHaveBeenCalledTimes(1);
    expect(run).not.toHaveBeenCalled();
    expect(result.current.open).toBe(true);
    await waitFor(() => {
      expect(result.current.estimate).not.toBeNull();
    });
  });

  it("does not run on cancel", async () => {
    (estimateCost as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      solver: "linear", n_dof: 60, cpu_min: 0.01, ram_mb: 80,
      eta_s: 0.1, credits: 0.5, explanation: "t",
    });
    const run = vi.fn();
    const { result } = renderHook(() => useCostPreview(), { wrapper });

    await act(async () => {
      await result.current.previewAndRun(
        { model_id: "m1", solver: "linear" },
        run,
      );
    });
    act(() => result.current.cancel());
    expect(run).not.toHaveBeenCalled();
    expect(result.current.open).toBe(false);
  });
});
