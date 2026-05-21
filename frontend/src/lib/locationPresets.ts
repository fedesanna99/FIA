/**
 * locationPresets — bundle predefiniti per onboarding/demo rapido.
 *
 * Coprono 5 macro-zone climatiche italiane:
 *   - Roma (centro Italia, sismica moderata, vento medio, neve rara)
 *   - Milano (nord pianura, sismica bassa, neve moderata)
 *   - L'Aquila (centro Appennino, sismica ALTA, neve elevata)
 *   - Cagliari (sud isole, vento alto, sismica bassa, no neve)
 *   - Cortina (Alpi, neve ESTREMA, vento alto, sismica bassa)
 *
 * Valori "indicativi" derivati da computazioni live medie. Per progetto
 * reale, usare LocationPickerDialog → search live (Open-Meteo).
 */
import type { ClimateBundle } from "../store/climateStore";


export interface LocationPreset {
  key: string;
  label: string;
  emoji: string;
  description: string;
  bundle: Omit<ClimateBundle, "computed_at">;
}


const makeBundle = (
  key: string,
  name: string,
  lat: number,
  lon: number,
  elevation: number,
  q_p: number,
  s_d: number,
  a_g: number,
  soil: "A" | "B" | "C" | "D" | "E" = "A",
  gust: number = q_p * 1000 * 1.4 / Math.sqrt(0.625 * 1000) * 0.001,
  snow_cm: number = s_d * 50,
): Omit<ClimateBundle, "computed_at"> => ({
  location: {
    name, lat, lon, country: "Italy", country_code: "it",
    admin1: null, admin2: null, timezone: "Europe/Rome",
    population: null, elevation,
    source: `preset_${key}`,
  },
  elevation_m: elevation,
  meteo: {
    location: { lat, lon, elevation_m: elevation, elevation_source: "preset" },
    wind: {
      v_b0_ms: Math.sqrt(q_p * 1000 / 0.625),
      gust_max_observed_ms: gust,
      q_b_kN_m2: q_p / 1.7,
      q_p_z10_kN_m2: q_p,
      c_e_z10: 1.7,
      terrain_category: "II",
      gust_factor: 1.4,
      air_density_kg_m3: 1.25,
      source_provider: "preset",
    },
    snow: {
      s_k_kN_m2: s_d / 0.8,
      snowfall_max_observed_cm: snow_cm,
      snow_density_kg_m3: 200,
      mu_i_default: 0.8,
      c_e: 1.0,
      c_t: 1.0,
      s_design_kN_m2: s_d,
      source_provider: "preset",
    },
    years_used: 50, notes: ["Preset indicativo — per progetto usa search live"],
  },
  seismic: {
    location: { lat, lon, elevation_m: elevation, elevation_source: null },
    historical_max_magnitude: a_g > 0.15 ? 6.5 : a_g > 0.08 ? 5.5 : 4.5,
    search_radius_km: 100, search_years_back: 100,
    site_params: {
      a_g_over_g: a_g,
      F_0: 2.5, T_c_star_s: 0.35,
      soil_category: soil,
      S: soil === "A" ? 1.0 : soil === "B" ? 1.2 : soil === "C" ? 1.5 : soil === "D" ? 1.8 : 1.6,
      C_C: soil === "A" ? 1.0 : soil === "B" ? 1.1 : soil === "C" ? 1.05 : soil === "D" ? 1.25 : 1.15,
      T_B_s: 0.117, T_C_s: 0.35, T_D_s: 4 * a_g + 1.6, eta: 1.0, damping_ratio: 0.05,
    },
    spectrum: [], notes: ["Preset indicativo"], gmpe_used: "preset",
  },
});


export const LOCATION_PRESETS: LocationPreset[] = [
  {
    key: "roma",
    label: "Roma centro",
    emoji: "🏛️",
    description: "Lazio · sismica moderata · vento medio · neve rara",
    bundle: makeBundle("roma", "Roma centro", 41.90, 12.50, 21, 0.40, 0.10, 0.10, "B"),
  },
  {
    key: "milano",
    label: "Milano Duomo",
    emoji: "⛪",
    description: "Lombardia · sismica bassa · neve moderata",
    bundle: makeBundle("milano", "Milano Duomo", 45.46, 9.19, 122, 0.32, 0.50, 0.05, "C"),
  },
  {
    key: "laquila",
    label: "L'Aquila",
    emoji: "🌋",
    description: "Abruzzo · sismica ALTA · neve appenninica",
    bundle: makeBundle("laquila", "L'Aquila", 42.35, 13.40, 720, 0.45, 1.20, 0.30, "B"),
  },
  {
    key: "cagliari",
    label: "Cagliari porto",
    emoji: "⛵",
    description: "Sardegna · vento alto · sismica bassa · no neve",
    bundle: makeBundle("cagliari", "Cagliari porto", 39.21, 9.11, 6, 0.55, 0.02, 0.04, "B"),
  },
  {
    key: "cortina",
    label: "Cortina d'Ampezzo",
    emoji: "⛷️",
    description: "Dolomiti · neve estrema · vento alto · sismica moderata",
    bundle: makeBundle("cortina", "Cortina d'Ampezzo", 46.54, 12.13, 1224, 0.35, 1.80, 0.10, "B"),
  },
];
