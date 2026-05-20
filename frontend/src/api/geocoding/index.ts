/**
 * Geocoding API — facade endpoint B1 (Sprint 2).
 *
 * GET /api/geocoding/search?q=...      — forward search (chain F8)
 * GET /api/geocoding/reverse?lat=&lon= — reverse (fallback Nominatim)
 * GET /api/geocoding/best?q=...        — top hit only
 */
import { api } from "../client";


export interface Location {
  name: string;
  lat: number;
  lon: number;
  country?: string | null;
  country_code?: string | null;
  admin1?: string | null;
  admin2?: string | null;
  timezone?: string | null;
  population?: number | null;
  elevation?: number | null;
  source: string;
}

export interface GeocodingResult {
  query: string;
  results: Location[];
}

export interface ReverseResult {
  lat: number;
  lon: number;
  location: Location | null;
}


export async function geocodingSearch(
  q: string,
  count = 10,
  language = "en",
): Promise<GeocodingResult> {
  const { data } = await api.get<GeocodingResult>("/api/geocoding/search", {
    params: { q, count, language },
  });
  return data;
}

export async function geocodingReverse(
  lat: number,
  lon: number,
  language = "en",
): Promise<ReverseResult> {
  const { data } = await api.get<ReverseResult>("/api/geocoding/reverse", {
    params: { lat, lon, language },
  });
  return data;
}

export async function geocodingBest(
  q: string,
  language = "en",
): Promise<Location | null> {
  const { data } = await api.get<Location | null>("/api/geocoding/best", {
    params: { q, language },
  });
  return data;
}
