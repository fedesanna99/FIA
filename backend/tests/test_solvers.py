"""Test sui solver — confronto con soluzioni analitiche note."""
import math
import pytest

from schemas import FEAModel, Node, Element, Load, Constraint, ElementType, LoadType, ConstraintType
from core.solver import StaticSolver, ModalSolver


def make_cantilever_beam2d(n_div: int = 10, L: float = 2.0,
                           E: float = 210e9, I: float = 1e-6,
                           A: float = 1e-3, P: float = -1000.0) -> FEAModel:
    """Mensola con carico nodale P alla punta — soluzione analitica δ = PL³/(3EI)."""
    nodes = [Node(id=i + 1, x=L * i / n_div, y=0, z=0) for i in range(n_div + 1)]
    elements = [Element(
        id=i + 1, type=ElementType.BEAM2D, nodes=[i + 1, i + 2],
        material_id="steel_s355", section_id="ipe_300",
    ) for i in range(n_div)]
    constraints = [Constraint(id=1, type=ConstraintType.FIXED, node_id=1)]
    loads = [Load(id=1, type=LoadType.NODAL, target_id=n_div + 1, fy=P)]
    return FEAModel(
        id="test_cantilever", name="test", is_3d=False,
        nodes=nodes, elements=elements, constraints=constraints, loads=loads,
    )


class TestStaticSolver:
    def test_cantilever_tip_deflection(self):
        """Confronto con δ = PL³/(3EI), usando sezione IPE 300 (I=8356e-8 m^4)."""
        L = 3.0
        P = -1000.0
        n_div = 20
        model = make_cantilever_beam2d(n_div=n_div, L=L, P=P)
        E = 210e9
        I = 8356e-8
        expected = P * L**3 / (3 * E * I)
        solver = StaticSolver(model)
        r = solver.solve()
        tip = next(d for d in r.displacements if d.node_id == n_div + 1)
        assert tip.uy == pytest.approx(expected, rel=0.05)

    def test_reactions_balance(self):
        """ΣFy reazioni == -ΣFy carichi."""
        model = make_cantilever_beam2d(n_div=10, L=2.0, P=-5000.0)
        r = StaticSolver(model).solve()
        total_react_y = sum(rx.fy for rx in r.reactions)
        assert total_react_y == pytest.approx(5000.0, rel=1e-3)

    def test_max_displacement_positive(self):
        model = make_cantilever_beam2d()
        r = StaticSolver(model).solve()
        assert r.max_displacement > 0
        assert r.n_dofs > 0
        assert r.solve_time_ms >= 0


class TestModalSolver:
    def test_cantilever_first_freq(self):
        """Frequenza fondamentale teorica: f₁ = (1.875)²/(2π L²) √(EI/ρA)."""
        L = 2.0
        E = 210e9
        I = 8356e-8
        A = 5.38e-3
        rho = 7850
        expected = (1.875)**2 / (2 * math.pi * L**2) * math.sqrt(E * I / (rho * A))
        model = make_cantilever_beam2d(n_div=20, L=L, P=0)
        r = ModalSolver(model, n_modes=3).solve()
        assert r.modes[0].frequency_hz == pytest.approx(expected, rel=0.10)

    def test_n_modes_returned(self):
        model = make_cantilever_beam2d(n_div=10, P=0)
        r = ModalSolver(model, n_modes=5).solve()
        assert len(r.modes) >= 1
        assert all(m.frequency_hz >= 0 for m in r.modes)
        freqs = [m.frequency_hz for m in r.modes]
        assert freqs == sorted(freqs), "Frequenze devono essere ordinate crescenti"
