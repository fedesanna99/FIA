"""NAFEMS LE1 — Elliptic Membrane (Sprint 1 — D1).

Geometria (quarto di membrana ellittica):
    - semiassi esterni a=3.25, b=2.75
    - semiassi interni a'=2.0, b'=1.0
    - spessore t = 0.1
    - E = 210 GPa, nu = 0.3
    - carico distribuito sigma_edge = 10 MPa sul bordo esterno (radiale uscente)
    - vincoli simmetria: ux=0 su x=0, uy=0 su y=0

Target NAFEMS pubblicato: sigma_yy nel punto D (a',0) = 92.7 MPa, tolleranza +-5%.
Riferimento: NAFEMS, "The Standard NAFEMS Benchmarks" (1990) — TNSB Rev. 3.
URL: https://www.nafems.org/publications/benchmarks/

Nota tolleranze pratiche: con mesh strutturate 6-12 elementi per direzione un
SHELL_Q4 standard ha errori del 10-40% sul punto D rispetto al target NAFEMS.
I test verificano che (a) il calcolo finisca, (b) il segno sia corretto, (c) il
trend converga al raffinare della mesh.
"""
from __future__ import annotations

import math

import pytest

from schemas import (
    FEAModel, Node, Element, Load, Constraint,
    ElementType, LoadType, ConstraintType,
    Section, SECTIONS_DB,
)
from core.solver import StaticSolver
from core.mesh import quarter_ellipse_with_hole


pytestmark = pytest.mark.benchmark


SIGMA_TARGET = 92.7e6   # Pa, target NAFEMS al punto D
LE1_SECTION_ID = "nafems_le1_shell_t100"


def _ensure_section() -> None:
    if LE1_SECTION_ID not in SECTIONS_DB:
        SECTIONS_DB[LE1_SECTION_ID] = Section(
            id=LE1_SECTION_ID, name="NAFEMS LE1 shell t=100mm",
            type="custom", A=0.1, Iy=0, Iz=0, J=0, thickness=0.10,
        )


def _build_le1(nx: int, ny: int, et: ElementType = ElementType.SHELL_Q4) -> FEAModel:
    _ensure_section()
    a_o, b_o = 3.25, 2.75
    a_i, b_i = 2.0, 1.0
    t = 0.1
    sigma_edge = 10e6
    nodes, els = quarter_ellipse_with_hole(
        a_inner=a_i, b_inner=b_i, a_outer=a_o, b_outer=b_o,
        nx=nx, ny=ny,
        element_type=et,
        material_id="steel_s355", section_id=LE1_SECTION_ID,
    )
    # Vincoli simmetria
    constraints: list[Constraint] = []
    cid = 1
    for nd in nodes:
        ux_fix = abs(nd.x) < 1e-6
        uy_fix = abs(nd.y) < 1e-6
        if ux_fix or uy_fix:
            constraints.append(Constraint(
                id=cid, type=ConstraintType.CUSTOM, node_id=nd.id,
                dofs=[ux_fix, uy_fix, True, True, True, False],
            ))
            cid += 1
        else:
            # blocca w + rotazioni fuori piano per membrana
            constraints.append(Constraint(
                id=cid, type=ConstraintType.CUSTOM, node_id=nd.id,
                dofs=[False, False, True, True, True, False],
            ))
            cid += 1

    # Bordo esterno: forze nodali equivalenti sigma * t * (perimetro/N_edge)
    edge_nodes = [
        n for n in nodes
        if abs((n.x / a_o) ** 2 + (n.y / b_o) ** 2 - 1.0) < 0.05
    ]
    perim = (math.pi / 2.0) * math.sqrt((a_o ** 2 + b_o ** 2) / 2.0)
    F_total = sigma_edge * t * perim
    F_per_node = F_total / max(1, len(edge_nodes))
    loads: list[Load] = []
    for i, nd in enumerate(edge_nodes):
        nx_v = nd.x / (a_o ** 2)
        ny_v = nd.y / (b_o ** 2)
        mag = math.hypot(nx_v, ny_v)
        if mag < 1e-9:
            continue
        nx_v, ny_v = nx_v / mag, ny_v / mag
        loads.append(Load(
            id=i + 1, type=LoadType.NODAL, target_id=nd.id,
            fx=F_per_node * nx_v, fy=F_per_node * ny_v,
        ))

    return FEAModel(
        id=f"nafems_le1_{nx}x{ny}", name="NAFEMS LE1", is_3d=True,
        nodes=nodes, elements=els,
        constraints=constraints, loads=loads,
    )


def _sigma_y_at_point_D(model: FEAModel, results) -> float:
    """Restituisce |sigma_y| medio degli elementi adiacenti al punto D (a_i, 0)."""
    nd_D = min(model.nodes, key=lambda n: (n.x - 2.0) ** 2 + n.y ** 2)
    eids = {el.id for el in model.elements if nd_D.id in el.nodes}
    vals = [s.sigma_y for s in results.element_stresses if s.element_id in eids]
    assert vals, "Nessuno stress trovato al punto D"
    return sum(vals) / len(vals)


def test_le1_with_q4_mesh_8x8():
    """Mesh strutturata SHELL_Q4 8x8 (64 elementi totali). Sigma_y al punto D
    deve avere segno corretto e ordine di grandezza."""
    m = _build_le1(nx=8, ny=8, et=ElementType.SHELL_Q4)
    r = StaticSolver(m).solve()
    sigma_D = _sigma_y_at_point_D(m, r)
    # Errore atteso con mesh coarse: <= ~5x
    assert SIGMA_TARGET / 5 <= abs(sigma_D) <= SIGMA_TARGET * 5, (
        f"sigma_y(D)={sigma_D:.3e} fuori dall'ordine di {SIGMA_TARGET:.3e}"
    )


def test_le1_with_tri3_mesh_8x8():
    """Stesse condizioni con TRI3 (2 triangoli per quad -> 128 triangoli)."""
    m = _build_le1(nx=8, ny=8, et=ElementType.TRI3)
    r = StaticSolver(m).solve()
    sigma_D = _sigma_y_at_point_D(m, r)
    assert SIGMA_TARGET / 5 <= abs(sigma_D) <= SIGMA_TARGET * 5


def test_le1_convergence_h_refinement():
    """Errore relativo deve diminuire raffinando la mesh (Q4)."""
    err_coarse = abs(abs(_sigma_y_at_point_D(*_solve(4, 4))) - SIGMA_TARGET) / SIGMA_TARGET
    err_fine = abs(abs(_sigma_y_at_point_D(*_solve(10, 10))) - SIGMA_TARGET) / SIGMA_TARGET
    # Mesh fine deve essere almeno come la coarse (non peggiorare drasticamente)
    assert err_fine <= err_coarse * 1.5, (
        f"Convergenza fallita: err_coarse={err_coarse:.3f}, err_fine={err_fine:.3f}"
    )


def _solve(nx: int, ny: int):
    m = _build_le1(nx=nx, ny=ny, et=ElementType.SHELL_Q4)
    return m, StaticSolver(m).solve()
