"""Test sul carico termico ΔT."""
import math
import pytest

from schemas import FEAModel, Node, Element, Load, Constraint, ElementType, LoadType, ConstraintType, MATERIALS_DB, SECTIONS_DB
from core.solver import StaticSolver


def test_thermal_free_expansion_truss():
    """Asta libera di espandersi: ΔL = α · L · ΔT.

    Vincoliamo solo un'estremità in tutte le direzioni; l'altra è libera ↔ X.
    """
    L = 2.0
    dT = 50.0
    mat = MATERIALS_DB["steel_s355"]
    expected_dx = mat.alpha_t * L * dT
    model = FEAModel(
        id="t", name="t", is_3d=True,
        nodes=[
            Node(id=1, x=0, y=0, z=0),
            Node(id=2, x=L, y=0, z=0),
        ],
        elements=[Element(id=1, type=ElementType.TRUSS3D, nodes=[1, 2],
                          material_id="steel_s355", section_id="circ_100")],
        constraints=[
            Constraint(id=1, type=ConstraintType.FIXED, node_id=1),
            Constraint(id=2, type=ConstraintType.CUSTOM, node_id=2,
                       dofs=[False, True, True, True, True, True]),
        ],
        loads=[Load(id=1, type=LoadType.TEMPERATURE, target_id=1, delta_t=dT)],
    )
    r = StaticSolver(model).solve()
    n2 = next(d for d in r.displacements if d.node_id == 2)
    assert n2.ux == pytest.approx(expected_dx, rel=0.05), (
        f"u expected {expected_dx:.6e}, got {n2.ux:.6e}"
    )


def test_thermal_constrained_truss_produces_reaction():
    """Asta bi-incastrata sottoposta a ΔT: forza assiale N = -E·A·α·ΔT (compressione)."""
    L = 2.0
    dT = 30.0
    mat = MATERIALS_DB["steel_s355"]
    sec = SECTIONS_DB["circ_100"]
    N_expected = mat.E * sec.A * mat.alpha_t * dT
    model = FEAModel(
        id="t2", name="t2", is_3d=False,
        nodes=[Node(id=1, x=0, y=0, z=0), Node(id=2, x=L, y=0, z=0)],
        elements=[Element(id=1, type=ElementType.TRUSS2D, nodes=[1, 2],
                          material_id="steel_s355", section_id="circ_100")],
        constraints=[
            Constraint(id=1, type=ConstraintType.FIXED, node_id=1),
            Constraint(id=2, type=ConstraintType.FIXED, node_id=2),
        ],
        loads=[Load(id=1, type=LoadType.TEMPERATURE, target_id=1, delta_t=dT)],
    )
    r = StaticSolver(model).solve()
    rx = next(rr for rr in r.reactions if rr.node_id == 2)
    assert abs(rx.fx) == pytest.approx(N_expected, rel=0.05)


def test_thermal_no_effect_on_shell_or_t3():
    """Per ora il carico termico è gestito solo per beam/truss."""
    nodes = [
        Node(id=1, x=0, y=0, z=0),
        Node(id=2, x=1, y=0, z=0),
        Node(id=3, x=0, y=1, z=0),
    ]
    elements = [Element(id=1, type=ElementType.TRI3, nodes=[1, 2, 3],
                        material_id="steel_s355", section_id="shell_t100")]
    constraints = [
        Constraint(id=1, type=ConstraintType.FIXED, node_id=1),
        Constraint(id=2, type=ConstraintType.FIXED, node_id=2),
        Constraint(id=3, type=ConstraintType.FIXED, node_id=3),
    ]
    loads = [Load(id=1, type=LoadType.TEMPERATURE, target_id=1, delta_t=100.0)]
    model = FEAModel(id="t3", name="t3", is_3d=True,
                     nodes=nodes, elements=elements, constraints=constraints, loads=loads)
    r = StaticSolver(model).solve()
    assert r.max_displacement == pytest.approx(0.0, abs=1e-9)
