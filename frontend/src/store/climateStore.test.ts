import { describe, it, expect, beforeEach } from "vitest";

import { useClimateStore, type ClimateBundle } from "./climateStore";


const sampleBundle: Omit<ClimateBundle, "computed_at"> = {
  location: {
    name: "Cagliari", lat: 39.23, lon: 9.12,
    country: "Italy", country_code: "it",
    admin1: "Sardinia", admin2: null, timezone: "Europe/Rome",
    population: 149000, elevation: 6,
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
  seismic: null,
};


beforeEach(() => {
  useClimateStore.setState({ bundle: null });
});


describe("useClimateStore", () => {
  it("starts with null bundle", () => {
    expect(useClimateStore.getState().bundle).toBeNull();
  });

  it("setBundle stores the input + computed_at timestamp", () => {
    const before = Date.now();
    useClimateStore.getState().setBundle(sampleBundle);
    const after = Date.now();

    const stored = useClimateStore.getState().bundle;
    expect(stored).not.toBeNull();
    expect(stored?.location.name).toBe("Cagliari");
    expect(stored?.elevation_m).toBe(36);
    expect(stored?.meteo?.wind.q_p_z10_kN_m2).toBeCloseTo(0.530, 3);
    expect(stored?.computed_at).toBeGreaterThanOrEqual(before);
    expect(stored?.computed_at).toBeLessThanOrEqual(after);
  });

  it("setBundle(null) clears the bundle", () => {
    useClimateStore.getState().setBundle(sampleBundle);
    expect(useClimateStore.getState().bundle).not.toBeNull();
    useClimateStore.getState().setBundle(null);
    expect(useClimateStore.getState().bundle).toBeNull();
  });

  it("clear() resets the bundle", () => {
    useClimateStore.getState().setBundle(sampleBundle);
    useClimateStore.getState().clear();
    expect(useClimateStore.getState().bundle).toBeNull();
  });

  it("setBundle replaces previous bundle", () => {
    useClimateStore.getState().setBundle(sampleBundle);
    const first = useClimateStore.getState().bundle?.computed_at;
    // Replace with a different location
    const otherBundle = {
      ...sampleBundle,
      location: { ...sampleBundle.location, name: "Roma", lat: 41.9, lon: 12.5 },
    };
    useClimateStore.getState().setBundle(otherBundle);
    const stored = useClimateStore.getState().bundle;
    expect(stored?.location.name).toBe("Roma");
    expect(stored?.computed_at).toBeGreaterThanOrEqual(first ?? 0);
  });
});
