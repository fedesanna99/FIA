"""
Mesh helpers per geometrie ellittiche dei benchmark NAFEMS LE (BL-6).

I benchmark NAFEMS LE1/LE2/LE10 usano un quarto di membrana/piastra
ellittica con foro centrale ellittico. La mesh tipica è strutturata
"transfinita" — quadrilateri prodotti dal mapping bilineare di una griglia
ξ × η con bordi conici (4 archi di ellisse).

Strategia:
    - Bordo interno: arco ellittico (a_i, b_i) da θ=0 a θ=π/2
    - Bordo esterno: arco ellittico (a_o, b_o) da θ=0 a θ=π/2
    - Bordo inferiore: y=0, x ∈ [a_i, a_o]
    - Bordo sinistro:  x=0, y ∈ [b_i, b_o]
    - Mappatura transfinita standard (Coons patch) tra i 4 bordi
"""
from __future__ import annotations
import math

import numpy as np

from schemas import Node, Element, ElementType


def _ellipse_point(a: float, b: float, t: float) -> tuple[float, float]:
    """Punto su ellisse (a·cos(t·π/2), b·sin(t·π/2)) per t ∈ [0,1]."""
    th = t * math.pi / 2.0
    return a * math.cos(th), b * math.sin(th)


def quarter_ellipse_with_hole(
    a_inner: float, b_inner: float,
    a_outer: float, b_outer: float,
    nx: int, ny: int,
    element_type: ElementType,
    material_id: str,
    section_id: str,
    *,
    first_element_id: int = 1,
    first_node_id: int = 1,
) -> tuple[list[Node], list[Element]]:
    """Mesh strutturata di un quarto di ellisse con foro ellittico interno.

    Args:
        a_inner, b_inner: semiassi del bordo interno
        a_outer, b_outer: semiassi del bordo esterno
        nx, ny: divisioni in direzione radiale e tangenziale (rispettivamente)
        element_type: SHELL_Q4, SHELL_Q4_MITC o TRI3 (Tri3 = 2 tri per quad)

    Coordinate generate nel piano XY (z = 0).

    Layout interno:
        - Bordo "sinistro" (ξ=0): arco interno
        - Bordo "destro"  (ξ=1): arco esterno
        - Bordo "basso"  (η=0): segmento orizzontale y=0
        - Bordo "alto"   (η=1): segmento verticale x=0

    Returns:
        (nodes, elements). I nodi sono ordinati per riga (η costante) poi
        per colonna (ξ).
    """
    # Genera griglia di punti via Coons transfinita
    # Bordo basso B(ξ,0): da (a_inner, 0) a (a_outer, 0)
    # Bordo alto  B(ξ,1): da (0, b_inner) a (0, b_outer)
    # Bordo sx   B(0,η): arco interno
    # Bordo dx   B(1,η): arco esterno
    nodes: list[Node] = []
    node_id = first_node_id
    grid_ids: list[list[int]] = []  # [j][i] = node_id

    for j in range(ny + 1):
        eta = j / ny
        row_ids: list[int] = []
        for i in range(nx + 1):
            xi = i / nx
            # Bordi
            B_bot_x = a_inner + xi * (a_outer - a_inner)
            B_bot_y = 0.0
            B_top_x = 0.0
            B_top_y = b_inner + xi * (b_outer - b_inner)
            B_left_x, B_left_y = _ellipse_point(a_inner, b_inner, eta)
            B_right_x, B_right_y = _ellipse_point(a_outer, b_outer, eta)
            # Coons patch:
            #   P(ξ,η) = (1−η)·B_bot(ξ) + η·B_top(ξ)
            #         + (1−ξ)·B_left(η) + ξ·B_right(η)
            #         − [ (1−ξ)(1−η)·P(0,0) + ξ(1−η)·P(1,0)
            #           + (1−ξ)η·P(0,1) + ξη·P(1,1) ]
            P00 = (a_inner, 0.0)
            P10 = (a_outer, 0.0)
            P01 = (0.0, b_inner)
            P11 = (0.0, b_outer)
            x = ((1 - eta) * B_bot_x + eta * B_top_x
                 + (1 - xi) * B_left_x + xi * B_right_x
                 - ((1 - xi) * (1 - eta) * P00[0] + xi * (1 - eta) * P10[0]
                    + (1 - xi) * eta * P01[0] + xi * eta * P11[0]))
            y = ((1 - eta) * B_bot_y + eta * B_top_y
                 + (1 - xi) * B_left_y + xi * B_right_y
                 - ((1 - xi) * (1 - eta) * P00[1] + xi * (1 - eta) * P10[1]
                    + (1 - xi) * eta * P01[1] + xi * eta * P11[1]))
            nodes.append(Node(id=node_id, x=float(x), y=float(y), z=0.0))
            row_ids.append(node_id)
            node_id += 1
        grid_ids.append(row_ids)

    # Genera elementi
    elements: list[Element] = []
    eid = first_element_id
    for j in range(ny):
        for i in range(nx):
            n1 = grid_ids[j][i]
            n2 = grid_ids[j][i + 1]
            n3 = grid_ids[j + 1][i + 1]
            n4 = grid_ids[j + 1][i]
            if element_type == ElementType.TRI3:
                # Decomponi in 2 triangoli (n1, n2, n3) e (n1, n3, n4)
                elements.append(Element(
                    id=eid, type=ElementType.TRI3, nodes=[n1, n2, n3],
                    material_id=material_id, section_id=section_id,
                ))
                eid += 1
                elements.append(Element(
                    id=eid, type=ElementType.TRI3, nodes=[n1, n3, n4],
                    material_id=material_id, section_id=section_id,
                ))
                eid += 1
            else:
                elements.append(Element(
                    id=eid, type=element_type, nodes=[n1, n2, n3, n4],
                    material_id=material_id, section_id=section_id,
                ))
                eid += 1

    return nodes, elements
