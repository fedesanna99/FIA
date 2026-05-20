"""
Test FASE 16 — isolinee marching triangles, slicing piani 3D,
sovrapposizione modale.
"""
from __future__ import annotations
import math

import pytest

from core.postprocess import (
    IsoSegment, isoline_segments_tri3, isoline_levels_tri3, auto_levels,
    Plane, slice_tet, slice_hex, slice_segments_from_polygon,
    superpose_modes, normalize_to_unit_max, amplify_for_animation,
)
from schemas.results import ModeShape, NodalDisplacement


# ─────────────────── Isolinee ───────────────────

class TestIsolineTri3:
    def test_single_triangle_one_segment(self):
        """Triangolo con v={0,1,0}, isolinea c=0.5 → 1 segmento dentro."""
        nodes = {1: (0.0, 0.0, 0.0), 2: (1.0, 0.0, 0.0), 3: (0.5, 1.0, 0.0)}
        values = {1: 0.0, 2: 1.0, 3: 0.0}
        tris = [(1, 2, 3)]
        segs = isoline_segments_tri3(nodes, tris, values, c=0.5)
        assert len(segs) == 1

    def test_no_segment_if_all_below_c(self):
        nodes = {1: (0.0, 0.0, 0.0), 2: (1.0, 0.0, 0.0), 3: (0.5, 1.0, 0.0)}
        values = {1: 0.1, 2: 0.2, 3: 0.3}
        segs = isoline_segments_tri3(nodes, [(1, 2, 3)], values, c=0.9)
        assert segs == []

    def test_two_triangles_two_segments(self):
        """Quadrato suddiviso in 2 triangoli, valori che crescono in y."""
        nodes = {
            1: (0.0, 0.0, 0.0), 2: (1.0, 0.0, 0.0),
            3: (1.0, 1.0, 0.0), 4: (0.0, 1.0, 0.0),
        }
        values = {1: 0.0, 2: 0.0, 3: 1.0, 4: 1.0}
        tris = [(1, 2, 3), (1, 3, 4)]
        segs = isoline_segments_tri3(nodes, tris, values, c=0.5)
        assert len(segs) == 2
        # Tutti i punti devono essere a y=0.5 (è la stessa altezza)
        for s in segs:
            for p in (s.p1, s.p2):
                assert p[1] == pytest.approx(0.5, abs=1e-9)

    def test_iso_at_node_handled(self):
        """Caso degenere: un nodo ha valore esatto = c."""
        nodes = {1: (0.0, 0.0, 0.0), 2: (1.0, 0.0, 0.0), 3: (0.5, 1.0, 0.0)}
        values = {1: 0.5, 2: 0.0, 3: 1.0}  # node 1 esattamente sopra c
        segs = isoline_segments_tri3(nodes, [(1, 2, 3)], values, c=0.5)
        # Non deve crashare; il valore viene perturbato → 1 segmento
        assert len(segs) <= 1

    def test_multi_level(self):
        nodes = {i: (float(i), 0.0, 0.0) for i in range(1, 4)}
        nodes[3] = (0.5, 1.0, 0.0)
        values = {1: 0.0, 2: 1.0, 3: 0.5}
        levels = [0.25, 0.5, 0.75]
        result = isoline_levels_tri3(nodes, [(1, 2, 3)], values, levels)
        assert set(result.keys()) == set(levels)

    def test_auto_levels(self):
        values = {1: 0.0, 2: 10.0, 3: 5.0}
        levels = auto_levels(values, n=4)
        assert len(levels) == 4
        # I livelli sono strettamente compresi tra min e max
        assert all(0.0 < l < 10.0 for l in levels)

    def test_auto_levels_constant_field(self):
        values = {1: 3.0, 2: 3.0, 3: 3.0}
        levels = auto_levels(values)
        assert levels == [3.0]


# ─────────────────── Slicing ───────────────────

class TestPlaneSlice:
    def test_signed_distance(self):
        plane = Plane(point=(0, 0, 0), normal=(0, 0, 1))
        assert plane.signed_distance((1, 1, 5)) == 5
        assert plane.signed_distance((1, 1, -3)) == -3

    def test_slice_tet_through_middle(self):
        """Tetraedro con 1 vertice sopra e 3 sotto un piano z=0.5 → 3 intersezioni."""
        nodes = [
            (0, 0, 0), (1, 0, 0), (0, 1, 0), (0, 0, 1),
        ]
        plane = Plane(point=(0, 0, 0.5), normal=(0, 0, 1))
        poly = slice_tet(nodes, plane)
        # Solo 3 edge attraversano (quelli che congiungono vertex z=1 ai 3 a z=0)
        assert len(poly) == 3
        # Tutti i punti a z = 0.5
        for p in poly:
            assert p[2] == pytest.approx(0.5)

    def test_slice_tet_no_intersection(self):
        nodes = [(0, 0, 0), (1, 0, 0), (0, 1, 0), (0, 0, 1)]
        plane = Plane(point=(0, 0, 10), normal=(0, 0, 1))
        poly = slice_tet(nodes, plane)
        assert poly == []

    def test_slice_tet_invalid_args(self):
        plane = Plane(point=(0, 0, 0), normal=(0, 0, 1))
        with pytest.raises(ValueError):
            slice_tet([(0, 0, 0), (1, 0, 0)], plane)

    def test_slice_hex_through_middle(self):
        """Unit cube con z∈[0,1] tagliato a z=0.5 → 4 intersezioni (un quad)."""
        nodes = [
            (0, 0, 0), (1, 0, 0), (1, 1, 0), (0, 1, 0),  # bottom
            (0, 0, 1), (1, 0, 1), (1, 1, 1), (0, 1, 1),  # top
        ]
        plane = Plane(point=(0, 0, 0.5), normal=(0, 0, 1))
        poly = slice_hex(nodes, plane)
        # Le 4 verticali attraversano il piano → 4 intersezioni
        assert len(poly) == 4
        for p in poly:
            assert p[2] == pytest.approx(0.5)

    def test_polygon_to_segments(self):
        poly = [(0, 0, 0), (1, 0, 0), (1, 1, 0), (0, 1, 0)]
        segs = slice_segments_from_polygon(poly)
        assert len(segs) == 4
        # Ogni segmento chiude correttamente
        assert segs[-1] == ((0, 1, 0), (0, 0, 0))

    def test_polygon_to_segments_too_few(self):
        assert slice_segments_from_polygon([(0, 0, 0)]) == []


# ─────────────────── Mode superposition ───────────────────

def _make_mode(mode_idx: int, shapes: dict[int, tuple[float, float, float]]) -> ModeShape:
    """Helper: crea un ModeShape con shape semplice."""
    return ModeShape(
        mode=mode_idx, frequency_hz=1.0 * mode_idx,
        omega=2 * math.pi * mode_idx, period=1.0 / mode_idx,
        displacements=[
            NodalDisplacement(node_id=nid, ux=v[0], uy=v[1], uz=v[2])
            for nid, v in shapes.items()
        ],
    )


class TestModeSuperposition:
    def test_single_mode_full_weight(self):
        m = _make_mode(1, {1: (1.0, 0.0, 0.0), 2: (2.0, 0.0, 0.0)})
        out = superpose_modes([m], [1.0])
        assert out[1] == (1.0, 0.0, 0.0)
        assert out[2] == (2.0, 0.0, 0.0)

    def test_linear_combination(self):
        m1 = _make_mode(1, {1: (1, 0, 0), 2: (1, 0, 0)})
        m2 = _make_mode(2, {1: (0, 1, 0), 2: (0, -1, 0)})
        out = superpose_modes([m1, m2], [2.0, 3.0])
        assert out[1] == (2.0, 3.0, 0.0)
        assert out[2] == (2.0, -3.0, 0.0)

    def test_mismatched_lengths_raises(self):
        m = _make_mode(1, {1: (1, 0, 0)})
        with pytest.raises(ValueError):
            superpose_modes([m, m], [1.0])

    def test_normalize_to_unit_max(self):
        d = {1: (2.0, 0.0, 0.0), 2: (4.0, -1.0, 0.5)}
        n = normalize_to_unit_max(d)
        # Max abs = 4 → tutto diviso per 4
        assert n[2][0] == pytest.approx(1.0)
        assert n[1][0] == pytest.approx(0.5)
        assert n[2][1] == pytest.approx(-0.25)

    def test_normalize_zero_field(self):
        d = {1: (0.0, 0.0, 0.0)}
        n = normalize_to_unit_max(d)
        assert n == d

    def test_amplify_for_animation(self):
        d = {1: (2.0, 0.0, 0.0)}
        a = amplify_for_animation(d, amplitude=0.5, base_size=10.0)
        # normalized → (1,0,0), poi · 0.5 · 10 = (5,0,0)
        assert a[1] == (5.0, 0.0, 0.0)

    def test_empty_input(self):
        assert superpose_modes([], []) == {}
        assert normalize_to_unit_max({}) == {}
