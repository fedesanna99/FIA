"""Meteo providers (Sprint 2 — F4.1).

Exports:
    MeteoProvider                — abstract base (extends services.base.Provider)
    OpenMeteoForecastProvider    — 16-day weather forecast over Europe
    OpenMeteoArchiveProvider     — ERA5 historical extremes (wind, snow)
    ForecastResult, ArchiveResult, WindSnowExtremes, ProviderHealth
    ProviderError, ProviderRateLimitError, ProviderUnavailableError, ProviderTimeoutError

Free non-commercial tier (https://open-meteo.com/en/terms) — no API key.
Upgrade to Standard tier when revenue starts (v1.4).
"""
from .base import MeteoProvider
from .errors import (
    ProviderError,
    ProviderRateLimitError,
    ProviderUnavailableError,
    ProviderTimeoutError,
)
from .open_meteo_archive import OpenMeteoArchiveProvider
from .open_meteo_forecast import OpenMeteoForecastProvider
from .types import (
    ArchiveResult,
    DailyEntry,
    ForecastResult,
    HourlyEntry,
    ProviderHealth,
    WindSnowExtremes,
)

__all__ = [
    "MeteoProvider",
    "OpenMeteoArchiveProvider",
    "OpenMeteoForecastProvider",
    "ProviderError",
    "ProviderRateLimitError",
    "ProviderUnavailableError",
    "ProviderTimeoutError",
    "ForecastResult",
    "ArchiveResult",
    "WindSnowExtremes",
    "HourlyEntry",
    "DailyEntry",
    "ProviderHealth",
]
