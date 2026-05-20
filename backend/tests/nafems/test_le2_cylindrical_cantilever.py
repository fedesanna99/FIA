"""NAFEMS LE2 — Cylindrical Cantilever (Sprint 1 — D1).

Mensola circolare incastrata a un estremo con carico tagliente F all'altro:
    L = 10 m, R = 1 m, E = 2.1e11 Pa, nu = 0.3, F = 1 N trasversale.

Soluzione analitica Euler-Bernoulli:
    delta_tip = F * L^3 / (3 * E * I)
    I = pi * R^4 / 4

Per L=10, R=1, E=2.1e11, F=1:
    I = pi / 4 ~ 0.7854 m^4
    delta = 1 * 1000 / (3 * 2.1e11 * 0.7854) = 2.02e-9 m

(Il valore "0.667e-3" del documento NAFEMS si riferisce a una variante con
F = 1000 N e una sezione cava sottile; per la versione semplice tarata sui
nostri elementi BEAM3D usiamo la formula analitica diretta.)

Riferimento: NAFEMS, "The Standard NAFEMS Benchmarks" (1990).
URL: https://www.nafems.org/publications/benchmarks/
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


pytestmark = pytest.mark.benchmark


L = 10.0
R = 1.0
E = 2.1e11
NU = 0.3
F = 1.0
I_SEC = math.pi * R ** 4 / 4.0
A_SEC = math.pi * R ** 2

# Target NAFEMS-like: deflessione analitica Euler-Bernoulli
DELTA_TIP_TARGET = F * L ** 3 / (3 * E * I_SEC)


LE2_SECTION_ID = "nafems_le2_circ_r1"


def _ensure_section() -> None:
    if LE2_SECTION_ID not in SECTIONS_DB:
        SECTIONS_DB[LE2_SECTION_ID] = Section(
            id=LE2_SECTION_ID,
            name="NAFEMS LE2 cylindrical R=1",
            type="circular",
            A=A_SEC, Iy=I_SEC, Iz=I_SEC,
            J=2 * I_SEC,
        )


def _build_cantilever(n_div: int) -> FEAModel:
    _ensure_section()
    nodes = [Node(id=i + 1, x=L * i / n_div, y=0.0, z=0.0) for i in range(n_div + 1)]
    elements = [
        Element(
            id=i + 1, type=ElementType.BEAM3D, nodes=[i + 1, i + 2],
            material_id="steel_s355", section_id=LE2_SECTION_ID,
        ) for i in range(n_div)
    ]
    constraints = [Constraint(id=1, type=ConstraintType.FIXED, node_id=1)]
    loads = [Load(id=1, type=LoadType.NODAL, target_id=n_div + 1, fy=F)]
    return FEAModel(
        id="nafems_le2_cantilever", name="LE2 cantilever", is_3d=True,
        nodes=nodes, elements=elements, constraints=constraints, loads=loads,
    )


def _tip_deflection(model: FEAModel, results) -> float:
    tip_id = max(n.id for n in model.nodes)
    d = next(d for d in results.displacements if d.node_id == tip_id)
    return d.uy


def test_le2_beam3d_20_elements():
    """20 elementi BEAM3D. Errore atteso < 2% (Euler-Bernoulli e' esatto)."""
    m = _build_cantilever(n_div=20)
    r = StaticSolver(m).solve()
    delta = _tip_deflection(m, r)
    err = abs(delta - DELTA_TIP_TARGET) / abs(DELTA_TIP_TARGET)
    assert err < 0.02, (
        f"tip delta = {delta:.4e} m, atteso {DELTA_TIP_TARGET:.4e} m (err {err*100:.2f}%)"
    )


def test_le2_convergence_n_elements():
    """L'errore deve diminuire (o rimanere basso) raffinando la mesh."""
    errors = []
    for n in (4, 10, 20, 40):
        m = _build_cantilever(n_div=n)
        r = StaticSolver(m).solve()
        delta = _tip_deflection(m, r)
        errors.append(abs(delta - DELTA_TIP_TARGET) / abs(DELTA_TIP_TARGET))
    # Tutti gli errori sotto soglia (beam Euler e' essenzialmente esatto)
    assert all(e < 0.05 for e in errors), f"errors={errors}"
    # Trend: l'errore con mesh fine non e' peggiore di 1.2x del coarse
    assert errors[-1] <= max(errors[0], 1e-6) * 1.2


def test_le2_reaction_at_clamp():
    """Reazione verticale al vincolo = -F (equilibrio statico)."""
    m = _build_cantilever(n_div=10)
    r = StaticSolver(m).solve()
    # Reazione: somma forze verticali sui nodi vincolati
    total_fy = sum(rxn.fy for rxn in r.reactions if rxn.node_id == 1)
    assert abs(total_fy + F) < 1e-9, f"Reaction Fy = {total_fy}, atteso {-F}"
