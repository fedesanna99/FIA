"""Generatore di mesh per geometrie semplici."""
from __future__ import annotations
import numpy as np

from schemas import Node, Element, ElementType


def mesh_line(
    p0: tuple[float, float, float],
    p1: tuple[float, float, float],
    n_div: int,
    material_id: str,
    section_id: str,
    element_type: ElementType = ElementType.BEAM2D,
    start_id: int = 1,
) -> tuple[list[Node], list[Element]]:
    """Suddivide un segmento p0→p1 in `n_div` elementi 1D (beam/truss).

    Restituisce (nodes, elements) pronti per inserimento in un FEAModel.
    """
    if n_div < 1:
        raise ValueError("n_div deve essere ≥ 1")
    a = np.array(p0, dtype=float)
    b = np.array(p1, dtype=float)
    nodes: list[Node] = []
    for i in range(n_div + 1):
        t = i / n_div
        p = a + (b - a) * t
        nodes.append(Node(id=start_id + i, x=float(p[0]), y=float(p[1]), z=float(p[2])))
    elements: list[Element] = []
    for i in range(n_div):
        elements.append(Element(
            id=start_id + i,
            type=element_type,
            nodes=[start_id + i, start_id + i + 1],
            material_id=material_id,
            section_id=section_id,
        ))
    return nodes, elements


def subdivide_beam(
    beam_n1: Node, beam_n2: Node, n_div: int,
    material_id: str, section_id: str,
    element_type: ElementType = ElementType.BEAM2D,
    start_id: int = 100,
) -> tuple[list[Node], list[Element]]:
    """Alias semantico per `mesh_line` quando si sostituisce una trave esistente."""
    return mesh_line(
        (beam_n1.x, beam_n1.y, beam_n1.z),
        (beam_n2.x, beam_n2.y, beam_n2.z),
        n_div, material_id, section_id, element_type, start_id,
    )


def mesh_rectangle_shell(
    p0: tuple[float, float, float],
    p1: tuple[float, float, float],
    p2: tuple[float, float, float],
    p3: tuple[float, float, float],
    nx: int, ny: int,
    material_id: str, section_id: str,
    start_id: int = 1,
) -> tuple[list[Node], list[Element]]:
    """Mesh strutturata Q4 di un quadrilatero (p0,p1,p2,p3) con nx×ny celle.

    L'ordinamento dei vertici è antiorario; la mesh è interpolata bilinearmente.
    """
    if nx < 1 or ny < 1:
        raise ValueError("nx, ny devono essere ≥ 1")
    P = np.array([p0, p1, p2, p3], dtype=float)
    nodes: list[Node] = []
    nid = start_id
    for j in range(ny + 1):
        eta = j / ny
        for i in range(nx + 1):
            xi = i / nx
            N = np.array([
                (1 - xi) * (1 - eta),
                xi * (1 - eta),
                xi * eta,
                (1 - xi) * eta,
            ])
            p = N @ P
            nodes.append(Node(id=nid, x=float(p[0]), y=float(p[1]), z=float(p[2])))
            nid += 1
    elements: list[Element] = []
    eid = start_id
    for j in range(ny):
        for i in range(nx):
            n1 = start_id + j * (nx + 1) + i
            n2 = n1 + 1
            n3 = n2 + (nx + 1)
            n4 = n1 + (nx + 1)
            elements.append(Element(
                id=eid, type=ElementType.SHELL_Q4,
                nodes=[n1, n2, n3, n4],
                material_id=material_id, section_id=section_id,
            ))
            eid += 1
    return nodes, elements


def mesh_rectangle_tri3(
    p0: tuple[float, float, float],
    p1: tuple[float, float, float],
    p2: tuple[float, float, float],
    p3: tuple[float, float, float],
    nx: int, ny: int,
    material_id: str, section_id: str,
    start_id: int = 1,
) -> tuple[list[Node], list[Element]]:
    """Mesh strutturata di triangoli T3 (ogni cella viene divisa in 2)."""
    if nx < 1 or ny < 1:
        raise ValueError("nx, ny devono essere ≥ 1")
    P = np.array([p0, p1, p2, p3], dtype=float)
    nodes: list[Node] = []
    nid = start_id
    for j in range(ny + 1):
        eta = j / ny
        for i in range(nx + 1):
            xi = i / nx
            N = np.array([
                (1 - xi) * (1 - eta),
                xi * (1 - eta),
                xi * eta,
                (1 - xi) * eta,
            ])
            p = N @ P
            nodes.append(Node(id=nid, x=float(p[0]), y=float(p[1]), z=float(p[2])))
            nid += 1
    elements: list[Element] = []
    eid = start_id
    for j in range(ny):
        for i in range(nx):
            n1 = start_id + j * (nx + 1) + i
            n2 = n1 + 1
            n3 = n2 + (nx + 1)
            n4 = n1 + (nx + 1)
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
    return nodes, elements


def mesh_box_solid(
    origin: tuple[float, float, float],
    sizes: tuple[float, float, float],
    nx: int, ny: int, nz: int,
    material_id: str,
    start_id: int = 1,
) -> tuple[list[Node], list[Element]]:
    """Mesh strutturata di esaedri H8 in un box `origin .. origin+sizes`."""
    if nx < 1 or ny < 1 or nz < 1:
        raise ValueError("nx, ny, nz devono essere ≥ 1")
    ox, oy, oz = origin
    sx, sy, sz = sizes
    nodes: list[Node] = []
    nid = start_id

    def node_index(i: int, j: int, k: int) -> int:
        return start_id + k * (nx + 1) * (ny + 1) + j * (nx + 1) + i

    for k in range(nz + 1):
        for j in range(ny + 1):
            for i in range(nx + 1):
                nodes.append(Node(
                    id=nid,
                    x=ox + sx * i / nx,
                    y=oy + sy * j / ny,
                    z=oz + sz * k / nz,
                ))
                nid += 1
    elements: list[Element] = []
    eid = start_id
    for k in range(nz):
        for j in range(ny):
            for i in range(nx):
                cell = [
                    node_index(i, j, k),         node_index(i + 1, j, k),
                    node_index(i + 1, j + 1, k), node_index(i, j + 1, k),
                    node_index(i, j, k + 1),     node_index(i + 1, j, k + 1),
                    node_index(i + 1, j + 1, k + 1), node_index(i, j + 1, k + 1),
                ]
                elements.append(Element(
                    id=eid, type=ElementType.SOLID_H8,
                    nodes=cell, material_id=material_id,
                ))
                eid += 1
    return nodes, elements
