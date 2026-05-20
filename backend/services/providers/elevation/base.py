"""ElevationProvider ABC (Sprint 2 — F4.3).

Eredita da services.base.Provider, dominio "elevation".

Concrete subclass implementano:
    lookup(lat, lon)              -> ElevationPoint
    lookup_batch(points)          -> ElevationResult       (opt-in)
    health_check()                -> ProviderHealth

Provider che non supportano batch nativo (es. USGS) ricadono su un loop
sequenziale in `lookup_batch` (gia' implementato qui come default
concreto sotto la firma astratta).
"""
from __future__ import annotations

from abc import abstractmethod
from typing import Any, ClassVar

from ...base import Provider
from ..meteo.types import ProviderHealth
from .types import ElevationPoint, ElevationResult


class ElevationProvider(Provider[Any]):
    """Base astratta per provider elevation."""

    domain: ClassVar[str] = "elevation"
    name: ClassVar[str] = "_abstract"  # placeholder; vedi MeteoProvider docstring

    @abstractmethod
    async def lookup(self, lat: float, lon: float) -> ElevationPoint:
        """Elevazione per un singolo punto."""
        raise NotImplementedError

    async def lookup_batch(
        self,
        points: list[tuple[float, float]],
    ) -> ElevationResult:
        """Elevazione per N punti. Default: loop su `lookup()` sequenziale.

        Sottoclassi che supportano batch nativo possono override (es.
        OpenElevationProvider con POST `locations`).
        """
        out: list[ElevationPoint] = []
        for lat, lon in points:
            out.append(await self.lookup(lat, lon))
        return ElevationResult(points=out, source=self.name)

    @abstractmethod
    async def health_check(self) -> ProviderHealth:
        raise NotImplementedError

    async def health(self) -> bool:
        try:
            h = await self.health_check()
        except Exception:
            return False
        return h.status == "ok"
