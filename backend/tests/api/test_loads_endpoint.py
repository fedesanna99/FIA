"""Tests B4 — REST endpoint /api/loads/meteo (Sprint 2)."""
from __future__ import annotations

import asyncio
from dataclasses import dataclass

import pytest
from fastapi.testclient import TestClient

from services.base import Provider
from services.orchestrator import orchestrator as default_orchestrator
from services.providers.meteo.errors import (
    ProviderError,
    ProviderUnavailableError,
)
from services.registry import registry as default_registry


@dataclass
class _MockExtremes:
    lat: float = 41.9
    lon: float = 12.5
    years_used: int = 50
    wind_gust_max_ms: float = 25.0
    wind_gust_50y_ms: float = 35.0
    snowfall_max_cm: float = 15.0
    snowfall_50y_cm: float = 30.0
    source: str = "test_meteo"


@dataclass
class _MockElevation:
    lat: float = 41.9
    lon: float = 12.5
    elevation_m: float = 21.0
    source: str = "test_elevation"


class _MockMeteoProvider(Provider):
    domain = "meteo"
    name = "test_meteo"

    async def health(self) -> bool:
        return True

    async def historical_extremes(self, lat, lon, years=80):
        return _MockExtremes(lat=lat, lon=lon, years_used=years)


class _MockElevationProvider(Provider):
    domain = "elevation"
    name = "test_elevation"

    async def health(self) -> bool:
        return True

    async def lookup(self, lat, lon):
        return _MockElevation(lat=lat, lon=lon)


@pytest.fixture
def client():
    """TestClient con mock providers registrati nel singleton."""
    from main import app

    default_registry.clear()
    default_registry.register(_MockMeteoProvider())
    default_registry.register(_MockElevationProvider())

    tc = TestClient(app)
    yield tc
    default_registry.clear()


def test_post_meteo_loads_returns_full_result(client):
    r = client.post(
        "/api/loads/meteo",
        json={"lat": 41.9, "lon": 12.5, "years": 50},
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["location"]["lat"] == pytest.approx(41.9)
    assert data["location"]["lon"] == pytest.approx(12.5)
    assert data["location"]["elevation_m"] == pytest.approx(21.0)
    assert data["wind"]["v_b0_ms"] > 0
    assert data["wind"]["q_b_kN_m2"] > 0
    assert data["wind"]["q_p_z10_kN_m2"] > data["wind"]["q_b_kN_m2"]
    assert data["snow"]["s_k_kN_m2"] > 0
    assert data["snow"]["s_design_kN_m2"] == pytest.approx(
        0.8 * data["snow"]["s_k_kN_m2"], abs=0.001
    )
    assert data["years_used"] == 50


def test_post_meteo_loads_with_explicit_elevation(client):
    r = client.post(
        "/api/loads/meteo",
        json={"lat": 41.9, "lon": 12.5, "elevation_m": 1500.0},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["location"]["elevation_m"] == pytest.approx(1500.0)
    # elevation_source None perche' provider non chiamato
    assert data["location"]["elevation_source"] is None


def test_post_meteo_loads_lat_out_of_range_422(client):
    r = client.post("/api/loads/meteo", json={"lat": 91.0, "lon": 12.5})
    assert r.status_code == 422


def test_post_meteo_loads_lon_out_of_range_422(client):
    r = client.post("/api/loads/meteo", json={"lat": 41.9, "lon": 181.0})
    assert r.status_code == 422


def test_post_meteo_loads_years_out_of_range_422(client):
    r = client.post("/api/loads/meteo", json={"lat": 41.9, "lon": 12.5, "years": 5})
    assert r.status_code == 422
    r = client.post("/api/loads/meteo", json={"lat": 41.9, "lon": 12.5, "years": 100})
    assert r.status_code == 422


def test_post_meteo_loads_invalid_elevation_422(client):
    r = client.post(
        "/api/loads/meteo",
        json={"lat": 41.9, "lon": 12.5, "elevation_m": 10000.0},
    )
    assert r.status_code == 422


def test_post_meteo_loads_no_provider_returns_503():
    """Senza provider registrati -> 503 Service Unavailable."""
    from main import app

    default_registry.clear()  # nessun provider
    try:
        tc = TestClient(app)
        r = tc.post("/api/loads/meteo", json={"lat": 41.9, "lon": 12.5})
        assert r.status_code == 503
    finally:
        default_registry.clear()


def test_post_meteo_loads_provider_error_returns_502():
    """Provider che solleva ProviderError 400 -> endpoint 502."""
    from main import app

    class _FailingMeteo(Provider):
        domain = "meteo"
        name = "failing_meteo"

        async def health(self) -> bool:
            return True

        async def historical_extremes(self, lat, lon, years=80):
            raise ProviderError("bad request upstream", provider="failing_meteo", status=400)

    default_registry.clear()
    default_registry.register(_FailingMeteo())
    try:
        tc = TestClient(app)
        r = tc.post("/api/loads/meteo", json={"lat": 41.9, "lon": 12.5})
        assert r.status_code == 502
    finally:
        default_registry.clear()


def test_post_meteo_loads_missing_required_fields_422(client):
    r = client.post("/api/loads/meteo", json={"lat": 41.9})  # manca lon
    assert r.status_code == 422


def test_post_meteo_loads_defaults_years_to_80():
    """Senza years specificato, usa 80 default."""
    from main import app

    captured = {}

    class _CaptureMeteo(Provider):
        domain = "meteo"
        name = "capture_meteo"

        async def health(self) -> bool:
            return True

        async def historical_extremes(self, lat, lon, years=80):
            captured["years"] = years
            return _MockExtremes(years_used=years)

    default_registry.clear()
    default_registry.register(_CaptureMeteo())
    default_registry.register(_MockElevationProvider())
    try:
        tc = TestClient(app)
        r = tc.post("/api/loads/meteo", json={"lat": 41.9, "lon": 12.5})
        assert r.status_code == 200
        assert captured["years"] == 80
    finally:
        default_registry.clear()
