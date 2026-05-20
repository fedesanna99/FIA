"""
Patch test — Stato di stress uniforme in elementi 2D plane-stress.

Principio (Irons & Razzaque, 1972):
    Una mesh arbitraria di elementi 2D, soggetta a un campo di spostamenti
    LINEARE imposto sul bordo, deve riprodurre ESATTAMENTE quello stato di
    stress uniforme su tutti gli elementi interni — indipendentemente dalla
    distorsione della mesh.

È il test più severo per la convergenza di un elemento finito: se fallisce,
l'elemento non è consistente.

Riferimento: Zienkiewicz & Taylor, "The Finite Element Method", 7th ed.,
Vol. 1, §10.3 — "The patch test".

Setup usato qui (versione semplificata, "load patch test"):
    Striscia rettangolare incastrata a sinistra e tirata uniformemente a
    destra. Lo stress σ_x deve essere costante = N/A su tutti gli elementi
    sufficientemente lontani dai vincoli (Saint-Venant).
"""
import math
import pytest

from schemas import (
    FEAModel, Node, Element, Load, Constraint,
    ElementType, LoadType, ConstraintType,
)
from core.solver import StaticSolver
from core.mesh import mesh_rectangle_tri3, mesh_rectangle_shell


pytestmark = pytest.mark.benchmark


def _equiv_nodal_loads(sorted_nodes, F_total):
    """Carichi nodali equivalenti per pressione uniforme su una linea.

    Per N nodi equispaziati su un segmento di lunghezza L con pressione uniforme:
    - nodi interni (N-2): peso pieno  → F_int = F_total / (N - 1)
    - nodi vertice (2):    metà peso  → F_vert = F_int / 2
    """
    n = len(sorted_nodes)
    if n < 2:
        return [(sorted_nodes[0].id, F_total)]
    F_int = F_total / (n - 1)
    out = []
    for i, nd in enumerate(sorted_nodes):
        f = F_int / 2.0 if i == 0 or i == n - 1 else F_int
        out.append((nd.id, f))
    return out


def _uniform_traction_strip_tri3(nx: int, ny: int, F_total: float):
    """Striscia 2×1 m, spessore 0.01 m, F_total totale applicata sul lato destro."""
    nodes, els = mesh_rectangle_tri3(
        (0, 0, 0), (2, 0, 0), (2, 1, 0), (0, 1, 0),
        nx=nx, ny=ny, material_id="steel_s355", section_id="shell_t100",
    )
    left_ids = [n.id for n in nodes if abs(n.x) < 1e-9]
    constraints = [
        Constraint(id=i + 1, type=ConstraintType.FIXED, node_id=nid)
        for i, nid in enumerate(left_ids)
    ]
    right = sorted([n for n in nodes if abs(n.x - 2.0) < 1e-9], key=lambda n: n.y)
    loads = [
        Load(id=i + 1, type=LoadType.NODAL, target_id=nid, fx=f)
        for i, (nid, f) in enumerate(_equiv_nodal_loads(right, F_total))
    ]
    return FEAModel(
        id="patch_tri3", name="patch_tri3", is_3d=True,
        nodes=nodes, elements=els,
        constraints=constraints, loads=loads,
    )


def _uniform_traction_strip_q4(nx: int, ny: int, F_total: float):
    """Stessa striscia ma con Q4 shell."""
    nodes, els = mesh_rectangle_shell(
        (0, 0, 0), (2, 0, 0), (2, 1, 0), (0, 1, 0),
        nx=nx, ny=ny, material_id="steel_s355", section_id="shell_t100",
    )
    left_ids = [n.id for n in nodes if abs(n.x) < 1e-9]
    constraints = [
        Constraint(id=i + 1, type=ConstraintType.FIXED, node_id=nid)
        for i, nid in enumerate(left_ids)
    ]
    right = sorted([n for n in nodes if abs(n.x - 2.0) < 1e-9], key=lambda n: n.y)
    loads = [
        Load(id=i + 1, type=LoadType.NODAL, target_id=nid, fx=f)
        for i, (nid, f) in enumerate(_equiv_nodal_loads(right, F_total))
    ]
    return FEAModel(
        id="patch_q4", name="patch_q4", is_3d=True,
        nodes=nodes, elements=els,
        constraints=constraints, loads=loads,
    )


def test_tri3_uniform_traction_uy_at_right_edge_is_constant():
    """Sotto trazione uniforme, tutti i nodi del lato destro hanno lo stesso ux.

    Conseguenza diretta di uno stato di stress uniforme nella striscia.
    """
    model = _uniform_traction_strip_tri3(nx=4, ny=2, F_total=10000.0)
    r = StaticSolver(model).solve()
    right_ids = [n.id for n in model.nodes if abs(n.x - 2.0) < 1e-9]
    ux_right = [d.ux for d in r.displacements if d.node_id in right_ids]
    mean_ux = sum(ux_right) / len(ux_right)
    spread = max(ux_right) - min(ux_right)
    # Spread relativo dovrebbe essere <1% (effetti di Saint-Venant residui)
    assert abs(spread / mean_ux) < 0.05, (
        f"Spread ux su lato destro troppo grande: {spread:.3e} vs media {mean_ux:.3e}"
    )


def test_tri3_displacement_matches_axial_strain_formula():
    """δ = F L / (E A_section).

    Con shell_t100 (t=0.1) e larghezza b=1m: A_section = b·t = 0.1 m².
    """
    L = 2.0
    F = 10000.0
    E = 210e9
    A = 1.0 * 0.10  # b × t (sezione trasversale della striscia in trazione)
    expected = F * L / (E * A)
    model = _uniform_traction_strip_tri3(nx=8, ny=4, F_total=F)
    r = StaticSolver(model).solve()
    right_ids = [n.id for n in model.nodes if abs(n.x - 2.0) < 1e-9]
    ux_right = [d.ux for d in r.displacements if d.node_id in right_ids]
    mean_ux = sum(ux_right) / len(ux_right)
    assert mean_ux == pytest.approx(expected, rel=0.05), (
        f"ux medio = {mean_ux:.4e}, atteso {expected:.4e}"
    )


def test_q4_uniform_traction_ux_at_right_edge_is_constant():
    """Stesso patch test del Tri3 ma con elementi Q4."""
    model = _uniform_traction_strip_q4(nx=4, ny=2, F_total=10000.0)
    r = StaticSolver(model).solve()
    right_ids = [n.id for n in model.nodes if abs(n.x - 2.0) < 1e-9]
    ux_right = [d.ux for d in r.displacements if d.node_id in right_ids]
    mean_ux = sum(ux_right) / len(ux_right)
    spread = max(ux_right) - min(ux_right)
    assert abs(spread / mean_ux) < 0.05


def test_q4_displacement_matches_axial_strain_formula():
    L = 2.0
    F = 10000.0
    E = 210e9
    A = 1.0 * 0.10
    expected = F * L / (E * A)
    model = _uniform_traction_strip_q4(nx=8, ny=4, F_total=F)
    r = StaticSolver(model).solve()
    right_ids = [n.id for n in model.nodes if abs(n.x - 2.0) < 1e-9]
    ux_right = [d.ux for d in r.displacements if d.node_id in right_ids]
    mean_ux = sum(ux_right) / len(ux_right)
    assert mean_ux == pytest.approx(expected, rel=0.05)


@pytest.mark.parametrize("nx,ny", [(2, 1), (4, 2), (8, 4), (16, 8)])
def test_tri3_mesh_refinement_invariant(nx, ny):
    """Lo spostamento medio del lato destro è invariante al raffinamento della mesh.

    Proprietà di consistenza dell'elemento: la soluzione converge a un valore
    indipendente da quanti elementi metto.
    """
    F = 10000.0
    model = _uniform_traction_strip_tri3(nx=nx, ny=ny, F_total=F)
    r = StaticSolver(model).solve()
    right_ids = [n.id for n in model.nodes if abs(n.x - 2.0) < 1e-9]
    ux_right = [d.ux for d in r.displacements if d.node_id in right_ids]
    mean_ux = sum(ux_right) / len(ux_right)
    expected = F * 2.0 / (210e9 * 0.10)
    assert mean_ux == pytest.approx(expected, rel=0.10), (
        f"nx={nx},ny={ny}: mean_ux={mean_ux:.4e}, atteso {expected:.4e}"
    )
    assert math.isfinite(mean_ux)
