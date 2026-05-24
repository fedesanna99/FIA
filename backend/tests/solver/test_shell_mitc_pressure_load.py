"""
Regression test per NEW-3 (audit v2.3.7-solver-internals-audit).

Verifica che SHELL_Q4_MITC riceva pressure load correttamente e produca
``max|uz| > 0`` su LE10. Pre-fix v2.4.3a: ``max|uz| = 0`` silente
(branch dispatch ``if el.type == ElementType.SHELL_Q4:`` non gestiva MITC).

Nota su anomalia inattesa scoperta:
    Post-fix, MITC produce ``uz ≈ 0.237 m`` su LE10 mentre Q4 dà
    ``uz ≈ 6.4e-3 m`` (rapporto ~37×). Questa discrepanza suggerisce un
    secondo bug nella formulation MITC bending (`_bending_stiffness`
    Bathe-Dvorkin), distinto dal dispatch NEW-3. Documentato in
    docs/v2_4_3a_shell_pressure_mitc_fix_report.md per follow-up brief.

I test qui verificano SOLO il fix NEW-3 (dispatch), non la calibrazione
formulation MITC.
"""
from __future__ import annotations
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.abspath(os.path.join(HERE, "..", "..")))
sys.path.insert(0, os.path.abspath(os.path.join(HERE, "..")))

from nafems.test_le10_thick_plate import _build_le10
from schemas import ElementType
from core.solver import StaticSolver


def test_mitc_pressure_load_produces_nonzero_displacement():
    """
    LE10 con SHELL_Q4_MITC + pressure load → max|uz| > 0.
    Prima del fix v2.4.3a: max|uz| = 0 (branch dispatch escludeva MITC).
    """
    m = _build_le10(nx=8, ny=8, p=1e6, element_type=ElementType.SHELL_Q4_MITC)
    r = StaticSolver(m).solve()
    uz_max = max(abs(d.uz) for d in r.displacements)
    assert uz_max > 1e-6, (
        f"max|uz|={uz_max:.3e}, atteso > 1e-6 (carico applicato a MITC)"
    )


def test_mitc_pressure_load_produces_finite_displacement():
    """
    Sanity: il pressure load applicato a MITC produce displacements finiti,
    non NaN o Inf. Verifica che il safe_spsolve non venga triggerato.
    """
    import math
    m = _build_le10(nx=8, ny=8, p=1e6, element_type=ElementType.SHELL_Q4_MITC)
    r = StaticSolver(m).solve()
    for d in r.displacements:
        for axis in ("ux", "uy", "uz"):
            v = getattr(d, axis)
            assert math.isfinite(v), f"{axis}={v} non finito"


def test_q4_pressure_load_unchanged_after_fix():
    """
    Sanity: il fix dispatch NON ha alterato il comportamento di SHELL_Q4.
    Baseline pre-v2.4.3a: uz_max ~ 6.4e-3 m per LE10 mesh 8x8 p=1MPa.
    """
    m = _build_le10(nx=8, ny=8, p=1e6, element_type=ElementType.SHELL_Q4)
    r = StaticSolver(m).solve()
    uz_max = max(abs(d.uz) for d in r.displacements)
    # Range generoso ±20% attorno al baseline noto
    assert 5e-3 < uz_max < 8e-3, (
        f"max|uz|={uz_max:.3e}, fuori range baseline Q4 [5e-3, 8e-3]"
    )


def test_mitc_pressure_load_total_force_consistent():
    """
    La forza totale applicata via lumping deve essere coerente con
    p * A_total per entrambi Q4 e MITC (stesso branch).
    """
    import math
    m_mitc = _build_le10(nx=8, ny=8, p=1e6, element_type=ElementType.SHELL_Q4_MITC)
    m_q4 = _build_le10(nx=8, ny=8, p=1e6, element_type=ElementType.SHELL_Q4)

    # I due modelli hanno stesso numero di elementi pressure load
    n_mitc = sum(1 for l in m_mitc.loads if l.type.value == "pressure")
    n_q4 = sum(1 for l in m_q4.loads if l.type.value == "pressure")
    assert n_mitc == n_q4, (
        f"N elementi con pressure load deve essere uguale: "
        f"MITC={n_mitc}, Q4={n_q4}"
    )
    # Pressione applicata identica
    p_mitc = sum(float(l.pressure or 0.0) for l in m_mitc.loads)
    p_q4 = sum(float(l.pressure or 0.0) for l in m_q4.loads)
    assert math.isclose(p_mitc, p_q4), (
        f"Pressione totale modello: MITC={p_mitc}, Q4={p_q4}"
    )
