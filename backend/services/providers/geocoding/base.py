"""GeocodingProvider ABC (Sprint 2 — F4.2).

Eredita da services.base.Provider, dominio fisso "geocoding".
Le sottoclassi concrete implementano:
    search(query, count, language)        -> GeocodingResult
    reverse(lat, lon, language)           -> ReverseResult
    health_check()                         -> ProviderHealth

I provider che non supportano reverse (es. Open-Meteo Geocoding) devono
sollevare `NotImplementedError` con messaggio chiaro.
"""
from __future__ import annotations

from abc import abstractmethod
from typing import Any, ClassVar

from ...base import Provider
from ..meteo.types import ProviderHealth
from .types import GeocodingResult, ReverseResult


class GeocodingProvider(Provider[Any]):
    """Base astratta per provider geocoding."""

    domain: ClassVar[str] = "geocoding"
    name: ClassVar[str] = "_abstract"  # placeholder, vedi MeteoProvider docstring

    @abstractmethod
    async def search(
        self,
        query: str,
        count: int = 10,
        language: str = "en",
    ) -> GeocodingResult:
        """Forward geocoding: cerca location per nome/indirizzo."""
        raise NotImplementedError

    @abstractmethod
    async def reverse(
        self,
        lat: float,
        lon: float,
        language: str = "en",
    ) -> ReverseResult:
        """Reverse geocoding: trova indirizzo da coordinate."""
        raise NotImplementedError

    @abstractmethod
    async def health_check(self) -> ProviderHealth:
        raise NotImplementedError

    async def health(self) -> bool:
        try:
            h = await self.health_check()
        except Exception:
            return False
        return h.status == "ok"
