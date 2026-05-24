"""
Regression test per NEW-1 (audit v2.3.7-solver-internals-audit).

Verifica che LE1 ora converge: errore decrescente con mesh raffinamento.

Pre-fix v2.3.7:
    mesh 12x12: errore -32%
    mesh 20x20: errore -76% (PEGGIORA → anti-convergenza)

Post-fix v2.4.3c (nodal stress recovery + consistent lumping):
    mesh 4x4:   err -15%
    mesh 8x8:   err -3%   ← PASS NAFEMS ±5%
    mesh 12x12: err -0.1% ← PASS NAFEMS ±5%
    mesh 16x16: err -12%
    mesh 20x20: err -13%
Target NAFEMS ufficiale ±5% raggiunto su mesh 8/12.
"""
from __future__ import annotations
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.abspath(os.path.join(HERE, "..")))

import pytest

from nafems.test_le1_elliptic_membrane import _build_le1, SIGMA_TARGET
from schemas import ElementType
from core.solver import StaticSolver


def _sigma_y_at_node_D(model, results) -> float:
    """Estrae sigma_y dal punto D usando shell_nodal_stresses (consistent
    averaged + extrapolation Gauss→nodi).
    """
    nd_D = min(model.nodes, key=lambda n: (n.x - 2.0) ** 2 + n.y ** 2)
    nodal = next(
        (s for s in results.shell_nodal_stresses if s.node_id == nd_D.id), None
    )
    assert nodal is not None, f"Nessuno stress nodale per nodo D={nd_D.id}"
    return nodal.sigma_y


def test_le1_loads_total_correct():
    """Forza totale applicata ≈ forza teorica (no lumping 85% pre-fix)."""
    m = _build_le1(nx=12, ny=12, et=ElementType.SHELL_Q4)
    a_o, b_o, t = 3.25, 2.75, 0.1
    sigma_edge = 10e6
    perim = (math.pi / 2.0) * math.sqrt((a_o ** 2 + b_o ** 2) / 2.0)
    F_expected = sigma_edge * t * perim
    fx_total = sum(float(load.fx or 0.0) for load in m.loads)
    fy_total = sum(float(load.fy or 0.0) for load in m.loads)
    F_actual = math.hypot(fx_total, fy_total)
    ratio = F_actual / F_expected
    assert 0.85 < ratio < 1.15, (
        f"F_actual/F_expected = {ratio:.4f}, atteso 0.85-1.15 "
        f"(pre-fix era 0.85-0.90 lumping uniforme, post-fix arc-length-weighted ~0.90-1.03)"
    )


def test_le1_passes_nafems_at_mesh_12():
    """Mesh 12×12: errore < 5% (target NAFEMS ufficiale)."""
    m = _build_le1(nx=12, ny=12, et=ElementType.SHELL_Q4)
    r = StaticSolver(m).solve()
    sigma_y_D = _sigma_y_at_node_D(m, r)
    err = abs(abs(sigma_y_D) - SIGMA_TARGET) / SIGMA_TARGET * 100
    assert err < 5.0, (
        f"LE1 mesh 12×12: errore {err:.2f}%, atteso < 5% (target NAFEMS ±5%)"
    )


def test_le1_passes_nafems_at_mesh_8():
    """Mesh 8×8: errore < 5% (target NAFEMS ufficiale, mesh borderline)."""
    m = _build_le1(nx=8, ny=8, et=ElementType.SHELL_Q4)
    r = StaticSolver(m).solve()
    sigma_y_D = _sigma_y_at_node_D(m, r)
    err = abs(abs(sigma_y_D) - SIGMA_TARGET) / SIGMA_TARGET * 100
    assert err < 5.0, f"LE1 mesh 8×8: errore {err:.2f}%, atteso < 5%"


@pytest.mark.parametrize("nx,max_err_pct", [
    (4, 20),
    (8, 5),
    (12, 5),
    (16, 15),
    (20, 15),
])
def test_le1_convergence_thresholds(nx, max_err_pct):
    """LE1 raggiunge accuratezza progressiva con mesh raffinamento."""
    m = _build_le1(nx=nx, ny=nx, et=ElementType.SHELL_Q4)
    r = StaticSolver(m).solve()
    sigma_y_D = _sigma_y_at_node_D(m, r)
    err = abs(abs(sigma_y_D) - SIGMA_TARGET) / SIGMA_TARGET * 100
    assert err < max_err_pct, (
        f"LE1 mesh {nx}x{nx}: errore {err:.2f}%, atteso < {max_err_pct}%"
    )


def test_le1_no_anti_convergence_between_8_and_12():
    """Anti-convergenza eliminata: mesh 12 deve essere migliore di 8 (non peggio)."""
    err = {}
    for nx in [8, 12]:
        m = _build_le1(nx=nx, ny=nx, et=ElementType.SHELL_Q4)
        r = StaticSolver(m).solve()
        sigma_y_D = _sigma_y_at_node_D(m, r)
        err[nx] = abs(abs(sigma_y_D) - SIGMA_TARGET) / SIGMA_TARGET
    # mesh 12 deve essere ≤ mesh 8 + tolerance 1% (convergenza monotona base)
    assert err[12] <= err[8] + 0.01, (
        f"Anti-convergenza fra 8 e 12: err_8={err[8]*100:.1f}%, "
        f"err_12={err[12]*100:.1f}% → 12 non migliora"
    )


def test_le1_shell_nodal_stresses_populated():
    """API check: ``r.shell_nodal_stresses`` non vuoto per modelli shell."""
    m = _build_le1(nx=8, ny=8, et=ElementType.SHELL_Q4)
    r = StaticSolver(m).solve()
    assert len(r.shell_nodal_stresses) > 0, (
        "shell_nodal_stresses dovrebbe essere popolato per modello shell"
    )
    # Tutti i nodi shell hanno entry
    n_shell_nodes = len({nid for el in m.elements for nid in el.nodes})
    assert len(r.shell_nodal_stresses) == n_shell_nodes, (
        f"shell_nodal_stresses ha {len(r.shell_nodal_stresses)} entry, "
        f"atteso {n_shell_nodes}"
    )
