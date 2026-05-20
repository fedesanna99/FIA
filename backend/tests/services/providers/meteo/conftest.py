"""Conftest condiviso per i test F4.1 (Open-Meteo providers).

Fornisce:
    - load_fixture(filename) -> dict     # carica JSON dalla cartella fixtures
    - tmp_cache fixture                  # ServiceCache su file temporaneo
    - noop_limiter fixture               # RateLimiter con bucket gia' pieni
    - mock_transport(responses)          # httpx.MockTransport che cicla le response
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Callable

import httpx
import pytest

from services.cache import ServiceCache
from services.rate_limiter import RateLimiter


_FIXTURES_DIR = Path(__file__).parent / "fixtures"


def load_fixture(name: str) -> dict[str, Any]:
    """Carica un fixture JSON dalla cartella `fixtures/`."""
    path = _FIXTURES_DIR / name
    with open(path, "r", encoding="utf-8") as f:
        return dict(json.load(f))


@pytest.fixture
def tmp_cache(tmp_path: Path) -> ServiceCache:
    """ServiceCache su sqlite isolato per test (no leak tra test)."""
    return ServiceCache(db_path=tmp_path / "cache.sqlite")


@pytest.fixture
def fast_limiter() -> RateLimiter:
    """RateLimiter con bucket open_meteo a 10000 rps (di fatto disabilitato)."""
    rl = RateLimiter()
    rl.register("open_meteo", rate_per_s=10000.0, capacity=10000.0)
    return rl


def make_mock_transport(
    response_factory: Callable[[httpx.Request], httpx.Response],
) -> httpx.MockTransport:
    """Helper: crea un httpx.MockTransport da una factory request -> response."""
    return httpx.MockTransport(response_factory)


def make_json_transport(
    body: dict[str, Any] | None = None,
    *,
    status_code: int = 200,
) -> httpx.MockTransport:
    """Mock transport che ritorna sempre lo stesso body JSON con lo stesso status."""

    def handler(request: httpx.Request) -> httpx.Response:
        if body is None:
            return httpx.Response(status_code=status_code)
        return httpx.Response(status_code=status_code, json=body)

    return httpx.MockTransport(handler)


def make_counting_transport(
    body: dict[str, Any],
    *,
    status_code: int = 200,
) -> tuple[httpx.MockTransport, list[httpx.Request]]:
    """Mock transport che conta le request ricevute (per test cache-hit)."""
    received: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        received.append(request)
        return httpx.Response(status_code=status_code, json=body)

    return httpx.MockTransport(handler), received


def make_async_client(transport: httpx.MockTransport, *, timeout: float = 10.0) -> httpx.AsyncClient:
    """AsyncClient con MockTransport iniettato."""
    return httpx.AsyncClient(transport=transport, timeout=timeout)
