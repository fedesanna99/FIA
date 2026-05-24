"""NAFEMS Truth Measurement Script (v2.3.5 diagnostic audit).

Esegue i benchmark NAFEMS (LE1, LE2, LE10) + cantilever tip + Euler buckling
con tutte le mesh size disponibili e MISURA il valore di output, confrontandolo
con il target ufficiale NAFEMS / teoria analitica.

NON è un test pytest. È uno script di misurazione che produce un report tabellare
su stdout.

Uso (dal repo root):
    cd backend
    python scripts/nafems_truth_measurement.py 2>&1 | tee /tmp/nafems_measurement.log

Output: tabella per benchmark che mostra:
- Element type
- Mesh size
- Valore misurato
- Target NAFEMS / analitico
- Errore %
- Sarebbe PASS con tolleranza NAFEMS ufficiale?

NON modifica file di test e NON modifica il solver.
"""
from __future__ import annotations
import math
import os
import sys
import traceback

# Aggiungi backend/ e backend/tests/ a sys.path (siamo in backend/scripts/)
HERE = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.abspath(os.path.join(HERE, ".."))
sys.path.insert(0, BACKEND_DIR)
sys.path.insert(0, os.path.join(BACKEND_DIR, "tests"))


def _hline(c: str = "=", n: int = 88) -> None:
    print(c * n)


# ─────────────────────────────────────────────────────────────────────────────
# LE1 — Elliptic Membrane (σ_y target = 92.7 MPa ±5%)
# ─────────────────────────────────────────────────────────────────────────────
def measure_le1() -> None:
    try:
        from nafems.test_le1_elliptic_membrane import (
            _build_le1,
            _sigma_y_at_point_D,
            SIGMA_TARGET as LE1_TARGET,
        )
        from core.solver import StaticSolver
        from schemas import ElementType
    except Exception as e:
        print(f"\n[LE1] IMPORT ERROR: {e}\n")
        traceback.print_exc()
        return

    _hline()
    print("NAFEMS LE1 · Elliptic Membrane")
    print(f"Target NAFEMS ufficiale: σ_y(D) = {LE1_TARGET/1e6:.2f} MPa ±5%")
    print(f"Tolleranza nei test attuali: {LE1_TARGET/5/1e6:.2f}–{LE1_TARGET*5/1e6:.2f} MPa (±400% / ÷5..×5)")
    _hline()
    print(f"{'Element':<14}{'Mesh':<8}{'σ_y meas (MPa)':>16}{'Err %':>10}{'NAFEMS ±5%':>14}{'NAFEMS ±10%':>14}")
    print("-" * 88)

    best = {}
    for et in [ElementType.SHELL_Q4, ElementType.SHELL_Q4_MITC, ElementType.TRI3]:
        for nx in [4, 6, 8, 10, 12, 16, 20]:
            try:
                m = _build_le1(nx=nx, ny=nx, et=et)
                r = StaticSolver(m).solve()
                sigma_D = _sigma_y_at_point_D(m, r)
                # NAFEMS reference: σ_y POSITIVO (trazione) al punto D
                # quindi confrontiamo abs(sigma_D) con LE1_TARGET
                err_pct = (abs(sigma_D) - LE1_TARGET) / LE1_TARGET * 100
                pass5 = "PASS ✓" if abs(err_pct) <= 5.0 else "FAIL ✗"
                pass10 = "PASS ✓" if abs(err_pct) <= 10.0 else "FAIL ✗"
                print(
                    f"{et.value:<14}{nx}x{nx:<6}{abs(sigma_D)/1e6:>14.2f}"
                    f"{err_pct:>+9.1f}%{pass5:>14}{pass10:>14}"
                )
                key = et.value
                if key not in best or abs(err_pct) < abs(best[key][1]):
                    best[key] = (nx, err_pct, abs(sigma_D) / 1e6)
            except Exception as e:
                print(f"{et.value:<14}{nx}x{nx:<6} ERROR: {str(e)[:60]}")
    print()
    print("Best per element type (errore minimo):")
    for et, (nx, err, val) in best.items():
        print(f"  {et:<14} mesh {nx}x{nx}: σ_y = {val:.2f} MPa, err {err:+.1f}%")
    print()


# ─────────────────────────────────────────────────────────────────────────────
# LE2 — Cylindrical Cantilever (δ_tip target Euler-Bernoulli)
# ─────────────────────────────────────────────────────────────────────────────
def measure_le2() -> None:
    try:
        from nafems.test_le2_cylindrical_cantilever import (
            _build_cantilever,
            _tip_deflection,
            DELTA_TIP_TARGET,
        )
        from core.solver import StaticSolver
    except Exception as e:
        print(f"\n[LE2] IMPORT ERROR: {e}\n")
        return

    _hline()
    print("NAFEMS LE2 · Cylindrical Cantilever (Euler-Bernoulli reference)")
    print(f"Target analitico: δ_tip = {DELTA_TIP_TARGET*1e9:.3f} nm")
    print(f"Tolleranza nei test attuali: ±2% (test_le2_beam3d_20_elements)")
    _hline()
    print(f"{'n_div':>6}{'δ_tip (m)':>20}{'Err %':>12}{'±2% NAFEMS-like':>18}")
    print("-" * 88)

    for n_div in [2, 4, 10, 20, 40, 100]:
        try:
            m = _build_cantilever(n_div=n_div)
            r = StaticSolver(m).solve()
            d = _tip_deflection(m, r)
            err = (d - DELTA_TIP_TARGET) / abs(DELTA_TIP_TARGET) * 100
            ok = "PASS ✓" if abs(err) <= 2.0 else "FAIL ✗"
            print(f"{n_div:>6}{d:>20.6e}{err:>+11.3f}%{ok:>18}")
        except Exception as e:
            print(f"{n_div:>6} ERROR: {str(e)[:60]}")
    print()


# ─────────────────────────────────────────────────────────────────────────────
# LE10 — Thick Plate (σ_yy target = -5.38 MPa ±10%) + max|uz|
# ─────────────────────────────────────────────────────────────────────────────
def measure_le10() -> None:
    try:
        from nafems.test_le10_thick_plate import _build_le10, _expected_w_order
        from core.solver import StaticSolver
        from schemas import ElementType
    except Exception as e:
        print(f"\n[LE10] IMPORT ERROR: {e}\n")
        traceback.print_exc()
        return

    _hline()
    print("NAFEMS LE10 · Thick Plate (target σ_yy(D) = -5.38 MPa ±10%)")
    print("(Test attuali misurano max|uz|, NON σ_yy: vedi audit report)")
    _hline()
    LE10_SIGMA_TARGET = -5.38e6  # Pa
    LE10_TOLERANCE_PCT = 10.0

    print(f"{'Element':<18}{'Mesh':<8}{'σ_yy@D (MPa)':>15}{'max|uz| (mm)':>16}{'σ-err %':>10}{'±10% NAFEMS':>14}")
    print("-" * 88)

    best = {}
    for et in [ElementType.SHELL_Q4, ElementType.SHELL_Q4_MITC]:
        for nx in [4, 6, 8, 10, 12, 16]:
            try:
                m = _build_le10(nx=nx, ny=nx, p=1e6, element_type=et)
                r = StaticSolver(m).solve()
                max_uz = max(abs(d.uz) for d in r.displacements)

                # Punto D del LE10: (x=2.0, y=0) sul piano medio
                # NAFEMS originale ha punto D = (2, 0) sull'asse minore esterno
                # ma con il foro a 0.5x0.5 il punto (2,0) è interno alla piastra.
                point_D = min(m.nodes, key=lambda n: (n.x - 2.0) ** 2 + n.y ** 2)
                eids = {el.id for el in m.elements if point_D.id in el.nodes}
                sigma_yy_vals = [s.sigma_y for s in r.element_stresses if s.element_id in eids]
                if sigma_yy_vals:
                    sigma_yy_D = sum(sigma_yy_vals) / len(sigma_yy_vals)
                    err_pct = (sigma_yy_D - LE10_SIGMA_TARGET) / abs(LE10_SIGMA_TARGET) * 100
                    ok = "PASS ✓" if abs(err_pct) <= LE10_TOLERANCE_PCT else "FAIL ✗"
                    sigma_str = f"{sigma_yy_D/1e6:.3f}"
                else:
                    sigma_yy_D = float("nan")
                    err_pct = float("nan")
                    ok = "(no stress)"
                    sigma_str = "n/a"

                print(
                    f"{et.value:<18}{nx}x{nx:<6}{sigma_str:>15}"
                    f"{max_uz*1000:>16.3f}{err_pct:>+9.1f}%{ok:>14}"
                )
                key = et.value
                if sigma_yy_vals:
                    if key not in best or abs(err_pct) < abs(best[key][1]):
                        best[key] = (nx, err_pct, sigma_yy_D / 1e6)
            except Exception as e:
                print(f"{et.value:<18}{nx}x{nx:<6} ERROR: {str(e)[:60]}")
    print()
    if best:
        print("Best σ_yy(D) per element type:")
        for et, (nx, err, val) in best.items():
            print(f"  {et:<18} mesh {nx}x{nx}: σ_yy = {val:.3f} MPa, err {err:+.1f}%")
    print()


# ─────────────────────────────────────────────────────────────────────────────
# Cantilever tip deflection (δ = PL³/3EI)
# ─────────────────────────────────────────────────────────────────────────────
def measure_cantilever_tip() -> None:
    try:
        from benchmarks.test_cantilever_tip_load import _build
        from core.solver import StaticSolver
    except Exception as e:
        print(f"\n[Cantilever] IMPORT ERROR: {e}\n")
        return

    _hline()
    print("Benchmark · Cantilever tip load (Euler-Bernoulli, δ = PL³/3EI)")
    _hline()
    L = 3.0
    P = -1000.0
    E = 210e9
    I = 8356e-8  # IPE 300
    expected = P * L ** 3 / (3.0 * E * I)
    print(f"Target: δ_tip = {expected:.6e} m (test attuale tolleranza ±2%)")
    print(f"{'n_div':>6}{'δ_tip (m)':>20}{'Err %':>12}{'±2%':>10}")
    print("-" * 60)
    for n_div in [1, 2, 4, 10, 20, 40, 100]:
        try:
            m = _build(n_div=n_div, L=L, P=P)
            r = StaticSolver(m).solve()
            tip = next(d for d in r.displacements if d.node_id == n_div + 1)
            err = (tip.uy - expected) / abs(expected) * 100
            ok = "PASS" if abs(err) <= 2.0 else "FAIL"
            print(f"{n_div:>6}{tip.uy:>20.6e}{err:>+11.3f}%{ok:>10}")
        except Exception as e:
            print(f"{n_div:>6} ERROR: {str(e)[:60]}")
    print()


# ─────────────────────────────────────────────────────────────────────────────
# Euler buckling (N_cr = π²EI/(KL)²)
# ─────────────────────────────────────────────────────────────────────────────
def measure_euler_buckling() -> None:
    try:
        from benchmarks.test_euler_buckling import _build_column_beam2d, _euler_load, _ensure_section
        from core.solver import BucklingSolver
        from schemas import ConstraintType
    except Exception as e:
        print(f"\n[Euler] IMPORT ERROR: {e}\n")
        return

    _ensure_section()

    _hline()
    print("Benchmark · Euler buckling (N_cr = π²EI/(KL)²)")
    _hline()
    L = 2.0
    P_ref = -1000.0

    print(f"{'Case':<28}{'K':>6}{'n_div':>8}{'N_cr meas (N)':>16}{'N_cr teor':>16}{'Err %':>10}")
    print("-" * 88)

    cases = [
        ("pinned-pinned", 1.0, ConstraintType.PINNED, ConstraintType.ROLLER_X),
        ("fixed-free (cantilever)", 2.0, ConstraintType.FIXED, None),
    ]
    for name, K, bc_base, bc_top in cases:
        for n_div in [10, 20, 40]:
            try:
                m = _build_column_beam2d(n_div=n_div, L=L, P_ref=P_ref,
                                         bc_base=bc_base, bc_top=bc_top)
                r = BucklingSolver(m, n_modes=3).solve()
                if r.get("n_modes", 0) > 0:
                    N_cr = abs(P_ref) * r["critical_factor"]
                    expected = _euler_load(K=K, L=L)
                    err = (N_cr - expected) / expected * 100
                    print(f"{name:<28}{K:>6.1f}{n_div:>8}{N_cr:>16.2f}{expected:>16.2f}{err:>+9.3f}%")
                else:
                    print(f"{name:<28}{K:>6.1f}{n_div:>8} no modes returned")
            except Exception as e:
                print(f"{name:<28}{K:>6.1f}{n_div:>8} ERROR: {str(e)[:50]}")
    print()


# ─────────────────────────────────────────────────────────────────────────────
# Singular matrix check
# ─────────────────────────────────────────────────────────────────────────────
def measure_singular_matrix_check() -> None:
    """Bug #30: Engine NON ferma su matrice singolare. Verifica empirica."""
    try:
        from schemas import (
            FEAModel, Node, Element, Load, Constraint,
            ElementType, LoadType, ConstraintType,
        )
        from core.solver import StaticSolver
    except Exception as e:
        print(f"\n[SingularMatrix] IMPORT ERROR: {e}\n")
        return

    _hline()
    print("Bug #30 · Singular matrix check (struttura labile)")
    _hline()

    # Caso 1: nessun vincolo (rigid body motion → K singolare)
    print("\nCASO 1 · 2 nodi, 1 beam, ZERO vincoli (rigid body free):")
    try:
        m = FEAModel(
            id="labile_1", name="no_constraints",
            is_3d=False,
            nodes=[Node(id=1, x=0, y=0, z=0), Node(id=2, x=1, y=0, z=0)],
            elements=[Element(id=1, type=ElementType.BEAM2D, nodes=[1, 2],
                              material_id="steel_s355", section_id="ipe_300")],
            constraints=[],
            loads=[Load(id=1, type=LoadType.NODAL, target_id=2, fy=-1000.0)],
        )
        r = StaticSolver(m).solve()
        max_u = max(abs(d.uy) for d in r.displacements)
        print(f"  → solver gira a buon fine")
        print(f"  → max|uy| = {max_u:.3e} m (atteso: o eccezione, o spostamenti grandi)")
        if max_u > 1.0:
            print(f"  ⚠️ spostamenti FOLLI ({max_u:.1e} m) — il solver NON ha rilevato singolarità")
        elif max_u < 1e-15:
            print(f"  ✓ spostamenti ~0 — pseudo-inversa o regolarizzazione (controllare)")
        else:
            print(f"  ⚠️ valore in mezzo, ambiguo")
    except Exception as e:
        print(f"  ✓ eccezione sollevata: {type(e).__name__}: {str(e)[:200]}")

    # Caso 2: 1 solo PINNED → 2 GdL ancora liberi (translazione + rotazione)
    print("\nCASO 2 · 5 nodi beam, SOLO 1 PINNED a x=0 (sottovincolato):")
    try:
        m = FEAModel(
            id="labile_2", name="single_pinned",
            is_3d=False,
            nodes=[Node(id=i + 1, x=i * 0.5, y=0, z=0) for i in range(5)],
            elements=[Element(id=i + 1, type=ElementType.BEAM2D, nodes=[i + 1, i + 2],
                              material_id="steel_s355", section_id="ipe_300")
                      for i in range(4)],
            constraints=[Constraint(id=1, type=ConstraintType.PINNED, node_id=1)],
            loads=[Load(id=1, type=LoadType.NODAL, target_id=5, fy=-1000.0)],
        )
        r = StaticSolver(m).solve()
        max_u = max(abs(d.uy) for d in r.displacements)
        print(f"  → solver gira a buon fine")
        print(f"  → max|uy| = {max_u:.3e} m")
        if max_u > 1e3:
            print(f"  ⚠️ spostamenti FOLLI ({max_u:.1e} m) — meccanismo non rilevato")
        else:
            print(f"  ✓ valore finito (pseudo-inversa? regolarizzazione?)")
    except Exception as e:
        print(f"  ✓ eccezione sollevata: {type(e).__name__}: {str(e)[:200]}")

    # Caso 3: 2 nodi sovrapposti (elemento di lunghezza zero)
    print("\nCASO 3 · 2 nodi SOVRAPPOSTI, 1 beam (L=0 → K singolare):")
    try:
        m = FEAModel(
            id="labile_3", name="zero_length",
            is_3d=False,
            nodes=[Node(id=1, x=0, y=0, z=0), Node(id=2, x=0, y=0, z=0)],
            elements=[Element(id=1, type=ElementType.BEAM2D, nodes=[1, 2],
                              material_id="steel_s355", section_id="ipe_300")],
            constraints=[Constraint(id=1, type=ConstraintType.FIXED, node_id=1)],
            loads=[Load(id=1, type=LoadType.NODAL, target_id=2, fy=-1000.0)],
        )
        r = StaticSolver(m).solve()
        max_u = max(abs(d.uy) for d in r.displacements)
        print(f"  → solver gira a buon fine: max|uy|={max_u:.3e} m")
    except Exception as e:
        print(f"  ✓ eccezione sollevata: {type(e).__name__}: {str(e)[:200]}")

    print()


# ─────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print()
    print("#" * 88)
    print("NAFEMS TRUTH MEASUREMENT — v2.3.5 diagnostic audit")
    print("Branch: test  ·  Solver: backend/core/solver/static_solver.py + buckling_solver.py")
    print("#" * 88)
    print()
    measure_le1()
    measure_le2()
    measure_le10()
    measure_cantilever_tip()
    measure_euler_buckling()
    measure_singular_matrix_check()
    print("#" * 88)
    print("END NAFEMS truth measurement")
    print("#" * 88)
