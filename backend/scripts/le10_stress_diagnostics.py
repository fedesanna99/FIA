"""
LE10 stress recovery diagnostics (v2.3.7-solver-internals-audit).

Per la mesh di LE10, stampa:
- max|uz|, max|rx|, max|ry| (verifica che rotazioni esistano = bending attivo)
- Per ogni elemento adiacente al punto D: sigma_x/y/xy (solo membrana per Q4)
- Campi attesi se postprocess fosse esteso: M_x, M_y, sigma_y_top, sigma_y_bot

Conferma NEW-4: stress recovery legge solo membrana, manca bending.
"""
from __future__ import annotations
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.abspath(os.path.join(HERE, "..")))
sys.path.insert(0, os.path.abspath(os.path.join(HERE, "..", "tests")))

import numpy as np
from nafems.test_le10_thick_plate import _build_le10
from schemas import ElementType
from core.solver import StaticSolver


def diagnose_le10_stress(nx: int = 8) -> None:
    m = _build_le10(nx=nx, ny=nx, p=1e6, element_type=ElementType.SHELL_Q4)
    r = StaticSolver(m).solve()

    # Sanity: rotazioni devono esistere per bending
    uz_vals = [abs(d.uz) for d in r.displacements]
    rx_vals = [abs(d.rx) for d in r.displacements]
    ry_vals = [abs(d.ry) for d in r.displacements]
    print(f"max|uz| = {max(uz_vals):.4e}")
    print(f"max|rx| = {max(rx_vals):.4e}  <-- != 0 conferma bending attivo nel solver")
    print(f"max|ry| = {max(ry_vals):.4e}  <-- != 0 conferma bending attivo nel solver")

    # Punto D del LE10: (x=2.0, y=0)
    point_D = min(m.nodes, key=lambda n: (n.x - 2.0) ** 2 + n.y ** 2)
    print(f"\nPunto D: nodo {point_D.id} @ ({point_D.x:.3f}, {point_D.y:.3f})")

    adj = [el.id for el in m.elements if point_D.id in el.nodes]
    print(f"Elementi adiacenti: {adj}")

    for eid in adj:
        stress = next((s for s in r.element_stresses if s.element_id == eid), None)
        if stress is None:
            print(f"  el {eid}: NO STRESS")
            continue
        print(
            f"  el {eid}: sigma_x={stress.sigma_x:>+.3e}  sigma_y={stress.sigma_y:>+.3e}"
            f"  tau_xy={stress.tau_xy:>+.3e}  von_mises={stress.von_mises:.3e}"
        )
        # I campi sigma_top, sigma_bot, M_x, M_y non esistono nello schema attuale
        for attr in ("sigma_x_top", "sigma_y_top", "sigma_x_bot", "sigma_y_bot",
                     "Mx", "My", "Mxy"):
            if hasattr(stress, attr):
                print(f"      {attr}={getattr(stress, attr)!r}")
        # Tutti i campi presenti
        print(f"      [campi schema] {list(stress.model_dump().keys())}")
        break  # un elemento basta per dimostrare


if __name__ == "__main__":
    print("=" * 88)
    print("LE10 stress at point D — verifica se sigma_y=0 e' dovuto a postprocess solo-membrana")
    print("=" * 88)
    diagnose_le10_stress(nx=8)
    print()
    print("=" * 88)
    print("Test con mesh 12x12")
    print("=" * 88)
    diagnose_le10_stress(nx=12)
