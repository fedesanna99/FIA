"""Unit tests OpenElevationProvider (Sprint 2 — F4.3)."""
from __future__ import annotations

import asyncio

import httpx
import pytest

from services.providers.elevation.open_elevation import OpenElevationProvider
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
    make_method_transport,
)


# ---- lookup (single) ------------------------------------------------------


def test_lookup_returns_parsed_point(tmp_cache, fast_limiter):
    body = load_fixture("oe_single_roma.json")
    transport = make_json_transport(body)
    client = make_async_client(transport)
    provider = OpenElevationProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        p = await provider.lookup(lat=41.9, lon=12.5)
        await client.aclose()
        return p

    p = asyncio.run(run())
    assert p.lat == pytest.approx(41.9, abs=1e-3)
    assert p.lon == pytest.approx(12.5, abs=1e-3)
    assert p.elevation_m == pytest.approx(21.0, abs=0.1)
    assert p.source == "open_elevation"


def test_lookup_caches_second_call(tmp_cache, fast_limiter):
    body = load_fixture("oe_single_roma.json")
    transport, received = make_counting_transport(body)
    client = make_async_client(transport)
    provider = OpenElevationProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        p1 = await provider.lookup(lat=41.9, lon=12.5)
        p2 = await provider.lookup(lat=41.9, lon=12.5)
        await client.aclose()
        return p1, p2

    p1, p2 = asyncio.run(run())
    assert len(received) == 1
    assert p1.model_dump() == p2.model_dump()


def test_lookup_cache_rounds_to_5_decimals(tmp_cache, fast_limiter):
    body = load_fixture("oe_single_roma.json")
    transport, received = make_counting_transport(body)
    client = make_async_client(transport)
    provider = OpenElevationProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        # Entrambi gli input arrotondano a 41.90000 / 12.50000 al 5° decimale
        await provider.lookup(lat=41.900001, lon=12.500001)
        await provider.lookup(lat=41.900003, lon=12.500004)
        await client.aclose()

    asyncio.run(run())
    assert len(received) == 1  # 6° decimale ignorato dopo round-5


def test_lookup_empty_results_raises_provider_error(tmp_cache, fast_limiter):
    body = load_fixture("oe_empty.json")
    transport = make_json_transport(body)
    client = make_async_client(transport)
    provider = OpenElevationProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        try:
            await provider.lookup(lat=0.0, lon=0.0)
        finally:
            await client.aclose()

    with pytest.raises(ProviderError) as ei:
        asyncio.run(run())
    assert "empty results" in str(ei.value).lower()


def test_lookup_429_raises_rate_limit(tmp_cache, fast_limiter):
    transport = make_json_transport({"err": "rate"}, status_code=429)
    client = make_async_client(transport)
    provider = OpenElevationProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        try:
            await provider.lookup(lat=41.9, lon=12.5)
        finally:
            await client.aclose()

    with pytest.raises(ProviderRateLimitError):
        asyncio.run(run())


def test_lookup_500_raises_unavailable(tmp_cache, fast_limiter):
    transport = make_json_transport({"err": "5xx"}, status_code=500)
    client = make_async_client(transport)
    provider = OpenElevationProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        try:
            await provider.lookup(lat=41.9, lon=12.5)
        finally:
            await client.aclose()

    with pytest.raises(ProviderUnavailableError):
        asyncio.run(run())


def test_lookup_timeout_raises_timeout_error(tmp_cache, fast_limiter):
    def handler(req: httpx.Request) -> httpx.Response:
        raise httpx.TimeoutException("oe slow")

    transport = httpx.MockTransport(handler)
    client = make_async_client(transport)
    provider = OpenElevationProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        try:
            await provider.lookup(lat=41.9, lon=12.5)
        finally:
            await client.aclose()

    with pytest.raises(ProviderTimeoutError):
        asyncio.run(run())


def test_lookup_records_call_to_usage_hook(tmp_cache, fast_limiter):
    body = load_fixture("oe_single_roma.json")
    transport = make_json_transport(body)
    client = make_async_client(transport)
    provider = OpenElevationProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )
    calls: list[dict] = []

    def record(endpoint, status, latency_ms, cached):
        calls.append({"endpoint": endpoint, "status": status, "cached": cached})

    provider._record_call = record  # type: ignore[method-assign]

    async def run():
        await provider.lookup(lat=41.9, lon=12.5)
        await provider.lookup(lat=41.9, lon=12.5)
        await client.aclose()

    asyncio.run(run())
    assert calls == [
        {"endpoint": "lookup", "status": "ok", "cached": False},
        {"endpoint": "lookup", "status": "cache_hit", "cached": True},
    ]


def test_lookup_corrupt_cache_falls_back(tmp_cache, fast_limiter):
    body = load_fixture("oe_single_roma.json")
    transport, received = make_counting_transport(body)
    client = make_async_client(transport)
    provider = OpenElevationProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )
    tmp_cache.set("elevation", "open_elevation:41.90000:12.50000", {"junk": True}, ttl_s=3600)

    async def run():
        p = await provider.lookup(lat=41.9, lon=12.5)
        await client.aclose()
        return p

    p = asyncio.run(run())
    assert p.elevation_m == pytest.approx(21.0)
    assert len(received) == 1


# ---- lookup_batch ---------------------------------------------------------


def test_batch_returns_all_points(tmp_cache, fast_limiter):
    body = load_fixture("oe_batch_3.json")
    transport = make_json_transport(body)
    client = make_async_client(transport)
    provider = OpenElevationProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        r = await provider.lookup_batch([(41.9, 12.5), (45.46, 9.19), (39.21, 9.11)])
        await client.aclose()
        return r

    r = asyncio.run(run())
    assert len(r.points) == 3
    assert r.points[0].elevation_m == pytest.approx(21.0)
    assert r.points[1].elevation_m == pytest.approx(120.0)
    assert r.points[2].elevation_m == pytest.approx(7.0)
    assert r.source == "open_elevation"


def test_batch_caches_points_individually(tmp_cache, fast_limiter):
    """Pre-popola la cache per il primo punto: solo 2 punti vengono fetchati."""
    body = load_fixture("oe_batch_3.json")
    transport, received = make_method_transport(
        {"POST": (200, {"results": [
            {"latitude": 45.46, "longitude": 9.19, "elevation": 120},
            {"latitude": 39.21, "longitude": 9.11, "elevation": 7},
        ]})}
    )
    client = make_async_client(transport)
    provider = OpenElevationProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )
    # Pre-popola cache per Roma
    tmp_cache.set(
        "elevation",
        "open_elevation:41.90000:12.50000",
        {"lat": 41.9, "lon": 12.5, "elevation_m": 21.0, "source": "open_elevation"},
        ttl_s=3600,
    )

    async def run():
        r = await provider.lookup_batch([(41.9, 12.5), (45.46, 9.19), (39.21, 9.11)])
        await client.aclose()
        return r

    r = asyncio.run(run())
    assert len(r.points) == 3
    # 1 POST request (gli altri 2 punti fetchati in batch)
    assert len(received) == 1
    assert received[0].method == "POST"


def test_batch_empty_returns_empty(tmp_cache, fast_limiter):
    provider = OpenElevationProvider(cache=tmp_cache, rate_limiter=fast_limiter)

    async def run():
        return await provider.lookup_batch([])

    r = asyncio.run(run())
    assert r.points == []
    assert r.source == "open_elevation"


def test_batch_too_large_raises(tmp_cache, fast_limiter):
    provider = OpenElevationProvider(cache=tmp_cache, rate_limiter=fast_limiter)
    big = [(0.0, float(i)) for i in range(1001)]

    async def run():
        await provider.lookup_batch(big)

    with pytest.raises(ValueError):
        asyncio.run(run())


def test_batch_429_raises(tmp_cache, fast_limiter):
    transport, _ = make_method_transport({"POST": (429, {"err": "rate"})})
    client = make_async_client(transport)
    provider = OpenElevationProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        try:
            await provider.lookup_batch([(41.9, 12.5), (39.21, 9.11)])
        finally:
            await client.aclose()

    with pytest.raises(ProviderRateLimitError):
        asyncio.run(run())


def test_batch_truncated_response_raises(tmp_cache, fast_limiter):
    """API ritorna meno risultati di quanti richiesti -> ProviderError."""
    body = {"results": [{"latitude": 41.9, "longitude": 12.5, "elevation": 21}]}
    transport, _ = make_method_transport({"POST": (200, body)})
    client = make_async_client(transport)
    provider = OpenElevationProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        try:
            await provider.lookup_batch([(41.9, 12.5), (45.46, 9.19)])  # chiede 2
        finally:
            await client.aclose()

    with pytest.raises(ProviderError) as ei:
        asyncio.run(run())
    assert "expected" in str(ei.value).lower()


# ---- health ---------------------------------------------------------------


def test_health_check_ok(tmp_cache, fast_limiter):
    transport = make_json_transport({"results": []}, status_code=200)
    client = make_async_client(transport)
    provider = OpenElevationProvider(
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
    provider = OpenElevationProvider(
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
        raise httpx.TimeoutException("oe slow")

    transport = httpx.MockTransport(handler)
    client = make_async_client(transport)
    provider = OpenElevationProvider(
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
    provider = OpenElevationProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        h = await provider.health_check()
        await client.aclose()
        return h

    h = asyncio.run(run())
    assert h.status == "degraded"


def test_classvars_match_spec():
    assert OpenElevationProvider.BASE_URL == "https://api.open-elevation.com/api/v1/lookup"
    assert OpenElevationProvider.RATE_LIMIT_BUCKET == "open_elevation"
    assert OpenElevationProvider.CACHE_TTL_ELEVATION_S == 10 * 365 * 24 * 3600
    assert OpenElevationProvider.name == "open_elevation"
    assert OpenElevationProvider.domain == "elevation"
    assert OpenElevationProvider.MAX_BATCH == 1000
