"""Pydantic v2 DTO per geocoding provider (Sprint 2 — F4.2).

Schema unificato tra Open-Meteo e Nominatim. Ogni provider mappa la
propria response nel formato comune.
"""
from __future__ import annotations

from pydantic import BaseModel, Field


class Location(BaseModel):
    """Singolo risultato geocoding."""

    name: str
    lat: float
    lon: float
    country: str | None = None
    country_code: str | None = None  # ISO-3166 alpha-2, lowercased (es. "it")
    admin1: str | None = None        # Regione/Provincia
    admin2: str | None = None        # Provincia/County (subset)
    timezone: str | None = None
    population: int | None = None
    elevation: float | None = None
    source: str  # provider name (es. "open_meteo_geocoding", "nominatim")


class GeocodingResult(BaseModel):
    """Forward geocoding: query → lista di Location candidate."""

    query: str
    results: list[Location] = Field(default_factory=list)


class ReverseResult(BaseModel):
    """Reverse geocoding: (lat, lon) → singola Location (best match)."""

    lat: float
    lon: float
    location: Location | None = None
