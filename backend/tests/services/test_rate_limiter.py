"""Tests F3 — Token bucket + with_backoff (Sprint 1).

Sprint 1 evita pytest-asyncio (no dipendenze aggiuntive): ogni test sincrono
wrappa il body async con `asyncio.run(...)`.
"""
from __future__ import annotations

import asyncio
import time
from types import SimpleNamespace

import pytest

from services.rate_limiter import RateLimiter, TokenBucket, limiter as _module_limiter


def _make_status_error(code: int) -> Exception:
    exc = Exception(f"HTTP {code}")
    exc.response = SimpleNamespace(status_code=code)  # type: ignore[attr-defined]
    return exc


def test_acquire_immediate_when_tokens_available():
    rl = RateLimiter()
    rl.register("a", rate_per_s=10.0, capacity=5.0)

    async def body():
        t0 = time.perf_counter()
        await rl.acquire("a", n=1)
        return time.perf_counter() - t0

    elapsed = asyncio.run(body())
    assert elapsed < 0.05


def test_acquire_blocks_when_empty():
    async def body():
        bucket = TokenBucket(rate_per_s=10.0, capacity=1.0)
        bucket.tokens = 0.0
        t0 = time.perf_counter()
        await bucket.acquire(1.0)
        return time.perf_counter() - t0

    elapsed = asyncio.run(body())
    # ~0.1 s per refillare 1 token a 10 token/s; accettiamo ampio range.
    assert 0.05 <= elapsed <= 0.5


def test_tokens_refill_over_time():
    async def body():
        bucket = TokenBucket(rate_per_s=20.0, capacity=5.0)
        bucket.tokens = 0.0
        await asyncio.sleep(0.15)
        bucket._refill()
        return bucket.tokens

    tokens = asyncio.run(body())
    assert tokens >= 2.0


def test_capacity_caps_refill():
    async def body():
        bucket = TokenBucket(rate_per_s=100.0, capacity=2.0)
        bucket.tokens = 0.0
        await asyncio.sleep(0.5)
        bucket._refill()
        return bucket.tokens

    tokens = asyncio.run(body())
    assert tokens <= 2.0


def test_register_multiple_buckets():
    rl = RateLimiter()
    rl.register("a", rate_per_s=1.0)
    rl.register("b", rate_per_s=5.0, capacity=10.0)
    assert rl.has("a") and rl.has("b")
    assert rl.get("b").capacity == 10.0


def test_acquire_unknown_bucket_raises():
    rl = RateLimiter()
    with pytest.raises(KeyError):
        asyncio.run(rl.acquire("nope"))


def test_with_backoff_succeeds_on_retry():
    rl = RateLimiter()
    rl.register("api", rate_per_s=1000.0, capacity=100.0)
    calls = {"n": 0}

    async def fn():
        calls["n"] += 1
        if calls["n"] < 3:
            raise _make_status_error(429)
        return "ok"

    res = asyncio.run(rl.with_backoff("api", fn, max_retries=3, initial_delay=0.01))
    assert res == "ok"
    assert calls["n"] == 3


def test_with_backoff_gives_up_after_max_retries():
    rl = RateLimiter()
    rl.register("api", rate_per_s=1000.0, capacity=100.0)
    calls = {"n": 0}

    async def fn():
        calls["n"] += 1
        raise _make_status_error(503)

    with pytest.raises(Exception) as ei:
        asyncio.run(rl.with_backoff("api", fn, max_retries=2, initial_delay=0.001))
    assert "503" in str(ei.value)
    # 1 initial + 2 retry = 3 tentativi totali
    assert calls["n"] == 3


def test_with_backoff_does_not_retry_on_non_retryable():
    rl = RateLimiter()
    rl.register("api", rate_per_s=1000.0, capacity=100.0)
    calls = {"n": 0}

    async def fn():
        calls["n"] += 1
        raise ValueError("non retryable")

    with pytest.raises(ValueError):
        asyncio.run(rl.with_backoff("api", fn, max_retries=3, initial_delay=0.001))
    assert calls["n"] == 1


def test_pre_registered_buckets_at_boot():
    """`services.rate_limiter.limiter` ha bucket pre-registrati."""
    assert _module_limiter.has("nominatim")
    assert _module_limiter.has("usgs_earthquake")
    assert _module_limiter.has("open_meteo")
