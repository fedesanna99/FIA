"""
Test per UnilateralSolver — molle solo-compressione (active-set).

Caso d'uso: trave/fondazione su terreno che non resiste a trazione.
Quando una parte si solleva, il terreno "si stacca" e perde rigidezza.
"""
import pytest

from schemas import (
    FEAModel, Node, Element, Load, Constraint,
    ElementType, LoadType, ConstraintType,
)
from core.solver import UnilateralSolver, StaticSolver


def _cantilever_on_springs(
    L: float, n: int, k_spring: float,
    distributed_qy: float = 0.0,
    tip_fy: float = 0.0,
) -> FEAModel:
    """Cantilever incastrato a sinistra + molle in y solo-compressione sui nodi 2..n+1.

    Args:
        L              : lunghezza [m]
        n              : numero di elementi (n+1 nodi)
        k_spring       : rigidezza di ogni molla [N/m]
        distributed_qy : carico distribuito uniforme [N/m] (negativo = downward)
        tip_fy         : carico concentrato all'estremo libero [N] (positivo = up)
    """
    nodes = [Node(id=i + 1, x=L * i / n, y=0, z=0) for i in range(n + 1)]
    elements = [
        Element(id=i + 1, type=ElementType.BEAM2D, nodes=[i + 1, i + 2],
                material_id="steel_s355", section_id="ipe_300")
        for i in range(n)
    ]
    constraints = [Constraint(id=1, type=ConstraintType.FIXED, node_id=1)]
    for i in range(2, n + 2):
        constraints.append(Constraint(
            id=i, type=ConstraintType.SPRING, node_id=i,
            spring_k=[0, k_spring, 0, 0, 0, 0],
            compression_only=True,
        ))
    loads = []
    if distributed_qy != 0:
        loads.extend([
            Load(id=i + 1, type=LoadType.DISTRIBUTED, target_id=i + 1,
                 qy=distributed_qy)
            for i in range(n)
        ])
    if tip_fy != 0:
        loads.append(Load(id=100, type=LoadType.NODAL,
                          target_id=n + 1, fy=tip_fy))
    return FEAModel(
        id="u", name="u", is_3d=False,
        nodes=nodes, elements=elements,
        constraints=constraints, loads=loads,
    )


class TestUnilateralCompression:
    """Tutte le molle in compressione → nessuna staccata, 1 iterazione."""
    def test_all_springs_compressed(self):
        m = _cantilever_on_springs(L=4, n=4, k_spring=1e6,
                                    distributed_qy=-1000.0)
        r = UnilateralSolver(m).solve()
        assert r.converged
        assert r.detached_springs == []
        assert r.n_iterations == 1
        # tutti gli spostamenti uy ≤ 0 (compressione)
        for d in r.static.displacements:
            assert d.uy <= 1e-9

    def test_no_unilateral_returns_static_directly(self):
        """Senza molle unilaterali, il solver si riduce a StaticSolver in 1 iter."""
        # Cantilever puro senza molle
        L = 3.0; P = -1000.0; n = 5
        nodes = [Node(id=i + 1, x=L * i / n, y=0, z=0) for i in range(n + 1)]
        elements = [
            Element(id=i + 1, type=ElementType.BEAM2D, nodes=[i + 1, i + 2],
                    material_id="steel_s355", section_id="ipe_300")
            for i in range(n)
        ]
        constraints = [Constraint(id=1, type=ConstraintType.FIXED, node_id=1)]
        loads = [Load(id=1, type=LoadType.NODAL, target_id=n + 1, fy=P)]
        m = FEAModel(id="np", name="np", is_3d=False,
                      nodes=nodes, elements=elements,
                      constraints=constraints, loads=loads)
        r = UnilateralSolver(m).solve()
        assert r.converged
        assert r.n_iterations == 1
        assert r.detached_springs == []


class TestUnilateralUplift:
    """Carico tale che alcune molle si sollevano."""
    def test_full_uplift_detaches_all_springs(self):
        """Carico totalmente upward → tutte le molle si staccano."""
        m = _cantilever_on_springs(L=4, n=4, k_spring=1e6,
                                    distributed_qy=+1000.0)
        r = UnilateralSolver(m).solve()
        assert r.converged
        # Tutte e 4 le molle (ai nodi 2..5) staccate
        assert sorted(r.detached_springs) == [2, 3, 4, 5]
        # Spostamenti uy > 0
        for d in r.static.displacements:
            if d.node_id > 1:  # nodo 1 incastrato
                assert d.uy > 0

    def test_partial_uplift_detaches_only_uplifted_nodes(self):
        """Carico misto: estremo si solleva, base resta in compressione."""
        m = _cantilever_on_springs(L=4, n=4, k_spring=1e6,
                                    distributed_qy=-3000.0,
                                    tip_fy=+5000.0)
        r = UnilateralSolver(m).solve()
        assert r.converged
        # Solo le molle dei nodi sollevati staccate
        assert 4 in r.detached_springs or 5 in r.detached_springs
        # E quelle vicino all'incastro restano attive
        assert 2 not in r.detached_springs

    def test_active_set_corresponds_to_uplift(self):
        """Una molla è 'staccata' iff il nodo corrispondente ha uy > 0."""
        m = _cantilever_on_springs(L=4, n=4, k_spring=1e6,
                                    distributed_qy=-3000.0,
                                    tip_fy=+5000.0)
        r = UnilateralSolver(m).solve()
        disp_by_id = {d.node_id: d.uy for d in r.static.displacements}
        for c in m.constraints:
            if c.type == ConstraintType.SPRING and c.compression_only:
                uy = disp_by_id[c.node_id]
                is_detached = c.id in r.detached_springs
                if is_detached:
                    assert uy > -1e-9, (
                        f"molla {c.id} staccata ma uy={uy*1000:.4f}mm (dovrebbe essere ≥0)"
                    )
                else:
                    assert uy < 1e-9, (
                        f"molla {c.id} attiva ma uy={uy*1000:.4f}mm (dovrebbe essere ≤0)"
                    )


class TestUnilateralConvergence:
    def test_convergence_in_few_iterations(self):
        """Per problemi piccoli ben posti: ≤ 5 iterazioni."""
        m = _cantilever_on_springs(L=4, n=4, k_spring=1e6,
                                    distributed_qy=-2000.0, tip_fy=+3000.0)
        r = UnilateralSolver(m).solve()
        assert r.converged
        assert r.n_iterations <= 5

    def test_max_iterations_enforced(self):
        """Limite max_iterations rispettato (anche se non converge)."""
        m = _cantilever_on_springs(L=4, n=4, k_spring=1e6,
                                    distributed_qy=-1000.0)
        r = UnilateralSolver(m, max_iterations=3).solve()
        assert r.n_iterations <= 3


class TestUnilateralComparison:
    """Confronto: con molle bilaterali (compression_only=False) la freccia
    sotto carico uplifting è ridotta (molle resistono); con unilaterali è
    libera di sollevarsi."""

    def test_bilateral_vs_unilateral_under_uplift(self):
        # Bilaterale: solverà con tutte le molle attive sempre
        m_bil = _cantilever_on_springs(L=4, n=4, k_spring=1e6,
                                         distributed_qy=+1000.0)
        for c in m_bil.constraints:
            if c.type == ConstraintType.SPRING:
                c.compression_only = False
        r_bil = StaticSolver(m_bil).solve()

        # Unilaterale: le molle si staccano sotto trazione
        m_uni = _cantilever_on_springs(L=4, n=4, k_spring=1e6,
                                         distributed_qy=+1000.0)
        r_uni = UnilateralSolver(m_uni).solve()

        # Per uplift, l'unilaterale ha freccia maggiore (no resistenza)
        last_id = 5
        uy_bil = next(d.uy for d in r_bil.displacements if d.node_id == last_id)
        uy_uni = next(d.uy for d in r_uni.static.displacements if d.node_id == last_id)
        assert uy_uni > uy_bil
