"""Integration tests USGS Earthquake provider (Sprint 2 — F4.4).

Marker `@pytest.mark.slow` — eseguiti solo con `pytest -m slow`.
"""
from __future__ import annotations

import asyncio
from pathlib import Path

import pytest

from services.cache import ServiceCache
from services.providers.seismic.usgs_earthquake import USGSEarthquakeProvider
from services.rate_limiter import RateLimiter


def _make_cache(tmp_path: Path) -> ServiceCache:
    return ServiceCache(db_path=tmp_path / "seismic-integration.sqlite")


def _make_limiter() -> RateLimiter:
    """Bucket usgs_earthquake a 0.5 rps come da policy."""
    rl = RateLimiter()
    rl.register("usgs_earthquake", rate_per_s=0.5, capacity=2.0)
    return rl


@pytest.mark.slow
def test_real_search_norcia_2016_window(tmp_path):
    """Cerca eventi M>=5 entro 50km da Norcia negli ultimi 15 anni.

    SANITY: la sequenza Centro Italia 2016 (Mw 6.5 Norcia + 6.2 Amatrice
    + 5.x aftershocks) deve essere presente.
    """
    provider = USGSEarthquakeProvider(
        cache=_make_cache(tmp_path), rate_limiter=_make_limiter()
    )

    async def run():
        return await provider.search_nearby(
            lat=42.79, lon=13.10, max_radius_km=50, years_back=15, min_magnitude=5.0
        )

    r = asyncio.run(run())
    # SANITY: almeno 2 eventi M>=5 sicuri nella sequenza 2016
    assert r.count >= 2, f"Centro Italia 2016 sequence: trovati solo {r.count} eventi M>=5"
    # Almeno uno con M >= 6 (Norcia o Amatrice)
    high_mag = [eq for eq in r.earthquakes if eq.magnitude >= 6.0]
    assert len(high_mag) >= 1, "Norcia/Amatrice M>=6 atteso ma non trovato"


@pytest.mark.slow
def test_real_historical_max_magnitude_japan(tmp_path):
    """Tohoku 2011 Mw 9.0 — entro 500 km da Tokyo deve apparire."""
    provider = USGSEarthquakeProvider(
        cache=_make_cache(tmp_path), rate_limiter=_make_limiter()
    )

    async def run():
        return await provider.historical_max_magnitude(
            lat=35.6762, lon=139.6503,  # Tokyo
            max_radius_km=500, years_back=20,
        )

    m = asyncio.run(run())
    # SANITY: Tohoku 2011 Mw 9.0 (epicentro 130km off Sendai, ~370km da Tokyo)
    assert m >= 7.5, f"Atteso almeno 7.5 (Tohoku 9.0 era 370km da Tokyo), trovato {m:.1f}"


@pytest.mark.slow
def test_real_search_low_seismicity_zone(tmp_path):
    """Zona bassa sismicita' (Sahara, Algeria) — pochi/zero eventi M>=4."""
    provider = USGSEarthquakeProvider(
        cache=_make_cache(tmp_path), rate_limiter=_make_limiter()
    )

    async def run():
        return await provider.search_nearby(
            lat=24.0, lon=2.0,    # Sahara centrale
            max_radius_km=100, years_back=10, min_magnitude=4.0,
        )

    r = asyncio.run(run())
    # SANITY: zona praticamente asismica — pochi eventi
    assert r.count < 20, f"Sahara 100km/10y M>=4: troppi eventi ({r.count})"


@pytest.mark.slow
def test_real_search_caches_to_disk(tmp_path):
    """Smoke test: due call uguali, seconda da cache."""
    cache = _make_cache(tmp_path)
    provider = USGSEarthquakeProvider(cache=cache, rate_limiter=_make_limiter())

    async def run():
        r1 = await provider.search_nearby(
            lat=42.79, lon=13.10, max_radius_km=50, years_back=5, min_magnitude=4.5
        )
        r2 = await provider.search_nearby(
            lat=42.79, lon=13.10, max_radius_km=50, years_back=5, min_magnitude=4.5
        )
        return r1, r2

    r1, r2 = asyncio.run(run())
    assert r1.model_dump() == r2.model_dump()
    stats = cache.stats().get("seismic", {})
    assert stats.get("hits", 0) >= 1
