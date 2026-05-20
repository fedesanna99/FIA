"""
Test FASE 19 — convergence order, Richardson extrapolation, GCI, ZZ error.
"""
from __future__ import annotations
import math

import pytest

from schemas import (
    FEAModel, Node, Element, Load, Constraint,
    ElementType, LoadType, ConstraintType,
)
from core.solver import StaticSolver
from core.postprocess import (
    convergence_order, richardson_extrapolation, grid_convergence_index,
    analyze_convergence, ZZErrorResult, zz_error_estimate, relative_error,
)


# ─────────────────── Convergence checker ───────────────────

class TestConvergenceOrder:
    def test_synthetic_order_2(self):
        """q(h) = 1 - h^2: q1=q(1)=0, q2=q(0.5)=0.75, q3=q(0.25)=0.9375.
        Differenze: e1=0-0.75=-0.75, e2=0.75-0.9375=-0.1875
        rapporto |e1/e2| = 4 → log2(4) = 2.0."""
        values = [0.0, 0.75, 0.9375]
        p = convergence_order(values, ratio=2.0)
        assert p == pytest.approx(2.0, rel=1e-6)

    def test_synthetic_order_1(self):
        """q(h) = -h: q(1)=-1, q(0.5)=-0.5, q(0.25)=-0.25
        e1=-0.5, e2=-0.25 → ratio=2 → order=1."""
        values = [-1.0, -0.5, -0.25]
        assert convergence_order(values, ratio=2.0) == pytest.approx(1.0)

    def test_zero_denominator_returns_nan(self):
        values = [1.0, 2.0, 2.0]  # e2 = 0
        assert math.isnan(convergence_order(values))

    def test_too_few_values_raises(self):
        with pytest.raises(ValueError):
            convergence_order([1.0, 2.0])


class TestRichardsonExtrapolation:
    def test_quadratic_recovery(self):
        """Per la serie 0, 0.75, 0.9375 (q_exact=1, p=2):
            q_exact ≈ 0.9375 + (0.9375-0.75)/(4-1) = 0.9375 + 0.0625 = 1.0."""
        q_exact = richardson_extrapolation([0.0, 0.75, 0.9375], p=2.0)
        assert q_exact == pytest.approx(1.0, rel=1e-9)

    def test_two_values_ok(self):
        # Anche con solo 2 valori funziona
        v = richardson_extrapolation([0.75, 0.9375], p=2.0)
        assert v == pytest.approx(1.0)


class TestGCI:
    def test_gci_positive(self):
        gci = grid_convergence_index([0.0, 0.75, 0.9375], p=2.0)
        # eps = |0.9375 - 0.75| / 0.9375 = 0.2, denom = 4-1 = 3, fs=1.25
        # GCI = 1.25 · 0.2 / 3 = 0.0833...
        assert gci == pytest.approx(1.25 * 0.2 / 3.0, rel=1e-6)


class TestAnalyzeConvergence:
    def test_full_analysis(self):
        r = analyze_convergence([0.0, 0.75, 0.9375])
        assert r.apparent_order == pytest.approx(2.0)
        assert r.extrapolated_value == pytest.approx(1.0)
        assert r.is_monotonic is True


# ─────────────────── Convergence end-to-end su cantilever beam ───────────────────

def _cantilever(n_div: int, L: float = 4.0, P: float = -1000.0) -> FEAModel:
    nodes = [Node(id=i + 1, x=L * i / n_div, y=0, z=0)
             for i in range(n_div + 1)]
    elements = [
        Element(id=i + 1, type=ElementType.BEAM2D, nodes=[i + 1, i + 2],
                 material_id="steel_s355", section_id="ipe_300")
        for i in range(n_div)
    ]
    constraints = [Constraint(id=1, type=ConstraintType.FIXED, node_id=1)]
    loads = [Load(id=1, type=LoadType.NODAL, target_id=n_div + 1, fy=P)]
    return FEAModel(id="cant", name="cant", is_3d=False,
                     nodes=nodes, elements=elements,
                     constraints=constraints, loads=loads)


class TestCantileverConvergence:
    """Cantilever PL³/3EI con beam Euler-Bernoulli (esatto per qualsiasi mesh)."""

    def test_already_exact_no_h_dependence(self):
        """Beam Euler-Bernoulli con shape function cubica è esatto per
        cantilever con carico concentrato — il valore non cambia rifinendo."""
        v1 = abs(StaticSolver(_cantilever(2)).solve().displacements[-1].uy)
        v2 = abs(StaticSolver(_cantilever(4)).solve().displacements[-1].uy)
        v3 = abs(StaticSolver(_cantilever(8)).solve().displacements[-1].uy)
        # Tutti sostanzialmente identici
        assert abs(v1 - v3) / v3 < 1e-6
        assert abs(v2 - v3) / v3 < 1e-6


# ─────────────────── Zienkiewicz-Zhu error estimator ───────────────────

class TestZZErrorEstimator:
    def test_constant_field_zero_error(self):
        """Campo costante su tutti gli elementi → smoothed = costante → errore 0."""
        elem_vals = {1: 5.0, 2: 5.0, 3: 5.0}
        elem_nodes = {1: [1, 2], 2: [2, 3], 3: [3, 4]}
        r = zz_error_estimate(elem_vals, elem_nodes)
        assert r.global_error == pytest.approx(0.0)
        assert all(v == pytest.approx(0.0) for v in r.element_errors.values())

    def test_jump_field_nonzero_error(self):
        """Salto netto: 2 elementi a 0, 2 a 10 → errore non nullo."""
        elem_vals = {1: 0.0, 2: 0.0, 3: 10.0, 4: 10.0}
        # Nodi condivisi solo tra elementi adiacenti
        elem_nodes = {1: [1, 2], 2: [2, 3], 3: [3, 4], 4: [4, 5]}
        r = zz_error_estimate(elem_vals, elem_nodes)
        assert r.global_error > 0
        # Gli elementi adiacenti al salto (2 e 3) hanno l'errore massimo
        max_err_eid = max(r.element_errors, key=lambda k: r.element_errors[k])
        assert max_err_eid in (2, 3)

    def test_refinement_candidates_top_fraction(self):
        # 5 elementi con errori distinti
        elem_vals = {1: 0, 2: 1, 3: 4, 4: 9, 5: 16}
        elem_nodes = {i: [i, i + 1] for i in range(1, 6)}
        r = zz_error_estimate(elem_vals, elem_nodes, refine_fraction=0.4)
        # Top 2 elementi (40% di 5) per errore
        assert len(r.refinement_candidates) == 2
        # 4 e 5 hanno valori più alti → più lontani dalla smoothed
        assert 5 in r.refinement_candidates

    def test_empty_input(self):
        r = zz_error_estimate({}, {})
        assert r.global_error == 0.0
        assert r.element_errors == {}

    def test_relative_error_constant_zero(self):
        elem_vals = {1: 3.0, 2: 3.0, 3: 3.0}
        elem_nodes = {1: [1, 2], 2: [2, 3], 3: [3, 4]}
        eta = relative_error(elem_vals, elem_nodes)
        assert eta == pytest.approx(0.0)

    def test_relative_error_normalized(self):
        elem_vals = {1: 1.0, 2: 2.0, 3: 3.0}
        elem_nodes = {1: [1, 2], 2: [2, 3], 3: [3, 4]}
        eta = relative_error(elem_vals, elem_nodes)
        assert eta >= 0.0
