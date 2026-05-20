"""Tests B3 — REST endpoint /api/loads/seismic (Sprint 2)."""
from __future__ import annotations

from dataclasses import dataclass

import pytest
from fastapi.testclient import TestClient

from services.base import Provider
from services.providers.meteo.errors import ProviderError
from services.registry import registry as default_registry


@dataclass
class _MockElevation:
    lat: float = 42.79
    lon: float = 13.10
    elevation_m: float = 600.0
    source: str = "test_elevation"


class _MockSeismicProvider(Provider):
    domain = "seismic"
    name = "test_seismic"

    async def health(self) -> bool:
        return True

    async def historical_max_magnitude(
        self, lat: float, lon: float,
        max_radius_km: float = 100.0, years_back: int = 100,
    ) -> float:
        return 6.5  # Norcia-like


class _MockElevationProvider(Provider):
    domain = "elevation"
    name = "test_elevation"

    async def health(self) -> bool:
        return True

    async def lookup(self, lat, lon):
        return _MockElevation(lat=lat, lon=lon)


@pytest.fixture
def client():
    from main import app
    default_registry.clear()
    default_registry.register(_MockSeismicProvider())
    default_registry.register(_MockElevationProvider())
    tc = TestClient(app)
    yield tc
    default_registry.clear()


def test_post_seismic_loads_happy_path(client):
    r = client.post(
        "/api/loads/seismic",
        json={"lat": 42.79, "lon": 13.10},
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["location"]["lat"] == pytest.approx(42.79)
    assert data["historical_max_magnitude"] == 6.5
    assert 0.10 <= data["site_params"]["a_g_over_g"] <= 0.22
    assert data["site_params"]["soil_category"] == "A"
    assert len(data["spectrum"]) == 100
    assert data["gmpe_used"] == "simplified_italy_2018"


def test_post_seismic_with_explicit_params(client):
    r = client.post(
        "/api/loads/seismic",
        json={
            "lat": 42.79, "lon": 13.10,
            "elevation_m": 800.0,
            "max_radius_km": 50.0,
            "years_back": 50,
            "soil_category": "B",
            "F_0": 2.8,
            "T_c_star_s": 0.45,
            "damping_ratio": 0.05,
            "spectrum_n_points": 200,
        },
    )
    assert r.status_code == 200
    data = r.json()
    assert data["location"]["elevation_m"] == 800.0
    assert data["search_radius_km"] == 50.0
    assert data["search_years_back"] == 50
    assert data["site_params"]["soil_category"] == "B"
    assert data["site_params"]["F_0"] == 2.8
    assert data["site_params"]["T_c_star_s"] == 0.45
    assert data["site_params"]["S"] == 1.20  # soil B
    assert len(data["spectrum"]) == 200


def test_post_seismic_lat_out_of_range_422(client):
    r = client.post("/api/loads/seismic", json={"lat": 91.0, "lon": 13.0})
    assert r.status_code == 422


def test_post_seismic_invalid_soil_422(client):
    r = client.post(
        "/api/loads/seismic",
        json={"lat": 42.0, "lon": 13.0, "soil_category": "Z"},
    )
    assert r.status_code == 422


def test_post_seismic_invalid_F_0_422(client):
    r = client.post(
        "/api/loads/seismic",
        json={"lat": 42.0, "lon": 13.0, "F_0": 5.0},  # > 3.5 max
    )
    assert r.status_code == 422


def test_post_seismic_invalid_damping_422(client):
    r = client.post(
        "/api/loads/seismic",
        json={"lat": 42.0, "lon": 13.0, "damping_ratio": 0.5},  # > 0.30
    )
    assert r.status_code == 422


def test_post_seismic_invalid_radius_422(client):
    r = client.post(
        "/api/loads/seismic",
        json={"lat": 42.0, "lon": 13.0, "max_radius_km": 0},
    )
    assert r.status_code == 422


def test_post_seismic_no_provider_503():
    from main import app
    default_registry.clear()
    try:
        tc = TestClient(app)
        r = tc.post("/api/loads/seismic", json={"lat": 42.0, "lon": 13.0})
        assert r.status_code == 503
    finally:
        default_registry.clear()


def test_post_seismic_provider_error_502():
    from main import app

    class _FailingProvider(Provider):
        domain = "seismic"
        name = "failing"

        async def health(self) -> bool:
            return True

        async def historical_max_magnitude(self, **kwargs):
            raise ProviderError("bad upstream", provider="failing", status=400)

    default_registry.clear()
    default_registry.register(_FailingProvider())
    try:
        tc = TestClient(app)
        r = tc.post("/api/loads/seismic", json={"lat": 42.0, "lon": 13.0})
        assert r.status_code == 502
    finally:
        default_registry.clear()


def test_post_seismic_spectrum_structure(client):
    r = client.post("/api/loads/seismic", json={"lat": 42.79, "lon": 13.10})
    assert r.status_code == 200
    spec = r.json()["spectrum"]
    assert len(spec) > 0
    # Ogni punto ha T_s + S_e_over_g
    for pt in spec[:5]:
        assert "T_s" in pt
        assert "S_e_over_g" in pt
        assert pt["T_s"] >= 0
        assert pt["S_e_over_g"] >= 0


def test_post_seismic_notes_present(client):
    r = client.post("/api/loads/seismic", json={"lat": 42.79, "lon": 13.10})
    data = r.json()
    assert "notes" in data
    # Almeno la nota v1.3 estimate
    assert any("v1.3" in n.lower() or "estimate" in n.lower() for n in data["notes"])
