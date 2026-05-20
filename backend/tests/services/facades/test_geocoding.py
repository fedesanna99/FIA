"""Tests B1 — GeocodingService (Sprint 2)."""
from __future__ import annotations

import asyncio

import pytest

from services.base import Provider
from services.facades.geocoding import GeocodingService
from services.orchestrator import ServiceOrchestrator
from services.providers.geocoding.types import (
    GeocodingResult,
    Location,
    ReverseResult,
)
from services.providers.meteo.errors import (
    ProviderError,
    ProviderUnavailableError,
)
from services.registry import ProviderRegistry


# ---- Mock providers -------------------------------------------------------


class _MockGeocodingPrimary(Provider):
    """Open-Meteo style: supporta search ma NON reverse."""

    domain = "geocoding"
    name = "mock_primary"

    def __init__(self, results=None, raise_exc=None):
        # NB: usare `is None` perche' lista vuota e' un input valido
        # (test "no results found")
        if results is None:
            results = [
                Location(name="Rome", lat=41.9, lon=12.5, country_code="it",
                         country="Italy", source="mock_primary"),
            ]
        self.results = results
        self.raise_exc = raise_exc

    async def health(self) -> bool:
        return True

    async def search(self, query: str, count: int = 10, language: str = "en"):
        if self.raise_exc is not None:
            raise self.raise_exc
        return GeocodingResult(query=query, results=self.results[:count])

    async def reverse(self, lat: float, lon: float, language: str = "en"):
        # Open-Meteo style: NotImplementedError -> F8 fallback
        raise NotImplementedError("primary non supporta reverse")


class _MockGeocodingFallback(Provider):
    """Nominatim style: supporta sia search che reverse."""

    domain = "geocoding"
    name = "mock_fallback"

    def __init__(self, results=None, reverse_loc=None, raise_exc=None):
        self.results = results or [
            Location(name="Rome (fallback)", lat=41.9, lon=12.5,
                     country_code="it", source="mock_fallback"),
        ]
        self.reverse_loc = reverse_loc
        self.raise_exc = raise_exc

    async def health(self) -> bool:
        return True

    async def search(self, query: str, count: int = 10, language: str = "en"):
        if self.raise_exc is not None:
            raise self.raise_exc
        return GeocodingResult(query=query, results=self.results[:count])

    async def reverse(self, lat: float, lon: float, language: str = "en"):
        if self.raise_exc is not None:
            raise self.raise_exc
        return ReverseResult(
            lat=lat, lon=lon,
            location=self.reverse_loc or Location(
                name="Reverse Rome", lat=lat, lon=lon, country_code="it",
                source="mock_fallback",
            ),
        )


@pytest.fixture
def svc_default(monkeypatch):
    """Service con primary + fallback configurati nella chain."""
    reg = ProviderRegistry()
    reg.register(_MockGeocodingPrimary())
    reg.register(_MockGeocodingFallback())
    monkeypatch.setenv("FEAPRO_GEOCODING_FALLBACK", "mock_fallback")
    orch = ServiceOrchestrator(registry=reg)
    return GeocodingService(orchestrator=orch)


# ---- search ---------------------------------------------------------------


def test_search_returns_primary_results(svc_default):
    r = asyncio.run(svc_default.search("Rome"))
    assert r.query == "Rome"
    assert len(r.results) == 1
    assert r.results[0].source == "mock_primary"


def test_search_falls_back_when_primary_unavailable(monkeypatch):
    reg = ProviderRegistry()
    reg.register(_MockGeocodingPrimary(
        raise_exc=ProviderUnavailableError("5xx", provider="mock_primary")
    ))
    reg.register(_MockGeocodingFallback())
    monkeypatch.setenv("FEAPRO_GEOCODING_FALLBACK", "mock_fallback")
    orch = ServiceOrchestrator(registry=reg)
    svc = GeocodingService(orchestrator=orch)

    r = asyncio.run(svc.search("Rome"))
    assert r.results[0].source == "mock_fallback"


def test_search_empty_query_raises():
    svc = GeocodingService()
    with pytest.raises(ValueError):
        asyncio.run(svc.search(""))
    with pytest.raises(ValueError):
        asyncio.run(svc.search("   "))


def test_search_invalid_count_raises():
    svc = GeocodingService()
    with pytest.raises(ValueError):
        asyncio.run(svc.search("Rome", count=0))
    with pytest.raises(ValueError):
        asyncio.run(svc.search("Rome", count=101))


def test_search_no_provider_raises_unavailable():
    reg = ProviderRegistry()
    orch = ServiceOrchestrator(registry=reg)
    svc = GeocodingService(orchestrator=orch)
    with pytest.raises(ProviderUnavailableError):
        asyncio.run(svc.search("Rome"))


def test_search_propagates_value_error_from_provider():
    """ValueError dal provider NON e' retryable -> propaga."""
    reg = ProviderRegistry()
    reg.register(_MockGeocodingPrimary(raise_exc=ValueError("bad")))
    reg.register(_MockGeocodingFallback())
    orch = ServiceOrchestrator(registry=reg)
    svc = GeocodingService(orchestrator=orch)
    with pytest.raises(ValueError):
        asyncio.run(svc.search("Rome"))


# ---- reverse --------------------------------------------------------------


def test_reverse_falls_back_to_nominatim(svc_default):
    """Primary solleva NotImplementedError → F8 fallback a Nominatim."""
    r = asyncio.run(svc_default.reverse(lat=41.9, lon=12.5))
    assert r.location is not None
    assert r.location.source == "mock_fallback"
    assert r.lat == 41.9


def test_reverse_invalid_lat_raises():
    svc = GeocodingService()
    with pytest.raises(ValueError):
        asyncio.run(svc.reverse(lat=91, lon=12.5))
    with pytest.raises(ValueError):
        asyncio.run(svc.reverse(lat=-91, lon=12.5))


def test_reverse_invalid_lon_raises():
    svc = GeocodingService()
    with pytest.raises(ValueError):
        asyncio.run(svc.reverse(lat=41.9, lon=181))
    with pytest.raises(ValueError):
        asyncio.run(svc.reverse(lat=41.9, lon=-181))


def test_reverse_no_provider_raises_unavailable():
    reg = ProviderRegistry()
    orch = ServiceOrchestrator(registry=reg)
    svc = GeocodingService(orchestrator=orch)
    with pytest.raises(ProviderUnavailableError):
        asyncio.run(svc.reverse(lat=41.9, lon=12.5))


def test_reverse_with_only_primary_fails(monkeypatch):
    """Senza fallback (solo primary che NotImplemented) -> AllProvidersFailed."""
    reg = ProviderRegistry()
    reg.register(_MockGeocodingPrimary())
    # NO fallback registrato
    orch = ServiceOrchestrator(registry=reg)
    svc = GeocodingService(orchestrator=orch)
    # F8 prova primary -> NotImplementedError -> chain finita -> AllProvidersFailed
    # (AllProvidersFailedError extends ProviderUnavailableError)
    with pytest.raises(ProviderUnavailableError):
        asyncio.run(svc.reverse(lat=41.9, lon=12.5))


# ---- find_best ------------------------------------------------------------


def test_find_best_returns_top_hit(svc_default):
    loc = asyncio.run(svc_default.find_best("Rome"))
    assert loc is not None
    assert loc.name == "Rome"


def test_find_best_returns_none_when_empty():
    reg = ProviderRegistry()
    # Provider che ritorna risultati vuoti
    reg.register(_MockGeocodingPrimary(results=[]))
    orch = ServiceOrchestrator(registry=reg)
    svc = GeocodingService(orchestrator=orch)
    loc = asyncio.run(svc.find_best("xyzqwerty"))
    assert loc is None


def test_find_best_invalid_query_raises():
    svc = GeocodingService()
    with pytest.raises(ValueError):
        asyncio.run(svc.find_best(""))


# ---- singleton ------------------------------------------------------------


def test_singleton_uses_default_orchestrator():
    from services.orchestrator import orchestrator as default_orch
    svc = GeocodingService()
    assert svc.orchestrator is default_orch


def test_module_singleton_exists():
    from services.facades.geocoding import service
    assert isinstance(service, GeocodingService)
