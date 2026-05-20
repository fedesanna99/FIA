import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

vi.mock("../../api/analysis_ext", () => ({
  analysisExtApi: { arcLength: vi.fn() },
}));
vi.mock("../../api/billing", () => ({
  estimateCost: vi.fn(), getQuota: vi.fn(),
}));

import { analysisExtApi } from "../../api/analysis_ext";
import { ArcLengthPanel } from "./ArcLengthPanel";
import { useModelStore } from "../../store/modelStore";
import { useBillingStore } from "../../store/billingStore";


function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const SAMPLE_MODEL = {
  id: "test_al", name: "test", is_3d: false,
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


describe("ArcLengthPanel", () => {
  it("renders the Crisfield form", () => {
    act(() => useModelStore.setState({ model: SAMPLE_MODEL as never }));
    render(<ArcLengthPanel />, { wrapper });
    // Esistono almeno un titolo + un bottone con "arc-length"
    expect(screen.getAllByText(/Arc-length/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /Esegui arc-length/i })).toBeInTheDocument();
  });

  it("submits with current params", async () => {
    act(() => useModelStore.setState({ model: SAMPLE_MODEL as never }));
    (analysisExtApi.arcLength as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      model_id: "test_al",
      lambda_curve: [0, 0.5, 1.0],
      delta_curve: [0, 0.01, 0.02],
      steps: [
        { load_factor: 0, max_displacement: 0, iterations: 0, converged: true },
        { load_factor: 0.5, max_displacement: 0.01, iterations: 3, converged: true },
        { load_factor: 1.0, max_displacement: 0.02, iterations: 4, converged: true },
      ],
      converged_all: true,
      final_displacements: [], final_element_forces: [],
      max_displacement: 0, solve_time_ms: 1,
    });
    render(<ArcLengthPanel />, { wrapper });
    fireEvent.click(screen.getByRole("button", { name: /Esegui arc-length/i }));
    await waitFor(() => {
      expect(analysisExtApi.arcLength).toHaveBeenCalledTimes(1);
    });
  });

  it("shows toast on solver error", async () => {
    act(() => useModelStore.setState({ model: SAMPLE_MODEL as never }));
    (analysisExtApi.arcLength as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("nope"),
    );
    render(<ArcLengthPanel />, { wrapper });
    fireEvent.click(screen.getByRole("button", { name: /Esegui arc-length/i }));
    await waitFor(() => {
      expect(analysisExtApi.arcLength).toHaveBeenCalledTimes(1);
    });
  });

  it("disables submit when no model loaded", () => {
    render(<ArcLengthPanel />, { wrapper });
    const btn = screen.getByRole("button", { name: /Esegui arc-length/i }).closest("button")!;
    expect(btn.disabled).toBe(true);
  });
});
