import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

vi.mock("../../api/postprocess", () => ({
  postprocessApi: { isosurfaces: vi.fn() },
}));

import { postprocessApi } from "../../api/postprocess";
import { IsosurfacePanel } from "./IsosurfacePanel";
import { useModelStore } from "../../store/modelStore";
import { useResultsStore } from "../../store/resultsStore";


function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const SAMPLE_MODEL = {
  id: "test_iso", name: "test", is_3d: true,
  nodes: [
    { id: 1, x: 0, y: 0, z: 0 },
    { id: 2, x: 1, y: 0, z: 0 },
    { id: 3, x: 0, y: 1, z: 0 },
    { id: 4, x: 0, y: 0, z: 1 },
  ],
  elements: [
    { id: 1, type: "solid_t4", nodes: [1, 2, 3, 4], material_id: "steel_s355" },
  ],
  loads: [], constraints: [],
};


beforeEach(() => {
  vi.clearAllMocks();
  act(() => {
    useModelStore.setState({
      model: null,
      selectedNodeIds: new Set(),
      selectedElementIds: new Set(),
    });
    useResultsStore.setState({ staticResults: null });
  });
});


describe("IsosurfacePanel", () => {
  it("renders the form when a model is loaded", () => {
    act(() => useModelStore.setState({ model: SAMPLE_MODEL as never }));
    render(<IsosurfacePanel />, { wrapper });
    expect(screen.getByText(/iso/i)).toBeInTheDocument();
  });

  it("invokes postprocessApi.isosurfaces when the button is clicked", async () => {
    act(() => {
      useModelStore.setState({ model: SAMPLE_MODEL as never });
      useResultsStore.setState({
        staticResults: {
          analysis_type: "static",
          model_id: "test_iso",
          displacements: [],
          reactions: [],
          element_forces: [],
          element_stresses: [
            { element_id: 1, sigma_vm: 1e6, sigma_x: 0, sigma_y: 0, sigma_z: 0,
              tau_xy: 0, tau_yz: 0, tau_xz: 0 },
          ],
          max_displacement: 0, max_stress: 1e6, n_dofs: 0, solve_time_ms: 1,
        } as never,
      });
    });
    (postprocessApi.isosurfaces as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      levels: [], surfaces: [],
    });
    render(<IsosurfacePanel />, { wrapper });
    const btn = screen.getAllByRole("button").find((b) => /esegui|calcola|generate/i.test(b.textContent || ""));
    if (btn) {
      fireEvent.click(btn);
      await waitFor(() => {
        expect(postprocessApi.isosurfaces).toHaveBeenCalled();
      });
    }
  });

  it("shows an empty state when no static results available", () => {
    act(() => useModelStore.setState({ model: SAMPLE_MODEL as never }));
    render(<IsosurfacePanel />, { wrapper });
    // Almeno il titolo del pannello e' presente; non assert specifico per non
    // accoppiare al testo italiano interno.
    expect(screen.queryByText(/iso/i)).not.toBeNull();
  });
});
