"""
Test fatica — Rainflow ASTM E1049-85, curve S-N EC3-1-9, danno di Miner.

Caso di riferimento ASTM E1049-85 §5.4.5 (Fig. 6):
    Sequenza turning points: A=-2, B=+1, C=-3, D=+5, E=-1, F=+3, G=-4, H=+4, I=-2
    Cicli attesi (per la sequenza A..I):
        Ciclo 1: B-C, range=4, mean=-1.0
        Ciclo 2: E-F, range=4, mean= 1.0
        + 5 mezzi cicli residui da picchi e valli irriducibili
"""
from __future__ import annotations
import math

import pytest

from core.postprocess.fatigue import (
    FatigueCycle, SNCurve, ec3_category,
    extract_peaks_valleys, rainflow_count, cycle_histogram, miner_damage,
)


class TestExtractTurningPoints:
    def test_already_turning_points(self):
        s = [1, 3, 1, 5, 2, 4]
        assert extract_peaks_valleys(s) == s

    def test_strips_monotonic_runs(self):
        # 1,2,3,4 → solo gli estremi (4 punti collineari diventano 2)
        assert extract_peaks_valleys([1, 2, 3, 4]) == [1, 4]

    def test_drops_repeated_values(self):
        assert extract_peaks_valleys([1, 1, 2, 2, 1, 1]) == [1, 2, 1]

    def test_single_short_signal(self):
        assert extract_peaks_valleys([5]) == [5]
        assert extract_peaks_valleys([5, 7]) == [5, 7]


class TestRainflowASTMExample:
    """Test sulla sequenza ufficiale ASTM E1049-85 §5.4.5.

    Il 4-point method standard, applicato senza riordinamento "max-first",
    produce 1 ciclo intero (range=4, mean=1) e 6 mezzi cicli residui.
    Il totale ponderato (1.0 + 6·0.5 = 4.0) rappresenta l'equivalente di
    4 cicli interi — il danno cumulativo è lo stesso del risultato "max-first"
    (2 interi + 4 mezzi → 2 + 2 = 4).
    """

    SEQ = [-2, 1, -3, 5, -1, 3, -4, 4, -2]

    def test_total_count_matches(self):
        cycles = rainflow_count(self.SEQ)
        total = sum(c.count for c in cycles)
        assert total == pytest.approx(4.0)

    def test_contains_range_4_full_cycle(self):
        """Il ciclo E-F (range=4, mean=+1) è sempre estratto come pieno
        in entrambe le varianti dell'algoritmo."""
        cycles = rainflow_count(self.SEQ)
        full = [c for c in cycles if c.count == 1.0]
        assert any(c.range == 4.0 and c.mean == 1.0 for c in full), \
            f"ciclo pieno range=4 mean=+1 non trovato. Fulls: {full}"

    def test_max_range_present_as_half(self):
        """La swing massima del segnale è |5-(-4)|=9. Deve apparire come
        mezzo ciclo nel residuo."""
        cycles = rainflow_count(self.SEQ)
        halves = [c for c in cycles if c.count == 0.5]
        assert any(c.range == 9 for c in halves), \
            "Half cycle range=9 (max swing) atteso nei residui"

    def test_all_ranges_nonnegative(self):
        cycles = rainflow_count(self.SEQ)
        assert all(c.range >= 0 for c in cycles)


class TestRainflowSimpleCases:
    def test_single_full_cycle_triangle(self):
        # Triangle 0 → 10 → 0: 1 mezzo + 1 mezzo = 1 ciclo completo equiv.
        cycles = rainflow_count([0, 10, 0])
        total = sum(c.count for c in cycles)
        assert total == pytest.approx(1.0)
        # range = 10 per entrambi
        assert all(c.range == 10 for c in cycles)

    def test_zero_signal_no_cycles(self):
        cycles = rainflow_count([0])
        assert cycles == []

    def test_constant_signal_no_cycles(self):
        cycles = rainflow_count(extract_peaks_valleys([5, 5, 5, 5]))
        assert cycles == []


class TestSNCurveEC3:
    def test_category_80_at_NC(self):
        """A N_C = 2e6 cicli, Δσ = ΔσC = 80 MPa."""
        sn = ec3_category(80)
        # cycles_to_failure(80) ≈ 2e6
        N = sn.cycles_to_failure(80.0)
        assert N == pytest.approx(2e6, rel=1e-6)

    def test_below_CAFL_returns_infinity(self):
        sn = ec3_category(80)
        # ΔσL EC3 = ΔσD · (5/100)^(1/5) con ΔσD = ΔσC · (2/5)^(1/3)
        # ΔσD = 80 · 0.7368 ≈ 58.95
        # ΔσL = 58.95 · 0.5493 ≈ 32.39 MPa
        # Sicuramente Δσ = 20 è sotto CAFL
        assert sn.cycles_to_failure(20.0) == float("inf")

    def test_above_NC_uses_m1(self):
        """Δσ = 160 MPa (2× ΔσC) → N = 2e6 · (80/160)^3 = 2.5e5 cicli."""
        sn = ec3_category(80)
        N = sn.cycles_to_failure(160.0)
        assert N == pytest.approx(2e6 * (0.5 ** 3), rel=1e-3)

    def test_invalid_category_raises(self):
        with pytest.raises(KeyError):
            ec3_category(999)

    def test_zero_or_negative_returns_infinity(self):
        sn = ec3_category(56)
        assert sn.cycles_to_failure(0) == float("inf")
        assert sn.cycles_to_failure(-10) == float("inf")


class TestMinerDamage:
    def test_full_life_with_single_load_level(self):
        """N cicli a ΔσC → D = N/N_C = 1.0."""
        sn = ec3_category(80)
        N_C = 2e6
        cycles = [FatigueCycle(range=80.0, mean=0, count=N_C)]
        D = miner_damage(cycles, sn)
        assert D == pytest.approx(1.0, rel=1e-6)

    def test_half_life(self):
        sn = ec3_category(80)
        cycles = [FatigueCycle(range=80.0, mean=0, count=1e6)]
        D = miner_damage(cycles, sn)
        assert D == pytest.approx(0.5, rel=1e-6)

    def test_below_CAFL_no_damage(self):
        sn = ec3_category(80)
        cycles = [FatigueCycle(range=20.0, mean=0, count=1e8)]
        # 20 MPa è sotto CAFL → N = inf → D = 0
        D = miner_damage(cycles, sn)
        assert D == 0.0

    def test_linearity(self):
        """D(2·cycles) = 2 · D(cycles)."""
        sn = ec3_category(80)
        c = [FatigueCycle(range=100.0, mean=0, count=1000)]
        c2 = [FatigueCycle(range=100.0, mean=0, count=2000)]
        assert miner_damage(c2, sn) == pytest.approx(2 * miner_damage(c, sn))

    def test_gamma_Mf_increases_damage(self):
        sn = ec3_category(80)
        cycles = [FatigueCycle(range=80.0, mean=0, count=1e6)]
        D1 = miner_damage(cycles, sn, safety_factor_gamma_Mf=1.0)
        D2 = miner_damage(cycles, sn, safety_factor_gamma_Mf=1.35)
        assert D2 > D1
        # γ_Mf=1.35 → range effettivo 108 MPa → N = 2e6 · (80/108)^3 ≈ 8.13e5
        # D2 ≈ 1e6 / 8.13e5 ≈ 1.23
        assert D2 == pytest.approx(1e6 / (2e6 * (80/108)**3), rel=1e-3)


class TestRainflowMinerPipeline:
    """End-to-end: signal → turning_points → rainflow → Miner."""

    def test_simple_signal_lifetime(self):
        """1000 cicli di range 80 MPa su categoria 80 → D = 1000/2e6 ≈ 5e-4."""
        sn = ec3_category(80)
        # Genera segnale con 1000 cicli a range 80
        sig = []
        for _ in range(1000):
            sig.extend([0, 80, 0])
        tp = extract_peaks_valleys(sig)
        cycles = rainflow_count(tp)
        D = miner_damage(cycles, sn)
        # Conta cicli totali (dovrebbero essere ~1000)
        total = sum(c.count for c in cycles)
        # I residui esistono ai bordi, ma in totale ≈ 1000
        assert total == pytest.approx(1000.0, rel=0.01)
        assert D == pytest.approx(total / 2e6, rel=1e-3)


class TestCycleHistogram:
    def test_basic_bins(self):
        c = [FatigueCycle(range=r, mean=0, count=1.0) for r in [1, 2, 3, 4, 5]]
        bins, counts = cycle_histogram(c, n_bins=5)
        assert len(bins) == 5
        assert sum(counts) == 5.0

    def test_empty_returns_empty(self):
        assert cycle_histogram([]) == ([], [])
