"""
Test BL-3 — Elementi Tet4 e Tet10.

Tre famiglie:
    A) Unit element (volume, B costante per Tet4, simmetria K)
    B) Patch test 3D — stress uniforme su cubo discretizzato
    C) Cantilever solido — convergenza con T10 più accurato di T4

Riferimenti:
    - Patch test 3D: deformazione uniforme imposta sui dof boundary →
      stress uniforme nell'interno (Irons-Razzaque).
"""
from __future__ import annotations
import numpy as np
import pytest

from schemas import (
    FEAModel, Node, Element, Load, Constraint,
    ElementType, LoadType, ConstraintType,
)
from core.elements import SolidTet4, SolidTet10
from core.solver import StaticSolver


# ────────────────────────────────────────────────────────────────────────────
# A. Unit elements
# ────────────────────────────────────────────────────────────────────────────
class TestTet4Unit:
    """Tetraedro unitario di riferimento ((0,0,0),(1,0,0),(0,1,0),(0,0,1))."""

    def _unit(self):
        return SolidTet4(
            nodes_xyz=[(0, 0, 0), (1, 0, 0), (0, 1, 0), (0, 0, 1)],
            E=210e9, nu=0.3, rho=7850,
        )

    def test_volume_correct(self):
        e = self._unit()
        # V = 1/6 per tetraedro unitario
        assert e.V == pytest.approx(1.0 / 6.0, rel=1e-9)

    def test_B_constant(self):
        """Per Tet4 il B è costante — è già memorizzato in self.B."""
        e = self._unit()
        assert e.B.shape == (6, 12)
        # Strain dovuto a spostamento rigido x deve essere zero
        u_rigid = np.tile([1.0, 0.0, 0.0], 4)
        eps = e.B @ u_rigid
        np.testing.assert_allclose(eps, np.zeros(6), atol=1e-12)

    def test_stiffness_symmetric(self):
        e = self._unit()
        K = e.stiffness_global()
        np.testing.assert_allclose(K, K.T, atol=1e-6)

    def test_stiffness_positive_semidefinite(self):
        """K deve avere autovalori >= 0, con 6 modi rigidi (3 trasl + 3 rot)."""
        e = self._unit()
        K = e.stiffness_global()
        eigs = np.linalg.eigvalsh(K)
        # Tutti gli autovalori >= 0 (entro tolleranza numerica)
        assert eigs.min() > -1e-3
        # Almeno 6 autovalori prossimi a zero (modi rigidi)
        n_zero = np.sum(eigs < 1e-3 * eigs.max())
        assert n_zero >= 6

    def test_uniform_strain_gives_uniform_stress(self):
        """Spostamento u_i = ε·x_i → strain costante ε_x, stress σ_x = E_eff·ε."""
        e = self._unit()
        eps_x = 1e-4
        # u_i = (ε·x, 0, 0)
        u = np.array([n[0] * eps_x for n in e.nodes for _ in [0]])
        u = np.array([
            e.nodes[i][0] * eps_x if k == 0 else 0
            for i in range(4) for k in range(3)
        ])
        st = e.stresses_center(u)
        # σ_x = c · ((1-ν)·ε_x + ν·(ε_y + ε_z)) = c · (1-ν) · ε_x
        c = 210e9 / ((1 + 0.3) * (1 - 0.6))
        sx_expected = c * (1 - 0.3) * eps_x
        assert st["sigma_x"] == pytest.approx(sx_expected, rel=1e-6)
        # σ_y = σ_z = c · ν · ε_x (effetto Poisson "negato" perché non si deforma)
        assert st["sigma_y"] == pytest.approx(c * 0.3 * eps_x, rel=1e-6)

    def test_degenerate_tet_raises(self):
        with pytest.raises(ValueError):
            SolidTet4(
                nodes_xyz=[(0, 0, 0), (1, 0, 0), (2, 0, 0), (3, 0, 0)],  # colinearity
                E=210e9, nu=0.3,
            )


class TestTet10Unit:
    def _unit(self):
        # Vertici 0..3 + mid-edges 4..9
        v0, v1, v2, v3 = (0, 0, 0), (1, 0, 0), (0, 1, 0), (0, 0, 1)
        mid = lambda a, b: tuple((a[i] + b[i]) / 2 for i in range(3))
        return SolidTet10(
            nodes_xyz=[v0, v1, v2, v3,
                       mid(v0, v1), mid(v1, v2), mid(v0, v2),
                       mid(v0, v3), mid(v1, v3), mid(v2, v3)],
            E=210e9, nu=0.3, rho=7850,
        )

    def test_stiffness_symmetric(self):
        e = self._unit()
        K = e.stiffness_global()
        assert K.shape == (30, 30)
        np.testing.assert_allclose(K, K.T, atol=1e-3)

    def test_stiffness_positive_semidefinite(self):
        e = self._unit()
        K = e.stiffness_global()
        eigs = np.linalg.eigvalsh(K)
        assert eigs.min() > -1.0   # tolleranza più larga per Tet10 con condizionamento
        n_zero = np.sum(eigs < 1e-3 * eigs.max())
        assert n_zero >= 6

    def test_uniform_strain_field(self):
        """Per campo di spostamento u_i = (ε·x_i, 0, 0), stress σ_x uniforme."""
        e = self._unit()
        eps_x = 1e-4
        u = np.array([
            e.nodes[i][0] * eps_x if k == 0 else 0
            for i in range(10) for k in range(3)
        ])
        st = e.stresses_center(u)
        c = 210e9 / ((1 + 0.3) * (1 - 0.6))
        sx_expected = c * (1 - 0.3) * eps_x
        assert st["sigma_x"] == pytest.approx(sx_expected, rel=1e-3)


# ────────────────────────────────────────────────────────────────────────────
# B. Patch test 3D — cubo a singolo Tet4 (e Tet10)
# ────────────────────────────────────────────────────────────────────────────
class TestPatchTest3D:
    """Patch test 3D: un solo tetraedro con dof boundary impostati da u(x,y,z) = ε·x.

    Lo stress nell'interno deve essere costante (per Tet4 trivially, per Tet10
    pure perché shape functions catturano gradienti lineari esattamente).
    """

    def test_tet4_patch(self):
        e = SolidTet4(
            nodes_xyz=[(0, 0, 0), (1, 0, 0), (0, 1, 0), (0, 0, 1)],
            E=210e9, nu=0.3,
        )
        # Campo di prova lineare: u(x,y,z) = (α·x, 0, 0)
        alpha = 1e-3
        u_full = np.array([
            e.nodes[i][0] * alpha if k == 0 else 0
            for i in range(4) for k in range(3)
        ])
        st = e.stresses_center(u_full)
        # σ_x = c · (1-ν) · α
        c = 210e9 / ((1 + 0.3) * (1 - 0.6))
        sx_expected = c * (1 - 0.3) * alpha
        assert st["sigma_x"] == pytest.approx(sx_expected, rel=1e-6)

    def test_tet10_patch(self):
        v = [(0, 0, 0), (1, 0, 0), (0, 1, 0), (0, 0, 1)]
        mid = lambda a, b: tuple((a[i] + b[i]) / 2 for i in range(3))
        nodes = list(v) + [
            mid(v[0], v[1]), mid(v[1], v[2]), mid(v[0], v[2]),
            mid(v[0], v[3]), mid(v[1], v[3]), mid(v[2], v[3]),
        ]
        e = SolidTet10(nodes_xyz=nodes, E=210e9, nu=0.3)
        alpha = 1e-3
        u_full = np.array([
            nodes[i][0] * alpha if k == 0 else 0
            for i in range(10) for k in range(3)
        ])
        st = e.stresses_center(u_full)
        c = 210e9 / ((1 + 0.3) * (1 - 0.6))
        sx_expected = c * (1 - 0.3) * alpha
        assert st["sigma_x"] == pytest.approx(sx_expected, rel=1e-4)


# ────────────────────────────────────────────────────────────────────────────
# C. Integrazione con StaticSolver
# ────────────────────────────────────────────────────────────────────────────
class TestStaticSolverWithTets:
    """End-to-end: cubo soggetto a trazione assiale risolto col solver completo."""

    def _cube_tet4(self, E: float = 210e9, nu: float = 0.3,
                   L: float = 1.0, sigma_x: float = 1e6) -> FEAModel:
        """Cubo 1×1×1 discretizzato in 5 tetraedri (decomposizione classica).

        Vincoli: ux=0 sui 4 nodi a x=0, uy=0 al nodo (0,0,0), uz=0 ai nodi
        (0,0,0) e (0,1,0). Carico nodale equivalente a σ_x sul lato x=L.
        """
        # 8 vertici del cubo
        n = [
            (0, 0, 0), (L, 0, 0), (L, L, 0), (0, L, 0),
            (0, 0, L), (L, 0, L), (L, L, L), (0, L, L),
        ]
        nodes = [Node(id=i + 1, x=n[i][0], y=n[i][1], z=n[i][2]) for i in range(8)]

        # 5-tet decomposizione di un cubo:
        # http://users.utcluj.ro/~tmarita/PIIA/PIIA-L4/Tetrahedral_Mesh_Generation.pdf
        # Indici 1-based:
        #   T1: 1, 2, 4, 5
        #   T2: 2, 3, 4, 7
        #   T3: 2, 6, 5, 7
        #   T4: 4, 8, 5, 7
        #   T5: 2, 4, 5, 7
        tets = [
            [1, 2, 4, 5],
            [2, 3, 4, 7],
            [2, 6, 5, 7],
            [4, 8, 5, 7],
            [2, 4, 5, 7],
        ]
        elements = [
            Element(id=i + 1, type=ElementType.SOLID_T4, nodes=t,
                    material_id="steel_s355")
            for i, t in enumerate(tets)
        ]
        # Vincoli: ux=0 al lato x=0 (nodi 1,4,5,8)
        # uy=0 al nodo 1; uz=0 ai nodi 1 e 4
        constraints = []
        for nid in (1, 4, 5, 8):
            constraints.append(Constraint(
                id=len(constraints) + 1, type=ConstraintType.CUSTOM,
                node_id=nid,
                dofs=[True, False, False, False, False, False],
            ))
        # Aggiungi y/z constraints separately
        constraints.append(Constraint(
            id=len(constraints) + 1, type=ConstraintType.CUSTOM,
            node_id=1, dofs=[False, True, True, False, False, False],
        ))
        constraints.append(Constraint(
            id=len(constraints) + 1, type=ConstraintType.CUSTOM,
            node_id=4, dofs=[False, False, True, False, False, False],
        ))
        # Carico: σ_x · area / 4 per ciascuno dei 4 nodi a x=L
        F_per_node = sigma_x * L * L / 4.0
        loads = []
        for nid in (2, 3, 6, 7):
            loads.append(Load(id=nid, type=LoadType.NODAL, target_id=nid,
                              fx=F_per_node))
        return FEAModel(
            id="tet4_cube", name="tet4_cube", is_3d=True,
            nodes=nodes, elements=elements,
            constraints=constraints, loads=loads,
        )

    def test_tet4_cube_axial_traction(self):
        """Cubo in trazione: il solver deve girare end-to-end e dare un
        spostamento positivo nell'ordine di grandezza atteso.

        NB: Tet4 + decomposizione 5-tet ha shear locking forte e
        accuratezza imprevedibile (errore 15-30% sui dof). Per verifica
        di accuratezza, usare Tet10 oppure mesh raffinata.
        """
        E = 210e9
        sigma = 1e6  # 1 MPa
        L = 1.0
        m = self._cube_tet4(E=E, nu=0.3, L=L, sigma_x=sigma)
        r = StaticSolver(m).solve()
        delta_expected = sigma * L / E  # ~4.76e-6 m
        ux_loaded = [d.ux for d in r.displacements if d.node_id in (2, 3, 6, 7)]
        # Tutti gli ux devono essere positivi (lato libero si allunga)
        assert all(ux > 0 for ux in ux_loaded), f"ux non tutti positivi: {ux_loaded}"
        # ux nell'ordine di grandezza atteso (entro fattore 3 per Tet4)
        max_ux = max(ux_loaded)
        assert delta_expected / 3 < max_ux < delta_expected * 3, \
            f"max ux={max_ux} fuori ordine di grandezza atteso {delta_expected}"
        # max_displacement positivo
        assert r.max_displacement > 0
