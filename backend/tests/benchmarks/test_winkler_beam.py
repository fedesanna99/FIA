"""
Benchmark — Beam su suolo elastico di Winkler.

Formula di riferimento (Hetényi, "Beams on Elastic Foundation", 1946):

Per beam infinita su Winkler con carico concentrato P al centro:

    β    = (k / 4·E·I)^(1/4)         [1/m]   parametro caratteristico
    w_max = P · β / (2·k)              [m]    freccia massima al centro
    w(x) = w_max · exp(-β|x|) · (cos(β|x|) + sin(β|x|))
    M_max = P / (4·β)                  [N·m]   momento massimo al centro
    V_max = P / 2                      [N]     taglio massimo

Per beam "lunga" (β·L/2 ≥ 3) la soluzione si avvicina alla infinita.

NOTA: nel modello FEM, k_w è inteso come la rigidezza distribuita per
unità di LUNGHEZZA del beam (N/m²). Per un'asta di larghezza b che poggia su
un suolo con k_v [N/m³] (coefficiente di sottofondo), si ha k_w = k_v · b.

Riferimento: Hetényi M., "Beams on Elastic Foundation", The University of
Michigan Press, 1946.
"""
import math
import pytest

from schemas import (
    FEAModel, Node, Element, Load, Constraint,
    ElementType, LoadType, ConstraintType,
)
from core.solver import StaticSolver


pytestmark = pytest.mark.benchmark


def _build_winkler_beam(L_total: float, n: int, k_w: float, P_center: float):
    """Beam centrata in 0, da -L/2 a +L/2, n elementi, Winkler k_w, P al centro."""
    nodes = [Node(id=i + 1, x=-L_total / 2 + L_total * i / n, y=0, z=0)
             for i in range(n + 1)]
    elements = [
        Element(id=i + 1, type=ElementType.BEAM2D, nodes=[i + 1, i + 2],
                material_id="steel_s355", section_id="ipe_300",
                winkler_k=k_w)
        for i in range(n)
    ]
    # Vincoli minimi per evitare moto rigido assiale (asse x); resta libera in y
    # — il suolo elastico fa da vincolo distribuito.
    constraints = [
        Constraint(id=1, type=ConstraintType.CUSTOM, node_id=1,
                   dofs=[True, False, False, False, False, False]),
    ]
    mid_id = n // 2 + 1
    loads = [Load(id=1, type=LoadType.NODAL, target_id=mid_id, fy=-P_center)]
    return FEAModel(
        id="winkler", name="w", is_3d=False,
        nodes=nodes, elements=elements,
        constraints=constraints, loads=loads,
    )


def _beta(k_w: float, E: float, I: float) -> float:
    return (k_w / (4 * E * I)) ** 0.25


class TestHetenyiBeam:
    """IPE 300, k_w = 3 MN/m², L=20m → β·L/2 = 4.5 (beam 'lunga')."""
    E = 210e9
    I = 8356e-8
    k_w = 3e6  # N/m² (terreno medio, k_v · b ≈ 20e6 · 0.15)

    def test_max_deflection_at_center(self):
        L = 20.0
        P = 10e3
        n = 50
        m = _build_winkler_beam(L, n, self.k_w, P)
        r = StaticSolver(m).solve()
        mid_id = n // 2 + 1
        mid = next(d for d in r.displacements if d.node_id == mid_id)
        beta = _beta(self.k_w, self.E, self.I)
        w_hetenyi = P * beta / (2 * self.k_w)
        assert abs(mid.uy) == pytest.approx(w_hetenyi, rel=0.02), (
            f"w_FEM = {abs(mid.uy)*1000:.4f} mm, Hetényi = {w_hetenyi*1000:.4f} mm"
        )

    def test_deflection_decays_exponentially(self):
        """Lontano dal carico, la freccia decade come exp(-β|x|)."""
        L = 30.0
        P = 10e3
        n = 60
        m = _build_winkler_beam(L, n, self.k_w, P)
        r = StaticSolver(m).solve()
        beta = _beta(self.k_w, self.E, self.I)
        nodes_by_id = {nd.id: nd for nd in m.nodes}

        def w_hetenyi(x: float) -> float:
            return P * beta / (2 * self.k_w) * math.exp(-beta * abs(x)) * \
                   (math.cos(beta * abs(x)) + math.sin(beta * abs(x)))

        # Confronto in 3 punti: 0, 1/β, 2/β
        for x_target in [0.0, 1.0 / beta, 2.0 / beta]:
            # nodo più vicino a x_target
            nearest = min(r.displacements,
                           key=lambda d: abs(nodes_by_id[d.node_id].x - x_target))
            x = nodes_by_id[nearest.node_id].x
            expected = w_hetenyi(x)
            # Tolleranza più ampia per x lontani (più sensibili al troncamento)
            assert abs(nearest.uy) == pytest.approx(abs(expected), abs=2e-5), (
                f"x={x:.2f}m: w_FEM={nearest.uy*1000:.4f}mm, "
                f"Hetényi={expected*1000:.4f}mm"
            )

    def test_doubles_k_halves_w_max(self):
        """w_max ∝ β/k = k^(-3/4). Raddoppiando k, w_max → w·2^(-3/4) ≈ w·0.595."""
        L = 20.0
        P = 10e3
        n = 50
        m1 = _build_winkler_beam(L, n, self.k_w, P)
        m2 = _build_winkler_beam(L, n, 2 * self.k_w, P)
        r1 = StaticSolver(m1).solve()
        r2 = StaticSolver(m2).solve()
        mid_id = n // 2 + 1
        w1 = abs(next(d for d in r1.displacements if d.node_id == mid_id).uy)
        w2 = abs(next(d for d in r2.displacements if d.node_id == mid_id).uy)
        ratio = w2 / w1
        assert ratio == pytest.approx(2 ** (-3 / 4), rel=0.05)

    def test_zero_winkler_recovers_unsupported_beam(self):
        """Con k_w=0 e un solo vincolo, la matrice è singolare (beam libera).
        Verifichiamo invece che con k_w piccolo la freccia sia molto grande."""
        L = 20.0
        P = 10e3
        n = 30
        m_small = _build_winkler_beam(L, n, 1e3, P)  # k_w piccolo
        m_high = _build_winkler_beam(L, n, 1e6, P)
        r_small = StaticSolver(m_small).solve()
        r_high = StaticSolver(m_high).solve()
        mid_id = n // 2 + 1
        w_small = abs(next(d for d in r_small.displacements if d.node_id == mid_id).uy)
        w_high = abs(next(d for d in r_high.displacements if d.node_id == mid_id).uy)
        # k_w 1000x più piccolo → freccia molto maggiore
        assert w_small > 10 * w_high

    def test_load_scaling_linear(self):
        """Linearità: 2·P → 2·w."""
        L = 20.0
        n = 30
        m1 = _build_winkler_beam(L, n, self.k_w, 10e3)
        m2 = _build_winkler_beam(L, n, self.k_w, 20e3)
        r1 = StaticSolver(m1).solve()
        r2 = StaticSolver(m2).solve()
        mid_id = n // 2 + 1
        w1 = abs(next(d for d in r1.displacements if d.node_id == mid_id).uy)
        w2 = abs(next(d for d in r2.displacements if d.node_id == mid_id).uy)
        assert (w2 / w1) == pytest.approx(2.0, rel=1e-6)


class TestWinklerMatrixProperties:
    """Test diretti su Beam2D.local_winkler_stiffness."""

    def test_winkler_matrix_symmetric(self):
        from core.elements.beam2d import Beam2D
        b = Beam2D(n1=[0, 0], n2=[2, 0], E=210e9, A=5e-3, I=1e-5)
        K = b.local_winkler_stiffness(k_w=1e6)
        import numpy as np
        assert np.allclose(K, K.T)

    def test_winkler_matrix_zero_when_kw_zero(self):
        from core.elements.beam2d import Beam2D
        import numpy as np
        b = Beam2D(n1=[0, 0], n2=[2, 0], E=210e9, A=5e-3, I=1e-5)
        K = b.local_winkler_stiffness(k_w=0)
        assert np.allclose(K, 0)

    def test_winkler_matrix_zero_axial_dofs(self):
        """I dof ux (0 e 3) non hanno contributo Winkler."""
        from core.elements.beam2d import Beam2D
        b = Beam2D(n1=[0, 0], n2=[2, 0], E=210e9, A=5e-3, I=1e-5)
        K = b.local_winkler_stiffness(k_w=1e6)
        assert all(K[0, j] == 0 for j in range(6))
        assert all(K[3, j] == 0 for j in range(6))

    def test_existing_beam_test_still_passes(self):
        """Sanity: senza winkler_k, beam normale invariato."""
        from core.elements.beam2d import Beam2D
        import numpy as np
        b = Beam2D(n1=[0, 0], n2=[2, 0], E=210e9, A=5e-3, I=1e-5)
        K_no_winkler = b.stiffness_global()
        K_with_zero = b.stiffness_global(winkler_k=0)
        assert np.allclose(K_no_winkler, K_with_zero)
