"""Tests B1 — REST endpoint /api/geocoding/* (Sprint 2)."""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from services.base import Provider
from services.providers.geocoding.types import (
    GeocodingResult,
    Location,
    ReverseResult,
)
from services.providers.meteo.errors import ProviderError
from services.registry import registry as default_registry


class _MockPrimary(Provider):
    domain = "geocoding"
    name = "mock_primary"

    async def health(self) -> bool:
        return True

    async def search(self, query, count=10, language="en"):
        return GeocodingResult(
            query=query,
            results=[Location(
                name=query, lat=41.9, lon=12.5, country_code="it",
                country="Italy", source=self.name,
            )],
        )

    async def reverse(self, lat, lon, language="en"):
        raise NotImplementedError("primary no reverse")


class _MockFallback(Provider):
    domain = "geocoding"
    name = "mock_fallback"

    async def health(self) -> bool:
        return True

    async def search(self, query, count=10, language="en"):
        return GeocodingResult(query=query, results=[])

    async def reverse(self, lat, lon, language="en"):
        return ReverseResult(
            lat=lat, lon=lon,
            location=Location(
                name=f"Address at {lat},{lon}", lat=lat, lon=lon,
                country_code="it", source=self.name,
            ),
        )


@pytest.fixture
def client(monkeypatch):
    from main import app
    default_registry.clear()
    default_registry.register(_MockPrimary())
    default_registry.register(_MockFallback())
    monkeypatch.setenv("FEAPRO_GEOCODING_FALLBACK", "mock_fallback")
    tc = TestClient(app)
    yield tc
    default_registry.clear()


def test_search_happy_path(client):
    r = client.get("/api/geocoding/search?q=Rome")
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["query"] == "Rome"
    assert len(data["results"]) == 1
    assert data["results"][0]["source"] == "mock_primary"


def test_search_with_count_and_language(client):
    r = client.get("/api/geocoding/search?q=Roma&count=5&language=it")
    assert r.status_code == 200


def test_search_empty_query_422(client):
    r = client.get("/api/geocoding/search?q=")
    assert r.status_code == 422


def test_search_count_out_of_range_422(client):
    r = client.get("/api/geocoding/search?q=Roma&count=0")
    assert r.status_code == 422
    r = client.get("/api/geocoding/search?q=Roma&count=101")
    assert r.status_code == 422


def test_search_no_provider_503():
    from main import app
    default_registry.clear()
    try:
        tc = TestClient(app)
        r = tc.get("/api/geocoding/search?q=Rome")
        assert r.status_code == 503
    finally:
        default_registry.clear()


def test_reverse_falls_back_to_nominatim(client):
    r = client.get("/api/geocoding/reverse?lat=41.9&lon=12.5")
    assert r.status_code == 200
    data = r.json()
    assert data["location"]["source"] == "mock_fallback"


def test_reverse_invalid_lat_422(client):
    r = client.get("/api/geocoding/reverse?lat=91&lon=12.5")
    assert r.status_code == 422


def test_reverse_invalid_lon_422(client):
    r = client.get("/api/geocoding/reverse?lat=41.9&lon=181")
    assert r.status_code == 422


def test_best_returns_top_hit(client):
    r = client.get("/api/geocoding/best?q=Rome")
    assert r.status_code == 200
    data = r.json()
    assert data is not None
    assert data["name"] == "Rome"


def test_best_returns_null_when_empty(monkeypatch):
    """Provider che ritorna lista vuota -> best ritorna None (null)."""
    from main import app

    class _EmptyProvider(Provider):
        domain = "geocoding"
        name = "empty"

        async def health(self) -> bool:
            return True

        async def search(self, query, count=10, language="en"):
            return GeocodingResult(query=query, results=[])

        async def reverse(self, lat, lon, language="en"):
            return ReverseResult(lat=lat, lon=lon, location=None)

    default_registry.clear()
    default_registry.register(_EmptyProvider())
    try:
        tc = TestClient(app)
        r = tc.get("/api/geocoding/best?q=xyzqwerty")
        assert r.status_code == 200
        assert r.json() is None
    finally:
        default_registry.clear()


def test_search_value_error_returns_422():
    """ValueError dal service -> 422."""
    from main import app

    class _ValueErrProvider(Provider):
        domain = "geocoding"
        name = "valerr"

        async def health(self) -> bool:
            return True

        async def search(self, query, count=10, language="en"):
            raise ValueError("bad input")

        async def reverse(self, lat, lon, language="en"):
            return ReverseResult(lat=lat, lon=lon, location=None)

    default_registry.clear()
    default_registry.register(_ValueErrProvider())
    try:
        tc = TestClient(app)
        r = tc.get("/api/geocoding/search?q=Rome")
        assert r.status_code == 422
    finally:
        default_registry.clear()


def test_reverse_no_provider_503():
    from main import app
    default_registry.clear()
    try:
        tc = TestClient(app)
        r = tc.get("/api/geocoding/reverse?lat=41.9&lon=12.5")
        assert r.status_code == 503
    finally:
        default_registry.clear()


def test_reverse_provider_error_502():
    from main import app

    class _ReverseErrProvider(Provider):
        domain = "geocoding"
        name = "revv_err"

        async def health(self) -> bool:
            return True

        async def search(self, query, count=10, language="en"):
            return GeocodingResult(query=query, results=[])

        async def reverse(self, lat, lon, language="en"):
            raise ProviderError("bad", provider="revv_err", status=400)

    default_registry.clear()
    default_registry.register(_ReverseErrProvider())
    try:
        tc = TestClient(app)
        r = tc.get("/api/geocoding/reverse?lat=41.9&lon=12.5")
        assert r.status_code == 502
    finally:
        default_registry.clear()


def test_best_no_provider_503():
    from main import app
    default_registry.clear()
    try:
        tc = TestClient(app)
        r = tc.get("/api/geocoding/best?q=Rome")
        assert r.status_code == 503
    finally:
        default_registry.clear()


def test_best_provider_error_502():
    from main import app

    class _BestErrProvider(Provider):
        domain = "geocoding"
        name = "besterr"

        async def health(self) -> bool:
            return True

        async def search(self, query, count=10, language="en"):
            raise ProviderError("bad", provider="besterr", status=400)

        async def reverse(self, lat, lon, language="en"):
            return ReverseResult(lat=lat, lon=lon, location=None)

    default_registry.clear()
    default_registry.register(_BestErrProvider())
    try:
        tc = TestClient(app)
        r = tc.get("/api/geocoding/best?q=Rome")
        assert r.status_code == 502
    finally:
        default_registry.clear()


def test_search_provider_error_502():
    from main import app

    class _ErrProvider(Provider):
        domain = "geocoding"
        name = "err"

        async def health(self) -> bool:
            return True

        async def search(self, query, count=10, language="en"):
            raise ProviderError("bad", provider="err", status=400)

        async def reverse(self, lat, lon, language="en"):
            return ReverseResult(lat=lat, lon=lon, location=None)

    default_registry.clear()
    default_registry.register(_ErrProvider())
    try:
        tc = TestClient(app)
        r = tc.get("/api/geocoding/search?q=Rome")
        assert r.status_code == 502
    finally:
        default_registry.clear()
