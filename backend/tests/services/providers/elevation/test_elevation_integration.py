"""Integration tests Elevation providers (Sprint 2 — F4.3).

Marker `@pytest.mark.slow` — eseguiti solo con `pytest -m slow`.
"""
from __future__ import annotations

import asyncio
from pathlib import Path

import pytest

from services.cache import ServiceCache
from services.providers.elevation.open_elevation import OpenElevationProvider
from services.providers.elevation.usgs_elevation import USGSElevationProvider
from services.providers.meteo.errors import ProviderError
from services.rate_limiter import RateLimiter


def _make_cache(tmp_path: Path) -> ServiceCache:
    return ServiceCache(db_path=tmp_path / "elevation-integration.sqlite")


def _open_elevation_limiter() -> RateLimiter:
    rl = RateLimiter()
    rl.register("open_elevation", rate_per_s=5.0, capacity=10.0)
    return rl


def _usgs_limiter() -> RateLimiter:
    rl = RateLimiter()
    rl.register("usgs_elevation", rate_per_s=5.0, capacity=10.0)
    return rl


# ---- Open-Elevation -------------------------------------------------------


@pytest.mark.slow
def test_real_open_elevation_roma(tmp_path):
    """Roma centro storico ~ 20-30 m s.l.m."""
    provider = OpenElevationProvider(
        cache=_make_cache(tmp_path), rate_limiter=_open_elevation_limiter()
    )

    async def run():
        return await provider.lookup(lat=41.9, lon=12.5)

    p = asyncio.run(run())
    # SANITY: Roma 0-100 m. Non aggiustare al ribasso se fuori range.
    assert 0.0 < p.elevation_m < 200.0


@pytest.mark.slow
def test_real_open_elevation_mont_blanc(tmp_path):
    """Monte Bianco ~ 4810 m."""
    provider = OpenElevationProvider(
        cache=_make_cache(tmp_path), rate_limiter=_open_elevation_limiter()
    )

    async def run():
        return await provider.lookup(lat=45.8326, lon=6.8652)

    p = asyncio.run(run())
    # SANITY: vetta Monte Bianco. SRTM puo' avere -100m di errore quindi 3500+
    assert 3500.0 < p.elevation_m < 5500.0


@pytest.mark.slow
def test_real_open_elevation_batch(tmp_path):
    """Batch 3 punti italiani."""
    provider = OpenElevationProvider(
        cache=_make_cache(tmp_path), rate_limiter=_open_elevation_limiter()
    )

    async def run():
        return await provider.lookup_batch([
            (41.9, 12.5),    # Roma ~20m
            (45.46, 9.19),   # Milano ~120m
            (39.21, 9.11),   # Cagliari ~7m
        ])

    r = asyncio.run(run())
    assert len(r.points) == 3
    # SANITY ranges generosi (dataset SRTM puo' avere noise)
    assert -10 < r.points[0].elevation_m < 200
    assert -10 < r.points[1].elevation_m < 500
    assert -10 < r.points[2].elevation_m < 200


# ---- USGS -----------------------------------------------------------------


@pytest.mark.slow
def test_real_usgs_washington_dc(tmp_path):
    """Washington DC centro ~ 0-50 m."""
    provider = USGSElevationProvider(
        cache=_make_cache(tmp_path), rate_limiter=_usgs_limiter()
    )

    async def run():
        return await provider.lookup(lat=38.8977, lon=-77.0365)

    p = asyncio.run(run())
    # SANITY: White House area ~ 17 m. NED ad alta risoluzione e' accurato.
    assert 0.0 < p.elevation_m < 100.0


@pytest.mark.slow
def test_real_usgs_denver_high_altitude(tmp_path):
    """Denver, CO 'Mile-High City' ~ 1600 m."""
    provider = USGSElevationProvider(
        cache=_make_cache(tmp_path), rate_limiter=_usgs_limiter()
    )

    async def run():
        return await provider.lookup(lat=39.7392, lon=-104.9903)

    p = asyncio.run(run())
    assert 1500.0 < p.elevation_m < 1800.0


@pytest.mark.slow
def test_real_usgs_outside_us_raises(tmp_path):
    """Roma (fuori US) -> USGS ritorna value -1000000 -> ProviderError."""
    provider = USGSElevationProvider(
        cache=_make_cache(tmp_path), rate_limiter=_usgs_limiter()
    )

    async def run():
        return await provider.lookup(lat=41.9, lon=12.5)

    with pytest.raises(ProviderError) as ei:
        asyncio.run(run())
    assert "no data" in str(ei.value).lower() or "outside" in str(ei.value).lower()
