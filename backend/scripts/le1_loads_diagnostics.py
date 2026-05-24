"""
LE1 load distribution check (v2.3.7-solver-internals-audit).

Verifica che la somma delle forze nodali sul bordo esterno corrisponda al
carico atteso F_total = sigma_edge * t * perimetro_quarter.

Hp (c) del root cause anti-convergenza: load distribution sbagliata per
nx grande (es. perim ellisse Ramanujan-approx grossolana).
"""
from __future__ import annotations
import os, sys, math
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.abspath(os.path.join(HERE, "..")))
sys.path.insert(0, os.path.abspath(os.path.join(HERE, "..", "tests")))

from nafems.test_le1_elliptic_membrane import _build_le1
from schemas import ElementType


def diagnose_loads(nx: int) -> None:
    m = _build_le1(nx=nx, ny=nx, et=ElementType.SHELL_Q4)
    a_o, b_o = 3.25, 2.75
    t = 0.1
    sigma_edge = 10e6
    # Perimetro quarter ellipse approssimato come in test (Ramanujan-like grezzo)
    perim_grezzo = (math.pi / 2.0) * math.sqrt((a_o ** 2 + b_o ** 2) / 2.0)
    # Perimetro reale (integrale ellittico via approssimazione Ramanujan 2)
    h = ((a_o - b_o) / (a_o + b_o)) ** 2
    perim_real_full = math.pi * (a_o + b_o) * (1 + 3 * h / (10 + math.sqrt(4 - 3 * h)))
    perim_real_quarter = perim_real_full / 4.0
    F_expected_grezzo = sigma_edge * t * perim_grezzo
    F_expected_real = sigma_edge * t * perim_real_quarter

    fx_total = sum(float(load.fx or 0.0) for load in m.loads)
    fy_total = sum(float(load.fy or 0.0) for load in m.loads)
    F_actual = math.hypot(fx_total, fy_total)

    print(
        f"nx={nx:>3d}  n_loads={len(m.loads):>3d}"
        f"  F_expected_grezzo={F_expected_grezzo:>.4e}"
        f"  F_expected_real={F_expected_real:>.4e}"
        f"  F_actual={F_actual:>.4e}"
        f"  ratio_vs_grezzo={F_actual/F_expected_grezzo:.4f}"
        f"  ratio_vs_real={F_actual/F_expected_real:.4f}"
    )


if __name__ == "__main__":
    print("=" * 100)
    print("LE1 load distribution check — F_total vs sigma*t*perim_quarter")
    print("Note: il test usa una stima 'grezza' del perimetro (Ramanujan-approx grossolana)")
    print("=" * 100)
    for nx in [4, 6, 8, 10, 12, 16, 20]:
        try:
            diagnose_loads(nx)
        except Exception as e:
            print(f"nx={nx}: ERROR {e}")
