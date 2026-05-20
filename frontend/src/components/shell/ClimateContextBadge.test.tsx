import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { ReactElement } from "react";

import { useClimateStore } from "../../store/climateStore";
import { TooltipProvider } from "../ui/Tooltip";
import { ClimateContextBadge } from "./ClimateContextBadge";


// Helper: wrappa in TooltipProvider (richiesto da Radix Tooltip in test isolati).
function renderWithProvider(ui: ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
}


const sampleBundle = {
  location: {
    name: "Cagliari", lat: 39.23, lon: 9.12, country: "Italy",
    country_code: "it", admin1: "Sardinia", admin2: null,
    timezone: "Europe/Rome", population: 149000, elevation: 6,
    source: "open_meteo_geocoding",
  },
  elevation_m: 36,
  meteo: {
    location: { lat: 39.23, lon: 9.12, elevation_m: 36, elevation_source: "open_elevation" },
    wind: {
      v_b0_ms: 22.33, gust_max_observed_ms: 31.7, q_b_kN_m2: 0.311,
      q_p_z10_kN_m2: 0.530, c_e_z10: 1.7, terrain_category: "II",
      gust_factor: 1.4, air_density_kg_m3: 1.25, source_provider: "ERA5",
    },
    snow: {
      s_k_kN_m2: 0.028, snowfall_max_observed_cm: 3.5, snow_density_kg_m3: 200,
      mu_i_default: 0.8, c_e: 1.0, c_t: 1.0, s_design_kN_m2: 0.022,
      source_provider: "ERA5",
    },
    years_used: 50, notes: [],
  },
  seismic: {
    location: { lat: 39.23, lon: 9.12, elevation_m: 36, elevation_source: null },
    historical_max_magnitude: 4.1, search_radius_km: 100, search_years_back: 100,
    site_params: {
      a_g_over_g: 0.0213, F_0: 2.5, T_c_star_s: 0.35,
      soil_category: "A" as const, S: 1.0, C_C: 1.0,
      T_B_s: 0.117, T_C_s: 0.35, T_D_s: 1.685, eta: 1.0, damping_ratio: 0.05,
    },
    spectrum: [], notes: [], gmpe_used: "simplified_italy_2018",
  },
};


beforeEach(() => {
  useClimateStore.setState({ bundle: null });
});


describe("ClimateContextBadge", () => {
  it("renders nothing when bundle is null", () => {
    renderWithProvider(<ClimateContextBadge />);
    expect(screen.queryByTestId("climate-context-badge")).not.toBeInTheDocument();
  });

  it("renders the badge with location when bundle is set", () => {
    useClimateStore.getState().setBundle(sampleBundle);
    renderWithProvider(<ClimateContextBadge />);
    expect(screen.getByTestId("climate-context-badge")).toBeInTheDocument();
    expect(screen.getByText("Cagliari")).toBeInTheDocument();
    expect(screen.getByText(/39\.230, 9\.120/)).toBeInTheDocument();
    expect(screen.getByText(/36 m/)).toBeInTheDocument();
  });

  it("clicking name toggles expanded view", () => {
    useClimateStore.getState().setBundle(sampleBundle);
    renderWithProvider(<ClimateContextBadge />);
    expect(screen.queryByTestId("climate-badge-expanded")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Cagliari"));
    expect(screen.getByTestId("climate-badge-expanded")).toBeInTheDocument();
    // Mostra valori wind + snow + seismic
    expect(screen.getByText(/q_p\(10m\)/)).toBeInTheDocument();
    expect(screen.getByText(/0\.530 kN\/m²/)).toBeInTheDocument();
    expect(screen.getByText(/M_max = Mw 4\.1/)).toBeInTheDocument();
    expect(screen.getByText(/a_g\/g/)).toBeInTheDocument();
  });

  it("clear button removes the bundle", async () => {
    useClimateStore.getState().setBundle(sampleBundle);
    renderWithProvider(<ClimateContextBadge />);
    fireEvent.click(screen.getByTestId("climate-badge-clear"));
    await waitFor(() => {
      expect(useClimateStore.getState().bundle).toBeNull();
    });
  });

  it("edit button calls onReopen callback if provided", () => {
    useClimateStore.getState().setBundle(sampleBundle);
    const onReopen = vi.fn();
    renderWithProvider(<ClimateContextBadge onReopen={onReopen} />);
    fireEvent.click(screen.getByTestId("climate-badge-edit"));
    expect(onReopen).toHaveBeenCalledTimes(1);
  });

  it("edit button not shown when no onReopen callback", () => {
    useClimateStore.getState().setBundle(sampleBundle);
    renderWithProvider(<ClimateContextBadge />);
    expect(screen.queryByTestId("climate-badge-edit")).not.toBeInTheDocument();
  });

  it("handles bundle without seismic gracefully", () => {
    const noSeismic = { ...sampleBundle, seismic: null };
    useClimateStore.getState().setBundle(noSeismic);
    renderWithProvider(<ClimateContextBadge />);
    fireEvent.click(screen.getByText("Cagliari"));
    expect(screen.getByText(/q_p\(10m\)/)).toBeInTheDocument();
    expect(screen.queryByText(/M_max/)).not.toBeInTheDocument();
  });

  it("handles bundle without meteo gracefully", () => {
    const noMeteo = { ...sampleBundle, meteo: null };
    useClimateStore.getState().setBundle(noMeteo);
    renderWithProvider(<ClimateContextBadge />);
    fireEvent.click(screen.getByText("Cagliari"));
    expect(screen.queryByText(/q_p\(10m\)/)).not.toBeInTheDocument();
    expect(screen.getByText(/M_max/)).toBeInTheDocument();
  });
});
