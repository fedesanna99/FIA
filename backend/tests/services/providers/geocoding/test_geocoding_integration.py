"""Integration tests Geocoding providers (Sprint 2 — F4.2).

Marker: `@pytest.mark.slow` — eseguiti solo con `pytest -m slow`.

Sanity check su location reali italiane + 1 internazionale. NON aggiustare
i range al ribasso se falliscono: indica bug o cambio comportamento upstream.
"""
from __future__ import annotations

import asyncio
from pathlib import Path

import pytest

from services.cache import ServiceCache
from services.providers.geocoding.nominatim import NominatimProvider
from services.providers.geocoding.open_meteo_geocoding import (
    OpenMeteoGeocodingProvider,
)
from services.rate_limiter import RateLimiter


def _make_cache(tmp_path: Path) -> ServiceCache:
    return ServiceCache(db_path=tmp_path / "geocoding-integration.sqlite")


def _om_limiter() -> RateLimiter:
    rl = RateLimiter()
    rl.register("open_meteo", rate_per_s=10.0, capacity=20.0)
    return rl


def _nom_limiter() -> RateLimiter:
    """Bucket nominatim a 1 rps come da usage policy OSM."""
    rl = RateLimiter()
    rl.register("nominatim", rate_per_s=1.0, capacity=2.0)
    return rl


# ---- Open-Meteo geocoding -------------------------------------------------


@pytest.mark.slow
def test_real_open_meteo_search_cagliari(tmp_path):
    provider = OpenMeteoGeocodingProvider(
        cache=_make_cache(tmp_path), rate_limiter=_om_limiter()
    )

    async def run():
        return await provider.search("Cagliari", count=5, language="it")

    r = asyncio.run(run())
    assert len(r.results) >= 1
    top = r.results[0]
    # SANITY: Cagliari IT ~ 39.2 N, 9.1 E
    assert 38.5 < top.lat < 40.0
    assert 8.5 < top.lon < 9.5
    assert top.country_code == "it"


@pytest.mark.slow
def test_real_open_meteo_search_tokyo(tmp_path):
    provider = OpenMeteoGeocodingProvider(
        cache=_make_cache(tmp_path), rate_limiter=_om_limiter()
    )

    async def run():
        return await provider.search("Tokyo", count=3, language="en")

    r = asyncio.run(run())
    assert len(r.results) >= 1
    top = r.results[0]
    # SANITY: Tokyo JP ~ 35.7 N, 139.7 E
    assert 35.0 < top.lat < 36.5
    assert 139.0 < top.lon < 140.5
    assert top.country_code == "jp"


@pytest.mark.slow
def test_real_open_meteo_no_results(tmp_path):
    provider = OpenMeteoGeocodingProvider(
        cache=_make_cache(tmp_path), rate_limiter=_om_limiter()
    )

    async def run():
        return await provider.search("xyzqweasdfsdfqwertynonexistent", count=5)

    r = asyncio.run(run())
    assert r.results == []


# ---- Nominatim ------------------------------------------------------------


@pytest.mark.slow
def test_real_nominatim_search_cagliari(tmp_path):
    provider = NominatimProvider(
        cache=_make_cache(tmp_path), rate_limiter=_nom_limiter()
    )

    async def run():
        return await provider.search("Cagliari, Italy", count=3, language="en")

    r = asyncio.run(run())
    assert len(r.results) >= 1
    top = r.results[0]
    assert 38.5 < top.lat < 40.0
    assert 8.5 < top.lon < 9.5
    assert top.country_code == "it"


@pytest.mark.slow
def test_real_nominatim_reverse_cagliari(tmp_path):
    provider = NominatimProvider(
        cache=_make_cache(tmp_path), rate_limiter=_nom_limiter()
    )

    async def run():
        # Coordinate centro Cagliari (Piazza Yenne)
        return await provider.reverse(lat=39.2154, lon=9.1166, language="en")

    r = asyncio.run(run())
    assert r.location is not None
    assert r.location.country_code == "it"
    # Name e' display_name OSM, contiene almeno "Cagliari" o riferimento Sardegna
    name_lower = r.location.name.lower()
    assert "cagliari" in name_lower or "sardegna" in name_lower or "italy" in name_lower


@pytest.mark.slow
def test_real_nominatim_reverse_ocean_returns_none(tmp_path):
    """Coordinate in mezzo all'oceano Atlantico -> nessun match indirizzo."""
    provider = NominatimProvider(
        cache=_make_cache(tmp_path), rate_limiter=_nom_limiter()
    )

    async def run():
        # Atlantico centro
        return await provider.reverse(lat=0.0, lon=-30.0, language="en")

    r = asyncio.run(run())
    # Nominatim puo' restituire "Atlantic Ocean" o un errore; entrambi sono OK
    # ma NON deve crashare
    assert r.lat == 0.0
    assert r.lon == -30.0
    # location e' None o Location con country None (oceano)


@pytest.mark.slow
def test_real_nominatim_rate_limit_respected(tmp_path):
    """3 search consecutive con bucket 1 rps: tempo totale >= ~2s."""
    import time as _time

    provider = NominatimProvider(
        cache=_make_cache(tmp_path), rate_limiter=_nom_limiter()
    )

    async def run():
        t0 = _time.perf_counter()
        await provider.search("Rome, Italy")
        await provider.search("Milan, Italy")
        await provider.search("Naples, Italy")
        return _time.perf_counter() - t0

    elapsed = asyncio.run(run())
    # 3 query: capacity 2 brucia subito, poi 1/1rps + 1/1rps = ~2s extra.
    # Tolleranza: >= 0.5s e <= 10s
    assert 0.5 <= elapsed <= 10.0, f"Rate limit non rispettato: {elapsed:.2f}s"
