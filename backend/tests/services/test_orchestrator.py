"""Tests F8 — ServiceOrchestrator (Sprint 2)."""
from __future__ import annotations

import asyncio
from typing import Any

import pytest

from services.base import Provider
from services.orchestrator import (
    AllProvidersFailedError,
    ServiceOrchestrator,
)
from services.providers.meteo.errors import (
    ProviderError,
    ProviderRateLimitError,
    ProviderTimeoutError,
    ProviderUnavailableError,
)
from services.registry import ProviderRegistry


# ---- Fake providers per test --------------------------------------------


class _FakePrimary(Provider):
    domain = "test"
    name = "primary"

    def __init__(self, raise_exc: Exception | None = None, ret: Any = "primary-ok"):
        self.raise_exc = raise_exc
        self.ret = ret
        self.calls = 0

    async def health(self) -> bool:
        return True

    async def lookup(self, x: int) -> Any:
        self.calls += 1
        if self.raise_exc is not None:
            raise self.raise_exc
        return f"{self.ret}:{x}"

    async def reverse(self, x: int) -> Any:
        # Volutamente non implementato (per testare NotImplementedError → skip)
        raise NotImplementedError("primary non supporta reverse")


class _FakeFallback(Provider):
    domain = "test"
    name = "fallback"

    def __init__(self, raise_exc: Exception | None = None, ret: Any = "fallback-ok"):
        self.raise_exc = raise_exc
        self.ret = ret
        self.calls = 0

    async def health(self) -> bool:
        return True

    async def lookup(self, x: int) -> Any:
        self.calls += 1
        if self.raise_exc is not None:
            raise self.raise_exc
        return f"{self.ret}:{x}"

    async def reverse(self, x: int) -> Any:
        self.calls += 1
        return f"{self.ret}-reverse:{x}"


@pytest.fixture
def reg_with_fallback(monkeypatch) -> ProviderRegistry:
    """Registry con primary+fallback registrati, env var fallback configurata."""
    reg = ProviderRegistry()
    reg.register(_FakePrimary())
    reg.register(_FakeFallback())
    monkeypatch.setenv("FEAPRO_TEST_PROVIDER", "primary")
    monkeypatch.setenv("FEAPRO_TEST_FALLBACK", "fallback")
    return reg


# ---- Test base ---------------------------------------------------------


def test_call_uses_primary_when_ok(reg_with_fallback):
    primary = reg_with_fallback.get_by_name("test", "primary")
    fallback = reg_with_fallback.get_by_name("test", "fallback")
    orch = ServiceOrchestrator(registry=reg_with_fallback)

    res = asyncio.run(orch.call("test", "lookup", 42))
    assert res == "primary-ok:42"
    assert primary.calls == 1  # type: ignore[attr-defined]
    assert fallback.calls == 0  # type: ignore[attr-defined]


def test_call_falls_back_on_unavailable(monkeypatch):
    reg = ProviderRegistry()
    primary = _FakePrimary(raise_exc=ProviderUnavailableError("5xx", provider="primary"))
    fallback = _FakeFallback()
    reg.register(primary)
    reg.register(fallback)
    monkeypatch.setenv("FEAPRO_TEST_FALLBACK", "fallback")
    orch = ServiceOrchestrator(registry=reg)

    res = asyncio.run(orch.call("test", "lookup", 7))
    assert res == "fallback-ok:7"
    assert primary.calls == 1
    assert fallback.calls == 1


def test_call_falls_back_on_timeout(monkeypatch):
    reg = ProviderRegistry()
    primary = _FakePrimary(raise_exc=ProviderTimeoutError("slow", provider="primary"))
    fallback = _FakeFallback()
    reg.register(primary)
    reg.register(fallback)
    monkeypatch.setenv("FEAPRO_TEST_FALLBACK", "fallback")
    orch = ServiceOrchestrator(registry=reg)

    res = asyncio.run(orch.call("test", "lookup", 1))
    assert res == "fallback-ok:1"


def test_call_falls_back_on_rate_limit(monkeypatch):
    reg = ProviderRegistry()
    primary = _FakePrimary(raise_exc=ProviderRateLimitError("429", provider="primary"))
    fallback = _FakeFallback()
    reg.register(primary)
    reg.register(fallback)
    monkeypatch.setenv("FEAPRO_TEST_FALLBACK", "fallback")
    orch = ServiceOrchestrator(registry=reg)

    res = asyncio.run(orch.call("test", "lookup", 1))
    assert res == "fallback-ok:1"


def test_call_falls_back_on_not_implemented(monkeypatch):
    """Provider che solleva NotImplementedError per il metodo richiesto -> skip."""
    reg = ProviderRegistry()
    primary = _FakePrimary()
    fallback = _FakeFallback()
    reg.register(primary)
    reg.register(fallback)
    monkeypatch.setenv("FEAPRO_TEST_FALLBACK", "fallback")
    orch = ServiceOrchestrator(registry=reg)

    # Primary.reverse() raises NotImplementedError -> orchestrator skip a fallback
    res = asyncio.run(orch.call("test", "reverse", 99))
    assert res == "fallback-ok-reverse:99"


def test_call_propagates_value_error_immediately(monkeypatch):
    """ValueError NON e' retryable: propaga subito senza fallback."""
    reg = ProviderRegistry()
    primary = _FakePrimary(raise_exc=ValueError("bad input"))
    fallback = _FakeFallback()
    reg.register(primary)
    reg.register(fallback)
    monkeypatch.setenv("FEAPRO_TEST_FALLBACK", "fallback")
    orch = ServiceOrchestrator(registry=reg)

    with pytest.raises(ValueError):
        asyncio.run(orch.call("test", "lookup", 1))
    assert primary.calls == 1
    assert fallback.calls == 0  # NON viene chiamato


def test_call_propagates_provider_error_400(monkeypatch):
    """ProviderError generico (es. 400 bad request) NON e' retryable."""
    reg = ProviderRegistry()
    primary = _FakePrimary(
        raise_exc=ProviderError("bad req", provider="primary", status=400)
    )
    fallback = _FakeFallback()
    reg.register(primary)
    reg.register(fallback)
    monkeypatch.setenv("FEAPRO_TEST_FALLBACK", "fallback")
    orch = ServiceOrchestrator(registry=reg)

    with pytest.raises(ProviderError):
        asyncio.run(orch.call("test", "lookup", 1))
    assert fallback.calls == 0  # NON skippa


def test_call_all_providers_failed_raises_aggregated_error(monkeypatch):
    """Tutti i provider sollevano errori retryable -> AllProvidersFailedError."""
    reg = ProviderRegistry()
    primary = _FakePrimary(raise_exc=ProviderUnavailableError("p-5xx", provider="primary"))
    fallback = _FakeFallback(raise_exc=ProviderTimeoutError("f-timeout", provider="fallback"))
    reg.register(primary)
    reg.register(fallback)
    monkeypatch.setenv("FEAPRO_TEST_FALLBACK", "fallback")
    orch = ServiceOrchestrator(registry=reg)

    with pytest.raises(AllProvidersFailedError) as ei:
        asyncio.run(orch.call("test", "lookup", 1))
    err = ei.value
    assert err.domain == "test"
    assert len(err.attempts) == 2
    assert err.attempts[0][0] == "primary"
    assert err.attempts[1][0] == "fallback"
    assert isinstance(err.attempts[0][1], ProviderUnavailableError)
    assert isinstance(err.attempts[1][1], ProviderTimeoutError)
    assert primary.calls == 1
    assert fallback.calls == 1


def test_call_skip_provider_missing_method(monkeypatch):
    """Provider senza il metodo richiesto: orchestrator skippa al next."""
    class _NoLookup(Provider):
        domain = "test"
        name = "no_lookup"

        async def health(self) -> bool:
            return True

        async def search(self) -> str:
            return "search-only"

    reg = ProviderRegistry()
    no_lookup = _NoLookup()
    fallback = _FakeFallback()
    reg.register(no_lookup)
    reg.register(fallback)
    monkeypatch.setenv("FEAPRO_TEST_FALLBACK", "fallback")
    orch = ServiceOrchestrator(registry=reg)

    res = asyncio.run(orch.call("test", "lookup", 5))
    assert res == "fallback-ok:5"


def test_call_unknown_domain_raises_key_error():
    reg = ProviderRegistry()
    orch = ServiceOrchestrator(registry=reg)
    with pytest.raises(KeyError):
        asyncio.run(orch.call("nope", "lookup", 1))


def test_call_no_chain_raises_key_error():
    """Registry vuoto -> KeyError consistent."""
    reg = ProviderRegistry()
    orch = ServiceOrchestrator(registry=reg)
    with pytest.raises(KeyError):
        asyncio.run(orch.call("test", "lookup", 1))


# ---- call_by_name -------------------------------------------------------


def test_call_by_name_bypasses_chain(monkeypatch):
    """call_by_name salta la chain e chiama il provider specifico."""
    reg = ProviderRegistry()
    primary = _FakePrimary(ret="P")
    fallback = _FakeFallback(ret="F")
    reg.register(primary)
    reg.register(fallback)
    monkeypatch.setenv("FEAPRO_TEST_PROVIDER", "primary")  # primary e' default
    monkeypatch.setenv("FEAPRO_TEST_FALLBACK", "fallback")
    orch = ServiceOrchestrator(registry=reg)

    # call_by_name("fallback") -> usa fallback anche se primary funziona
    res = asyncio.run(orch.call_by_name("test", "fallback", "lookup", 1))
    assert res == "F:1"
    assert primary.calls == 0


def test_call_by_name_unknown_raises_key_error():
    reg = ProviderRegistry()
    reg.register(_FakePrimary())
    orch = ServiceOrchestrator(registry=reg)

    with pytest.raises(KeyError):
        asyncio.run(orch.call_by_name("test", "nonexistent", "lookup", 1))


def test_call_by_name_method_missing_raises_attribute_error():
    reg = ProviderRegistry()
    reg.register(_FakePrimary())
    orch = ServiceOrchestrator(registry=reg)

    with pytest.raises(AttributeError):
        asyncio.run(orch.call_by_name("test", "primary", "nonexistent_method"))


def test_call_by_name_propagates_provider_error():
    """call_by_name non skippa: errori propagati."""
    reg = ProviderRegistry()
    primary = _FakePrimary(raise_exc=ProviderUnavailableError("5xx", provider="primary"))
    reg.register(primary)
    orch = ServiceOrchestrator(registry=reg)

    with pytest.raises(ProviderUnavailableError):
        asyncio.run(orch.call_by_name("test", "primary", "lookup", 1))


# ---- get_chain ----------------------------------------------------------


def test_get_chain_returns_default_chain(monkeypatch):
    reg = ProviderRegistry()
    reg.register(_FakePrimary())
    reg.register(_FakeFallback())
    monkeypatch.setenv("FEAPRO_TEST_FALLBACK", "fallback")
    orch = ServiceOrchestrator(registry=reg)
    chain = orch.get_chain("test")
    assert [p.name for p in chain] == ["primary", "fallback"]


def test_get_chain_empty_for_unknown_domain():
    reg = ProviderRegistry()
    orch = ServiceOrchestrator(registry=reg)
    assert orch.get_chain("nope") == []


# ---- registration helper ------------------------------------------------


def test_register_all_populates_all_4_domains():
    from services.providers.registration import register_all

    reg = ProviderRegistry()
    register_all(target=reg)
    assert set(reg.list_domains()) == {"meteo", "geocoding", "elevation", "seismic"}
    assert len(reg.list_providers("meteo")) == 2  # forecast + archive
    assert len(reg.list_providers("geocoding")) == 2  # open_meteo + nominatim
    assert len(reg.list_providers("elevation")) == 2  # open + usgs
    assert len(reg.list_providers("seismic")) == 1  # usgs_earthquake


def test_register_all_returns_registry():
    from services.providers.registration import register_all

    reg = ProviderRegistry()
    result = register_all(target=reg)
    assert result is reg


def test_register_all_uses_default_singleton_when_none():
    """Senza target, registra nel singleton globale (con cleanup)."""
    from services.providers.registration import register_all
    from services.registry import registry as default_reg

    # Pulizia preventiva (test puo' essere isolato)
    default_reg.clear()
    register_all()
    assert set(default_reg.list_domains()) >= {"meteo", "geocoding", "elevation", "seismic"}


# ---- integration con tracker (F6 wired) ---------------------------------


def test_orchestrator_with_real_providers_records_tracker():
    """E2E: orchestrator usa un provider con MockTransport, il tracker
    registra la chiamata (singleton riabilitato via fixture).
    """
    import httpx
    from services.cache import ServiceCache
    from services.providers.elevation.open_elevation import OpenElevationProvider
    from services.rate_limiter import RateLimiter
    from services.usage_tracker import tracker as global_tracker

    # Setup: tracker singleton enabled with tmp DB
    import tempfile
    import os
    tmp = tempfile.mkdtemp()
    orig_db = global_tracker.db_path
    orig_enabled = global_tracker.enabled
    try:
        from pathlib import Path
        global_tracker.db_path = Path(tmp) / "usage.sqlite"
        global_tracker._init_db()
        global_tracker.clear()
        global_tracker.set_enabled(True)

        # Setup provider con mock transport
        cache = ServiceCache(db_path=Path(tmp) / "cache.sqlite")
        rl = RateLimiter()
        rl.register("open_elevation", rate_per_s=10000, capacity=10000)
        body = {"results": [{"latitude": 41.9, "longitude": 12.5, "elevation": 21}]}
        transport = httpx.MockTransport(lambda req: httpx.Response(200, json=body))
        client = httpx.AsyncClient(transport=transport)
        provider = OpenElevationProvider(cache=cache, rate_limiter=rl, client=client)

        reg = ProviderRegistry()
        reg.register(provider)
        orch = ServiceOrchestrator(registry=reg)

        async def run():
            r = await orch.call("elevation", "lookup", 41.9, 12.5)
            await client.aclose()
            return r

        result = asyncio.run(run())
        assert result.elevation_m == pytest.approx(21.0)

        # Tracker ha registrato la call
        rows = global_tracker.aggregate(since_ts=0)
        assert any(r.provider == "open_elevation" for r in rows)
    finally:
        global_tracker.set_enabled(orig_enabled)
        global_tracker.db_path = orig_db
        # cleanup tmp dir (best-effort)
        import shutil
        shutil.rmtree(tmp, ignore_errors=True)


# ---- AllProvidersFailedError ---------------------------------------------


def test_all_providers_failed_error_message_includes_chain():
    err = AllProvidersFailedError(
        domain="test",
        attempts=[
            ("p1", ProviderUnavailableError("p1-5xx")),
            ("p2", ProviderTimeoutError("p2-timeout")),
        ],
    )
    msg = str(err)
    assert "test" in msg
    assert "p1" in msg
    assert "p2" in msg
    assert "2 provider(s)" in msg


def test_all_providers_failed_inherits_unavailable():
    """AllProvidersFailedError e' un ProviderUnavailableError -> chainable."""
    err = AllProvidersFailedError(
        domain="test", attempts=[("p1", ProviderUnavailableError("x"))],
    )
    assert isinstance(err, ProviderUnavailableError)


def test_orchestrator_singleton_exists():
    from services.orchestrator import orchestrator
    from services.registry import registry as default_reg
    assert orchestrator.registry is default_reg
