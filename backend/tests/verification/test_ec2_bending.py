"""
Test per `core/verification/ec2/bending.py` — flessione sezione rettangolare in CA.

Esempio numerico di riferimento (trave 30×50, copriferro 4cm, 4φ16):
    b=0.30, h=0.50, d=0.46
    A_s = 4 · π · 0.008² = 8.04e-4 m²
    fck=25 MPa, fyk=450 MPa, γ_C=1.5, γ_S=1.15, α_cc=0.85

Calcolo a mano:
    fcd = 0.85·25/1.5 = 14.167 MPa
    fyd = 450/1.15 = 391.3 MPa
    x = A_s·fyd / (0.8·b·fcd) = 8.04e-4·391.3e6 / (0.8·0.30·14.167e6)
      = 314.6e3 / 3.40e6 = 0.0925 m = 92.5 mm
    z = d - 0.4·x = 0.46 - 0.037 = 0.423 m
    M_Rd = A_s·fyd·z = 8.04e-4 · 391.3e6 · 0.423 = 133.1 kN·m

Riferimento: NTC 2018 §4.1.2.1 + Ghersi, "Il cemento armato", esempi cap. 6.
"""
import math
import pytest

from core.verification.ec2 import (
    M_Rd_rectangular, design_strength_fcd, design_strength_fyd,
    minimum_reinforcement,
    GAMMA_C, GAMMA_S, ALPHA_CC,
)


class TestDesignStrengths:
    def test_fcd_c25_ntc(self):
        """fcd = 0.85·25/1.5 = 14.167 MPa"""
        fcd = design_strength_fcd(fck=25e6)
        assert fcd / 1e6 == pytest.approx(14.167, rel=0.01)

    def test_fcd_alpha_cc_one(self):
        """Con α_cc=1.0 (EC base): fcd = 25/1.5 = 16.667 MPa"""
        fcd = design_strength_fcd(fck=25e6, alpha_cc=1.0)
        assert fcd / 1e6 == pytest.approx(16.667, rel=0.01)

    def test_fyd_b450c(self):
        """fyd = 450/1.15 = 391.3 MPa"""
        fyd = design_strength_fyd(fyk=450e6)
        assert fyd / 1e6 == pytest.approx(391.3, rel=0.01)

    def test_negative_fck_raises(self):
        with pytest.raises(ValueError):
            design_strength_fcd(fck=-25e6)

    def test_zero_fyk_raises(self):
        with pytest.raises(ValueError):
            design_strength_fyd(fyk=0)


class TestMRdRectangular:
    """Trave 30×50 con 4φ16 in C25/30 (esempio classico)."""

    def _params(self):
        return dict(b=0.30, d=0.46, A_s=8.04e-4, fck=25e6, fyk=450e6)

    def test_basic_M_Rd(self):
        r = M_Rd_rectangular(**self._params())
        assert r.M_Rd / 1e3 == pytest.approx(133.1, rel=0.02)

    def test_axis_neutral_depth(self):
        r = M_Rd_rectangular(**self._params())
        # x ≈ 92.5 mm
        assert r.x * 1000 == pytest.approx(92.5, rel=0.02)

    def test_lever_arm(self):
        r = M_Rd_rectangular(**self._params())
        # z = d - 0.4·x ≈ 0.423 m
        assert r.z == pytest.approx(0.423, rel=0.02)

    def test_ductility_ok(self):
        r = M_Rd_rectangular(**self._params())
        # x/d ≈ 0.20 < 0.45
        assert r.x_over_d < 0.45
        assert r.is_ductile

    def test_over_reinforced_is_non_ductile(self):
        """Aumentando A_s di 5×, x/d supera 0.45 → non duttile."""
        r = M_Rd_rectangular(b=0.30, d=0.46, A_s=5 * 8.04e-4,
                              fck=25e6, fyk=450e6)
        assert r.x_over_d > 0.45
        assert not r.is_ductile

    def test_M_Rd_proportional_to_A_s_when_z_constant(self):
        """A piccoli A_s (z ~ costante), M_Rd è quasi lineare in A_s."""
        small = M_Rd_rectangular(b=0.30, d=0.46, A_s=4.02e-4,
                                  fck=25e6, fyk=450e6)
        large = M_Rd_rectangular(b=0.30, d=0.46, A_s=8.04e-4,
                                  fck=25e6, fyk=450e6)
        # Aumentando A_s del fattore 2 il momento cresce un po' meno di 2×
        # perché z diminuisce — ma quasi lineare per armature contenute.
        ratio = large.M_Rd / small.M_Rd
        assert 1.85 < ratio < 2.0

    def test_higher_fck_gives_higher_M_Rd(self):
        """Cls più resistente → asse neutro più basso → braccio z maggiore → M_Rd maggiore."""
        r25 = M_Rd_rectangular(b=0.30, d=0.46, A_s=8.04e-4, fck=25e6, fyk=450e6)
        r40 = M_Rd_rectangular(b=0.30, d=0.46, A_s=8.04e-4, fck=40e6, fyk=450e6)
        assert r40.M_Rd > r25.M_Rd
        # Differenza piccola (z passa da 0.42 a ~0.44)
        assert (r40.M_Rd / r25.M_Rd) < 1.10

    def test_negative_dimensions_raise(self):
        with pytest.raises(ValueError):
            M_Rd_rectangular(b=-0.30, d=0.46, A_s=8.04e-4,
                              fck=25e6, fyk=450e6)

    def test_zero_A_s_raises(self):
        with pytest.raises(ValueError):
            M_Rd_rectangular(b=0.30, d=0.46, A_s=0,
                              fck=25e6, fyk=450e6)

    def test_partial_factors_change_M_Rd(self):
        """Coefficienti EC base (γ_C=1.5, γ_S=1.15, α_cc=1.0) > NTC (α_cc=0.85)."""
        r_ntc = M_Rd_rectangular(b=0.30, d=0.46, A_s=8.04e-4,
                                  fck=25e6, fyk=450e6, alpha_cc=0.85)
        r_ec = M_Rd_rectangular(b=0.30, d=0.46, A_s=8.04e-4,
                                 fck=25e6, fyk=450e6, alpha_cc=1.0)
        # Con α_cc=1.0, fcd maggiore → x minore → z maggiore → M_Rd maggiore
        assert r_ec.M_Rd > r_ntc.M_Rd


class TestMinimumReinforcement:
    def test_C25_B450_basic(self):
        """Trave 30×46cm, C25, B450C:
        fctm = 0.30·25^(2/3) = 2.565 MPa
        Asmin_a = 0.26 · 2.565/450 · 300·460 = 0.000204 m² = 2.05 cm²
        Asmin_b = 0.0013 · 0.30 · 0.46 = 1.794 cm²
        max = 2.05 cm²
        """
        Asmin = minimum_reinforcement(b=0.30, d=0.46, fck=25e6, fyk=450e6)
        assert Asmin * 1e4 == pytest.approx(2.05, rel=0.05)

    def test_increases_with_fck(self):
        a25 = minimum_reinforcement(b=0.30, d=0.46, fck=25e6, fyk=450e6)
        a40 = minimum_reinforcement(b=0.30, d=0.46, fck=40e6, fyk=450e6)
        assert a40 > a25

    def test_negative_b_raises(self):
        with pytest.raises(ValueError):
            minimum_reinforcement(b=-0.30, d=0.46, fck=25e6, fyk=450e6)
