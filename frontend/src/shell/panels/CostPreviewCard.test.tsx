import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("../../api/billing", async () => {
  const actual = await vi.importActual<typeof import("../../api/billing")>("../../api/billing");
  return {
    ...actual,
    estimateCost: vi.fn(),
  };
});

import { estimateCost } from "../../api/billing";
import { useModelStore } from "../../store/modelStore";
import { CostPreviewCard } from "./CostPreviewCard";


function wrap(children: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}


beforeEach(() => {
  useModelStore.setState({ model: null } as any);
  vi.clearAllMocks();
});


describe("CostPreviewCard", () => {
  it("renders mock data immediately without a model", () => {
    render(wrap(<CostPreviewCard analysisId="static" />));
    expect(screen.getByTestId("cost-preview-card")).toBeInTheDocument();
    expect(screen.getByText(/Stima costo pre-run/i)).toBeInTheDocument();
    expect(screen.getByText(/ETA ~3s/i)).toBeInTheDocument();
  });

  it("shows credits and euro estimate", () => {
    render(wrap(<CostPreviewCard analysisId="static" />));
    // mock: credits=0.4 → €0.04
    expect(screen.getByText("0.40")).toBeInTheDocument();
    expect(screen.getByText(/€0\.04/i)).toBeInTheDocument();
  });

  it("uses real estimate when model is loaded + API succeeds", async () => {
    useModelStore.setState({
      model: { id: "m1", name: "T", nodes: [], elements: [], loads: [], constraints: [] },
    } as any);
    (estimateCost as ReturnType<typeof vi.fn>).mockResolvedValue({
      solver: "modal",
      n_dof: 1200,
      cpu_min: 0.10,
      ram_mb: 96,
      eta_s: 7,
      credits: 1.6,
      explanation: "Real estimate",
    });
    render(wrap(<CostPreviewCard analysisId="modal" />));
    await waitFor(() => {
      expect(screen.getByText("1.60")).toBeInTheDocument();
    });
    expect(estimateCost).toHaveBeenCalled();
  });

  it("falls back to mock if API throws", async () => {
    useModelStore.setState({
      model: { id: "m1", name: "T", nodes: [], elements: [], loads: [], constraints: [] },
    } as any);
    (estimateCost as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("500"));
    render(wrap(<CostPreviewCard analysisId="buckling" />));
    // mock buckling: credits=1.2
    await waitFor(() => {
      expect(screen.getByText("1.20")).toBeInTheDocument();
    });
  });

  it("renders for all known analysisIds (static/modal/buckling/dynamic/...)", () => {
    const ids = ["static", "modal", "buckling", "dynamic", "pushover", "seismic", "nonlinear", "arclength"];
    for (const id of ids) {
      const { unmount } = render(wrap(<CostPreviewCard analysisId={id} />));
      expect(screen.getByTestId("cost-preview-card")).toBeInTheDocument();
      unmount();
    }
  });
});
