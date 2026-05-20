"""
Mesh Delaunay 2D per poligoni convessi e non convessi.

Algoritmo:
    1. Si riceve un polygon (lista ordinata di vertici).
    2. Si seedano punti interni con jittered grid spacing ~ h.
    3. Si esegue Delaunay 2D (Bowyer-Watson via scipy.spatial.Delaunay).
    4. Per polygoni non convessi, i triangoli con centroide fuori dal poligono
       vengono scartati (test ray-casting).

Output:
    Lista di Node + lista di Element (TRI3) collegati ai nodi.

Limiti noti:
    - Niente raffinamento adattivo basato sulla curvatura del bordo.
    - Niente preservazione esatta dei vertici del bordo (best-effort).
    - Per geometrie con buchi (anelli), passare 'holes' come lista di polygons interni.
"""
from __future__ import annotations
import numpy as np
from scipy.spatial import Delaunay

from schemas import Node, Element, ElementType


def _point_in_polygon(p: tuple[float, float], polygon: list[tuple[float, float]]) -> bool:
    """Ray-casting: ritorna True se p è interno al poligono."""
    x, y = p
    n = len(polygon)
    inside = False
    j = n - 1
    for i in range(n):
        xi, yi = polygon[i]
        xj, yj = polygon[j]
        if ((yi > y) != (yj > y)) and \
           (x < (xj - xi) * (y - yi) / (yj - yi + 1e-300) + xi):
            inside = not inside
        j = i
    return inside


def _point_in_any_hole(p: tuple[float, float], holes: list[list[tuple[float, float]]]) -> bool:
    return any(_point_in_polygon(p, h) for h in holes)


def mesh_polygon_delaunay(
    polygon: list[tuple[float, float]],
    h: float,
    *,
    holes: list[list[tuple[float, float]]] | None = None,
    z: float = 0.0,
    material_id: str = "concrete_c25",
    section_id: str | None = "shell_t100",
    start_node_id: int = 1,
    start_elem_id: int = 1,
) -> tuple[list[Node], list[Element]]:
    """Mesh un poligono 2D con triangoli TRI3 di scala ~h.

    Args:
        polygon       : lista di (x,y) — ordinati ccw, NON ripetere il primo vertice
        h             : taglia caratteristica del triangolo (spaziatura interna)
        holes         : lista di poligoni interni che vanno esclusi (mesh anello)
        z             : quota z costante per i nodi (default 0)
        material_id   : material per Element
        section_id    : section_id per Element (default shell_t100 per TRI3)
        start_node_id : id del primo nodo
        start_elem_id : id del primo elemento

    Returns:
        (nodes, elements) — id consecutivi a partire dagli start_*.
    """
    if len(polygon) < 3:
        raise ValueError("Polygon serve almeno 3 vertici")
    if h <= 0:
        raise ValueError("h deve essere > 0")
    holes = holes or []

    poly_arr = np.array(polygon, dtype=float)
    xmin, ymin = poly_arr.min(axis=0)
    xmax, ymax = poly_arr.max(axis=0)

    # Seed grid spacing h con jitter
    nx = max(2, int(np.ceil((xmax - xmin) / h)) + 1)
    ny = max(2, int(np.ceil((ymax - ymin) / h)) + 1)
    xs = np.linspace(xmin, xmax, nx)
    ys = np.linspace(ymin, ymax, ny)

    pts: list[tuple[float, float]] = []

    # Vertici del poligono esterno (sempre inclusi)
    for v in polygon:
        pts.append((float(v[0]), float(v[1])))
    for hole in holes:
        for v in hole:
            pts.append((float(v[0]), float(v[1])))

    # Punti su edge del bordo (densificazione lineare)
    def _edge_points(pl):
        out = []
        n = len(pl)
        for i in range(n):
            a = np.array(pl[i])
            b = np.array(pl[(i + 1) % n])
            d = np.linalg.norm(b - a)
            n_div = max(1, int(np.ceil(d / h)))
            for k in range(1, n_div):  # esclude estremi (gia' presenti)
                p = a + (b - a) * (k / n_div)
                out.append((float(p[0]), float(p[1])))
        return out

    pts.extend(_edge_points(polygon))
    for hole in holes:
        pts.extend(_edge_points(hole))

    # Punti interni: griglia + filtraggio poligono / holes
    for x in xs:
        for y in ys:
            p = (float(x), float(y))
            if not _point_in_polygon(p, polygon):
                continue
            if _point_in_any_hole(p, holes):
                continue
            pts.append(p)

    # Dedup (tolleranza piccola rispetto a h)
    tol = h * 1e-3
    seen: dict[tuple[int, int], int] = {}
    unique_pts: list[tuple[float, float]] = []
    for p in pts:
        k = (round(p[0] / tol), round(p[1] / tol))
        if k in seen:
            continue
        seen[k] = len(unique_pts)
        unique_pts.append(p)

    if len(unique_pts) < 3:
        raise ValueError("Non abbastanza punti per Delaunay (poligono troppo piccolo?)")

    arr = np.array(unique_pts)
    tri = Delaunay(arr)

    # Filtra triangoli il cui centroide è fuori dal poligono o dentro un buco
    good_simplices = []
    for s in tri.simplices:
        p0, p1, p2 = arr[s[0]], arr[s[1]], arr[s[2]]
        cx = (p0[0] + p1[0] + p2[0]) / 3.0
        cy = (p0[1] + p1[1] + p2[1]) / 3.0
        if not _point_in_polygon((cx, cy), polygon):
            continue
        if _point_in_any_hole((cx, cy), holes):
            continue
        good_simplices.append(s)

    # Crea nodi e elementi
    nodes = [
        Node(id=start_node_id + i, x=float(arr[i, 0]), y=float(arr[i, 1]), z=z)
        for i in range(len(arr))
    ]
    elements = [
        Element(
            id=start_elem_id + i, type=ElementType.TRI3,
            nodes=[start_node_id + int(s[0]),
                   start_node_id + int(s[1]),
                   start_node_id + int(s[2])],
            material_id=material_id, section_id=section_id,
        )
        for i, s in enumerate(good_simplices)
    ]
    return nodes, elements
