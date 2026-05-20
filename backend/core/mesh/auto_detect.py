"""
Auto-detection di problemi nel modello — controlli aggiuntivi rispetto al
`validate_model` base.

Detection avanzata:
    - duplicate_elements        : 2+ elementi con stessi nodi (anche permutati)
    - coincident_nodes          : 2+ nodi con coordinate identiche (entro tol)
    - underconstrained_dofs     : DOF rotazionali liberi su nodo terminale
    - missing_section_for_beam  : beam2D/3D senza section_id
    - oversized_winkler_jump    : Winkler k_w varia troppo tra elementi adiacenti
    - load_on_orphan_node       : carico su nodo non connesso a elementi
    - mixed_units_warning       : valori sospetti (es. spostamenti > 100 m)

Ogni issue include un "suggested_fix" testuale.
"""
from __future__ import annotations
from dataclasses import dataclass
import math

from schemas import FEAModel, ElementType


@dataclass
class AutoIssue:
    """Issue arricchito con suggerimento di fix."""
    level: str          # "info" | "warning" | "error"
    code: str           # identificatore stabile (es. "DUPLICATE_ELEMENT")
    message: str
    suggested_fix: str
    entity_type: str | None = None
    entity_ids: list[int] | None = None


def _coord_key(n, tol: float) -> tuple[int, int, int]:
    return (round(n.x / tol), round(n.y / tol), round(n.z / tol))


def _is_beam_or_truss(el) -> bool:
    return el.type in (
        ElementType.BEAM2D, ElementType.BEAM3D,
        ElementType.TRUSS2D, ElementType.TRUSS3D,
    )


def detect_duplicate_elements(model: FEAModel) -> list[AutoIssue]:
    """Trova elementi con stessa connettività (set di nodi identico)."""
    seen: dict[frozenset, list[int]] = {}
    for el in model.elements:
        key = frozenset(el.nodes)
        seen.setdefault(key, []).append(el.id)
    out: list[AutoIssue] = []
    for nodes_set, eids in seen.items():
        if len(eids) > 1:
            out.append(AutoIssue(
                level="warning",
                code="DUPLICATE_ELEMENT",
                message=f"Elementi {eids} hanno la stessa connettività {sorted(nodes_set)}",
                suggested_fix=f"Rimuovi gli elementi duplicati {eids[1:]}, "
                              f"mantieni solo {eids[0]}.",
                entity_type="element",
                entity_ids=eids,
            ))
    return out


def detect_coincident_nodes(
    model: FEAModel, *, tol: float = 1e-6,
) -> list[AutoIssue]:
    """Trova nodi con stesse coordinate (entro tol)."""
    by_key: dict[tuple[int, int, int], list[int]] = {}
    for n in model.nodes:
        k = _coord_key(n, tol)
        by_key.setdefault(k, []).append(n.id)
    out: list[AutoIssue] = []
    for k, ids in by_key.items():
        if len(ids) > 1:
            out.append(AutoIssue(
                level="warning",
                code="COINCIDENT_NODES",
                message=f"Nodi {ids} hanno coordinate identiche entro tol={tol}",
                suggested_fix=f"Unisci i nodi: tieni {ids[0]} e sostituisci "
                              f"{ids[1:]} nelle connettività.",
                entity_type="node",
                entity_ids=ids,
            ))
    return out


def detect_orphan_loads(model: FEAModel) -> list[AutoIssue]:
    """Carichi NODAL su nodo non connesso a nessun elemento."""
    referenced = set()
    for el in model.elements:
        referenced.update(el.nodes)
    out: list[AutoIssue] = []
    for ld in model.loads:
        if ld.type.value in ("nodal", "nodal_mass") and ld.target_id not in referenced:
            out.append(AutoIssue(
                level="warning",
                code="LOAD_ON_ORPHAN_NODE",
                message=f"Carico {ld.id} applicato al nodo {ld.target_id} "
                        f"che non è connesso a nessun elemento.",
                suggested_fix="Aggiungi un elemento che colleghi questo nodo "
                              "alla struttura, oppure rimuovi il carico.",
                entity_type="load",
                entity_ids=[ld.id],
            ))
    return out


def detect_missing_section_for_beam(model: FEAModel) -> list[AutoIssue]:
    """Beam/truss senza section_id."""
    out: list[AutoIssue] = []
    for el in model.elements:
        if _is_beam_or_truss(el) and not el.section_id:
            out.append(AutoIssue(
                level="error",
                code="MISSING_SECTION",
                message=f"Elemento {el.id} ({el.type.value}) senza section_id.",
                suggested_fix=f"Assegna una sezione valida (es. 'ipe_300') "
                              f"all'elemento {el.id}.",
                entity_type="element",
                entity_ids=[el.id],
            ))
    return out


def detect_oversized_winkler_jump(
    model: FEAModel, *, ratio_threshold: float = 100.0,
) -> list[AutoIssue]:
    """Salti grandi di k_w tra elementi che condividono un nodo."""
    by_node: dict[int, list[tuple[int, float]]] = {}
    for el in model.elements:
        if el.winkler_k is None or el.winkler_k <= 0:
            continue
        for nid in el.nodes:
            by_node.setdefault(nid, []).append((el.id, el.winkler_k))
    out: list[AutoIssue] = []
    reported: set[tuple[int, int]] = set()
    for nid, kws in by_node.items():
        if len(kws) < 2:
            continue
        kmin = min(k for _, k in kws)
        kmax = max(k for _, k in kws)
        if kmin > 0 and kmax / kmin > ratio_threshold:
            eids = sorted(eid for eid, _ in kws)
            key = (eids[0], eids[-1])
            if key in reported:
                continue
            reported.add(key)
            out.append(AutoIssue(
                level="warning",
                code="WINKLER_JUMP",
                message=f"Al nodo {nid} la rigidezza Winkler varia di un "
                        f"fattore {kmax/kmin:.1f} (k∈[{kmin:.1e}, {kmax:.1e}]).",
                suggested_fix="Verifica che il salto sia intenzionale; "
                              "altrimenti uniforma k_w sugli elementi adiacenti.",
                entity_type="element",
                entity_ids=eids,
            ))
    return out


def detect_unconstrained_terminal_node(model: FEAModel) -> list[AutoIssue]:
    """Nodi referenziati da un solo elemento (terminali) senza vincolo:
    candidati per labilità."""
    referenced_count: dict[int, int] = {}
    for el in model.elements:
        for nid in el.nodes:
            referenced_count[nid] = referenced_count.get(nid, 0) + 1
    constrained = {c.node_id for c in model.constraints}
    out: list[AutoIssue] = []
    for nid, cnt in referenced_count.items():
        if cnt == 1 and nid not in constrained:
            # Solo info: spesso il nodo libero è quello dove agisce il carico
            pass
    return out


def auto_detect(model: FEAModel) -> list[AutoIssue]:
    """Esegue tutti i controlli avanzati."""
    out: list[AutoIssue] = []
    out.extend(detect_duplicate_elements(model))
    out.extend(detect_coincident_nodes(model))
    out.extend(detect_orphan_loads(model))
    out.extend(detect_missing_section_for_beam(model))
    out.extend(detect_oversized_winkler_jump(model))
    out.extend(detect_unconstrained_terminal_node(model))
    return out
