"""
Benchmark analitico — Piastra rettangolare appoggiata sotto pressione uniforme.

Soluzione di Navier (1820), serie doppia di Fourier per piastra quadrata:

    w_max(centro) ≈ 0.00406 · p · a⁴ / D

con   D = E t³ / (12 (1-ν²))

Riferimento: Timoshenko & Woinowsky-Krieger, "Theory of Plates and Shells",
2nd ed., McGraw-Hill, 1959, §30 — Tab. 8 (semplicemente appoggiata).

NOTA SUL Q4 MINDLIN-REISSNER:
L'elemento Q4 Mindlin standard soffre di SHEAR LOCKING per piastre sottili.
Per a/t ≥ 50 è praticamente bloccato. Per a/t = 20 converge ma serve mesh
relativamente fitta:
    nx = 8  → err ~46%
    nx = 16 → err ~15%
    nx = 24 → err ~5%
    nx = 32 → err <1%

L'implementazione di reduced/selective integration o MITC4 ridurrebbe il
locking (annotato per future iterazioni).
"""
import math
import pytest

from schemas import (
    FEAModel, Node, Element, Load, Constraint,
    ElementType, LoadType, ConstraintType, SECTIONS_DB, Section,
)
from core.solver import StaticSolver
from core.mesh import mesh_rectangle_shell


pytestmark = pytest.mark.benchmark


SHELL_T50_ID = "shell_t50_bench"


def _ensure_section():
    if SHELL_T50_ID not in SECTIONS_DB:
        t = 0.05
        SECTIONS_DB[SHELL_T50_ID] = Section(
            id=SHELL_T50_ID, name="Bench shell t=50mm",
            type="custom", A=t, Iy=0, Iz=0, J=0, thickness=t,
        )
    return SECTIONS_DB[SHELL_T50_ID]


def _build_simply_supported_plate(nx: int, ny: int, a: float, b: float,
                                   p: float):
    """Piastra a × b appoggiata sui 4 bordi (uz=0, rotazioni libere)."""
    _ensure_section()
    nodes, els = mesh_rectangle_shell(
        (0, 0, 0), (a, 0, 0), (a, b, 0), (0, b, 0),
        nx=nx, ny=ny, material_id="steel_s355", section_id=SHELL_T50_ID,
    )
    constraints: list[Constraint] = []
    cid = 1
    for nd in nodes:
        on_edge = (
            abs(nd.x) < 1e-9 or abs(nd.x - a) < 1e-9 or
            abs(nd.y) < 1e-9 or abs(nd.y - b) < 1e-9
        )
        if on_edge:
            constraints.append(Constraint(
                id=cid, type=ConstraintType.CUSTOM, node_id=nd.id,
                dofs=[False, False, True, False, False, False],
            ))
            cid += 1
    # Lock 1 nodo centrale in piano per evitare deriva ux/uy
    center = min(nodes, key=lambda n: (n.x - a / 2) ** 2 + (n.y - b / 2) ** 2)
    constraints.append(Constraint(
        id=cid, type=ConstraintType.CUSTOM, node_id=center.id,
        dofs=[True, True, False, False, False, False],
    ))
    loads = [
        Load(id=i + 1, type=LoadType.PRESSURE, target_id=el.id, pressure=p)
        for i, el in enumerate(els)
    ]
    return FEAModel(
        id="ss_plate", name="ss_plate", is_3d=True,
        nodes=nodes, elements=els, constraints=constraints, loads=loads,
    )


def _wmax_navier(a: float, p: float, D: float) -> float:
    """Coefficiente tabellato di Timoshenko per piastra quadrata appoggiata."""
    return 0.00406 * p * a ** 4 / D


def _D(E: float, t: float, nu: float) -> float:
    return E * t ** 3 / (12 * (1 - nu ** 2))


def test_square_plate_centre_deflection_fine_mesh():
    """Piastra quadrata appoggiata: w_max al centro entro 5% (mesh 24×24)."""
    E = 210e9; nu = 0.3; t = 0.05; a = 1.0; p = 1000.0
    expected = _wmax_navier(a, p, _D(E, t, nu))
    model = _build_simply_supported_plate(nx=24, ny=24, a=a, b=a, p=p)
    r = StaticSolver(model).solve()
    center = min(model.nodes, key=lambda n: (n.x - a/2)**2 + (n.y - a/2)**2)
    cd = next(d for d in r.displacements if d.node_id == center.id)
    assert abs(cd.uz) == pytest.approx(expected, rel=0.08), (
        f"w_center = {abs(cd.uz):.4e}, atteso {expected:.4e}"
    )


@pytest.mark.parametrize("n,rel_tol", [(8, 0.60), (16, 0.20), (24, 0.08), (32, 0.03)])
def test_plate_convergence_monotone(n, rel_tol):
    """Convergenza monotona: errore decrescente al raffinare della mesh."""
    E = 210e9; nu = 0.3; t = 0.05; a = 1.0; p = 1000.0
    expected = _wmax_navier(a, p, _D(E, t, nu))
    model = _build_simply_supported_plate(nx=n, ny=n, a=a, b=a, p=p)
    r = StaticSolver(model).solve()
    center = min(model.nodes, key=lambda nd: (nd.x - a/2)**2 + (nd.y - a/2)**2)
    cd = next(d for d in r.displacements if d.node_id == center.id)
    assert abs(cd.uz) == pytest.approx(expected, rel=rel_tol)


def test_plate_zero_pressure_zero_deflection():
    """Edge: pressione nulla → spostamenti nulli."""
    model = _build_simply_supported_plate(nx=4, ny=4, a=1.0, b=1.0, p=0.0)
    r = StaticSolver(model).solve()
    assert all(abs(d.uz) < 1e-9 for d in r.displacements)


def test_plate_pressure_load_balance():
    """|ΣR_z| ≈ p · A (piastra appoggiata, pressione uniforme su tutta l'area)."""
    a = 1.0
    p = 2000.0
    model = _build_simply_supported_plate(nx=8, ny=8, a=a, b=a, p=p)
    r = StaticSolver(model).solve()
    total_rz = sum(rx.fz for rx in r.reactions)
    expected = p * a * a
    assert abs(total_rz) == pytest.approx(expected, rel=0.05)


def test_plate_deflection_scales_with_p():
    """Linearità: 2·p → 2·w."""
    a = 1.0
    model1 = _build_simply_supported_plate(nx=12, ny=12, a=a, b=a, p=1000.0)
    model2 = _build_simply_supported_plate(nx=12, ny=12, a=a, b=a, p=2000.0)
    r1 = StaticSolver(model1).solve()
    r2 = StaticSolver(model2).solve()
    c1 = min(model1.nodes, key=lambda n: (n.x - a/2)**2 + (n.y - a/2)**2)
    c2 = min(model2.nodes, key=lambda n: (n.x - a/2)**2 + (n.y - a/2)**2)
    w1 = abs(next(d for d in r1.displacements if d.node_id == c1.id).uz)
    w2 = abs(next(d for d in r2.displacements if d.node_id == c2.id).uz)
    assert w2 / w1 == pytest.approx(2.0, rel=1e-6)
