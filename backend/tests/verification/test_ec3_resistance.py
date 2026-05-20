"""
Test per `core/verification/ec3/resistance.py`.

Riferimenti:
- EN 1993-1-1 §6.2 — Resistenze di sezione
- CSI Italia, "Esempi applicativi EC3", IPE 300 S275 (per cross-check numerico)
"""
import math
import pytest

from core.verification.ec3 import (
    N_t_Rd, N_c_Rd, M_c_Rd, V_c_Rd,
    shear_area_I_profile,
    SectionClass,
    GAMMA_M0_NTC, GAMMA_M0_EC,
)
from schemas import SECTIONS_DB


class TestNtRd:
    def test_ipe_300_s355_ntc(self):
        """IPE 300 S355: N_t,Rd = 5381 mm² · 355 / 1.05 = 1819.0 kN"""
        A = SECTIONS_DB["ipe_300"].A  # 5.381e-3 m²
        r = N_t_Rd(A=A, fy=355e6, gamma_M0=GAMMA_M0_NTC)
        expected = A * 355e6 / 1.05
        assert r.value == pytest.approx(expected, rel=1e-9)
        assert r.value / 1e3 == pytest.approx(1819.4, rel=0.005)  # ≈ 1819 kN
        assert r.formula == "6.6"

    def test_ec_partial_factor_gives_higher_resistance(self):
        """γ_M0 = 1.00 (EC) > 1.05 (NTC) → N_t,Rd con EC è maggiore."""
        A = 5.381e-3
        ntc = N_t_Rd(A=A, fy=355e6, gamma_M0=GAMMA_M0_NTC)
        ec = N_t_Rd(A=A, fy=355e6, gamma_M0=GAMMA_M0_EC)
        assert ec.value > ntc.value
        assert ec.value / ntc.value == pytest.approx(1.05, rel=1e-9)

    def test_negative_A_raises(self):
        with pytest.raises(ValueError):
            N_t_Rd(A=-1e-3, fy=355e6)

    def test_negative_gamma_raises(self):
        with pytest.raises(ValueError):
            N_t_Rd(A=1e-3, fy=355e6, gamma_M0=0)


class TestNcRd:
    def test_class_1_uses_A_full(self):
        A = 5.381e-3
        r = N_c_Rd(A=A, fy=355e6, section_class=SectionClass.CLASS_1)
        assert r.value == pytest.approx(A * 355e6 / 1.05, rel=1e-9)
        assert r.formula == "6.10"

    def test_class_4_uses_A_eff_if_provided(self):
        A = 5.381e-3
        A_eff = 0.8 * A
        r = N_c_Rd(A=A, fy=355e6, section_class=SectionClass.CLASS_4,
                   A_eff=A_eff)
        assert r.value == pytest.approx(A_eff * 355e6 / 1.05, rel=1e-9)
        assert r.formula == "6.11"

    def test_class_4_defaults_to_A(self):
        """Senza A_eff il default cautelativo usa l'area lorda."""
        A = 5.381e-3
        r = N_c_Rd(A=A, fy=355e6, section_class=SectionClass.CLASS_4)
        assert r.value == pytest.approx(A * 355e6 / 1.05, rel=1e-9)


class TestMcRd:
    """IPE 300 S355 (γ_M0=1.05):
       Classe 1/2: M_pl,Rd = 628.4e-6 · 355e6 / 1.05 = 212.4 kN·m
       Classe 3 :  M_el,Rd = 557.1e-6 · 355e6 / 1.05 = 188.4 kN·m
    """
    def test_class_1_uses_Wpl(self):
        s = SECTIONS_DB["ipe_300"]
        r = M_c_Rd(Wpl=s.Wply, Wel=s.Wely, fy=355e6,
                   section_class=SectionClass.CLASS_1)
        assert r.value == pytest.approx(s.Wply * 355e6 / 1.05, rel=1e-9)
        assert r.value / 1e3 == pytest.approx(212.4, rel=0.005)
        assert r.formula == "6.13"

    def test_class_2_uses_Wpl(self):
        s = SECTIONS_DB["ipe_300"]
        r = M_c_Rd(Wpl=s.Wply, Wel=s.Wely, fy=355e6,
                   section_class=SectionClass.CLASS_2)
        assert r.value == pytest.approx(s.Wply * 355e6 / 1.05, rel=1e-9)
        assert r.formula == "6.13"

    def test_class_3_uses_Wel(self):
        s = SECTIONS_DB["ipe_300"]
        r = M_c_Rd(Wpl=s.Wply, Wel=s.Wely, fy=355e6,
                   section_class=SectionClass.CLASS_3)
        assert r.value == pytest.approx(s.Wely * 355e6 / 1.05, rel=1e-9)
        assert r.value / 1e3 == pytest.approx(188.4, rel=0.005)
        assert r.formula == "6.14"

    def test_class_4_uses_Weff_if_provided(self):
        s = SECTIONS_DB["ipe_300"]
        Weff = 0.85 * s.Wely
        r = M_c_Rd(Wpl=s.Wply, Wel=s.Wely, fy=355e6,
                   section_class=SectionClass.CLASS_4, Weff=Weff)
        assert r.value == pytest.approx(Weff * 355e6 / 1.05, rel=1e-9)

    def test_class_1_with_zero_Wpl_raises(self):
        with pytest.raises(ValueError):
            M_c_Rd(Wpl=0, Wel=1e-4, fy=355e6,
                   section_class=SectionClass.CLASS_1)

    def test_class_3_with_zero_Wel_raises(self):
        with pytest.raises(ValueError):
            M_c_Rd(Wpl=1e-4, Wel=0, fy=355e6,
                   section_class=SectionClass.CLASS_3)


class TestVcRd:
    """IPE 300 S355:
       A_v = A - 2·b·tf + (tw + 2r)·tf
           = 5381 - 2·150·10.7 + (7.1 + 30)·10.7
           = 5381 - 3210 + 397.0
           = 2568 mm²  (cfr. tabelle Arcelor: A_v ≈ 25.68 cm²)
       V_pl,Rd = 2568 · (355/√3) / 1.05 = 500.7 kN
    """
    def test_shear_area_ipe300(self):
        s = SECTIONS_DB["ipe_300"]
        Av = shear_area_I_profile(A=s.A, b=s.b, tf=s.tf, tw=s.tw, r=s.r)
        # Tabella Arcelor IPE 300: A_v ≈ 25.7 cm² = 2.57e-3 m²
        assert Av * 1e4 == pytest.approx(25.7, rel=0.05)

    def test_vplrd_ipe300_s355(self):
        s = SECTIONS_DB["ipe_300"]
        Av = shear_area_I_profile(A=s.A, b=s.b, tf=s.tf, tw=s.tw, r=s.r)
        r = V_c_Rd(A_v=Av, fy=355e6, gamma_M0=GAMMA_M0_NTC)
        # ≈ 500 kN
        assert r.value / 1e3 == pytest.approx(500.7, rel=0.02)
        assert r.formula == "6.18"

    def test_shear_area_negative_raises(self):
        with pytest.raises(ValueError):
            shear_area_I_profile(A=-1e-3, b=0.15, tf=0.011, tw=0.007, r=0.015)


class TestCrossSectionScaling:
    """Test di consistenza dimensionale."""
    @pytest.mark.parametrize("sid", ["ipe_200", "ipe_300", "ipe_400", "hea_200"])
    def test_nt_proportional_to_A(self, sid):
        s = SECTIONS_DB[sid]
        r1 = N_t_Rd(A=s.A, fy=355e6)
        r2 = N_t_Rd(A=2 * s.A, fy=355e6)
        assert r2.value == pytest.approx(2 * r1.value, rel=1e-9)

    @pytest.mark.parametrize("sid", ["ipe_200", "ipe_300", "ipe_500"])
    def test_M_class1_always_geq_class3(self, sid):
        """M_c,Rd in Classe 1 (W_pl) ≥ M_c,Rd in Classe 3 (W_el): sempre."""
        s = SECTIONS_DB[sid]
        m1 = M_c_Rd(Wpl=s.Wply, Wel=s.Wely, fy=355e6,
                    section_class=SectionClass.CLASS_1)
        m3 = M_c_Rd(Wpl=s.Wply, Wel=s.Wely, fy=355e6,
                    section_class=SectionClass.CLASS_3)
        assert m1.value >= m3.value
        # Per profili a doppio T il rapporto W_pl/W_el (fattore di forma)
        # è tipicamente 1.10–1.15.
        ratio = m1.value / m3.value
        assert 1.05 <= ratio <= 1.25, f"Fattore di forma {ratio:.3f} fuori range tipico"
