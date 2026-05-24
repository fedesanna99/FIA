"""
Verifica empirica del sign LE10 σ_y_top post v2.4.3c.

Sprint 2 (v2.4.3b) ha rilevato sintomo: σ_y_top = +2.21 MPa vs target
NAFEMS = -5.38 MPa (segno opposto). 4 cause candidate:
    (A) punto D "top" vs "bottom" mal interpretato
    (B) convenzione θ invertita
    (C) errore segno in B_b matrix
    (D) stress recovery al centroide invece che al nodo

Sprint 3 (v2.4.3c) ha chiuso (D) via extrapolation Gauss → nodi +
shell_nodal_stresses API.

Questo script verifica empiricamente: il segno è ora corretto, o no?
"""
from __future__ import annotations
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.abspath(os.path.join(HERE, "..")))
sys.path.insert(0, os.path.abspath(os.path.join(HERE, "..", "tests")))

from nafems.test_le10_thick_plate import _build_le10
from schemas import ElementType
from core.solver import StaticSolver


# NAFEMS LE10 target ufficiale: σ_y_top punto D = -5.38 MPa
# Negativo perché la fibra superiore di una piastra in flessione verso il
# basso (sotto pressione p > 0) è in COMPRESSIONE.
TARGET_NAFEMS = -5.38e6  # Pa


def check_le10_sign(et: ElementType, nx: int = 8):
    """Confronta i 2 metodi (centroide vs nodale) per σ_y_top al punto D."""
    m = _build_le10(nx=nx, ny=nx, p=1e6, element_type=et)
    r = StaticSolver(m).solve()

    # Punto D = centro piastra (più vicino a 0,0)
    nd_D = min(m.nodes, key=lambda n: n.x ** 2 + n.y ** 2)
    print(f"\n=== LE10 {et.value} mesh {nx}x{nx} ===")
    print(f"Punto D: nodo {nd_D.id} @ ({nd_D.x:.3f}, {nd_D.y:.3f})")

    # METODO LEGACY (pre v2.4.3c): media stresses elementi adiacenti (centroide)
    adj = [el.id for el in m.elements if nd_D.id in el.nodes]
    tops = [
        s.sigma_y_top for s in r.element_stresses
        if s.element_id in adj and s.sigma_y_top is not None
    ]
    sigma_top_centroid = (sum(tops) / len(tops)) if tops else float("nan")

    # METODO NUOVO (v2.4.3c): shell_nodal_stresses (extrapolation + averaging)
    nodal_D = next(
        (s for s in r.shell_nodal_stresses if s.node_id == nd_D.id), None
    )
    sigma_top_nodal = nodal_D.sigma_y_top if nodal_D else None

    print(f"  Target NAFEMS:                 {TARGET_NAFEMS:>+.3e} Pa  (-)")
    print(f"  Method centroid (legacy):      {sigma_top_centroid:>+.3e} Pa  ({'+' if sigma_top_centroid >= 0 else '-'})")
    if sigma_top_nodal is not None:
        print(f"  Method nodal @ D (v2.4.3c):    {sigma_top_nodal:>+.3e} Pa  ({'+' if sigma_top_nodal >= 0 else '-'})")
        err_pct = abs(sigma_top_nodal - TARGET_NAFEMS) / abs(TARGET_NAFEMS) * 100
        sign_match = (sigma_top_nodal * TARGET_NAFEMS) > 0
        print(f"  Errore nodal vs NAFEMS:        {err_pct:.1f}%")
        print(f"  >>> SEGNO MATCHA TARGET: {'YES ✓' if sign_match else 'NO ✗'}")
        return sign_match, sigma_top_nodal, err_pct
    print("  Method nodal @ D:               NOT AVAILABLE (campo mancante)")
    return None, None, None


def main():
    print("=" * 75)
    print("LE10 sign verification — post v2.4.3c (NEW-4-followup-segno)")
    print("=" * 75)

    # Test Q4 standard
    print("\n>>> SHELL_Q4 (formulation standard Mindlin) <<<")
    q4_match, q4_val, q4_err = check_le10_sign(ElementType.SHELL_Q4, nx=8)

    # Test MITC (NOTA: NEW-3-followup noto, MITC produce uz 37× Q4)
    print("\n>>> SHELL_Q4_MITC (NOTA: bug NEW-3-followup noto in formulation) <<<")
    mitc_match, mitc_val, mitc_err = check_le10_sign(ElementType.SHELL_Q4_MITC, nx=8)

    # Verdetto
    print()
    print("=" * 75)
    print("VERDETTO")
    print("=" * 75)
    if q4_match is True:
        print(f"  Q4 SCENARIO A: segno CORRETTO ({q4_val:+.3e} Pa, err {q4_err:.1f}%)")
        print("  NEW-4-followup-segno → CHIUSO come bonus di v2.4.3c")
    elif q4_match is False:
        print(f"  Q4 SCENARIO B: segno SBAGLIATO ({q4_val:+.3e} Pa, target negativo)")
        print("  NEW-4-followup-segno → resta APERTO, brief dedicato necessario")
    else:
        print("  Q4 SCENARIO C: errore tecnico (nodal stress non disponibile)")


if __name__ == "__main__":
    main()
