"""
Regression test per bug #30 (audit v2.3.5-nafems-truth-audit).

Prima di v2.4.0: il solver restituiva NaN o spostamenti folli silent.
Dopo v2.4.0: il solver solleva SingularMatrixError con messaggio italiano.

v2.4.0bis aggiunge test per arc-length, dynamic, nonlinear solvers
+ anti-regression meta-test che impedisce reintroduzione di spsolve raw.
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


# === v2.4.0bis: extension to arc-length / dynamic / nonlinear ===========


def test_arclength_solver_no_constraints_raises():
    """
    Caso 1 con ArcLengthSolver: zero vincoli → K_T totalmente singolare.
    Prima di v2.4.0bis: arclength catturava 'Exception' generica e metteva
    'error' in diagnostics silente. Ora bubble up SingularMatrixError.
    """
    from core.solver import ArcLengthSolver

    m = _model_no_constraints()
    solver = ArcLengthSolver(m, n_steps=2, max_iter=5)

    with pytest.raises((SingularMatrixError, NumericalInstabilityError)):
        solver.solve()


def test_dynamic_solver_no_constraints_no_silent_corruption():
    """
    Caso 1 con DynamicSolver (Newmark): zero vincoli sul sistema K.
    Comportamento atteso: O solleva SingularMatrixError, OPPURE produce
    risultati finiti grazie alla regolarizzazione da M nel K_eff =
    K + a0·M + a1·C (Newmark è auto-stabilizzato per masse > 0).

    Pre-v2.4.0bis: l'`except Exception: a = 0` ingoiava silenziosamente
    qualsiasi problema sull'accelerazione iniziale.
    Post-v2.4.0bis: safe_spsolve garantisce che NaN/Inf nell'a0 sollevino
    eccezione; il resto del loop dipende da K_eff regolarizzato.
    """
    from core.solver import DynamicSolver

    m = _model_no_constraints()
    solver = DynamicSolver(m, dt=0.01, t_end=0.05)

    try:
        result = solver.solve()
        # Comportamento alternativo accettabile: dynamic graceful via M.
        # Tutti gli storici nodali devono essere finiti (no NaN/Inf).
        for nid, hist in result.node_history.items():
            for axis, series in hist.items():
                for v in series:
                    assert v == v, (
                        f"NaN nel time history node {nid} {axis} — "
                        "corruzione silente NON catturata!"
                    )
                    assert abs(v) < 1.0e15, (
                        f"Valore folle {v:.3e} nel time history node {nid} {axis}"
                    )
    except (SingularMatrixError, NumericalInstabilityError):
        # Comportamento atteso primario quando M_ff è singolare
        pass


def test_nonlinear_solver_no_constraints_no_silent_corruption():
    """
    Caso 1 con NonLinearStaticSolver: zero vincoli → K_T singolare.
    NR ha fallback lstsq (pseudo-inversa), quindi può "completare" anche
    su sistema singolare — in tal caso però il risultato deve essere
    finito (no NaN/Inf in `final_displacements` e `max_displacement`),
    altrimenti SingularMatrixError viene sollevata.

    Pre-v2.4.0bis: spsolve raw + except Exception generico → corruzione silente.
    Post-v2.4.0bis: safe_spsolve + lstsq fallback con check NaN finale.
    """
    from core.solver import NonLinearStaticSolver

    m = _model_no_constraints()
    solver = NonLinearStaticSolver(m, n_steps=2, max_iter=5)

    try:
        result = solver.solve()
        # Se il solver completa via lstsq fallback, verifica finiteness
        assert result.max_displacement == result.max_displacement, (
            "NR converge a NaN — corruzione silente NON catturata!"
        )
        for d in result.final_displacements:
            for v in (d.ux, d.uy, d.uz, d.rx, d.ry, d.rz):
                assert v == v, f"NaN nel displacement node {d.node_id}"
                assert abs(v) < 1.0e15, (
                    f"NR converge a valore folle {v:.3e} m node {d.node_id}"
                )
    except (SingularMatrixError, NumericalInstabilityError):
        # Comportamento atteso primario quando lstsq fallback fallisce
        pass


def test_no_spsolve_raw_remaining_in_solver_module():
    """
    Anti-regression: nessuna chiamata raw a spsolve deve essere reintrodotta
    in backend/core/solver/. Tutte le solve devono passare per safe_spsolve.

    Eccezione: errors.py contiene la DEFINIZIONE di safe_spsolve (singola
    chiamata raw a spla.spsolve interna). Quindi 1 occorrenza è OK lì.
    """
    import re
    from pathlib import Path

    # Repo root: i test girano da backend/ tipicamente, ma path è relativo
    # al file di test → solver dir
    solver_dir = Path(__file__).parent.parent / "core" / "solver"
    assert solver_dir.is_dir(), f"Solver dir not found: {solver_dir}"

    pattern = re.compile(r"spla\.spsolve|sp\.linalg\.spsolve")

    offending: list[str] = []
    for py_file in solver_dir.glob("*.py"):
        if py_file.name == "errors.py":
            # safe_spsolve helper internal call: permesso
            continue
        text = py_file.read_text(encoding="utf-8")
        for line_no, line in enumerate(text.splitlines(), start=1):
            if pattern.search(line):
                offending.append(f"{py_file.name}:{line_no}: {line.strip()}")

    assert not offending, (
        "Trovate chiamate spsolve raw fuori da errors.py:\n"
        + "\n".join(offending)
        + "\nUsa safe_spsolve() dal modulo errors invece."
    )
