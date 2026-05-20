"""CRUD modelli FEA."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from schemas import FEAModel, Node, Element, Load, Constraint
from schemas.model import ModelUpdate
from core.mesh import (
    validate_model, mesh_line, mesh_rectangle_shell,
    mesh_rectangle_tri3, mesh_box_solid,
    mesh_polygon_delaunay, mesh_polygon_2d_gmsh,
    rectangle, l_shape, t_shape, circle, ring,
    auto_detect,
)
import storage

router = APIRouter()


class CreateModelRequest(BaseModel):
    name: str = "Untitled Model"
    description: str | None = None
    is_3d: bool = True


@router.get("/", response_model=list[FEAModel])
def list_all():
    return storage.list_models()


@router.post("/", response_model=FEAModel)
def create(req: CreateModelRequest):
    model = FEAModel(
        id=storage.new_id(),
        name=req.name,
        description=req.description,
        is_3d=req.is_3d,
    )
    return storage.save_model(model)


@router.post("/import", response_model=FEAModel)
def import_model(payload: FEAModel):
    """Importa un modello da JSON: gli viene assegnato un nuovo id (no overwrite)."""
    payload.id = storage.new_id()
    return storage.save_model(payload)


@router.post("/{model_id}/duplicate", response_model=FEAModel)
def duplicate_model(model_id: str):
    m = storage.get_model(model_id)
    if not m:
        raise HTTPException(404, f"Modello {model_id} non trovato")
    copy = m.model_copy(deep=True)
    copy.id = storage.new_id()
    copy.name = f"{m.name} (copia)"
    return storage.save_model(copy)


@router.get("/{model_id}", response_model=FEAModel)
def get(model_id: str):
    m = storage.get_model(model_id)
    if not m:
        raise HTTPException(404, f"Modello {model_id} non trovato")
    return m


@router.put("/{model_id}", response_model=FEAModel)
def update(model_id: str, payload: FEAModel):
    if not storage.get_model(model_id):
        raise HTTPException(404, f"Modello {model_id} non trovato")
    payload.id = model_id
    return storage.save_model(payload)


@router.patch("/{model_id}", response_model=FEAModel)
def patch(model_id: str, payload: ModelUpdate):
    m = storage.get_model(model_id)
    if not m:
        raise HTTPException(404, f"Modello {model_id} non trovato")
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(m, k, v)
    return storage.save_model(m)


@router.delete("/{model_id}")
def delete(model_id: str):
    if not storage.delete_model(model_id):
        raise HTTPException(404, f"Modello {model_id} non trovato")
    return {"deleted": model_id}


class MeshLineReq(BaseModel):
    p0: tuple[float, float, float]
    p1: tuple[float, float, float]
    n_div: int = 10
    material_id: str = "steel_s355"
    section_id: str = "ipe_300"
    element_type: str = "beam2d"


class MeshShellReq(BaseModel):
    p0: tuple[float, float, float]
    p1: tuple[float, float, float]
    p2: tuple[float, float, float]
    p3: tuple[float, float, float]
    nx: int = 4
    ny: int = 4
    material_id: str = "steel_s355"
    section_id: str = "shell_t100"


class MeshBoxReq(BaseModel):
    origin: tuple[float, float, float]
    sizes: tuple[float, float, float]
    nx: int = 2
    ny: int = 2
    nz: int = 2
    material_id: str = "concrete_c30"


def _append_mesh(model_id: str, nodes_new, elements_new):
    m = storage.get_model(model_id)
    if not m:
        raise HTTPException(404, f"Modello {model_id} non trovato")
    next_node_id = (max((n.id for n in m.nodes), default=0) + 1) if m.nodes else 1
    next_elem_id = (max((e.id for e in m.elements), default=0) + 1) if m.elements else 1
    id_remap: dict[int, int] = {}
    for i, n in enumerate(nodes_new):
        new_id = next_node_id + i
        id_remap[n.id] = new_id
        n.id = new_id
        m.nodes.append(n)
    for j, e in enumerate(elements_new):
        e.id = next_elem_id + j
        e.nodes = [id_remap[nid] for nid in e.nodes]
        m.elements.append(e)
    storage.save_model(m)
    return {"added_nodes": len(nodes_new), "added_elements": len(elements_new), "model": m}


@router.post("/{model_id}/mesh/line")
def mesh_line_endpoint(model_id: str, req: MeshLineReq):
    from schemas import ElementType
    try:
        etype = ElementType(req.element_type)
    except ValueError:
        raise HTTPException(400, f"Tipo elemento non valido: {req.element_type}")
    nodes, els = mesh_line(req.p0, req.p1, req.n_div, req.material_id, req.section_id, etype, start_id=1)
    return _append_mesh(model_id, nodes, els)


@router.post("/{model_id}/mesh/shell")
def mesh_shell_endpoint(model_id: str, req: MeshShellReq):
    nodes, els = mesh_rectangle_shell(req.p0, req.p1, req.p2, req.p3, req.nx, req.ny,
                                       req.material_id, req.section_id, start_id=1)
    return _append_mesh(model_id, nodes, els)


@router.post("/{model_id}/mesh/tri")
def mesh_tri_endpoint(model_id: str, req: MeshShellReq):
    """Mesh strutturata triangolare T3 (plane-stress)."""
    nodes, els = mesh_rectangle_tri3(req.p0, req.p1, req.p2, req.p3, req.nx, req.ny,
                                      req.material_id, req.section_id, start_id=1)
    return _append_mesh(model_id, nodes, els)


@router.post("/{model_id}/mesh/box")
def mesh_box_endpoint(model_id: str, req: MeshBoxReq):
    nodes, els = mesh_box_solid(req.origin, req.sizes, req.nx, req.ny, req.nz, req.material_id, start_id=1)
    return _append_mesh(model_id, nodes, els)


class MeshParametricReq(BaseModel):
    """Genera mesh tri3 di una forma parametrica.

    shape:
      - 'rectangle' : params = {w, h, ox, oy}
      - 'l'         : params = {long_side, short_side, thickness, ox, oy}
      - 't'         : params = {flange_width, total_height, web_thickness, flange_thickness}
      - 'circle'    : params = {radius, n_segments, cx, cy}
      - 'ring'      : params = {radius_outer, radius_inner, n_segments, cx, cy}
    h: caratteristica della mesh (taglia triangoli).
    mesher: 'delaunay' (scipy, supporta holes) | 'gmsh' (no holes ma più regolare).
    """
    shape: str
    params: dict
    h: float = 0.5
    z: float = 0.0
    material_id: str = "concrete_c25"
    section_id: str | None = "shell_t100"
    mesher: str = "delaunay"


def _build_parametric_polygon(shape: str, params: dict):
    """Restituisce (polygon, holes) per la shape richiesta."""
    if shape == "rectangle":
        ox = params.get("ox", 0.0); oy = params.get("oy", 0.0)
        return rectangle(params["w"], params["h"], (ox, oy)), []
    if shape == "l":
        ox = params.get("ox", 0.0); oy = params.get("oy", 0.0)
        return l_shape(params["long_side"], params["short_side"],
                        params["thickness"], (ox, oy)), []
    if shape == "t":
        ox = params.get("ox", 0.0); oy = params.get("oy", 0.0)
        return t_shape(params["flange_width"], params["total_height"],
                        params["web_thickness"], params["flange_thickness"],
                        (ox, oy)), []
    if shape == "circle":
        cx = params.get("cx", 0.0); cy = params.get("cy", 0.0)
        return circle(params["radius"], params.get("n_segments", 32),
                       (cx, cy)), []
    if shape == "ring":
        cx = params.get("cx", 0.0); cy = params.get("cy", 0.0)
        outer, holes = ring(params["radius_outer"], params["radius_inner"],
                             params.get("n_segments", 32), (cx, cy))
        return outer, holes
    raise HTTPException(400, f"shape sconosciuta: {shape}")


@router.post("/{model_id}/mesh/parametric")
def mesh_parametric_endpoint(model_id: str, req: MeshParametricReq):
    try:
        polygon, holes = _build_parametric_polygon(req.shape, req.params)
    except KeyError as e:
        raise HTTPException(400, f"Parametro mancante per shape '{req.shape}': {e}")
    except ValueError as e:
        raise HTTPException(400, f"Parametri non validi: {e}")
    if req.mesher == "delaunay":
        nodes, els = mesh_polygon_delaunay(
            polygon, h=req.h, holes=holes or None, z=req.z,
            material_id=req.material_id, section_id=req.section_id,
            start_node_id=1, start_elem_id=1,
        )
    elif req.mesher == "gmsh":
        if holes:
            raise HTTPException(400, "Mesher 'gmsh' non supporta holes; usa 'delaunay'.")
        nodes, els = mesh_polygon_2d_gmsh(
            polygon, lc=req.h, z=req.z,
            material_id=req.material_id, section_id=req.section_id,
            start_node_id=1, start_elem_id=1,
        )
    else:
        raise HTTPException(400, f"mesher sconosciuto: {req.mesher}")
    return _append_mesh(model_id, nodes, els)


@router.get("/{model_id}/auto-detect")
def auto_detect_endpoint(model_id: str):
    """Esegue auto-detection di problemi e ritorna issue list con suggerimenti."""
    m = storage.get_model(model_id)
    if not m:
        raise HTTPException(404, f"Modello {model_id} non trovato")
    issues = auto_detect(m)
    return {
        "model_id": model_id,
        "n_issues": len(issues),
        "issues": [
            {"level": i.level, "code": i.code, "message": i.message,
              "suggested_fix": i.suggested_fix,
              "entity_type": i.entity_type, "entity_ids": i.entity_ids}
            for i in issues
        ],
    }


@router.get("/{model_id}/validate")
def validate(model_id: str):
    m = storage.get_model(model_id)
    if not m:
        raise HTTPException(404, f"Modello {model_id} non trovato")
    issues = validate_model(m)
    return {
        "model_id": model_id,
        "n_issues": len(issues),
        "errors": sum(1 for i in issues if i.level.value == "error"),
        "warnings": sum(1 for i in issues if i.level.value == "warning"),
        "issues": [
            {"level": i.level.value, "message": i.message,
             "entity_type": i.entity_type, "entity_id": i.entity_id}
            for i in issues
        ],
    }


def _next_id(items) -> int:
    return (max((x.id for x in items), default=0) + 1)


@router.post("/{model_id}/nodes", response_model=Node)
def add_node(model_id: str, node: Node):
    m = storage.get_model(model_id)
    if not m: raise HTTPException(404, "Modello non trovato")
    if any(n.id == node.id for n in m.nodes):
        node.id = _next_id(m.nodes)
    m.nodes.append(node)
    storage.save_model(m)
    return node


@router.put("/{model_id}/nodes/{node_id}", response_model=Node)
def update_node(model_id: str, node_id: int, node: Node):
    m = storage.get_model(model_id)
    if not m: raise HTTPException(404, "Modello non trovato")
    for i, n in enumerate(m.nodes):
        if n.id == node_id:
            node.id = node_id
            m.nodes[i] = node
            storage.save_model(m)
            return node
    raise HTTPException(404, "Nodo non trovato")


@router.delete("/{model_id}/nodes/{node_id}")
def delete_node(model_id: str, node_id: int):
    m = storage.get_model(model_id)
    if not m: raise HTTPException(404, "Modello non trovato")
    m.nodes = [n for n in m.nodes if n.id != node_id]
    m.elements = [e for e in m.elements if node_id not in e.nodes]
    m.loads = [l for l in m.loads if not (l.type.value == "nodal" and l.target_id == node_id)]
    m.constraints = [c for c in m.constraints if c.node_id != node_id]
    storage.save_model(m)
    return {"deleted": node_id}


@router.post("/{model_id}/elements", response_model=Element)
def add_element(model_id: str, element: Element):
    m = storage.get_model(model_id)
    if not m: raise HTTPException(404, "Modello non trovato")
    if any(e.id == element.id for e in m.elements):
        element.id = _next_id(m.elements)
    m.elements.append(element)
    storage.save_model(m)
    return element


@router.put("/{model_id}/elements/{element_id}", response_model=Element)
def update_element(model_id: str, element_id: int, element: Element):
    m = storage.get_model(model_id)
    if not m: raise HTTPException(404, "Modello non trovato")
    for i, e in enumerate(m.elements):
        if e.id == element_id:
            element.id = element_id
            m.elements[i] = element
            storage.save_model(m)
            return element
    raise HTTPException(404, "Elemento non trovato")


@router.delete("/{model_id}/elements/{element_id}")
def delete_element(model_id: str, element_id: int):
    m = storage.get_model(model_id)
    if not m: raise HTTPException(404, "Modello non trovato")
    m.elements = [e for e in m.elements if e.id != element_id]
    storage.save_model(m)
    return {"deleted": element_id}


@router.post("/{model_id}/loads", response_model=Load)
def add_load(model_id: str, load: Load):
    m = storage.get_model(model_id)
    if not m: raise HTTPException(404, "Modello non trovato")
    if any(l.id == load.id for l in m.loads):
        load.id = _next_id(m.loads)
    m.loads.append(load)
    storage.save_model(m)
    return load


@router.put("/{model_id}/loads/{load_id}", response_model=Load)
def update_load(model_id: str, load_id: int, load: Load):
    m = storage.get_model(model_id)
    if not m: raise HTTPException(404, "Modello non trovato")
    for i, l in enumerate(m.loads):
        if l.id == load_id:
            load.id = load_id
            m.loads[i] = load
            storage.save_model(m)
            return load
    raise HTTPException(404, "Carico non trovato")


@router.delete("/{model_id}/loads/{load_id}")
def delete_load(model_id: str, load_id: int):
    m = storage.get_model(model_id)
    if not m: raise HTTPException(404, "Modello non trovato")
    m.loads = [l for l in m.loads if l.id != load_id]
    storage.save_model(m)
    return {"deleted": load_id}


@router.post("/{model_id}/constraints", response_model=Constraint)
def add_constraint(model_id: str, constraint: Constraint):
    m = storage.get_model(model_id)
    if not m: raise HTTPException(404, "Modello non trovato")
    if any(c.id == constraint.id for c in m.constraints):
        constraint.id = _next_id(m.constraints)
    m.constraints.append(constraint)
    storage.save_model(m)
    return constraint


@router.put("/{model_id}/constraints/{constraint_id}", response_model=Constraint)
def update_constraint(model_id: str, constraint_id: int, constraint: Constraint):
    m = storage.get_model(model_id)
    if not m: raise HTTPException(404, "Modello non trovato")
    for i, c in enumerate(m.constraints):
        if c.id == constraint_id:
            constraint.id = constraint_id
            m.constraints[i] = constraint
            storage.save_model(m)
            return constraint
    raise HTTPException(404, "Vincolo non trovato")


@router.delete("/{model_id}/constraints/{constraint_id}")
def delete_constraint(model_id: str, constraint_id: int):
    m = storage.get_model(model_id)
    if not m: raise HTTPException(404, "Modello non trovato")
    m.constraints = [c for c in m.constraints if c.id != constraint_id]
    storage.save_model(m)
    return {"deleted": constraint_id}


class CompareReq(BaseModel):
    """Confronta due modelli; opzionalmente esegue solver statico su entrambi."""
    model_a: str
    model_b: str
    include_static_diff: bool = False


@router.post("/compare")
def compare_models(req: CompareReq):
    from core.postprocess import diff_models, diff_static_results
    a = storage.get_model(req.model_a)
    b = storage.get_model(req.model_b)
    if not a:
        raise HTTPException(404, f"Modello A {req.model_a} non trovato")
    if not b:
        raise HTTPException(404, f"Modello B {req.model_b} non trovato")
    d = diff_models(a, b)
    out = {
        "model_diff": {
            "nodes_added": d.nodes_added,
            "nodes_removed": d.nodes_removed,
            "nodes_moved": [
                {"id": nid, "from": list(p1), "to": list(p2)}
                for nid, p1, p2 in d.nodes_moved
            ],
            "elements_added": d.elements_added,
            "elements_removed": d.elements_removed,
            "elements_modified": [
                {"id": eid, "fields": fields}
                for eid, fields in d.elements_modified
            ],
            "loads_added": d.loads_added,
            "loads_removed": d.loads_removed,
            "loads_modified": d.loads_modified,
            "constraints_added": d.constraints_added,
            "constraints_removed": d.constraints_removed,
            "constraints_modified": d.constraints_modified,
            "total_changes": d.total_changes(),
            "is_identical": d.is_identical(),
        },
    }
    if req.include_static_diff:
        from core.solver import StaticSolver
        try:
            ra = StaticSolver(a).solve()
            rb = StaticSolver(b).solve()
            rd = diff_static_results(ra, rb)
            out["static_diff"] = {
                "max_delta_ux": rd.max_delta_ux,
                "max_delta_uy": rd.max_delta_uy,
                "max_delta_uz": rd.max_delta_uz,
                "max_delta_magnitude": rd.max_delta_mag,
                "node_with_max_delta": rd.node_with_max_delta,
                "max_delta_pct_vs_A": rd.max_delta_pct,
                "max_delta_N": rd.max_delta_N,
                "max_delta_M": rd.max_delta_M,
                "element_with_max_delta": rd.element_with_max_delta,
            }
        except Exception as e:
            out["static_diff_error"] = str(e)
    return out
