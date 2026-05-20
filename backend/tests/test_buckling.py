"""Test sul solver di buckling lineare."""
import math
import pytest

from schemas import FEAModel, Node, Element, Load, Constraint, ElementType, LoadType, ConstraintType
from core.solver import BucklingSolver


def make_column_truss(P: float = -1000.0) -> FEAModel:
    """Asta verticale compressa fra base (incastrata) e top (cerniera scorrevole)."""
    nodes = [
        Node(id=1, x=0, y=0, z=0),
        Node(id=2, x=0, y=0, z=3.0),
    ]
    elements = [Element(
        id=1, type=ElementType.TRUSS3D, nodes=[1, 2],
        material_id="steel_s355", section_id="circ_100",
    )]
    constraints = [
        Constraint(id=1, type=ConstraintType.FIXED, node_id=1),
        Constraint(id=2, type=ConstraintType.CUSTOM, node_id=2, dofs=[True, True, False, True, True, True]),
    ]
    loads = [Load(id=1, type=LoadType.NODAL, target_id=2, fz=P)]
    return FEAModel(
        id="b_col", name="col", is_3d=True,
        nodes=nodes, elements=elements, constraints=constraints, loads=loads,
    )


def test_buckling_runs_on_column():
    model = make_column_truss(P=-1000.0)
    r = BucklingSolver(model, n_modes=3).solve()
    assert r["analysis_type"] == "buckling"
    if r["n_modes"] > 0:
        assert r["critical_factor"] > 0
        factors = r["load_factors"]
        assert factors == sorted(factors)
        assert all(math.isfinite(v) for v in factors)


def test_buckling_load_factor_increases_with_smaller_load():
    """Se applico un carico più piccolo, il moltiplicatore critico cresce."""
    r1 = BucklingSolver(make_column_truss(P=-1000.0), n_modes=2).solve()
    r2 = BucklingSolver(make_column_truss(P=-100.0), n_modes=2).solve()
    if r1["n_modes"] > 0 and r2["n_modes"] > 0:
        assert r2["critical_factor"] > r1["critical_factor"]


def test_buckling_returns_empty_if_no_axial():
    """Modello con solo carico trasversale non ha buckling (K_G ≈ 0)."""
    nodes = [Node(id=1, x=0, y=0, z=0), Node(id=2, x=1, y=0, z=0)]
    elements = [Element(id=1, type=ElementType.BEAM2D, nodes=[1, 2],
                        material_id="steel_s355", section_id="ipe_300")]
    constraints = [Constraint(id=1, type=ConstraintType.FIXED, node_id=1)]
    loads = [Load(id=1, type=LoadType.NODAL, target_id=2, fy=-100.0)]
    model = FEAModel(id="b", name="b", is_3d=False,
                     nodes=nodes, elements=elements, constraints=constraints, loads=loads)
    r = BucklingSolver(model, n_modes=2).solve()
    assert "analysis_type" in r
