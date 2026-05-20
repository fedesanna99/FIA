"""Edge cases coverage 82% -> 95%+ per services/registry e services/base."""
from __future__ import annotations

import asyncio
import pytest

from services.base import Provider
from services.registry import ProviderRegistry


# -----------------------------------------------------------------------
# services/base.py — __init_subclass__ enforcement
# -----------------------------------------------------------------------

def test_provider_subclass_missing_domain_raises_type_error():
    with pytest.raises(TypeError, match="domain"):
        class BadNoDomain(Provider):
            name = "x"

            async def health(self) -> bool:
                return True


def test_provider_subclass_missing_name_raises_type_error():
    with pytest.raises(TypeError, match="name"):
        class BadNoName(Provider):
            domain = "d"

            async def health(self) -> bool:
                return True


def test_provider_with_class_vars_no_health_implementation_still_validated():
    """__init_subclass__ valida domain/name anche se la classe e' astratta
    (abstractmethods sono determinati dopo __init_subclass__ in CPython)."""
    # Definizione con ClassVar dichiarati ma `health` non implementato
    class _StillAbstract(Provider):
        domain = "test_d"
        name = "test_n"
        # health astratto ereditato
    # Class creation OK, ma non istanziabile (TypeError su __init__)
    with pytest.raises(TypeError):
        _StillAbstract()  # type: ignore[abstract]


# -----------------------------------------------------------------------
# services/registry.py — register / get / get_by_name
# -----------------------------------------------------------------------

class _G(Provider):
    domain = "geo"
    name = "g1"
    async def health(self) -> bool:
        return True


class _G2(Provider):
    domain = "geo"
    name = "g2"
    async def health(self) -> bool:
        return True


class _GError(Provider):
    domain = "geo_err"
    name = "boom"
    async def health(self) -> bool:
        raise RuntimeError("network down")


def test_register_instance_or_class():
    reg = ProviderRegistry()
    # Registra come classe (instanziata internamente)
    reg.register(_G)
    # Registra anche come istanza
    inst = _G2()
    reg.register(inst)
    assert "g1" in reg.list_providers("geo")
    assert "g2" in reg.list_providers("geo")


def test_register_provider_with_empty_domain_or_name_raises():
    class _Bad:
        domain = ""
        name = ""

    reg = ProviderRegistry()
    with pytest.raises(ValueError, match="domain"):
        reg.register(_Bad())  # type: ignore[arg-type]


def test_get_by_name_returns_provider():
    reg = ProviderRegistry()
    reg.register(_G)
    p = reg.get_by_name("geo", "g1")
    assert p.name == "g1"


def test_get_by_name_unknown_raises():
    reg = ProviderRegistry()
    reg.register(_G)
    with pytest.raises(KeyError, match="non registrato"):
        reg.get_by_name("geo", "ghost")


def test_get_by_name_unknown_domain_raises():
    reg = ProviderRegistry()
    with pytest.raises(KeyError, match="non registrato"):
        reg.get_by_name("nope", "any")


def test_fallback_chain_empty_for_unknown_domain():
    reg = ProviderRegistry()
    assert reg.fallback_chain("ghost") == []


def test_fallback_chain_invalid_env_csv_skipped(monkeypatch):
    reg = ProviderRegistry()
    reg.register(_G)
    reg.register(_G2)
    monkeypatch.setenv("FEAPRO_GEO_FALLBACK", "g2,non_esiste,g1")
    chain = reg.fallback_chain("geo")
    # g1 e' primary; g2 valido in fallback; non_esiste skippato
    assert [p.name for p in chain] == ["g1", "g2"]


def test_get_falls_back_to_first_when_default_missing():
    """Se `_default_by_domain` non punta a un provider registrato, usa il primo
    registrato disponibile (fallback line 77)."""
    reg = ProviderRegistry()
    reg.register(_G)
    # Manomettiamo manualmente il default puntando a un provider mancante
    reg._default_by_domain["geo"] = "ghost"  # type: ignore[attr-defined]
    p = reg.get("geo")
    # Cade su qualunque provider registrato
    assert p.name == "g1"


def test_list_providers_for_unknown_domain_empty():
    reg = ProviderRegistry()
    assert reg.list_providers("ghost") == []


# -----------------------------------------------------------------------
# health_all
# -----------------------------------------------------------------------

def test_health_all_handles_provider_exception():
    reg = ProviderRegistry()
    reg.register(_GError)
    h = reg.health_all()
    assert h["geo_err/boom"] is False


def test_health_all_handles_already_running_loop():
    """Se chiamiamo health_all dentro un event loop attivo,
    asyncio.run solleva RuntimeError -> il registry lo cattura."""
    reg = ProviderRegistry()
    reg.register(_G)

    async def caller():
        # Da dentro event loop chiamiamo health_all
        return reg.health_all()

    result = asyncio.run(caller())
    # health restituisce False (RuntimeError gestito)
    assert result["geo/g1"] is False


def test_health_all_empty_registry_returns_empty_dict():
    reg = ProviderRegistry()
    assert reg.health_all() == {}


# -----------------------------------------------------------------------
# clear()
# -----------------------------------------------------------------------

def test_clear_removes_all_providers():
    reg = ProviderRegistry()
    reg.register(_G)
    reg.register(_G2)
    assert len(reg.list_domains()) > 0
    reg.clear()
    assert reg.list_domains() == []
    with pytest.raises(KeyError):
        reg.get("geo")
