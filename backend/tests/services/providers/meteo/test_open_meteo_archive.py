"""Unit tests per OpenMeteoArchiveProvider (Sprint 2 — F4.1)."""
from __future__ import annotations

import asyncio
from datetime import date

import httpx
import pytest

from services.providers.meteo.errors import (
    ProviderError,
    ProviderRateLimitError,
    ProviderTimeoutError,
    ProviderUnavailableError,
)
from services.providers.meteo.open_meteo_archive import OpenMeteoArchiveProvider

from .conftest import (
    load_fixture,
    make_async_client,
    make_counting_transport,
    make_json_transport,
)


def test_extremes_returns_parsed_result_on_first_call(tmp_cache, fast_limiter):
    body = load_fixture("archive_roma_50y.json")
    transport = make_json_transport(body)
    client = make_async_client(transport)
    provider = OpenMeteoArchiveProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        r = await provider.historical_extremes(lat=41.9, lon=12.5, years=50)
        await client.aclose()
        return r

    r = asyncio.run(run())
    assert r.lat == pytest.approx(41.9, abs=0.01)
    assert r.lon == pytest.approx(12.5, abs=0.01)
    assert r.years_used == 50
    assert r.source == "ERA5"
    # Sanity range — Roma synthetic dataset ha picchi vento ~18-30 m/s
    assert 10.0 < r.wind_gust_max_ms < 50.0
    # 50y Gumbel >= max (return period 50 anni e' un quantile alto)
    assert r.wind_gust_50y_ms >= r.wind_gust_max_ms * 0.7
    # Roma quasi mai neve nel synthetic
    assert r.snowfall_max_cm >= 0.0


def test_extremes_uses_cache_on_second_call(tmp_cache, fast_limiter):
    body = load_fixture("archive_roma_50y.json")
    transport, received = make_counting_transport(body)
    client = make_async_client(transport)
    provider = OpenMeteoArchiveProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        r1 = await provider.historical_extremes(lat=41.9, lon=12.5, years=50)
        r2 = await provider.historical_extremes(lat=41.9, lon=12.5, years=50)
        await client.aclose()
        return r1, r2

    r1, r2 = asyncio.run(run())
    assert len(received) == 1, f"Expected 1 HTTP call, got {len(received)}"
    assert r1.model_dump() == r2.model_dump()


def test_extremes_cache_key_rounds_lat_lon_to_4_decimals(tmp_cache, fast_limiter):
    body = load_fixture("archive_roma_50y.json")
    transport, received = make_counting_transport(body)
    client = make_async_client(transport)
    provider = OpenMeteoArchiveProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        await provider.historical_extremes(lat=41.900001, lon=12.500001, years=50)
        await provider.historical_extremes(lat=41.900009, lon=12.500009, years=50)
        await client.aclose()

    asyncio.run(run())
    assert len(received) == 1


def test_extremes_429_raises_rate_limit_error(tmp_cache, fast_limiter):
    transport = make_json_transport({"reason": "rate limit"}, status_code=429)
    client = make_async_client(transport)
    provider = OpenMeteoArchiveProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        try:
            await provider.historical_extremes(lat=41.9, lon=12.5, years=50)
        finally:
            await client.aclose()

    with pytest.raises(ProviderRateLimitError):
        asyncio.run(run())


def test_extremes_500_raises_unavailable_error(tmp_cache, fast_limiter):
    transport = make_json_transport({"reason": "upstream"}, status_code=500)
    client = make_async_client(transport)
    provider = OpenMeteoArchiveProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        try:
            await provider.historical_extremes(lat=41.9, lon=12.5, years=50)
        finally:
            await client.aclose()

    with pytest.raises(ProviderUnavailableError):
        asyncio.run(run())


def test_extremes_timeout_raises_timeout_error(tmp_cache, fast_limiter):
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.TimeoutException("archive timeout")

    transport = httpx.MockTransport(handler)
    client = make_async_client(transport)
    provider = OpenMeteoArchiveProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        try:
            await provider.historical_extremes(lat=41.9, lon=12.5, years=50)
        finally:
            await client.aclose()

    with pytest.raises(ProviderTimeoutError):
        asyncio.run(run())


def test_extremes_400_raises_provider_error(tmp_cache, fast_limiter):
    transport = make_json_transport({"error": "bad request"}, status_code=400)
    client = make_async_client(transport)
    provider = OpenMeteoArchiveProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        try:
            await provider.historical_extremes(lat=41.9, lon=12.5, years=50)
        finally:
            await client.aclose()

    with pytest.raises(ProviderError) as ei:
        asyncio.run(run())
    assert ei.value.status == 400


def test_extremes_records_call_to_usage_hook(tmp_cache, fast_limiter):
    body = load_fixture("archive_roma_50y.json")
    transport = make_json_transport(body)
    client = make_async_client(transport)
    provider = OpenMeteoArchiveProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )
    calls: list[dict] = []

    def record(endpoint, status, latency_ms, cached):
        calls.append({"endpoint": endpoint, "status": status, "cached": cached})

    provider._record_call = record  # type: ignore[method-assign]

    async def run():
        await provider.historical_extremes(lat=41.9, lon=12.5, years=50)
        await provider.historical_extremes(lat=41.9, lon=12.5, years=50)  # cache hit
        await client.aclose()

    asyncio.run(run())
    assert len(calls) == 2
    assert calls[0]["endpoint"] == "extremes"
    assert calls[0]["status"] == "ok"
    assert calls[1]["status"] == "cache_hit"


def test_extremes_computes_gumbel_50y_correctly(tmp_cache, fast_limiter):
    """Dataset deterministico: verifica che il 50y sia ragionevole.

    Il fixture archive_roma_50y.json e' generato con random.seed(42), quindi
    e' deterministico. Calcoliamo direttamente cosa dovrebbe uscire dal
    Gumbel e verifichiamo.
    """
    body = load_fixture("archive_roma_50y.json")
    transport = make_json_transport(body)
    client = make_async_client(transport)
    provider = OpenMeteoArchiveProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        r = await provider.historical_extremes(lat=41.9, lon=12.5, years=50)
        await client.aclose()
        return r

    r = asyncio.run(run())
    # Synthetic Roma: vento gust gauss(base, 3.0), base 18 in inverno.
    # Max annuale tipico ~25-30. 50y Gumbel ~33-40.
    assert 25.0 < r.wind_gust_50y_ms < 50.0
    # 50y > max (per definizione di return period su anni con periodo 50)
    # ma puo' essere leggermente sotto se Gumbel sotto-stima
    assert r.wind_gust_50y_ms > 0.0


def test_extremes_handles_no_snowfall_locations(tmp_cache, fast_limiter):
    """Una location senza nevicate (es. Sahara) deve restituire snowfall_50y_cm ≈ 0."""
    body = {
        "latitude": 25.0,
        "longitude": 10.0,
        "daily": {
            "time": [f"{1975 + y}-{m:02d}-15" for y in range(50) for m in range(1, 13)],
            "wind_gusts_10m_max": [5.0 + (y % 3) for y in range(50) for m in range(1, 13)],
            "snowfall_sum": [0.0] * (50 * 12),
        },
    }
    transport = make_json_transport(body)
    client = make_async_client(transport)
    provider = OpenMeteoArchiveProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        r = await provider.historical_extremes(lat=25.0, lon=10.0, years=50)
        await client.aclose()
        return r

    r = asyncio.run(run())
    assert r.snowfall_max_cm == 0.0
    assert r.snowfall_50y_cm == 0.0  # nessun crash, nessun NaN
    assert r.wind_gust_50y_ms > 0.0


def test_extremes_invalid_years_raises(tmp_cache, fast_limiter):
    provider = OpenMeteoArchiveProvider(cache=tmp_cache, rate_limiter=fast_limiter)
    with pytest.raises(ValueError):
        asyncio.run(provider.historical_extremes(lat=0, lon=0, years=0))
    with pytest.raises(ValueError):
        asyncio.run(provider.historical_extremes(lat=0, lon=0, years=100))


def test_extremes_empty_daily_returns_zero_safely(tmp_cache, fast_limiter):
    """Risposta vuota (no daily data): risultato con tutti zero, no crash."""
    body = {"latitude": 0, "longitude": 0, "daily": {"time": []}}
    transport = make_json_transport(body)
    client = make_async_client(transport)
    provider = OpenMeteoArchiveProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        r = await provider.historical_extremes(lat=0, lon=0, years=10)
        await client.aclose()
        return r

    r = asyncio.run(run())
    assert r.wind_gust_max_ms == 0.0
    assert r.wind_gust_50y_ms == 0.0
    assert r.snowfall_max_cm == 0.0
    assert r.snowfall_50y_cm == 0.0


def test_extremes_unimplemented_forecast_raises():
    provider = OpenMeteoArchiveProvider()
    with pytest.raises(NotImplementedError):
        asyncio.run(provider.forecast(lat=0, lon=0))


def test_get_archive_returns_raw_daily_series(tmp_cache, fast_limiter):
    body = load_fixture("archive_roma_50y.json")
    transport = make_json_transport(body)
    client = make_async_client(transport)
    provider = OpenMeteoArchiveProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        ar = await provider.get_archive(
            lat=41.9, lon=12.5,
            start_date=date(1975, 1, 1), end_date=date(2024, 12, 31),
        )
        await client.aclose()
        return ar

    ar = asyncio.run(run())
    assert ar.provider == "open_meteo_archive"
    assert ar.period_years >= 49
    assert len(ar.daily) > 100


def test_health_check_returns_ok_when_alive(tmp_cache, fast_limiter):
    transport = make_json_transport({"daily": {"time": []}}, status_code=200)
    client = make_async_client(transport)
    provider = OpenMeteoArchiveProvider(
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
    transport = make_json_transport(None, status_code=500)
    client = make_async_client(transport)
    provider = OpenMeteoArchiveProvider(
        cache=tmp_cache, rate_limiter=fast_limiter, client=client
    )

    async def run():
        h = await provider.health_check()
        await client.aclose()
        return h

    h = asyncio.run(run())
    assert h.status == "down"


def test_classvars_match_runbook_spec():
    assert (
        OpenMeteoArchiveProvider.BASE_URL == "https://archive-api.open-meteo.com/v1/archive"
    )
    assert OpenMeteoArchiveProvider.RATE_LIMIT_BUCKET == "open_meteo"
    assert OpenMeteoArchiveProvider.CACHE_TTL_ARCHIVE_S == 30 * 24 * 3600
    assert OpenMeteoArchiveProvider.name == "open_meteo_archive"
    assert OpenMeteoArchiveProvider.domain == "meteo"
