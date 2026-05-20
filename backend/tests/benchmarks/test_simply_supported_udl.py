"""
Benchmark analitico — Trave appoggiata con carico uniformemente distribuito.

Soluzione di riferimento (Eulero-Bernoulli, w in N/m):
    δ_mid = 5 w L⁴ / (384 E I)
    M_max = w L² / 8     (al centro)
    R_A = R_B = w L / 2

Riferimento: Hibbeler, "Mechanics of Materials", 10th ed., 2017, App. B (Beam Deflections).
"""
import pytest

from schemas import (
    FEAModel, Node, Element, Load, Constraint,
    ElementType, LoadType, ConstraintType,
)
from core.solver import StaticSolver


pytestmark = pytest.mark.benchmark


def _build_simply_supported(n_div: int, L: float, w: float) -> FEAModel:
    """w in N/m, positivo se verso l'alto (asse y)."""
    nodes = [Node(id=i + 1, x=L * i / n_div, y=0, z=0) for i in range(n_div + 1)]
    elements = [
        Element(
            id=i + 1, type=ElementType.BEAM2D, nodes=[i + 1, i + 2],
            material_id="steel_s355", section_id="ipe_300",
        ) for i in range(n_div)
    ]
    constraints = [
        Constraint(id=1, type=ConstraintType.PINNED, node_id=1),
        Constraint(id=2, type=ConstraintType.ROLLER_Y, node_id=n_div + 1),
    ]
    loads = [
        Load(id=i + 1, type=LoadType.DISTRIBUTED, target_id=i + 1, qy=w)
        for i in range(n_div)
    ]
    return FEAModel(
        id="ss_udl", name="simply supported UDL", is_3d=False,
        nodes=nodes, elements=elements, constraints=constraints, loads=loads,
    )


@pytest.mark.parametrize("n_div", [4, 10, 20, 40])
def test_midspan_deflection_5wL4_384EI(n_div):
    """δ_mid = 5 w L⁴ / (384 E I). Mesh pari → nodo centrale presente."""
    if n_div % 2:
        pytest.skip("n_div pari richiesto per avere il nodo centrale")
    L = 4.0
    w = -10000.0  # N/m verso il basso
    E = 210e9
    I = 8356e-8  # IPE 300

    expected = 5.0 * w * L**4 / (384.0 * E * I)
    model = _build_simply_supported(n_div=n_div, L=L, w=w)
    r = StaticSolver(model).solve()
    mid_id = n_div // 2 + 1
    mid = next(d for d in r.displacements if d.node_id == mid_id)

    assert mid.uy == pytest.approx(expected, rel=0.03), (
        f"n_div={n_div}: ottenuto {mid.uy:.6e}, atteso {expected:.6e}"
    )


def test_reactions_equal_wL_half():
    """Reazioni verticali simmetriche: R_A = R_B = -w L / 2."""
    L = 6.0
    w = -5000.0
    n_div = 12
    model = _build_simply_supported(n_div=n_div, L=L, w=w)
    r = StaticSolver(model).solve()
    R_left = next(rx for rx in r.reactions if rx.node_id == 1)
    R_right = next(rx for rx in r.reactions if rx.node_id == n_div + 1)
    expected_each = -w * L / 2.0
    assert R_left.fy == pytest.approx(expected_each, rel=1e-3)
    assert R_right.fy == pytest.approx(expected_each, rel=1e-3)


def test_total_reaction_equals_total_load():
    """Equilibrio globale: ΣR_y = -w·L (per qy applicato su ogni elemento)."""
    L = 5.0
    w = -8000.0
    n_div = 10
    model = _build_simply_supported(n_div=n_div, L=L, w=w)
    r = StaticSolver(model).solve()
    total = sum(rx.fy for rx in r.reactions)
    assert total == pytest.approx(-w * L, rel=1e-3)


def test_zero_distributed_load_zero_displacement():
    """Edge case: w = 0 → tutti gli spostamenti nulli."""
    model = _build_simply_supported(n_div=6, L=4.0, w=0.0)
    r = StaticSolver(model).solve()
    assert all(abs(d.uy) < 1e-9 for d in r.displacements)


@pytest.mark.parametrize("L", [2.0, 4.0, 6.0, 10.0])
def test_deflection_scales_with_L4(L):
    """Lo spostamento centrale ∝ L⁴ a parità di altre quantità."""
    w = -10000.0
    n_div = 10
    E = 210e9
    I = 8356e-8
    expected = 5.0 * w * L**4 / (384.0 * E * I)
    model = _build_simply_supported(n_div=n_div, L=L, w=w)
    r = StaticSolver(model).solve()
    mid = next(d for d in r.displacements if d.node_id == n_div // 2 + 1)
    assert mid.uy == pytest.approx(expected, rel=0.03)
