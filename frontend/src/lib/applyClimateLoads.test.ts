import { describe, it, expect } from "vitest";

import {
  applyClimateLoadsToModel,
  DEFAULT_APPLY_OPTIONS,
} from "./applyClimateLoads";
import type { ClimateBundle } from "../store/climateStore";
import type { FEAModel } from "../types/model";


const sampleBundle: ClimateBundle = {
  location: {
    name: "Cagliari", lat: 39.23, lon: 9.12,
    country: "Italy", country_code: "it",
    admin1: "Sardinia", admin2: null,
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
  seismic: null,
  computed_at: Date.now(),
};


function makeModel(): FEAModel {
  return {
    id: "test", name: "Test", units: "SI", is_3d: false,
    nodes: [
      { id: 1, x: 0, y: 0, z: 0 },
      { id: 2, x: 1, y: 0, z: 0 },
      { id: 3, x: 2, y: 0, z: 0 },
      { id: 4, x: 3, y: 0, z: 0 },
      { id: 5, x: 4, y: 0, z: 0 },
    ],
    elements: [],
    loads: [],
    constraints: [
      { id: 1, type: "pinned", node_id: 1 },
      { id: 2, type: "roller_x", node_id: 5 },
    ],
  };
}


describe("applyClimateLoadsToModel", () => {
  it("returns empty when bundle.meteo is null", () => {
    const m = makeModel();
    const r = applyClimateLoadsToModel(m, { ...sampleBundle, meteo: null });
    expect(r.loads).toEqual([]);
    expect(r.n_nodes_loaded).toBe(0);
    expect(r.wind_force_kN).toBe(0);
    expect(r.snow_force_kN).toBe(0);
  });

  it("by default skips constrained nodes (1 and 5)", () => {
    const m = makeModel();
    const r = applyClimateLoadsToModel(m, sampleBundle);
    // 5 nodi, 2 vincolati -> 3 caricabili (id 2,3,4)
    // Per ogni: 1 snow + 1 wind = 2 carichi -> 6 totali
    expect(r.n_nodes_loaded).toBe(3);
    expect(r.n_nodes_skipped).toBe(2);
    expect(r.loads).toHaveLength(6);
    expect(r.loads.every((l) => l.target_id !== 1 && l.target_id !== 5)).toBe(true);
  });

  it("includes constrained nodes when skipConstrained=false", () => {
    const m = makeModel();
    const r = applyClimateLoadsToModel(m, sampleBundle, { skipConstrained: false });
    expect(r.n_nodes_loaded).toBe(5);
    expect(r.n_nodes_skipped).toBe(0);
    expect(r.loads).toHaveLength(10);
  });

  it("snow force = s_design × tributary_area (kN), direzione -Z", () => {
    const m = makeModel();
    const r = applyClimateLoadsToModel(m, sampleBundle, { tributaryArea: 2.0 });
    // s_design = 0.022, area = 2 -> magnitudo = 0.044 kN
    expect(r.snow_force_kN).toBeCloseTo(0.044, 4);
    const snowLoads = r.loads.filter((l) => l.label?.startsWith("Snow"));
    expect(snowLoads).toHaveLength(3);
    snowLoads.forEach((l) => {
      expect(l.fz).toBeCloseTo(-0.044, 4);
      expect(l.fx).toBeUndefined();
      expect(l.fy).toBeUndefined();
    });
  });

  it("wind force = q_p × tributary_area, direzione +X default", () => {
    const m = makeModel();
    const r = applyClimateLoadsToModel(m, sampleBundle, { tributaryArea: 1.5 });
    // q_p = 0.530, area = 1.5 -> magnitudo = 0.795 kN
    expect(r.wind_force_kN).toBeCloseTo(0.795, 4);
    const windLoads = r.loads.filter((l) => l.label?.startsWith("Wind"));
    expect(windLoads).toHaveLength(3);
    windLoads.forEach((l) => {
      expect(l.fx).toBeCloseTo(0.795, 4);
      expect(l.fy).toBeUndefined();
      expect(l.fz).toBeUndefined();
    });
  });

  it("wind direction -X applica fx negativa", () => {
    const m = makeModel();
    const r = applyClimateLoadsToModel(m, sampleBundle, { windDirection: "-X" });
    const windLoads = r.loads.filter((l) => l.label?.startsWith("Wind"));
    expect(windLoads[0].fx).toBeCloseTo(-0.530, 4);
  });

  it("wind direction +Y applica fy positiva, non fx", () => {
    const m = makeModel();
    const r = applyClimateLoadsToModel(m, sampleBundle, { windDirection: "+Y" });
    const windLoads = r.loads.filter((l) => l.label?.startsWith("Wind"));
    expect(windLoads[0].fy).toBeCloseTo(0.530, 4);
    expect(windLoads[0].fx).toBeUndefined();
  });

  it("wind direction -Y applica fy negativa", () => {
    const m = makeModel();
    const r = applyClimateLoadsToModel(m, sampleBundle, { windDirection: "-Y" });
    const windLoads = r.loads.filter((l) => l.label?.startsWith("Wind"));
    expect(windLoads[0].fy).toBeCloseTo(-0.530, 4);
  });

  it("includeWind=false produce solo snow loads", () => {
    const m = makeModel();
    const r = applyClimateLoadsToModel(m, sampleBundle, { includeWind: false });
    expect(r.loads.every((l) => l.label?.startsWith("Snow"))).toBe(true);
    expect(r.loads).toHaveLength(3);
    expect(r.wind_force_kN).toBe(0);
  });

  it("includeSnow=false produce solo wind loads", () => {
    const m = makeModel();
    const r = applyClimateLoadsToModel(m, sampleBundle, { includeSnow: false });
    expect(r.loads.every((l) => l.label?.startsWith("Wind"))).toBe(true);
    expect(r.loads).toHaveLength(3);
    expect(r.snow_force_kN).toBe(0);
  });

  it("entrambi false -> nessun carico", () => {
    const m = makeModel();
    const r = applyClimateLoadsToModel(m, sampleBundle, {
      includeWind: false, includeSnow: false,
    });
    expect(r.loads).toEqual([]);
    expect(r.n_nodes_loaded).toBe(0);
  });

  it("location name viene messo nel label per traceability", () => {
    const m = makeModel();
    const r = applyClimateLoadsToModel(m, sampleBundle);
    expect(r.loads[0].label).toContain("Cagliari");
  });

  it("DEFAULT_APPLY_OPTIONS coerenti", () => {
    expect(DEFAULT_APPLY_OPTIONS.includeWind).toBe(true);
    expect(DEFAULT_APPLY_OPTIONS.includeSnow).toBe(true);
    expect(DEFAULT_APPLY_OPTIONS.windDirection).toBe("+X");
    expect(DEFAULT_APPLY_OPTIONS.tributaryArea).toBe(1.0);
    expect(DEFAULT_APPLY_OPTIONS.skipConstrained).toBe(true);
  });

  it("modello con 0 nodi -> nessun carico, niente crash", () => {
    const m: FEAModel = { ...makeModel(), nodes: [], constraints: [] };
    const r = applyClimateLoadsToModel(m, sampleBundle);
    expect(r.loads).toEqual([]);
    expect(r.n_nodes_loaded).toBe(0);
    expect(r.n_nodes_skipped).toBe(0);
  });

  it("modello senza constraints -> tutti i nodi caricati", () => {
    const m: FEAModel = { ...makeModel(), constraints: [] };
    const r = applyClimateLoadsToModel(m, sampleBundle);
    expect(r.n_nodes_loaded).toBe(5);
    expect(r.n_nodes_skipped).toBe(0);
  });
});
