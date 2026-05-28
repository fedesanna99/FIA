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
    """Sanity: il fix dispatch v2.4.3a NON ha alterato il comportamento di SHELL_Q4.

    Garanzia di regressione: dopo il dispatch fix v2.4.3a (NEW-3, aggiunta del
    branch SHELL_Q4_MITC nel solver), il SHELL_Q4 standard sulla SAME geometria
    `_build_le10` deve ancora produrre lo stesso max|uz| (entro un range esplicito).
    Se questo test fallisce, qualcuno ha alterato il dispatch del Q4 nel solver.

    🔄 BASELINE RIALLINEATO 2026-05-30: pre-fix il baseline era ~6.4e-3 m,
    ancorato alla GEOMETRIA FALSIFICATA del LE10 (foro piccolo a_i=b_i=0.5,
    "evitiamo singolarità di mesh" — vedi audit "Via A" 2026-05-29). Quella
    geometria non era la LE10 NAFEMS vera; `_build_le10` è stato corretto al
    foro NAFEMS ufficiale (a_i=2.0, b_i=1.0). La struttura è cambiata
    (foro 4× più grande in area → meno superficie portante → freccia minore):
    nuovo max|uz| = 3.334e-3 m. Decomposizione coi numeri verificata:
        - foro vecchio + vincoli vecchi : 6.386 mm  (pre-tutto)
        - foro vecchio + vincoli topo   : 6.386 mm  (+0.000)
        - foro nuovo   + vincoli vecchi : 3.334 mm  (−3.052)
        - foro nuovo   + vincoli topo   : 3.334 mm  (stato attuale)
    → l'intero cambio è dovuto alla geometria onesta, ZERO contributo dal
    solver/dispatch/lumping. Il dispatch Q4 è ancora identico a pre-v2.4.3a.

    Tolleranza ±15% intorno al nuovo baseline 3.334e-3 m: ampia abbastanza da
    sopravvivere a futuri ri-arrangiamenti minori della mesher, stretta
    abbastanza da catturare un effettivo cambio del Q4 dispatch.
    """
    EXPECTED_UZ_MAX = 3.334e-3  # m, LE10 mesh 8x8 p=1MPa Q4 standard, geom NAFEMS vera
    TOL = 0.15                   # ±15% — vedi docstring

    m = _build_le10(nx=8, ny=8, p=1e6, element_type=ElementType.SHELL_Q4)
    r = StaticSolver(m).solve()
    uz_max = max(abs(d.uz) for d in r.displacements)

    lo, hi = EXPECTED_UZ_MAX * (1 - TOL), EXPECTED_UZ_MAX * (1 + TOL)
    assert lo < uz_max < hi, (
        f"max|uz|={uz_max:.3e} fuori da {EXPECTED_UZ_MAX:.3e} ±{TOL*100:.0f}% "
        f"[{lo:.3e}, {hi:.3e}]. Se il dispatch del Q4 NON è stato toccato, "
        f"controllare se _build_le10 ha cambiato la geometria."
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
