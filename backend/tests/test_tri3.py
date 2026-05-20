"""Test sull'elemento triangolare T3 plane-stress."""
import math
import numpy as np
import pytest

from schemas import FEAModel, Node, Element, Load, Constraint, ElementType, LoadType, ConstraintType
from core.elements import Tri3
from core.solver import StaticSolver
from core.mesh import mesh_rectangle_tri3, validate_model, IssueLevel


class TestTri3:
    def test_stiffness_symmetric(self):
        coords = [[0, 0, 0], [1, 0, 0], [0, 1, 0]]
        t = Tri3(coords, E=200e9, nu=0.3, t=0.01)
        K = t.stiffness_global()
        assert K.shape == (6, 6)
        assert np.allclose(K, K.T)

    def test_zero_area_raises(self):
        coords = [[0, 0], [1, 0], [2, 0]]
        with pytest.raises(ValueError):
            Tri3(coords, E=200e9, nu=0.3, t=0.01)

    def test_stress_constant_strain(self):
        """Trazione monoassiale uniforme: σx = E·εx, σy ≈ -ν·E·εx (plane-stress)."""
        t = Tri3([[0, 0], [1, 0], [0, 1]], E=200e9, nu=0.3, t=0.01)
        eps_x = 1e-3
        u = np.array([0, 0, eps_x, 0, 0, 0])
        st = t.stresses(u)
        E = 200e9
        assert st["sigma_x"] == pytest.approx(E / (1 - 0.3**2) * eps_x, rel=1e-6)


class TestTri3Mesh:
    def test_mesh_generator(self):
        nodes, els = mesh_rectangle_tri3(
            (0, 0, 0), (2, 0, 0), (2, 1, 0), (0, 1, 0),
            nx=4, ny=2, material_id="steel_s355", section_id="shell_t100",
        )
        assert len(nodes) == (4 + 1) * (2 + 1)
        assert len(els) == 4 * 2 * 2
        for el in els:
            assert el.type == ElementType.TRI3
            assert len(el.nodes) == 3


class TestTri3InModel:
    def _membrane_strip(self) -> FEAModel:
        """Striscia rettangolare 2x1, incastrata a sinistra, tirata a destra."""
        nodes, els = mesh_rectangle_tri3(
            (0, 0, 0), (2, 0, 0), (2, 1, 0), (0, 1, 0),
            nx=4, ny=2, material_id="steel_s355", section_id="shell_t100",
        )
        constraints = [
            Constraint(id=i + 1, type=ConstraintType.FIXED, node_id=nodes[j * 5].id)
            for i, j in enumerate(range(3))
        ]
        right_ids = [nodes[j * 5 + 4].id for j in range(3)]
        loads = [Load(id=i + 1, type=LoadType.NODAL, target_id=nid, fx=10000.0)
                 for i, nid in enumerate(right_ids)]
        return FEAModel(
            id="m_strip", name="strip", is_3d=True,
            nodes=nodes, elements=els, constraints=constraints, loads=loads,
        )

    def test_strip_traction_solves(self):
        m = self._membrane_strip()
        issues = [i for i in validate_model(m) if i.level == IssueLevel.ERROR]
        assert issues == [], f"validator errori: {issues}"
        r = StaticSolver(m).solve()
        assert r.max_displacement > 0
        assert all(math.isfinite(d.ux) for d in r.displacements)
        right_nodes = [d for d in r.displacements
                       if abs(next(n.x for n in m.nodes if n.id == d.node_id) - 2.0) < 1e-6]
        assert all(d.ux > 0 for d in right_nodes), "Trazione → lato destro si sposta in +X"
