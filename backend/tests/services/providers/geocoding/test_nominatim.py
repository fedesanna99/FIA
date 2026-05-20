"""Unit tests NominatimProvider (Sprint 2 — F4.2)."""
from __future__ import annotations

import asyncio

import httpx
import pytest

from services.providers.geocoding.nominatim import (
    DEFAULT_USER_AGENT,
    NominatimProvider,
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
    make_routed_transport,
)


# ---- search ---------------------------------------------------------------


def test_search_returns_parsed_locations(tmp_cache, fast_limiter):
    body = load_fixture("nom_search_cagliari.json")
    transport = make_json_transport(body)
    client = make_async_client(transport)
    provider = NominatimProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        r = await provider.search("Cagliari", count=5)
        await client.aclose()
        return r

    r = asyncio.run(run())
    assert r.query == "Cagliari"
    assert len(r.results) == 1
    loc = r.results[0]
    assert "Cagliari" in loc.name
    assert loc.lat == pytest.approx(39.2154, abs=1e-3)
    assert loc.lon == pytest.approx(9.1166, abs=1e-3)
    assert loc.country == "Italia"
    assert loc.country_code == "it"
    assert loc.admin1 == "Sardegna"
    assert loc.admin2 == "Cagliari"
    assert loc.source == "nominatim"


def test_search_caches_second_call(tmp_cache, fast_limiter):
    body = load_fixture("nom_search_cagliari.json")
    transport, received = make_counting_transport(body)
    client = make_async_client(transport)
    provider = NominatimProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        r1 = await provider.search("Cagliari", count=5)
        r2 = await provider.search("Cagliari", count=5)
        await client.aclose()
        return r1, r2

    r1, r2 = asyncio.run(run())
    assert len(received) == 1
    assert r1.model_dump() == r2.model_dump()


def test_search_empty_list(tmp_cache, fast_limiter):
    body = load_fixture("nom_search_empty.json")
    transport = make_json_transport(body)
    client = make_async_client(transport)
    provider = NominatimProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        r = await provider.search("nonexistent_xyz_qwer", count=5)
        await client.aclose()
        return r

    r = asyncio.run(run())
    assert r.results == []


def test_search_sends_user_agent_header(tmp_cache, fast_limiter):
    received_headers: list[dict] = []

    def handler(request: httpx.Request) -> httpx.Response:
        received_headers.append(dict(request.headers))
        return httpx.Response(200, json=load_fixture("nom_search_cagliari.json"))

    transport = httpx.MockTransport(handler)
    client = make_async_client(transport)
    provider = NominatimProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client,
        user_agent="CustomUA/1.0",
    )

    async def run():
        await provider.search("Cagliari")
        await client.aclose()

    asyncio.run(run())
    assert len(received_headers) == 1
    assert received_headers[0].get("user-agent") == "CustomUA/1.0"


def test_default_user_agent_from_env(tmp_cache, fast_limiter, monkeypatch):
    monkeypatch.setenv("FEAPRO_NOMINATIM_USER_AGENT", "EnvUA/2.0")
    provider = NominatimProvider(cache=tmp_cache, rate_limiter=fast_limiter)
    assert provider.user_agent == "EnvUA/2.0"


def test_default_user_agent_fallback(tmp_cache, fast_limiter, monkeypatch):
    monkeypatch.delenv("FEAPRO_NOMINATIM_USER_AGENT", raising=False)
    provider = NominatimProvider(cache=tmp_cache, rate_limiter=fast_limiter)
    assert provider.user_agent == DEFAULT_USER_AGENT


def test_search_429_raises_rate_limit_error(tmp_cache, fast_limiter):
    transport = make_json_transport({"error": "rate"}, status_code=429)
    client = make_async_client(transport)
    provider = NominatimProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        try:
            await provider.search("Cagliari")
        finally:
            await client.aclose()

    with pytest.raises(ProviderRateLimitError):
        asyncio.run(run())


def test_search_500_raises_unavailable_error(tmp_cache, fast_limiter):
    transport = make_json_transport({"err": "5xx"}, status_code=500)
    client = make_async_client(transport)
    provider = NominatimProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        try:
            await provider.search("Cagliari")
        finally:
            await client.aclose()

    with pytest.raises(ProviderUnavailableError):
        asyncio.run(run())


def test_search_timeout_raises_timeout_error(tmp_cache, fast_limiter):
    def handler(req: httpx.Request) -> httpx.Response:
        raise httpx.TimeoutException("nominatim slow")

    transport = httpx.MockTransport(handler)
    client = make_async_client(transport)
    provider = NominatimProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        try:
            await provider.search("Cagliari")
        finally:
            await client.aclose()

    with pytest.raises(ProviderTimeoutError):
        asyncio.run(run())


def test_search_403_raises_provider_error(tmp_cache, fast_limiter):
    """Senza User-Agent valido nominatim ritorna 403 (anti-abuse)."""
    transport = make_json_transport({"error": "no user agent"}, status_code=403)
    client = make_async_client(transport)
    provider = NominatimProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        try:
            await provider.search("Cagliari")
        finally:
            await client.aclose()

    with pytest.raises(ProviderError) as ei:
        asyncio.run(run())
    assert ei.value.status == 403


def test_search_non_list_response_raises(tmp_cache, fast_limiter):
    """Se nominatim restituisce dict invece di list, e' un bug upstream."""
    transport = make_json_transport({"oops": "dict not list"}, status_code=200)
    client = make_async_client(transport)
    provider = NominatimProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        try:
            await provider.search("Cagliari")
        finally:
            await client.aclose()

    with pytest.raises(ProviderError) as ei:
        asyncio.run(run())
    assert "expected list" in str(ei.value).lower()


def test_search_invalid_args_raises(tmp_cache, fast_limiter):
    provider = NominatimProvider(cache=tmp_cache, rate_limiter=fast_limiter)
    with pytest.raises(ValueError):
        asyncio.run(provider.search(""))
    with pytest.raises(ValueError):
        asyncio.run(provider.search("Cagliari", count=0))
    with pytest.raises(ValueError):
        asyncio.run(provider.search("Cagliari", count=51))


# ---- reverse --------------------------------------------------------------


def test_reverse_returns_location(tmp_cache, fast_limiter):
    body = load_fixture("nom_reverse_cagliari.json")
    transport = make_json_transport(body)
    client = make_async_client(transport)
    provider = NominatimProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        r = await provider.reverse(lat=39.2154, lon=9.1166)
        await client.aclose()
        return r

    r = asyncio.run(run())
    assert r.location is not None
    assert "Piazza Yenne" in r.location.name
    assert r.location.country_code == "it"
    assert r.location.admin1 == "Sardegna"


def test_reverse_not_found_returns_none(tmp_cache, fast_limiter):
    body = load_fixture("nom_reverse_notfound.json")
    transport = make_json_transport(body)
    client = make_async_client(transport)
    provider = NominatimProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        r = await provider.reverse(lat=0.0, lon=0.0)
        await client.aclose()
        return r

    r = asyncio.run(run())
    assert r.location is None
    assert r.lat == 0.0
    assert r.lon == 0.0


def test_reverse_caches_second_call(tmp_cache, fast_limiter):
    body = load_fixture("nom_reverse_cagliari.json")
    transport, received = make_counting_transport(body)
    client = make_async_client(transport)
    provider = NominatimProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        r1 = await provider.reverse(lat=39.2154, lon=9.1166)
        r2 = await provider.reverse(lat=39.2154, lon=9.1166)
        await client.aclose()
        return r1, r2

    r1, r2 = asyncio.run(run())
    assert len(received) == 1
    assert r1.model_dump() == r2.model_dump()


def test_reverse_429_raises(tmp_cache, fast_limiter):
    transport = make_json_transport({"err": "429"}, status_code=429)
    client = make_async_client(transport)
    provider = NominatimProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        try:
            await provider.reverse(lat=41.9, lon=12.5)
        finally:
            await client.aclose()

    with pytest.raises(ProviderRateLimitError):
        asyncio.run(run())


# ---- health ---------------------------------------------------------------


def test_health_check_ok(tmp_cache, fast_limiter):
    transport = make_json_transport([], status_code=200)
    client = make_async_client(transport)
    provider = NominatimProvider(
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
    provider = NominatimProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        h = await provider.health_check()
        await client.aclose()
        return h

    h = asyncio.run(run())
    assert h.status == "down"


def test_routed_search_then_reverse(tmp_cache, fast_limiter):
    """Stesso client mock con path-routing per testare search e reverse insieme."""
    transport, received = make_routed_transport(
        {
            "/search": (200, load_fixture("nom_search_cagliari.json")),
            "/reverse": (200, load_fixture("nom_reverse_cagliari.json")),
        }
    )
    client = make_async_client(transport)
    provider = NominatimProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        s = await provider.search("Cagliari")
        rv = await provider.reverse(lat=39.2154, lon=9.1166)
        await client.aclose()
        return s, rv

    s, rv = asyncio.run(run())
    assert len(s.results) == 1
    assert rv.location is not None
    assert len(received) == 2  # 1 search + 1 reverse


def test_search_corrupt_cache_falls_back(tmp_cache, fast_limiter):
    body = load_fixture("nom_search_cagliari.json")
    transport, received = make_counting_transport(body)
    client = make_async_client(transport)
    provider = NominatimProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )
    cache_key = "nominatim:search:cagliari:5:en"
    tmp_cache.set("geocoding", cache_key, {"junk": True}, ttl_s=3600)

    async def run():
        r = await provider.search("Cagliari", count=5)
        await client.aclose()
        return r

    r = asyncio.run(run())
    assert len(r.results) == 1
    assert len(received) == 1


def test_reverse_corrupt_cache_falls_back(tmp_cache, fast_limiter):
    body = load_fixture("nom_reverse_cagliari.json")
    transport, received = make_counting_transport(body)
    client = make_async_client(transport)
    provider = NominatimProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )
    cache_key = "nominatim:reverse:39.21540:9.11660:en"
    tmp_cache.set("geocoding", cache_key, {"corrupt": True}, ttl_s=3600)

    async def run():
        r = await provider.reverse(lat=39.2154, lon=9.1166)
        await client.aclose()
        return r

    r = asyncio.run(run())
    assert r.location is not None
    assert len(received) == 1


def test_reverse_timeout_raises(tmp_cache, fast_limiter):
    def handler(req: httpx.Request) -> httpx.Response:
        raise httpx.TimeoutException("reverse slow")

    transport = httpx.MockTransport(handler)
    client = make_async_client(transport)
    provider = NominatimProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        try:
            await provider.reverse(lat=41.9, lon=12.5)
        finally:
            await client.aclose()

    with pytest.raises(ProviderTimeoutError):
        asyncio.run(run())


def test_reverse_records_call_to_usage_hook(tmp_cache, fast_limiter):
    body = load_fixture("nom_reverse_cagliari.json")
    transport = make_json_transport(body)
    client = make_async_client(transport)
    provider = NominatimProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )
    calls: list[dict] = []

    def record(endpoint, status, latency_ms, cached):
        calls.append({"endpoint": endpoint, "status": status, "cached": cached})

    provider._record_call = record  # type: ignore[method-assign]

    async def run():
        await provider.reverse(lat=39.21, lon=9.11)
        await provider.reverse(lat=39.21, lon=9.11)  # cache hit
        await client.aclose()

    asyncio.run(run())
    assert len(calls) == 2
    assert calls[0]["endpoint"] == "reverse"
    assert calls[0]["status"] == "ok"
    assert calls[1]["status"] == "cache_hit"


def test_health_check_unexpected_status_is_degraded(tmp_cache, fast_limiter):
    """301/307/etc. -> degraded con last_error settato."""
    transport = make_json_transport(None, status_code=301)
    client = make_async_client(transport)
    provider = NominatimProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        h = await provider.health_check()
        await client.aclose()
        return h

    h = asyncio.run(run())
    assert h.status == "degraded"
    assert h.last_error is not None
    assert "301" in h.last_error


def test_parse_search_skips_malformed_entries(tmp_cache, fast_limiter):
    """Entry con lat=non-numerico viene saltata, le altre passano."""
    body = [
        {"lat": "not-a-number", "lon": "9.0", "display_name": "Broken", "address": {}},
        {"lat": "39.21", "lon": "9.11", "display_name": "Cagliari, IT", "address": {"country_code": "it"}},
    ]
    transport = make_json_transport(body)
    client = make_async_client(transport)
    provider = NominatimProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        r = await provider.search("test")
        await client.aclose()
        return r

    r = asyncio.run(run())
    # Solo l'entry valida sopravvive
    assert len(r.results) == 1
    assert r.results[0].country_code == "it"


def test_search_invalidates_corrupt_cache_entry(tmp_cache, fast_limiter):
    """Verifica che dopo fallback la entry corrotta venga riscritta valida."""
    body = load_fixture("nom_search_cagliari.json")
    transport = make_json_transport(body)
    client = make_async_client(transport)
    provider = NominatimProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )
    cache_key = "nominatim:search:rome:5:en"
    tmp_cache.set("geocoding", cache_key, {"bad": "data"}, ttl_s=3600)

    async def run():
        # primo: cache corrotta -> fetch
        r1 = await provider.search("Rome", count=5)
        # secondo: cache valida (riscritta) -> niente fetch
        r2 = await provider.search("Rome", count=5)
        await client.aclose()
        return r1, r2

    r1, r2 = asyncio.run(run())
    assert r1.model_dump() == r2.model_dump()


def test_classvars_match_spec():
    assert NominatimProvider.BASE_URL == "https://nominatim.openstreetmap.org"
    assert NominatimProvider.SEARCH_PATH == "/search"
    assert NominatimProvider.REVERSE_PATH == "/reverse"
    assert NominatimProvider.RATE_LIMIT_BUCKET == "nominatim"
    assert NominatimProvider.CACHE_TTL_GEOCODING_S == 365 * 24 * 3600
    assert NominatimProvider.name == "nominatim"
    assert NominatimProvider.domain == "geocoding"
