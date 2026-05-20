"""Conftest condiviso per i test F4.3 (Elevation providers)."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Callable

import httpx
import pytest

from services.cache import ServiceCache
from services.rate_limiter import RateLimiter


_FIXTURES_DIR = Path(__file__).parent / "fixtures"


def load_fixture(name: str) -> Any:
    path = _FIXTURES_DIR / name
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


@pytest.fixture
def tmp_cache(tmp_path: Path) -> ServiceCache:
    return ServiceCache(db_path=tmp_path / "cache.sqlite")


@pytest.fixture
def fast_limiter() -> RateLimiter:
    rl = RateLimiter()
    rl.register("open_elevation", rate_per_s=10000.0, capacity=10000.0)
    rl.register("usgs_elevation", rate_per_s=10000.0, capacity=10000.0)
    return rl


def make_json_transport(
    body: Any | None = None,
    *,
    status_code: int = 200,
) -> httpx.MockTransport:
    def handler(request: httpx.Request) -> httpx.Response:
        if body is None:
            return httpx.Response(status_code=status_code)
        return httpx.Response(status_code=status_code, json=body)

    return httpx.MockTransport(handler)


def make_counting_transport(
    body: Any,
    *,
    status_code: int = 200,
) -> tuple[httpx.MockTransport, list[httpx.Request]]:
    received: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        received.append(request)
        return httpx.Response(status_code=status_code, json=body)

    return httpx.MockTransport(handler), received


def make_method_transport(
    routes: dict[str, tuple[int, Any]],
) -> tuple[httpx.MockTransport, list[httpx.Request]]:
    """Mock transport che cambia response in base al METODO HTTP (GET/POST)."""
    received: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        received.append(request)
        method = request.method.upper()
        if method in routes:
            code, body = routes[method]
            if body is None:
                return httpx.Response(status_code=code)
            return httpx.Response(status_code=code, json=body)
        return httpx.Response(status_code=405, json={"error": "method not allowed"})

    return httpx.MockTransport(handler), received


def make_async_client(transport: httpx.MockTransport, *, timeout: float = 10.0) -> httpx.AsyncClient:
    return httpx.AsyncClient(transport=transport, timeout=timeout)
