"""
LE1 stress recovery diagnostics (v2.3.7-solver-internals-audit).

Per ogni elemento adiacente al punto D (a_inner=2.0, y=0), stampa:
- sigma_x, sigma_y, tau_xy
- coordinate centroide dell'elemento
- distanza dal punto D

Permette di capire se il problema e' nello stress recovery o nella media.
"""
from __future__ import annotations
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.abspath(os.path.join(HERE, "..")))
sys.path.insert(0, os.path.abspath(os.path.join(HERE, "..", "tests")))

import numpy as np
from nafems.test_le1_elliptic_membrane import _build_le1, SIGMA_TARGET
from schemas import ElementType
from core.solver import StaticSolver


def diagnose_stress_recovery(nx: int = 12) -> None:
    m = _build_le1(nx=nx, ny=nx, et=ElementType.SHELL_Q4)
    r = StaticSolver(m).solve()

    nd_D = min(m.nodes, key=lambda n: (n.x - 2.0) ** 2 + n.y ** 2)
    print(f"Punto D: nodo {nd_D.id} @ ({nd_D.x:.4f}, {nd_D.y:.4f})")

    node_by_id = {n.id: np.array([n.x, n.y, n.z]) for n in m.nodes}
    adj_el = [el for el in m.elements if nd_D.id in el.nodes]
    print(f"Elementi adiacenti: {[el.id for el in adj_el]}")

    sigma_y_vals = []
    for el in adj_el:
        coords = np.array([node_by_id[nid] for nid in el.nodes])
        centroid = coords.mean(axis=0)
        d_to_D = float(np.linalg.norm(centroid - node_by_id[nd_D.id]))
        stress = next((s for s in r.element_stresses if s.element_id == el.id), None)
        if stress is None:
            print(f"  el {el.id:>3d}  centroid=({centroid[0]:.3f},{centroid[1]:.3f})  d={d_to_D:.4f}  NO STRESS")
            continue
        sx = stress.sigma_x; sy = stress.sigma_y
        sigma_y_vals.append(sy)
        txy = getattr(stress, "tau_xy", float("nan"))
        print(
            f"  el {el.id:>3d}  centroid=({centroid[0]:.3f},{centroid[1]:.3f})"
            f"  d={d_to_D:.4f}  sigma_x={sx:>+.3e}  sigma_y={sy:>+.3e}  tau_xy={txy:>+.3e}"
        )
    if sigma_y_vals:
        avg = sum(sigma_y_vals) / len(sigma_y_vals)
        err_pct = (abs(avg) - SIGMA_TARGET) / SIGMA_TARGET * 100
        print(f"\nMedia |sigma_y| al punto D: {abs(avg)/1e6:.2f} MPa "
              f"(target {SIGMA_TARGET/1e6:.2f} MPa, errore {err_pct:+.1f}%)")


if __name__ == "__main__":
    for nx in [8, 12, 16, 20]:
        print("=" * 88)
        print(f"LE1 stress recovery at point D — mesh {nx}x{nx}")
        print("=" * 88)
        diagnose_stress_recovery(nx)
        print()
