"""Unit tests USGSElevationProvider (Sprint 2 — F4.3)."""
from __future__ import annotations

import asyncio

import httpx
import pytest

from services.providers.elevation.usgs_elevation import (
    USGS_NODATA_THRESHOLD,
    USGSElevationProvider,
)
from services.providers.meteo.errors import (
    ProviderError,
    ProviderRateLimitError,
    ProviderTimeoutError,
    ProviderUnavailableError,
)

from .conftest import (
    load_fixture,
    make_async_client,
    make_counting_transport,
    make_json_transport,
)


def test_lookup_returns_parsed_point(tmp_cache, fast_limiter):
    body = load_fixture("usgs_dc.json")
    transport = make_json_transport(body)
    client = make_async_client(transport)
    provider = USGSElevationProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        p = await provider.lookup(lat=38.8977, lon=-77.0365)
        await client.aclose()
        return p

    p = asyncio.run(run())
    assert p.lat == pytest.approx(38.8977, abs=1e-3)
    assert p.lon == pytest.approx(-77.0365, abs=1e-3)
    assert p.elevation_m == pytest.approx(16.42, abs=0.01)
    assert p.source == "usgs_elevation"


def test_lookup_caches_second_call(tmp_cache, fast_limiter):
    body = load_fixture("usgs_dc.json")
    transport, received = make_counting_transport(body)
    client = make_async_client(transport)
    provider = USGSElevationProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        p1 = await provider.lookup(lat=38.8977, lon=-77.0365)
        p2 = await provider.lookup(lat=38.8977, lon=-77.0365)
        await client.aclose()
        return p1, p2

    p1, p2 = asyncio.run(run())
    assert len(received) == 1
    assert p1.model_dump() == p2.model_dump()


def test_lookup_outside_us_raises_provider_error(tmp_cache, fast_limiter):
    """USGS ritorna -1000000 fuori US -> ProviderError per fallback chain."""
    body = load_fixture("usgs_nodata.json")
    transport = make_json_transport(body)
    client = make_async_client(transport)
    provider = USGSElevationProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        try:
            await provider.lookup(lat=41.9, lon=12.5)
        finally:
            await client.aclose()

    with pytest.raises(ProviderError) as ei:
        asyncio.run(run())
    assert "no data" in str(ei.value).lower() or "outside" in str(ei.value).lower()


def test_lookup_malformed_response_raises(tmp_cache, fast_limiter):
    body = load_fixture("usgs_malformed.json")
    transport = make_json_transport(body)
    client = make_async_client(transport)
    provider = USGSElevationProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        try:
            await provider.lookup(lat=38.9, lon=-77.0)
        finally:
            await client.aclose()

    with pytest.raises(ProviderError) as ei:
        asyncio.run(run())
    assert "value" in str(ei.value).lower()


def test_lookup_value_non_numeric_raises(tmp_cache, fast_limiter):
    body = {"location": {"x": -77.0, "y": 38.9}, "value": "not-a-number"}
    transport = make_json_transport(body)
    client = make_async_client(transport)
    provider = USGSElevationProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        try:
            await provider.lookup(lat=38.9, lon=-77.0)
        finally:
            await client.aclose()

    with pytest.raises(ProviderError):
        asyncio.run(run())


def test_lookup_429_raises_rate_limit(tmp_cache, fast_limiter):
    transport = make_json_transport({"err": "rate"}, status_code=429)
    client = make_async_client(transport)
    provider = USGSElevationProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        try:
            await provider.lookup(lat=38.9, lon=-77.0)
        finally:
            await client.aclose()

    with pytest.raises(ProviderRateLimitError):
        asyncio.run(run())


def test_lookup_500_raises_unavailable(tmp_cache, fast_limiter):
    transport = make_json_transport({"err": "5xx"}, status_code=500)
    client = make_async_client(transport)
    provider = USGSElevationProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        try:
            await provider.lookup(lat=38.9, lon=-77.0)
        finally:
            await client.aclose()

    with pytest.raises(ProviderUnavailableError):
        asyncio.run(run())


def test_lookup_timeout_raises(tmp_cache, fast_limiter):
    def handler(req: httpx.Request) -> httpx.Response:
        raise httpx.TimeoutException("usgs slow")

    transport = httpx.MockTransport(handler)
    client = make_async_client(transport)
    provider = USGSElevationProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        try:
            await provider.lookup(lat=38.9, lon=-77.0)
        finally:
            await client.aclose()

    with pytest.raises(ProviderTimeoutError):
        asyncio.run(run())


def test_lookup_records_call_to_usage_hook(tmp_cache, fast_limiter):
    body = load_fixture("usgs_dc.json")
    transport = make_json_transport(body)
    client = make_async_client(transport)
    provider = USGSElevationProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )
    calls: list[dict] = []

    def record(endpoint, status, latency_ms, cached):
        calls.append({"endpoint": endpoint, "status": status, "cached": cached})

    provider._record_call = record  # type: ignore[method-assign]

    async def run():
        await provider.lookup(lat=38.9, lon=-77.0)
        await provider.lookup(lat=38.9, lon=-77.0)
        await client.aclose()

    asyncio.run(run())
    assert calls[0] == {"endpoint": "lookup", "status": "ok", "cached": False}
    assert calls[1] == {"endpoint": "lookup", "status": "cache_hit", "cached": True}


def test_lookup_corrupt_cache_falls_back(tmp_cache, fast_limiter):
    body = load_fixture("usgs_dc.json")
    transport, received = make_counting_transport(body)
    client = make_async_client(transport)
    provider = USGSElevationProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )
    tmp_cache.set(
        "elevation",
        "usgs_elevation:38.89770:-77.03650",
        {"corrupt": True},
        ttl_s=3600,
    )

    async def run():
        p = await provider.lookup(lat=38.8977, lon=-77.0365)
        await client.aclose()
        return p

    p = asyncio.run(run())
    assert p.elevation_m == pytest.approx(16.42, abs=0.01)
    assert len(received) == 1


def test_batch_uses_default_loop(tmp_cache, fast_limiter):
    """USGS non ha batch nativo -> fallback su loop di `lookup()`."""
    body = load_fixture("usgs_dc.json")
    transport, received = make_counting_transport(body)
    client = make_async_client(transport)
    provider = USGSElevationProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        r = await provider.lookup_batch([(38.9, -77.0), (37.7, -122.4)])
        await client.aclose()
        return r

    r = asyncio.run(run())
    # 2 punti -> 2 HTTP call (no batch nativo)
    assert len(received) == 2
    assert len(r.points) == 2


def test_health_check_ok(tmp_cache, fast_limiter):
    transport = make_json_transport({"value": "0"}, status_code=200)
    client = make_async_client(transport)
    provider = USGSElevationProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        h = await provider.health_check()
        await client.aclose()
        return h

    h = asyncio.run(run())
    assert h.status in ("ok", "degraded")


def test_health_check_down_on_5xx(tmp_cache, fast_limiter):
    transport = make_json_transport(None, status_code=500)
    client = make_async_client(transport)
    provider = USGSElevationProvider(
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
    provider = USGSElevationProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        h = await provider.health_check()
        await client.aclose()
        return h

    h = asyncio.run(run())
    assert h.status == "down"


def test_health_check_unexpected_status_degraded(tmp_cache, fast_limiter):
    transport = make_json_transport(None, status_code=302)
    client = make_async_client(transport)
    provider = USGSElevationProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        h = await provider.health_check()
        await client.aclose()
        return h

    h = asyncio.run(run())
    assert h.status == "degraded"


def test_lookup_with_location_field_uses_actual_coords(tmp_cache, fast_limiter):
    """Se la response include location.x/y, usa quelle (USGS puo' snappare)."""
    body = {
        "location": {"x": -77.0367, "y": 38.8980, "spatialReference": {"wkid": 4326}},
        "value": "16.5",
    }
    transport = make_json_transport(body)
    client = make_async_client(transport)
    provider = USGSElevationProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        p = await provider.lookup(lat=38.8977, lon=-77.0365)
        await client.aclose()
        return p

    p = asyncio.run(run())
    # Coordinate effettive dalla response (snap a raster grid)
    assert p.lat == pytest.approx(38.8980, abs=1e-3)
    assert p.lon == pytest.approx(-77.0367, abs=1e-3)


def test_classvars_match_spec():
    assert USGSElevationProvider.BASE_URL == "https://epqs.nationalmap.gov/v1/json"
    assert USGSElevationProvider.RATE_LIMIT_BUCKET == "usgs_elevation"
    assert USGSElevationProvider.CACHE_TTL_ELEVATION_S == 10 * 365 * 24 * 3600
    assert USGSElevationProvider.name == "usgs_elevation"
    assert USGSElevationProvider.domain == "elevation"
    assert USGS_NODATA_THRESHOLD == -100000.0
