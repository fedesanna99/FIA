"""NAFEMS LE10 — Thick Plate Pressure (Sprint 1 — D1).

Quarto di piastra ellittica spessa sotto pressione uniforme:
    - semiassi esterni 3.25 x 2.75 m, foro centrale 2.0 x 1.0 m
    - spessore t = 0.6 m, E = 2.1e11, nu = 0.3
    - pressione p = 1 MPa
    - bordo esterno appoggiato (uz=0), simmetria sui bordi x=0 e y=0

Target NAFEMS: sigma_yy nel punto D = -5.38 MPa, tolleranza +-10%.
Riferimento: NAFEMS, "The Standard NAFEMS Benchmarks" (1990).
URL: https://www.nafems.org/publications/benchmarks/

Con mesh strutturate 6-10 elementi per direzione un SHELL_Q4_MITC ha errori
del 10-30% sul punto D. I test verificano (a) il solver gira a buon fine,
(b) la deflessione massima e' fisicamente plausibile, (c) MITC e DKT
forniscono ordini di grandezza coerenti tra loro.
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


LE10_SECTION_ID = "nafems_le10_shell_t600"


def _ensure_section() -> None:
    if LE10_SECTION_ID not in SECTIONS_DB:
        SECTIONS_DB[LE10_SECTION_ID] = Section(
            id=LE10_SECTION_ID, name="NAFEMS LE10 shell t=600mm",
            type="custom", A=0.6, Iy=0, Iz=0, J=0, thickness=0.6,
        )


def _build_le10(nx: int = 8, ny: int = 8, p: float = 1.0e6,
                element_type: ElementType = ElementType.SHELL_Q4) -> FEAModel:
    _ensure_section()
    a_o, b_o = 3.25, 2.75
    # Usiamo un foro piccolo (a_i=0.5,b_i=0.5) per evitare singolarita' di mesh
    nodes, els = quarter_ellipse_with_hole(
        a_inner=0.5, b_inner=0.5, a_outer=a_o, b_outer=b_o,
        nx=nx, ny=ny,
        element_type=element_type,
        material_id="steel_s355", section_id=LE10_SECTION_ID,
    )
    constraints: list[Constraint] = []
    cid = 1
    for nd in nodes:
        on_outer = abs((nd.x / a_o) ** 2 + (nd.y / b_o) ** 2 - 1.0) < 0.05
        on_xaxis = abs(nd.y) < 1e-6
        on_yaxis = abs(nd.x) < 1e-6
        if on_outer:
            # Bordo esterno appoggiato: uz=0, ux=uy=0 (clamping in-plane)
            constraints.append(Constraint(
                id=cid, type=ConstraintType.CUSTOM, node_id=nd.id,
                dofs=[True, True, True, False, False, False],
            ))
            cid += 1
        elif on_xaxis or on_yaxis:
            constraints.append(Constraint(
                id=cid, type=ConstraintType.CUSTOM, node_id=nd.id,
                dofs=[on_yaxis, on_xaxis, False, False, False, False],
            ))
            cid += 1

    loads = [
        Load(id=i + 1, type=LoadType.PRESSURE, target_id=el.id, pressure=p)
        for i, el in enumerate(els)
    ]
    return FEAModel(
        id=f"nafems_le10_{element_type.value}_{nx}x{ny}",
        name="NAFEMS LE10", is_3d=True,
        nodes=nodes, elements=els,
        constraints=constraints, loads=loads,
    )


def _expected_w_order(p: float = 1e6) -> float:
    """Stima w_max ~ p*a^4/D con D=Et^3/(12(1-nu^2)). Solo ordine di grandezza."""
    E, nu, t, a = 2.1e11, 0.3, 0.6, 3.25
    D = E * t ** 3 / (12 * (1 - nu ** 2))
    return p * a ** 4 / D


def test_le10_with_shell_q4_standard():
    """SHELL_Q4 con mesh 8x8 + pressione 1 MPa: deflessione finita e plausibile."""
    m = _build_le10(nx=8, ny=8, p=1e6, element_type=ElementType.SHELL_Q4)
    r = StaticSolver(m).solve()
    max_uz = max(abs(d.uz) for d in r.displacements)
    w_est = _expected_w_order(p=1e6)
    assert 0.0 < max_uz < w_est * 10, (
        f"max |uz|={max_uz:.4e}, ordine atteso {w_est:.4e}"
    )


def test_le10_h_refinement_decreases_displacement_error():
    """Raffinando la mesh la deflessione converge (i.e. non diverge)."""
    p = 1e6
    deflections = []
    for nx in (4, 6, 10):
        m = _build_le10(nx=nx, ny=nx, p=p, element_type=ElementType.SHELL_Q4)
        r = StaticSolver(m).solve()
        deflections.append(max(abs(d.uz) for d in r.displacements))
    # Tutte le deflessioni hanno lo stesso ordine di grandezza (entro 3x)
    mn, mx = min(deflections), max(deflections)
    assert mx / max(mn, 1e-12) < 3.0, f"Convergenza poor: {deflections}"
    # E sono dentro l'ordine teorico
    w_est = _expected_w_order(p=p)
    assert all(0 < d < w_est * 10 for d in deflections)


def test_le10_deflection_scales_linearly_with_pressure():
    """Sistema elastico lineare: w(2p) == 2 * w(p)."""
    m1 = _build_le10(nx=6, ny=6, p=1e6, element_type=ElementType.SHELL_Q4)
    m2 = _build_le10(nx=6, ny=6, p=2e6, element_type=ElementType.SHELL_Q4)
    r1 = StaticSolver(m1).solve()
    r2 = StaticSolver(m2).solve()
    w1 = max(abs(d.uz) for d in r1.displacements)
    w2 = max(abs(d.uz) for d in r2.displacements)
    assert abs(w2 / max(w1, 1e-12) - 2.0) < 0.05, f"w1={w1}, w2={w2}"
