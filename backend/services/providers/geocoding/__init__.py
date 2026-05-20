"""Geocoding providers (Sprint 2 — F4.2).

Exports:
    GeocodingProvider              — abstract base
    OpenMeteoGeocodingProvider     — search by name, no API key, fast EU coverage
    NominatimProvider              — search + reverse, OSM data, User-Agent required
    GeocodingResult, Location, ReverseResult
    (re-exports da meteo: ProviderError, ProviderRateLimitError, ProviderUnavailableError, ProviderTimeoutError)

Open-Meteo Geocoding: free non-commercial, no key.
Nominatim (OSM): free, richiede User-Agent identificativo, 1 rps strict.
"""
from ..meteo.errors import (
    ProviderError,
    ProviderRateLimitError,
    ProviderTimeoutError,
    ProviderUnavailableError,
)
from .base import GeocodingProvider
from .nominatim import NominatimProvider
from .open_meteo_geocoding import OpenMeteoGeocodingProvider
from .types import GeocodingResult, Location, ReverseResult


__all__ = [
    "GeocodingProvider",
    "OpenMeteoGeocodingProvider",
    "NominatimProvider",
    "GeocodingResult",
    "Location",
    "ReverseResult",
    "ProviderError",
    "ProviderRateLimitError",
    "ProviderUnavailableError",
    "ProviderTimeoutError",
]
