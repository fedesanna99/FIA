"""Test sul carico tipo pressure su shell."""
import pytest

from schemas import FEAModel, Node, Element, Load, Constraint, ElementType, LoadType, ConstraintType
from core.mesh import mesh_rectangle_shell
from core.solver import StaticSolver


def test_pressure_shell_produces_displacement():
    """Piastra Q4 incastrata: pressione uniforme verso il basso → spostamento z negativo."""
    nodes, els = mesh_rectangle_shell(
        (0, 0, 0), (2, 0, 0), (2, 2, 0), (0, 2, 0),
        nx=4, ny=4, material_id="steel_s355", section_id="shell_t100",
    )
    nx = 4
    constraints: list[Constraint] = []
    cid = 1
    for j in range(nx + 1):
        for i in range(nx + 1):
            if i == 0 or i == nx or j == 0 or j == nx:
                nid = j * (nx + 1) + i + 1
                constraints.append(Constraint(id=cid, type=ConstraintType.FIXED, node_id=nid))
                cid += 1
    loads: list[Load] = []
    lid = 1
    for el in els:
        loads.append(Load(id=lid, type=LoadType.PRESSURE, target_id=el.id, pressure=10000.0))
        lid += 1
    model = FEAModel(id="pshell", name="pshell", is_3d=True,
                     nodes=nodes, elements=els, constraints=constraints, loads=loads)
    r = StaticSolver(model).solve()
    center_id = 2 * (nx + 1) + 2 + 1
    center = next(d for d in r.displacements if d.node_id == center_id)
    assert center.uz < 0, f"Pressione +Z applicata come −normal → centro deve scendere (uz<0). uz={center.uz}"
    assert r.max_displacement > 0


def test_pressure_shell_balance():
    """Pressione uniforme su mesh shell incastrata: |ΣFz| reazioni ≈ p · A_tot."""
    nodes, els = mesh_rectangle_shell(
        (0, 0, 0), (1, 0, 0), (1, 1, 0), (0, 1, 0),
        nx=4, ny=4, material_id="steel_s355", section_id="shell_t100",
    )
    nx = 4
    constraints: list[Constraint] = []
    cid = 1
    for j in range(nx + 1):
        for i in range(nx + 1):
            if i == 0 or i == nx or j == 0 or j == nx:
                nid = j * (nx + 1) + i + 1
                constraints.append(Constraint(id=cid, type=ConstraintType.FIXED, node_id=nid))
                cid += 1
    p_value = 5000.0
    loads = [Load(id=i + 1, type=LoadType.PRESSURE, target_id=el.id, pressure=p_value)
             for i, el in enumerate(els)]
    model = FEAModel(id="pshellbal", name="pshellbal", is_3d=True,
                     nodes=nodes, elements=els, constraints=constraints, loads=loads)
    r = StaticSolver(model).solve()
    expected = p_value * 1.0 * 1.0
    total_rz = sum(rx.fz for rx in r.reactions)
    assert abs(total_rz) == pytest.approx(expected, rel=0.10), (
        f"ΣRz = {total_rz}, atteso ±{expected}"
    )
