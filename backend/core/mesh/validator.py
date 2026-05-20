"""Validatore di mesh e modello FEA."""
from __future__ import annotations
from enum import Enum
from dataclasses import dataclass
import math

from schemas import FEAModel, ElementType, MATERIALS_DB, SECTIONS_DB


class IssueLevel(str, Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"


@dataclass
class MeshIssue:
    level: IssueLevel
    message: str
    entity_type: str | None = None
    entity_id: int | None = None


_EXPECTED_NODES: dict[ElementType, int] = {
    ElementType.BEAM2D: 2, ElementType.BEAM3D: 2,
    ElementType.TRUSS2D: 2, ElementType.TRUSS3D: 2,
    ElementType.SHELL_Q4: 4,
    ElementType.SOLID_H8: 8,
    ElementType.TRI3: 3,
}


def validate_model(model: FEAModel) -> list[MeshIssue]:
    """Esegue tutti i controlli di consistenza sul modello.

    Errori bloccanti includono: nodi duplicati, riferimenti pendenti,
    materiali/sezioni inesistenti, elementi a lunghezza/area nulla,
    nessun vincolo.
    """
    issues: list[MeshIssue] = []

    if not model.nodes:
        issues.append(MeshIssue(IssueLevel.ERROR, "Il modello non ha nodi."))
        return issues
    if not model.elements:
        issues.append(MeshIssue(IssueLevel.ERROR, "Il modello non ha elementi."))
    if not model.constraints:
        issues.append(MeshIssue(IssueLevel.ERROR,
            "Il modello non ha vincoli — sistema singolare."))

    node_ids = [n.id for n in model.nodes]
    if len(set(node_ids)) != len(node_ids):
        dup = {nid for nid in node_ids if node_ids.count(nid) > 1}
        issues.append(MeshIssue(IssueLevel.ERROR,
            f"Nodi con ID duplicato: {sorted(dup)}", "node"))

    elem_ids = [e.id for e in model.elements]
    if len(set(elem_ids)) != len(elem_ids):
        dup = {eid for eid in elem_ids if elem_ids.count(eid) > 1}
        issues.append(MeshIssue(IssueLevel.ERROR,
            f"Elementi con ID duplicato: {sorted(dup)}", "element"))

    node_set = set(node_ids)
    node_lookup = {n.id: n for n in model.nodes}

    for el in model.elements:
        expected = _EXPECTED_NODES.get(el.type)
        if expected and len(el.nodes) != expected:
            issues.append(MeshIssue(IssueLevel.ERROR,
                f"Elem {el.id} ({el.type}): {len(el.nodes)} nodi, attesi {expected}",
                "element", el.id))
            continue
        missing = [nid for nid in el.nodes if nid not in node_set]
        if missing:
            issues.append(MeshIssue(IssueLevel.ERROR,
                f"Elem {el.id} riferisce nodi inesistenti: {missing}", "element", el.id))
            continue
        if el.material_id not in MATERIALS_DB:
            issues.append(MeshIssue(IssueLevel.ERROR,
                f"Elem {el.id}: materiale '{el.material_id}' non in libreria",
                "element", el.id))
        if el.section_id and el.section_id not in SECTIONS_DB:
            issues.append(MeshIssue(IssueLevel.ERROR,
                f"Elem {el.id}: sezione '{el.section_id}' non in libreria",
                "element", el.id))
        if el.type in (ElementType.BEAM2D, ElementType.BEAM3D,
                       ElementType.TRUSS2D, ElementType.TRUSS3D):
            n1 = node_lookup[el.nodes[0]]
            n2 = node_lookup[el.nodes[1]]
            L = math.dist((n1.x, n1.y, n1.z), (n2.x, n2.y, n2.z))
            if L < 1e-9:
                issues.append(MeshIssue(IssueLevel.ERROR,
                    f"Elem {el.id}: lunghezza nulla", "element", el.id))

    for load in model.loads:
        if load.type.value in ("nodal", "nodal_mass") and load.target_id not in node_set:
            issues.append(MeshIssue(IssueLevel.ERROR,
                f"Carico {load.id}: nodo target {load.target_id} non esiste",
                "load", load.id))
        elif load.type.value == "distributed" and load.target_id not in set(elem_ids):
            issues.append(MeshIssue(IssueLevel.ERROR,
                f"Carico {load.id}: elemento target {load.target_id} non esiste",
                "load", load.id))

    for c in model.constraints:
        if c.node_id not in node_set:
            issues.append(MeshIssue(IssueLevel.ERROR,
                f"Vincolo {c.id}: nodo {c.node_id} non esiste",
                "constraint", c.id))

    n_unreferenced = sum(1 for n in model.nodes if not any(n.id in e.nodes for e in model.elements))
    if n_unreferenced > 0:
        issues.append(MeshIssue(IssueLevel.WARNING,
            f"{n_unreferenced} nodi non sono referenziati da alcun elemento"))

    has_loads = any(
        load.type.value not in ("nodal_mass",) and (
            (load.fx or load.fy or load.fz or load.mx or load.my or load.mz or
             load.qx or load.qy or load.qz or load.pressure)
        )
        for load in model.loads
    )
    if not has_loads:
        issues.append(MeshIssue(IssueLevel.WARNING,
            "Nessun carico applicato — l'analisi statica restituirà spostamenti nulli"))

    return issues
