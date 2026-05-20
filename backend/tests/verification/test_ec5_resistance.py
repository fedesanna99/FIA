"""
Test per `core/verification/ec5/` — resistenze legno EN 1995-1-1.

Esempi di riferimento (cross-check):
- Piazza & Tomasi, "Strutture in legno", esempi cap. 4
- NTC 2018 §4.4 + UNI EN 1995-1-1
"""
import pytest

from core.verification.ec5 import (
    get_timber_class, f_d, f_t_0_d, f_c_0_d, f_m_d, f_v_d,
    k_mod_value, gamma_M_value,
)


class TestTimberClasses:
    def test_c24_values(self):
        c24 = get_timber_class("C24")
        assert c24.f_m_k == 24e6
        assert c24.f_t_0_k == 14e6
        assert c24.f_c_0_k == 21e6
        assert c24.E_0_mean == 11.0e9
        assert not c24.is_glulam

    def test_gl24h_is_glulam(self):
        g = get_timber_class("GL24h")
        assert g.is_glulam
        assert g.f_m_k == 24e6
        assert g.f_t_0_k == 19.2e6  # ratio EN 14080 (>14 MPa di C24)

    def test_unknown_class_raises(self):
        with pytest.raises(ValueError):
            get_timber_class("XYZ123")


class TestKMod:
    def test_solid_class1_permanent(self):
        assert k_mod_value(1, "permanent") == 0.60

    def test_solid_class1_short_term(self):
        assert k_mod_value(1, "short_term") == 0.90

    def test_solid_class2_instantaneous(self):
        assert k_mod_value(2, "instantaneous") == 1.10

    def test_class3_more_severe_than_class1(self):
        """Servizio classe 3 ha k_mod minori di classe 1 per ogni durata."""
        for dur in ["permanent", "long_term", "medium_term",
                    "short_term", "instantaneous"]:
            assert k_mod_value(3, dur) <= k_mod_value(1, dur)  # type: ignore[arg-type]

    def test_invalid_duration_raises(self):
        with pytest.raises(ValueError):
            k_mod_value(1, "fast")  # type: ignore[arg-type]


class TestGammaM:
    def test_solid_15(self):
        assert gamma_M_value(is_glulam=False) == 1.50

    def test_glulam_145(self):
        assert gamma_M_value(is_glulam=True) == 1.45


class TestDesignStrengths:
    """C24, classe servizio 1, durata short_term:
       k_mod=0.90, γ_M=1.50
       f_t,0,d = 0.90·14/1.50 = 8.40 MPa
       f_c,0,d = 0.90·21/1.50 = 12.60 MPa
       f_m,d   = 0.90·24/1.50 = 14.40 MPa
       f_v,d   = 0.90·4.0/1.50 = 2.40 MPa
    """
    def test_C24_ft0d_short_term(self):
        r = f_t_0_d(get_timber_class("C24"),
                     service_class=1, load_duration="short_term")
        assert r.value / 1e6 == pytest.approx(8.40, rel=0.005)
        assert r.label == "f_t,0,d"
        assert r.k_mod == 0.90
        assert r.gamma_M == 1.50

    def test_C24_fc0d_short_term(self):
        r = f_c_0_d(get_timber_class("C24"),
                     service_class=1, load_duration="short_term")
        assert r.value / 1e6 == pytest.approx(12.60, rel=0.005)

    def test_C24_fmd_short_term(self):
        r = f_m_d(get_timber_class("C24"),
                   service_class=1, load_duration="short_term")
        assert r.value / 1e6 == pytest.approx(14.40, rel=0.005)

    def test_C24_fvd_short_term(self):
        r = f_v_d(get_timber_class("C24"),
                   service_class=1, load_duration="short_term")
        assert r.value / 1e6 == pytest.approx(2.40, rel=0.005)

    def test_GL24h_uses_gamma_145(self):
        """Per lamellare γ_M = 1.45 → resistenze 1.5/1.45 = 1.034× più alte."""
        c = get_timber_class("C24")
        g = get_timber_class("GL24h")
        r_solid = f_m_d(c, service_class=1, load_duration="short_term")
        r_glulam = f_m_d(g, service_class=1, load_duration="short_term")
        # Stesso f_m_k (24 MPa), ma γ_M diverso
        assert r_glulam.gamma_M == 1.45
        assert r_solid.gamma_M == 1.50
        assert (r_glulam.value / r_solid.value) == pytest.approx(1.50/1.45, rel=1e-6)

    def test_permanent_load_reduces_resistance(self):
        """k_mod permanent (0.60) < short_term (0.90)."""
        c = get_timber_class("C24")
        r_perm = f_m_d(c, service_class=1, load_duration="permanent")
        r_short = f_m_d(c, service_class=1, load_duration="short_term")
        assert r_perm.value < r_short.value
        assert r_perm.value / r_short.value == pytest.approx(0.60/0.90, rel=1e-6)

    def test_service_class_3_lower_than_1(self):
        c = get_timber_class("C24")
        r1 = f_m_d(c, service_class=1, load_duration="medium_term")
        r3 = f_m_d(c, service_class=3, load_duration="medium_term")
        assert r3.value < r1.value

    def test_negative_fk_raises(self):
        with pytest.raises(ValueError):
            f_d(f_k=-1e6, is_glulam=False,
                service_class=1, load_duration="short_term")
