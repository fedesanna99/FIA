"""
Test mesh Delaunay 2D — generazione, qualità, conservazione area.
"""
from __future__ import annotations
import math
import pytest

from schemas import ElementType
from core.mesh import (
    mesh_polygon_delaunay,
    rectangle, l_shape, t_shape, circle, ring, polygon_area,
)


def _mesh_area(nodes, elements) -> float:
    """Somma delle aree dei TRI3 (formula shoelace per ognuno)."""
    nbyid = {n.id: n for n in nodes}
    total = 0.0
    for e in elements:
        if e.type != ElementType.TRI3:
            continue
        n1, n2, n3 = (nbyid[i] for i in e.nodes)
        total += 0.5 * abs(
            (n2.x - n1.x) * (n3.y - n1.y) - (n3.x - n1.x) * (n2.y - n1.y)
        )
    return total


def _min_triangle_area(nodes, elements) -> float:
    """Triangolo più piccolo (utile per test no-degenerate)."""
    nbyid = {n.id: n for n in nodes}
    areas = []
    for e in elements:
        if e.type != ElementType.TRI3:
            continue
        n1, n2, n3 = (nbyid[i] for i in e.nodes)
        a = 0.5 * abs((n2.x - n1.x) * (n3.y - n1.y) - (n3.x - n1.x) * (n2.y - n1.y))
        areas.append(a)
    return min(areas) if areas else 0.0


class TestRectangleMesh:
    def test_area_conserved(self):
        poly = rectangle(5.0, 3.0)
        n, e = mesh_polygon_delaunay(poly, h=0.5)
        assert _mesh_area(n, e) == pytest.approx(15.0, rel=1e-6)

    def test_h_refinement_more_elements(self):
        poly = rectangle(5.0, 3.0)
        _, e_coarse = mesh_polygon_delaunay(poly, h=0.5)
        _, e_fine = mesh_polygon_delaunay(poly, h=0.25)
        assert len(e_fine) >= 2 * len(e_coarse)

    def test_no_degenerate_triangles(self):
        poly = rectangle(2.0, 1.0)
        n, e = mesh_polygon_delaunay(poly, h=0.2)
        assert _min_triangle_area(n, e) > 1e-9

    def test_all_tri3_elements(self):
        n, e = mesh_polygon_delaunay(rectangle(1, 1), h=0.3)
        assert all(el.type == ElementType.TRI3 for el in e)

    def test_invalid_polygon_raises(self):
        with pytest.raises(ValueError):
            mesh_polygon_delaunay([(0, 0), (1, 0)], h=0.1)
        with pytest.raises(ValueError):
            mesh_polygon_delaunay(rectangle(1, 1), h=0.0)


class TestLShape:
    def test_area_conserved(self):
        L = 4.0; H = 3.0; t = 0.5
        poly = l_shape(L, H, t)
        # Area = L·t + t·(H-t) = 4·0.5 + 0.5·2.5 = 2 + 1.25 = 3.25
        expected = polygon_area(poly)
        assert expected == pytest.approx(3.25)
        n, e = mesh_polygon_delaunay(poly, h=0.2)
        assert _mesh_area(n, e) == pytest.approx(expected, rel=0.05)

    def test_concave_region_not_triangulated(self):
        """Test critico: L-shape è non convessa. I triangoli devono restare
        dentro la 'L', mai sconfinare nell'angolo concavo esterno."""
        poly = l_shape(4.0, 3.0, 0.5)
        n, e = mesh_polygon_delaunay(poly, h=0.2)
        nbyid = {nd.id: nd for nd in n}
        # Per ogni triangolo: il centroide deve essere strettamente dentro la 'L'.
        # In pratica controlliamo che nessun centroide si trovi nell'angolo
        # rientrante (x>0.5 AND y>0.5).
        for el in e:
            n1, n2, n3 = (nbyid[i] for i in el.nodes)
            cx = (n1.x + n2.x + n3.x) / 3
            cy = (n1.y + n2.y + n3.y) / 3
            # Punto nell'angolo concavo escluso
            outside_L_region = (cx > 0.5 + 1e-6) and (cy > 0.5 + 1e-6)
            assert not outside_L_region, \
                f"Triangolo {el.id} centroide in zona esclusa: ({cx:.3f}, {cy:.3f})"


class TestTShape:
    def test_area_conserved(self):
        poly = t_shape(flange_width=3.0, total_height=4.0,
                        web_thickness=0.5, flange_thickness=0.5)
        # web = 0.5 × (4 - 0.5) = 1.75; flange = 3 × 0.5 = 1.5; tot 3.25
        expected = polygon_area(poly)
        assert expected == pytest.approx(3.25)
        n, e = mesh_polygon_delaunay(poly, h=0.2)
        assert _mesh_area(n, e) == pytest.approx(expected, rel=0.05)


class TestCircleMesh:
    def test_area_close_to_pi_r2(self):
        """Cerchio con 32 lati: area mesh ≈ area poligono inscritto ≈ 0.995·π R²."""
        n_seg = 32
        R = 2.0
        poly = circle(R, n_seg)
        n, e = mesh_polygon_delaunay(poly, h=0.3)
        expected_polygon_area = polygon_area(poly)
        assert _mesh_area(n, e) == pytest.approx(expected_polygon_area, rel=0.02)
        # Confronta col limite continuo
        assert _mesh_area(n, e) / (math.pi * R * R) > 0.97

    def test_more_segments_better_approximation(self):
        a8 = polygon_area(circle(1.0, 8))
        a32 = polygon_area(circle(1.0, 32))
        a128 = polygon_area(circle(1.0, 128))
        # Convergenza monotona verso π
        assert a8 < a32 < a128 < math.pi
        assert a128 > 0.999 * math.pi


class TestRingMesh:
    def test_hole_excluded_from_mesh(self):
        """Anello: area mesh = area outer - area hole."""
        outer, holes = ring(radius_outer=2.0, radius_inner=1.0, n_segments=24)
        a_outer = polygon_area(outer)
        a_hole = polygon_area(holes[0])
        n, e = mesh_polygon_delaunay(outer, h=0.2, holes=holes)
        a_mesh = _mesh_area(n, e)
        assert a_mesh == pytest.approx(a_outer - a_hole, rel=0.05)

    def test_no_triangle_centroid_in_hole(self):
        outer, holes = ring(radius_outer=3.0, radius_inner=1.0, n_segments=24)
        n, e = mesh_polygon_delaunay(outer, h=0.3, holes=holes)
        nbyid = {nd.id: nd for nd in n}
        for el in e:
            n1, n2, n3 = (nbyid[i] for i in el.nodes)
            cx = (n1.x + n2.x + n3.x) / 3
            cy = (n1.y + n2.y + n3.y) / 3
            d = math.sqrt(cx ** 2 + cy ** 2)
            assert d >= 1.0 - 1e-3, f"Triangolo {el.id} centroide nel buco: r={d:.3f}"
