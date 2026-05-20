"""Tests B4 — MeteoLoadsService (Sprint 2).

Test su due livelli:
    1. Funzioni pure (formule EN 1991)
    2. Service end-to-end con orchestrator mockato
"""
from __future__ import annotations

import asyncio
from dataclasses import dataclass

import pytest

from services.facades.meteo_loads import (
    AIR_DENSITY_KG_M3,
    GUST_FACTOR,
    SNOW_DENSITY_KG_M3,
    SNOW_MU_I_FLAT_ROOF,
    TERRAIN_II_C_E_10M,
    MeteoLoadsResult,
    MeteoLoadsService,
    compute_q_b,
    compute_q_p_z10,
    compute_s_design,
    compute_s_k_from_snowfall,
    compute_v_b0_from_gust,
)
from services.orchestrator import ServiceOrchestrator
from services.providers.meteo.errors import (
    ProviderError,
    ProviderUnavailableError,
)
from services.registry import ProviderRegistry


# ============================================================================
# Formule pure
# ============================================================================


def test_compute_v_b0_from_gust_default_factor():
    """gust 40 m/s / 1.4 = 28.57 m/s."""
    v = compute_v_b0_from_gust(40.0)
    assert v == pytest.approx(28.571, abs=0.01)


def test_compute_v_b0_zero_gust_returns_zero():
    assert compute_v_b0_from_gust(0.0) == 0.0


def test_compute_v_b0_negative_clipped_to_zero():
    assert compute_v_b0_from_gust(-5.0) == 0.0


def test_compute_v_b0_custom_gust_factor():
    # custom factor 1.5
    v = compute_v_b0_from_gust(30.0, gust_factor=1.5)
    assert v == pytest.approx(20.0, abs=0.01)


def test_compute_v_b0_invalid_factor_raises():
    with pytest.raises(ValueError):
        compute_v_b0_from_gust(40.0, gust_factor=0.0)
    with pytest.raises(ValueError):
        compute_v_b0_from_gust(40.0, gust_factor=-1.0)


def test_compute_q_b_basic():
    """q_b = 0.5 · 1.25 · v² / 1000."""
    # v_b0 = 28.5 m/s -> q_b = 0.5 * 1.25 * 28.5^2 / 1000 = 0.50766 kN/m²
    q = compute_q_b(28.5)
    assert q == pytest.approx(0.5077, abs=0.001)


def test_compute_q_b_zero():
    assert compute_q_b(0.0) == 0.0


def test_compute_q_b_custom_density():
    # ρ doppia -> q raddoppia
    q1 = compute_q_b(20.0, air_density_kg_m3=1.25)
    q2 = compute_q_b(20.0, air_density_kg_m3=2.5)
    assert q2 == pytest.approx(2 * q1, abs=0.001)


def test_compute_q_p_z10_default_c_e():
    """q_p = 1.7 · q_b (terreno II default)."""
    q_b = 0.5
    q_p = compute_q_p_z10(q_b)
    assert q_p == pytest.approx(0.85, abs=0.001)


def test_compute_q_p_z10_custom_c_e():
    q_p = compute_q_p_z10(0.5, c_e=2.5)
    assert q_p == pytest.approx(1.25, abs=0.001)


def test_compute_s_k_from_snowfall_100cm():
    """100 cm a ρ=200 kg/m³: s_k = 200 · 9.81 · 1.0 / 1000 = 1.962 kN/m²."""
    s = compute_s_k_from_snowfall(100.0)
    assert s == pytest.approx(1.962, abs=0.005)


def test_compute_s_k_zero_snowfall():
    assert compute_s_k_from_snowfall(0.0) == 0.0


def test_compute_s_k_negative_clipped():
    assert compute_s_k_from_snowfall(-10.0) == 0.0


def test_compute_s_k_custom_density():
    # neve fresca leggera
    s_fresh = compute_s_k_from_snowfall(50.0, snow_density_kg_m3=100.0)
    s_settled = compute_s_k_from_snowfall(50.0, snow_density_kg_m3=300.0)
    assert s_settled == pytest.approx(3 * s_fresh, abs=0.005)


def test_compute_s_design_default():
    """s = 0.8 · 1.0 · 1.0 · s_k."""
    s = compute_s_design(2.0)
    assert s == pytest.approx(1.6, abs=0.001)


def test_compute_s_design_custom_factors():
    s = compute_s_design(2.0, mu_i=1.0, c_e=1.2, c_t=0.95)
    assert s == pytest.approx(2.0 * 1.0 * 1.2 * 0.95, abs=0.001)


# ============================================================================
# Service end-to-end con mock providers
# ============================================================================


@dataclass
class _FakeExtremes:
    """Mock di WindSnowExtremes."""

    lat: float = 41.9
    lon: float = 12.5
    years_used: int = 50
    wind_gust_max_ms: float = 25.0
    wind_gust_50y_ms: float = 35.0
    snowfall_max_cm: float = 15.0
    snowfall_50y_cm: float = 30.0
    source: str = "open_meteo_archive"


@dataclass
class _FakeElevation:
    """Mock di ElevationPoint."""

    lat: float = 41.9
    lon: float = 12.5
    elevation_m: float = 21.0
    source: str = "open_elevation"


from services.base import Provider as _BaseProvider


class _FakeMeteoProvider(_BaseProvider):
    domain = "meteo"
    name = "fake_meteo"

    def __init__(self, extremes: _FakeExtremes | None = None,
                 raise_exc: Exception | None = None):
        self.extremes = extremes or _FakeExtremes()
        self.raise_exc = raise_exc

    async def health(self) -> bool:
        return True

    async def historical_extremes(self, lat: float, lon: float, years: int = 80):
        if self.raise_exc is not None:
            raise self.raise_exc
        return self.extremes


class _FakeElevationProvider(_BaseProvider):
    domain = "elevation"
    name = "fake_elevation"

    def __init__(self, point: _FakeElevation | None = None,
                 raise_exc: Exception | None = None):
        self.point = point or _FakeElevation()
        self.raise_exc = raise_exc

    async def health(self) -> bool:
        return True

    async def lookup(self, lat: float, lon: float):
        if self.raise_exc is not None:
            raise self.raise_exc
        return self.point


@pytest.fixture
def service_with_mocks():
    """Service con orchestrator + mock providers (no env vars)."""
    reg = ProviderRegistry()
    meteo = _FakeMeteoProvider()
    elev = _FakeElevationProvider()
    reg.register(meteo)
    reg.register(elev)
    orch = ServiceOrchestrator(registry=reg)
    return MeteoLoadsService(orchestrator=orch), meteo, elev


def test_compute_returns_full_result(service_with_mocks):
    svc, _meteo, _elev = service_with_mocks
    r = asyncio.run(svc.compute(lat=41.9, lon=12.5))
    assert isinstance(r, MeteoLoadsResult)
    assert r.location.lat == 41.9
    assert r.location.lon == 12.5
    assert r.location.elevation_m == 21.0
    assert r.location.elevation_source == "open_elevation"


def test_compute_wind_values_consistent(service_with_mocks):
    svc, _, _ = service_with_mocks
    r = asyncio.run(svc.compute(lat=41.9, lon=12.5))
    # gust 50y = 35 m/s -> v_b0 = 25 m/s
    assert r.wind.v_b0_ms == pytest.approx(25.0, abs=0.05)
    # q_b = 0.5 · 1.25 · 25² / 1000 = 0.391 kN/m²
    assert r.wind.q_b_kN_m2 == pytest.approx(0.391, abs=0.005)
    # q_p = 1.7 · q_b
    assert r.wind.q_p_z10_kN_m2 == pytest.approx(1.7 * r.wind.q_b_kN_m2, abs=0.005)
    assert r.wind.terrain_category == "II"
    assert r.wind.gust_max_observed_ms == 25.0  # max storico osservato
    assert r.wind.gust_factor == GUST_FACTOR
    assert r.wind.air_density_kg_m3 == AIR_DENSITY_KG_M3
    assert r.wind.c_e_z10 == TERRAIN_II_C_E_10M


def test_compute_snow_values_consistent(service_with_mocks):
    svc, _, _ = service_with_mocks
    r = asyncio.run(svc.compute(lat=41.9, lon=12.5))
    # snowfall_50y = 30 cm, ρ=200 -> s_k = 200 · 9.81 · 0.3 / 1000 = 0.5886
    assert r.snow.s_k_kN_m2 == pytest.approx(0.589, abs=0.005)
    # s_design = 0.8 · s_k
    assert r.snow.s_design_kN_m2 == pytest.approx(0.8 * r.snow.s_k_kN_m2, abs=0.005)
    assert r.snow.snowfall_max_observed_cm == 15.0
    assert r.snow.mu_i_default == SNOW_MU_I_FLAT_ROOF
    assert r.snow.snow_density_kg_m3 == SNOW_DENSITY_KG_M3


def test_compute_uses_provided_elevation(service_with_mocks):
    """Se elevation_m e' passato, NON viene chiamato il provider elevation."""
    svc, _, elev = service_with_mocks
    r = asyncio.run(svc.compute(lat=41.9, lon=12.5, elevation_m=500.0))
    assert r.location.elevation_m == 500.0
    assert r.location.elevation_source is None  # provider non chiamato


def test_compute_elevation_failure_added_to_notes(monkeypatch):
    """Provider elevation che fallisce -> note + elevation_m=None."""
    reg = ProviderRegistry()
    reg.register(_FakeMeteoProvider())
    reg.register(_FakeElevationProvider(
        raise_exc=ProviderUnavailableError("down", provider="fake_elevation")
    ))
    orch = ServiceOrchestrator(registry=reg)
    svc = MeteoLoadsService(orchestrator=orch)

    r = asyncio.run(svc.compute(lat=41.9, lon=12.5))
    assert r.location.elevation_m is None
    assert any("elevation" in n.lower() for n in r.notes)


def test_compute_elevation_unknown_domain_handled():
    """Se dominio elevation non registrato -> nota + elevation_m=None."""
    reg = ProviderRegistry()
    reg.register(_FakeMeteoProvider())
    # NO elevation provider
    orch = ServiceOrchestrator(registry=reg)
    svc = MeteoLoadsService(orchestrator=orch)

    r = asyncio.run(svc.compute(lat=41.9, lon=12.5))
    assert r.location.elevation_m is None
    assert any("elevation domain" in n.lower() for n in r.notes)


def test_compute_meteo_unavailable_raises():
    """Nessun provider meteo registrato -> ProviderUnavailableError."""
    reg = ProviderRegistry()
    # NO meteo provider
    orch = ServiceOrchestrator(registry=reg)
    svc = MeteoLoadsService(orchestrator=orch)

    with pytest.raises(ProviderUnavailableError):
        asyncio.run(svc.compute(lat=41.9, lon=12.5))


def test_compute_meteo_provider_error_propagates(monkeypatch):
    """Errore meteo non-retryable -> propaga."""
    reg = ProviderRegistry()
    reg.register(_FakeMeteoProvider(
        raise_exc=ProviderError("bad", provider="fake_meteo", status=400)
    ))
    orch = ServiceOrchestrator(registry=reg)
    svc = MeteoLoadsService(orchestrator=orch)

    with pytest.raises(ProviderError):
        asyncio.run(svc.compute(lat=41.9, lon=12.5))


def test_compute_terrain_other_than_ii_raises():
    """Solo terreno II supportato in v1.3."""
    reg = ProviderRegistry()
    reg.register(_FakeMeteoProvider())
    reg.register(_FakeElevationProvider())
    orch = ServiceOrchestrator(registry=reg)
    svc = MeteoLoadsService(orchestrator=orch)

    with pytest.raises(NotImplementedError):
        asyncio.run(svc.compute(lat=41.9, lon=12.5, terrain_category="III"))


def test_compute_uses_years_param(service_with_mocks):
    """years arriva al provider."""
    svc, meteo, _ = service_with_mocks
    asyncio.run(svc.compute(lat=41.9, lon=12.5, years=20))
    # Il _FakeMeteoProvider non registra args ma il chiamante NON crasha
    # Verifica che il flow funzioni con years!=80 default
    r = asyncio.run(svc.compute(lat=41.9, lon=12.5, years=20))
    assert r.years_used == 50  # dall'mock extremes


def test_compute_zero_extremes_produces_zero_loads():
    """Caso limite: dataset con tutti zero -> loads zero."""
    reg = ProviderRegistry()
    extremes = _FakeExtremes(
        wind_gust_max_ms=0.0, wind_gust_50y_ms=0.0,
        snowfall_max_cm=0.0, snowfall_50y_cm=0.0,
    )
    reg.register(_FakeMeteoProvider(extremes=extremes))
    reg.register(_FakeElevationProvider())
    orch = ServiceOrchestrator(registry=reg)
    svc = MeteoLoadsService(orchestrator=orch)

    r = asyncio.run(svc.compute(lat=41.9, lon=12.5))
    assert r.wind.v_b0_ms == 0.0
    assert r.wind.q_b_kN_m2 == 0.0
    assert r.wind.q_p_z10_kN_m2 == 0.0
    assert r.snow.s_k_kN_m2 == 0.0
    assert r.snow.s_design_kN_m2 == 0.0


def test_compute_high_gust_produces_high_pressure():
    """Sanity: gust elevato → q_p elevato."""
    reg = ProviderRegistry()
    extremes = _FakeExtremes(wind_gust_50y_ms=60.0)  # ~ tempesta
    reg.register(_FakeMeteoProvider(extremes=extremes))
    reg.register(_FakeElevationProvider())
    orch = ServiceOrchestrator(registry=reg)
    svc = MeteoLoadsService(orchestrator=orch)

    r = asyncio.run(svc.compute(lat=41.9, lon=12.5))
    # gust 60 / 1.4 = 42.86 m/s -> q_b = 0.5·1.25·42.86²/1000 = 1.148
    # q_p = 1.7 · 1.148 = 1.952
    assert r.wind.q_p_z10_kN_m2 > 1.5  # alto
    assert r.wind.q_p_z10_kN_m2 < 3.0  # sanity


def test_compute_default_orchestrator_used_when_none(monkeypatch):
    """Costruttore senza orchestrator usa il singleton globale."""
    svc = MeteoLoadsService()
    from services.orchestrator import orchestrator as default_orch
    assert svc.orchestrator is default_orch


def test_singleton_service_exists():
    from services.facades.meteo_loads import service
    assert isinstance(service, MeteoLoadsService)


def test_result_serializes_to_dict(service_with_mocks):
    """model_dump() produce dict JSON-safe."""
    svc, _, _ = service_with_mocks
    r = asyncio.run(svc.compute(lat=41.9, lon=12.5))
    d = r.model_dump()
    assert "location" in d
    assert "wind" in d
    assert "snow" in d
    assert "years_used" in d
    assert d["wind"]["v_b0_ms"] > 0
    assert d["snow"]["s_k_kN_m2"] > 0
