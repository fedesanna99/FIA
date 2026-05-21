import { describe, it, expect } from "vitest";

import { LOCATION_PRESETS } from "./locationPresets";


describe("LOCATION_PRESETS", () => {
  it("contiene esattamente 5 preset", () => {
    expect(LOCATION_PRESETS).toHaveLength(5);
  });

  it("ogni preset ha key/label/emoji/description/bundle", () => {
    for (const p of LOCATION_PRESETS) {
      expect(p.key).toBeTruthy();
      expect(p.label).toBeTruthy();
      expect(p.emoji).toBeTruthy();
      expect(p.description).toBeTruthy();
      expect(p.bundle).toBeTruthy();
    }
  });

  it("ogni bundle ha location + meteo + seismic", () => {
    for (const p of LOCATION_PRESETS) {
      expect(p.bundle.location.lat).toBeGreaterThan(0);
      expect(p.bundle.location.lon).toBeGreaterThan(0);
      expect(p.bundle.location.country_code).toBe("it");
      expect(p.bundle.meteo).toBeTruthy();
      expect(p.bundle.seismic).toBeTruthy();
    }
  });

  it("L'Aquila ha sismica alta (a_g/g >= 0.20)", () => {
    const laquila = LOCATION_PRESETS.find((p) => p.key === "laquila");
    expect(laquila).toBeDefined();
    expect(laquila!.bundle.seismic!.site_params.a_g_over_g).toBeGreaterThanOrEqual(0.20);
    expect(laquila!.bundle.seismic!.historical_max_magnitude).toBeGreaterThanOrEqual(6);
  });

  it("Cortina ha neve estrema (s_design >= 1.0)", () => {
    const cortina = LOCATION_PRESETS.find((p) => p.key === "cortina");
    expect(cortina).toBeDefined();
    expect(cortina!.bundle.meteo!.snow.s_design_kN_m2).toBeGreaterThanOrEqual(1.0);
  });

  it("Cagliari ha vento alto (q_p >= 0.45) e neve quasi zero", () => {
    const cagliari = LOCATION_PRESETS.find((p) => p.key === "cagliari");
    expect(cagliari).toBeDefined();
    expect(cagliari!.bundle.meteo!.wind.q_p_z10_kN_m2).toBeGreaterThanOrEqual(0.45);
    expect(cagliari!.bundle.meteo!.snow.s_design_kN_m2).toBeLessThan(0.10);
  });

  it("Milano ha sismica bassa (a_g/g < 0.10)", () => {
    const milano = LOCATION_PRESETS.find((p) => p.key === "milano");
    expect(milano).toBeDefined();
    expect(milano!.bundle.seismic!.site_params.a_g_over_g).toBeLessThan(0.10);
  });

  it("le key sono univoche", () => {
    const keys = LOCATION_PRESETS.map((p) => p.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("ogni source contiene preset", () => {
    for (const p of LOCATION_PRESETS) {
      expect(p.bundle.location.source).toContain("preset");
      expect(p.bundle.meteo!.wind.source_provider).toBe("preset");
    }
  });
});
