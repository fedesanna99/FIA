"""
Test per verifica combinata N+M+V e SLE (frecce).
"""
import pytest

from core.verification.ec3 import (
    combined_NM, combined_NMV,
    deflection_limit, serviceability_check,
    SectionClass,
)


class TestCombinedNM:
    def test_pure_bending_UR_equals_M_ratio(self):
        r = combined_NM(N_Ed=0, M_Ed=100e3, N_Rd=1000e3, M_Rd=200e3,
                        section_class=SectionClass.CLASS_1)
        assert r.UR == pytest.approx(0.5, rel=1e-9)
        assert r.governing in ("M", "N+M")

    def test_pure_axial_UR_equals_N_ratio(self):
        r = combined_NM(N_Ed=500e3, M_Ed=0, N_Rd=1000e3, M_Rd=200e3,
                        section_class=SectionClass.CLASS_1)
        assert r.UR == pytest.approx(0.5, rel=1e-9)
        assert r.governing in ("N", "N+M")

    def test_class3_linear_sum(self):
        """Per Classe 3 la verifica è la somma lineare N/N_Rd + M/M_Rd."""
        r = combined_NM(N_Ed=300e3, M_Ed=100e3,
                        N_Rd=1000e3, M_Rd=200e3,
                        section_class=SectionClass.CLASS_3)
        # 0.3 + 0.5 = 0.8
        assert r.UR_NM == pytest.approx(0.8, rel=1e-9)
        assert r.UR == pytest.approx(0.8, rel=1e-9)

    def test_class1_with_geometry_uses_633(self):
        """Cl 1/2 con A, b, tf forniti usa (6.36)."""
        # IPE 300 fittizio: A=53.81e-4, b=0.15, tf=0.0107
        # a = (53.81e-4 - 2·0.15·0.0107)/53.81e-4 = (5.381e-3 - 3.21e-3)/5.381e-3 = 0.4035
        # a ≤ 0.5 → ok
        # M_N,Rd = M_Rd · (1-n)/(1-0.5·a) = 200·(1-0.3)/(1-0.2018) = 200·0.7/0.798 = 175.4
        r = combined_NM(
            N_Ed=300e3, M_Ed=100e3, N_Rd=1000e3, M_Rd=200e3,
            section_class=SectionClass.CLASS_1,
            A=53.81e-4, b=0.15, tf=0.0107,
        )
        assert r.UR_NM == pytest.approx(100/175.4, rel=0.05)

    def test_negative_resistance_raises(self):
        with pytest.raises(ValueError):
            combined_NM(N_Ed=100, M_Ed=100, N_Rd=0, M_Rd=200,
                        section_class=SectionClass.CLASS_1)


class TestCombinedNMV:
    def test_low_shear_no_reduction(self):
        """V_Ed = 0.3·V_Rd → ρ=0, no riduzione del momento."""
        r = combined_NMV(N_Ed=0, M_Ed=100e3, V_Ed=30e3,
                         N_Rd=1000e3, M_Rd=200e3, V_Rd=100e3,
                         section_class=SectionClass.CLASS_1)
        assert r.rho_shear == 0.0
        assert r.UR_V == pytest.approx(0.3, rel=1e-9)

    def test_high_shear_reduces_moment(self):
        """V_Ed = 0.8·V_Rd → ρ = (2·0.8 - 1)² = 0.36 → M ridotto del 36%."""
        r = combined_NMV(N_Ed=0, M_Ed=100e3, V_Ed=80e3,
                         N_Rd=1000e3, M_Rd=200e3, V_Rd=100e3,
                         section_class=SectionClass.CLASS_1)
        assert r.rho_shear == pytest.approx(0.36, rel=1e-3)

    def test_excessive_shear_returns_inf(self):
        """V_Ed = V_Rd → ρ=1, M_Rd_ridotto=0 → U.R. sentinel.

        v2.3.2: il sentinel ora è EC3_SENTINEL_INF (1e6) invece di
        float('inf'), così la response API è JSON-safe.
        """
        from core.verification.ec3.combined import EC3_SENTINEL_INF
        r = combined_NMV(N_Ed=0, M_Ed=50e3, V_Ed=100e3,
                         N_Rd=1000e3, M_Rd=200e3, V_Rd=100e3,
                         section_class=SectionClass.CLASS_1)
        assert r.UR == EC3_SENTINEL_INF
        assert r.governing == "V"

    def test_v_governs_when_high(self):
        """Se V/V_Rd > N/N_Rd e > M/M_Rd → V governa."""
        r = combined_NMV(N_Ed=10e3, M_Ed=10e3, V_Ed=40e3,
                         N_Rd=1000e3, M_Rd=200e3, V_Rd=50e3,
                         section_class=SectionClass.CLASS_3)
        assert r.governing == "V"


class TestServiceability:
    def test_floor_ordinary_L_over_250(self):
        assert deflection_limit(L=5.0, category="floor_ordinary") == \
            pytest.approx(5.0 / 250.0)

    def test_roof_L_over_200(self):
        assert deflection_limit(L=4.0, category="roof") == \
            pytest.approx(4.0 / 200.0)

    def test_brittle_more_restrictive(self):
        assert deflection_limit(L=5.0, category="floor_brittle") < \
            deflection_limit(L=5.0, category="floor_ordinary")

    def test_UR_calculation(self):
        r = serviceability_check(delta_max=0.010, L=5.0, category="floor_ordinary")
        # 0.010 / 0.020 = 0.5
        assert r.UR == pytest.approx(0.5)
        assert r.delta_lim == pytest.approx(0.020)

    def test_negative_L_raises(self):
        with pytest.raises(ValueError):
            deflection_limit(L=-1.0, category="floor_ordinary")

    def test_unknown_category_raises(self):
        with pytest.raises(ValueError):
            deflection_limit(L=5.0, category="invalid_cat")

    def test_delta_max_taken_in_absolute(self):
        """Una freccia negativa (deflessione in basso) deve essere trattata in |·|."""
        r1 = serviceability_check(delta_max=-0.010, L=5.0, category="floor_ordinary")
        r2 = serviceability_check(delta_max=+0.010, L=5.0, category="floor_ordinary")
        assert r1.UR == r2.UR
