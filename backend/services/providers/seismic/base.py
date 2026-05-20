"""SeismicProvider ABC (Sprint 2 — F4.4).

Eredita da services.base.Provider, dominio "seismic".

Concrete subclass implementano:
    search_nearby(lat, lon, ...)            -> EarthquakeResult
    historical_max_magnitude(lat, lon, ...) -> float
    health_check()                           -> ProviderHealth
"""
from __future__ import annotations

from abc import abstractmethod
from typing import Any, ClassVar

from ...base import Provider
from ..meteo.types import ProviderHealth
from .types import EarthquakeResult


class SeismicProvider(Provider[Any]):
    """Base astratta per provider catalogo sismico."""

    domain: ClassVar[str] = "seismic"
    name: ClassVar[str] = "_abstract"  # placeholder; vedi MeteoProvider docstring

    @abstractmethod
    async def search_nearby(
        self,
        lat: float,
        lon: float,
        max_radius_km: float = 200.0,
        years_back: int = 50,
        min_magnitude: float = 4.0,
        limit: int = 1000,
    ) -> EarthquakeResult:
        """Eventi sismici entro `max_radius_km` da (lat, lon) negli ultimi
        `years_back` anni, con magnitudo >= `min_magnitude`.

        Ordinati per tempo decrescente (piu' recente prima).
        """
        raise NotImplementedError

    @abstractmethod
    async def historical_max_magnitude(
        self,
        lat: float,
        lon: float,
        max_radius_km: float = 100.0,
        years_back: int = 100,
    ) -> float:
        """Magnitudo massima storica entro radius/anni. 0.0 se nessun evento."""
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
