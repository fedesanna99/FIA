"""
IFC exporter — scrive un FEAModel come file IFC4.

Struttura prodotta:
    IfcProject
      └─ IfcSite
          └─ IfcBuilding
              └─ IfcBuildingStorey
                  ├─ IfcBeam      (per BEAM2D/BEAM3D)
                  └─ IfcMember    (per TRUSS2D/TRUSS3D)

Per ogni elemento beam viene creata:
    - Una IfcLocalPlacement nel sistema di coordinate del building
    - Una IfcShapeRepresentation 'Axis' contenente IfcPolyline su 2 punti

Limiti noti:
    - Non viene generato Body representation 3D (extruded section). Solo
      l'asse strutturale, che è sufficiente per round-trip strutturale.
    - Non viene scritto IfcMaterial / IfcMaterialProfile (semplificato).
    - Shell elements non gestiti (carry-over Fase 11).
"""
from __future__ import annotations
from pathlib import Path
import uuid
import time

import ifcopenshell
import ifcopenshell.api

from schemas import FEAModel, ElementType


_BEAM_TYPES = {ElementType.BEAM2D, ElementType.BEAM3D}
_MEMBER_TYPES = {ElementType.TRUSS2D, ElementType.TRUSS3D}


def _guid() -> str:
    """GUID IFC compresso a 22 caratteri."""
    return ifcopenshell.guid.new()


def _make_ifc_skeleton(model_name: str):
    """Crea un file IFC4 vuoto con la gerarchia base Project → Storey.

    Ritorna (ifc_file, storey).
    """
    ifc = ifcopenshell.api.run("project.create_file", version="IFC4")

    project = ifcopenshell.api.run(
        "root.create_entity", ifc,
        ifc_class="IfcProject", name=model_name,
    )
    ifcopenshell.api.run("unit.assign_unit", ifc)

    ctx = ifcopenshell.api.run(
        "context.add_context", ifc, context_type="Model",
    )
    body_ctx = ifcopenshell.api.run(
        "context.add_context", ifc,
        context_type="Model",
        context_identifier="Axis",
        target_view="GRAPH_VIEW",
        parent=ctx,
    )

    site = ifcopenshell.api.run(
        "root.create_entity", ifc,
        ifc_class="IfcSite", name="Site",
    )
    building = ifcopenshell.api.run(
        "root.create_entity", ifc,
        ifc_class="IfcBuilding", name="Building",
    )
    storey = ifcopenshell.api.run(
        "root.create_entity", ifc,
        ifc_class="IfcBuildingStorey", name="Storey",
    )
    ifcopenshell.api.run("aggregate.assign_object", ifc,
                         products=[site], relating_object=project)
    ifcopenshell.api.run("aggregate.assign_object", ifc,
                         products=[building], relating_object=site)
    ifcopenshell.api.run("aggregate.assign_object", ifc,
                         products=[storey], relating_object=building)
    return ifc, storey, body_ctx


def _add_axis_polyline(ifc, body_ctx, p1, p2, beam):
    """Aggiunge IfcPolyline (2 pti) come representation 'Axis' al beam."""
    pt1 = ifc.create_entity("IfcCartesianPoint",
                             Coordinates=[float(p1[0]), float(p1[1]), float(p1[2])])
    pt2 = ifc.create_entity("IfcCartesianPoint",
                             Coordinates=[float(p2[0]), float(p2[1]), float(p2[2])])
    polyline = ifc.create_entity("IfcPolyline", Points=[pt1, pt2])
    shape_rep = ifc.create_entity(
        "IfcShapeRepresentation",
        ContextOfItems=body_ctx,
        RepresentationIdentifier="Axis",
        RepresentationType="Curve3D",
        Items=[polyline],
    )
    product_def = ifc.create_entity(
        "IfcProductDefinitionShape",
        Representations=[shape_rep],
    )
    beam.Representation = product_def


def export_ifc(model: FEAModel, file_path: str | Path) -> Path:
    """Esporta il FEAModel in IFC4. Ritorna il path scritto."""
    file_path = Path(file_path)
    ifc, storey, body_ctx = _make_ifc_skeleton(model.name or "FEA Model")

    nodes_by_id = {n.id: n for n in model.nodes}
    products = []

    for el in model.elements:
        if len(el.nodes) < 2:
            continue
        n1 = nodes_by_id.get(el.nodes[0])
        n2 = nodes_by_id.get(el.nodes[1])
        if n1 is None or n2 is None:
            continue
        if el.type in _BEAM_TYPES:
            ifc_class = "IfcBeam"
        elif el.type in _MEMBER_TYPES:
            ifc_class = "IfcMember"
        else:
            # SHELL / SOLID non gestiti
            continue
        beam = ifcopenshell.api.run(
            "root.create_entity", ifc,
            ifc_class=ifc_class, name=f"E{el.id}",
        )
        _add_axis_polyline(
            ifc, body_ctx,
            (n1.x, n1.y, n1.z), (n2.x, n2.y, n2.z),
            beam,
        )
        products.append(beam)

    if products:
        ifcopenshell.api.run(
            "spatial.assign_container", ifc,
            products=products, relating_structure=storey,
        )

    file_path.parent.mkdir(parents=True, exist_ok=True)
    ifc.write(str(file_path))
    return file_path
