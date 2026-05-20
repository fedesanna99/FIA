"""Tests B2 — TerrainService (Sprint 2)."""
from __future__ import annotations

import asyncio

import pytest

from services.base import Provider
from services.facades.terrain import (
    TerrainProfile,
    TerrainService,
    TerrainStatistics,
    compute_terrain_stats,
    generate_bbox_grid,
    interpolate_line,
)
from services.orchestrator import ServiceOrchestrator
from services.providers.elevation.types import ElevationPoint, ElevationResult
from services.providers.meteo.errors import (
    ProviderError,
    ProviderUnavailableError,
)
from services.registry import ProviderRegistry


# ============================================================================
# Helper puri
# ============================================================================


def test_compute_stats_empty():
    s = compute_terrain_stats([])
    assert s.n_points == 0
    assert s.elevation_min_m == 0.0
    assert s.elevation_max_m == 0.0
    assert s.elevation_mean_m == 0.0
    assert s.elevation_range_m == 0.0


def test_compute_stats_single_point():
    pts = [ElevationPoint(lat=0, lon=0, elevation_m=42.0, source="x")]
    s = compute_terrain_stats(pts)
    assert s.n_points == 1
    assert s.elevation_min_m == 42.0
    assert s.elevation_max_m == 42.0
    assert s.elevation_mean_m == 42.0
    assert s.elevation_range_m == 0.0


def test_compute_stats_multiple_points():
    pts = [
        ElevationPoint(lat=0, lon=0, elevation_m=10, source="x"),
        ElevationPoint(lat=0, lon=0, elevation_m=20, source="x"),
        ElevationPoint(lat=0, lon=0, elevation_m=30, source="x"),
    ]
    s = compute_terrain_stats(pts)
    assert s.n_points == 3
    assert s.elevation_min_m == 10.0
    assert s.elevation_max_m == 30.0
    assert s.elevation_mean_m == 20.0
    assert s.elevation_range_m == 20.0


def test_compute_stats_negative_elevations():
    """Death Valley, Dead Sea, etc. — quote negative valide."""
    pts = [
        ElevationPoint(lat=0, lon=0, elevation_m=-86, source="x"),
        ElevationPoint(lat=0, lon=0, elevation_m=-10, source="x"),
    ]
    s = compute_terrain_stats(pts)
    assert s.elevation_min_m == -86.0
    assert s.elevation_range_m == 76.0


# ---- interpolate_line ----------------------------------------------------


def test_interpolate_line_returns_n_points():
    pts = interpolate_line(0, 0, 1, 1, n_points=5)
    assert len(pts) == 5
    assert pts[0] == (0.0, 0.0)
    assert pts[-1] == pytest.approx((1.0, 1.0), abs=1e-10)


def test_interpolate_line_midpoint_correct():
    pts = interpolate_line(0, 0, 10, 20, n_points=3)
    assert len(pts) == 3
    # Midpoint = (5, 10)
    assert pts[1] == pytest.approx((5.0, 10.0), abs=1e-9)


def test_interpolate_line_n_points_invalid():
    with pytest.raises(ValueError):
        interpolate_line(0, 0, 1, 1, n_points=1)
    with pytest.raises(ValueError):
        interpolate_line(0, 0, 1, 1, n_points=10000)


def test_interpolate_line_min_two_points():
    """n_points=2 ritorna solo gli endpoints."""
    pts = interpolate_line(0, 0, 1, 1, n_points=2)
    assert len(pts) == 2
    assert pts[0] == (0.0, 0.0)
    assert pts[1] == pytest.approx((1.0, 1.0), abs=1e-10)


# ---- generate_bbox_grid --------------------------------------------------


def test_generate_bbox_grid_returns_n_squared():
    grid = generate_bbox_grid(0, 0, 1, 1, n_grid=4)
    assert len(grid) == 16  # 4x4


def test_generate_bbox_grid_corners_match():
    grid = generate_bbox_grid(0, 0, 1, 1, n_grid=2)
    # 2x2: 4 corners
    assert grid[0] == (0.0, 0.0)
    assert grid[1] == pytest.approx((0.0, 1.0), abs=1e-10)
    assert grid[2] == pytest.approx((1.0, 0.0), abs=1e-10)
    assert grid[3] == pytest.approx((1.0, 1.0), abs=1e-10)


def test_generate_bbox_grid_invalid_n_grid():
    with pytest.raises(ValueError):
        generate_bbox_grid(0, 0, 1, 1, n_grid=1)
    with pytest.raises(ValueError):
        generate_bbox_grid(0, 0, 1, 1, n_grid=100)


def test_generate_bbox_grid_invalid_bbox():
    """lat_max <= lat_min -> ValueError."""
    with pytest.raises(ValueError):
        generate_bbox_grid(1.0, 0, 0.5, 1.0, n_grid=3)
    with pytest.raises(ValueError):
        generate_bbox_grid(0, 1.0, 1.0, 0.5, n_grid=3)


# ============================================================================
# Service E2E
# ============================================================================


class _MockElevationProvider(Provider):
    domain = "elevation"
    name = "mock_elevation"

    def __init__(self, base_elev: float = 100.0, raise_exc=None):
        self.base_elev = base_elev
        self.raise_exc = raise_exc

    async def health(self) -> bool:
        return True

    async def lookup(self, lat: float, lon: float):
        if self.raise_exc is not None:
            raise self.raise_exc
        return ElevationPoint(
            lat=lat, lon=lon, elevation_m=self.base_elev + lat,
            source=self.name,
        )

    async def lookup_batch(self, points: list[tuple[float, float]]):
        if self.raise_exc is not None:
            raise self.raise_exc
        # Simula elevation = base + lat (deterministico)
        out = [
            ElevationPoint(
                lat=lat, lon=lon, elevation_m=self.base_elev + lat,
                source=self.name,
            )
            for (lat, lon) in points
        ]
        return ElevationResult(points=out, source=self.name)


@pytest.fixture
def svc_with_mock():
    reg = ProviderRegistry()
    reg.register(_MockElevationProvider(base_elev=100.0))
    orch = ServiceOrchestrator(registry=reg)
    return TerrainService(orchestrator=orch)


# ---- lookup_points -------------------------------------------------------


def test_lookup_points_returns_profile(svc_with_mock):
    pts = [(41.9, 12.5), (45.4, 9.2), (40.85, 14.27)]
    r = asyncio.run(svc_with_mock.lookup_points(pts))
    assert isinstance(r, TerrainProfile)
    assert r.stats.n_points == 3
    assert len(r.points) == 3
    # base_elev + lat -> [141.9, 145.4, 140.85]
    assert r.stats.elevation_min_m == pytest.approx(140.85, abs=0.01)
    assert r.stats.elevation_max_m == pytest.approx(145.4, abs=0.01)
    assert r.source_provider == "mock_elevation"


def test_lookup_points_empty_raises():
    svc = TerrainService()
    with pytest.raises(ValueError):
        asyncio.run(svc.lookup_points([]))


def test_lookup_points_too_many_raises(svc_with_mock):
    too_many = [(0.0, 0.0)] * 1001
    with pytest.raises(ValueError):
        asyncio.run(svc_with_mock.lookup_points(too_many))


def test_lookup_points_invalid_coords_raise(svc_with_mock):
    with pytest.raises(ValueError):
        asyncio.run(svc_with_mock.lookup_points([(91.0, 0.0)]))
    with pytest.raises(ValueError):
        asyncio.run(svc_with_mock.lookup_points([(0.0, 181.0)]))


def test_lookup_points_no_provider():
    reg = ProviderRegistry()
    orch = ServiceOrchestrator(registry=reg)
    svc = TerrainService(orchestrator=orch)
    with pytest.raises(ProviderUnavailableError):
        asyncio.run(svc.lookup_points([(0.0, 0.0)]))


def test_lookup_points_provider_error_propagates():
    reg = ProviderRegistry()
    reg.register(_MockElevationProvider(
        raise_exc=ProviderError("bad", provider="mock", status=400)
    ))
    orch = ServiceOrchestrator(registry=reg)
    svc = TerrainService(orchestrator=orch)
    with pytest.raises(ProviderError):
        asyncio.run(svc.lookup_points([(0.0, 0.0)]))


# ---- profile_along_line --------------------------------------------------


def test_profile_along_line_returns_n_points(svc_with_mock):
    r = asyncio.run(svc_with_mock.profile_along_line(
        lat1=41.0, lon1=12.0, lat2=42.0, lon2=13.0, n_points=10
    ))
    assert r.stats.n_points == 10
    assert len(r.points) == 10
    # First point near start (41, 12)
    assert r.points[0].lat == pytest.approx(41.0, abs=0.01)
    # Last point near end (42, 13)
    assert r.points[-1].lat == pytest.approx(42.0, abs=0.01)


def test_profile_along_line_min_2_points(svc_with_mock):
    r = asyncio.run(svc_with_mock.profile_along_line(
        lat1=0, lon1=0, lat2=1, lon2=1, n_points=2,
    ))
    assert r.stats.n_points == 2


def test_profile_along_line_invalid_n_points(svc_with_mock):
    with pytest.raises(ValueError):
        asyncio.run(svc_with_mock.profile_along_line(0, 0, 1, 1, n_points=1))


# ---- bbox_statistics -----------------------------------------------------


def test_bbox_statistics_returns_grid(svc_with_mock):
    r = asyncio.run(svc_with_mock.bbox_statistics(
        lat_min=41.0, lon_min=12.0, lat_max=42.0, lon_max=13.0, n_grid=5,
    ))
    assert r.stats.n_points == 25  # 5x5
    assert len(r.points) == 25


def test_bbox_statistics_invalid_bbox(svc_with_mock):
    with pytest.raises(ValueError):
        asyncio.run(svc_with_mock.bbox_statistics(
            lat_min=2.0, lon_min=0, lat_max=1.0, lon_max=1.0, n_grid=3,
        ))


def test_bbox_statistics_n_grid_limit(svc_with_mock):
    with pytest.raises(ValueError):
        asyncio.run(svc_with_mock.bbox_statistics(0, 0, 1, 1, n_grid=50))


# ---- singleton + misc ----------------------------------------------------


def test_singleton_uses_default_orchestrator():
    svc = TerrainService()
    from services.orchestrator import orchestrator as default_orch
    assert svc.orchestrator is default_orch


def test_module_singleton_exists():
    from services.facades.terrain import service
    assert isinstance(service, TerrainService)


def test_max_batch_points_constant():
    assert TerrainService.MAX_BATCH_POINTS == 1000


def test_profile_serializes_to_dict(svc_with_mock):
    r = asyncio.run(svc_with_mock.lookup_points([(41.0, 12.0), (42.0, 13.0)]))
    d = r.model_dump()
    assert "points" in d
    assert "stats" in d
    assert "source_provider" in d
    assert d["stats"]["n_points"] == 2


def test_terrain_profile_provider_returns_truncated_adds_note():
    """Se il provider ritorna meno punti di quelli richiesti -> note."""
    class _TruncatingProvider(Provider):
        domain = "elevation"
        name = "truncating"

        async def health(self) -> bool:
            return True

        async def lookup(self, lat, lon):
            return ElevationPoint(lat=lat, lon=lon, elevation_m=0, source=self.name)

        async def lookup_batch(self, points):
            # Ritorna solo i primi 2 anche se ne chiedi di piu'
            out = [
                ElevationPoint(lat=p[0], lon=p[1], elevation_m=10, source=self.name)
                for p in points[:2]
            ]
            return ElevationResult(points=out, source=self.name)

    reg = ProviderRegistry()
    reg.register(_TruncatingProvider())
    orch = ServiceOrchestrator(registry=reg)
    svc = TerrainService(orchestrator=orch)
    r = asyncio.run(svc.lookup_points([(0, 0), (1, 1), (2, 2)]))
    assert any("returned" in n.lower() for n in r.notes)
