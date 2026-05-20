"""
Geometrie parametriche 2D — generano i vertici (polygon + holes) da passare
a `mesh_polygon_delaunay`.

Forme disponibili:
    - rectangle(w, h, origin)         → rettangolo
    - l_shape(L, H, t)                → L (angolo retto)
    - t_shape(L, H, web_t, flange_t)  → T
    - circle(R, n_seg, center)        → cerchio
    - ring(R_ext, R_int, n_seg)       → anello (cerchio con buco)
    - polygon_with_holes(outer, holes)→ passa-attraverso

Convenzione: vertici in senso antiorario per il poligono esterno,
orario per i buchi (test point-in-polygon è invariante).
"""
from __future__ import annotations
import math


def rectangle(
    width: float, height: float,
    origin: tuple[float, float] = (0.0, 0.0),
) -> list[tuple[float, float]]:
    x0, y0 = origin
    return [
        (x0, y0),
        (x0 + width, y0),
        (x0 + width, y0 + height),
        (x0, y0 + height),
    ]


def l_shape(
    long_side: float, short_side: float, thickness: float,
    origin: tuple[float, float] = (0.0, 0.0),
) -> list[tuple[float, float]]:
    """L-shape con gamba lunga su x e gamba corta su y. thickness < short_side, long_side."""
    if thickness >= long_side or thickness >= short_side:
        raise ValueError("thickness deve essere < di entrambe le gambe")
    x0, y0 = origin
    return [
        (x0, y0),
        (x0 + long_side, y0),
        (x0 + long_side, y0 + thickness),
        (x0 + thickness, y0 + thickness),
        (x0 + thickness, y0 + short_side),
        (x0, y0 + short_side),
    ]


def t_shape(
    flange_width: float, total_height: float,
    web_thickness: float, flange_thickness: float,
    origin: tuple[float, float] = (0.0, 0.0),
) -> list[tuple[float, float]]:
    """T-shape simmetrica rispetto all'asse y, base a y=0."""
    if web_thickness >= flange_width:
        raise ValueError("web_thickness deve essere < flange_width")
    if flange_thickness >= total_height:
        raise ValueError("flange_thickness deve essere < total_height")
    x0, y0 = origin
    web_left = x0 + (flange_width - web_thickness) / 2.0
    web_right = web_left + web_thickness
    flange_top = y0 + total_height
    flange_bot = flange_top - flange_thickness
    return [
        (web_left, y0),
        (web_right, y0),
        (web_right, flange_bot),
        (x0 + flange_width, flange_bot),
        (x0 + flange_width, flange_top),
        (x0, flange_top),
        (x0, flange_bot),
        (web_left, flange_bot),
    ]


def circle(
    radius: float, n_segments: int = 32,
    center: tuple[float, float] = (0.0, 0.0),
) -> list[tuple[float, float]]:
    """Discretizza cerchio con n_segments lati (poligono regolare inscritto)."""
    if n_segments < 6:
        raise ValueError("n_segments minimo 6")
    cx, cy = center
    return [
        (cx + radius * math.cos(2 * math.pi * i / n_segments),
         cy + radius * math.sin(2 * math.pi * i / n_segments))
        for i in range(n_segments)
    ]


def ring(
    radius_outer: float, radius_inner: float,
    n_segments: int = 32,
    center: tuple[float, float] = (0.0, 0.0),
) -> tuple[list[tuple[float, float]], list[list[tuple[float, float]]]]:
    """Anello — restituisce (outer, [inner]) per uso con mesh_polygon_delaunay(holes=)."""
    if radius_inner >= radius_outer:
        raise ValueError("radius_inner deve essere < radius_outer")
    outer = circle(radius_outer, n_segments, center)
    # hole: orientato in senso opposto
    inner = circle(radius_inner, n_segments, center)
    inner.reverse()
    return outer, [inner]


def polygon_area(polygon: list[tuple[float, float]]) -> float:
    """Calcola area con formula shoelace (utile per i test)."""
    n = len(polygon)
    s = 0.0
    for i in range(n):
        x1, y1 = polygon[i]
        x2, y2 = polygon[(i + 1) % n]
        s += x1 * y2 - x2 * y1
    return abs(s) / 2.0
