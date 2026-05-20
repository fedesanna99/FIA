"""Unit tests OpenMeteoGeocodingProvider (Sprint 2 — F4.2)."""
from __future__ import annotations

import asyncio

import httpx
import pytest

from services.providers.geocoding.open_meteo_geocoding import (
    OpenMeteoGeocodingProvider,
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


def test_search_returns_parsed_locations(tmp_cache, fast_limiter):
    body = load_fixture("om_search_roma.json")
    transport = make_json_transport(body)
    client = make_async_client(transport)
    provider = OpenMeteoGeocodingProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        r = await provider.search("Rome", count=5)
        await client.aclose()
        return r

    result = asyncio.run(run())
    assert result.query == "Rome"
    assert len(result.results) == 2
    rome_it = result.results[0]
    assert rome_it.name == "Rome"
    assert rome_it.lat == pytest.approx(41.89193, abs=1e-4)
    assert rome_it.lon == pytest.approx(12.51133, abs=1e-4)
    assert rome_it.country == "Italy"
    assert rome_it.country_code == "it"  # normalizzato lowercase
    assert rome_it.admin1 == "Lazio"
    assert rome_it.timezone == "Europe/Rome"
    assert rome_it.population == 2318895
    assert rome_it.source == "open_meteo_geocoding"


def test_search_caches_second_call(tmp_cache, fast_limiter):
    body = load_fixture("om_search_roma.json")
    transport, received = make_counting_transport(body)
    client = make_async_client(transport)
    provider = OpenMeteoGeocodingProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        r1 = await provider.search("Rome", count=5)
        r2 = await provider.search("Rome", count=5)
        await client.aclose()
        return r1, r2

    r1, r2 = asyncio.run(run())
    assert len(received) == 1
    assert r1.model_dump() == r2.model_dump()


def test_search_cache_is_case_insensitive(tmp_cache, fast_limiter):
    body = load_fixture("om_search_roma.json")
    transport, received = make_counting_transport(body)
    client = make_async_client(transport)
    provider = OpenMeteoGeocodingProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        await provider.search("Rome", count=5)
        await provider.search("ROME", count=5)
        await provider.search("rome", count=5)
        await client.aclose()

    asyncio.run(run())
    # 3 query con casing diverso -> 1 sola call HTTP (cache key lowercased)
    assert len(received) == 1


def test_search_empty_results(tmp_cache, fast_limiter):
    body = load_fixture("om_search_empty.json")
    transport = make_json_transport(body)
    client = make_async_client(transport)
    provider = OpenMeteoGeocodingProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        r = await provider.search("xyzqwerasdf", count=10)
        await client.aclose()
        return r

    r = asyncio.run(run())
    assert r.results == []


def test_search_429_raises_rate_limit_error(tmp_cache, fast_limiter):
    transport = make_json_transport({"reason": "rate limit"}, status_code=429)
    client = make_async_client(transport)
    provider = OpenMeteoGeocodingProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        try:
            await provider.search("Rome")
        finally:
            await client.aclose()

    with pytest.raises(ProviderRateLimitError):
        asyncio.run(run())


def test_search_500_raises_unavailable_error(tmp_cache, fast_limiter):
    transport = make_json_transport({"err": "down"}, status_code=500)
    client = make_async_client(transport)
    provider = OpenMeteoGeocodingProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        try:
            await provider.search("Rome")
        finally:
            await client.aclose()

    with pytest.raises(ProviderUnavailableError):
        asyncio.run(run())


def test_search_timeout_raises_timeout_error(tmp_cache, fast_limiter):
    def handler(req: httpx.Request) -> httpx.Response:
        raise httpx.TimeoutException("simulated")

    transport = httpx.MockTransport(handler)
    client = make_async_client(transport)
    provider = OpenMeteoGeocodingProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        try:
            await provider.search("Rome")
        finally:
            await client.aclose()

    with pytest.raises(ProviderTimeoutError):
        asyncio.run(run())


def test_search_400_raises_provider_error(tmp_cache, fast_limiter):
    transport = make_json_transport({"error": "bad request"}, status_code=400)
    client = make_async_client(transport)
    provider = OpenMeteoGeocodingProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        try:
            await provider.search("Rome")
        finally:
            await client.aclose()

    with pytest.raises(ProviderError) as ei:
        asyncio.run(run())
    assert ei.value.status == 400


def test_search_records_call_to_usage_hook(tmp_cache, fast_limiter):
    body = load_fixture("om_search_roma.json")
    transport = make_json_transport(body)
    client = make_async_client(transport)
    provider = OpenMeteoGeocodingProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )
    calls: list[dict] = []

    def record(endpoint, status, latency_ms, cached):
        calls.append({"endpoint": endpoint, "status": status, "cached": cached})

    provider._record_call = record  # type: ignore[method-assign]

    async def run():
        await provider.search("Rome")
        await provider.search("Rome")  # cache hit
        await client.aclose()

    asyncio.run(run())
    assert len(calls) == 2
    assert calls[0] == {"endpoint": "search", "status": "ok", "cached": False}
    assert calls[1] == {"endpoint": "search", "status": "cache_hit", "cached": True}


def test_search_invalid_args_raises(tmp_cache, fast_limiter):
    provider = OpenMeteoGeocodingProvider(cache=tmp_cache, rate_limiter=fast_limiter)
    with pytest.raises(ValueError):
        asyncio.run(provider.search(""))
    with pytest.raises(ValueError):
        asyncio.run(provider.search("  "))
    with pytest.raises(ValueError):
        asyncio.run(provider.search("Rome", count=0))
    with pytest.raises(ValueError):
        asyncio.run(provider.search("Rome", count=101))


def test_reverse_raises_not_implemented():
    provider = OpenMeteoGeocodingProvider()
    with pytest.raises(NotImplementedError):
        asyncio.run(provider.reverse(lat=41.9, lon=12.5))


def test_health_check_ok(tmp_cache, fast_limiter):
    transport = make_json_transport({"results": []}, status_code=200)
    client = make_async_client(transport)
    provider = OpenMeteoGeocodingProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        h = await provider.health_check()
        await client.aclose()
        return h

    h = asyncio.run(run())
    assert h.status in ("ok", "degraded")
    assert h.last_error is None


def test_health_check_down_on_5xx(tmp_cache, fast_limiter):
    transport = make_json_transport(None, status_code=502)
    client = make_async_client(transport)
    provider = OpenMeteoGeocodingProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        h = await provider.health_check()
        await client.aclose()
        return h

    h = asyncio.run(run())
    assert h.status == "down"


def test_corrupt_cache_falls_back(tmp_cache, fast_limiter):
    body = load_fixture("om_search_roma.json")
    transport, received = make_counting_transport(body)
    client = make_async_client(transport)
    provider = OpenMeteoGeocodingProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )
    # Pre-popola la cache con un blob non-deserializzabile
    cache_key = "open_meteo_geocoding:search:rome:5:en"
    tmp_cache.set("geocoding", cache_key, {"junk": True}, ttl_s=3600)

    async def run():
        r = await provider.search("Rome", count=5)
        await client.aclose()
        return r

    r = asyncio.run(run())
    assert len(r.results) == 2
    assert len(received) == 1


def test_health_check_timeout_returns_down(tmp_cache, fast_limiter):
    def handler(req: httpx.Request) -> httpx.Response:
        raise httpx.TimeoutException("om geo slow")

    transport = httpx.MockTransport(handler)
    client = make_async_client(transport)
    provider = OpenMeteoGeocodingProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        h = await provider.health_check()
        await client.aclose()
        return h

    h = asyncio.run(run())
    assert h.status == "down"
    assert "timeout" in (h.last_error or "").lower()


def test_health_check_unexpected_status_degraded(tmp_cache, fast_limiter):
    transport = make_json_transport(None, status_code=302)
    client = make_async_client(transport)
    provider = OpenMeteoGeocodingProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        h = await provider.health_check()
        await client.aclose()
        return h

    h = asyncio.run(run())
    assert h.status == "degraded"
    assert "302" in (h.last_error or "")


def test_parse_search_skips_malformed_entry(tmp_cache, fast_limiter):
    """Entry con latitude string non parsabile salta, le altre passano."""
    body = {
        "results": [
            {"name": "Broken", "latitude": "not-a-number", "longitude": "9.0"},
            {"name": "Valid", "latitude": 41.9, "longitude": 12.5, "country_code": "IT"},
        ]
    }
    transport = make_json_transport(body)
    client = make_async_client(transport)
    provider = OpenMeteoGeocodingProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        r = await provider.search("test")
        await client.aclose()
        return r

    r = asyncio.run(run())
    assert len(r.results) == 1
    assert r.results[0].name == "Valid"


def test_parse_search_safe_int_handles_string():
    """_safe_int gestisce string e None senza crash."""
    from services.providers.geocoding.open_meteo_geocoding import (
        _safe_float_opt,
        _safe_int,
    )

    assert _safe_int(None) is None
    assert _safe_int("123") == 123
    assert _safe_int("notnumber") is None
    assert _safe_int(123.7) == 123

    assert _safe_float_opt(None) is None
    assert _safe_float_opt("1.5") == 1.5
    assert _safe_float_opt("not-number") is None


def test_parse_search_country_code_none_safe(tmp_cache, fast_limiter):
    """Entry senza country_code non crasha."""
    body = {
        "results": [
            {"name": "NoCC", "latitude": 0.0, "longitude": 0.0},
        ]
    }
    transport = make_json_transport(body)
    client = make_async_client(transport)
    provider = OpenMeteoGeocodingProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        r = await provider.search("test")
        await client.aclose()
        return r

    r = asyncio.run(run())
    assert len(r.results) == 1
    assert r.results[0].country_code is None


def test_classvars_match_spec():
    assert (
        OpenMeteoGeocodingProvider.BASE_URL
        == "https://geocoding-api.open-meteo.com/v1/search"
    )
    assert OpenMeteoGeocodingProvider.RATE_LIMIT_BUCKET == "open_meteo"
    assert OpenMeteoGeocodingProvider.CACHE_TTL_GEOCODING_S == 365 * 24 * 3600
    assert OpenMeteoGeocodingProvider.name == "open_meteo_geocoding"
    assert OpenMeteoGeocodingProvider.domain == "geocoding"
