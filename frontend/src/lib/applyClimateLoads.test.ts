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

  // ============================================================
  // Modalita' per-node (v1.4.0-alpha.6)
  // ============================================================

  it("per-node: trave 6m con 6 sub-beam, interni 1m, estremi 0.5m", () => {
    const m: FEAModel = {
      id: "t", name: "t", units: "SI", is_3d: false,
      nodes: [
        { id: 1, x: 0, y: 0, z: 0 },
        { id: 2, x: 1, y: 0, z: 0 },
        { id: 3, x: 2, y: 0, z: 0 },
        { id: 4, x: 3, y: 0, z: 0 },
        { id: 5, x: 4, y: 0, z: 0 },
        { id: 6, x: 5, y: 0, z: 0 },
        { id: 7, x: 6, y: 0, z: 0 },
      ],
      elements: [
        { id: 1, type: "beam2d", nodes: [1, 2], material_id: "m" },
        { id: 2, type: "beam2d", nodes: [2, 3], material_id: "m" },
        { id: 3, type: "beam2d", nodes: [3, 4], material_id: "m" },
        { id: 4, type: "beam2d", nodes: [4, 5], material_id: "m" },
        { id: 5, type: "beam2d", nodes: [5, 6], material_id: "m" },
        { id: 6, type: "beam2d", nodes: [6, 7], material_id: "m" },
      ],
      loads: [],
      constraints: [
        { id: 1, type: "pinned", node_id: 1 },
        { id: 2, type: "roller_x", node_id: 7 },
      ],
    };
    const r = applyClimateLoadsToModel(m, sampleBundle, {
      tributaryMode: "per-node",
      includeWind: false,
    });
    expect(r.n_nodes_loaded).toBe(5);
    expect(r.n_nodes_skipped).toBe(2);
    expect(r.loads).toHaveLength(5);
    // Tutti i nodi caricati interni -> tributary uguale 1.0 -> snow = 0.022
    expect(r.snow_force_min_kN).toBeCloseTo(0.022, 4);
    expect(r.snow_force_max_kN).toBeCloseTo(0.022, 4);
    expect(r.snow_force_kN).toBeCloseTo(0.022, 4);
    const snowLoad = r.loads.find((l) => l.target_id === 2);
    expect(snowLoad?.fz).toBeCloseTo(-0.022, 4);
  });

  it("per-node: estremi liberi -> magnitudo diversa tra estremi e interni", () => {
    const m: FEAModel = {
      id: "t", name: "t", units: "SI", is_3d: false,
      nodes: [
        { id: 1, x: 0, y: 0, z: 0 },
        { id: 2, x: 1, y: 0, z: 0 },
        { id: 3, x: 2, y: 0, z: 0 },
      ],
      elements: [
        { id: 1, type: "beam2d", nodes: [1, 2], material_id: "m" },
        { id: 2, type: "beam2d", nodes: [2, 3], material_id: "m" },
      ],
      loads: [], constraints: [],
    };
    const r = applyClimateLoadsToModel(m, sampleBundle, {
      tributaryMode: "per-node",
      includeWind: false,
    });
    expect(r.snow_force_min_kN).toBeCloseTo(0.011, 4);
    expect(r.snow_force_max_kN).toBeCloseTo(0.022, 4);
    const load1 = r.loads.find((l) => l.target_id === 1);
    const load2 = r.loads.find((l) => l.target_id === 2);
    expect(load1?.fz).toBeCloseTo(-0.011, 4);
    expect(load2?.fz).toBeCloseTo(-0.022, 4);
  });

  it("per-node: nodo isolato viene skippato", () => {
    const m: FEAModel = {
      id: "t", name: "t", units: "SI", is_3d: false,
      nodes: [
        { id: 1, x: 0, y: 0, z: 0 },
        { id: 2, x: 1, y: 0, z: 0 },
        { id: 3, x: 99, y: 99, z: 99 },
      ],
      elements: [
        { id: 1, type: "beam2d", nodes: [1, 2], material_id: "m" },
      ],
      loads: [], constraints: [],
    };
    const r = applyClimateLoadsToModel(m, sampleBundle, {
      tributaryMode: "per-node",
    });
    expect(r.n_nodes_loaded).toBe(2);
    expect(r.n_nodes_skipped).toBe(1);
  });

  it("per-node senza elementi -> tutti skip", () => {
    const m: FEAModel = {
      id: "t", name: "t", units: "SI", is_3d: false,
      nodes: [
        { id: 1, x: 0, y: 0, z: 0 },
        { id: 2, x: 1, y: 0, z: 0 },
      ],
      elements: [], loads: [], constraints: [],
    };
    const r = applyClimateLoadsToModel(m, sampleBundle, {
      tributaryMode: "per-node",
    });
    expect(r.loads).toEqual([]);
    expect(r.n_nodes_loaded).toBe(0);
    expect(r.n_nodes_skipped).toBe(2);
  });

  it("per-node con facade_width 2x raddoppia magnitudini beam", () => {
    const m: FEAModel = {
      id: "t", name: "t", units: "SI", is_3d: false,
      nodes: [
        { id: 1, x: 0, y: 0, z: 0 },
        { id: 2, x: 2, y: 0, z: 0 },
      ],
      elements: [{ id: 1, type: "beam2d", nodes: [1, 2], material_id: "m" }],
      loads: [], constraints: [],
    };
    const r1 = applyClimateLoadsToModel(m, sampleBundle, {
      tributaryMode: "per-node", facadeWidthM: 1.0, includeWind: false,
    });
    const r2 = applyClimateLoadsToModel(m, sampleBundle, {
      tributaryMode: "per-node", facadeWidthM: 2.0, includeWind: false,
    });
    expect(r1.snow_force_kN).toBeCloseTo(0.022, 4);
    expect(r2.snow_force_kN).toBeCloseTo(0.044, 4);
  });

  it("per-node shell Q4 2x2: corner < edge < center magnitudo", () => {
    const m: FEAModel = {
      id: "t", name: "t", units: "SI", is_3d: false,
      nodes: [
        { id: 1, x: 0, y: 0, z: 0 },
        { id: 2, x: 1, y: 0, z: 0 },
        { id: 3, x: 2, y: 0, z: 0 },
        { id: 4, x: 0, y: 1, z: 0 },
        { id: 5, x: 1, y: 1, z: 0 },
        { id: 6, x: 2, y: 1, z: 0 },
        { id: 7, x: 0, y: 2, z: 0 },
        { id: 8, x: 1, y: 2, z: 0 },
        { id: 9, x: 2, y: 2, z: 0 },
      ],
      elements: [
        { id: 1, type: "shell_q4", nodes: [1, 2, 5, 4], material_id: "m" },
        { id: 2, type: "shell_q4", nodes: [2, 3, 6, 5], material_id: "m" },
        { id: 3, type: "shell_q4", nodes: [4, 5, 8, 7], material_id: "m" },
        { id: 4, type: "shell_q4", nodes: [5, 6, 9, 8], material_id: "m" },
      ],
      loads: [], constraints: [],
    };
    const r = applyClimateLoadsToModel(m, sampleBundle, {
      tributaryMode: "per-node",
      includeWind: false,
    });
    // Corner 0.25 → 0.0055, Edge 0.5 → 0.011, Center 1.0 → 0.022
    expect(r.snow_force_min_kN).toBeCloseTo(0.0055, 4);
    expect(r.snow_force_max_kN).toBeCloseTo(0.022, 4);
    const corner = r.loads.find((l) => l.target_id === 1);
    const edge = r.loads.find((l) => l.target_id === 2);
    const center = r.loads.find((l) => l.target_id === 5);
    expect(corner?.fz).toBeCloseTo(-0.0055, 4);
    expect(edge?.fz).toBeCloseTo(-0.011, 4);
    expect(center?.fz).toBeCloseTo(-0.022, 4);
  });

  it("conservation: sum totale per-node = q × area_totale_modello", () => {
    // Q4 2m × 2m, area=4
    const m: FEAModel = {
      id: "t", name: "t", units: "SI", is_3d: false,
      nodes: [
        { id: 1, x: 0, y: 0, z: 0 },
        { id: 2, x: 2, y: 0, z: 0 },
        { id: 3, x: 2, y: 2, z: 0 },
        { id: 4, x: 0, y: 2, z: 0 },
      ],
      elements: [{ id: 1, type: "shell_q4", nodes: [1, 2, 3, 4], material_id: "m" }],
      loads: [], constraints: [],
    };
    const r = applyClimateLoadsToModel(m, sampleBundle, {
      tributaryMode: "per-node", includeWind: false,
    });
    // Sum |fz| = s_design × A_totale = 0.022 × 4.0 = 0.088
    const totalAbs = r.loads.reduce((s, l) => s + Math.abs(l.fz ?? 0), 0);
    expect(totalAbs).toBeCloseTo(0.088, 4);
  });

  it("uniform mode NON popola min/max", () => {
    const m: FEAModel = makeModel();
    const r = applyClimateLoadsToModel(m, sampleBundle, {
      tributaryMode: "uniform",
    });
    expect(r.wind_force_min_kN).toBeUndefined();
    expect(r.wind_force_max_kN).toBeUndefined();
    expect(r.snow_force_min_kN).toBeUndefined();
    expect(r.snow_force_max_kN).toBeUndefined();
  });

  // ============================================================
  // Wind envelope ±X (v1.4.0-alpha.7)
  // ============================================================

  it("wind envelope genera 2 loads per nodo (+axis e -axis)", () => {
    const m: FEAModel = makeModel();
    const r = applyClimateLoadsToModel(m, sampleBundle, {
      windEnvelope: true,
      includeSnow: false,
    });
    // 3 nodi caricabili (estremi vincolati su 5 totali)
    // Per ogni nodo: 2 wind loads (+X e -X) = 6 totale
    expect(r.loads).toHaveLength(6);
    const node2Loads = r.loads.filter((l) => l.target_id === 2);
    expect(node2Loads).toHaveLength(2);
    // Una positiva, una negativa
    const positives = node2Loads.filter((l) => (l.fx ?? 0) > 0);
    const negatives = node2Loads.filter((l) => (l.fx ?? 0) < 0);
    expect(positives).toHaveLength(1);
    expect(negatives).toHaveLength(1);
    expect(Math.abs((positives[0].fx ?? 0) + (negatives[0].fx ?? 0))).toBeCloseTo(0);
    // Label contiene Envelope
    expect(positives[0].label).toContain("Envelope");
    expect(positives[0].label).toContain("+X");
    expect(negatives[0].label).toContain("-X");
  });

  it("wind envelope con +Y inverte su asse Y", () => {
    const m: FEAModel = makeModel();
    const r = applyClimateLoadsToModel(m, sampleBundle, {
      windEnvelope: true,
      windDirection: "+Y",
      includeSnow: false,
    });
    const node2Loads = r.loads.filter((l) => l.target_id === 2);
    expect(node2Loads).toHaveLength(2);
    node2Loads.forEach((l) => {
      expect(l.fx).toBeUndefined();
      expect(l.fy).toBeDefined();
    });
  });

  it("wind envelope=false (default) genera 1 load per nodo", () => {
    const m: FEAModel = makeModel();
    const r = applyClimateLoadsToModel(m, sampleBundle, {
      windEnvelope: false,
      includeSnow: false,
    });
    expect(r.loads).toHaveLength(3); // 3 nodi × 1 wind
  });

  // ============================================================
  // Seismic apply (v1.4.0-alpha.7)
  // ============================================================

  const sampleBundleWithSeismic = {
    ...sampleBundle,
    seismic: {
      location: { lat: 39.23, lon: 9.12, elevation_m: 36, elevation_source: null },
      historical_max_magnitude: 5.0,
      search_radius_km: 100, search_years_back: 100,
      site_params: {
        a_g_over_g: 0.045, F_0: 2.5, T_c_star_s: 0.35,
        soil_category: "B" as const, S: 1.2, C_C: 1.1,
        T_B_s: 0.128, T_C_s: 0.385, T_D_s: 1.78, eta: 1.0, damping_ratio: 0.05,
      },
      spectrum: [], notes: [], gmpe_used: "simplified_italy_2018",
    },
  };

  it("includeSeismic genera 1 Load type=ground_accel model-level", () => {
    const m: FEAModel = makeModel();
    const r = applyClimateLoadsToModel(m, sampleBundleWithSeismic, {
      includeWind: false, includeSnow: false, includeSeismic: true,
    });
    expect(r.loads).toHaveLength(1);
    const seismic = r.loads[0];
    expect(seismic.type).toBe("ground_accel");
    expect(seismic.target_id).toBe(0);
    expect(seismic.direction).toEqual([1, 0, 0]);
    // a_g_over_g = 0.045 × 9.81 = 0.44145 m/s²
    expect(seismic.pressure).toBeCloseTo(0.045 * 9.81, 4);
    expect(seismic.label).toContain("Seismic");
    expect(seismic.label).toContain("soil B");
    expect(r.seismic_a_g_m_s2).toBeCloseTo(0.4415, 4);
  });

  it("includeSeismic=true ma seismic=null nel bundle: no load aggiunto", () => {
    const m: FEAModel = makeModel();
    const r = applyClimateLoadsToModel(m, sampleBundle, {
      includeWind: false, includeSnow: false, includeSeismic: true,
    });
    expect(r.loads).toEqual([]);
    expect(r.seismic_a_g_m_s2).toBeUndefined();
  });

  it("includeSeismic con a_g_over_g=0 non aggiunge load", () => {
    const bundle0 = {
      ...sampleBundleWithSeismic,
      seismic: {
        ...sampleBundleWithSeismic.seismic!,
        site_params: { ...sampleBundleWithSeismic.seismic!.site_params, a_g_over_g: 0 },
      },
    };
    const m: FEAModel = makeModel();
    const r = applyClimateLoadsToModel(m, bundle0, {
      includeWind: false, includeSnow: false, includeSeismic: true,
    });
    expect(r.loads).toEqual([]);
  });

  it("combo: wind + snow + seismic genera tutti", () => {
    const m: FEAModel = makeModel();
    const r = applyClimateLoadsToModel(m, sampleBundleWithSeismic, {
      includeWind: true, includeSnow: true, includeSeismic: true,
    });
    // 3 nodi × 2 (wind+snow) + 1 seismic = 7
    expect(r.loads).toHaveLength(7);
    const seismicLoads = r.loads.filter((l) => l.type === "ground_accel");
    expect(seismicLoads).toHaveLength(1);
    const nodalLoads = r.loads.filter((l) => l.type === "nodal");
    expect(nodalLoads).toHaveLength(6);
  });

  it("envelope + seismic: 6 wind + 3 snow + 1 seismic = 10", () => {
    const m: FEAModel = makeModel();
    const r = applyClimateLoadsToModel(m, sampleBundleWithSeismic, {
      windEnvelope: true, includeSeismic: true,
    });
    // 3 nodi × (2 wind + 1 snow) + 1 seismic = 10
    expect(r.loads).toHaveLength(10);
  });

  // ============================================================
  // Wind 4-direction envelope NTC §3.3.3 (v1.4.0-alpha.10)
  // ============================================================

  it("4-direction: genera 4 wind loads per nodo (+X, -X, +Y, -Y)", () => {
    const m: FEAModel = makeModel();
    const r = applyClimateLoadsToModel(m, sampleBundle, {
      windEnvelope4Direction: true,
      includeSnow: false,
    });
    // 3 nodi × 4 wind = 12 totale
    expect(r.loads).toHaveLength(12);
    const node2Loads = r.loads.filter((l) => l.target_id === 2);
    expect(node2Loads).toHaveLength(4);
    // 1 fx>0, 1 fx<0, 1 fy>0, 1 fy<0
    expect(node2Loads.filter((l) => (l.fx ?? 0) > 0)).toHaveLength(1);
    expect(node2Loads.filter((l) => (l.fx ?? 0) < 0)).toHaveLength(1);
    expect(node2Loads.filter((l) => (l.fy ?? 0) > 0)).toHaveLength(1);
    expect(node2Loads.filter((l) => (l.fy ?? 0) < 0)).toHaveLength(1);
  });

  it("4-direction: tutti gli envelope hanno stessa magnitudo |q×A|", () => {
    const m: FEAModel = makeModel();
    const r = applyClimateLoadsToModel(m, sampleBundle, {
      windEnvelope4Direction: true,
      includeSnow: false,
      tributaryArea: 2.0,
    });
    // magnitudo = q_p × 2 = 0.530 × 2 = 1.060 kN
    const expected = sampleBundle.meteo!.wind.q_p_z10_kN_m2 * 2.0;
    const node2Loads = r.loads.filter((l) => l.target_id === 2);
    for (const l of node2Loads) {
      const m_kN = Math.abs(l.fx ?? l.fy ?? 0);
      expect(m_kN).toBeCloseTo(expected, 4);
    }
  });

  it("4-direction: labels contengono +X, -X, +Y, -Y", () => {
    const m: FEAModel = makeModel();
    const r = applyClimateLoadsToModel(m, sampleBundle, {
      windEnvelope4Direction: true,
      includeSnow: false,
    });
    const labels = r.loads.map((l) => l.label ?? "");
    expect(labels.filter((l) => l.includes("+X")).length).toBeGreaterThan(0);
    expect(labels.filter((l) => l.includes("-X")).length).toBeGreaterThan(0);
    expect(labels.filter((l) => l.includes("+Y")).length).toBeGreaterThan(0);
    expect(labels.filter((l) => l.includes("-Y")).length).toBeGreaterThan(0);
    expect(labels.every((l) => l.includes("Envelope"))).toBe(true);
  });

  it("4-direction sovrascrive windEnvelope (precedenza)", () => {
    const m: FEAModel = makeModel();
    const r = applyClimateLoadsToModel(m, sampleBundle, {
      windEnvelope: true,         // legacy: 2 loads
      windEnvelope4Direction: true, // new: 4 loads (precedenza)
      includeSnow: false,
    });
    // Solo 4-direction prevale: 3 nodi × 4 = 12
    expect(r.loads).toHaveLength(12);
  });

  it("4-direction + snow + seismic: 12 wind + 3 snow + 1 seismic = 16", () => {
    const m: FEAModel = makeModel();
    const r = applyClimateLoadsToModel(m, sampleBundleWithSeismic, {
      windEnvelope4Direction: true,
      includeSeismic: true,
    });
    expect(r.loads).toHaveLength(16);
  });

  it("4-direction conservation: somma loads simmetrica (= 0)", () => {
    // Per ogni nodo, +X e -X si cancellano, +Y e -Y si cancellano.
    // Quindi la somma vettoriale totale = 0 (no spostamento risultante).
    const m: FEAModel = makeModel();
    const r = applyClimateLoadsToModel(m, sampleBundle, {
      windEnvelope4Direction: true,
      includeSnow: false,
    });
    const sumFx = r.loads.reduce((s, l) => s + (l.fx ?? 0), 0);
    const sumFy = r.loads.reduce((s, l) => s + (l.fy ?? 0), 0);
    expect(sumFx).toBeCloseTo(0, 8);
    expect(sumFy).toBeCloseTo(0, 8);
  });
});
