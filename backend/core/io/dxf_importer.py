"""
DXF importer — converte LINE / LWPOLYLINE / POLYLINE in nodi + elementi BEAM.

Logica:
    1. Scorre tutte le entità LINE e LWPOLYLINE del modelspace.
    2. Ogni endpoint diventa un Node (deduplicato per coordinate con tolleranza).
    3. Ogni segmento diventa un Element BEAM2D (se is_3d=False) o BEAM3D.
    4. Materiale e sezione possono essere derivati dal **layer DXF** (BL-8)
       tramite `layer_material_map` / `layer_section_map`. Fallback ai default.

NOTE:
    DXF non trasporta materiali strutturali in modo standard. Si usano valori
    di default (steel_s355 + ipe_300) salvo che l'utente passi override o
    fornisca un mapping per layer.
    Per geometrie 3D (z ≠ 0) si forza BEAM3D.

Limiti noti:
    - SPLINE, CIRCLE, ARC NON sono importati come elementi (vengono ignorati).
    - 3DFACE / SOLID per shell NON sono ancora gestiti.
"""
from __future__ import annotations
from pathlib import Path
from typing import Mapping
import ezdxf

from schemas import FEAModel, Node, Element, ElementType


_DEFAULT_TOL = 1e-6


def _key(x: float, y: float, z: float, tol: float) -> tuple[int, int, int]:
    """Discretizza la coordinata in chiave intera per il dedupe."""
    return (round(x / tol), round(y / tol), round(z / tol))


def import_dxf(
    file_path: str | Path,
    *,
    material_id: str = "steel_s355",
    section_id: str = "ipe_300",
    model_id: str = "imported_dxf",
    model_name: str = "Imported from DXF",
    tolerance: float = _DEFAULT_TOL,
    force_3d: bool | None = None,
    layer_material_map: Mapping[str, str] | None = None,
    layer_section_map: Mapping[str, str] | None = None,
) -> FEAModel:
    """Importa LINE/LWPOLYLINE/POLYLINE da DXF e ritorna un FEAModel con beams.

    Args:
        file_path           : path al file .dxf
        material_id         : materiale di default per gli elementi
        section_id          : sezione di default
        model_id            : id del FEAModel risultante
        model_name          : nome del FEAModel
        tolerance           : tolleranza geometrica per dedupe nodi [m]
        force_3d            : se True forza is_3d=True; se None autodetect (z ≠ 0)
        layer_material_map  : (BL-8) mapping {layer_name: material_id}.
                              Il lookup è case-sensitive sull'attributo `dxf.layer`.
                              Fallback su `material_id` se layer non presente.
        layer_section_map   : (BL-8) mapping {layer_name: section_id}. Stessa
                              semantica del precedente.

    Raises:
        FileNotFoundError : se il file non esiste
        ezdxf.DXFError    : se il file è corrotto o non DXF

    Esempio:
        >>> model = import_dxf(
        ...     "frame.dxf",
        ...     layer_material_map={"COLONNE": "steel_s355", "TRAVI_LEGNO": "timber_c24"},
        ...     layer_section_map={"COLONNE": "hea_240", "TRAVI_LEGNO": "rect_200x300"},
        ... )
    """
    file_path = Path(file_path)
    if not file_path.exists():
        raise FileNotFoundError(f"DXF file non trovato: {file_path}")

    doc = ezdxf.readfile(str(file_path))
    msp = doc.modelspace()

    node_map: dict[tuple[int, int, int], int] = {}
    nodes: list[Node] = []
    # Per ogni segmento conserva anche il layer di origine → permette mapping
    segments: list[tuple[int, int, str]] = []  # (n1_id, n2_id, layer)
    has_3d = False

    def _add_node(x: float, y: float, z: float) -> int:
        nonlocal has_3d
        if abs(z) > tolerance:
            has_3d = True
        k = _key(x, y, z, tolerance)
        if k in node_map:
            return node_map[k]
        new_id = len(nodes) + 1
        node_map[k] = new_id
        nodes.append(Node(id=new_id, x=x, y=y, z=z))
        return new_id

    # 1) LINE
    for line in msp.query("LINE"):
        s = line.dxf.start
        e = line.dxf.end
        n1 = _add_node(s.x, s.y, s.z)
        n2 = _add_node(e.x, e.y, e.z)
        layer = getattr(line.dxf, "layer", "0") or "0"
        if n1 != n2:
            segments.append((n1, n2, layer))

    # 2) LWPOLYLINE — 2D polylines (z costante)
    for poly in msp.query("LWPOLYLINE"):
        elev = poly.dxf.elevation if poly.dxf.hasattr("elevation") else 0.0
        pts = list(poly.get_points("xy"))
        ids = [_add_node(p[0], p[1], elev) for p in pts]
        layer = getattr(poly.dxf, "layer", "0") or "0"
        for i in range(len(ids) - 1):
            if ids[i] != ids[i + 1]:
                segments.append((ids[i], ids[i + 1], layer))
        # Se la polilinea è chiusa, chiude il poligono
        if poly.is_closed and len(ids) > 2 and ids[-1] != ids[0]:
            segments.append((ids[-1], ids[0], layer))

    # 3) POLYLINE 3D
    for poly in msp.query("POLYLINE"):
        pts = [(v.dxf.location.x, v.dxf.location.y, v.dxf.location.z)
               for v in poly.vertices]
        ids = [_add_node(*p) for p in pts]
        layer = getattr(poly.dxf, "layer", "0") or "0"
        for i in range(len(ids) - 1):
            if ids[i] != ids[i + 1]:
                segments.append((ids[i], ids[i + 1], layer))
        if poly.is_closed and len(ids) > 2 and ids[-1] != ids[0]:
            segments.append((ids[-1], ids[0], layer))

    is_3d = force_3d if force_3d is not None else has_3d
    el_type = ElementType.BEAM3D if is_3d else ElementType.BEAM2D

    def _resolve_material(layer: str) -> str:
        if layer_material_map and layer in layer_material_map:
            return layer_material_map[layer]
        return material_id

    def _resolve_section(layer: str) -> str:
        if layer_section_map and layer in layer_section_map:
            return layer_section_map[layer]
        return section_id

    elements = [
        Element(
            id=i + 1, type=el_type, nodes=[n1, n2],
            material_id=_resolve_material(layer),
            section_id=_resolve_section(layer),
        )
        for i, (n1, n2, layer) in enumerate(segments)
    ]

    return FEAModel(
        id=model_id, name=model_name, is_3d=is_3d,
        nodes=nodes, elements=elements,
        constraints=[], loads=[],
    )
