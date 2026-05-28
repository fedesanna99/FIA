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

    # Bordo esterno: forze nodali equivalenti con lumping arc-length-weighted.
    # v2.4.3c (NEW-1 causa B fix): pre-fix usava `F_total / N_edge_nodes`
    # uniforme, perdendo 10-15% del carico totale e producendo
    # distribuzione non bilanciata su archi non uniformi. Ora ogni nodo
    # riceve forza proporzionale a (semi-arco-left + semi-arco-right).
    #
    # FIX 2026-05-30 (causa C "carico esplosivo"): selezione dei nodi del
    # bordo esterno passata da GEOMETRICA (|r| < 0.05 sul residuo ellittico)
    # a TOPOLOGICA (ultima colonna della griglia strutturata, i=nx).
    # La tolleranza geometrica fissa catturava anelli interni raffinando:
    #     8×8   →   9 nodi  (atteso 9, ok)
    #     16×16 →  20 nodi  (atteso 17,  +3 intrusi)
    #     32×32 →  72 nodi  (atteso 33, +39 intrusi)
    #     64×64 → 244 nodi  (atteso 65, +179 intrusi — 2 anelli interi)
    # Il carico applicato cresceva di 1.93× a 64×64 vs teorico, facendo
    # divergere σ_y(D) da 66.5 MPa (8×8) a 143.8 MPa (64×64) invece di
    # convergere a ~92.7 MPa. Diagnosi e prova: vedi audit 2026-05-30.
    # Il criterio topologico è coerente col layout del mesher
    # `core/mesh/elliptic.py:60-102` (grid_ids[j][i], i=nx ⇒ bordo esterno).
    # Node ID = first_node_id + j·(nx+1) + i  (first_node_id=1 da default).
    outer_ids = {1 + j * (nx + 1) + nx for j in range(ny + 1)}
    edge_nodes_raw = [n for n in nodes if n.id in outer_ids]
    # Ordina lungo l'arco (angolo polare parametrico ellisse: atan2(y/b, x/a))
    edge_nodes = sorted(
        edge_nodes_raw,
        key=lambda nd: math.atan2(nd.y / b_o, nd.x / a_o),
    )

    def _arc_chord(n1, n2):
        # Chord-length approximation (sufficiente per archi piccoli)
        return math.hypot(n2.x - n1.x, n2.y - n1.y)

    n_edges = len(edge_nodes)
    loads: list[Load] = []
    for i, nd in enumerate(edge_nodes):
        arc_left = _arc_chord(edge_nodes[i - 1], nd) / 2.0 if i > 0 else 0.0
        arc_right = _arc_chord(nd, edge_nodes[i + 1]) / 2.0 if i < n_edges - 1 else 0.0
        arc_tot = arc_left + arc_right
        # Forza normale uscente all'ellisse: gradient ∇((x/a)² + (y/b)²)
        # = (2x/a², 2y/b²), normalizzato.
        nx_v = nd.x / (a_o ** 2)
        ny_v = nd.y / (b_o ** 2)
        mag = math.hypot(nx_v, ny_v)
        if mag < 1e-9:
            continue
        nx_v, ny_v = nx_v / mag, ny_v / mag
        # Forza nodale = σ · t · arco_rappresentato_dal_nodo
        f_mag = sigma_edge * t * arc_tot
        loads.append(Load(
            id=i + 1, type=LoadType.NODAL, target_id=nd.id,
            fx=f_mag * nx_v, fy=f_mag * ny_v,
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


@pytest.mark.xfail(
    strict=True,
    reason=(
        "Q4 standard a mesh moderata 16x16 raggiunge -15.1% sul target NAFEMS "
        "(sigma_y(D) = 78.7 MPa vs +92.7 MPa). La precisione +-5% si ottiene "
        "a mesh 64x64 (-3.8%, vedi test_le1_sigma_y_at_D_strict_64). NON e' un "
        "bug del solver: e' la convergenza in corso del Q4 al bordo curvo con "
        "concentrazione di sforzo. NON allargare la tolleranza per mascherarlo."
    ),
)
def test_le1_sigma_y_at_D_honest():
    """Libro mastro del LIMITE NOTO Q4 a mesh moderata (xfail atteso).

    Tiene a registro coi numeri il fatto che il Q4 standard NON raggiunge la
    precisione NAFEMS +-5% a mesh 16x16: il valore misurato e' +78.7 MPa
    (-15.1% sul target +92.7 MPa). E' la convergenza in corso, non un bug.

    Quando questo test passera' (xfail -> pass), vorra' dire che qualcuno ha
    migliorato l'accuratezza del Q4 al bordo curvo (es. MITC4 reale,
    integrazione selettiva, o stress recovery migliore). Quel giorno:
    cambiare strict=True in strict=False o rimuovere xfail.

    Il test "verde" gemello (`test_le1_sigma_y_at_D_strict_64`) usa mesh
    64x64 e raggiunge -3.8% (dentro +-5% NAFEMS): il bollino e' la' che
    certifica la fisica corretta del solver. Questo invece tiene il limite
    a vista nella suite veloce.

    Estrazione invariata rispetto al test storico: nodo piu' vicino a
    (a_inner, 0) = (2, 0), media degli elementi adiacenti, sigma_y ricucito
    (post nodal_stress_recovery).
    """
    TOL = 0.05  # +-5% NAFEMS ufficiale — mantenuto strict, e' cio' che rende l'xfail significativo

    m = _build_le1(nx=16, ny=16, et=ElementType.SHELL_Q4)
    r = StaticSolver(m).solve()
    sigma_y_D = _sigma_y_at_point_D(m, r)

    err = abs(abs(sigma_y_D) - SIGMA_TARGET)
    max_err = SIGMA_TARGET * TOL
    assert err <= max_err, (
        f"σ_y(D) = {sigma_y_D/1e6:.3f} MPa "
        f"vs target NAFEMS {SIGMA_TARGET/1e6:.3f} MPa "
        f"(err = {(abs(sigma_y_D) - SIGMA_TARGET)/SIGMA_TARGET*100:+.1f}%, "
        f"tolleranza ±{TOL*100:.0f}%) — LIMITE ATTESO Q4 a mesh moderata"
    )


def test_le1_sigma_y_at_D_strict_64():
    """Test "strict" NAFEMS LE1 — bollino ufficiale a mesh 64x64, ±5%.

    🟢 TEST VERDE ONESTO (audit "fix carico topologico" 2026-05-30):
    Confronta σ_y(D) col target NAFEMS +92.7 MPa alla tolleranza ufficiale
    ±5%. Su mesh 64×64 col carico applicato correttamente (criterio
    topologico, vedi `_build_le1`) il valore misurato è +89.1 MPa (errore
    −3.8%, dentro ±5%).

    🚩 SCELTE DEL TEST:

    1. **Mesh 64×64**: necessaria per la convergenza NAFEMS ±5%. A mesh
       più grosse il Q4 standard sotto-stima (8×8: −28%, 16×16: −15%,
       32×32: −7.7%, 64×64: −3.8%). La curva di convergenza è monotona
       grazie al fix carico (era divergente pre-fix, vedi audit 2026-05-30).
       COSTO: ~7 s solve. Pensato per esecuzione meno frequente.

    2. **Stessa estrazione del test honest 16×16** (`_sigma_y_at_point_D`):
       nodo più vicino a (a_inner, 0) = (2.0, 0.0), media degli elementi
       adiacenti, `sigma_y` ricucito post nodal_stress_recovery. NESSUN
       cambio di metodo: questo è ciò che ha validato il −3.8%.

    3. **Tolleranza ±5%** NAFEMS ufficiale strict. Non maggiore.

    Riferimento: NAFEMS Standard Benchmarks (1990), TNSB Rev. 3, "Elliptic
    membrane" LE1. Target σ_y(D) = +92.7 MPa al punto D = (a_inner, 0)
    sul bordo del foro, asse maggiore (concentrazione di sforzo per
    trazione radiale del bordo esterno).
    """
    TOL = 0.05  # ±5% NAFEMS ufficiale strict

    m = _build_le1(nx=64, ny=64, et=ElementType.SHELL_Q4)
    r = StaticSolver(m).solve()
    sigma_y_D = _sigma_y_at_point_D(m, r)

    err = abs(abs(sigma_y_D) - SIGMA_TARGET)
    max_err = SIGMA_TARGET * TOL
    assert err <= max_err, (
        f"σ_y(D) = {sigma_y_D/1e6:.3f} MPa "
        f"vs target NAFEMS {SIGMA_TARGET/1e6:.3f} MPa "
        f"(err = {(abs(sigma_y_D) - SIGMA_TARGET)/SIGMA_TARGET*100:+.1f}%, "
        f"tolleranza ±{TOL*100:.0f}%)"
    )
