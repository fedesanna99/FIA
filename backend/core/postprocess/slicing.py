"""
Slicing di mesh 3D — intersezione di una mesh tetraedrica/hexaedrica con
un piano (point, normal).

Algoritmo:
    Per ogni cella della mesh, si calcola la distanza signed di ogni nodo
    dal piano. Gli edge che attraversano il piano vengono intersecati
    linearmente. Il poligono risultante per cella ha 3-4 vertici (tet)
    o fino a 6 (esaedro).

Output:
    Lista di segmenti (per visualizzazione) o di poligoni (per fill).
"""
from __future__ import annotations
from dataclasses import dataclass


@dataclass(frozen=True)
class Plane:
    """Piano definito da un punto e una normale (non normalizzata richiesta)."""
    point: tuple[float, float, float]
    normal: tuple[float, float, float]

    def signed_distance(self, p: tuple[float, float, float]) -> float:
        """Distanza signed da p al piano (positiva nel verso della normale)."""
        nx, ny, nz = self.normal
        px, py, pz = p
        ox, oy, oz = self.point
        return (px - ox) * nx + (py - oy) * ny + (pz - oz) * nz


def _interp(
    p1: tuple[float, float, float], d1: float,
    p2: tuple[float, float, float], d2: float,
) -> tuple[float, float, float]:
    """Interpolazione lineare al passaggio per d=0."""
    if d1 == d2:
        return p1
    t = d1 / (d1 - d2)
    return (
        p1[0] + t * (p2[0] - p1[0]),
        p1[1] + t * (p2[1] - p1[1]),
        p1[2] + t * (p2[2] - p1[2]),
    )


def slice_tet(
    nodes: list[tuple[float, float, float]],
    plane: Plane,
) -> list[tuple[float, float, float]]:
    """Intersezione di un tetraedro con un piano.

    Args:
        nodes : 4 vertici del tet
        plane : piano di taglio

    Returns:
        Lista di punti del poligono di intersezione (0, 3 o 4 punti).
    """
    if len(nodes) != 4:
        raise ValueError("Tet ha 4 vertici")
    d = [plane.signed_distance(p) for p in nodes]
    intersections: list[tuple[float, float, float]] = []
    edges = [(0, 1), (0, 2), (0, 3), (1, 2), (1, 3), (2, 3)]
    for i, j in edges:
        if d[i] * d[j] < 0:
            intersections.append(_interp(nodes[i], d[i], nodes[j], d[j]))
    return intersections


def slice_hex(
    nodes: list[tuple[float, float, float]],
    plane: Plane,
) -> list[tuple[float, float, float]]:
    """Intersezione di un esaedro (H8) con un piano.

    Convenzione vertice: ordine standard VTK
        0,1,2,3  faccia inferiore (CCW guardando da -Z)
        4,5,6,7  faccia superiore (CCW guardando da +Z)
    """
    if len(nodes) != 8:
        raise ValueError("Hex ha 8 vertici")
    d = [plane.signed_distance(p) for p in nodes]
    edges = [
        (0, 1), (1, 2), (2, 3), (3, 0),  # face bottom
        (4, 5), (5, 6), (6, 7), (7, 4),  # face top
        (0, 4), (1, 5), (2, 6), (3, 7),  # vertical
    ]
    intersections: list[tuple[float, float, float]] = []
    for i, j in edges:
        if d[i] * d[j] < 0:
            intersections.append(_interp(nodes[i], d[i], nodes[j], d[j]))
    return intersections


def slice_segments_from_polygon(
    polygon: list[tuple[float, float, float]],
) -> list[tuple[tuple[float, float, float], tuple[float, float, float]]]:
    """Converte un poligono (lista ordinata di vertici) in segmenti chiusi."""
    n = len(polygon)
    if n < 2:
        return []
    return [(polygon[i], polygon[(i + 1) % n]) for i in range(n)]
