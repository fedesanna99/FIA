"""
IFC importer — IfcBeam / IfcColumn / IfcMember → Element BEAM3D.

Estrazione geometria:
    Si privilegia la representation "Axis" (IfcShapeRepresentation con
    RepresentationIdentifier='Axis'), che contiene il polyline assiale
    dell'elemento. Per beam dritti questo è un IfcPolyline a 2 punti.
    Il polyline è in coordinate locali → si applica ObjectPlacement.

Limiti noti (carry-over):
    - Solo IfcBeam / IfcColumn / IfcMember. IfcSlab, IfcWall (shell)
      saranno aggiunti in Fase 11 (mesh shell).
    - Curve (IfcTrimmedCurve, IfcCircle) NON discretizzate.
    - Profilo della sezione (IfcIShapeProfileDef) NON mappato sui
      section_id locali — si usa un default.
    - Materiali IFC NON mappati sui MATERIALS_DB locali — default
      steel_s355.
"""
from __future__ import annotations
from pathlib import Path
import math

import ifcopenshell
import ifcopenshell.util.placement

from schemas import FEAModel, Node, Element, ElementType


_DEFAULT_TOL = 1e-6


def _key(x: float, y: float, z: float, tol: float) -> tuple[int, int, int]:
    return (round(x / tol), round(y / tol), round(z / tol))


def _transform_point(M, p: tuple[float, float, float]) -> tuple[float, float, float]:
    """Applica matrice 4x4 al punto p."""
    x, y, z = p
    nx = M[0][0]*x + M[0][1]*y + M[0][2]*z + M[0][3]
    ny = M[1][0]*x + M[1][1]*y + M[1][2]*z + M[1][3]
    nz = M[2][0]*x + M[2][1]*y + M[2][2]*z + M[2][3]
    return (nx, ny, nz)


def _extract_axis_polyline(element) -> list[tuple[float, float, float]] | None:
    """Estrae i punti del polyline 'Axis' di un IfcProduct.

    Returns None se non trova nessuna representation Axis utilizzabile.
    """
    rep = getattr(element, "Representation", None)
    if rep is None:
        return None
    for shape_rep in rep.Representations or []:
        if shape_rep.RepresentationIdentifier != "Axis":
            continue
        for item in shape_rep.Items or []:
            if item.is_a("IfcPolyline"):
                pts = []
                for p in item.Points:
                    c = list(p.Coordinates)
                    while len(c) < 3:
                        c.append(0.0)
                    pts.append((float(c[0]), float(c[1]), float(c[2])))
                if len(pts) >= 2:
                    return pts
    return None


def _placement_matrix(element):
    """Restituisce la matrice 4x4 dell'ObjectPlacement (fallback a identità)."""
    try:
        return ifcopenshell.util.placement.get_local_placement(
            element.ObjectPlacement
        )
    except Exception:
        # Fallback: identità
        return [
            [1, 0, 0, 0],
            [0, 1, 0, 0],
            [0, 0, 1, 0],
            [0, 0, 0, 1],
        ]


def import_ifc(
    file_path: str | Path,
    *,
    material_id: str = "steel_s355",
    section_id: str = "ipe_300",
    model_id: str = "imported_ifc",
    model_name: str = "Imported from IFC",
    tolerance: float = _DEFAULT_TOL,
) -> FEAModel:
    """Importa un file IFC e ritorna un FEAModel con elementi BEAM3D.

    Args:
        file_path     : path al .ifc
        material_id   : material_id di default
        section_id    : section_id di default
        model_id      : id del FEAModel
        model_name    : nome del FEAModel
        tolerance     : tolleranza geometrica per dedupe nodi [m]
    """
    file_path = Path(file_path)
    if not file_path.exists():
        raise FileNotFoundError(f"IFC file non trovato: {file_path}")

    ifc = ifcopenshell.open(str(file_path))

    node_map: dict[tuple[int, int, int], int] = {}
    nodes: list[Node] = []
    elements: list[Element] = []

    def _add_node(x: float, y: float, z: float) -> int:
        k = _key(x, y, z, tolerance)
        if k in node_map:
            return node_map[k]
        nid = len(nodes) + 1
        node_map[k] = nid
        nodes.append(Node(id=nid, x=x, y=y, z=z))
        return nid

    # Raccoglie tutti i beam-like
    beam_like = []
    for type_name in ("IfcBeam", "IfcColumn", "IfcMember"):
        beam_like.extend(ifc.by_type(type_name))

    for el in beam_like:
        pts_local = _extract_axis_polyline(el)
        if not pts_local or len(pts_local) < 2:
            continue
        M = _placement_matrix(el)
        pts_global = [_transform_point(M, p) for p in pts_local]
        ids = [_add_node(*p) for p in pts_global]
        for i in range(len(ids) - 1):
            if ids[i] == ids[i + 1]:
                continue
            elements.append(Element(
                id=len(elements) + 1,
                type=ElementType.BEAM3D,
                nodes=[ids[i], ids[i + 1]],
                material_id=material_id,
                section_id=section_id,
            ))

    return FEAModel(
        id=model_id, name=model_name, is_3d=True,
        nodes=nodes, elements=elements,
        constraints=[], loads=[],
    )
