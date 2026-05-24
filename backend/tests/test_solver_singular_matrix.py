"""
Regression test per bug #30 (audit v2.3.5-nafems-truth-audit).

Prima di v2.4.0: il solver restituiva NaN o spostamenti folli silent.
Dopo v2.4.0: il solver solleva SingularMatrixError con messaggio italiano.
"""
from __future__ import annotations

import pytest

from schemas import (
    FEAModel, Node, Element, Load, Constraint,
    ElementType, LoadType, ConstraintType,
)
from core.solver import StaticSolver
from core.solver.errors import SingularMatrixError, NumericalInstabilityError


def _model_no_constraints() -> FEAModel:
    """
    Caso 1 dell'audit: 2 nodi beam2D senza alcun vincolo.
    Prima: max|uy| = NaN silente.
    Atteso ora: SingularMatrixError.
    """
    nodes = [
        Node(id=1, x=0.0, y=0.0, z=0.0),
        Node(id=2, x=1.0, y=0.0, z=0.0),
    ]
    elements = [
        Element(
            id=1, type=ElementType.BEAM2D, nodes=[1, 2],
            material_id="steel_s355", section_id="ipe_300",
        ),
    ]
    loads = [Load(id=1, type=LoadType.NODAL, target_id=2, fy=-1000.0)]
    return FEAModel(
        id="test_no_constraints", name="Test rigid body free",
        is_3d=False, nodes=nodes, elements=elements,
        constraints=[],     # <-- nessun vincolo
        loads=loads,
    )


def _model_underconstrained() -> FEAModel:
    """
    Caso 2 dell'audit: 5 nodi beam2D con un solo nodo sottovincolato (solo
    ux+uy bloccati, ma rotazione e altri DOF liberi).
    Prima: max|uy| = 1.76e10 m silente.
    Atteso ora: SingularMatrixError(cause='huge_displacement' o 'rank_deficient').
    """
    nodes = [
        Node(id=i + 1, x=float(i), y=0.0, z=0.0)
        for i in range(5)
    ]
    elements = [
        Element(
            id=i + 1, type=ElementType.BEAM2D, nodes=[i + 1, i + 2],
            material_id="steel_s355", section_id="ipe_300",
        )
        for i in range(4)
    ]
    constraints = [
        Constraint(
            id=1, type=ConstraintType.CUSTOM, node_id=1,
            dofs=[True, True, False, False, False, False],  # solo ux+uy bloccati
        ),
    ]
    loads = [Load(id=1, type=LoadType.NODAL, target_id=5, fy=-1000.0)]
    return FEAModel(
        id="test_underconstrained", name="Test labile",
        is_3d=False, nodes=nodes, elements=elements,
        constraints=constraints, loads=loads,
    )


def test_no_constraints_raises_singular_matrix_error():
    """
    Caso 1: 2 nodi senza vincoli.
    Deve sollevare SingularMatrixError, NON restituire NaN.
    """
    m = _model_no_constraints()
    solver = StaticSolver(m)

    with pytest.raises(SingularMatrixError) as exc_info:
        solver.solve()

    # Verifica cause + messaggio italiano sensato
    assert exc_info.value.cause in ("rank_deficient", "nan_in_solution"), (
        f"cause inattesa: {exc_info.value.cause}"
    )
    assert "vincoli" in exc_info.value.message_it.lower(), (
        f"Messaggio non menziona 'vincoli': {exc_info.value.message_it}"
    )


def test_underconstrained_raises_singular_matrix_error():
    """
    Caso 2: 5 nodi con un solo nodo sottovincolato.
    Deve sollevare SingularMatrixError, NON restituire spostamenti di 10^10 m.
    """
    m = _model_underconstrained()
    solver = StaticSolver(m)

    with pytest.raises(SingularMatrixError) as exc_info:
        solver.solve()

    # Cause può essere: rank_deficient (caught come warning) OR huge_displacement
    # (solve riuscito ma valori assurdi) OR nan_in_solution
    assert exc_info.value.cause in (
        "rank_deficient",
        "huge_displacement",
        "nan_in_solution",
    ), f"cause inattesa: {exc_info.value.cause}"


def test_singular_error_has_italian_message():
    """
    Tutti i SingularMatrixError devono avere message_it in italiano
    con suggerimento operativo.
    """
    err = SingularMatrixError(cause="rank_deficient", n_free_dofs=10)
    msg = err.message_it.lower()

    # Almeno UNA di queste parole italiane deve essere presente
    italian_keywords = ["vincol", "labile", "meccanismo", "verifica", "sufficient"]
    found = [w for w in italian_keywords if w in msg]
    assert len(found) >= 1, (
        f"Messaggio non in italiano comprensibile: '{err.message_it}'"
    )


def test_valid_model_still_solves():
    """
    Sanity check: un modello correttamente vincolato deve continuare
    a girare normalmente (no regression).
    """
    from examples import example_simple_beam_2d

    m = example_simple_beam_2d()
    solver = StaticSolver(m)

    # NON deve sollevare nulla
    result = solver.solve()
    assert result is not None
    assert len(result.displacements) > 0

    # Tutti gli spostamenti finiti
    for d in result.displacements:
        # < 1 metro per beam IPE 300 con carico tipico
        assert abs(d.uy) < 1.0, f"uy={d.uy} fuori scala atteso"
        assert abs(d.ux) < 1.0, f"ux={d.ux} fuori scala atteso"
