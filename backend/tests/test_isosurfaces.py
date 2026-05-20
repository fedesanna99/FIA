"""
Test BL-7 — Iso-superfici 3D via marching tetrahedra.

Casi:
    A) Single tet, 4 casi di intersezione (0 / 1 vs 3 / 2 vs 2 / nessuno)
    B) Cubo unitario via decomposizione 5-tet, campo f=x → piano isovalue=0.5
       deve restituire una superficie planare di area ≈ 1
    C) Campo sferico f=‖p‖² su griglia regolare → isosuperficie area ≈ 4πR²
    D) auto_levels e total_area helper
"""
from __future__ import annotations
import math
from typing import List

import pytest

from core.postprocess.isosurfaces import (
    IsoTriangle, isosurface_tets, isosurface_hex8,
    tetrahedralize_hex8, total_area, auto_levels,
    _marching_tet_one,
)


# ════════════════════════════════════════════════════════════════════════════
# A. Single tet — i 4 casi base
# ════════════════════════════════════════════════════════════════════════════
class TestMarchingTetSingle:
    def _ref_tet(self):
        """Tetraedro di riferimento (0,0,0)-(1,0,0)-(0,1,0)-(0,0,1)."""
        return [(0, 0, 0), (1, 0, 0), (0, 1, 0), (0, 0, 1)]

    def test_all_below_zero(self):
        """Tutti i valori < c → nessun triangolo."""
        p = self._ref_tet()
        v = [0.1, 0.2, 0.3, 0.4]
        tris = _marching_tet_one(p, v, c=1.0)
        assert tris == []

    def test_all_above_zero(self):
        """Tutti i valori > c → nessun triangolo."""
        p = self._ref_tet()
        v = [2.0, 3.0, 4.0, 5.0]
        tris = _marching_tet_one(p, v, c=1.0)
        assert tris == []

    def test_one_isolated_positive(self):
        """1 vertice positivo, 3 negativi → 1 triangolo."""
        p = self._ref_tet()
        v = [2.0, 0.0, 0.0, 0.0]  # v0 > c, altri < c
        tris = _marching_tet_one(p, v, c=1.0)
        assert len(tris) == 1
        # I 3 vertici del triangolo devono essere sugli edge che escono da p[0]
        # ovvero su (p0,p1), (p0,p2), (p0,p3)
        for vertex in [tris[0].p1, tris[0].p2, tris[0].p3]:
            # Ogni vertice è interpolato sul edge (0, j) ⇒ una sola coord
            # diversa da zero
            nonzero = sum(1 for c in vertex if abs(c) > 1e-9)
            assert nonzero == 1, f"vertex {vertex} non sul edge attesso"

    def test_two_vs_two(self):
        """2 vertici positivi, 2 negativi → 2 triangoli (quadrilatero)."""
        p = self._ref_tet()
        v = [2.0, 2.0, 0.0, 0.0]
        tris = _marching_tet_one(p, v, c=1.0)
        assert len(tris) == 2


# ════════════════════════════════════════════════════════════════════════════
# B. Unit cube — f = x → isosurface x=0.5
# ════════════════════════════════════════════════════════════════════════════
class TestCubeLinearField:
    def _unit_cube(self):
        """Cubo 1×1×1 nei nodi 0..7. Hex8 standard."""
        nodes = {
            1: (0, 0, 0), 2: (1, 0, 0), 3: (1, 1, 0), 4: (0, 1, 0),
            5: (0, 0, 1), 6: (1, 0, 1), 7: (1, 1, 1), 8: (0, 1, 1),
        }
        # Hex8 (8 indici 1-based): 1,2,3,4 base z=0; 5,6,7,8 base z=1
        hexes = [(1, 2, 3, 4, 5, 6, 7, 8)]
        return nodes, hexes

    def test_linear_field_x_iso_plane(self):
        """f(x,y,z) = x, c = 0.5 → piano normale x=0.5, area = 1."""
        nodes, hexes = self._unit_cube()
        values = {nid: pt[0] for nid, pt in nodes.items()}
        tris = isosurface_hex8(nodes, hexes, values, c=0.5)
        # Deve esistere una superficie con area ≈ 1
        area = total_area(tris)
        assert area == pytest.approx(1.0, rel=0.01), f"area={area}"
        # Tutti i vertici dei triangoli devono avere x ≈ 0.5
        for t in tris:
            for v in (t.p1, t.p2, t.p3):
                assert abs(v[0] - 0.5) < 1e-6, f"vertex {v} non su x=0.5"

    def test_linear_field_x_iso_off_grid(self):
        """f = x, c = 0.25 → piano x = 0.25, ancora area = 1."""
        nodes, hexes = self._unit_cube()
        values = {nid: pt[0] for nid, pt in nodes.items()}
        tris = isosurface_hex8(nodes, hexes, values, c=0.25)
        area = total_area(tris)
        assert area == pytest.approx(1.0, rel=0.01)

    def test_iso_at_corner_returns_empty_or_small(self):
        """c oltre i valori del campo → nessuna superficie."""
        nodes, hexes = self._unit_cube()
        values = {nid: pt[0] for nid, pt in nodes.items()}
        tris = isosurface_hex8(nodes, hexes, values, c=2.0)
        assert tris == []


# ════════════════════════════════════════════════════════════════════════════
# C. Campo sferico su griglia regolare di esaedri
# ════════════════════════════════════════════════════════════════════════════
class TestSphericalField:
    def _build_grid(self, n: int = 10, L: float = 2.0):
        """Griglia regolare n×n×n di esaedri unitari da (-L/2) a (+L/2)."""
        h = L / n
        nodes: dict[int, tuple[float, float, float]] = {}
        nid = 1
        idx = {}  # (i,j,k) -> nid
        for k in range(n + 1):
            for j in range(n + 1):
                for i in range(n + 1):
                    x = -L / 2 + i * h
                    y = -L / 2 + j * h
                    z = -L / 2 + k * h
                    nodes[nid] = (x, y, z)
                    idx[(i, j, k)] = nid
                    nid += 1
        hexes = []
        for k in range(n):
            for j in range(n):
                for i in range(n):
                    h_nodes = (
                        idx[(i, j, k)],
                        idx[(i + 1, j, k)],
                        idx[(i + 1, j + 1, k)],
                        idx[(i, j + 1, k)],
                        idx[(i, j, k + 1)],
                        idx[(i + 1, j, k + 1)],
                        idx[(i + 1, j + 1, k + 1)],
                        idx[(i, j + 1, k + 1)],
                    )
                    hexes.append(h_nodes)
        return nodes, hexes

    def test_sphere_surface_area(self):
        """f = x²+y²+z², c = R² → sfera di raggio R, area ≈ 4πR²."""
        n = 16
        L = 2.0
        R = 0.8
        nodes, hexes = self._build_grid(n=n, L=L)
        values = {nid: x*x + y*y + z*z for nid, (x, y, z) in nodes.items()}
        tris = isosurface_hex8(nodes, hexes, values, c=R**2)
        area = total_area(tris)
        expected = 4 * math.pi * R**2
        # Tolleranza 20% per discretizzazione grossolana (n=16) +
        # decomposizione 5-tet per hex
        assert area == pytest.approx(expected, rel=0.20), (
            f"sphere area = {area:.3f}, atteso {expected:.3f}"
        )


# ════════════════════════════════════════════════════════════════════════════
# D. Helpers
# ════════════════════════════════════════════════════════════════════════════
class TestHelpers:
    def test_auto_levels(self):
        values = {1: 0.0, 2: 1.0, 3: 2.0, 4: 3.0, 5: 4.0}
        levels = auto_levels(values, n=3)
        assert len(levels) == 3
        assert all(0.0 < L < 4.0 for L in levels)

    def test_auto_levels_constant(self):
        values = {1: 5.0, 2: 5.0}
        levels = auto_levels(values, n=10)
        assert levels == [5.0]

    def test_auto_levels_empty(self):
        assert auto_levels({}, n=5) == []

    def test_tetrahedralize_hex8(self):
        hexes = [(1, 2, 3, 4, 5, 6, 7, 8)]
        tets = tetrahedralize_hex8(hexes)
        # 5 tet per hex
        assert len(tets) == 5
        for t in tets:
            assert len(t) == 4
            assert all(1 <= idx <= 8 for idx in t)

    def test_isosurface_tets_empty_mesh(self):
        tris = isosurface_tets({}, [], {}, c=0.5)
        assert tris == []


# ════════════════════════════════════════════════════════════════════════════
# E. Edge case: campo costante → nessuna superficie
# ════════════════════════════════════════════════════════════════════════════
class TestConstantField:
    def test_constant_value_no_surface(self):
        nodes = {
            1: (0, 0, 0), 2: (1, 0, 0), 3: (1, 1, 0), 4: (0, 1, 0),
            5: (0, 0, 1), 6: (1, 0, 1), 7: (1, 1, 1), 8: (0, 1, 1),
        }
        hexes = [(1, 2, 3, 4, 5, 6, 7, 8)]
        values = {nid: 1.0 for nid in nodes}   # campo costante
        tris = isosurface_hex8(nodes, hexes, values, c=0.5)
        # Tutti i valori (1.0) > c (0.5) → tutti i tet "fuori" → no superficie
        assert tris == []
