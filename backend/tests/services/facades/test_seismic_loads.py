"""Tests B3 — SeismicLoadsService (Sprint 2)."""
from __future__ import annotations

import asyncio
import math
from dataclasses import dataclass

import pytest

from services.base import Provider
from services.facades.seismic_loads import (
    F_0_DEFAULT,
    T_C_STAR_DEFAULT,
    GMPE_C1,
    GMPE_C2,
    GMPE_C3,
    SOIL_C_C,
    SOIL_S,
    SeismicLoadsResult,
    SeismicLoadsService,
    SeismicSiteParams,
    compute_eta,
    compute_response_spectrum,
    compute_site_params,
    estimate_a_g_from_magnitude,
)
from services.orchestrator import ServiceOrchestrator
from services.providers.meteo.errors import (
    ProviderError,
    ProviderUnavailableError,
)
from services.registry import ProviderRegistry


# ============================================================================
# GMPE
# ============================================================================


def test_gmpe_zero_magnitude_returns_zero():
    assert estimate_a_g_from_magnitude(0.0) == 0.0
    assert estimate_a_g_from_magnitude(-1.0) == 0.0


def test_gmpe_m6_r20_around_0_1g():
    """Sabetta-Pugliese: M=6 R=20km → a_g/g ≈ 0.10 (range 0.07-0.13)."""
    a = estimate_a_g_from_magnitude(6.0, R_km=20.0)
    assert 0.07 <= a <= 0.13


def test_gmpe_m65_r20_around_0_16g():
    """Norcia 2016: M=6.5 R=epicentrale ~ 0.16 g (range 0.10-0.20)."""
    a = estimate_a_g_from_magnitude(6.5, R_km=20.0)
    assert 0.10 <= a <= 0.22


def test_gmpe_m7_r20_around_0_24g():
    a = estimate_a_g_from_magnitude(7.0, R_km=20.0)
    assert 0.17 <= a <= 0.33


def test_gmpe_increases_with_magnitude():
    """Monotonia: a_g cresce con M."""
    vals = [estimate_a_g_from_magnitude(m) for m in (5.0, 6.0, 6.5, 7.0, 7.5)]
    for i in range(1, len(vals)):
        assert vals[i] > vals[i - 1]


def test_gmpe_decreases_with_distance():
    """Monotonia: a_g decresce con R."""
    vals = [estimate_a_g_from_magnitude(7.0, R_km=r) for r in (10, 25, 50, 100, 200)]
    for i in range(1, len(vals)):
        assert vals[i] < vals[i - 1]


def test_gmpe_clip_at_1_5g():
    """M molto alta non puo' superare 1.5 g (clip protettivo)."""
    a = estimate_a_g_from_magnitude(11.0, R_km=1.0)
    assert a <= 1.5


def test_gmpe_zero_R_uses_min_distance():
    """R=0 non solleva: usa R=1 km."""
    a = estimate_a_g_from_magnitude(6.0, R_km=0.0)
    assert a > 0
    assert a < 1.5


def test_gmpe_custom_coefficients():
    """Override dei coefficienti GMPE funziona."""
    a_default = estimate_a_g_from_magnitude(6.0)
    a_custom = estimate_a_g_from_magnitude(6.0, c1=-2.0, c2=0.4)
    assert a_default != a_custom


# ============================================================================
# Site params
# ============================================================================


def test_eta_at_5pct_is_one():
    assert compute_eta(0.05) == pytest.approx(1.0, abs=0.001)


def test_eta_decreases_with_damping():
    """Smorzamento maggiore -> eta minore."""
    e1 = compute_eta(0.05)
    e2 = compute_eta(0.10)
    e3 = compute_eta(0.20)
    assert e1 > e2 > e3


def test_eta_clip_low():
    """Smorzamento < 1% viene clippato a 1%."""
    e_low = compute_eta(0.001)
    e_min = compute_eta(0.01)
    assert e_low == pytest.approx(e_min, abs=0.001)


def test_compute_site_params_soil_A():
    """A: S=1.00, C_C=1.00."""
    p = compute_site_params(a_g_over_g=0.20, soil_category="A")
    assert p.S == 1.00
    assert p.C_C == 1.00
    assert p.T_C_s == pytest.approx(1.00 * T_C_STAR_DEFAULT, abs=0.001)
    assert p.T_B_s == pytest.approx(p.T_C_s / 3.0, abs=0.001)
    assert p.T_D_s == pytest.approx(4.0 * 0.20 + 1.6, abs=0.001)


def test_compute_site_params_soil_B_amplification():
    """B: S=1.20 (amplificazione + 20%)."""
    p_A = compute_site_params(a_g_over_g=0.20, soil_category="A")
    p_B = compute_site_params(a_g_over_g=0.20, soil_category="B")
    assert p_B.S == 1.20
    assert p_B.S > p_A.S


def test_compute_site_params_soil_C_D_E():
    """Verifica tutte le categorie soil supportate."""
    for soil in ("C", "D", "E"):
        p = compute_site_params(a_g_over_g=0.15, soil_category=soil)  # type: ignore[arg-type]
        assert p.S == SOIL_S[soil]
        assert p.C_C == SOIL_C_C[soil]


def test_compute_site_params_invalid_soil_raises():
    with pytest.raises(ValueError):
        compute_site_params(a_g_over_g=0.20, soil_category="F")  # type: ignore[arg-type]


def test_T_D_increases_with_a_g():
    """T_D = 4·a_g + 1.6 cresce con a_g."""
    p1 = compute_site_params(a_g_over_g=0.05)
    p2 = compute_site_params(a_g_over_g=0.30)
    assert p2.T_D_s > p1.T_D_s


def test_F_0_override_propagates():
    p = compute_site_params(a_g_over_g=0.20, F_0=2.8)
    assert p.F_0 == 2.8


def test_T_c_star_override_propagates():
    p = compute_site_params(a_g_over_g=0.20, T_c_star_s=0.50)
    assert p.T_c_star_s == 0.50
    assert p.T_C_s == pytest.approx(0.50, abs=0.001)  # C_C=1 per soil A


# ============================================================================
# Response spectrum
# ============================================================================


def test_spectrum_returns_n_points():
    p = compute_site_params(a_g_over_g=0.20)
    spec = compute_response_spectrum(p, n_points=50)
    assert len(spec) == 50


def test_spectrum_starts_at_T_zero():
    p = compute_site_params(a_g_over_g=0.20)
    spec = compute_response_spectrum(p, n_points=10)
    assert spec[0].T_s == 0.0


def test_spectrum_first_value_equals_a_g_S():
    """T=0: S_e = a_g · S (formula valida per T<T_B con T→0)."""
    p = compute_site_params(a_g_over_g=0.20, soil_category="A")  # S=1
    spec = compute_response_spectrum(p, n_points=10)
    assert spec[0].S_e_over_g == pytest.approx(0.20, abs=0.001)


def test_spectrum_plateau_equals_a_g_S_eta_F0():
    """Plateau T in [T_B, T_C]: S_e = a_g · S · η · F_0."""
    p = compute_site_params(a_g_over_g=0.20, soil_category="A", F_0=2.5)
    # T_B = T_C/3 = 0.117, T_C = 0.35 (con C_C=1 e T_c*=0.35)
    # Punto a T=0.25 (in plateau)
    expected_plateau = 0.20 * 1.0 * 1.0 * 2.5  # = 0.5
    spec = compute_response_spectrum(p, n_points=200, t_max_s=4.0)
    # Trova un punto nel plateau (T tra T_B e T_C)
    plateau_pts = [s for s in spec if p.T_B_s < s.T_s < p.T_C_s]
    assert len(plateau_pts) >= 1
    for pt in plateau_pts:
        assert pt.S_e_over_g == pytest.approx(expected_plateau, abs=0.001)


def test_spectrum_decreases_after_T_C():
    """Per T > T_C: S_e ∝ 1/T."""
    p = compute_site_params(a_g_over_g=0.20)
    spec = compute_response_spectrum(p, n_points=200, t_max_s=4.0)
    # Trova due punti dopo T_C
    after_T_C = [s for s in spec if s.T_s > p.T_C_s and s.T_s < p.T_D_s]
    assert len(after_T_C) >= 2
    # S_e diminuisce con T
    assert after_T_C[0].S_e_over_g > after_T_C[-1].S_e_over_g


def test_spectrum_all_non_negative():
    p = compute_site_params(a_g_over_g=0.20)
    spec = compute_response_spectrum(p, n_points=100, t_max_s=4.0)
    assert all(pt.S_e_over_g >= 0 for pt in spec)


def test_spectrum_invalid_n_points_raises():
    p = compute_site_params(a_g_over_g=0.20)
    with pytest.raises(ValueError):
        compute_response_spectrum(p, n_points=1)


def test_spectrum_invalid_t_max_raises():
    p = compute_site_params(a_g_over_g=0.20)
    with pytest.raises(ValueError):
        compute_response_spectrum(p, t_max_s=0.0)


def test_spectrum_zero_a_g_returns_zero_everywhere():
    p = compute_site_params(a_g_over_g=0.0)
    spec = compute_response_spectrum(p, n_points=20, t_max_s=4.0)
    assert all(pt.S_e_over_g == 0.0 for pt in spec)


# ============================================================================
# Service end-to-end con mock providers
# ============================================================================


@dataclass
class _MockElevation:
    lat: float = 42.79
    lon: float = 13.10
    elevation_m: float = 600.0
    source: str = "mock_elevation"


class _MockSeismicProvider(Provider):
    domain = "seismic"
    name = "mock_seismic"

    def __init__(self, m_max: float = 6.5):
        self.m_max = m_max

    async def health(self) -> bool:
        return True

    async def historical_max_magnitude(
        self, lat: float, lon: float,
        max_radius_km: float = 100.0, years_back: int = 100,
    ) -> float:
        return self.m_max


class _MockElevationProvider(Provider):
    domain = "elevation"
    name = "mock_elevation"

    def __init__(self, point: _MockElevation | None = None):
        self.point = point or _MockElevation()

    async def health(self) -> bool:
        return True

    async def lookup(self, lat: float, lon: float):
        return self.point


@pytest.fixture
def service_with_mocks():
    reg = ProviderRegistry()
    reg.register(_MockSeismicProvider(m_max=6.5))
    reg.register(_MockElevationProvider())
    orch = ServiceOrchestrator(registry=reg)
    return SeismicLoadsService(orchestrator=orch)


def test_service_compute_returns_full_result(service_with_mocks):
    r = asyncio.run(service_with_mocks.compute(lat=42.79, lon=13.10))
    assert isinstance(r, SeismicLoadsResult)
    assert r.location.lat == 42.79
    assert r.location.elevation_m == 600.0
    assert r.historical_max_magnitude == 6.5
    assert 0.10 <= r.site_params.a_g_over_g <= 0.22
    assert len(r.spectrum) == 100


def test_service_uses_soil_category():
    reg = ProviderRegistry()
    reg.register(_MockSeismicProvider(m_max=6.5))
    reg.register(_MockElevationProvider())
    orch = ServiceOrchestrator(registry=reg)
    svc = SeismicLoadsService(orchestrator=orch)

    r_A = asyncio.run(svc.compute(lat=42.79, lon=13.10, soil_category="A"))
    r_B = asyncio.run(svc.compute(lat=42.79, lon=13.10, soil_category="B"))
    assert r_A.site_params.S == 1.00
    assert r_B.site_params.S == 1.20


def test_service_zero_magnitude_uses_baseline_M45():
    """Se M_max = 0 (nessun terremoto storico) → M=4.5 baseline + note."""
    reg = ProviderRegistry()
    reg.register(_MockSeismicProvider(m_max=0.0))
    orch = ServiceOrchestrator(registry=reg)
    svc = SeismicLoadsService(orchestrator=orch)

    r = asyncio.run(svc.compute(lat=0.0, lon=0.0))
    assert r.historical_max_magnitude == 4.5
    assert any("baseline" in n.lower() for n in r.notes)


def test_service_explicit_elevation_skips_lookup():
    """elevation_m fornita -> provider elevation non chiamato."""
    reg = ProviderRegistry()
    reg.register(_MockSeismicProvider(m_max=6.0))
    # NO elevation provider - se viene chiamato fallisce
    orch = ServiceOrchestrator(registry=reg)
    svc = SeismicLoadsService(orchestrator=orch)

    r = asyncio.run(svc.compute(lat=42.0, lon=13.0, elevation_m=200.0))
    assert r.location.elevation_m == 200.0
    assert r.location.elevation_source is None


def test_service_elevation_failure_adds_note():
    reg = ProviderRegistry()
    reg.register(_MockSeismicProvider(m_max=6.0))
    # No elevation provider registered
    orch = ServiceOrchestrator(registry=reg)
    svc = SeismicLoadsService(orchestrator=orch)

    r = asyncio.run(svc.compute(lat=42.0, lon=13.0))
    assert r.location.elevation_m is None
    assert any("elevation" in n.lower() for n in r.notes)


def test_service_no_seismic_provider_raises():
    reg = ProviderRegistry()
    # NO seismic provider
    orch = ServiceOrchestrator(registry=reg)
    svc = SeismicLoadsService(orchestrator=orch)

    with pytest.raises(ProviderUnavailableError):
        asyncio.run(svc.compute(lat=0.0, lon=0.0))


def test_service_includes_v13_estimate_note():
    """Output deve sempre includere la nota "v1.3 estimate"."""
    reg = ProviderRegistry()
    reg.register(_MockSeismicProvider(m_max=6.0))
    reg.register(_MockElevationProvider())
    orch = ServiceOrchestrator(registry=reg)
    svc = SeismicLoadsService(orchestrator=orch)

    r = asyncio.run(svc.compute(lat=42.0, lon=13.0))
    assert any("v1.3" in n.lower() or "estimate" in n.lower() for n in r.notes)


def test_service_invalid_radius_raises():
    svc = SeismicLoadsService()
    with pytest.raises(ValueError):
        asyncio.run(svc.compute(lat=0, lon=0, max_radius_km=0.0))
    with pytest.raises(ValueError):
        asyncio.run(svc.compute(lat=0, lon=0, max_radius_km=20000.0))


def test_service_invalid_years_back_raises():
    svc = SeismicLoadsService()
    with pytest.raises(ValueError):
        asyncio.run(svc.compute(lat=0, lon=0, years_back=0))
    with pytest.raises(ValueError):
        asyncio.run(svc.compute(lat=0, lon=0, years_back=300))


def test_service_default_orchestrator():
    svc = SeismicLoadsService()
    from services.orchestrator import orchestrator as default_orch
    assert svc.orchestrator is default_orch


def test_singleton_exists():
    from services.facades.seismic_loads import service
    assert isinstance(service, SeismicLoadsService)


def test_result_serializes_to_dict(service_with_mocks):
    r = asyncio.run(service_with_mocks.compute(lat=42.79, lon=13.10))
    d = r.model_dump()
    assert "location" in d
    assert "site_params" in d
    assert "spectrum" in d
    assert "historical_max_magnitude" in d
    assert d["site_params"]["a_g_over_g"] > 0
    assert len(d["spectrum"]) == 100


def test_service_gmpe_used_field(service_with_mocks):
    r = asyncio.run(service_with_mocks.compute(lat=42.79, lon=13.10))
    assert r.gmpe_used == "simplified_italy_2018"


def test_service_custom_gmpe_R_changes_a_g():
    reg = ProviderRegistry()
    reg.register(_MockSeismicProvider(m_max=7.0))
    reg.register(_MockElevationProvider())
    orch = ServiceOrchestrator(registry=reg)
    svc = SeismicLoadsService(orchestrator=orch)

    # R=10km vs R=100km per M=7.0
    r_10 = asyncio.run(svc.compute(lat=0, lon=0, gmpe_R_km=10.0))
    r_100 = asyncio.run(svc.compute(lat=0, lon=0, gmpe_R_km=100.0))
    assert r_10.site_params.a_g_over_g > r_100.site_params.a_g_over_g
