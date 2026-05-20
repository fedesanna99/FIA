"""
Wrapper gmsh — mesh tetraedrica 3D di box parametrici e di geometrie 2D.

Funzioni:
    - mesh_box_tet(sizes, lc)       → tetraedrizza un box (Tet4)
    - mesh_polygon_2d_gmsh(poly, lc)→ mesh 2D tri3 di un poligono via gmsh

Output:
    (nodes, elements) compatibili con FEAModel.

NOTE:
    gmsh richiede gmsh.initialize() / gmsh.finalize() per ogni session.
    Si usa un context-manager interno per garantire la cleanup anche su error.
    L'output di gmsh ha nodi 1-indexed; lo si riallinea allo start_id locale.

Element types prodotti:
    - 2D    : ElementType.TRI3
    - 3D    : nessun tipo Tet4 nello schema attuale; per ora si scartano
              i tet e si tengono solo i triangoli di superficie (utili per
              shell di rivestimento). Tet4 sarà aggiunto in Fase futura.
"""
from __future__ import annotations
from contextlib import contextmanager
import signal
import threading
import gmsh

from schemas import Node, Element, ElementType


@contextmanager
def _gmsh_session(name: str = "fea_pro_mesh"):
    """Context manager per init/finalize gmsh in modo sicuro.

    gmsh.initialize() registra un signal handler per SIGINT che funziona
    solo nel main thread. Quando il codice gira in un worker thread (es.
    FastAPI TestClient), patchiamo temporaneamente signal.signal per
    permettere comunque l'init.
    """
    in_main_thread = threading.current_thread() is threading.main_thread()
    if not in_main_thread:
        _orig = signal.signal
        signal.signal = lambda *a, **kw: None  # no-op
    try:
        gmsh.initialize()
    finally:
        if not in_main_thread:
            signal.signal = _orig  # type: ignore
    gmsh.option.setNumber("General.Terminal", 0)  # silenzia stdout
    gmsh.model.add(name)
    try:
        yield
    finally:
        gmsh.finalize()


def mesh_polygon_2d_gmsh(
    polygon: list[tuple[float, float]],
    lc: float,
    *,
    z: float = 0.0,
    material_id: str = "concrete_c25",
    section_id: str | None = "shell_t100",
    start_node_id: int = 1,
    start_elem_id: int = 1,
) -> tuple[list[Node], list[Element]]:
    """Mesh 2D tri3 di un poligono con gmsh.

    Args:
        polygon       : lista (x,y), ordine ccw
        lc            : characteristic length (taglia mesh)
        z             : quota z costante dei nodi
        material_id   : material_id degli elementi
        section_id    : section_id (default shell_t100)
        start_node_id : id iniziale nodi
        start_elem_id : id iniziale elementi

    Limiti:
        Lavora con poligoni semplici (senza buchi). Per buchi usare la
        mesh_polygon_delaunay che li gestisce direttamente.
    """
    if len(polygon) < 3:
        raise ValueError("Polygon serve almeno 3 vertici")
    if lc <= 0:
        raise ValueError("lc deve essere > 0")

    with _gmsh_session():
        pts = [gmsh.model.geo.addPoint(p[0], p[1], 0.0, lc) for p in polygon]
        lines = [
            gmsh.model.geo.addLine(pts[i], pts[(i + 1) % len(pts)])
            for i in range(len(pts))
        ]
        loop = gmsh.model.geo.addCurveLoop(lines)
        surf = gmsh.model.geo.addPlaneSurface([loop])
        gmsh.model.geo.synchronize()
        gmsh.model.mesh.generate(2)

        node_tags, node_coords, _ = gmsh.model.mesh.getNodes()
        # node_coords è flat [x1,y1,z1,x2,y2,z2,...]
        coords = list(zip(node_coords[0::3], node_coords[1::3], node_coords[2::3]))
        tag_to_local: dict[int, int] = {}
        nodes: list[Node] = []
        for i, (tag, (x, y, _)) in enumerate(zip(node_tags, coords)):
            local_id = start_node_id + i
            tag_to_local[int(tag)] = local_id
            nodes.append(Node(id=local_id, x=float(x), y=float(y), z=z))

        # Triangoli (element type 2 in gmsh = 3-node triangle)
        types, _, conns = gmsh.model.mesh.getElements(dim=2)
        elements: list[Element] = []
        eid = start_elem_id
        for et, conn in zip(types, conns):
            if et != 2:
                continue  # solo triangoli
            for j in range(0, len(conn), 3):
                n1 = tag_to_local[int(conn[j])]
                n2 = tag_to_local[int(conn[j + 1])]
                n3 = tag_to_local[int(conn[j + 2])]
                elements.append(Element(
                    id=eid, type=ElementType.TRI3,
                    nodes=[n1, n2, n3],
                    material_id=material_id, section_id=section_id,
                ))
                eid += 1

    return nodes, elements


def mesh_box_surface(
    sizes: tuple[float, float, float],
    lc: float,
    *,
    origin: tuple[float, float, float] = (0.0, 0.0, 0.0),
    material_id: str = "steel_s355",
    section_id: str | None = "shell_t100",
    start_node_id: int = 1,
    start_elem_id: int = 1,
) -> tuple[list[Node], list[Element]]:
    """Mesh tri3 della superficie di un box parallelepipedo.

    Utile per generare shell di rivestimento o pre-tetraedrizzazione.
    """
    sx, sy, sz = sizes
    ox, oy, oz = origin
    if min(sx, sy, sz) <= 0:
        raise ValueError("sizes devono essere > 0")
    if lc <= 0:
        raise ValueError("lc deve essere > 0")

    with _gmsh_session("box_mesh"):
        box = gmsh.model.occ.addBox(ox, oy, oz, sx, sy, sz)
        gmsh.model.occ.synchronize()
        gmsh.option.setNumber("Mesh.CharacteristicLengthMax", lc)
        gmsh.model.mesh.generate(2)

        node_tags, node_coords, _ = gmsh.model.mesh.getNodes()
        coords = list(zip(node_coords[0::3], node_coords[1::3], node_coords[2::3]))
        tag_to_local: dict[int, int] = {}
        nodes: list[Node] = []
        for i, (tag, (x, y, z)) in enumerate(zip(node_tags, coords)):
            local_id = start_node_id + i
            tag_to_local[int(tag)] = local_id
            nodes.append(Node(id=local_id, x=float(x), y=float(y), z=float(z)))

        types, _, conns = gmsh.model.mesh.getElements(dim=2)
        elements: list[Element] = []
        eid = start_elem_id
        for et, conn in zip(types, conns):
            if et != 2:
                continue
            for j in range(0, len(conn), 3):
                n1 = tag_to_local[int(conn[j])]
                n2 = tag_to_local[int(conn[j + 1])]
                n3 = tag_to_local[int(conn[j + 2])]
                elements.append(Element(
                    id=eid, type=ElementType.TRI3,
                    nodes=[n1, n2, n3],
                    material_id=material_id, section_id=section_id,
                ))
                eid += 1

    return nodes, elements
