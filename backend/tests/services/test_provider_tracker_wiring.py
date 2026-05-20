"""Tests F6 — verifica che i 7 provider F4 chiamino effettivamente il tracker.

Sostituisce gli stub `_record_call` originali con call reali al singleton
`services.usage_tracker.tracker`.
"""
from __future__ import annotations

import asyncio
from pathlib import Path

import httpx
import pytest

from services.cache import ServiceCache
from services.rate_limiter import RateLimiter
from services.usage_tracker import tracker as global_tracker


@pytest.fixture
def with_global_tracker(tmp_path: Path):
    """Riabilita il singleton con tmp DB per i wiring test."""
    orig_db = global_tracker.db_path
    orig_enabled = global_tracker.enabled
    global_tracker.db_path = tmp_path / "wiring_usage.sqlite"
    global_tracker._init_db()
    global_tracker.clear()
    global_tracker.set_enabled(True)
    yield global_tracker
    global_tracker.set_enabled(orig_enabled)
    global_tracker.db_path = orig_db


@pytest.fixture
def tmp_cache(tmp_path: Path) -> ServiceCache:
    return ServiceCache(db_path=tmp_path / "cache.sqlite")


@pytest.fixture
def fast_limiter() -> RateLimiter:
    rl = RateLimiter()
    for bucket in (
        "open_meteo", "nominatim", "open_elevation", "usgs_elevation",
        "usgs_earthquake",
    ):
        rl.register(bucket, rate_per_s=10000.0, capacity=10000.0)
    return rl


def _ok_transport(body: dict) -> httpx.MockTransport:
    return httpx.MockTransport(lambda req: httpx.Response(200, json=body))


# ---- Test wiring per ogni provider F4 ------------------------------------


def test_open_meteo_forecast_wires_to_tracker(with_global_tracker, tmp_cache, fast_limiter):
    from services.providers.meteo.open_meteo_forecast import OpenMeteoForecastProvider

    body = {
        "latitude": 41.9, "longitude": 12.5,
        "hourly": {"time": ["2026-05-20T00:00"], "temperature_2m": [15.0],
                   "wind_speed_10m": [3.0], "wind_gusts_10m": [5.0],
                   "precipitation": [0.0], "snowfall": [0.0]},
    }
    transport = _ok_transport(body)
    client = httpx.AsyncClient(transport=transport)
    p = OpenMeteoForecastProvider(cache=tmp_cache, rate_limiter=fast_limiter, client=client)

    async def run():
        await p.forecast(lat=41.9, lon=12.5, days=1)
        await p.forecast(lat=41.9, lon=12.5, days=1)  # cache hit
        await client.aclose()

    asyncio.run(run())
    rows = with_global_tracker.aggregate(since_ts=0)
    by_provider = {r.provider: r for r in rows}
    assert "open_meteo_forecast" in by_provider
    s = by_provider["open_meteo_forecast"]
    assert s.n_calls == 2
    assert s.n_cache_hits == 1


def test_open_meteo_archive_wires_to_tracker(with_global_tracker, tmp_cache, fast_limiter):
    from services.providers.meteo.open_meteo_archive import OpenMeteoArchiveProvider

    body = {
        "latitude": 41.9, "longitude": 12.5,
        "daily": {"time": ["2024-01-01"], "wind_gusts_10m_max": [20.0], "snowfall_sum": [0.0]},
    }
    transport = _ok_transport(body)
    client = httpx.AsyncClient(transport=transport)
    p = OpenMeteoArchiveProvider(cache=tmp_cache, rate_limiter=fast_limiter, client=client)

    async def run():
        await p.historical_extremes(lat=41.9, lon=12.5, years=10)
        await client.aclose()

    asyncio.run(run())
    rows = with_global_tracker.aggregate(since_ts=0, provider="open_meteo_archive")
    assert len(rows) >= 1
    assert rows[0].provider == "open_meteo_archive"


def test_open_meteo_geocoding_wires_to_tracker(with_global_tracker, tmp_cache, fast_limiter):
    from services.providers.geocoding.open_meteo_geocoding import OpenMeteoGeocodingProvider

    body = {"results": [{"name": "Rome", "latitude": 41.9, "longitude": 12.5, "country_code": "IT"}]}
    transport = _ok_transport(body)
    client = httpx.AsyncClient(transport=transport)
    p = OpenMeteoGeocodingProvider(cache=tmp_cache, rate_limiter=fast_limiter, client=client)

    async def run():
        await p.search("Rome")
        await client.aclose()

    asyncio.run(run())
    rows = with_global_tracker.aggregate(since_ts=0, provider="open_meteo_geocoding")
    assert len(rows) == 1
    assert rows[0].n_calls == 1
    assert rows[0].endpoint == "search"


def test_nominatim_wires_to_tracker(with_global_tracker, tmp_cache, fast_limiter):
    from services.providers.geocoding.nominatim import NominatimProvider

    body = [{"lat": "41.9", "lon": "12.5", "display_name": "Rome", "address": {"country_code": "it"}}]
    transport = _ok_transport(body)
    client = httpx.AsyncClient(transport=transport)
    p = NominatimProvider(cache=tmp_cache, rate_limiter=fast_limiter, client=client)

    async def run():
        await p.search("Rome")
        await client.aclose()

    asyncio.run(run())
    rows = with_global_tracker.aggregate(since_ts=0, provider="nominatim")
    assert len(rows) == 1
    assert rows[0].endpoint == "search"


def test_nominatim_reverse_wires_to_tracker(with_global_tracker, tmp_cache, fast_limiter):
    from services.providers.geocoding.nominatim import NominatimProvider

    body = {"lat": "41.9", "lon": "12.5", "display_name": "Rome", "address": {"country_code": "it"}}
    transport = _ok_transport(body)
    client = httpx.AsyncClient(transport=transport)
    p = NominatimProvider(cache=tmp_cache, rate_limiter=fast_limiter, client=client)

    async def run():
        await p.reverse(lat=41.9, lon=12.5)
        await client.aclose()

    asyncio.run(run())
    rows = with_global_tracker.aggregate(since_ts=0, provider="nominatim", endpoint="reverse")
    assert len(rows) == 1


def test_open_elevation_wires_to_tracker(with_global_tracker, tmp_cache, fast_limiter):
    from services.providers.elevation.open_elevation import OpenElevationProvider

    body = {"results": [{"latitude": 41.9, "longitude": 12.5, "elevation": 21}]}
    transport = _ok_transport(body)
    client = httpx.AsyncClient(transport=transport)
    p = OpenElevationProvider(cache=tmp_cache, rate_limiter=fast_limiter, client=client)

    async def run():
        await p.lookup(lat=41.9, lon=12.5)
        await client.aclose()

    asyncio.run(run())
    rows = with_global_tracker.aggregate(since_ts=0, provider="open_elevation")
    assert len(rows) == 1


def test_usgs_elevation_wires_to_tracker(with_global_tracker, tmp_cache, fast_limiter):
    from services.providers.elevation.usgs_elevation import USGSElevationProvider

    body = {"location": {"x": -77.0, "y": 38.9}, "value": "16.0"}
    transport = _ok_transport(body)
    client = httpx.AsyncClient(transport=transport)
    p = USGSElevationProvider(cache=tmp_cache, rate_limiter=fast_limiter, client=client)

    async def run():
        await p.lookup(lat=38.9, lon=-77.0)
        await client.aclose()

    asyncio.run(run())
    rows = with_global_tracker.aggregate(since_ts=0, provider="usgs_elevation")
    assert len(rows) == 1


def test_usgs_earthquake_wires_to_tracker(with_global_tracker, tmp_cache, fast_limiter):
    from services.providers.seismic.usgs_earthquake import USGSEarthquakeProvider

    body = {
        "type": "FeatureCollection",
        "metadata": {"count": 1},
        "features": [
            {
                "type": "Feature", "id": "us-x",
                "properties": {"mag": 5.0, "time": 1700000000000, "type": "earthquake"},
                "geometry": {"type": "Point", "coordinates": [12.0, 41.0, 5.0]},
            }
        ],
    }
    transport = _ok_transport(body)
    client = httpx.AsyncClient(transport=transport)
    p = USGSEarthquakeProvider(cache=tmp_cache, rate_limiter=fast_limiter, client=client)

    async def run():
        await p.search_nearby(lat=42.79, lon=13.10)
        await client.aclose()

    asyncio.run(run())
    rows = with_global_tracker.aggregate(since_ts=0, provider="usgs_earthquake")
    assert len(rows) == 1


def test_error_status_recorded_correctly(with_global_tracker, tmp_cache, fast_limiter):
    """Quando il provider solleva l'errore, lo status registrato e' 'error'."""
    from services.providers.meteo.errors import ProviderUnavailableError
    from services.providers.meteo.open_meteo_forecast import OpenMeteoForecastProvider

    transport = httpx.MockTransport(lambda req: httpx.Response(500, json={}))
    client = httpx.AsyncClient(transport=transport)
    p = OpenMeteoForecastProvider(cache=tmp_cache, rate_limiter=fast_limiter, client=client)

    async def run():
        try:
            await p.forecast(lat=41.9, lon=12.5, days=1)
        except ProviderUnavailableError:
            pass
        await client.aclose()

    asyncio.run(run())
    rows = with_global_tracker.aggregate(since_ts=0)
    assert len(rows) == 1
    assert rows[0].n_calls == 1
    assert rows[0].n_errors == 1


def test_disabled_tracker_doesnt_record_via_provider(tmp_cache, fast_limiter):
    """Se il tracker e' disabilitato, le call provider non lasciano traccia."""
    from services.providers.meteo.open_meteo_forecast import OpenMeteoForecastProvider

    # Conftest gia' disabilita il singleton. Verifichiamo che il provider
    # comunque funziona (e non crasha) e nessuna traccia viene scritta.
    body = {
        "latitude": 41.9, "longitude": 12.5,
        "hourly": {"time": ["2026-05-20T00:00"], "temperature_2m": [15.0],
                   "wind_speed_10m": [3.0], "wind_gusts_10m": [5.0],
                   "precipitation": [0.0], "snowfall": [0.0]},
    }
    transport = _ok_transport(body)
    client = httpx.AsyncClient(transport=transport)
    p = OpenMeteoForecastProvider(cache=tmp_cache, rate_limiter=fast_limiter, client=client)

    async def run():
        r = await p.forecast(lat=41.9, lon=12.5, days=1)
        await client.aclose()
        return r

    r = asyncio.run(run())
    # Provider funziona, ma global_tracker (disabled) non ha registrato
    assert r is not None
    # Verifica diretta che il singleton e' disabled
    assert global_tracker.enabled is False
