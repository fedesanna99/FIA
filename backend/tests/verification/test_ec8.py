"""
Test per `core/verification/ec8/` — sismica EN 1998-1.

Riferimenti:
- EN 1998-1:2004 §3.2, §5.2, §3.2.4
- NTC 2018 §3.2, §7
- Esempi: Petrini & al., "Costruzioni in zona sismica", Hoepli.
"""
import math
import pytest

from core.verification.ec8 import (
    elastic_spectrum, design_spectrum, ground_parameters,
    q_factor, seismic_combination, ψ_2, EA_combination,
    seismic_zone_ag, ITALY_ZONES,
)
from core.verification.ec8.spectrum import eta_damping


# ─────────────────────── Spettro elastico ───────────────────────

class TestGroundParameters:
    def test_type1_groundA(self):
        p = ground_parameters("1", "A")
        assert p.S == 1.00
        assert p.T_B == 0.15
        assert p.T_C == 0.40

    def test_type1_groundD_more_amplified_than_A(self):
        pA = ground_parameters("1", "A")
        pD = ground_parameters("1", "D")
        assert pD.S > pA.S
        assert pD.T_C > pA.T_C

    def test_type2_has_smaller_T_D(self):
        p1 = ground_parameters("1", "B")
        p2 = ground_parameters("2", "B")
        assert p2.T_D < p1.T_D  # T_D=1.2 (Type 2) vs 2.0 (Type 1)

    def test_unknown_ground_raises(self):
        with pytest.raises(ValueError):
            ground_parameters("1", "X")  # type: ignore[arg-type]


class TestEtaDamping:
    def test_xi_5_is_one(self):
        assert eta_damping(5.0) == pytest.approx(1.0, rel=1e-9)

    def test_xi_2_higher_than_one(self):
        """Smorzamento più basso → η > 1 (spettro più alto)."""
        assert eta_damping(2.0) > 1.0

    def test_floor_at_055(self):
        """ξ molto alto → η bloccato a 0.55."""
        assert eta_damping(100.0) == 0.55


class TestElasticSpectrum:
    """Verifica i 4 rami della curva."""
    def test_T0_equals_ag_S(self):
        """T=0 → S_e = a_g · S (1 + 0 · ...) = a_g · S."""
        ag = 2.45  # m/s²
        S = ground_parameters("1", "B").S
        Se = elastic_spectrum(T=0.0, a_g=ag, spectrum_type="1", ground="B")
        assert Se == pytest.approx(ag * S, rel=1e-9)

    def test_plateau_TB_TC(self):
        """Per T_B ≤ T ≤ T_C: S_e = a_g · S · η · 2.5 (massimo)."""
        ag = 2.45
        p = ground_parameters("1", "B")
        plateau_expected = ag * p.S * 1.0 * 2.5  # η=1 a ξ=5%
        for T in [p.T_B, (p.T_B + p.T_C) / 2, p.T_C]:
            Se = elastic_spectrum(T=T, a_g=ag, spectrum_type="1", ground="B")
            assert Se == pytest.approx(plateau_expected, rel=1e-3)

    def test_after_TC_decreasing(self):
        """T > T_C: ramo decrescente come 1/T."""
        ag = 2.45
        p = ground_parameters("1", "B")
        # confronto T_C+ε e 2·T_C
        Se1 = elastic_spectrum(T=p.T_C, a_g=ag, spectrum_type="1", ground="B")
        Se2 = elastic_spectrum(T=2 * p.T_C, a_g=ag, spectrum_type="1", ground="B")
        # In quel range Se ∝ 1/T → Se2 = Se1 / 2
        assert Se2 == pytest.approx(Se1 / 2.0, rel=1e-3)

    def test_after_TD_decreasing_as_1_over_T2(self):
        """T > T_D: ramo decrescente come 1/T²."""
        ag = 2.45
        p = ground_parameters("1", "B")  # T_D=2.0
        Se_TD = elastic_spectrum(T=p.T_D, a_g=ag, spectrum_type="1", ground="B")
        Se_2TD = elastic_spectrum(T=2 * p.T_D, a_g=ag,
                                    spectrum_type="1", ground="B")
        # ratio = (T_C·T_D)/T² @ 2TD vs ratio = T_C/T @ TD
        # ratio Se_2TD / Se_TD = T_D / (2·T_D) = 1/2 ... no aspetta: a TD ha
        # S_e = aS·η·2.5·T_C/T_D, a 2TD ha aS·η·2.5·T_C·T_D/(2TD)²
        # = aS·η·2.5·T_C/(4·T_D) → Se_2TD = Se_TD / 4
        assert Se_2TD == pytest.approx(Se_TD / 4.0, rel=1e-3)

    def test_negative_T_raises(self):
        with pytest.raises(ValueError):
            elastic_spectrum(T=-0.1, a_g=2.45, spectrum_type="1", ground="B")

    def test_negative_ag_raises(self):
        with pytest.raises(ValueError):
            elastic_spectrum(T=0.5, a_g=-2.45, spectrum_type="1", ground="B")


# ─────────────────────── Spettro di progetto ───────────────────────

class TestDesignSpectrum:
    def test_plateau_with_q(self):
        """Plateau S_d = a_g · S · 2.5 / q (T_B ≤ T ≤ T_C)."""
        ag = 2.45
        q = 4.5
        p = ground_parameters("1", "B")
        Sd_plateau = design_spectrum(T=p.T_C - 0.01, a_g=ag, spectrum_type="1",
                                       ground="B", q=q)
        expected = ag * p.S * 2.5 / q
        assert Sd_plateau == pytest.approx(expected, rel=1e-3)

    def test_design_lower_than_elastic_when_q_gt_25(self):
        """Per q > 2.5/η ≈ 2.5, Sd < Se nel plateau."""
        ag = 2.45
        Se = elastic_spectrum(T=0.3, a_g=ag, spectrum_type="1", ground="B")
        Sd = design_spectrum(T=0.3, a_g=ag, spectrum_type="1", ground="B", q=4.5)
        assert Sd < Se

    def test_floor_at_02ag(self):
        """Per T molto grande, Sd ≥ 0.2·a_g (3.16)."""
        ag = 2.45
        floor = 0.2 * ag
        Sd_far = design_spectrum(T=5.0, a_g=ag, spectrum_type="1",
                                   ground="B", q=4.5)
        assert Sd_far >= floor * 0.999  # tolleranza numerica

    def test_q_negative_raises(self):
        with pytest.raises(ValueError):
            design_spectrum(T=0.5, a_g=2.45, spectrum_type="1",
                            ground="B", q=-1.0)


# ─────────────────────── Fattore di struttura ───────────────────────

class TestQFactor:
    def test_DCH_concrete_frame(self):
        """q_0 = 4.5, α_u/α_1 = 1.3 → q = 5.85 (telai CA DCH)."""
        q = q_factor("frame_concrete", "DCH", alpha_u_over_alpha_1=1.3)
        assert q == pytest.approx(5.85, rel=1e-3)

    def test_DCM_concrete_frame(self):
        q = q_factor("frame_concrete", "DCM", alpha_u_over_alpha_1=1.3)
        assert q == pytest.approx(3.9, rel=1e-3)

    def test_DCL_no_alpha_ratio(self):
        """DCL: q_0=1.5, α_u/α_1 NON si applica."""
        q = q_factor("frame_concrete", "DCL", alpha_u_over_alpha_1=1.3)
        assert q == pytest.approx(1.5, rel=1e-9)

    def test_q_min_15(self):
        """Anche con k_w piccolo, q ≥ 1.5."""
        q = q_factor("wall_concrete", "DCL", k_w=0.5)
        assert q == 1.5

    def test_invalid_combination_raises(self):
        with pytest.raises(ValueError):
            q_factor("frame_concrete", "ZZZ")  # type: ignore[arg-type]


# ─────────────────────── Combinazioni sismiche ───────────────────────

class TestPsi2:
    def test_residential(self):
        assert ψ_2("A_residential") == 0.30

    def test_assembly(self):
        assert ψ_2("C_assembly") == 0.60

    def test_roof(self):
        assert ψ_2("H_roof") == 0.0

    def test_wind(self):
        assert ψ_2("wind") == 0.0

    def test_unknown_raises(self):
        with pytest.raises(ValueError):
            ψ_2("Z_unknown")  # type: ignore[arg-type]


class TestSeismicCombination:
    def test_basic(self):
        """G=100, E=50, Q=80 (residenziale ψ_2=0.3): E_d = 100+50+24 = 174."""
        v = seismic_combination(G=100, E=50,
                                 Q_with_psi=[(80, "A_residential")])
        assert v == pytest.approx(174.0)

    def test_multiple_loads(self):
        """G + E + ψ·Q1 + ψ·Q2."""
        v = seismic_combination(G=100, E=50, Q_with_psi=[
            (80, "A_residential"),  # 0.3·80 = 24
            (20, "snow_high"),      # 0.2·20 = 4
        ])
        assert v == pytest.approx(178.0)

    def test_no_variable_loads(self):
        v = seismic_combination(G=100, E=50)
        assert v == 150


class TestEACombination:
    def test_three_combinations_returned(self):
        a, b, c = EA_combination(E_x=100, E_y=80, E_z=60)
        # a = 100 + 0.3·80 + 0.3·60 = 100 + 24 + 18 = 142
        # b = 0.3·100 + 80 + 0.3·60 = 30 + 80 + 18 = 128
        # c = 0.3·100 + 0.3·80 + 60 = 30 + 24 + 60 = 114
        assert a == pytest.approx(142)
        assert b == pytest.approx(128)
        assert c == pytest.approx(114)

    def test_invalid_factor_raises(self):
        with pytest.raises(ValueError):
            EA_combination(E_x=100, factor_off_axis=1.5)


# ─────────────────────── Zone sismiche ───────────────────────

class TestSeismicZones:
    def test_zone_1_highest(self):
        a1 = seismic_zone_ag(1)
        a4 = seismic_zone_ag(4)
        assert a1 > a4

    def test_zone_ag_monotone(self):
        agz = [seismic_zone_ag(z) for z in [1, 2, 3, 4]]
        # Crescente da zona 4 a 1 = decrescente da 1 a 4
        assert agz == sorted(agz, reverse=True)

    def test_in_m_s2(self):
        ag_g = seismic_zone_ag(2, in_g=True)
        ag_ms2 = seismic_zone_ag(2, in_g=False)
        assert ag_ms2 == pytest.approx(ag_g * 9.81, rel=1e-9)

    def test_invalid_zone_raises(self):
        with pytest.raises(ValueError):
            seismic_zone_ag(7)  # type: ignore[arg-type]
