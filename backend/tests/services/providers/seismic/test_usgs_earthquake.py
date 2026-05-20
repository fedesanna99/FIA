"""Unit tests USGSEarthquakeProvider (Sprint 2 — F4.4)."""
from __future__ import annotations

import asyncio

import httpx
import pytest

from services.providers.meteo.errors import (
    ProviderError,
    ProviderRateLimitError,
    ProviderTimeoutError,
    ProviderUnavailableError,
)
from services.providers.seismic.usgs_earthquake import USGSEarthquakeProvider

from .conftest import (
    load_fixture,
    make_async_client,
    make_counting_transport,
    make_json_transport,
)


# ---- search_nearby --------------------------------------------------------


def test_search_returns_parsed_events(tmp_cache, fast_limiter):
    body = load_fixture("eq_norcia.json")
    transport = make_json_transport(body)
    client = make_async_client(transport)
    provider = USGSEarthquakeProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        r = await provider.search_nearby(
            lat=42.79, lon=13.10, max_radius_km=50, years_back=10, min_magnitude=4.0
        )
        await client.aclose()
        return r

    r = asyncio.run(run())
    assert r.source == "usgs_earthquake"
    assert r.count == 5
    assert len(r.earthquakes) == 5
    # Primo evento (Norcia M6.5)
    eq = r.earthquakes[0]
    assert eq.id == "us10007h7r"
    assert eq.magnitude == pytest.approx(6.5, abs=0.01)
    assert eq.lat == pytest.approx(42.8, abs=0.01)
    assert eq.lon == pytest.approx(13.1, abs=0.01)
    assert eq.depth_km == pytest.approx(10.0, abs=0.1)
    assert "Norcia" in eq.place
    assert eq.event_type == "earthquake"
    assert eq.url is not None
    assert eq.time_iso.endswith("Z")


def test_search_caches_second_call(tmp_cache, fast_limiter):
    body = load_fixture("eq_norcia.json")
    transport, received = make_counting_transport(body)
    client = make_async_client(transport)
    provider = USGSEarthquakeProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        r1 = await provider.search_nearby(lat=42.79, lon=13.10)
        r2 = await provider.search_nearby(lat=42.79, lon=13.10)
        await client.aclose()
        return r1, r2

    r1, r2 = asyncio.run(run())
    assert len(received) == 1
    assert r1.model_dump() == r2.model_dump()


def test_search_cache_includes_all_params(tmp_cache, fast_limiter):
    """Stessa lat/lon ma magnitude diversa -> cache miss."""
    body = load_fixture("eq_norcia.json")
    transport, received = make_counting_transport(body)
    client = make_async_client(transport)
    provider = USGSEarthquakeProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        await provider.search_nearby(lat=42.79, lon=13.10, min_magnitude=4.0)
        await provider.search_nearby(lat=42.79, lon=13.10, min_magnitude=5.0)
        await client.aclose()

    asyncio.run(run())
    assert len(received) == 2  # min_magnitude diversa -> due call separate


def test_search_empty_result(tmp_cache, fast_limiter):
    body = load_fixture("eq_empty.json")
    transport = make_json_transport(body)
    client = make_async_client(transport)
    provider = USGSEarthquakeProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        r = await provider.search_nearby(lat=0, lon=0)
        await client.aclose()
        return r

    r = asyncio.run(run())
    assert r.earthquakes == []
    assert r.count == 0


def test_search_skips_malformed_features(tmp_cache, fast_limiter):
    """Eventi senza magnitudo o con coords corte vengono saltati."""
    body = load_fixture("eq_malformed.json")
    transport = make_json_transport(body)
    client = make_async_client(transport)
    provider = USGSEarthquakeProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        r = await provider.search_nearby(lat=41.0, lon=12.0)
        await client.aclose()
        return r

    r = asyncio.run(run())
    # Solo 1 evento valido sopravvive (us-valid)
    assert r.count == 1
    assert r.earthquakes[0].id == "us-valid"


def test_search_429_raises_rate_limit(tmp_cache, fast_limiter):
    transport = make_json_transport({"err": "rate"}, status_code=429)
    client = make_async_client(transport)
    provider = USGSEarthquakeProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        try:
            await provider.search_nearby(lat=42.79, lon=13.10)
        finally:
            await client.aclose()

    with pytest.raises(ProviderRateLimitError):
        asyncio.run(run())


def test_search_500_raises_unavailable(tmp_cache, fast_limiter):
    transport = make_json_transport({"err": "5xx"}, status_code=500)
    client = make_async_client(transport)
    provider = USGSEarthquakeProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        try:
            await provider.search_nearby(lat=42.79, lon=13.10)
        finally:
            await client.aclose()

    with pytest.raises(ProviderUnavailableError):
        asyncio.run(run())


def test_search_timeout_raises(tmp_cache, fast_limiter):
    def handler(req: httpx.Request) -> httpx.Response:
        raise httpx.TimeoutException("usgs slow")

    transport = httpx.MockTransport(handler)
    client = make_async_client(transport)
    provider = USGSEarthquakeProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        try:
            await provider.search_nearby(lat=42.79, lon=13.10)
        finally:
            await client.aclose()

    with pytest.raises(ProviderTimeoutError):
        asyncio.run(run())


def test_search_400_raises_provider_error(tmp_cache, fast_limiter):
    transport = make_json_transport({"error": "bad request"}, status_code=400)
    client = make_async_client(transport)
    provider = USGSEarthquakeProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        try:
            await provider.search_nearby(lat=42.79, lon=13.10)
        finally:
            await client.aclose()

    with pytest.raises(ProviderError) as ei:
        asyncio.run(run())
    assert ei.value.status == 400


def test_search_records_call_to_usage_hook(tmp_cache, fast_limiter):
    body = load_fixture("eq_norcia.json")
    transport = make_json_transport(body)
    client = make_async_client(transport)
    provider = USGSEarthquakeProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )
    calls: list[dict] = []

    def record(endpoint, status, latency_ms, cached):
        calls.append({"endpoint": endpoint, "status": status, "cached": cached})

    provider._record_call = record  # type: ignore[method-assign]

    async def run():
        await provider.search_nearby(lat=42.79, lon=13.10)
        await provider.search_nearby(lat=42.79, lon=13.10)  # cache hit
        await client.aclose()

    asyncio.run(run())
    assert calls[0] == {"endpoint": "search_nearby", "status": "ok", "cached": False}
    assert calls[1] == {"endpoint": "search_nearby", "status": "cache_hit", "cached": True}


def test_search_corrupt_cache_falls_back(tmp_cache, fast_limiter):
    body = load_fixture("eq_norcia.json")
    transport, received = make_counting_transport(body)
    client = make_async_client(transport)
    provider = USGSEarthquakeProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )
    # Pre-popola cache con dati che fanno fallire model_validate
    # (earthquakes deve essere una lista, non una string)
    cache_key = "usgs_earthquake:search:42.7900:13.1000:200:50:4.0:1000"
    tmp_cache.set(
        "seismic",
        cache_key,
        {"earthquakes": "not-a-list", "count": "abc"},
        ttl_s=3600,
    )

    async def run():
        r = await provider.search_nearby(lat=42.79, lon=13.10)
        await client.aclose()
        return r

    r = asyncio.run(run())
    assert r.count == 5  # parse OK dal fixture
    assert len(received) == 1


def test_search_invalid_args_raises(tmp_cache, fast_limiter):
    provider = USGSEarthquakeProvider(cache=tmp_cache, rate_limiter=fast_limiter)
    with pytest.raises(ValueError):
        asyncio.run(provider.search_nearby(lat=0, lon=0, max_radius_km=0))
    with pytest.raises(ValueError):
        asyncio.run(provider.search_nearby(lat=0, lon=0, max_radius_km=-1))
    with pytest.raises(ValueError):
        asyncio.run(provider.search_nearby(lat=0, lon=0, years_back=0))
    with pytest.raises(ValueError):
        asyncio.run(provider.search_nearby(lat=0, lon=0, years_back=201))
    with pytest.raises(ValueError):
        asyncio.run(provider.search_nearby(lat=0, lon=0, min_magnitude=-1.0))
    with pytest.raises(ValueError):
        asyncio.run(provider.search_nearby(lat=0, lon=0, min_magnitude=11.0))
    with pytest.raises(ValueError):
        asyncio.run(provider.search_nearby(lat=0, lon=0, limit=0))
    with pytest.raises(ValueError):
        asyncio.run(provider.search_nearby(lat=0, lon=0, limit=20001))


# ---- historical_max_magnitude --------------------------------------------


def test_historical_max_magnitude_returns_max(tmp_cache, fast_limiter):
    body = load_fixture("eq_norcia.json")
    transport = make_json_transport(body)
    client = make_async_client(transport)
    provider = USGSEarthquakeProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        m = await provider.historical_max_magnitude(lat=42.79, lon=13.10, years_back=100)
        await client.aclose()
        return m

    m = asyncio.run(run())
    # Fixture ha eventi con M = 6.5, 6.2, 5.4, 4.8, 4.2 -> max 6.5
    assert m == pytest.approx(6.5, abs=0.01)


def test_historical_max_magnitude_empty_returns_zero(tmp_cache, fast_limiter):
    body = load_fixture("eq_empty.json")
    transport = make_json_transport(body)
    client = make_async_client(transport)
    provider = USGSEarthquakeProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        m = await provider.historical_max_magnitude(lat=0, lon=0)
        await client.aclose()
        return m

    m = asyncio.run(run())
    assert m == 0.0


def test_historical_max_magnitude_uses_search_cache(tmp_cache, fast_limiter):
    """historical_max_magnitude chiama search_nearby internamente,
    quindi una seconda chiamata identica e' cache hit."""
    body = load_fixture("eq_norcia.json")
    transport, received = make_counting_transport(body)
    client = make_async_client(transport)
    provider = USGSEarthquakeProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        m1 = await provider.historical_max_magnitude(lat=42.79, lon=13.10)
        m2 = await provider.historical_max_magnitude(lat=42.79, lon=13.10)
        await client.aclose()
        return m1, m2

    m1, m2 = asyncio.run(run())
    assert m1 == m2
    assert len(received) == 1


# ---- health ---------------------------------------------------------------


def test_health_check_ok(tmp_cache, fast_limiter):
    transport = make_json_transport(
        {"type": "FeatureCollection", "features": []}, status_code=200
    )
    client = make_async_client(transport)
    provider = USGSEarthquakeProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        h = await provider.health_check()
        await client.aclose()
        return h

    h = asyncio.run(run())
    assert h.status in ("ok", "degraded")


def test_health_check_down_on_5xx(tmp_cache, fast_limiter):
    transport = make_json_transport(None, status_code=503)
    client = make_async_client(transport)
    provider = USGSEarthquakeProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        h = await provider.health_check()
        await client.aclose()
        return h

    h = asyncio.run(run())
    assert h.status == "down"


def test_health_check_timeout_returns_down(tmp_cache, fast_limiter):
    def handler(req: httpx.Request) -> httpx.Response:
        raise httpx.TimeoutException("usgs slow")

    transport = httpx.MockTransport(handler)
    client = make_async_client(transport)
    provider = USGSEarthquakeProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        h = await provider.health_check()
        await client.aclose()
        return h

    h = asyncio.run(run())
    assert h.status == "down"


def test_health_check_unexpected_status_degraded(tmp_cache, fast_limiter):
    transport = make_json_transport(None, status_code=301)
    client = make_async_client(transport)
    provider = USGSEarthquakeProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        h = await provider.health_check()
        await client.aclose()
        return h

    h = asyncio.run(run())
    assert h.status == "degraded"


def test_classvars_match_spec():
    assert (
        USGSEarthquakeProvider.BASE_URL
        == "https://earthquake.usgs.gov/fdsnws/event/1/query"
    )
    assert USGSEarthquakeProvider.RATE_LIMIT_BUCKET == "usgs_earthquake"
    assert USGSEarthquakeProvider.CACHE_TTL_SEISMIC_S == 7 * 24 * 3600
    assert USGSEarthquakeProvider.name == "usgs_earthquake"
    assert USGSEarthquakeProvider.domain == "seismic"
    assert USGSEarthquakeProvider.MAX_LIMIT == 20000


def test_search_event_without_url_safe(tmp_cache, fast_limiter):
    """Evento senza 'url' nelle properties non crasha."""
    body = {
        "type": "FeatureCollection",
        "metadata": {"count": 1, "status": 200},
        "features": [
            {
                "type": "Feature",
                "id": "test-no-url",
                "properties": {
                    "mag": 5.0,
                    "place": "test",
                    "time": 1700000000000,
                    "type": "earthquake",
                    # nessun 'url'
                },
                "geometry": {"type": "Point", "coordinates": [12.0, 41.0, 5.0]},
            }
        ],
    }
    transport = make_json_transport(body)
    client = make_async_client(transport)
    provider = USGSEarthquakeProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        r = await provider.search_nearby(lat=41.0, lon=12.0)
        await client.aclose()
        return r

    r = asyncio.run(run())
    assert r.count == 1
    assert r.earthquakes[0].url is None


def test_search_event_without_time_uses_empty_iso(tmp_cache, fast_limiter):
    """Evento senza 'time' non crasha, time_iso == ''."""
    body = {
        "type": "FeatureCollection",
        "metadata": {"count": 1, "status": 200},
        "features": [
            {
                "type": "Feature",
                "id": "test-no-time",
                "properties": {"mag": 4.0, "type": "earthquake"},
                "geometry": {"type": "Point", "coordinates": [12.0, 41.0, 5.0]},
            }
        ],
    }
    transport = make_json_transport(body)
    client = make_async_client(transport)
    provider = USGSEarthquakeProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        r = await provider.search_nearby(lat=41.0, lon=12.0)
        await client.aclose()
        return r

    r = asyncio.run(run())
    assert r.count == 1
    assert r.earthquakes[0].time_iso == ""


def test_search_event_2d_coords_uses_zero_depth(tmp_cache, fast_limiter):
    """Eventi con coords [lon, lat] (2 elementi) usano depth=0."""
    body = {
        "type": "FeatureCollection",
        "metadata": {"count": 1, "status": 200},
        "features": [
            {
                "type": "Feature",
                "id": "test-2d",
                "properties": {"mag": 3.0, "time": 1700000000000, "type": "earthquake"},
                "geometry": {"type": "Point", "coordinates": [12.0, 41.0]},
            }
        ],
    }
    transport = make_json_transport(body)
    client = make_async_client(transport)
    provider = USGSEarthquakeProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        r = await provider.search_nearby(lat=41.0, lon=12.0)
        await client.aclose()
        return r

    r = asyncio.run(run())
    assert r.count == 1
    assert r.earthquakes[0].depth_km == 0.0
