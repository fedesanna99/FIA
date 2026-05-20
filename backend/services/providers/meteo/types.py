"""Pydantic v2 models per meteo provider (Sprint 2 — F4.1).

Tutti i modelli sono `frozen=False` di default (mutabili) ma servono
principalmente come DTO immutabili in pratica. La cache F2 ne serializza
il `.model_dump()` (dict) e ricostruisce via `.model_validate()`.

Convenzioni unita' di misura:
    temp_C            — gradi Celsius
    wind_speed_ms     — m/s (10m AGL)
    wind_gust_ms      — m/s (10m AGL), raffica picco
    precipitation_mm  — mm (somma intervallo)
    snowfall_cm       — cm (somma intervallo)
"""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


HealthStatus = Literal["ok", "degraded", "down"]


class ProviderHealth(BaseModel):
    """Snapshot health di un provider."""

    provider: str
    status: HealthStatus
    latency_ms: float = Field(ge=0.0)
    last_error: str | None = None


# ---- Forecast --------------------------------------------------------------


class HourlyEntry(BaseModel):
    """Singolo bin orario forecast."""

    ts: str  # ISO8601 UTC, "YYYY-MM-DDTHH:MM"
    temp_C: float
    wind_speed_ms: float = Field(ge=0.0)
    wind_gust_ms: float = Field(ge=0.0)
    precipitation_mm: float = Field(ge=0.0)
    snowfall_cm: float = Field(ge=0.0)


class ForecastResult(BaseModel):
    """Forecast multi-giorno aggregato per ora."""

    provider: str
    lat: float
    lon: float
    generated_at: str  # ISO8601 UTC
    days: int = Field(ge=1, le=16)
    hourly: list[HourlyEntry] = Field(default_factory=list)


# ---- Archive --------------------------------------------------------------


class DailyEntry(BaseModel):
    """Singolo giorno archive (ERA5 reanalysis)."""

    date: str  # ISO8601 date "YYYY-MM-DD"
    wind_gust_max_ms: float | None = None
    snowfall_sum_cm: float | None = None


class ArchiveResult(BaseModel):
    """Archive giornaliero per un periodo storico."""

    provider: str
    lat: float
    lon: float
    period_years: int = Field(ge=1, le=85)
    daily: list[DailyEntry] = Field(default_factory=list)


class WindSnowExtremes(BaseModel):
    """Estremi sintetici per design loads (NTC/EC1).

    `*_50y_*` = return period 50 anni stimato via Gumbel Type I sui
    massimi annuali. Per location senza precipitazione nevosa nel
    periodo, `snowfall_50y_cm` ≈ 0.
    """

    lat: float
    lon: float
    years_used: int = Field(ge=1)
    wind_gust_max_ms: float = Field(ge=0.0)
    wind_gust_50y_ms: float = Field(ge=0.0)
    snowfall_max_cm: float = Field(ge=0.0)
    snowfall_50y_cm: float = Field(ge=0.0)
    source: Literal["ERA5"] = "ERA5"
