"""Elevation providers (Sprint 2 — F4.3).

Exports:
    ElevationProvider              — abstract base
    OpenElevationProvider          — open-elevation.com, worldwide, batch
    USGSElevationProvider          — USGS EPQS, US-only, alta precisione
    ElevationPoint, ElevationResult
    (re-export errori da meteo)

Note operative:
    - I bucket "open_elevation" e "usgs_elevation" vengono registrati al
      primo import di questo package (idempotente).
    - Dominio cache "elevation" ha TTL default 10 anni (l'elevazione del
      terreno e' praticamente costante).
"""
from ...rate_limiter import limiter as _limiter
from ..meteo.errors import (
    ProviderError,
    ProviderRateLimitError,
    ProviderTimeoutError,
    ProviderUnavailableError,
)


# Bucket registration idempotente (no-op se gia' registrati).
if not _limiter.has("open_elevation"):
    _limiter.register("open_elevation", rate_per_s=5.0, capacity=10.0)
if not _limiter.has("usgs_elevation"):
    _limiter.register("usgs_elevation", rate_per_s=5.0, capacity=10.0)


from .base import ElevationProvider  # noqa: E402
from .open_elevation import OpenElevationProvider  # noqa: E402
from .types import ElevationPoint, ElevationResult  # noqa: E402
from .usgs_elevation import USGSElevationProvider  # noqa: E402


__all__ = [
    "ElevationProvider",
    "OpenElevationProvider",
    "USGSElevationProvider",
    "ElevationPoint",
    "ElevationResult",
    "ProviderError",
    "ProviderRateLimitError",
    "ProviderUnavailableError",
    "ProviderTimeoutError",
]
