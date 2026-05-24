"""
Diagnostic test per la convenzione interna di B_b e M_x in ShellQuad4
(v2.4.4 Phase 2.0).

Strategia:
1. Costruisce 1 elemento Q4 piatto 1m×1m
2. Applica campo lineare θ_x(x,y) = -1.0 * x sui 4 nodi
   - nodo 0 (0,0): θ_x = 0
   - nodo 1 (1,0): θ_x = -1
   - nodo 2 (1,1): θ_x = -1
   - nodo 3 (0,1): θ_x = 0
3. Calcola M_x ricostruendo manualmente il codice di stresses_at_nodes
4. Confronta con le 2 convenzioni note:
   - Bathe FEM §5.4 (Mindlin "section rotation"): M_x = +D · ∂θ_x/∂x = -D
   - Timoshenko "engineering" sign-reversed: M_x = -D · ∂θ_x/∂x = +D
5. Poi su una piastra 2×2 sotto pressione p>0 verso il basso, verifica
   che σ_y_top abbia il segno fisicamente corretto (NEG = compressione).
"""
from __future__ import annotations
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.abspath(os.path.join(HERE, "..")))
sys.path.insert(0, os.path.abspath(os.path.join(HERE, "..", "tests")))

import numpy as np

from schemas import (
    FEAModel, Node, Element, Load, Constraint,
    ElementType, LoadType, ConstraintType,
    Section, SECTIONS_DB,
)
from core.solver import StaticSolver
from core.elements.shell_quad4 import ShellQuad4


def _ensure_section(sec_id: str, t: float) -> None:
    if sec_id not in SECTIONS_DB:
        SECTIONS_DB[sec_id] = Section(
            id=sec_id, name=f"Test {sec_id}",
            type="custom", A=t, Iy=0, Iz=0, J=0, thickness=t,
        )


def test_single_element_kappa_x():
    """Test 1 elemento Q4 con campo θ_x lineare → misura M_x."""
    print("=" * 80)
    print("TEST 1 · Single Q4 element, applied θ_x = -1.0 * x (linear in x)")
    print("=" * 80)

    E, nu, t = 210e9, 0.3, 0.1
    sec_id = "diag_test_shell_t100"
    _ensure_section(sec_id, t)

    # Quad piatto 1×1 m, piano xy globale, z up
    coords = [
        np.array([0.0, 0.0, 0.0]),
        np.array([1.0, 0.0, 0.0]),
        np.array([1.0, 1.0, 0.0]),
        np.array([0.0, 1.0, 0.0]),
    ]
    el = ShellQuad4(coords, E=E, nu=nu, t=t)

    # Campo θ_x(x) = -1.0 * x sui 4 nodi
    # u_global_24 = [u_x, u_y, u_z, theta_x, theta_y, theta_z] × 4 nodi
    u_g24 = np.zeros(24)
    for i, c in enumerate(coords):
        u_g24[6 * i + 3] = -1.0 * c[0]  # theta_x = -x

    # Calcola M_x via la funzione di postprocess attuale
    node_stresses = el.stresses_at_nodes(u_g24)

    # M_x al centroide = media dei 4 nodi
    M_x_avg = sum(n["M_x"] for n in node_stresses) / 4.0
    M_y_avg = sum(n["M_y"] for n in node_stresses) / 4.0

    # Atteso teorico:
    D_p_00 = E * t ** 3 / (12 * (1 - nu ** 2))  # diagonal element of D_b
    print(f"D_p[0,0] = E·t³/(12·(1−ν²)) = {D_p_00:.4e} N·m")
    print()
    print(f"Atteso (Bathe Mindlin §5.4, κ_x = ∂θ_x/∂x = -1):")
    print(f"  M_x = +D · κ_x = {-D_p_00:+.4e} N·m  (negativo)")
    print()
    print(f"Misurato dal codice:")
    print(f"  M_x = {M_x_avg:+.4e} N·m")
    print(f"  M_y = {M_y_avg:+.4e} N·m  (atteso 0)")
    print()
    print(f"Rapporto misurato/atteso = {M_x_avg / (-D_p_00):.4f}")
    if abs(M_x_avg - (-D_p_00)) / abs(D_p_00) < 0.05:
        print("  → MATCH Bathe Mindlin convention (M_x = +D·κ_x)")
        convention = "BATHE_MINDLIN"
    elif abs(M_x_avg - (+D_p_00)) / abs(D_p_00) < 0.05:
        print("  → MATCH Timoshenko convention (M_x = -D·κ_x, opposite sign)")
        convention = "TIMOSHENKO"
    else:
        print("  → CONVENZIONE NON IDENTIFICATA (errore numerico significativo)")
        convention = "UNKNOWN"

    return convention, M_x_avg, D_p_00


def test_plate_under_pressure():
    """Test piastra 2×2 SS sotto pressione p>0 → segno σ_y_top atteso negativo."""
    print()
    print("=" * 80)
    print("TEST 2 · Plate 2×2m simply supported under p=1MPa (z up convention)")
    print("=" * 80)

    E, nu, t, p = 210e9, 0.3, 0.1, 1e6
    L = 2.0
    sec_id = "diag_plate_t100"
    _ensure_section(sec_id, t)

    # Mesh strutturata 4×4 quads
    n = 4
    nodes = []
    nid = 0
    for j in range(n + 1):
        for i in range(n + 1):
            nid += 1
            nodes.append(Node(id=nid, x=L * i / n, y=L * j / n, z=0.0))

    elements = []
    eid = 0
    def node_idx(i, j):
        return j * (n + 1) + i + 1
    for j in range(n):
        for i in range(n):
            eid += 1
            elements.append(Element(
                id=eid, type=ElementType.SHELL_Q4,
                nodes=[node_idx(i, j), node_idx(i + 1, j),
                       node_idx(i + 1, j + 1), node_idx(i, j + 1)],
                material_id="steel_s355", section_id=sec_id,
            ))

    # Vincoli: simply supported sui 4 bordi
    constraints = []
    cid = 0
    for nd in nodes:
        on_boundary = (
            abs(nd.x) < 1e-9 or abs(nd.x - L) < 1e-9
            or abs(nd.y) < 1e-9 or abs(nd.y - L) < 1e-9
        )
        if on_boundary:
            cid += 1
            constraints.append(Constraint(
                id=cid, type=ConstraintType.CUSTOM, node_id=nd.id,
                # Simply supported: w=0 sui bordi; lasciar libere ux/uy/θ
                dofs=[False, False, True, False, False, False],
            ))

    loads = [
        Load(id=i + 1, type=LoadType.PRESSURE, target_id=el.id, pressure=p)
        for i, el in enumerate(elements)
    ]
    m = FEAModel(
        id="diag_plate", name="diag plate", is_3d=True,
        nodes=nodes, elements=elements,
        constraints=constraints, loads=loads,
    )

    r = StaticSolver(m).solve()
    max_uz = max(abs(d.uz) for d in r.displacements)
    uz_center = next(
        d.uz for d in r.displacements
        if abs(nodes[d.node_id - 1].x - L / 2) < 1e-6
        and abs(nodes[d.node_id - 1].y - L / 2) < 1e-6
    )
    print(f"max|uz| = {max_uz:.4e} m")
    print(f"uz al centro = {uz_center:+.4e} m  ({'verso il basso (z down deflection)' if uz_center < 0 else 'verso l alto (z up deflection!)'})")

    # σ_y_top al centro
    nd_center = next(
        nd for nd in nodes
        if abs(nd.x - L / 2) < 1e-6 and abs(nd.y - L / 2) < 1e-6
    )
    nodal_center = next(
        (s for s in r.shell_nodal_stresses if s.node_id == nd_center.id), None
    )
    if nodal_center is None:
        print("ERROR: no shell_nodal_stresses for center node")
        return
    print()
    print(f"σ_y al centro (membrana): {nodal_center.sigma_y:+.4e} Pa  (atteso ~0 per piastra)")
    print(f"σ_y_top al centro:        {nodal_center.sigma_y_top:+.4e} Pa")
    print(f"σ_y_bot al centro:        {nodal_center.sigma_y_bot:+.4e} Pa")
    print(f"M_y al centro:            {nodal_center.M_y:+.4e} N·m/m")
    print()

    # Fisica attesa (convenzione z up, p > 0 spinge verso il basso):
    # - w_center < 0 (deflessione verso il basso)
    # - piastra concava verso l'alto al centro: w_xx > 0
    # - fibra TOP (z = +t/2) in COMPRESSIONE → σ_y_top < 0
    if nodal_center.sigma_y_top < 0:
        print("→ Segno σ_y_top corretto (NEG = compressione, fisicamente atteso)")
    else:
        print("→ Segno σ_y_top OPPOSTO fisica (atteso NEG, ottenuto POS)")
        print("  Sospetto: M_x_output = -M_x_internal (sign convention flip)")
        print("  Conversion factor candidato: σ_top = σ_m - 6M/t² (segno opposto)")

    # uz sign analysis: if uz_center > 0 → convenzione interna "z down"
    if uz_center > 0:
        print(f"→ uz_center > 0 con p>0 ↑ verso il basso: SOLVER usa convenzione 'z down'")
        print("  In quel caso il segno σ_top POS può essere coerente (= compressione)")


if __name__ == "__main__":
    conv, Mx, Dp = test_single_element_kappa_x()
    test_plate_under_pressure()
    print()
    print("=" * 80)
    print("CONCLUSIONE")
    print("=" * 80)
    print(f"Convenzione M_x interna identificata: {conv}")
    print()
    if conv == "BATHE_MINDLIN":
        print("Per σ_top fisicamente corretto (z up, neg=compr) servirebbe:")
        print("  σ_top = σ_m + 6·M_x / t²    [se uz<0 con p>0]")
        print("  σ_top = σ_m - 6·M_x / t²    [se uz>0 con p>0, conv z-down]")
    elif conv == "TIMOSHENKO":
        print("Per σ_top fisicamente corretto (z up, neg=compr) servirebbe:")
        print("  σ_top = σ_m - 6·M_x / t²    [con conv Timoshenko M = -D·κ]")
