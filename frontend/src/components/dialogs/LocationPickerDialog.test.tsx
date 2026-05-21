import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

vi.mock("../../api/geocoding", () => ({
  geocodingSearch: vi.fn(),
  geocodingReverse: vi.fn(),
  geocodingBest: vi.fn(),
}));
vi.mock("../../api/terrain", () => ({
  terrainBatch: vi.fn(),
  terrainProfile: vi.fn(),
  terrainBbox: vi.fn(),
}));
vi.mock("../../api/loads", () => ({
  computeMeteoLoads: vi.fn(),
  computeSeismicLoads: vi.fn(),
}));

import { geocodingSearch } from "../../api/geocoding";
import { terrainBatch } from "../../api/terrain";
import { computeMeteoLoads, computeSeismicLoads } from "../../api/loads";
import { LocationPickerDialog } from "./LocationPickerDialog";


function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}


const cagliariLoc = {
  name: "Cagliari",
  lat: 39.2154,
  lon: 9.1166,
  country: "Italy",
  country_code: "it",
  admin1: "Sardegna",
  source: "open_meteo_geocoding",
};

const cagliariElev = {
  points: [{ lat: 39.21, lon: 9.11, elevation_m: 7, source: "open_elevation" }],
  stats: {
    n_points: 1, elevation_min_m: 7, elevation_max_m: 7,
    elevation_mean_m: 7, elevation_range_m: 0,
  },
  source_provider: "open_elevation",
  notes: [],
};

const cagliariMeteo = {
  location: { lat: 39.21, lon: 9.11, elevation_m: 7, elevation_source: "open_elevation" },
  wind: {
    v_b0_ms: 22.5, gust_max_observed_ms: 25, q_b_kN_m2: 0.316,
    q_p_z10_kN_m2: 0.538, c_e_z10: 1.7, terrain_category: "II",
    gust_factor: 1.4, air_density_kg_m3: 1.25,
    source_provider: "open_meteo_archive",
  },
  snow: {
    s_k_kN_m2: 0.1, snowfall_max_observed_cm: 5, snow_density_kg_m3: 200,
    mu_i_default: 0.8, c_e: 1.0, c_t: 1.0, s_design_kN_m2: 0.08,
    source_provider: "open_meteo_archive",
  },
  years_used: 50,
  notes: [],
};

const cagliariSeismic = {
  location: { lat: 39.21, lon: 9.11, elevation_m: 7, elevation_source: null },
  historical_max_magnitude: 5.0,
  search_radius_km: 100, search_years_back: 100,
  site_params: {
    a_g_over_g: 0.045, F_0: 2.5, T_c_star_s: 0.35,
    soil_category: "A" as const, S: 1.0, C_C: 1.0,
    T_B_s: 0.117, T_C_s: 0.35, T_D_s: 1.78, eta: 1.0, damping_ratio: 0.05,
  },
  spectrum: [], notes: ["v1.3 estimate"], gmpe_used: "simplified_italy_2018",
};


beforeEach(() => {
  vi.clearAllMocks();
  (geocodingSearch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
    query: "Cagliari",
    results: [cagliariLoc],
  });
  (terrainBatch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(cagliariElev);
  (computeMeteoLoads as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(cagliariMeteo);
  (computeSeismicLoads as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(cagliariSeismic);
});


describe("LocationPickerDialog", () => {
  it("renders search input when open", () => {
    render(<LocationPickerDialog open onClose={() => {}} />, { wrapper });
    expect(screen.getByTestId("location-search-input")).toBeInTheDocument();
    expect(screen.getByTestId("location-search-submit")).toBeInTheDocument();
  });

  it("performs search and shows results", async () => {
    const user = userEvent.setup();
    render(<LocationPickerDialog open onClose={() => {}} />, { wrapper });
    await user.type(screen.getByTestId("location-search-input"), "Cagliari");
    await user.click(screen.getByTestId("location-search-submit"));
    await waitFor(() => {
      expect(geocodingSearch).toHaveBeenCalledWith("Cagliari", 8, "en");
    });
    await waitFor(() => screen.getByTestId("location-results"));
    expect(screen.getByTestId("location-result-0")).toBeInTheDocument();
    // Risultato live (mock) ha source open_meteo_geocoding (NON un preset)
    const result0 = screen.getByTestId("location-result-0");
    expect(result0).toHaveTextContent("Cagliari");
    expect(result0).toHaveTextContent("open_meteo_geocoding");
  });

  it("on result click loads detail with elevation + loads", async () => {
    const user = userEvent.setup();
    render(<LocationPickerDialog open onClose={() => {}} />, { wrapper });
    await user.type(screen.getByTestId("location-search-input"), "Cagliari");
    await user.click(screen.getByTestId("location-search-submit"));
    await waitFor(() => screen.getByTestId("location-result-0"));
    await user.click(screen.getByTestId("location-result-0"));
    await waitFor(() => screen.getByTestId("location-detail"));

    // Wait for the 3 queries to resolve
    await waitFor(() => {
      expect(terrainBatch).toHaveBeenCalled();
      expect(computeMeteoLoads).toHaveBeenCalled();
      expect(computeSeismicLoads).toHaveBeenCalled();
    });
  });

  it("apply button propagates loads bundle to onApply", async () => {
    const onApply = vi.fn();
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <LocationPickerDialog open onClose={onClose} onApply={onApply} />,
      { wrapper },
    );
    await user.type(screen.getByTestId("location-search-input"), "Cagliari");
    await user.click(screen.getByTestId("location-search-submit"));
    await waitFor(() => screen.getByTestId("location-result-0"));
    await user.click(screen.getByTestId("location-result-0"));

    // wait for all loads to resolve
    await waitFor(() => {
      expect(computeMeteoLoads).toHaveBeenCalled();
      expect(computeSeismicLoads).toHaveBeenCalled();
    });

    await waitFor(() => screen.getByTestId("location-apply"));
    await user.click(screen.getByTestId("location-apply"));

    await waitFor(() => {
      expect(onApply).toHaveBeenCalledTimes(1);
    });
    const bundle = (onApply as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(bundle.location.name).toBe("Cagliari");
    expect(bundle.elevation_m).toBe(7);
    expect(bundle.meteo).toBeTruthy();
    expect(bundle.seismic).toBeTruthy();
    expect(onClose).toHaveBeenCalled();
  });

  it("changing soil category re-queries seismic loads", async () => {
    const user = userEvent.setup();
    render(<LocationPickerDialog open onClose={() => {}} />, { wrapper });
    await user.type(screen.getByTestId("location-search-input"), "Cagliari");
    await user.click(screen.getByTestId("location-search-submit"));
    await waitFor(() => screen.getByTestId("location-result-0"));
    await user.click(screen.getByTestId("location-result-0"));
    await waitFor(() => screen.getByTestId("location-detail"));

    // Switch to seismic tab
    await user.click(screen.getByRole("tab", { name: /Sismica/i }));
    await waitFor(() => screen.getByTestId("seismic-tab"));
    // baseline: 1 call
    expect(computeSeismicLoads).toHaveBeenCalledTimes(1);

    // Change soil
    await user.selectOptions(screen.getByTestId("soil-category-select"), "C");
    await waitFor(() => {
      expect(computeSeismicLoads).toHaveBeenCalledWith(
        expect.objectContaining({ soil_category: "C" }),
      );
    });
  });

  it("reset clears selection", async () => {
    const user = userEvent.setup();
    render(<LocationPickerDialog open onClose={() => {}} />, { wrapper });
    await user.type(screen.getByTestId("location-search-input"), "Cagliari");
    await user.click(screen.getByTestId("location-search-submit"));
    await waitFor(() => screen.getByTestId("location-result-0"));
    await user.click(screen.getByTestId("location-result-0"));
    await waitFor(() => screen.getByTestId("location-detail"));
    await user.click(screen.getByTestId("location-reset"));
    await waitFor(() => {
      expect(screen.queryByTestId("location-detail")).not.toBeInTheDocument();
    });
  });

  it("empty search query disables submit", () => {
    render(<LocationPickerDialog open onClose={() => {}} />, { wrapper });
    const submit = screen.getByTestId("location-search-submit");
    expect(submit).toBeDisabled();
  });

  it("does not render when closed", () => {
    render(<LocationPickerDialog open={false} onClose={() => {}} />, { wrapper });
    expect(screen.queryByTestId("location-picker-dialog")).not.toBeInTheDocument();
  });
});
