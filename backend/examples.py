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


def example_cube_solid_h8() -> FEAModel:
    """Cubo H8 unitario sotto trazione monoassiale (BL-3/BL-7 demo).

    Geometria: cubo 1×1×1 m, 1 elemento SOLID_H8. Base z=0 incastrata,
    forze nodali al top z=1 verso +z. Pronto per estrarre iso-superfici
    di σ_VM dalla statica.
    """
    nodes = [
        Node(id=1, x=0, y=0, z=0), Node(id=2, x=1, y=0, z=0),
        Node(id=3, x=1, y=1, z=0), Node(id=4, x=0, y=1, z=0),
        Node(id=5, x=0, y=0, z=1), Node(id=6, x=1, y=0, z=1),
        Node(id=7, x=1, y=1, z=1), Node(id=8, x=0, y=1, z=1),
    ]
    elements = [
        Element(id=1, type=ElementType.SOLID_H8,
                nodes=[1, 2, 3, 4, 5, 6, 7, 8],
                material_id="steel_s355"),
    ]
    constraints = [
        Constraint(id=i + 1, type=ConstraintType.FIXED, node_id=i + 1,
                   label=f"Incastro base {i + 1}")
        for i in range(4)
    ]
    # Trazione 100 kN per nodo al top (totale 400 kN)
    loads = [
        Load(id=i + 1, type=LoadType.NODAL, target_id=5 + i, fz=100_000.0,
             label=f"Trazione top {5 + i}")
        for i in range(4)
    ]
    return FEAModel(
        id="ex_cube_solid_h8",
        name="Cubo solido H8 (trazione)",
        description="Cubo 1×1×1 m, SOLID_H8, base incastrata, carico assiale 400 kN. "
                    "Esegui statica e poi Risultati → Iso 3D per visualizzare σ_VM.",
        is_3d=True,
        nodes=nodes, elements=elements, constraints=constraints, loads=loads,
    )


def example_cable_bridge_2d() -> FEAModel:
    """Ponte strallato 2D semplificato (BL-1 demo — cavi tension-only).

    Geometria: due pyloni (beam2D) di altezza 8 m sostengono un impalcato
    (beam2D) lungo 12 m via 4 cavi (cable2D). Il modello è perfetto per
    mostrare la non-linearità geometrica: i cavi entrano/escono di servizio
    a seconda del carico, modificando la rigidezza globale.
    """
    nodes = [
        # Impalcato (z=0): 7 nodi spaziati
        Node(id=1, x=0,  y=0, z=0, label="Spalla sx"),
        Node(id=2, x=2,  y=0, z=0),
        Node(id=3, x=4,  y=0, z=0, label="Attacco cavo SX2"),
        Node(id=4, x=6,  y=0, z=0, label="Mezzeria"),
        Node(id=5, x=8,  y=0, z=0, label="Attacco cavo DX2"),
        Node(id=6, x=10, y=0, z=0),
        Node(id=7, x=12, y=0, z=0, label="Spalla dx"),
        # Pyloni (base e top)
        Node(id=8,  x=2,  y=0, z=0, label="Base pylon SX"),  # coincide con n2 in y/z
        Node(id=9,  x=2,  y=8, z=0, label="Top pylon SX"),
        Node(id=10, x=10, y=0, z=0, label="Base pylon DX"),  # coincide con n6
        Node(id=11, x=10, y=8, z=0, label="Top pylon DX"),
    ]
    elements = [
        # Impalcato (beam2D, 6 segmenti)
        Element(id=1, type=ElementType.BEAM2D, nodes=[1, 2], material_id="steel_s355", section_id="ipe_400"),
        Element(id=2, type=ElementType.BEAM2D, nodes=[2, 3], material_id="steel_s355", section_id="ipe_400"),
        Element(id=3, type=ElementType.BEAM2D, nodes=[3, 4], material_id="steel_s355", section_id="ipe_400"),
        Element(id=4, type=ElementType.BEAM2D, nodes=[4, 5], material_id="steel_s355", section_id="ipe_400"),
        Element(id=5, type=ElementType.BEAM2D, nodes=[5, 6], material_id="steel_s355", section_id="ipe_400"),
        Element(id=6, type=ElementType.BEAM2D, nodes=[6, 7], material_id="steel_s355", section_id="ipe_400"),
        # Pyloni (beam2D)
        Element(id=7, type=ElementType.BEAM2D, nodes=[8,  9],  material_id="steel_s355", section_id="heb_300"),
        Element(id=8, type=ElementType.BEAM2D, nodes=[10, 11], material_id="steel_s355", section_id="heb_300"),
        # Cavi (cable2D, pre-tesi a 50 kN)
        Element(id=9,  type=ElementType.CABLE2D, nodes=[9,  3], material_id="cable_steel_y1860",
                section_id="cable_d50", pretension=50_000.0),
        Element(id=10, type=ElementType.CABLE2D, nodes=[9,  4], material_id="cable_steel_y1860",
                section_id="cable_d50", pretension=50_000.0),
        Element(id=11, type=ElementType.CABLE2D, nodes=[11, 4], material_id="cable_steel_y1860",
                section_id="cable_d50", pretension=50_000.0),
        Element(id=12, type=ElementType.CABLE2D, nodes=[11, 5], material_id="cable_steel_y1860",
                section_id="cable_d50", pretension=50_000.0),
    ]
    constraints = [
        Constraint(id=1, type=ConstraintType.PINNED, node_id=1,  label="Spalla sx"),
        Constraint(id=2, type=ConstraintType.PINNED, node_id=7,  label="Spalla dx"),
        Constraint(id=3, type=ConstraintType.FIXED,  node_id=8,  label="Base pylon SX"),
        Constraint(id=4, type=ConstraintType.FIXED,  node_id=10, label="Base pylon DX"),
    ]
    # Carico distribuito centrale + carico nodale "veicolo" in mezzeria
    loads = [
        Load(id=1, type=LoadType.DISTRIBUTED, target_id=3, qy=-15000.0, label="Folla impalcato"),
        Load(id=2, type=LoadType.DISTRIBUTED, target_id=4, qy=-15000.0, label="Folla impalcato"),
        Load(id=3, type=LoadType.DISTRIBUTED, target_id=5, qy=-15000.0, label="Folla impalcato"),
        Load(id=4, type=LoadType.NODAL, target_id=4, fy=-80000.0, label="Veicolo 80 kN"),
    ]
    return FEAModel(
        id="ex_cable_bridge_2d",
        name="Ponte strallato 2D",
        description="Impalcato L=12m sospeso da 4 cavi pre-tesi (50 kN), 2 pyloni H=8m. "
                    "Esegui Analisi → Non-lineare per vedere i cavi attivi/slack.",
        is_3d=False,
        nodes=nodes, elements=elements, constraints=constraints, loads=loads,
    )


def example_laminate_plate() -> FEAModel:
    """Piastra laminata cross-ply [0/90/0] (BL-4 demo).

    Geometria: piastra 1×1 m, 4×4 elementi SHELL_Q4, sezione `laminate_cross_ply`
    (3 strati 1 mm: 0°/90°/0°). Bordo y=0 incastrato (mensola), forza al bordo
    libero verso il basso. Mostra il comportamento ortotropo: la deflessione
    sotto carico è diversa rispetto allo stesso shell isotropo grazie alla
    rigidezza differenziata per direzione delle fibre.
    """
    n = 4
    L = 1.0
    nodes: list[Node] = []
    for j in range(n + 1):
        for i in range(n + 1):
            nodes.append(Node(id=j * (n + 1) + i + 1,
                              x=L * i / n, y=L * j / n, z=0.0))
    elements: list[Element] = []
    eid = 1
    for j in range(n):
        for i in range(n):
            n1 = j * (n + 1) + i + 1
            n2 = n1 + 1
            n3 = n2 + (n + 1)
            n4 = n1 + (n + 1)
            elements.append(Element(
                id=eid, type=ElementType.SHELL_Q4,
                nodes=[n1, n2, n3, n4],
                material_id="carbon_uni",
                section_id="laminate_cross_ply",
            ))
            eid += 1
    # Bordo y=0 incastrato
    constraints = [
        Constraint(id=i + 1, type=ConstraintType.FIXED, node_id=i + 1,
                   label=f"Incastro bordo {i + 1}")
        for i in range(n + 1)
    ]
    # Carico nodale al bordo libero y=L verso -z
    top_row = [(n) * (n + 1) + i + 1 for i in range(n + 1)]
    loads = [
        Load(id=k + 1, type=LoadType.NODAL, target_id=nid, fz=-200.0,
             label="Carico bordo libero")
        for k, nid in enumerate(top_row)
    ]
    return FEAModel(
        id="ex_laminate_plate",
        name="Piastra laminata 1×1 m (cross-ply)",
        description="Piastra 4×4 SHELL_Q4 con sezione laminata 0/90/0 (carbon, 3 mm). "
                    "Bordo y=0 incastrato, carico bordo libero -200 N. Mostra il "
                    "comportamento ortotropo di un composito.",
        is_3d=True,
        nodes=nodes, elements=elements, constraints=constraints, loads=loads,
    )


def example_rc_building_4st() -> FEAModel:
    """Edificio residenziale CA 4 piani regolare 12×8 m (TPL-1).

    Pianta 3×2 baie (4 m ciascuna), h interpiano 3 m, 4 piani fuori terra.
    Pilastri 30×50 cm e travi 30×50 cm in C25/30, solai shell 20 cm.
    Maglia solaio 12×8 (mesh 1×1 m). ~585 nodi · ~500 elementi.

    Scenario: rappresenta il modello FEM più tipico del primo anno di
    studio in Italia (relazione di calcolo NTC per fabbricato ordinario
    regolare). Pensato per ricezione visiva "ah qui modelliamo edifici
    veri", non per validazione benchmark.

    Norme: NTC 2018 §4.1/§7.4, EC2, EC8 §5 (regolarità in pianta+altezza).
    """
    # Geometria base
    nx_bays, ny_bays = 3, 2          # baie strutturali X · Y
    bay_size = 4.0                    # m
    nz_floors = 4                     # piani fuori terra
    h_floor = 3.0                     # m interpiano
    # Maglia solaio (1×1 m): più fitta della maglia strutturale
    n_div_x = 12                      # 12 div X = 13 nodi/riga
    n_div_y = 8                       # 8 div Y  = 9 nodi/riga
    n_floors_total = nz_floors + 1    # piano terra + 4 piani

    # === NODI === (5 piani × 13×9 = 585 nodi totali)
    nodes: list[Node] = []
    nid_counter = 1
    nodes_per_floor = (n_div_x + 1) * (n_div_y + 1)
    Lx = bay_size * nx_bays           # 12 m
    Ly = bay_size * ny_bays           # 8 m
    for k in range(n_floors_total):
        z = k * h_floor
        for j in range(n_div_y + 1):
            for i in range(n_div_x + 1):
                x = i * Lx / n_div_x
                y = j * Ly / n_div_y
                nodes.append(Node(id=nid_counter, x=x, y=y, z=z))
                nid_counter += 1

    def node_id(level: int, ix: int, iy: int) -> int:
        return level * nodes_per_floor + iy * (n_div_x + 1) + ix + 1

    # === ELEMENTI ===
    elements: list[Element] = []
    eid = 1
    # Pilastri sui nodi del reticolo strutturale (passo bay_size)
    col_step_x = n_div_x // nx_bays   # 4 div solaio = 1 baia
    col_step_y = n_div_y // ny_bays
    col_positions = [
        (ii * col_step_x, jj * col_step_y)
        for jj in range(ny_bays + 1)
        for ii in range(nx_bays + 1)
    ]

    # 1) Pilastri BEAM3D 30×50 cm (12 colonne × 4 livelli = 48)
    for k in range(nz_floors):
        for (ix, iy) in col_positions:
            elements.append(Element(
                id=eid, type=ElementType.BEAM3D,
                nodes=[node_id(k, ix, iy), node_id(k + 1, ix, iy)],
                material_id="concrete_c25", section_id="rect_300x500",
                orientation=[0, 0, 1],
            ))
            eid += 1

    # 2) Travi BEAM3D 30×50 cm sui solai (piani 1..4)
    for k in range(1, n_floors_total):
        # Travi direzione X (3 file × 3 segmenti × 4 piani = 36)
        for jj in range(ny_bays + 1):
            iy = jj * col_step_y
            for ii in range(nx_bays):
                elements.append(Element(
                    id=eid, type=ElementType.BEAM3D,
                    nodes=[node_id(k, ii * col_step_x, iy),
                           node_id(k, (ii + 1) * col_step_x, iy)],
                    material_id="concrete_c25", section_id="rect_300x500",
                    orientation=[0, 0, 1],
                ))
                eid += 1
        # Travi direzione Y (4 colonne × 2 segmenti × 4 piani = 32)
        for ii in range(nx_bays + 1):
            ix = ii * col_step_x
            for jj in range(ny_bays):
                elements.append(Element(
                    id=eid, type=ElementType.BEAM3D,
                    nodes=[node_id(k, ix, jj * col_step_y),
                           node_id(k, ix, (jj + 1) * col_step_y)],
                    material_id="concrete_c25", section_id="rect_300x500",
                    orientation=[0, 0, 1],
                ))
                eid += 1

    # 3) Solai SHELL_Q4 t=200 mm (12×8 × 4 piani = 384)
    for k in range(1, n_floors_total):
        for j in range(n_div_y):
            for i in range(n_div_x):
                n1 = node_id(k, i, j)
                n2 = node_id(k, i + 1, j)
                n3 = node_id(k, i + 1, j + 1)
                n4 = node_id(k, i, j + 1)
                elements.append(Element(
                    id=eid, type=ElementType.SHELL_Q4,
                    nodes=[n1, n2, n3, n4],
                    material_id="concrete_c25", section_id="shell_t200",
                ))
                eid += 1

    # === CONSTRAINTS === (12 pilastri incastrati alla base)
    constraints = [
        Constraint(id=k + 1, type=ConstraintType.FIXED,
                   node_id=node_id(0, ix, iy),
                   label=f"Incastro pilastro ({ix}, {iy})")
        for k, (ix, iy) in enumerate(col_positions)
    ]

    # === CARICHI === carico solaio 5 kN/m² → nodal su mesh 1×1 m
    # Area tributaria: interno = 1 m², bordo = 0.5 m², angolo = 0.25 m²
    loads: list[Load] = []
    lid = 1
    q_floor = -5000.0  # N/m² (peso proprio + permanente + variabile abitativo)
    for k in range(1, n_floors_total):
        for j in range(n_div_y + 1):
            for i in range(n_div_x + 1):
                fx = 0.5 if (i == 0 or i == n_div_x) else 1.0
                fy = 0.5 if (j == 0 or j == n_div_y) else 1.0
                loads.append(Load(
                    id=lid, type=LoadType.NODAL,
                    target_id=node_id(k, i, j),
                    fz=q_floor * fx * fy,
                    label=f"Solaio P{k}",
                ))
                lid += 1

    return FEAModel(
        id="ex_rc_building_4st",
        name="Edificio CA 4 piani regolare",
        description="Edificio residenziale CA 4 piani, pianta 12×8 m (3×2 baie). "
                    "Pilastri+travi 30×50 cm in C25/30, solai shell 20 cm. "
                    "Carico solai 5 kN/m². Modello tipico relazione NTC §4.1/§7.4.",
        is_3d=True,
        nodes=nodes, elements=elements, constraints=constraints, loads=loads,
    )


def example_steel_portal_hall() -> FEAModel:
    """Capannone industriale acciaio 1 campata NTC + EC3 (TPL-2).

    Pianta 20×40 m, 9 telai 2D ad interasse 5 m connessi
    longitudinalmente da arcarecci. Pilastri HEB300 h=7m, falde
    IPE300 inclinate 15° con colmo a quota 9.68m. Arcarecci IPE200
    su top-sx/colmo/top-dx. Controventi facciata Ø100 sulle 2 testate.

    Discretizzazione: pilastri+falde in 2 segmenti per analisi
    modale ricca → 9 nodi/telaio × 9 telai = 81 nodi totali.

    Scenario: il "modello tipo" del professionista italiano in
    industria/PMI/agricoltura (~70-80% degli ing strutturali).
    Apre la stagione "modelli professional-grade" insieme a TPL-1.

    Norme: NTC 2018 §4.2 (acciaio), EC3 §6 (resistenza+stabilità),
    EC1-1-4 (vento), eventuali EC8 §6 (sisma capannoni).
    """
    # Geometria globale
    n_telai = 9            # 40m / 5m + 1 = 9 telai
    interasse = 5.0        # m
    span = 20.0            # m luce capannone
    h_pilastro = 7.0       # m altezza pilastri
    pendenza_deg = 15.0
    import math
    h_colmo = h_pilastro + (span / 2) * math.tan(math.radians(pendenza_deg))

    # === NODI === 9 nodi/telaio × 9 telai = 81
    # Layout x-z per ogni telaio (y = i × interasse):
    #   0: base sx (0, y, 0)
    #   1: mid pilastro sx (0, y, 3.5)
    #   2: top sx (0, y, 7)
    #   3: mid falda sx (5, y, 8.34)
    #   4: colmo (10, y, 9.68)
    #   5: mid falda dx (15, y, 8.34)
    #   6: top dx (20, y, 7)
    #   7: mid pilastro dx (20, y, 3.5)
    #   8: base dx (20, y, 0)
    NODES_PER_TELAIO = 9
    z_top = h_pilastro
    z_mid_pil = h_pilastro / 2
    z_mid_falda = h_pilastro + (h_colmo - h_pilastro) / 2

    nodes: list[Node] = []
    for i in range(n_telai):
        y = i * interasse
        base_nid = i * NODES_PER_TELAIO + 1
        nodes.extend([
            Node(id=base_nid + 0, x=0.0,         y=y, z=0.0),
            Node(id=base_nid + 1, x=0.0,         y=y, z=z_mid_pil),
            Node(id=base_nid + 2, x=0.0,         y=y, z=z_top),
            Node(id=base_nid + 3, x=span / 4,    y=y, z=z_mid_falda),
            Node(id=base_nid + 4, x=span / 2,    y=y, z=h_colmo),
            Node(id=base_nid + 5, x=3 * span / 4, y=y, z=z_mid_falda),
            Node(id=base_nid + 6, x=span,        y=y, z=z_top),
            Node(id=base_nid + 7, x=span,        y=y, z=z_mid_pil),
            Node(id=base_nid + 8, x=span,        y=y, z=0.0),
        ])

    def nid(telaio: int, slot: int) -> int:
        """telaio: 0..8, slot: 0..8 (vedi schema sopra)."""
        return telaio * NODES_PER_TELAIO + slot + 1

    # === ELEMENTI ===
    elements: list[Element] = []
    eid = 1

    # 1) Telai 2D (8 elementi BEAM3D/telaio × 9 = 72)
    #    - 2 segmenti pilastro sx (base→mid, mid→top)
    #    - 2 segmenti falda sx (top sx→mid falda, mid falda→colmo)
    #    - 2 segmenti falda dx (colmo→mid falda, mid falda→top dx)
    #    - 2 segmenti pilastro dx (top→mid, mid→base)
    for i in range(n_telai):
        chain = [
            (nid(i, 0), nid(i, 1), "heb_300"),  # pilastro sx base→mid
            (nid(i, 1), nid(i, 2), "heb_300"),  # pilastro sx mid→top
            (nid(i, 2), nid(i, 3), "ipe_300"),  # falda sx top→mid
            (nid(i, 3), nid(i, 4), "ipe_300"),  # falda sx mid→colmo
            (nid(i, 4), nid(i, 5), "ipe_300"),  # falda dx colmo→mid
            (nid(i, 5), nid(i, 6), "ipe_300"),  # falda dx mid→top
            (nid(i, 6), nid(i, 7), "heb_300"),  # pilastro dx top→mid
            (nid(i, 7), nid(i, 8), "heb_300"),  # pilastro dx mid→base
        ]
        for n_a, n_b, sect in chain:
            elements.append(Element(
                id=eid, type=ElementType.BEAM3D,
                nodes=[n_a, n_b],
                material_id="steel_s355", section_id=sect,
                orientation=[0, 1, 0],
            ))
            eid += 1

    # 2) Arcarecci longitudinali IPE200 (3 linee × 8 segmenti = 24)
    #    sui top sx (slot 2), colmo (slot 4), top dx (slot 6)
    for slot in (2, 4, 6):
        for i in range(n_telai - 1):
            elements.append(Element(
                id=eid, type=ElementType.BEAM3D,
                nodes=[nid(i, slot), nid(i + 1, slot)],
                material_id="steel_s355", section_id="ipe_200",
                orientation=[1, 0, 0],
            ))
            eid += 1

    # 3) Controventi diagonali Ø100 sulle 2 facciate di testata (4 elem)
    #    Telaio 0 e telaio 8: croce sui pilastri base-base/top-top
    for i in (0, n_telai - 1):
        # Diagonale 1: base sx (i) → top dx (i)
        elements.append(Element(
            id=eid, type=ElementType.TRUSS3D,
            nodes=[nid(i, 0), nid(i, 6)],
            material_id="steel_s355", section_id="circ_100",
        ))
        eid += 1
        # Diagonale 2: base dx (i) → top sx (i)
        elements.append(Element(
            id=eid, type=ElementType.TRUSS3D,
            nodes=[nid(i, 8), nid(i, 2)],
            material_id="steel_s355", section_id="circ_100",
        ))
        eid += 1

    # === CONSTRAINTS === (18 pilastri incastrati alla base)
    constraints = []
    cid = 1
    for i in range(n_telai):
        for slot in (0, 8):  # base sx + base dx
            constraints.append(Constraint(
                id=cid, type=ConstraintType.FIXED, node_id=nid(i, slot),
                label=f"Incastro telaio {i + 1} {'sx' if slot == 0 else 'dx'}",
            ))
            cid += 1

    # === CARICHI ===
    # Copertura (permanente + neve) ≈ -3 kN/m² × area trib nodale
    # Vento orizzontale lato sx ≈ +5 kN/nodo su top pilastri sx
    loads: list[Load] = []
    lid = 1
    # Carico copertura: NODAL fz negativo su tutti i nodi falda+colmo.
    # Area tributaria per nodo interno: interasse 5m × (span/4) = 25 m² → 75 kN
    # Nodo bordo (telaio 0 o 8): metà area = 37.5 kN
    for i in range(n_telai):
        is_bordo = (i == 0 or i == n_telai - 1)
        factor_y = 0.5 if is_bordo else 1.0
        for slot in (2, 3, 4, 5, 6):  # top sx, mid sx, colmo, mid dx, top dx
            # Area trib in x per slot: top=2.5, mid=5, colmo=5, mid=5, top=2.5
            area_x = 2.5 if slot in (2, 6) else 5.0
            area = area_x * interasse * factor_y
            fz = -3000.0 * area  # 3 kN/m² verso il basso
            loads.append(Load(
                id=lid, type=LoadType.NODAL,
                target_id=nid(i, slot), fz=fz,
                label=f"Copertura telaio {i + 1}",
            ))
            lid += 1
    # Vento orizzontale lato sx → +x sui top pilastri sx (slot 2)
    for i in range(n_telai):
        is_bordo = (i == 0 or i == n_telai - 1)
        f_vento = 2500.0 if is_bordo else 5000.0
        loads.append(Load(
            id=lid, type=LoadType.NODAL,
            target_id=nid(i, 2), fx=f_vento,
            label=f"Vento telaio {i + 1}",
        ))
        lid += 1

    return FEAModel(
        id="ex_steel_portal_hall",
        name="Capannone acciaio 1 campata",
        description="Capannone industriale acciaio S355, 20×40 m, 9 telai interasse 5 m. "
                    "Pilastri HEB300 h=7m, falde IPE300 inclinate 15° colmo 9.68m, "
                    "arcarecci IPE200, controventi facciate Ø100. NTC §4.2 + EC3.",
        is_3d=True,
        nodes=nodes, elements=elements, constraints=constraints, loads=loads,
    )


def build_example_models() -> list[FEAModel]:
    return [
        example_simple_beam_2d(),
        example_portal_frame_2d(),
        example_truss_3d(),
        example_shell_plate(),
        example_tower_3d(),
        example_tri3_membrane(),
        example_cube_solid_h8(),
        example_cable_bridge_2d(),
        example_laminate_plate(),
        example_rc_building_4st(),       # TPL-1 (30/05/2026 sera)
        example_steel_portal_hall(),     # TPL-2 (30/05/2026 sera)
    ]
