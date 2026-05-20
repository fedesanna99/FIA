"""Tests F1 — ProviderRegistry (Sprint 1)."""
from __future__ import annotations

import pytest

from services.base import Provider
from services.registry import ProviderRegistry, registry as _module_registry


class _FakeGeoOpenMeteo(Provider):
    domain = "geocoding"
    name = "open_meteo"

    async def health(self) -> bool:
        return True


class _FakeGeoNominatim(Provider):
    domain = "geocoding"
    name = "nominatim"

    async def health(self) -> bool:
        return True


class _FakeGeoGeoapify(Provider):
    domain = "geocoding"
    name = "geoapify"

    async def health(self) -> bool:
        return False


class _FakeMeteo(Provider):
    domain = "meteo"
    name = "open_meteo_weather"

    async def health(self) -> bool:
        return True


@pytest.fixture
def reg() -> ProviderRegistry:
    return ProviderRegistry()


def test_register_provider(reg):
    p = reg.register(_FakeGeoOpenMeteo)
    assert isinstance(p, _FakeGeoOpenMeteo)
    assert "geocoding" in reg.list_domains()
    assert reg.list_providers("geocoding") == ["open_meteo"]


def test_get_provider_by_domain(reg):
    reg.register(_FakeGeoOpenMeteo)
    p = reg.get("geocoding")
    assert p.name == "open_meteo"


def test_get_unknown_domain_raises(reg):
    with pytest.raises(KeyError):
        reg.get("nope")


def test_env_var_selects_provider(reg, monkeypatch):
    reg.register(_FakeGeoOpenMeteo)
    reg.register(_FakeGeoNominatim)
    monkeypatch.setenv("FEAPRO_GEOCODING_PROVIDER", "nominatim")
    assert reg.get("geocoding").name == "nominatim"


def test_env_var_missing_uses_default(reg, monkeypatch):
    reg.register(_FakeGeoOpenMeteo)
    reg.register(_FakeGeoNominatim)
    monkeypatch.delenv("FEAPRO_GEOCODING_PROVIDER", raising=False)
    # primo registrato = open_meteo
    assert reg.get("geocoding").name == "open_meteo"


def test_env_var_invalid_falls_back_to_default(reg, monkeypatch):
    reg.register(_FakeGeoOpenMeteo)
    reg.register(_FakeGeoNominatim)
    monkeypatch.setenv("FEAPRO_GEOCODING_PROVIDER", "non_esiste")
    assert reg.get("geocoding").name == "open_meteo"


def test_fallback_chain_csv_env_var(reg, monkeypatch):
    reg.register(_FakeGeoOpenMeteo)
    reg.register(_FakeGeoNominatim)
    reg.register(_FakeGeoGeoapify)
    monkeypatch.setenv("FEAPRO_GEOCODING_PROVIDER", "open_meteo")
    monkeypatch.setenv("FEAPRO_GEOCODING_FALLBACK", "nominatim,geoapify")
    chain = reg.fallback_chain("geocoding")
    assert [p.name for p in chain] == ["open_meteo", "nominatim", "geoapify"]


def test_health_all_returns_dict(reg):
    reg.register(_FakeGeoOpenMeteo)
    reg.register(_FakeGeoGeoapify)
    reg.register(_FakeMeteo)
    h = reg.health_all()
    assert set(h.keys()) == {
        "geocoding/open_meteo",
        "geocoding/geoapify",
        "meteo/open_meteo_weather",
    }
    assert h["geocoding/open_meteo"] is True
    assert h["geocoding/geoapify"] is False


def test_registry_is_singleton():
    """Il modulo `services.registry` esporta un'unica istanza `registry`."""
    from services.registry import registry as r1
    from services.registry import registry as r2
    assert r1 is r2
    assert r1 is _module_registry
