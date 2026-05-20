"""GeocodingService — facade UI-friendly per forward/reverse geocoding
(Sprint 2 — B1).

Orchestrator F8 → chain "geocoding":
    - search: Open-Meteo primary (veloce, no UA) → Nominatim fallback
    - reverse: NotImplementedError di Open-Meteo → fallback automatico a
      Nominatim (gestito da F8 _RETRYABLE_EXCEPTIONS)

API:
    service.search(query, count=10, language="en") -> GeocodingResult
    service.reverse(lat, lon, language="en")       -> ReverseResult
    service.find_best(query, language="en")        -> Location | None
        (helper convenience che ritorna direttamente il top hit)
"""
from __future__ import annotations

import logging

from pydantic import BaseModel, Field

from ..orchestrator import ServiceOrchestrator, orchestrator as default_orchestrator
from ..providers.geocoding.types import (
    GeocodingResult,
    Location,
    ReverseResult,
)
from ..providers.meteo.errors import (
    ProviderError,
    ProviderUnavailableError,
)


logger = logging.getLogger(__name__)


class GeocodingServiceQuery(BaseModel):
    """Tracciamento input per debugging / tracker."""

    kind: str  # "search" | "reverse"
    query: str | None = None
    lat: float | None = None
    lon: float | None = None
    language: str = "en"
    count: int = 10


class GeocodingService:
    """Facade geocoding sopra orchestrator F8."""

    def __init__(self, orchestrator: ServiceOrchestrator | None = None) -> None:
        self.orchestrator = (
            orchestrator if orchestrator is not None else default_orchestrator
        )

    async def search(
        self,
        query: str,
        count: int = 10,
        language: str = "en",
    ) -> GeocodingResult:
        """Forward geocoding via orchestrator (fallback chain attivo).

        Args:
            query: testo libero (citta', indirizzo, landmark)
            count: numero risultati max [1, 100]
            language: codice ISO-639-1 (en, it, fr, ...)

        Raises:
            ValueError: query vuota o count fuori range
            ProviderUnavailableError: tutti i provider della chain down
        """
        q = (query or "").strip()
        if not q:
            raise ValueError("query non puo' essere vuota")
        if not (1 <= count <= 100):
            raise ValueError(f"count deve essere in [1, 100], ricevuto {count}")

        try:
            result = await self.orchestrator.call(
                "geocoding", "search",
                query=q, count=count, language=language,
            )
        except KeyError as exc:
            raise ProviderUnavailableError(
                "no geocoding providers registered — call register_all() at boot",
                provider="geocoding_service",
            ) from exc
        return result  # type: ignore[no-any-return]

    async def reverse(
        self,
        lat: float,
        lon: float,
        language: str = "en",
    ) -> ReverseResult:
        """Reverse geocoding via orchestrator. Open-Meteo non supporta
        reverse → solleva NotImplementedError → F8 fa fallback a Nominatim.
        """
        if not (-90.0 <= lat <= 90.0):
            raise ValueError(f"lat deve essere in [-90, 90], ricevuto {lat}")
        if not (-180.0 <= lon <= 180.0):
            raise ValueError(f"lon deve essere in [-180, 180], ricevuto {lon}")

        try:
            result = await self.orchestrator.call(
                "geocoding", "reverse",
                lat=lat, lon=lon, language=language,
            )
        except KeyError as exc:
            raise ProviderUnavailableError(
                "no geocoding providers registered — call register_all() at boot",
                provider="geocoding_service",
            ) from exc
        return result  # type: ignore[no-any-return]

    async def find_best(
        self,
        query: str,
        language: str = "en",
    ) -> Location | None:
        """Helper: ritorna il top hit del forward search, o None se vuoto.

        Utile per workflow "user types address, pre-fill lat/lon" UX.
        """
        result = await self.search(query=query, count=1, language=language)
        return result.results[0] if result.results else None


# ---- Singleton ----------------------------------------------------------

service = GeocodingService()
