"""
Benchmark analitico — Trave a sbalzo (cantilever) con carico concentrato in punta.

Soluzione di riferimento (Eulero-Bernoulli):
    δ_tip = P L³ / (3 E I)
    θ_tip = P L² / (2 E I)
    M_max = P L  (al vincolo)
    V    = P    (costante)

Riferimento: Timoshenko & Goodier, "Theory of Elasticity", 3rd ed., 1970, §21.
"""
import math
import pytest

from schemas import (
    FEAModel, Node, Element, Load, Constraint,
    ElementType, LoadType, ConstraintType,
)
from core.solver import StaticSolver


pytestmark = pytest.mark.benchmark


def _build(n_div: int, L: float, P: float, section_id: str = "ipe_300") -> FEAModel:
    nodes = [Node(id=i + 1, x=L * i / n_div, y=0, z=0) for i in range(n_div + 1)]
    elements = [
        Element(
            id=i + 1, type=ElementType.BEAM2D, nodes=[i + 1, i + 2],
            material_id="steel_s355", section_id=section_id,
        ) for i in range(n_div)
    ]
    constraints = [Constraint(id=1, type=ConstraintType.FIXED, node_id=1)]
    loads = [Load(id=1, type=LoadType.NODAL, target_id=n_div + 1, fy=P)]
    return FEAModel(
        id="cantilever_tip", name="cantilever tip load", is_3d=False,
        nodes=nodes, elements=elements, constraints=constraints, loads=loads,
    )


@pytest.mark.parametrize("n_div", [4, 10, 20, 40])
def test_cantilever_tip_deflection_convergence(n_div):
    """δ_tip = PL³/(3EI). Convergenza monotona al raffinare della mesh."""
    L = 3.0
    P = -1000.0  # N verso il basso
    E = 210e9
    I = 8356e-8  # IPE 300

    expected = P * L**3 / (3.0 * E * I)
    model = _build(n_div=n_div, L=L, P=P)
    r = StaticSolver(model).solve()
    tip = next(d for d in r.displacements if d.node_id == n_div + 1)

    # Beam Euler-Bernoulli: 1 elemento è già esatto per cantilever con carico in punta.
    assert tip.uy == pytest.approx(expected, rel=0.02), (
        f"n_div={n_div}: ottenuto {tip.uy:.6e}, atteso {expected:.6e}"
    )


def test_cantilever_reactions_balance():
    """Reazioni al vincolo: V = -P, M = -P L."""
    L = 2.5
    P = -2500.0
    model = _build(n_div=10, L=L, P=P)
    r = StaticSolver(model).solve()
    base = next(rx for rx in r.reactions if rx.node_id == 1)
    assert base.fy == pytest.approx(-P, rel=1e-3)
    assert base.mz == pytest.approx(-P * L, rel=1e-3)


def test_cantilever_load_sign_changes_displacement():
    """Carico in su → spostamento in su, carico in giù → spostamento in giù."""
    L = 2.0
    P = 1000.0
    model_up = _build(n_div=10, L=L, P=P)
    model_down = _build(n_div=10, L=L, P=-P)
    tip_up = next(d for d in StaticSolver(model_up).solve().displacements if d.node_id == 11)
    tip_down = next(d for d in StaticSolver(model_down).solve().displacements if d.node_id == 11)
    assert tip_up.uy > 0 and tip_down.uy < 0
    assert tip_up.uy == pytest.approx(-tip_down.uy, rel=1e-6)


def test_cantilever_zero_load_zero_displacement():
    """Edge: P=0 → spostamenti nulli."""
    model = _build(n_div=5, L=2.0, P=0.0)
    r = StaticSolver(model).solve()
    assert all(abs(d.uy) < 1e-12 for d in r.displacements)
    assert all(abs(d.ux) < 1e-12 for d in r.displacements)


@pytest.mark.parametrize("L", [1.0, 2.0, 5.0, 10.0])
def test_cantilever_scaling_with_length(L):
    """δ ∝ L³: raddoppiando L lo spostamento si moltiplica per 8."""
    P = -500.0
    E = 210e9
    I = 8356e-8
    expected = P * L**3 / (3.0 * E * I)
    model = _build(n_div=8, L=L, P=P)
    r = StaticSolver(model).solve()
    n_last = len(model.nodes)
    tip = next(d for d in r.displacements if d.node_id == n_last)
    assert tip.uy == pytest.approx(expected, rel=0.02)
