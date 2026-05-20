/**
 * Terrain API — facade endpoint B2 (Sprint 2).
 *
 * POST /api/terrain/batch    — quota per N punti (max 1000)
 * POST /api/terrain/profile  — profilo lungo una linea
 * POST /api/terrain/bbox     — griglia n×n nel bbox
 */
import { api } from "../client";


export interface ElevationPoint {
  lat: number;
  lon: number;
  elevation_m: number;
  source: string;
}

export interface TerrainStatistics {
  n_points: number;
  elevation_min_m: number;
  elevation_max_m: number;
  elevation_mean_m: number;
  elevation_range_m: number;
}

export interface TerrainProfile {
  points: ElevationPoint[];
  stats: TerrainStatistics;
  source_provider: string;
  notes: string[];
}


export async function terrainBatch(
  points: { lat: number; lon: number }[],
): Promise<TerrainProfile> {
  const { data } = await api.post<TerrainProfile>("/api/terrain/batch", { points });
  return data;
}

export async function terrainProfile(
  lat1: number, lon1: number, lat2: number, lon2: number, n_points = 50,
): Promise<TerrainProfile> {
  const { data } = await api.post<TerrainProfile>("/api/terrain/profile", {
    lat1, lon1, lat2, lon2, n_points,
  });
  return data;
}

export async function terrainBbox(
  lat_min: number, lon_min: number,
  lat_max: number, lon_max: number,
  n_grid = 10,
): Promise<TerrainProfile> {
  const { data } = await api.post<TerrainProfile>("/api/terrain/bbox", {
    lat_min, lon_min, lat_max, lon_max, n_grid,
  });
  return data;
}
