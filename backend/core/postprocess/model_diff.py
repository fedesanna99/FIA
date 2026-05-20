"""
Confronto strutturale di due FEAModel + dei loro risultati statici.

Funzioni:
    diff_models(A, B) → ModelDiff
        - nodes_added / nodes_removed / nodes_moved (id presente in entrambi
          ma posizione diversa oltre tol)
        - elements_added / removed / modified (cambio materiale, sezione,
          connettività, winkler_k)
        - loads_added / removed / modified
        - constraints_added / removed / modified

    diff_static_results(rA, rB) → StaticResultsDiff
        - max_delta_ux/uy/uz e max % relativo
        - node_with_max_delta
        - per-element max delta forces
"""
from __future__ import annotations
from dataclasses import dataclass, field

from schemas import FEAModel
from schemas.results import StaticResults


_POS_TOL = 1e-6


@dataclass
class ModelDiff:
    nodes_added: list[int] = field(default_factory=list)
    nodes_removed: list[int] = field(default_factory=list)
    nodes_moved: list[tuple[int, tuple[float, float, float], tuple[float, float, float]]] = field(default_factory=list)
    elements_added: list[int] = field(default_factory=list)
    elements_removed: list[int] = field(default_factory=list)
    elements_modified: list[tuple[int, list[str]]] = field(default_factory=list)
    loads_added: list[int] = field(default_factory=list)
    loads_removed: list[int] = field(default_factory=list)
    loads_modified: list[int] = field(default_factory=list)
    constraints_added: list[int] = field(default_factory=list)
    constraints_removed: list[int] = field(default_factory=list)
    constraints_modified: list[int] = field(default_factory=list)

    def total_changes(self) -> int:
        return (len(self.nodes_added) + len(self.nodes_removed) + len(self.nodes_moved)
                + len(self.elements_added) + len(self.elements_removed) + len(self.elements_modified)
                + len(self.loads_added) + len(self.loads_removed) + len(self.loads_modified)
                + len(self.constraints_added) + len(self.constraints_removed) + len(self.constraints_modified))

    def is_identical(self) -> bool:
        return self.total_changes() == 0


def diff_models(A: FEAModel, B: FEAModel, *, pos_tol: float = _POS_TOL) -> ModelDiff:
    """Confronta due modelli. ID coincidenti vengono considerati 'stesso oggetto'."""
    d = ModelDiff()

    # Nodi
    nodes_A = {n.id: n for n in A.nodes}
    nodes_B = {n.id: n for n in B.nodes}
    d.nodes_added = sorted(set(nodes_B) - set(nodes_A))
    d.nodes_removed = sorted(set(nodes_A) - set(nodes_B))
    for nid in sorted(set(nodes_A) & set(nodes_B)):
        a = nodes_A[nid]; b = nodes_B[nid]
        if (abs(a.x - b.x) > pos_tol
                or abs(a.y - b.y) > pos_tol
                or abs(a.z - b.z) > pos_tol):
            d.nodes_moved.append((nid, (a.x, a.y, a.z), (b.x, b.y, b.z)))

    # Elementi
    els_A = {e.id: e for e in A.elements}
    els_B = {e.id: e for e in B.elements}
    d.elements_added = sorted(set(els_B) - set(els_A))
    d.elements_removed = sorted(set(els_A) - set(els_B))
    for eid in sorted(set(els_A) & set(els_B)):
        a = els_A[eid]; b = els_B[eid]
        changes: list[str] = []
        if a.type != b.type: changes.append("type")
        if a.nodes != b.nodes: changes.append("nodes")
        if a.material_id != b.material_id: changes.append("material")
        if a.section_id != b.section_id: changes.append("section")
        if a.winkler_k != b.winkler_k: changes.append("winkler_k")
        if changes:
            d.elements_modified.append((eid, changes))

    # Loads
    ls_A = {l.id: l for l in A.loads}
    ls_B = {l.id: l for l in B.loads}
    d.loads_added = sorted(set(ls_B) - set(ls_A))
    d.loads_removed = sorted(set(ls_A) - set(ls_B))
    for lid in sorted(set(ls_A) & set(ls_B)):
        if ls_A[lid].model_dump() != ls_B[lid].model_dump():
            d.loads_modified.append(lid)

    # Constraints
    cs_A = {c.id: c for c in A.constraints}
    cs_B = {c.id: c for c in B.constraints}
    d.constraints_added = sorted(set(cs_B) - set(cs_A))
    d.constraints_removed = sorted(set(cs_A) - set(cs_B))
    for cid in sorted(set(cs_A) & set(cs_B)):
        if cs_A[cid].model_dump() != cs_B[cid].model_dump():
            d.constraints_modified.append(cid)

    return d


@dataclass
class StaticResultsDiff:
    """Differenza tra due StaticResults nodo-per-nodo."""
    max_delta_ux: float = 0.0
    max_delta_uy: float = 0.0
    max_delta_uz: float = 0.0
    max_delta_mag: float = 0.0
    node_with_max_delta: int = 0
    max_delta_pct: float = 0.0  # percentuale rispetto al maxA
    # Element-level
    max_delta_N: float = 0.0
    max_delta_M: float = 0.0
    element_with_max_delta: int = 0


def diff_static_results(rA: StaticResults, rB: StaticResults) -> StaticResultsDiff:
    """Confronta due StaticResults. I nodi non in comune sono ignorati."""
    out = StaticResultsDiff()
    da = {d.node_id: d for d in rA.displacements}
    db = {d.node_id: d for d in rB.displacements}
    common = set(da) & set(db)
    for nid in common:
        a = da[nid]; b = db[nid]
        dx = abs(a.ux - b.ux)
        dy = abs(a.uy - b.uy)
        dz = abs(a.uz - b.uz)
        mag = (dx * dx + dy * dy + dz * dz) ** 0.5
        if dx > out.max_delta_ux: out.max_delta_ux = dx
        if dy > out.max_delta_uy: out.max_delta_uy = dy
        if dz > out.max_delta_uz: out.max_delta_uz = dz
        if mag > out.max_delta_mag:
            out.max_delta_mag = mag
            out.node_with_max_delta = nid

    # percentage relativa al max abs di A
    maxA = max((max(abs(d.ux), abs(d.uy), abs(d.uz))
                for d in rA.displacements), default=0.0)
    if maxA > 0:
        out.max_delta_pct = 100.0 * out.max_delta_mag / maxA

    # Element forces
    fa = {f.element_id: f for f in rA.element_forces}
    fb = {f.element_id: f for f in rB.element_forces}
    for eid in set(fa) & set(fb):
        a = fa[eid]; b = fb[eid]
        dN = max(abs(a.N_i - b.N_i), abs(a.N_j - b.N_j))
        dM = max(abs(a.Mz_i - b.Mz_i), abs(a.Mz_j - b.Mz_j))
        if dN > out.max_delta_N:
            out.max_delta_N = dN
            out.element_with_max_delta = eid
        if dM > out.max_delta_M:
            out.max_delta_M = dM
    return out
