"""Assemblaggio matrici di rigidezza, massa e vettore carichi globali."""
from __future__ import annotations
import numpy as np
import scipy.sparse as sp

from schemas import FEAModel, ElementType, LoadType, ConstraintType, MATERIALS_DB, SECTIONS_DB
from core.elements import (
    Beam2D, Beam3D, Truss2D, Truss3D, Cable2D, Cable3D,
    ShellQuad4, ShellQuad4Layered, ShellQuad4MITC, CompositeLayer,
    SolidHex8, SolidTet4, SolidTet10, Tri3,
)


# Numero di GdL per nodo nel modello globale (sempre 6 per uniformità).
# Beam2D / Truss2D usano solo i primi 3 / 2 GdL.
GLOBAL_DOFS_PER_NODE = 6


def dof_map_for_model(model: FEAModel) -> dict[int, list[int]]:
    """Mappa node_id -> [indici dof globali (6 per nodo)]"""
    return {n.id: list(range(i * GLOBAL_DOFS_PER_NODE, (i + 1) * GLOBAL_DOFS_PER_NODE))
            for i, n in enumerate(model.nodes)}


def _node_dict(model: FEAModel) -> dict[int, np.ndarray]:
    return {n.id: np.array([n.x, n.y, n.z], dtype=float) for n in model.nodes}


def _element_dofs(element, node_dofs: dict[int, list[int]]) -> list[int]:
    """Restituisce gli indici dof globali dell'elemento secondo il tipo."""
    et = element.type
    out: list[int] = []
    if et == ElementType.BEAM2D:
        for nid in element.nodes:
            out += [node_dofs[nid][0], node_dofs[nid][1], node_dofs[nid][5]]
    elif et in (ElementType.TRUSS2D, ElementType.CABLE2D):
        for nid in element.nodes:
            out += [node_dofs[nid][0], node_dofs[nid][1]]
    elif et in (ElementType.TRUSS3D, ElementType.CABLE3D):
        for nid in element.nodes:
            out += node_dofs[nid][:3]
    elif et in (ElementType.BEAM3D, ElementType.SHELL_Q4, ElementType.SHELL_Q4_MITC):
        for nid in element.nodes:
            out += node_dofs[nid]
    elif et == ElementType.SOLID_H8:
        for nid in element.nodes:
            out += node_dofs[nid][:3]
    elif et in (ElementType.SOLID_T4, ElementType.SOLID_T10):
        for nid in element.nodes:
            out += node_dofs[nid][:3]
    elif et == ElementType.TRI3:
        for nid in element.nodes:
            out += [node_dofs[nid][0], node_dofs[nid][1]]
    return out


def _build_element(element, nodes: dict[int, np.ndarray]):
    """Istanzia la classe elemento appropriata."""
    mat = MATERIALS_DB[element.material_id]
    sec = SECTIONS_DB.get(element.section_id) if element.section_id else None
    et = element.type
    if et == ElementType.BEAM2D:
        return Beam2D(nodes[element.nodes[0]], nodes[element.nodes[1]],
                      mat.E, sec.A, sec.Iy, mat.rho)
    if et == ElementType.TRUSS2D:
        return Truss2D(nodes[element.nodes[0]], nodes[element.nodes[1]],
                       mat.E, sec.A, mat.rho)
    if et == ElementType.TRUSS3D:
        return Truss3D(nodes[element.nodes[0]], nodes[element.nodes[1]],
                       mat.E, sec.A, mat.rho)
    if et == ElementType.CABLE2D:
        pt = element.pretension or 0.0
        w_self = mat.rho * sec.A * 9.81 if (mat.rho and sec.A) else 0.0
        return Cable2D(nodes[element.nodes[0]], nodes[element.nodes[1]],
                       mat.E, sec.A, mat.rho, pretension=pt, w_self=w_self)
    if et == ElementType.CABLE3D:
        pt = element.pretension or 0.0
        w_self = mat.rho * sec.A * 9.81 if (mat.rho and sec.A) else 0.0
        return Cable3D(nodes[element.nodes[0]], nodes[element.nodes[1]],
                       mat.E, sec.A, mat.rho, pretension=pt, w_self=w_self)
    if et == ElementType.BEAM3D:
        ref = np.array(element.orientation) if element.orientation else None
        return Beam3D(nodes[element.nodes[0]], nodes[element.nodes[1]],
                      mat.E, mat.G, sec.A, sec.Iy, sec.Iz, sec.J, mat.rho, ref)
    if et == ElementType.SHELL_Q4:
        coords = [nodes[nid] for nid in element.nodes]
        # BL-4 — se la sezione ha layers, usa ShellQuad4Layered
        if sec and getattr(sec, "layers", None):
            import math as _m
            layers_obj = [
                CompositeLayer(
                    E1=L.E1, thickness=L.thickness,
                    theta=_m.radians(L.theta_deg),
                    E2=L.E2, nu12=L.nu12, G12=L.G12, rho=L.rho,
                )
                for L in sec.layers
            ]
            return ShellQuad4Layered(coords, layers_obj)
        t = sec.thickness if sec and sec.thickness else 0.1
        return ShellQuad4(coords, mat.E, mat.nu, t, mat.rho)
    if et == ElementType.SHELL_Q4_MITC:
        coords = [nodes[nid] for nid in element.nodes]
        t = sec.thickness if sec and sec.thickness else 0.1
        return ShellQuad4MITC(coords, mat.E, mat.nu, t, mat.rho)
    if et == ElementType.SOLID_H8:
        coords = [nodes[nid] for nid in element.nodes]
        return SolidHex8(coords, mat.E, mat.nu, mat.rho)
    if et == ElementType.SOLID_T4:
        coords = [nodes[nid] for nid in element.nodes]
        return SolidTet4(coords, mat.E, mat.nu, mat.rho)
    if et == ElementType.SOLID_T10:
        coords = [nodes[nid] for nid in element.nodes]
        return SolidTet10(coords, mat.E, mat.nu, mat.rho)
    if et == ElementType.TRI3:
        coords = [nodes[nid] for nid in element.nodes]
        t = sec.thickness if sec and sec.thickness else 0.1
        return Tri3(coords, mat.E, mat.nu, t, mat.rho)
    raise ValueError(f"Tipo elemento sconosciuto: {et}")


class GlobalAssembler:
    """Assembla K, M, F globali a partire da un FEAModel."""

    def __init__(self, model: FEAModel):
        self.model = model
        self.n_dofs = len(model.nodes) * GLOBAL_DOFS_PER_NODE
        self.node_dofs = dof_map_for_model(model)
        self.nodes_xyz = _node_dict(model)
        self._element_cache: list[tuple[any, list[int]]] = []
        for el in model.elements:
            inst = _build_element(el, self.nodes_xyz)
            dofs = _element_dofs(el, self.node_dofs)
            self._element_cache.append((inst, dofs, el))

    def assemble_stiffness(self) -> sp.csr_matrix:
        rows: list[int] = []
        cols: list[int] = []
        data: list[float] = []
        for inst, dofs, el in self._element_cache:
            # Beam2D supporta sia releases che winkler_k
            if el.type == ElementType.BEAM2D:
                kwargs: dict = {}
                if el.releases:
                    kwargs["releases"] = el.releases
                if el.winkler_k and el.winkler_k > 0:
                    kwargs["winkler_k"] = el.winkler_k
                K_el = inst.stiffness_global(**kwargs)
            elif el.type == ElementType.BEAM3D and el.releases:
                K_el = inst.stiffness_global(releases=el.releases)
            else:
                K_el = inst.stiffness_global()
            n = len(dofs)
            for i in range(n):
                for j in range(n):
                    rows.append(dofs[i])
                    cols.append(dofs[j])
                    data.append(K_el[i, j])
        K = sp.coo_matrix((data, (rows, cols)), shape=(self.n_dofs, self.n_dofs))
        return K.tocsr()

    def assemble_mass(self) -> sp.csr_matrix:
        rows: list[int] = []
        cols: list[int] = []
        data: list[float] = []
        for inst, dofs, _ in self._element_cache:
            M_el = inst.mass_global()
            n = len(dofs)
            for i in range(n):
                for j in range(n):
                    if M_el[i, j] != 0:
                        rows.append(dofs[i])
                        cols.append(dofs[j])
                        data.append(M_el[i, j])
        for load in self.model.loads:
            if load.type == LoadType.NODAL_MASS:
                nid = load.target_id
                if nid in self.node_dofs and load.mass > 0:
                    base = self.node_dofs[nid]
                    for d in base[:3]:
                        rows.append(d); cols.append(d); data.append(load.mass)
        M = sp.coo_matrix((data, (rows, cols)), shape=(self.n_dofs, self.n_dofs))
        return M.tocsr()

    def build_load_vector(self, include_self_weight_g: float = 0.0) -> np.ndarray:
        F = np.zeros(self.n_dofs, dtype=float)
        for load in self.model.loads:
            if load.type == LoadType.NODAL:
                nid = load.target_id
                if nid in self.node_dofs:
                    d = self.node_dofs[nid]
                    F[d[0]] += load.fx
                    F[d[1]] += load.fy
                    F[d[2]] += load.fz
                    F[d[3]] += load.mx
                    F[d[4]] += load.my
                    F[d[5]] += load.mz
            elif load.type == LoadType.DISTRIBUTED:
                eid = load.target_id
                el = next((e for e in self.model.elements if e.id == eid), None)
                if el is None:
                    continue
                inst_dofs = next(((inst, dofs) for inst, dofs, e in self._element_cache if e.id == eid), None)
                if inst_dofs is None:
                    continue
                inst, dofs = inst_dofs
                if el.type == ElementType.BEAM2D and hasattr(inst, "equivalent_load_uniform"):
                    qy = load.qy
                    f_local = inst.equivalent_load_uniform(qy)
                    T = inst.transformation_matrix()
                    f_global = T.T @ f_local
                    for i, d in enumerate(dofs):
                        F[d] += f_global[i]
                elif el.type == ElementType.BEAM3D:
                    L = inst.L
                    fy_per_m = load.qy
                    fz_per_m = load.qz
                    half_y = fy_per_m * L / 2.0
                    half_z = fz_per_m * L / 2.0
                    mom_y = fy_per_m * L * L / 12.0
                    mom_z = fz_per_m * L * L / 12.0
                    local = np.zeros(12)
                    local[1] = half_y; local[7] = half_y
                    local[2] = half_z; local[8] = half_z
                    local[5] = mom_y; local[11] = -mom_y
                    local[4] = -mom_z; local[10] = mom_z
                    T = inst.transformation_matrix()
                    f_global = T.T @ local
                    for i, d in enumerate(dofs):
                        F[d] += f_global[i]
            elif load.type == LoadType.SELF_WEIGHT and include_self_weight_g != 0.0:
                pass
            elif load.type == LoadType.PRESSURE:
                eid = load.target_id
                el = next((e for e in self.model.elements if e.id == eid), None)
                if el is None:
                    continue
                inst_dofs = next(((inst, dofs) for inst, dofs, e in self._element_cache if e.id == eid), None)
                if inst_dofs is None:
                    continue
                inst, dofs = inst_dofs
                p = load.pressure
                if p == 0:
                    continue
                if el.type == ElementType.SHELL_Q4:
                    A = inst._area()
                    normal = inst.R[2]
                    force_total = -p * A * normal
                    f_per_node = force_total / 4.0
                    for i_n in range(4):
                        base_idx = i_n * 6
                        F[dofs[base_idx]]     += f_per_node[0]
                        F[dofs[base_idx + 1]] += f_per_node[1]
                        F[dofs[base_idx + 2]] += f_per_node[2]
            elif load.type == LoadType.TEMPERATURE:
                eid = load.target_id
                el = next((e for e in self.model.elements if e.id == eid), None)
                if el is None:
                    continue
                inst_dofs = next(((inst, dofs) for inst, dofs, e in self._element_cache if e.id == eid), None)
                if inst_dofs is None:
                    continue
                inst, dofs = inst_dofs
                if el.type not in (ElementType.BEAM2D, ElementType.BEAM3D,
                                   ElementType.TRUSS2D, ElementType.TRUSS3D):
                    continue
                mat = MATERIALS_DB.get(el.material_id)
                sec = SECTIONS_DB.get(el.section_id) if el.section_id else None
                if mat is None or sec is None:
                    continue
                dT = load.delta_t
                N_eq = mat.E * sec.A * mat.alpha_t * dT
                if N_eq == 0:
                    continue
                if el.type == ElementType.BEAM2D:
                    f_local = np.array([-N_eq, 0, 0, N_eq, 0, 0])
                    T = inst.transformation_matrix()
                    f_global = T.T @ f_local
                    for i, d in enumerate(dofs):
                        F[d] += f_global[i]
                elif el.type == ElementType.TRUSS2D:
                    c, s = inst.cos, inst.sin
                    f_global = np.array([-N_eq * c, -N_eq * s, N_eq * c, N_eq * s])
                    for i, d in enumerate(dofs):
                        F[d] += f_global[i]
                elif el.type == ElementType.TRUSS3D:
                    d_vec = inst.cos
                    f_global = np.array([-N_eq * d_vec[0], -N_eq * d_vec[1], -N_eq * d_vec[2],
                                          N_eq * d_vec[0],  N_eq * d_vec[1],  N_eq * d_vec[2]])
                    for i, d in enumerate(dofs):
                        F[d] += f_global[i]
                elif el.type == ElementType.BEAM3D:
                    f_local = np.zeros(12)
                    f_local[0] = -N_eq; f_local[6] = N_eq
                    T = inst.transformation_matrix()
                    f_global = T.T @ f_local
                    for i, d in enumerate(dofs):
                        F[d] += f_global[i]
        if include_self_weight_g != 0.0:
            for inst, dofs, el in self._element_cache:
                mat = MATERIALS_DB[el.material_id]
                if el.type in (ElementType.BEAM2D, ElementType.TRUSS2D):
                    sec = SECTIONS_DB.get(el.section_id) if el.section_id else None
                    if sec is None:
                        continue
                    w = mat.rho * sec.A * inst.L * include_self_weight_g
                    half = w / 2.0
                    if el.type == ElementType.BEAM2D:
                        F[dofs[1]] -= half
                        F[dofs[4]] -= half
                    else:
                        F[dofs[1]] -= half
                        F[dofs[3]] -= half
                elif el.type in (ElementType.BEAM3D, ElementType.TRUSS3D):
                    sec = SECTIONS_DB.get(el.section_id) if el.section_id else None
                    if sec is None:
                        continue
                    w = mat.rho * sec.A * inst.L * include_self_weight_g
                    half = w / 2.0
                    if el.type == ElementType.BEAM3D:
                        F[dofs[2]] -= half
                        F[dofs[8]] -= half
                    else:
                        F[dofs[2]] -= half
                        F[dofs[5]] -= half
        return F

    def constrained_dofs(self) -> tuple[list[int], dict[int, float]]:
        """Restituisce (lista dof bloccati, mappa dof -> rigidezza molla)."""
        fixed: set[int] = set()
        springs: dict[int, float] = {}
        for c in self.model.constraints:
            nid = c.node_id
            if nid not in self.node_dofs:
                continue
            base = self.node_dofs[nid]
            if c.type == ConstraintType.FIXED:
                fixed.update(base)
            elif c.type == ConstraintType.PINNED:
                fixed.update(base[:3])
            elif c.type == ConstraintType.ROLLER_X:
                fixed.add(base[0])
            elif c.type == ConstraintType.ROLLER_Y:
                fixed.add(base[1])
            elif c.type == ConstraintType.ROLLER_Z:
                fixed.add(base[2])
            elif c.type == ConstraintType.CUSTOM and c.dofs:
                for i, blocked in enumerate(c.dofs):
                    if blocked and i < 6:
                        fixed.add(base[i])
            elif c.type == ConstraintType.SPRING and c.spring_k:
                for i, k in enumerate(c.spring_k):
                    if k and i < 6:
                        springs[base[i]] = springs.get(base[i], 0.0) + k
        return sorted(fixed), springs

    def _dead_dofs(self, K, M=None, tol_k: float = 1e-12) -> list[int]:
        """GdL senza alcuna rigidezza assemblata.

        Caso tipico: nodi con solo elementi beam2D non hanno rigidezza sui
        GdL fuori-piano (uz, θx, θy). Vanno bloccati per evitare singolarità,
        anche se M ha massa concentrata su di essi (altrimenti creerebbero
        modi rigidi inerziali nell'autoproblema).
        """
        diag_k = K.diagonal()
        return sorted(int(i) for i in range(self.n_dofs) if abs(diag_k[i]) < tol_k)

    def apply_boundary_conditions(self, K, M, F):
        fixed_dofs, springs = self.constrained_dofs()
        if springs:
            K = K.tolil()
            for d, k in springs.items():
                K[d, d] += k
            K = K.tocsr()
        dead = self._dead_dofs(K, M)
        all_fixed = sorted(set(fixed_dofs) | set(dead))
        free = [i for i in range(self.n_dofs) if i not in set(all_fixed)]
        K_ff = K[free, :][:, free]
        M_ff = M[free, :][:, free] if M is not None else None
        F_f = F[free] if F is not None else None
        return K_ff, M_ff, F_f, free, all_fixed
