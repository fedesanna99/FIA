"""
Test per combinazioni modali SRSS e CQC (`core/postprocess/spectral.py`).

Riferimento:
- Der Kiureghian (1981) "A response spectrum method for random vibrations"
- EN 1998-1 §4.3.3.3
- Chopra, "Dynamics of Structures", 5th ed., 2017, cap. 13
"""
import math
import pytest
from hypothesis import given, strategies as st, settings

from core.postprocess import (
    srss, cqc, cqc_correlation,
    response_spectrum_combination,
    directional_combination,
    participating_mass_ratio, cumulative_mass_ratio,
)


# ─────────────────────── SRSS ───────────────────────

class TestSRSS:
    def test_basic(self):
        """SRSS([3, 4]) = sqrt(9+16) = 5."""
        assert srss([3.0, 4.0]) == pytest.approx(5.0, rel=1e-9)

    def test_known_three_values(self):
        """SRSS([10, 8, 5]) = sqrt(189) = 13.7477"""
        assert srss([10.0, 8.0, 5.0]) == pytest.approx(math.sqrt(189), rel=1e-9)

    def test_single_value_returns_abs(self):
        assert srss([-7.0]) == 7.0
        assert srss([7.0]) == 7.0

    def test_empty_returns_zero(self):
        assert srss([]) == 0.0

    def test_signs_irrelevant(self):
        """SRSS([3, -4]) = SRSS([3, 4]) = 5."""
        assert srss([3.0, -4.0]) == srss([3.0, 4.0])


# ─────────────────────── CQC correlation ───────────────────────

class TestCQCCorrelation:
    def test_rho_equal_omegas_is_one(self):
        """Per ω_i = ω_j: ρ_ij = 1 (perfetta correlazione)."""
        rho = cqc_correlation(10.0, 10.0, 0.05)
        assert rho == pytest.approx(1.0, rel=1e-9)

    def test_rho_decreases_with_frequency_separation(self):
        """ω molto diverse → ρ piccolo."""
        rho_close = cqc_correlation(10.0, 11.0, 0.05)
        rho_far = cqc_correlation(10.0, 100.0, 0.05)
        assert rho_close > rho_far
        assert rho_far < 0.01  # molto piccolo per separazione 10×

    def test_rho_increases_with_damping(self):
        """A pari r, smorzamento più alto → ρ più alto (banda più larga)."""
        rho_low = cqc_correlation(10.0, 12.0, 0.01)
        rho_high = cqc_correlation(10.0, 12.0, 0.20)
        assert rho_high > rho_low

    def test_rho_symmetric(self):
        """ρ(ω_i, ω_j) = ρ(ω_j, ω_i)."""
        rho1 = cqc_correlation(10.0, 12.0, 0.05)
        rho2 = cqc_correlation(12.0, 10.0, 0.05)
        assert rho1 == pytest.approx(rho2, rel=1e-9)

    def test_rho_in_unit_interval(self):
        """0 ≤ ρ ≤ 1."""
        for omega_i in [1.0, 10.0, 50.0]:
            for omega_j in [1.0, 5.0, 20.0, 100.0]:
                for xi in [0.01, 0.05, 0.20]:
                    rho = cqc_correlation(omega_i, omega_j, xi)
                    assert 0 <= rho <= 1 + 1e-9, (
                        f"ρ fuori range per ω={omega_i,omega_j} ξ={xi}: {rho}"
                    )

    def test_negative_omega_raises(self):
        with pytest.raises(ValueError):
            cqc_correlation(-10.0, 5.0, 0.05)

    def test_xi_out_of_range_raises(self):
        with pytest.raises(ValueError):
            cqc_correlation(10.0, 10.0, 0.0)
        with pytest.raises(ValueError):
            cqc_correlation(10.0, 10.0, 1.5)


# ─────────────────────── CQC combination ───────────────────────

class TestCQC:
    def test_cqc_distant_modes_approaches_srss(self):
        """Per modi distanti (ω molto diverse): CQC ≈ SRSS."""
        vals = [10.0, 8.0]
        omegas = [10.0, 100.0]
        c = cqc(vals, omegas, 0.05)
        s = srss(vals)
        assert c == pytest.approx(s, rel=0.01)

    def test_cqc_close_modes_larger_than_srss(self):
        """Per modi vicini: CQC > SRSS."""
        vals = [10.0, 8.0]
        omegas = [10.0, 11.0]
        c = cqc(vals, omegas, 0.05)
        s = srss(vals)
        assert c > s

    def test_cqc_identical_modes_is_abs_sum(self):
        """ω_i = ω_j e tutti positivi → CQC = somma dei valori = |R_1|+|R_2|."""
        vals = [10.0, 8.0]
        omegas = [10.0, 10.0]
        c = cqc(vals, omegas, 0.05)
        assert c == pytest.approx(18.0, rel=1e-9)

    def test_cqc_three_modes(self):
        """3 modi distanti: CQC ≈ SRSS."""
        vals = [10.0, 5.0, 2.0]
        omegas = [10.0, 50.0, 200.0]
        c = cqc(vals, omegas, 0.05)
        s = srss(vals)
        assert c == pytest.approx(s, rel=0.05)

    def test_mismatched_lengths_raises(self):
        with pytest.raises(ValueError):
            cqc([10.0, 5.0], [10.0], 0.05)


# ─────────────────────── Wrapper ───────────────────────

class TestResponseSpectrumCombination:
    def test_srss_method(self):
        v = response_spectrum_combination([3.0, 4.0], [10.0, 50.0], method="SRSS")
        assert v == pytest.approx(5.0)

    def test_cqc_method(self):
        v = response_spectrum_combination([3.0, 4.0], [10.0, 11.0], method="CQC")
        assert v > 5.0  # > SRSS per modi vicini

    def test_unknown_method_raises(self):
        with pytest.raises(ValueError):
            response_spectrum_combination([3.0], [10.0], method="MAX")


# ─────────────────────── Direzionale ───────────────────────

class TestDirectionalCombination:
    def test_30_rule(self):
        a, b, c = directional_combination(R_x=100, R_y=80, R_z=60, rule="30")
        assert a == pytest.approx(142.0)
        assert b == pytest.approx(128.0)
        assert c == pytest.approx(114.0)

    def test_srss_rule(self):
        a, b, c = directional_combination(R_x=3, R_y=4, R_z=0, rule="SRSS")
        assert a == pytest.approx(5.0)
        assert a == b == c

    def test_signs_taken_absolute(self):
        a, _, _ = directional_combination(R_x=-100, R_y=-80, rule="30")
        # |R_x| + 0.3·|R_y| = 100 + 24 = 124
        assert a == pytest.approx(124.0)

    def test_invalid_rule_raises(self):
        with pytest.raises(ValueError):
            directional_combination(R_x=100, rule="INVALID")


# ─────────────────────── Masse partecipanti ───────────────────────

class TestParticipatingMass:
    def test_basic(self):
        ratios = participating_mass_ratio([60, 20, 5], total_mass=100)
        assert ratios == [0.60, 0.20, 0.05]

    def test_cumulative(self):
        cum = cumulative_mass_ratio([0.60, 0.20, 0.05])
        assert cum == pytest.approx([0.60, 0.80, 0.85])

    def test_zero_total_mass_raises(self):
        with pytest.raises(ValueError):
            participating_mass_ratio([10, 5], total_mass=0)

    def test_85_percent_threshold_check(self):
        """Esempio NTC: somma cumulata deve raggiungere 85% per essere accettabile."""
        cum = cumulative_mass_ratio([0.60, 0.20, 0.05])
        # Il 3° modo porta al 85% esatto
        assert cum[-1] >= 0.85


# ─────────────────────── Property-based ───────────────────────

@st.composite
def positive_values_and_omegas(draw):
    n = draw(st.integers(min_value=2, max_value=6))
    vals = draw(st.lists(st.floats(min_value=0.1, max_value=100.0, allow_nan=False),
                          min_size=n, max_size=n))
    omegas = draw(st.lists(st.floats(min_value=1.0, max_value=1000.0, allow_nan=False),
                            min_size=n, max_size=n))
    return vals, omegas


class TestPropertyBased:
    @given(args=positive_values_and_omegas())
    @settings(max_examples=50, deadline=None)
    def test_cqc_always_geq_srss(self, args):
        """CQC ≥ SRSS sempre (le correlazioni ρ_ij ≥ 0 e ρ_ii = 1)."""
        vals, omegas = args
        c = cqc(vals, omegas, 0.05)
        s = srss(vals)
        assert c >= s - 1e-9

    @given(args=positive_values_and_omegas())
    @settings(max_examples=50, deadline=None)
    def test_cqc_leq_abs_sum(self, args):
        """CQC ≤ Σ|R_i| (limite superiore: perfetta correlazione)."""
        vals, omegas = args
        c = cqc(vals, omegas, 0.05)
        upper = sum(abs(v) for v in vals)
        assert c <= upper + 1e-6

    @given(values=st.lists(st.floats(min_value=-100, max_value=100, allow_nan=False),
                            min_size=1, max_size=10))
    @settings(max_examples=50, deadline=None)
    def test_srss_geq_max_abs(self, values):
        """SRSS ≥ max|R_i| (un termine al quadrato è almeno il massimo)."""
        if not values:
            return
        s = srss(values)
        max_abs = max(abs(v) for v in values)
        assert s >= max_abs - 1e-9
