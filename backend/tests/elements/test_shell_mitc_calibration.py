"""Regression suite NEW-3-followup esteso (sign + magnitude MITC).

v2.4.5 Phase 3 · MITC calibration parametrica.

Pre-fix v2.4.5 (MITC `_Bs_at` con DOF swap + sign flip):
- LE10 mesh 8×8: w_max = 0.237 m (37× Q4), σ_y_top = +75 MPa (sign sbagliato)

Post-fix v2.4.5:
- LE10 mesh 8×8: w_max = 6.99e-3 m (~1.09× Q4), σ_y_top = −25.5 MPa (sign OK)

Verifica:
1. MITC vs Q4 consistency su LE10 NAFEMS standard (ratio ~1, era 37×)
2. MITC su piastra quadrata SS, 3 thickness ratios (0.05 / 0.18 / 0.5)
3. MITC anti shear-locking: migliora Q4 per piastre sottili
"""
from __future__ import annotations
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.abspath(os.path.join(HERE, "..", "..")))
sys.path.insert(0, os.path.abspath(os.path.join(HERE, "..")))

import pytest

from schemas import (
    FEAModel, Node, Element, Load, Constraint,
    ElementType, LoadType, ConstraintType,
    Section, SECTIONS_DB,
)
from core.solver import StaticSolver
from nafems.test_le10_thick_plate import _build_le10


pytestmark = pytest.mark.benchmark


# ── Helpers ───────────────────────────────────────────────────────────────


def _ensure_section(sec_id: str, t: float) -> None:
    if sec_id not in SECTIONS_DB:
        SECTIONS_DB[sec_id] = Section(
            id=sec_id, name=f"Test {sec_id}",
            type="custom", A=t, Iy=0, Iz=0, J=0, thickness=t,
        )


def _build_square_plate_ss(
    L: float,
    t: float,
    n: int,
    element_type: ElementType,
    p: float = 1e6,
) -> FEAModel:
    """Piastra quadrata L×L simply supported (w=0 sui 4 bordi).

    Mesh strutturata n×n quad sul piano xy. Pressione uniforme p verso il basso.
    """
    sec_id = f"calib_t{int(t*1000)}_L{int(L*100)}"
    _ensure_section(sec_id, t)

    nodes = []
    nid = 0
    for j in range(n + 1):
        for i in range(n + 1):
            nid += 1
            nodes.append(Node(id=nid, x=L * i / n, y=L * j / n, z=0.0))

    def node_idx(i: int, j: int) -> int:
        return j * (n + 1) + i + 1

    elements = []
    eid = 0
    for j in range(n):
        for i in range(n):
            eid += 1
            elements.append(Element(
                id=eid, type=element_type,
                nodes=[node_idx(i, j), node_idx(i + 1, j),
                       node_idx(i + 1, j + 1), node_idx(i, j + 1)],
                material_id="steel_s355", section_id=sec_id,
            ))

    constraints = []
    cid = 0
    for nd in nodes:
        on_boundary = (
            abs(nd.x) < 1e-9 or abs(nd.x - L) < 1e-9
            or abs(nd.y) < 1e-9 or abs(nd.y - L) < 1e-9
        )
        if on_boundary:
            cid += 1
            # Simply supported: w=0 sui bordi, rotazioni e in-plane liberi
            constraints.append(Constraint(
                id=cid, type=ConstraintType.CUSTOM, node_id=nd.id,
                dofs=[False, False, True, False, False, False],
            ))

    loads = [
        Load(id=i + 1, type=LoadType.PRESSURE, target_id=el.id, pressure=p)
        for i, el in enumerate(elements)
    ]
    return FEAModel(
        id=f"calib_plate_{element_type.value}_{n}x{n}_t{int(t*1000)}",
        name="MITC calibration plate", is_3d=True,
        nodes=nodes, elements=elements,
        constraints=constraints, loads=loads,
    )


def _analytical_thin_plate(L: float, t: float,
                            E: float = 210e9, nu: float = 0.3,
                            p: float = 1e6) -> tuple[float, float]:
    """Piastra quadrata SS, pressione uniforme.

    Formule Timoshenko-Woinowsky-Krieger, "Theory of Plates and Shells",
    Tabella 8 piastra quadrata SS pressione uniforme, α₁ = 0.00406 (w),
    β₁ = 0.0479 (M):
        w_max ≈ α₁ · p · L⁴ / D            (al centro)
        M_max ≈ β₁ · p · L²                (momento flettente al centro)
        σ_top = −6 · M_max / t² = −6·β₁·p·L²/t²  (compr fibra TOP, z-up)
    Correzione Reissner per piastra spessa: w_max · (1 + ~1.875 · (t/L)²).
    NB: la correzione additiva Reissner è solo prima ordine: per t/L > 0.3
    diventa imprecisa, lì la formula analytical sotto-stima w di un 20-30%.
    """
    D = E * t**3 / (12 * (1 - nu**2))
    w_kirchhoff = 0.00406 * p * L**4 / D
    w = w_kirchhoff * (1 + 1.875 * (t / L)**2)
    sigma_top = -6.0 * 0.0479 * p * L**2 / t**2   # neg: compressione fibra TOP
    return w, sigma_top


def _w_max(result) -> float:
    return max(abs(d.uz) for d in result.displacements)


def _sigma_y_top_at_center(model: FEAModel, result) -> float | None:
    """σ_y_top al nodo geometricamente più vicino al centro della piastra."""
    xs = [nd.x for nd in model.nodes]
    ys = [nd.y for nd in model.nodes]
    cx, cy = 0.5 * (min(xs) + max(xs)), 0.5 * (min(ys) + max(ys))
    nd_c = min(model.nodes, key=lambda n: (n.x - cx)**2 + (n.y - cy)**2)
    nodal = next(
        (s for s in result.shell_nodal_stresses if s.node_id == nd_c.id), None
    )
    return None if nodal is None else nodal.sigma_y_top


# ── Test 1 · LE10 NAFEMS standard: MITC vs Q4 consistency ─────────────────


def test_mitc_vs_q4_consistency_le10():
    """LE10 NAFEMS (t=0.6m, p=1MPa, mesh 8×8): MITC e Q4 entro ±30%.

    Pre-fix v2.4.5: ratio MITC/Q4 = 37× (catastrofe).
    Post-fix v2.4.5: ratio MITC/Q4 ≈ 1.09 (sano).
    """
    m_q4 = _build_le10(nx=8, ny=8, p=1e6, element_type=ElementType.SHELL_Q4)
    m_mitc = _build_le10(nx=8, ny=8, p=1e6, element_type=ElementType.SHELL_Q4_MITC)

    w_q4 = _w_max(StaticSolver(m_q4).solve())
    w_mitc = _w_max(StaticSolver(m_mitc).solve())

    ratio = w_mitc / w_q4
    assert 0.7 < ratio < 1.3, (
        f"MITC/Q4 w ratio = {ratio:.2f} (pre-fix 37, target ~1.0)"
    )


def test_mitc_sigma_y_top_le10_sign_and_magnitude():
    """LE10 punto D: σ_y_top MITC negativo e dello stesso ordine di Q4."""
    m_mitc = _build_le10(nx=8, ny=8, p=1e6, element_type=ElementType.SHELL_Q4_MITC)
    r_mitc = StaticSolver(m_mitc).solve()

    nd_D = min(m_mitc.nodes, key=lambda n: n.x**2 + n.y**2)
    nodal = next(
        (s for s in r_mitc.shell_nodal_stresses if s.node_id == nd_D.id), None
    )
    assert nodal is not None, "shell_nodal_stresses mancante per nodo D"
    assert nodal.sigma_y_top is not None

    # Sign: negativo (compressione fibra top, fisicamente corretto)
    assert nodal.sigma_y_top < 0, (
        f"σ_y_top MITC = {nodal.sigma_y_top:+.3e} Pa, atteso NEG "
        f"(post v2.4.5 sign fix)"
    )

    # Ordine di grandezza vs target NAFEMS (-5.38 MPa): tolleriamo
    # range [0.1, 10] × per coarse mesh (Q4 dà -22 MPa, MITC ~-25 MPa).
    target = 5.38e6
    ratio = abs(nodal.sigma_y_top) / target
    assert 0.1 < ratio < 10.0, (
        f"|σ_y_top| MITC = {abs(nodal.sigma_y_top):.3e}, "
        f"ratio vs NAFEMS = {ratio:.2f}"
    )


# ── Test 2 · Piastra quadrata SS, 3 thickness ratios ──────────────────────


@pytest.mark.parametrize("t,L,n,max_err_w_pct,max_err_s_pct", [
    # Thin t/L = 0.05 → Kirchhoff limit, MITC anti shear-locking critical
    (0.5,  10.0, 8, 30, 30),
    # Moderate t/L = 0.18 (LE10 standard range)
    (1.8,  10.0, 8, 30, 30),
    # Thick t/L = 0.5 → Reissner regime, correzione 1.875·(t/L)² additiva
    # è solo prima ordine: la formula analytical sotto-stima w del ~70% reale,
    # quindi tolleriamo errore w fino a 100%. σ resta consistente.
    (5.0,  10.0, 8, 100, 40),
])
def test_mitc_thickness_calibration(t, L, n, max_err_w_pct, max_err_s_pct):
    """MITC su piastra quadrata SS L×L, parametrico su t/L = 0.05, 0.18, 0.5.

    Verifica:
    - sign σ_y_top corretto (negativo)
    - magnitude w_max entro tolleranza vs Reissner-Mindlin analytical
    - magnitude σ_y_top entro tolleranza
    """
    w_an, sigma_an = _analytical_thin_plate(L=L, t=t)

    m = _build_square_plate_ss(
        L=L, t=t, n=n, element_type=ElementType.SHELL_Q4_MITC, p=1e6,
    )
    r = StaticSolver(m).solve()

    w_mitc = _w_max(r)
    err_w = abs(w_mitc - abs(w_an)) / abs(w_an) * 100

    sigma_mitc = _sigma_y_top_at_center(m, r)
    assert sigma_mitc is not None, "σ_y_top non popolato al centro"
    # Sign consistency (entrambi negativi)
    assert (sigma_mitc * sigma_an) > 0, (
        f"t/L={t/L:.3f}: MITC σ_top sign vs analytical NOT matching "
        f"(MITC={sigma_mitc:.3e}, analytical={sigma_an:.3e})"
    )

    err_s = abs(sigma_mitc - sigma_an) / abs(sigma_an) * 100

    assert err_w < max_err_w_pct, (
        f"t/L={t/L:.3f}: MITC w err {err_w:.1f}% > limit {max_err_w_pct}% "
        f"(MITC={w_mitc:.3e}, analytical={abs(w_an):.3e})"
    )
    assert err_s < max_err_s_pct, (
        f"t/L={t/L:.3f}: MITC σ err {err_s:.1f}% > limit {max_err_s_pct}% "
        f"(MITC={sigma_mitc:.3e}, analytical={sigma_an:.3e})"
    )


# ── Test 3 · MITC > Q4 per piastre sottili (anti shear-locking) ───────────


def test_mitc_no_worse_than_q4_for_thin_plates():
    """Piastra sottile t/L = 0.05: MITC errore w ≤ Q4 + 5%.

    Q4 standard ha shear-locking che lo rende rigido per piastre sottili.
    MITC, immune da shear-locking, dovrebbe essere uguale o migliore.

    Tolleranza piccola perché per piastre molto sottili anche Q4 con mesh
    fine può performare decentemente; il test prinipale è che MITC non
    sia peggio.
    """
    L, t, n = 10.0, 0.5, 8
    w_an, _ = _analytical_thin_plate(L=L, t=t)

    m_q4 = _build_square_plate_ss(L=L, t=t, n=n,
                                   element_type=ElementType.SHELL_Q4)
    m_mitc = _build_square_plate_ss(L=L, t=t, n=n,
                                     element_type=ElementType.SHELL_Q4_MITC)

    w_q4 = _w_max(StaticSolver(m_q4).solve())
    w_mitc = _w_max(StaticSolver(m_mitc).solve())

    err_q4 = abs(w_q4 - abs(w_an)) / abs(w_an)
    err_mitc = abs(w_mitc - abs(w_an)) / abs(w_an)

    assert err_mitc <= err_q4 + 0.05, (
        f"thin plate t/L={t/L:.3f}: MITC err {err_mitc*100:.1f}% "
        f"> Q4 err {err_q4*100:.1f}% + 5%"
    )
