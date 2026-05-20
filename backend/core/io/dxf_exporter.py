"""
DXF exporter — scrive FEAModel in DXF (AC1015 / AutoCAD 2000+).

Layout dei layer:
    NODES      → POINT per ogni nodo
    BEAMS      → LINE per ogni beam (BEAM2D/BEAM3D/TRUSS2D/TRUSS3D)
    SHELLS     → 3DFACE / POLYLINE per shell Q4 / TRI3
    CONSTRAINTS→ POINT colorati (placeholder visivo per vincoli)
    LOADS      → TEXT con annotazione magnitudo (placeholder)

NOTE:
    Le proprietà strutturali (materiali, sezioni, vincoli FIXED/SPRING, carichi)
    NON sono nativamente rappresentabili in DXF. Vengono inserite come testo
    in layer dedicati, e perse all'eventuale re-import.
"""
from __future__ import annotations
from pathlib import Path
import ezdxf

from schemas import FEAModel, ElementType


_LAYER_NODES = "FEA_NODES"
_LAYER_BEAMS = "FEA_BEAMS"
_LAYER_SHELLS = "FEA_SHELLS"
_LAYER_CONSTRAINTS = "FEA_CONSTRAINTS"
_LAYER_LOADS = "FEA_LOADS"


def export_dxf(model: FEAModel, file_path: str | Path) -> Path:
    """Esporta il FEAModel in DXF e ritorna il path scritto.

    Args:
        model     : FEAModel da esportare
        file_path : path di output (.dxf)
    """
    file_path = Path(file_path)
    doc = ezdxf.new("R2000")  # AC1015 — formato stabile

    # Layer con colori AutoCAD ACI
    doc.layers.add(name=_LAYER_NODES, color=1)        # rosso
    doc.layers.add(name=_LAYER_BEAMS, color=5)        # blu
    doc.layers.add(name=_LAYER_SHELLS, color=4)       # ciano
    doc.layers.add(name=_LAYER_CONSTRAINTS, color=2)  # giallo
    doc.layers.add(name=_LAYER_LOADS, color=3)        # verde

    msp = doc.modelspace()

    # Nodi → POINT
    nodes_by_id = {n.id: n for n in model.nodes}
    for n in model.nodes:
        msp.add_point((n.x, n.y, n.z), dxfattribs={"layer": _LAYER_NODES})

    # Elementi beam/truss → LINE
    beam_types = {
        ElementType.BEAM2D, ElementType.BEAM3D,
        ElementType.TRUSS2D, ElementType.TRUSS3D,
    }
    shell_types = {ElementType.SHELL_Q4, ElementType.TRI3}

    for el in model.elements:
        if el.type in beam_types and len(el.nodes) >= 2:
            n1 = nodes_by_id.get(el.nodes[0])
            n2 = nodes_by_id.get(el.nodes[1])
            if n1 is None or n2 is None:
                continue
            msp.add_line(
                (n1.x, n1.y, n1.z), (n2.x, n2.y, n2.z),
                dxfattribs={"layer": _LAYER_BEAMS},
            )
        elif el.type in shell_types:
            pts = [(nodes_by_id[nid].x, nodes_by_id[nid].y, nodes_by_id[nid].z)
                   for nid in el.nodes if nid in nodes_by_id]
            if len(pts) >= 3:
                # 3DFACE: 3 (triangoli) o 4 (quad) punti
                if len(pts) == 3:
                    msp.add_3dface([pts[0], pts[1], pts[2], pts[2]],
                                   dxfattribs={"layer": _LAYER_SHELLS})
                else:
                    msp.add_3dface(pts[:4],
                                   dxfattribs={"layer": _LAYER_SHELLS})

    # Vincoli → POINT visivo
    for c in model.constraints:
        n = nodes_by_id.get(c.node_id)
        if n is None:
            continue
        msp.add_point((n.x, n.y, n.z),
                      dxfattribs={"layer": _LAYER_CONSTRAINTS})
        msp.add_text(
            f"C{c.id}:{c.type.value}",
            dxfattribs={"layer": _LAYER_CONSTRAINTS, "height": 0.05},
        ).set_placement((n.x + 0.1, n.y + 0.1, n.z))

    # Carichi → TEXT con magnitudo
    for l in model.loads:
        # I carichi NODAL hanno target_id = node id
        n = nodes_by_id.get(l.target_id)
        if n is None:
            continue
        mag = max(abs(l.fx), abs(l.fy), abs(l.fz), abs(l.qx), abs(l.qy), abs(l.qz))
        msp.add_text(
            f"L{l.id}:{l.type.value} m={mag:.2g}",
            dxfattribs={"layer": _LAYER_LOADS, "height": 0.05},
        ).set_placement((n.x + 0.1, n.y - 0.1, n.z))

    file_path.parent.mkdir(parents=True, exist_ok=True)
    doc.saveas(str(file_path))
    return file_path
