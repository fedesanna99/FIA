"""
Estrazione di iso-superfici 3D da campi scalari nodali (BL-7).

Algoritmo: **marching tetrahedra**.
    Per ogni tetraedro (4 nodi con valori v0..v3) e una soglia c:
        - Determina quanti vertici sono sopra c (1-bit ciascuno).
        - 16 possibili combinazioni di segni → 3 casi unici per simmetria:
            * Tutti same sign  → nessuna superficie
            * 1 vertex isolato → 1 triangolo
            * 2 vs 2           → 2 triangoli (quadrilatero)
        - Vertici della superficie lungo gli edge dove c attraversa il
          segno: t = (c − v0) / (v1 − v0).

Per **mesh esaedrica** (Hex8) usiamo `tetrahedralize_hex8` che spezza
ogni esaedro in 5 tetraedri (decomposizione canonica), poi marching tetra.

Riferimenti:
    - Lorensen, W.E. & Cline, H.E. (1987), "Marching Cubes: A High Resolution
      3D Surface Construction Algorithm", SIGGRAPH '87.
    - Doi, A. & Koide, A. (1991), "An Efficient Method of Triangulating Equi-
      Valued Surfaces by Using Tetrahedral Cells", IEICE Trans. E74(1).
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import Sequence


@dataclass(frozen=True)
class IsoTriangle:
    """Singolo triangolo dell'isosuperficie."""
    p1: tuple[float, float, float]
    p2: tuple[float, float, float]
    p3: tuple[float, float, float]

    def area(self) -> float:
        """Area triangolo (heron / cross product)."""
        ax, ay, az = self.p1
        bx, by, bz = self.p2
        cx, cy, cz = self.p3
        # (B-A) × (C-A)
        v1 = (bx - ax, by - ay, bz - az)
        v2 = (cx - ax, cy - ay, cz - az)
        n = (v1[1] * v2[2] - v1[2] * v2[1],
             v1[2] * v2[0] - v1[0] * v2[2],
             v1[0] * v2[1] - v1[1] * v2[0])
        from math import sqrt
        return 0.5 * sqrt(n[0]**2 + n[1]**2 + n[2]**2)


def _interp3(
    p0: tuple[float, float, float], v0: float,
    p1: tuple[float, float, float], v1: float,
    c: float,
) -> tuple[float, float, float]:
    """Interpolazione lineare di un punto a quota c sull'edge p0-p1."""
    if abs(v1 - v0) < 1e-30:
        return p0
    t = (c - v0) / (v1 - v0)
    # Clamp a [0,1] per stabilità numerica
    t = max(0.0, min(1.0, t))
    return (
        p0[0] + t * (p1[0] - p0[0]),
        p0[1] + t * (p1[1] - p0[1]),
        p0[2] + t * (p1[2] - p0[2]),
    )


# I 6 edge di un tetraedro (coppie di indici di vertici 0..3)
_TET_EDGES = [
    (0, 1), (0, 2), (0, 3),
    (1, 2), (1, 3), (2, 3),
]


def _marching_tet_one(
    p: list[tuple[float, float, float]],  # 4 vertices
    v: list[float],                        # 4 nodal values
    c: float,
) -> list[IsoTriangle]:
    """Marching tetrahedra su un singolo tet. Restituisce 0, 1, o 2 triangoli."""
    eps = 1e-12
    # Spinge "su" i valori esattamente uguali a c
    v = list(v)
    for i in range(4):
        if abs(v[i] - c) < eps:
            v[i] = c + eps

    # Codice 4-bit: bit i = 1 se v[i] >= c
    code = 0
    for i in range(4):
        if v[i] >= c:
            code |= (1 << i)

    # 16 casi. Per simmetria, 0 (000) e 15 (1111) → nessuna superficie.
    if code == 0 or code == 15:
        return []

    # Edge intersections
    cuts: dict[tuple[int, int], tuple[float, float, float]] = {}
    for (i, j) in _TET_EDGES:
        if (v[i] - c) * (v[j] - c) < 0:
            cuts[(i, j)] = _interp3(p[i], v[i], p[j], v[j], c)

    # Casi 1 vs 3: 1 vertice isolato (positivo o negativo).
    # Identifica il vertice "minoritario" (1 o 3 == positivo).
    # # di vertici positivi:
    n_pos = bin(code).count("1")
    if n_pos in (1, 3):
        # Trova il vertice isolato
        if n_pos == 1:
            iso = next(i for i in range(4) if v[i] >= c)
        else:
            iso = next(i for i in range(4) if v[i] < c)
        # I 3 edge che escono da `iso`
        edges_from_iso = [(iso, j) for j in range(4) if j != iso]
        # Normalizza l'ordine
        pts = [cuts.get((min(e), max(e))) for e in edges_from_iso]
        if any(pt is None for pt in pts):
            return []
        return [IsoTriangle(p1=pts[0], p2=pts[1], p3=pts[2])]

    # Casi 2 vs 2: 4 edge intersezioni → quadrilatero in 2 triangoli
    if n_pos == 2:
        # Trova i 2 vertici positivi
        pos = [i for i in range(4) if v[i] >= c]
        neg = [i for i in range(4) if v[i] < c]
        # I 4 edge che attraversano c sono (pos[0], neg[0]), (pos[0], neg[1]),
        # (pos[1], neg[0]), (pos[1], neg[1])
        e1 = cuts.get((min(pos[0], neg[0]), max(pos[0], neg[0])))
        e2 = cuts.get((min(pos[0], neg[1]), max(pos[0], neg[1])))
        e3 = cuts.get((min(pos[1], neg[1]), max(pos[1], neg[1])))
        e4 = cuts.get((min(pos[1], neg[0]), max(pos[1], neg[0])))
        if any(x is None for x in (e1, e2, e3, e4)):
            return []
        # Quadrilatero (e1, e2, e3, e4) → 2 triangoli
        return [
            IsoTriangle(p1=e1, p2=e2, p3=e3),
            IsoTriangle(p1=e1, p2=e3, p3=e4),
        ]
    return []


def isosurface_tets(
    nodes: dict[int, tuple[float, float, float]],
    tets: list[tuple[int, int, int, int]],
    values: dict[int, float],
    c: float,
) -> list[IsoTriangle]:
    """Estrae l'iso-superficie a quota c per una mesh tetraedrica.

    Args:
        nodes  : mapping id → (x, y, z)
        tets   : lista di tetraedri come tuple di 4 ids
        values : campo scalare nodale
        c      : iso-livello
    """
    out: list[IsoTriangle] = []
    for t in tets:
        if any(nid not in nodes for nid in t):
            continue
        p = [nodes[nid] for nid in t]
        v = [values.get(nid, 0.0) for nid in t]
        out.extend(_marching_tet_one(p, v, c))
    return out


# Decomposizione canonica di un esaedro (8 nodi) in 5 tetraedri.
# Indici 0..7 dei nodi del Hex8 standard:
#     0=(0,0,0), 1=(1,0,0), 2=(1,1,0), 3=(0,1,0),
#     4=(0,0,1), 5=(1,0,1), 6=(1,1,1), 7=(0,1,1)
_HEX_TO_5_TETS = [
    (0, 1, 3, 4),   # T0
    (1, 2, 3, 6),   # T1
    (1, 5, 4, 6),   # T2
    (3, 7, 4, 6),   # T3
    (1, 3, 4, 6),   # T4 (central)
]


def tetrahedralize_hex8(
    hexes: list[tuple[int, int, int, int, int, int, int, int]],
) -> list[tuple[int, int, int, int]]:
    """Decomposizione di una lista di Hex8 in tetraedri (5 per hex)."""
    out: list[tuple[int, int, int, int]] = []
    for h in hexes:
        for tet_local in _HEX_TO_5_TETS:
            out.append(tuple(h[i] for i in tet_local))
    return out


def isosurface_hex8(
    nodes: dict[int, tuple[float, float, float]],
    hexes: list[tuple[int, int, int, int, int, int, int, int]],
    values: dict[int, float],
    c: float,
) -> list[IsoTriangle]:
    """Estrae iso-superficie da una mesh Hex8 (decompone in tet, poi marching tet)."""
    tets = tetrahedralize_hex8(hexes)
    return isosurface_tets(nodes, tets, values, c)


def auto_levels(values: dict[int, float], n: int = 10) -> list[float]:
    """Genera n iso-livelli equispaziati tra min e max (escludendo gli estremi)."""
    vs = list(values.values())
    if not vs:
        return []
    vmin, vmax = min(vs), max(vs)
    if vmax == vmin:
        return [vmin]
    return [vmin + (i + 1) * (vmax - vmin) / (n + 1) for i in range(n)]


def total_area(triangles: Sequence[IsoTriangle]) -> float:
    """Somma delle aree dei triangoli dell'iso-superficie."""
    return sum(t.area() for t in triangles)
