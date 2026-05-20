/**
 * Loads API — facade endpoints B3 + B4 (Sprint 2).
 *
 * POST /api/loads/meteo    — wind + snow design loads (EN 1991-1-4/1-3)
 * POST /api/loads/seismic  — a_g + response spectrum (NTC 2018 §3.2)
 */
import { api } from "../client";


// ---- Common -----------------------------------------------------------

export interface LoadsLocation {
  lat: number;
  lon: number;
  elevation_m: number | null;
  elevation_source?: string | null;
}


// ---- Meteo loads -------------------------------------------------------

export interface WindLoads {
  v_b0_ms: number;
  gust_max_observed_ms: number;
  q_b_kN_m2: number;
  q_p_z10_kN_m2: number;
  c_e_z10: number;
  terrain_category: string;
  gust_factor: number;
  air_density_kg_m3: number;
  source_provider: string;
}

export interface SnowLoads {
  s_k_kN_m2: number;
  snowfall_max_observed_cm: number;
  snow_density_kg_m3: number;
  mu_i_default: number;
  c_e: number;
  c_t: number;
  s_design_kN_m2: number;
  source_provider: string;
}

export interface MeteoLoadsResult {
  location: LoadsLocation;
  wind: WindLoads;
  snow: SnowLoads;
  years_used: number;
  notes: string[];
}

export interface MeteoLoadsRequest {
  lat: number;
  lon: number;
  elevation_m?: number | null;
  years?: number;
}

export async function computeMeteoLoads(req: MeteoLoadsRequest): Promise<MeteoLoadsResult> {
  const { data } = await api.post<MeteoLoadsResult>("/api/loads/meteo", req);
  return data;
}


// ---- Seismic loads -----------------------------------------------------

export type SoilCategory = "A" | "B" | "C" | "D" | "E";

export interface SeismicSiteParams {
  a_g_over_g: number;
  F_0: number;
  T_c_star_s: number;
  soil_category: SoilCategory;
  S: number;
  C_C: number;
  T_B_s: number;
  T_C_s: number;
  T_D_s: number;
  eta: number;
  damping_ratio: number;
}

export interface ResponseSpectrumPoint {
  T_s: number;
  S_e_over_g: number;
}

export interface SeismicLoadsResult {
  location: LoadsLocation;
  historical_max_magnitude: number;
  search_radius_km: number;
  search_years_back: number;
  site_params: SeismicSiteParams;
  spectrum: ResponseSpectrumPoint[];
  notes: string[];
  gmpe_used: string;
}

export interface SeismicLoadsRequest {
  lat: number;
  lon: number;
  elevation_m?: number | null;
  max_radius_km?: number;
  years_back?: number;
  soil_category?: SoilCategory;
  F_0?: number;
  T_c_star_s?: number;
  damping_ratio?: number;
  gmpe_R_km?: number;
  spectrum_n_points?: number;
  spectrum_t_max_s?: number;
}

export async function computeSeismicLoads(
  req: SeismicLoadsRequest,
): Promise<SeismicLoadsResult> {
  const { data } = await api.post<SeismicLoadsResult>("/api/loads/seismic", req);
  return data;
}
