"""
Regression test per NEW-4 (audit v2.3.7-solver-internals-audit).

Verifica che ``ShellQuad4.stresses()`` e ``ShellQuad4MITC.stresses()``
calcolino bending stress (top/bottom) e momenti correttamente.

Pre-fix v2.4.3b: sigma_y_top = sigma_y_bot = M_x = M_y = None (campi
mai popolati). Su LE10 σ_yy(D) era sempre 0 anche con bending attivo
nel solver (rotazioni ≠ 0).

Post-fix: campi `sigma_*_top/bot` e `M_x/y/xy` popolati per shell, None
per non-shell.
"""
from __future__ import annotations
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.abspath(os.path.join(HERE, "..", "..")))
sys.path.insert(0, os.path.abspath(os.path.join(HERE, "..")))

from nafems.test_le10_thick_plate import _build_le10
from nafems.test_le1_elliptic_membrane import _build_le1
from schemas import ElementType
from core.solver import StaticSolver


def test_le10_q4_has_bending_stress_nonzero():
    """LE10 con SHELL_Q4: sigma_y_top != 0 (era 0 pre-fix)."""
    m = _build_le10(nx=8, ny=8, p=1e6, element_type=ElementType.SHELL_Q4)
    r = StaticSolver(m).solve()
    sigma_top_vals = [
        abs(s.sigma_y_top) for s in r.element_stresses
        if s.sigma_y_top is not None
    ]
    assert len(sigma_top_vals) > 0, "Nessun elemento ha sigma_y_top popolato"
    assert max(sigma_top_vals) > 1e3, (
        f"max|sigma_y_top|={max(sigma_top_vals):.3e}, atteso > 1000 Pa"
    )


def test_le10_q4_moments_nonzero():
    """LE10 ha M_x e M_y non-zero (era None pre-fix)."""
    m = _build_le10(nx=8, ny=8, p=1e6, element_type=ElementType.SHELL_Q4)
    r = StaticSolver(m).solve()
    M_x_vals = [abs(s.M_x) for s in r.element_stresses if s.M_x is not None]
    M_y_vals = [abs(s.M_y) for s in r.element_stresses if s.M_y is not None]
    assert M_x_vals and max(M_x_vals) > 1.0, "M_x non popolato o ~0"
    assert M_y_vals and max(M_y_vals) > 1.0, "M_y non popolato o ~0"


def test_le10_bending_top_bot_antisymmetric():
    """
    sigma_top - sigma_membrana = -(sigma_bot - sigma_membrana)
    perché sigma_top = sigma_m + 6M/t^2 e sigma_bot = sigma_m - 6M/t^2.
    """
    m = _build_le10(nx=8, ny=8, p=1e6, element_type=ElementType.SHELL_Q4)
    r = StaticSolver(m).solve()
    for s in r.element_stresses:
        if s.sigma_y_top is None or s.sigma_y_bot is None:
            continue
        delta_top = s.sigma_y_top - s.sigma_y
        delta_bot = s.sigma_y_bot - s.sigma_y
        # delta_top ≈ -delta_bot (antisimmetria)
        scale = max(abs(delta_top), abs(delta_bot), 1.0)
        assert abs(delta_top + delta_bot) / scale < 1e-9, (
            f"el {s.element_id}: top+bot non antisimmetrico "
            f"({delta_top:.3e}, {delta_bot:.3e})"
        )


def test_le10_mitc_has_bending_stress_nonzero():
    """LE10 con SHELL_Q4_MITC: bending recovery attivo (era 0 pre-fix)."""
    m = _build_le10(nx=8, ny=8, p=1e6, element_type=ElementType.SHELL_Q4_MITC)
    r = StaticSolver(m).solve()
    sigma_top_vals = [
        abs(s.sigma_y_top) for s in r.element_stresses
        if s.sigma_y_top is not None
    ]
    assert len(sigma_top_vals) > 0
    assert max(sigma_top_vals) > 1e3


def test_le1_membrane_unchanged_post_fix():
    """
    Sanity: LE1 (problema di membrana piana) deve preservare il
    comportamento esistente di sigma_y membrana. Bending può essere
    presente ma sigma_y (membrana) deve restare significativo.
    """
    m = _build_le1(nx=12, ny=12, et=ElementType.SHELL_Q4)
    r = StaticSolver(m).solve()
    sigma_y_vals = [abs(s.sigma_y) for s in r.element_stresses]
    # Per LE1 c'e' tensione membrana significativa
    assert max(sigma_y_vals) > 1e7, (
        f"max|sigma_y membrana|={max(sigma_y_vals):.3e} Pa, "
        "atteso > 10 MPa per LE1"
    )


def test_beam_has_no_shell_bending_fields():
    """
    BEAM2D/3D non hanno campi shell bending popolati (sigma_y_top etc. = None).
    Sanity: il fix shell non interferisce con beam/truss.
    """
    from nafems.test_le2_cylindrical_cantilever import _build_cantilever
    m = _build_cantilever(n_div=10)
    r = StaticSolver(m).solve()
    # I beam elements non hanno entries in element_stresses con sigma_y_top
    for s in r.element_stresses:
        # Sono ammessi None o assenza
        assert s.sigma_y_top is None, (
            f"BEAM el {s.element_id} ha sigma_y_top={s.sigma_y_top}, atteso None"
        )
        assert s.M_x is None, f"BEAM el {s.element_id} ha M_x={s.M_x}, atteso None"
