"""Modelli FEA precaricati per dimostrazione e test."""
from __future__ import annotations
from schemas import (
    FEAModel, Node, Element, Load, Constraint,
    ElementType, LoadType, ConstraintType,
)


def example_simple_beam_2d() -> FEAModel:
    """Trave bi-appoggiata 2D, 10 elementi beam2D, carico distribuito."""
    n_div = 10
    L = 6.0
    nodes = [Node(id=i + 1, x=L * i / n_div, y=0.0, z=0.0) for i in range(n_div + 1)]
    elements = [
        Element(id=i + 1, type=ElementType.BEAM2D, nodes=[i + 1, i + 2],
                material_id="steel_s355", section_id="ipe_300")
        for i in range(n_div)
    ]
    constraints = [
        Constraint(id=1, type=ConstraintType.PINNED, node_id=1, label="Cerniera sx"),
        Constraint(id=2, type=ConstraintType.ROLLER_Y, node_id=n_div + 1, label="Carrello dx"),
    ]
    loads = [Load(id=i + 1, type=LoadType.DISTRIBUTED, target_id=i + 1, qy=-10000.0,
                  label="q = 10 kN/m") for i in range(n_div)]
    return FEAModel(
        id="ex_simple_beam_2d",
        name="Trave bi-appoggiata 2D",
        description="Trave IPE 300 L=6m, carico distribuito 10 kN/m verso il basso.",
        is_3d=False,
        nodes=nodes, elements=elements, constraints=constraints, loads=loads,
    )


def example_portal_frame_2d() -> FEAModel:
    """Telaio portale 2D, carico laterale (vento)."""
    nodes = [
        Node(id=1, x=0, y=0, z=0),
        Node(id=2, x=0, y=4.0, z=0),
        Node(id=3, x=6.0, y=4.0, z=0),
        Node(id=4, x=6.0, y=0, z=0),
        Node(id=5, x=3.0, y=4.0, z=0),
    ]
    elements = [
        Element(id=1, type=ElementType.BEAM2D, nodes=[1, 2], material_id="steel_s235", section_id="hea_200"),
        Element(id=2, type=ElementType.BEAM2D, nodes=[2, 5], material_id="steel_s235", section_id="ipe_300"),
        Element(id=3, type=ElementType.BEAM2D, nodes=[5, 3], material_id="steel_s235", section_id="ipe_300"),
        Element(id=4, type=ElementType.BEAM2D, nodes=[3, 4], material_id="steel_s235", section_id="hea_200"),
    ]
    constraints = [
        Constraint(id=1, type=ConstraintType.FIXED, node_id=1, label="Incastro sx"),
        Constraint(id=2, type=ConstraintType.FIXED, node_id=4, label="Incastro dx"),
    ]
    loads = [
        Load(id=1, type=LoadType.NODAL, target_id=2, fx=15000.0, label="Vento 15 kN"),
        Load(id=2, type=LoadType.DISTRIBUTED, target_id=2, qy=-8000.0, label="Carico tetto sx"),
        Load(id=3, type=LoadType.DISTRIBUTED, target_id=3, qy=-8000.0, label="Carico tetto dx"),
    ]
    return FEAModel(
        id="ex_portal_frame_2d",
        name="Telaio portale 2D",
        description="Telaio portale H=4m L=6m con vento e carico tetto.",
        is_3d=False,
        nodes=nodes, elements=elements, constraints=constraints, loads=loads,
    )


def example_truss_3d() -> FEAModel:
    """Reticolo spaziale 3D — torre semplice 4 aste / 4 livelli."""
    b = 2.0
    h = 2.5
    nodes: list[Node] = []
    nid = 1
    for k in range(4):
        z = k * h
        nodes += [
            Node(id=nid,     x=0, y=0, z=z),
            Node(id=nid + 1, x=b, y=0, z=z),
            Node(id=nid + 2, x=b, y=b, z=z),
            Node(id=nid + 3, x=0, y=b, z=z),
        ]
        nid += 4
    elements: list[Element] = []
    eid = 1
    for k in range(3):
        base = k * 4 + 1
        top = base + 4
        for i in range(4):
            elements.append(Element(id=eid, type=ElementType.TRUSS3D, nodes=[base + i, top + i],
                                    material_id="steel_s355", section_id="circ_100"))
            eid += 1
        for i in range(4):
            elements.append(Element(id=eid, type=ElementType.TRUSS3D,
                                    nodes=[top + i, top + ((i + 1) % 4)],
                                    material_id="steel_s355", section_id="circ_100"))
            eid += 1
        for i in range(4):
            elements.append(Element(id=eid, type=ElementType.TRUSS3D,
                                    nodes=[base + i, top + ((i + 1) % 4)],
                                    material_id="steel_s355", section_id="circ_100"))
            eid += 1
    constraints = [Constraint(id=i + 1, type=ConstraintType.PINNED, node_id=i + 1,
                              label=f"Cerniera base {i + 1}") for i in range(4)]
    top_base = 12
    loads = [
        Load(id=1, type=LoadType.NODAL, target_id=top_base + 1, fx=5000, fy=2000, label="Carico nodale 1"),
        Load(id=2, type=LoadType.NODAL, target_id=top_base + 2, fx=5000, fy=-2000, label="Carico nodale 2"),
        Load(id=3, type=LoadType.NODAL, target_id=top_base + 3, fz=-12000, label="Carico verticale 1"),
        Load(id=4, type=LoadType.NODAL, target_id=top_base + 4, fz=-12000, label="Carico verticale 2"),
    ]
    return FEAModel(
        id="ex_truss_3d",
        name="Reticolo spaziale 3D",
        description="Torre reticolare 4 livelli, ø100mm, carichi al top.",
        is_3d=True,
        nodes=nodes, elements=elements, constraints=constraints, loads=loads,
    )


def example_shell_plate() -> FEAModel:
    """Piastra quadrata 4x4 shell Q4 incastrata su 4 lati, pressione uniforme."""
    n = 4
    L = 2.0
    nodes: list[Node] = []
    for j in range(n + 1):
        for i in range(n + 1):
            nodes.append(Node(id=j * (n + 1) + i + 1, x=L * i / n, y=L * j / n, z=0.0))
    elements: list[Element] = []
    eid = 1
    for j in range(n):
        for i in range(n):
            n1 = j * (n + 1) + i + 1
            n2 = n1 + 1
            n3 = n2 + (n + 1)
            n4 = n1 + (n + 1)
            elements.append(Element(id=eid, type=ElementType.SHELL_Q4,
                                    nodes=[n1, n2, n3, n4],
                                    material_id="steel_s355", section_id="shell_t100"))
            eid += 1
    constraints: list[Constraint] = []
    cid = 1
    for j in range(n + 1):
        for i in range(n + 1):
            if i == 0 or i == n or j == 0 or j == n:
                nid = j * (n + 1) + i + 1
                constraints.append(Constraint(id=cid, type=ConstraintType.FIXED, node_id=nid))
                cid += 1
    inner_nodes = [j * (n + 1) + i + 1 for j in range(1, n) for i in range(1, n)]
    loads = [Load(id=k + 1, type=LoadType.NODAL, target_id=nid, fz=-5000, label="Pressione equiv.")
             for k, nid in enumerate(inner_nodes)]
    return FEAModel(
        id="ex_shell_plate",
        name="Piastra quadrata 2×2 m",
        description="Piastra acciaio t=100mm incastrata, carichi nodali verso il basso.",
        is_3d=True,
        nodes=nodes, elements=elements, constraints=constraints, loads=loads,
    )


def example_tower_3d() -> FEAModel:
    """Torre 3D con beam3D, predisposta per analisi modale e dinamica sismica."""
    b = 3.0
    h_floor = 3.0
    n_floor = 8
    nodes: list[Node] = []
    for k in range(n_floor + 1):
        z = k * h_floor
        for j in range(2):
            for i in range(2):
                nid = k * 4 + j * 2 + i + 1
                nodes.append(Node(id=nid, x=i * b, y=j * b, z=z))
    elements: list[Element] = []
    eid = 1
    for k in range(n_floor):
        base = k * 4 + 1
        top = base + 4
        for i in range(4):
            elements.append(Element(id=eid, type=ElementType.BEAM3D,
                                    nodes=[base + i, top + i],
                                    material_id="steel_s355", section_id="heb_300",
                                    orientation=[0, 0, 1]))
            eid += 1
        pairs = [(top, top + 1), (top + 1, top + 3), (top + 3, top + 2), (top + 2, top)]
        for a, b_ in pairs:
            elements.append(Element(id=eid, type=ElementType.BEAM3D,
                                    nodes=[a, b_], material_id="steel_s355",
                                    section_id="ipe_300", orientation=[0, 0, 1]))
            eid += 1
    constraints = [Constraint(id=i + 1, type=ConstraintType.FIXED, node_id=i + 1) for i in range(4)]
    loads: list[Load] = []
    lid = 1
    for k in range(1, n_floor + 1):
        for i in range(4):
            nid = k * 4 + i + 1
            loads.append(Load(id=lid, type=LoadType.NODAL_MASS, target_id=nid, mass=5000.0,
                              label=f"Massa piano {k}"))
            lid += 1
    for k in range(1, n_floor + 1):
        for i in range(4):
            nid = k * 4 + i + 1
            loads.append(Load(id=lid, type=LoadType.NODAL, target_id=nid, fx=2500.0,
                              label=f"Vento piano {k}"))
            lid += 1
    loads.append(Load(
        id=lid, type=LoadType.DYNAMIC,
        target_id=n_floor * 4 + 1,
        direction=[1.0, 0.0, 0.0],
        time_history=[(0.0, 0.0), (0.1, 50000.0), (0.5, 0.0), (1.0, 0.0)],
        label="Impulso orizzontale 50 kN",
    ))
    return FEAModel(
        id="ex_tower_3d",
        name="Torre 3D",
        description="Torre 8 piani in acciaio, predisposta per analisi modale e dinamica.",
        is_3d=True,
        nodes=nodes, elements=elements, constraints=constraints, loads=loads,
    )


def example_tri3_membrane() -> FEAModel:
    """Mensola membranale 2D in T3: piastra incastrata a sx con sismica X."""
    from core.mesh import mesh_rectangle_tri3
    nodes, els = mesh_rectangle_tri3(
        (0, 0, 0), (4, 0, 0), (4, 1.5, 0), (0, 1.5, 0),
        nx=8, ny=4,
        material_id="steel_s355", section_id="shell_t100",
        start_id=1,
    )
    nx = 8
    constraints: list[Constraint] = []
    cid = 1
    for j in range(4 + 1):
        nid = j * (nx + 1) + 1
        constraints.append(Constraint(id=cid, type=ConstraintType.FIXED, node_id=nid))
        cid += 1
    loads: list[Load] = []
    lid = 1
    for n in nodes:
        loads.append(Load(id=lid, type=LoadType.NODAL_MASS, target_id=n.id, mass=20.0))
        lid += 1
    import numpy as np
    times = np.linspace(0, 2.0, 80)
    ag = 4.0 * np.sin(2 * np.pi * 5.0 * times) * np.exp(-times * 1.5)
    loads.append(Load(
        id=lid, type=LoadType.GROUND_ACCEL, target_id=0,
        direction=[1.0, 0.0, 0.0],
        time_history=[(float(t), float(a)) for t, a in zip(times, ag)],
        label="Sisma X (sinusoide smorzata)",
    ))
    return FEAModel(
        id="ex_tri3_seismic",
        name="Membrana T3 sismica",
        description="Piastra 4×1.5 m in T3 plane-stress, incastrata a sx, "
                    "accelerogramma X sinusoidale smorzato.",
        is_3d=True,
        nodes=nodes, elements=els, constraints=constraints, loads=loads,
    )


def build_example_models() -> list[FEAModel]:
    return [
        example_simple_beam_2d(),
        example_portal_frame_2d(),
        example_truss_3d(),
        example_shell_plate(),
        example_tower_3d(),
        example_tri3_membrane(),
    ]
