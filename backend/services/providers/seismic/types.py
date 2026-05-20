"""Pydantic v2 DTO per seismic providers (Sprint 2 — F4.4).

Convenzioni:
    magnitude     — momento Mw (USGS preferenza; cataloghi convertiti)
    depth_km      — profondita' ipocentro in km (positivo = sotto superficie)
    time_iso      — ISO8601 UTC "YYYY-MM-DDTHH:MM:SS.sssZ"
    place         — descrizione testuale del luogo (es. "10 km NE of Norcia, Italy")
"""
from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class Earthquake(BaseModel):
    """Singolo evento sismico."""

    id: str               # ID catalogo (es. "us6000abcd")
    time_iso: str         # ISO8601 UTC
    lat: float
    lon: float
    depth_km: float
    magnitude: float
    place: str = ""
    event_type: str = "earthquake"  # earthquake | explosion | quarry | ...
    url: str | None = None
    source: str = "usgs_earthquake"


class SearchQuery(BaseModel):
    """Parametri della query (tracciamento + cache key)."""

    lat: float | None = None
    lon: float | None = None
    max_radius_km: float | None = Field(default=None, ge=0.0)
    years_back: int | None = Field(default=None, ge=1, le=200)
    min_magnitude: float | None = Field(default=None, ge=0.0, le=10.0)
    limit: int = Field(default=1000, ge=1, le=20000)
    event_type: str = "earthquake"


class EarthquakeResult(BaseModel):
    """Risultato search (lista ordinata per tempo decrescente di default)."""

    query: dict[str, Any] = Field(default_factory=dict)
    earthquakes: list[Earthquake] = Field(default_factory=list)
    source: str = "usgs_earthquake"
    count: int = 0  # uguale a len(earthquakes), comodita' per UI
