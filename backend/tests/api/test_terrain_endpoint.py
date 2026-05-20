"""Tests B2 — REST endpoint /api/terrain/* (Sprint 2)."""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from services.base import Provider
from services.providers.elevation.types import ElevationPoint, ElevationResult
from services.providers.meteo.errors import ProviderError
from services.registry import registry as default_registry


class _MockElevationProvider(Provider):
    domain = "elevation"
    name = "mock"

    async def health(self) -> bool:
        return True

    async def lookup(self, lat, lon):
        return ElevationPoint(lat=lat, lon=lon, elevation_m=100 + lat, source=self.name)

    async def lookup_batch(self, points):
        out = [
            ElevationPoint(lat=p[0], lon=p[1], elevation_m=100 + p[0], source=self.name)
            for p in points
        ]
        return ElevationResult(points=out, source=self.name)


@pytest.fixture
def client():
    from main import app
    default_registry.clear()
    default_registry.register(_MockElevationProvider())
    tc = TestClient(app)
    yield tc
    default_registry.clear()


# ---- /batch ---------------------------------------------------------------


def test_batch_happy_path(client):
    r = client.post(
        "/api/terrain/batch",
        json={"points": [{"lat": 41.9, "lon": 12.5}, {"lat": 45.4, "lon": 9.2}]},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["stats"]["n_points"] == 2
    assert len(data["points"]) == 2
    assert data["source_provider"] == "mock"


def test_batch_empty_422(client):
    r = client.post("/api/terrain/batch", json={"points": []})
    assert r.status_code == 422


def test_batch_too_many_422(client):
    pts = [{"lat": 0, "lon": 0}] * 1001
    r = client.post("/api/terrain/batch", json={"points": pts})
    assert r.status_code == 422


def test_batch_lat_out_of_range_422(client):
    r = client.post(
        "/api/terrain/batch",
        json={"points": [{"lat": 91, "lon": 0}]},
    )
    assert r.status_code == 422


def test_batch_no_provider_503():
    from main import app
    default_registry.clear()
    try:
        tc = TestClient(app)
        r = tc.post("/api/terrain/batch", json={"points": [{"lat": 0, "lon": 0}]})
        assert r.status_code == 503
    finally:
        default_registry.clear()


# ---- /profile -------------------------------------------------------------


def test_profile_happy_path(client):
    r = client.post(
        "/api/terrain/profile",
        json={"lat1": 41.0, "lon1": 12.0, "lat2": 42.0, "lon2": 13.0, "n_points": 20},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["stats"]["n_points"] == 20
    # First near (41, 12), last near (42, 13)
    assert data["points"][0]["lat"] == pytest.approx(41.0, abs=0.01)
    assert data["points"][-1]["lat"] == pytest.approx(42.0, abs=0.01)


def test_profile_invalid_n_points_422(client):
    r = client.post(
        "/api/terrain/profile",
        json={"lat1": 0, "lon1": 0, "lat2": 1, "lon2": 1, "n_points": 1},
    )
    assert r.status_code == 422


def test_profile_invalid_coords_422(client):
    r = client.post(
        "/api/terrain/profile",
        json={"lat1": 91, "lon1": 0, "lat2": 1, "lon2": 1},
    )
    assert r.status_code == 422


# ---- /bbox ----------------------------------------------------------------


def test_bbox_happy_path(client):
    r = client.post(
        "/api/terrain/bbox",
        json={
            "lat_min": 41.0, "lon_min": 12.0,
            "lat_max": 42.0, "lon_max": 13.0,
            "n_grid": 5,
        },
    )
    assert r.status_code == 200
    data = r.json()
    assert data["stats"]["n_points"] == 25  # 5x5


def test_bbox_invalid_n_grid_422(client):
    r = client.post(
        "/api/terrain/bbox",
        json={
            "lat_min": 0, "lon_min": 0, "lat_max": 1, "lon_max": 1, "n_grid": 50,
        },
    )
    assert r.status_code == 422


def test_bbox_invalid_corners_422(client):
    """lat_max <= lat_min."""
    r = client.post(
        "/api/terrain/bbox",
        json={
            "lat_min": 2.0, "lon_min": 0, "lat_max": 1.0, "lon_max": 1.0, "n_grid": 5,
        },
    )
    # n_grid valido ma bbox invalido -> ValueError dal service -> 422
    assert r.status_code == 422


def test_bbox_provider_error_502():
    from main import app

    class _ErrProvider(Provider):
        domain = "elevation"
        name = "err"

        async def health(self) -> bool:
            return True

        async def lookup(self, lat, lon):
            raise ProviderError("bad", provider="err", status=400)

        async def lookup_batch(self, points):
            raise ProviderError("bad", provider="err", status=400)

    default_registry.clear()
    default_registry.register(_ErrProvider())
    try:
        tc = TestClient(app)
        r = tc.post(
            "/api/terrain/bbox",
            json={"lat_min": 0, "lon_min": 0, "lat_max": 1, "lon_max": 1, "n_grid": 3},
        )
        assert r.status_code == 502
    finally:
        default_registry.clear()
