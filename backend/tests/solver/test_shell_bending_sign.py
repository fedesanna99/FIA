"""
Regression test per NEW-4-followup-segno (v2.4.4 Phase 2).

Verifica che σ_y_top al punto D di LE10 sia NEGATIVO (compressione
fibra top per piastra in flessione verso il basso) — convenzione fisica
standard Mindlin Bathe §5.4, z-up.

Pre-fix v2.4.4 produceva σ_y_top positivo (formula σ_top = σ_m + 6M/t²
con convenzione M_x = +D·κ_x Mindlin → segno opposto al fisico).

Post-fix: σ_top = σ_m − 6M/t² (formula corretta per Mindlin z-up).
"""
from __future__ import annotations
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.abspath(os.path.join(HERE, "..", "..")))
sys.path.insert(0, os.path.abspath(os.path.join(HERE, "..")))

from nafems.test_le10_thick_plate import _build_le10
from schemas import ElementType
from core.solver import StaticSolver


def test_le10_q4_sigma_y_top_negative():
    """Q4 LE10 mesh 8x8 punto D: σ_y_top < 0 (compressione fibra top)."""
    m = _build_le10(nx=8, ny=8, p=1e6, element_type=ElementType.SHELL_Q4)
    r = StaticSolver(m).solve()

    nd_D = min(m.nodes, key=lambda n: n.x ** 2 + n.y ** 2)
    nodal = next(
        (s for s in r.shell_nodal_stresses if s.node_id == nd_D.id), None
    )
    assert nodal is not None, f"shell_nodal_stresses mancante per nodo D={nd_D.id}"
    assert nodal.sigma_y_top is not None, "sigma_y_top non popolato"

    assert nodal.sigma_y_top < 0, (
        f"σ_y_top = {nodal.sigma_y_top:+.3e} Pa, atteso NEGATIVO "
        f"(compressione fibra top per piastra sotto p>0)"
    )


def test_le10_q4_sigma_y_top_magnitude_reasonable():
    """Q4 LE10 magnitudo |σ_y_top| entro un ordine di grandezza dal target NAFEMS.

    Target NAFEMS = -5.38 MPa. Q4 standard non eccelle in bending fine
    (non MITC), quindi accettiamo range [0.1× ÷ 10×] del target finché
    NEW-3-followup MITC non è chiuso per stress recovery più accurato.
    """
    target_modulo = 5.38e6
    m = _build_le10(nx=8, ny=8, p=1e6, element_type=ElementType.SHELL_Q4)
    r = StaticSolver(m).solve()

    nd_D = min(m.nodes, key=lambda n: n.x ** 2 + n.y ** 2)
    nodal = next(
        (s for s in r.shell_nodal_stresses if s.node_id == nd_D.id), None
    )
    assert nodal is not None

    modulo = abs(nodal.sigma_y_top)
    ratio = modulo / target_modulo
    assert 0.1 < ratio < 10.0, (
        f"|σ_y_top| = {modulo:.3e} Pa, ratio vs NAFEMS = {ratio:.2f}, "
        f"fuori range fisico [0.1, 10]"
    )


def test_le10_q4_bending_antisymmetry_preserved():
    """Sanity: σ_top e σ_bot restano antisimmetrici rispetto a σ_membrana
    post fix sign (delta_top = -delta_bot)."""
    m = _build_le10(nx=8, ny=8, p=1e6, element_type=ElementType.SHELL_Q4)
    r = StaticSolver(m).solve()

    nd_D = min(m.nodes, key=lambda n: n.x ** 2 + n.y ** 2)
    nodal = next(
        (s for s in r.shell_nodal_stresses if s.node_id == nd_D.id), None
    )
    assert nodal is not None

    delta_top = nodal.sigma_y_top - nodal.sigma_y
    delta_bot = nodal.sigma_y_bot - nodal.sigma_y
    # antisimmetria: delta_top ≈ -delta_bot
    assert abs(delta_top + delta_bot) < 1e-3 * (abs(delta_top) + 1.0), (
        f"top+bot non antisimmetrico ({delta_top:+.3e}, {delta_bot:+.3e})"
    )
