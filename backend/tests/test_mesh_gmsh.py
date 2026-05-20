"""
Test wrapper gmsh — mesh 2D triangolare di poligoni semplici.
"""
from __future__ import annotations
import math
import pytest

from schemas import ElementType
from core.mesh import (
    mesh_polygon_2d_gmsh, mesh_box_surface,
    rectangle, circle, polygon_area,
)


def _mesh_area_2d(nodes, elements) -> float:
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


class TestGmshRectangle:
    def test_rectangle_area_conserved(self):
        poly = rectangle(4.0, 2.0)
        n, e = mesh_polygon_2d_gmsh(poly, lc=0.5)
        assert _mesh_area_2d(n, e) == pytest.approx(8.0, rel=1e-3)
        # Ogni elemento è TRI3
        assert all(el.type == ElementType.TRI3 for el in e)
        # Ogni nodo è in z=0 di default
        assert all(nd.z == 0.0 for nd in n)

    def test_refinement_lc_increases_elements(self):
        n_coarse, e_coarse = mesh_polygon_2d_gmsh(rectangle(4, 2), lc=1.0)
        n_fine, e_fine = mesh_polygon_2d_gmsh(rectangle(4, 2), lc=0.3)
        assert len(e_fine) > len(e_coarse)
        assert len(n_fine) > len(n_coarse)

    def test_invalid_args_raise(self):
        with pytest.raises(ValueError):
            mesh_polygon_2d_gmsh([(0, 0), (1, 0)], lc=0.5)
        with pytest.raises(ValueError):
            mesh_polygon_2d_gmsh(rectangle(1, 1), lc=0)


class TestGmshCircle:
    def test_circle_area_close_to_pi_r2(self):
        R = 1.5
        poly = circle(R, 64)  # approx finissima del bordo
        n, e = mesh_polygon_2d_gmsh(poly, lc=0.2)
        a = _mesh_area_2d(n, e)
        assert a == pytest.approx(math.pi * R * R, rel=0.02)


class TestGmshBoxSurface:
    def test_box_surface_count_reasonable(self):
        n, e = mesh_box_surface((2.0, 1.0, 0.5), lc=0.5)
        # Box 6 facce, ognuna almeno 2 tri
        assert len(e) >= 12
        assert all(el.type == ElementType.TRI3 for el in e)
        # I nodi includono z != 0
        assert any(nd.z > 0 for nd in n)


class TestGmshIDOffsets:
    def test_start_ids_respected(self):
        n, e = mesh_polygon_2d_gmsh(
            rectangle(1, 1), lc=0.5,
            start_node_id=100, start_elem_id=500,
        )
        assert min(nd.id for nd in n) == 100
        assert min(el.id for el in e) == 500
