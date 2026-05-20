"""Pydantic v2 DTO per elevation providers (Sprint 2 — F4.3).

Convenzioni:
    elevation_m   — metri sopra il livello del mare (geoide WGS84/EGM2008,
                    dipende dal dataset upstream)
    lat/lon       — gradi decimali WGS84
"""
from __future__ import annotations

from pydantic import BaseModel, Field


class ElevationPoint(BaseModel):
    """Singolo punto con elevazione."""

    lat: float
    lon: float
    elevation_m: float
    source: str  # provider name


class ElevationResult(BaseModel):
    """Risultato lookup (single o batch)."""

    points: list[ElevationPoint] = Field(default_factory=list)
    source: str  # provider name
