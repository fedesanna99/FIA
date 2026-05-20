"""Seismic providers (Sprint 2 — F4.4).

Exports:
    SeismicProvider          — abstract base
    USGSEarthquakeProvider   — USGS FDSN earthquake catalog (worldwide)
    Earthquake, EarthquakeResult, SearchQuery
    (re-export errori da meteo)

USGS Earthquake catalog: free, no API key.
Bucket `usgs_earthquake` (0.5 rps) gia' pre-registrato in services.rate_limiter
(Sprint 1 F3) — non serve registrazione qui.
"""
from ..meteo.errors import (
    ProviderError,
    ProviderRateLimitError,
    ProviderTimeoutError,
    ProviderUnavailableError,
)
from .base import SeismicProvider
from .types import Earthquake, EarthquakeResult, SearchQuery
from .usgs_earthquake import USGSEarthquakeProvider


__all__ = [
    "SeismicProvider",
    "USGSEarthquakeProvider",
    "Earthquake",
    "EarthquakeResult",
    "SearchQuery",
    "ProviderError",
    "ProviderRateLimitError",
    "ProviderUnavailableError",
    "ProviderTimeoutError",
]
