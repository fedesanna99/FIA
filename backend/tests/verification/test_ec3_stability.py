"""
Test per `core/verification/ec3/stability.py` (instabilità flessionale §6.3.1).

Esempi numerici da:
- Ballio & Mazzolani, "Strutture in acciaio", Hoepli, esempi capitolo 8.
- CSI Italia Esempi EC3 — colonne HEA/HEB.
"""
import math
import pytest

from core.verification.ec3 import (
    N_b_Rd, chi_flexural, buckling_curve, N_cr_euler,
    SectionClass, GAMMA_M1_NTC,
)
from schemas import SECTIONS_DB


class TestNcrEuler:
    def test_classic_euler_load(self):
        """N_cr = π² E I / L²"""
        E = 210e9
        I = 1e-5
        L = 3.0
        expected = math.pi ** 2 * E * I / L ** 2
        assert N_cr_euler(E, I, L) == pytest.approx(expected, rel=1e-9)

    def test_doubles_L_quarters_Ncr(self):
        E = 210e9; I = 1e-5
        n1 = N_cr_euler(E, I, 2.0)
        n2 = N_cr_euler(E, I, 4.0)
        assert n1 / n2 == pytest.approx(4.0, rel=1e-9)

    def test_zero_inputs_raise(self):
        for args in [(0, 1e-5, 1.0), (210e9, 0, 1.0), (210e9, 1e-5, 0)]:
            with pytest.raises(ValueError):
                N_cr_euler(*args)


class TestBucklingCurve:
    """Tab. 6.2 EN 1993-1-1 — selezione curva."""
    def test_ipe_y_axis(self):
        # IPE 300: h=300, b=150 → h/b = 2.0 > 1.2; tf=10.7mm < 40mm
        # buckling y-y → curva 'a'
        assert buckling_curve(h=0.30, b=0.15, tf=0.0107, axis="y",
                              fy_MPa=355) == "a"

    def test_ipe_z_axis(self):
        # Stessa IPE 300: buckling z-z → curva 'b'
        assert buckling_curve(h=0.30, b=0.15, tf=0.0107, axis="z",
                              fy_MPa=355) == "b"

    def test_heb_y_axis(self):
        # HEB 300: h=b=300 → h/b = 1.0 ≤ 1.2; tf=19mm < 100mm
        # buckling y-y → curva 'b'
        assert buckling_curve(h=0.30, b=0.30, tf=0.019, axis="y",
                              fy_MPa=355) == "b"

    def test_heb_z_axis(self):
        # HEB 300: buckling z-z → curva 'c'
        assert buckling_curve(h=0.30, b=0.30, tf=0.019, axis="z",
                              fy_MPa=355) == "c"

    def test_s460_thin_flange(self):
        # S460, h/b > 1.2, tf ≤ 40 → curva 'a0' (più favorevole)
        assert buckling_curve(h=0.30, b=0.15, tf=0.0107, axis="y",
                              fy_MPa=460) == "a0"


class TestChiFlexural:
    """Valori di χ verificati con calcolatore EC3 di riferimento.

    Tab. 5.5.1.2 di Ballio: curva 'a', λ̄=1.0 → χ = 0.6656
    """
    def test_chi_curve_a_lambda1(self):
        chi, Phi = chi_flexural(lambda_bar=1.0, curve="a")
        # Phi = 0.5(1 + 0.21·0.8 + 1.0) = 0.5 · 2.168 = 1.084
        # chi = 1/(1.084 + √(1.084²-1.0²)) = 1/(1.084 + 0.4193) = 1/1.503 = 0.6656
        assert chi == pytest.approx(0.6656, abs=0.005)
        assert Phi == pytest.approx(1.084, abs=0.005)

    def test_chi_curve_b_lambda1(self):
        chi, Phi = chi_flexural(lambda_bar=1.0, curve="b")
        # Phi = 0.5(1 + 0.34·0.8 + 1.0) = 0.5 · 2.272 = 1.136
        # chi = 1/(1.136 + √(1.136²-1)) = 1/(1.136 + 0.5371) = 0.5970
        assert chi == pytest.approx(0.5970, abs=0.005)

    def test_chi_curve_c_lambda1(self):
        chi, Phi = chi_flexural(lambda_bar=1.0, curve="c")
        # Phi = 0.5(1 + 0.49·0.8 + 1.0) = 0.5 · 2.392 = 1.196
        # chi = 1/(1.196 + √(1.196²-1)) = 1/(1.196 + 0.658) = 0.5396
        assert chi == pytest.approx(0.5396, abs=0.005)

    def test_chi_capped_at_one(self):
        """λ̄ ≤ 0.2 → χ = 1.0 (no riduzione)."""
        chi, _ = chi_flexural(lambda_bar=0.15, curve="b")
        assert chi == 1.0

    def test_chi_curve_ordering(self):
        """A parità di λ̄, χ_a > χ_b > χ_c > χ_d (curve più sfavorevoli = più riduzione)."""
        lb = 1.0
        chis = [chi_flexural(lb, c)[0] for c in ["a0", "a", "b", "c", "d"]]
        assert chis == sorted(chis, reverse=True), (
            f"Ordine curve violato: {chis}"
        )

    def test_negative_lambda_raises(self):
        with pytest.raises(ValueError):
            chi_flexural(lambda_bar=-0.1, curve="a")

    def test_invalid_curve_raises(self):
        with pytest.raises(ValueError):
            chi_flexural(lambda_bar=1.0, curve="z")


class TestNbRd:
    """Caso completo: colonna HEB 300 in S275, L=4m, cerniera-cerniera, asse z.

    HEB 300: A=149.1 cm², Iz=8563 cm⁴, h=b=0.30, tf=19mm
    curva z-z → 'c' (h/b=1.0, tf>15mm? no tf=19mm <100mm → 'c')
    A·fy = 149.1e-4 · 275e6 = 4100 kN
    N_cr = π²·210e9·8563e-8 / 4² = 11086 kN
    λ̄ = √(4100/11086) = 0.6080
    Φ = 0.5(1 + 0.49·0.408 + 0.6080²) = 0.5·(1+0.200+0.370) = 0.7849
    χ = 1/(0.7849 + √(0.7849²-0.6080²)) = 1/(0.7849+0.4958) = 0.7806
    N_b,Rd = 0.7806 · 4100 / 1.05 = 3047 kN
    """
    def test_heb300_s275_L4(self):
        s = SECTIONS_DB["heb_300"]
        r = N_b_Rd(
            A=s.A, I=s.Iz, fy=275e6, E=210e9, L_cr=4.0,
            section_class=SectionClass.CLASS_1,
            h=s.h, b=s.b, tf=s.tf, axis="z",
            gamma_M1=GAMMA_M1_NTC,
        )
        assert r.curve == "c"
        assert r.lambda_bar == pytest.approx(0.608, abs=0.01)
        assert r.chi == pytest.approx(0.781, abs=0.01)
        assert r.N_b_Rd / 1e3 == pytest.approx(3047, rel=0.02)

    def test_short_column_chi_approaches_one(self):
        """Colonna molto corta → λ̄ piccolo → χ → 1."""
        s = SECTIONS_DB["heb_300"]
        r = N_b_Rd(
            A=s.A, I=s.Iz, fy=275e6, E=210e9, L_cr=0.5,
            section_class=SectionClass.CLASS_1,
            h=s.h, b=s.b, tf=s.tf, axis="z",
        )
        assert r.lambda_bar < 0.3
        assert r.chi > 0.95

    def test_long_column_chi_small(self):
        """Colonna molto lunga → χ piccolo."""
        s = SECTIONS_DB["heb_300"]
        r = N_b_Rd(
            A=s.A, I=s.Iz, fy=275e6, E=210e9, L_cr=15.0,
            section_class=SectionClass.CLASS_1,
            h=s.h, b=s.b, tf=s.tf, axis="z",
        )
        assert r.lambda_bar > 2.0
        assert r.chi < 0.2

    def test_buckling_decreases_with_length(self):
        """N_b,Rd è strettamente decrescente con L_cr."""
        s = SECTIONS_DB["heb_300"]
        lengths = [2.0, 4.0, 6.0, 8.0, 10.0]
        Nb_values = [
            N_b_Rd(A=s.A, I=s.Iz, fy=275e6, E=210e9, L_cr=L,
                   section_class=SectionClass.CLASS_1,
                   h=s.h, b=s.b, tf=s.tf, axis="z").N_b_Rd
            for L in lengths
        ]
        # ogni successivo deve essere ≤ precedente
        for i in range(1, len(Nb_values)):
            assert Nb_values[i] < Nb_values[i-1], (
                f"N_b non monotono: {Nb_values}"
            )

    def test_negative_inputs_raise(self):
        with pytest.raises(ValueError):
            N_b_Rd(A=-1e-3, I=1e-5, fy=275e6, E=210e9, L_cr=4.0,
                   section_class=SectionClass.CLASS_1,
                   h=0.3, b=0.3, tf=0.019)
