"""
LE1 mesh quality diagnostics (v2.3.7-solver-internals-audit).

Per ogni nx in {4,6,8,10,12,16,20}, calcola:
- Aspect ratio min/max/avg degli elementi
- Skewness diagonal-ratio
- Area min/max
- Nodi totali, elementi totali

Output: tabella per individuare degradazione mesh per nx >= 16.
"""
from __future__ import annotations
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.abspath(os.path.join(HERE, "..")))
sys.path.insert(0, os.path.abspath(os.path.join(HERE, "..", "tests")))

import numpy as np
from nafems.test_le1_elliptic_membrane import _build_le1
from schemas import ElementType


def element_quality(nodes_coords: np.ndarray) -> tuple[float, float, float]:
    edges = [
        np.linalg.norm(nodes_coords[(i + 1) % 4] - nodes_coords[i])
        for i in range(4)
    ]
    aspect = max(edges) / max(min(edges), 1e-12)
    d1 = np.linalg.norm(nodes_coords[2] - nodes_coords[0])
    d2 = np.linalg.norm(nodes_coords[3] - nodes_coords[1])
    skew = max(d1, d2) / max(min(d1, d2), 1e-12)
    v1 = nodes_coords[2] - nodes_coords[0]
    v2 = nodes_coords[3] - nodes_coords[1]
    area = 0.5 * float(np.linalg.norm(np.cross(v1, v2)))
    return aspect, skew, area


def diagnose_le1(nx: int) -> None:
    m = _build_le1(nx=nx, ny=nx, et=ElementType.SHELL_Q4)
    node_by_id = {n.id: np.array([n.x, n.y, n.z]) for n in m.nodes}
    aspects, skews, areas = [], [], []
    for el in m.elements:
        coords = np.array([node_by_id[nid] for nid in el.nodes])
        if len(coords) != 4:
            continue
        ar, sk, area = element_quality(coords)
        aspects.append(ar); skews.append(sk); areas.append(area)
    print(
        f"nx={nx:>3d}  n_el={len(aspects):>4d}  n_nodes={len(m.nodes):>4d}"
        f"  aspect[min/max/avg]={min(aspects):6.2f}/{max(aspects):6.2f}/{np.mean(aspects):5.2f}"
        f"  skew_max={max(skews):5.2f}"
        f"  area[min/max]={min(areas):.2e}/{max(areas):.2e}"
    )


if __name__ == "__main__":
    print("=" * 88)
    print("LE1 mesh quality vs nx — `quarter_ellipse_with_hole` Coons patch transfinita")
    print("=" * 88)
    for nx in [4, 6, 8, 10, 12, 16, 20]:
        try:
            diagnose_le1(nx)
        except Exception as e:
            print(f"nx={nx}: ERROR {e}")
