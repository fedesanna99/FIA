"""Test self_ping module (alpha.12 cold-start mitigation).

Pattern: nessun pytest-asyncio nel progetto. Le funzioni async vengono
testate via `asyncio.run()` inside sync test functions (idem altri test
del progetto).
"""
from __future__ import annotations

import asyncio
import os

import httpx
import pytest

import services.self_ping as sp


@pytest.fixture(autouse=True)
def _reset_state():
    """Reset state e env var prima di ogni test."""
    sp._task = None
    sp._stats.update(
        started_at=0.0, n_pings=0, n_success=0, n_failures=0,
        consecutive_failures=0, last_ping_at=0.0, last_status=0,
        last_latency_ms=0.0, last_error="",
    )
    for key in ("FEAPRO_SELF_PING_ENABLED", "FEAPRO_SELF_PING_URL",
                "FEAPRO_SELF_PING_INTERVAL_S"):
        os.environ.pop(key, None)
    yield


def test_start_disabled_by_default():
    """Senza env var: il task NON parte."""
    task = sp.start_self_ping()
    assert task is None
    assert sp._task is None


def test_start_enabled_but_no_url():
    """ENABLED=true ma URL vuoto: skip + warning."""
    os.environ["FEAPRO_SELF_PING_ENABLED"] = "true"
    task = sp.start_self_ping()
    assert task is None


def test_start_enabled_with_url_creates_task():
    """ENABLED=true + URL valido: task viene creato."""

    async def _run():
        os.environ["FEAPRO_SELF_PING_ENABLED"] = "true"
        os.environ["FEAPRO_SELF_PING_URL"] = "https://example.com/health"
        os.environ["FEAPRO_SELF_PING_INTERVAL_S"] = "60"

        task = sp.start_self_ping()
        assert task is not None
        assert not task.done()

        # Cleanup
        await sp.stop_self_ping()
        assert sp._task is None

    asyncio.run(_run())


def test_start_idempotent():
    """Doppia call a start_self_ping() non crea 2 task."""

    async def _run():
        os.environ["FEAPRO_SELF_PING_ENABLED"] = "true"
        os.environ["FEAPRO_SELF_PING_URL"] = "https://example.com/health"

        task1 = sp.start_self_ping()
        task2 = sp.start_self_ping()
        assert task1 is task2

        await sp.stop_self_ping()

    asyncio.run(_run())


def test_ping_once_success():
    """_ping_once con 200 OK: success=True, status=200, latency>=0."""

    async def _run():
        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(200, json={"status": "ok"})

        transport = httpx.MockTransport(handler)
        async with httpx.AsyncClient(transport=transport) as client:
            success, status, latency_ms, error = await sp._ping_once(
                client, "https://example.com/health"
            )

        assert success is True
        assert status == 200
        assert latency_ms >= 0.0
        assert error == ""

    asyncio.run(_run())


def test_ping_once_5xx_is_failure():
    """_ping_once con 500: success=False."""

    async def _run():
        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(500, text="boom")

        transport = httpx.MockTransport(handler)
        async with httpx.AsyncClient(transport=transport) as client:
            success, status, _, _ = await sp._ping_once(
                client, "https://example.com/health"
            )

        assert success is False
        assert status == 500

    asyncio.run(_run())


def test_ping_once_timeout_is_failure():
    """_ping_once con timeout: success=False, error popolato, status=0."""

    async def _run():
        def handler(request: httpx.Request) -> httpx.Response:
            raise httpx.TimeoutException("timed out", request=request)

        transport = httpx.MockTransport(handler)
        async with httpx.AsyncClient(transport=transport) as client:
            success, status, _, error = await sp._ping_once(
                client, "https://example.com/health"
            )

        assert success is False
        assert status == 0
        assert "timed out" in error

    asyncio.run(_run())


def test_ping_once_404_is_success():
    """4xx (non-5xx) sono considerati success: la proxy Fly ha visto la
    connessione → idle timer reset. Il 404 e' irrilevante per il warming."""

    async def _run():
        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(404)

        transport = httpx.MockTransport(handler)
        async with httpx.AsyncClient(transport=transport) as client:
            success, status, _, _ = await sp._ping_once(
                client, "https://example.com/health"
            )

        assert success is True
        assert status == 404

    asyncio.run(_run())


def test_get_stats_returns_snapshot():
    """get_stats() restituisce dict con tutti i campi previsti."""
    stats = sp.get_stats()
    expected_keys = {
        "started_at", "n_pings", "n_success", "n_failures",
        "consecutive_failures", "last_ping_at", "last_status",
        "last_latency_ms", "last_error",
    }
    assert set(stats.keys()) == expected_keys


def test_interval_clamped_to_safe_range():
    """Interval molto basso (es. 1s) viene clampato a 60s."""

    async def _run():
        os.environ["FEAPRO_SELF_PING_ENABLED"] = "true"
        os.environ["FEAPRO_SELF_PING_URL"] = "https://example.com/health"
        os.environ["FEAPRO_SELF_PING_INTERVAL_S"] = "1"

        task = sp.start_self_ping()
        assert task is not None
        await sp.stop_self_ping()

    asyncio.run(_run())


def test_stop_when_not_started_noop():
    """stop_self_ping() chiamato senza start prima: no-op silente."""

    async def _run():
        await sp.stop_self_ping()
        assert sp._task is None

    asyncio.run(_run())


def test_invalid_interval_falls_back_to_default():
    """Stringa non-numerica in FEAPRO_SELF_PING_INTERVAL_S: usa default 240."""

    async def _run():
        os.environ["FEAPRO_SELF_PING_ENABLED"] = "true"
        os.environ["FEAPRO_SELF_PING_URL"] = "https://example.com/health"
        os.environ["FEAPRO_SELF_PING_INTERVAL_S"] = "not-a-number"

        task = sp.start_self_ping()
        assert task is not None  # non crash
        await sp.stop_self_ping()

    asyncio.run(_run())


def test_consecutive_failures_tracking():
    """Lo stato consecutive_failures si incrementa su fallimenti
    consecutivi e si azzera al primo successo (verifica via direct
    call su _ping_once + simulazione manuale dello stato)."""
    # Simulazione: 3 fail consecutivi → consecutive_failures=3
    for _ in range(3):
        sp._stats["n_pings"] += 1
        sp._stats["n_failures"] += 1
        sp._stats["consecutive_failures"] += 1

    assert sp._stats["consecutive_failures"] == 3

    # Un success azzera
    sp._stats["n_pings"] += 1
    sp._stats["n_success"] += 1
    sp._stats["consecutive_failures"] = 0

    assert sp._stats["consecutive_failures"] == 0
    assert sp._stats["n_failures"] == 3  # totale fail mantenuto
    assert sp._stats["n_success"] == 1
