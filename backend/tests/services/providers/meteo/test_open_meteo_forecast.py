"""Unit tests per OpenMeteoForecastProvider (Sprint 2 — F4.1).

Pattern: httpx.MockTransport iniettato via `client=` per simulare le response
upstream. Sprint 1 evita pytest-asyncio (no nuove dipendenze): wrappiamo
ogni body async con `asyncio.run(...)`.
"""
from __future__ import annotations

import asyncio
from unittest.mock import patch

import httpx
import pytest

from services.providers.meteo.errors import (
    ProviderError,
    ProviderRateLimitError,
    ProviderTimeoutError,
    ProviderUnavailableError,
)
from services.providers.meteo.open_meteo_forecast import OpenMeteoForecastProvider

from .conftest import (
    load_fixture,
    make_async_client,
    make_counting_transport,
    make_json_transport,
)


def test_forecast_returns_parsed_result_on_first_call(tmp_cache, fast_limiter):
    body = load_fixture("forecast_cagliari.json")
    transport = make_json_transport(body)
    client = make_async_client(transport)
    provider = OpenMeteoForecastProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def body_test():
        try:
            return await provider.forecast(lat=39.21, lon=9.11, days=3)
        finally:
            await client.aclose()

    result = asyncio.run(body_test())
    assert result.provider == "open_meteo_forecast"
    assert result.lat == pytest.approx(39.21, abs=0.01)
    assert result.lon == pytest.approx(9.11, abs=0.01)
    assert result.days == 3
    assert len(result.hourly) == 72  # 24 ore × 3 giorni
    # Sanity check unita': temp Celsius, wind in m/s
    assert all(-50 < h.temp_C < 60 for h in result.hourly)
    assert all(0 <= h.wind_speed_ms < 100 for h in result.hourly)


def test_forecast_uses_cache_on_second_call(tmp_cache, fast_limiter):
    body = load_fixture("forecast_cagliari.json")
    transport, received = make_counting_transport(body)
    client = make_async_client(transport)
    provider = OpenMeteoForecastProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run_twice():
        r1 = await provider.forecast(lat=39.21, lon=9.11, days=3)
        r2 = await provider.forecast(lat=39.21, lon=9.11, days=3)
        await client.aclose()
        return r1, r2

    r1, r2 = asyncio.run(run_twice())
    # r2 viene dalla cache
    assert len(received) == 1, f"Expected 1 HTTP call, got {len(received)}"
    assert r1.model_dump() == r2.model_dump()


def test_forecast_cache_key_rounds_lat_lon_to_4_decimals(tmp_cache, fast_limiter):
    """Due request a 5° decimale di distanza hit la stessa cache key."""
    body = load_fixture("forecast_cagliari.json")
    transport, received = make_counting_transport(body)
    client = make_async_client(transport)
    provider = OpenMeteoForecastProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        # 39.211111 vs 39.211119 -> stesso 4° decimale (39.2111)
        await provider.forecast(lat=39.211111, lon=9.111111, days=3)
        await provider.forecast(lat=39.211119, lon=9.111119, days=3)
        await client.aclose()

    asyncio.run(run())
    assert len(received) == 1, (
        f"Lat/lon a 5° decimale dovrebbero condividere cache key, "
        f"ma sono state fatte {len(received)} call"
    )


def test_forecast_429_raises_rate_limit_error(tmp_cache, fast_limiter):
    transport = make_json_transport({"reason": "rate limit"}, status_code=429)
    client = make_async_client(transport)
    provider = OpenMeteoForecastProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        try:
            await provider.forecast(lat=39.21, lon=9.11, days=3)
        finally:
            await client.aclose()

    with pytest.raises(ProviderRateLimitError) as ei:
        asyncio.run(run())
    assert ei.value.status == 429
    assert ei.value.provider == "open_meteo_forecast"


def test_forecast_500_raises_unavailable_error(tmp_cache, fast_limiter):
    transport = make_json_transport({"reason": "upstream timeout"}, status_code=500)
    client = make_async_client(transport)
    provider = OpenMeteoForecastProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        try:
            await provider.forecast(lat=39.21, lon=9.11, days=3)
        finally:
            await client.aclose()

    with pytest.raises(ProviderUnavailableError) as ei:
        asyncio.run(run())
    assert ei.value.status == 500


def test_forecast_503_raises_unavailable_error(tmp_cache, fast_limiter):
    transport = make_json_transport({"reason": "service unavailable"}, status_code=503)
    client = make_async_client(transport)
    provider = OpenMeteoForecastProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        try:
            await provider.forecast(lat=39.21, lon=9.11, days=3)
        finally:
            await client.aclose()

    with pytest.raises(ProviderUnavailableError) as ei:
        asyncio.run(run())
    assert ei.value.status == 503


def test_forecast_timeout_raises_timeout_error(tmp_cache, fast_limiter):
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.TimeoutException("simulated timeout")

    transport = httpx.MockTransport(handler)
    client = make_async_client(transport)
    provider = OpenMeteoForecastProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        try:
            await provider.forecast(lat=39.21, lon=9.11, days=3)
        finally:
            await client.aclose()

    with pytest.raises(ProviderTimeoutError):
        asyncio.run(run())


def test_forecast_400_raises_provider_error(tmp_cache, fast_limiter):
    """4xx diverso da 429 -> ProviderError (no retry)."""
    transport = make_json_transport({"error": True, "reason": "bad request"}, status_code=400)
    client = make_async_client(transport)
    provider = OpenMeteoForecastProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        try:
            await provider.forecast(lat=39.21, lon=9.11, days=3)
        finally:
            await client.aclose()

    with pytest.raises(ProviderError) as ei:
        asyncio.run(run())
    assert ei.value.status == 400
    # 400 deve essere ProviderError ma NON le sottoclassi rate-limit/unavailable
    assert not isinstance(ei.value, ProviderRateLimitError)
    assert not isinstance(ei.value, ProviderUnavailableError)


def test_forecast_records_call_to_usage_hook(tmp_cache, fast_limiter):
    body = load_fixture("forecast_cagliari.json")
    transport = make_json_transport(body)
    client = make_async_client(transport)
    provider = OpenMeteoForecastProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )
    calls: list[dict] = []

    def record(endpoint, status, latency_ms, cached):
        calls.append(
            {"endpoint": endpoint, "status": status, "latency_ms": latency_ms, "cached": cached}
        )

    provider._record_call = record  # type: ignore[method-assign]

    async def run():
        await provider.forecast(lat=39.21, lon=9.11, days=3)
        await provider.forecast(lat=39.21, lon=9.11, days=3)  # cache hit
        await client.aclose()

    asyncio.run(run())
    assert len(calls) == 2
    assert calls[0]["endpoint"] == "forecast"
    assert calls[0]["status"] == "ok"
    assert calls[0]["cached"] is False
    assert calls[0]["latency_ms"] >= 0.0
    # 2° call: cache hit
    assert calls[1]["status"] == "cache_hit"
    assert calls[1]["cached"] is True


def test_forecast_invalid_days_raises(tmp_cache, fast_limiter):
    provider = OpenMeteoForecastProvider(cache=tmp_cache, rate_limiter=fast_limiter)
    with pytest.raises(ValueError):
        asyncio.run(provider.forecast(lat=0, lon=0, days=0))
    with pytest.raises(ValueError):
        asyncio.run(provider.forecast(lat=0, lon=0, days=17))


def test_forecast_corrupt_cache_falls_back_to_fetch(tmp_cache, fast_limiter):
    """Se la cache contiene dati corrotti, invalida e ri-fetcha."""
    body = load_fixture("forecast_cagliari.json")
    transport, received = make_counting_transport(body)
    client = make_async_client(transport)
    provider = OpenMeteoForecastProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )
    # Salva manualmente dati invalidi nella cache
    cache_key = "open_meteo_forecast:39.2100:9.1100:3"
    tmp_cache.set("meteo", cache_key, {"corrupt": "value"}, ttl_s=3600)

    async def run():
        r = await provider.forecast(lat=39.21, lon=9.11, days=3)
        await client.aclose()
        return r

    result = asyncio.run(run())
    assert len(result.hourly) == 72
    assert len(received) == 1  # fallback al fetch reale


def test_forecast_unimplemented_historical_raises():
    provider = OpenMeteoForecastProvider()
    with pytest.raises(NotImplementedError):
        asyncio.run(provider.historical_extremes(lat=0, lon=0))


def test_health_check_returns_ok_when_endpoint_alive(tmp_cache, fast_limiter):
    body = {"latitude": 0, "longitude": 0, "hourly": {"time": [], "temperature_2m": []}}
    transport = make_json_transport(body, status_code=200)
    client = make_async_client(transport)
    provider = OpenMeteoForecastProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        h = await provider.health_check()
        await client.aclose()
        return h

    h = asyncio.run(run())
    assert h.provider == "open_meteo_forecast"
    assert h.status in ("ok", "degraded")  # latency <1500 ms -> ok
    assert h.last_error is None


def test_health_check_returns_down_when_endpoint_5xx(tmp_cache, fast_limiter):
    transport = make_json_transport(None, status_code=503)
    client = make_async_client(transport)
    provider = OpenMeteoForecastProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        h = await provider.health_check()
        await client.aclose()
        return h

    h = asyncio.run(run())
    assert h.status == "down"
    assert h.last_error is not None


def test_health_check_returns_down_on_timeout(tmp_cache, fast_limiter):
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.TimeoutException("timeout")

    transport = httpx.MockTransport(handler)
    client = make_async_client(transport)
    provider = OpenMeteoForecastProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        h = await provider.health_check()
        await client.aclose()
        return h

    h = asyncio.run(run())
    assert h.status == "down"
    assert "timeout" in (h.last_error or "").lower()


def test_health_via_provider_abc_returns_bool(tmp_cache, fast_limiter):
    """`health()` (Provider ABC) wrappa `health_check()` e ritorna bool."""
    body = {"hourly": {"time": []}}
    transport = make_json_transport(body, status_code=200)
    client = make_async_client(transport)
    provider = OpenMeteoForecastProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        b = await provider.health()
        await client.aclose()
        return b

    res = asyncio.run(run())
    assert isinstance(res, bool)


def test_classvars_match_runbook_spec():
    """Verifica costanti di classe (chi cambia BASE_URL deve aggiornare i test)."""
    assert OpenMeteoForecastProvider.BASE_URL == "https://api.open-meteo.com/v1/forecast"
    assert OpenMeteoForecastProvider.RATE_LIMIT_BUCKET == "open_meteo"
    assert OpenMeteoForecastProvider.CACHE_TTL_FORECAST_S == 6 * 3600
    assert OpenMeteoForecastProvider.name == "open_meteo_forecast"
    assert OpenMeteoForecastProvider.domain == "meteo"
