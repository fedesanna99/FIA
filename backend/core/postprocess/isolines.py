"""
Estrazione di isolinee da un campo scalare definito sui nodi di una mesh
triangolare TRI3.

Algoritmo: marching triangles.
    Per ogni triangolo (3 nodi con valori v1, v2, v3) e una soglia c:
        - Conta su quanti edge il valore cambia segno rispetto a c.
        - Se 2 edge attraversano c → si genera un segmento (interpolazione
          lineare lungo l'edge).
        - 0 o 1 edge → nessun segmento.
        - Casi degeneri (un vertice == c) trattati come "appena sopra".

Output: lista di segmenti [((x1, y1, z1), (x2, y2, z2)), …]
"""
from __future__ import annotations
from dataclasses import dataclass


@dataclass(frozen=True)
class Point3:
    x: float
    y: float
    z: float = 0.0


@dataclass(frozen=True)
class IsoSegment:
    p1: tuple[float, float, float]
    p2: tuple[float, float, float]


def _interp(
    p1: tuple[float, float, float], v1: float,
    p2: tuple[float, float, float], v2: float,
    c: float,
) -> tuple[float, float, float]:
    """Punto a quota c lungo il segmento p1-p2 (interpolazione lineare)."""
    if v1 == v2:
        # impossibile in teoria (chiamata solo se v1 < c < v2 o viceversa)
        return p1
    t = (c - v1) / (v2 - v1)
    return (
        p1[0] + t * (p2[0] - p1[0]),
        p1[1] + t * (p2[1] - p1[1]),
        p1[2] + t * (p2[2] - p1[2]),
    )


def isoline_segments_tri3(
    nodes: dict[int, tuple[float, float, float]],
    triangles: list[tuple[int, int, int]],
    values: dict[int, float],
    c: float,
) -> list[IsoSegment]:
    """Restituisce i segmenti di isolinea a quota c.

    Args:
        nodes      : mapping id → (x, y, z)
        triangles  : lista di triangoli come tuple di 3 ids
        values     : campo scalare su ogni nodo
        c          : valore di soglia
    """
    eps = 1e-12
    segments: list[IsoSegment] = []
    for tri in triangles:
        n1, n2, n3 = tri
        v = [values.get(n1, 0.0), values.get(n2, 0.0), values.get(n3, 0.0)]
        p = [nodes[n1], nodes[n2], nodes[n3]]
        # Per evitare instabilità: spinge i valori "uguali a c" leggermente sopra.
        for i in range(3):
            if abs(v[i] - c) < eps:
                v[i] = c + eps
        # Verifica edge che attraversano c
        crosses: list[tuple[float, float, float]] = []
        for i, j in [(0, 1), (1, 2), (2, 0)]:
            if (v[i] - c) * (v[j] - c) < 0:
                crosses.append(_interp(p[i], v[i], p[j], v[j], c))
        # Caso normale: 2 attraversamenti → 1 segmento
        if len(crosses) == 2:
            segments.append(IsoSegment(p1=crosses[0], p2=crosses[1]))
        # 0, 1, 3 → ignora (degenere)
    return segments


def isoline_levels_tri3(
    nodes: dict[int, tuple[float, float, float]],
    triangles: list[tuple[int, int, int]],
    values: dict[int, float],
    levels: list[float],
) -> dict[float, list[IsoSegment]]:
    """Calcola isolinee per più livelli c1, c2, ... contemporaneamente."""
    return {c: isoline_segments_tri3(nodes, triangles, values, c) for c in levels}


def auto_levels(values: dict[int, float], n: int = 10) -> list[float]:
    """Genera n livelli equispaziati tra min e max dei valori (esclusi gli estremi)."""
    vs = list(values.values())
    if not vs:
        return []
    vmin, vmax = min(vs), max(vs)
    if vmax == vmin:
        return [vmin]
    return [vmin + (i + 1) * (vmax - vmin) / (n + 1) for i in range(n)]
