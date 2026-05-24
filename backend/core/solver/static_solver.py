"""Analisi statica lineare K u = F."""
from __future__ import annotations
import time
import numpy as np

from schemas import FEAModel, ElementType
from schemas.results import (
    StaticResults, NodalDisplacement, NodalReaction, ElementForces, ElementStress,
)
from .assembler import GlobalAssembler, GLOBAL_DOFS_PER_NODE
from .errors import (
    NumericalInstabilityError,
    SingularMatrixError,
    safe_spsolve,
)


def _element_dofs_for_internal(el, node_dofs):
    from .assembler import _element_dofs
    return _element_dofs(el, node_dofs)


class StaticSolver:
    def __init__(self, model: FEAModel, include_self_weight: bool = False, g: float = 9.81):
        self.model = model
        self.include_self_weight = include_self_weight
        self.g = g

    def solve(self, progress_cb=None) -> StaticResults:
        t0 = time.time()
        assembler = GlobalAssembler(self.model)
        if progress_cb: progress_cb(0.1, "Assemblaggio matrice di rigidezza...")
        K = assembler.assemble_stiffness()
        if progress_cb: progress_cb(0.35, "Costruzione vettore carichi...")
        F = assembler.build_load_vector(self.g if self.include_self_weight else 0.0)
        if progress_cb: progress_cb(0.5, "Applicazione vincoli...")
        K_ff, _, F_f, free_dofs, fixed_dofs = assembler.apply_boundary_conditions(K, None, F)
        u_full = np.zeros(assembler.n_dofs)
        if K_ff.shape[0] == 0:
            # Modello completamente vincolato: le reazioni sono calcolabili
            # come −F_ext sui dof vincolati anche senza risolvere K_ff·u = F_f.
            if progress_cb: progress_cb(0.7, "Nessun GdL libero — solo reazioni...")
        else:
            if progress_cb: progress_cb(0.7, "Risoluzione del sistema K u = F...")
            # === SAFE solve · bug #30 audit v2.3.5-nafems-truth-audit ===
            # safe_spsolve cattura MatrixRankWarning, NaN/Inf, e spostamenti
            # > 10^6 m. Prima di v2.4.0 il solver restituiva NaN o valori folli
            # silenti. Refactor v2.4.0bis: helper riutilizzato anche da
            # arclength / dynamic / nonlinear.
            u_free = safe_spsolve(
                K_ff,
                F_f,
                n_free_dofs=K_ff.shape[0],
                context="static",
            )
            u_full[free_dofs] = u_free
        if progress_cb: progress_cb(0.85, "Calcolo reazioni e tensioni...")

        # Check 3 (paranoid): u_full deve essere finito anche dopo assignment
        if not np.all(np.isfinite(u_full)):
            n_invalid = int(np.sum(~np.isfinite(u_full)))
            raise NumericalInstabilityError(
                location="u_full post-solve",
                n_invalid=n_invalid,
            )

        F_internal = K @ u_full
        reactions_full = F_internal - F
        results = self._build_results(assembler, u_full, reactions_full, fixed_dofs)
        results.solve_time_ms = (time.time() - t0) * 1000.0
        results.n_dofs = assembler.n_dofs
        if progress_cb: progress_cb(1.0, "Completato")
        return results

    def _build_results(self, assembler, u_full, F_internal, fixed_dofs):
        model = self.model
        node_dofs = assembler.node_dofs
        displacements: list[NodalDisplacement] = []
        max_disp = 0.0
        for n in model.nodes:
            d = node_dofs[n.id]
            ux, uy, uz, rx, ry, rz = u_full[d[0]], u_full[d[1]], u_full[d[2]], u_full[d[3]], u_full[d[4]], u_full[d[5]]
            displacements.append(NodalDisplacement(
                node_id=n.id, ux=float(ux), uy=float(uy), uz=float(uz),
                rx=float(rx), ry=float(ry), rz=float(rz),
            ))
            mag = float(np.hypot(np.hypot(ux, uy), uz))
            if mag > max_disp:
                max_disp = mag
        reactions: list[NodalReaction] = []
        fixed_set = set(fixed_dofs)
        for n in model.nodes:
            d = node_dofs[n.id]
            if any(di in fixed_set for di in d):
                reactions.append(NodalReaction(
                    node_id=n.id,
                    fx=float(F_internal[d[0]]) if d[0] in fixed_set else 0.0,
                    fy=float(F_internal[d[1]]) if d[1] in fixed_set else 0.0,
                    fz=float(F_internal[d[2]]) if d[2] in fixed_set else 0.0,
                    mx=float(F_internal[d[3]]) if d[3] in fixed_set else 0.0,
                    my=float(F_internal[d[4]]) if d[4] in fixed_set else 0.0,
                    mz=float(F_internal[d[5]]) if d[5] in fixed_set else 0.0,
                ))
        element_forces: list[ElementForces] = []
        element_stresses: list[ElementStress] = []
        max_stress = 0.0
        for inst, dofs, el in assembler._element_cache:
            u_el = u_full[dofs]
            if el.type in (ElementType.BEAM2D,):
                f = inst.internal_forces(u_el)
                element_forces.append(ElementForces(
                    element_id=el.id,
                    N_i=f["N_i"], Vy_i=f["Vy_i"], Mz_i=f["Mz_i"],
                    N_j=f["N_j"], Vy_j=f["Vy_j"], Mz_j=f["Mz_j"],
                ))
                from schemas.material import SECTIONS_DB
                sec = SECTIONS_DB.get(el.section_id)
                if sec and sec.Wply > 0:
                    s = max(abs(f["Mz_i"]), abs(f["Mz_j"])) / sec.Wply
                    element_stresses.append(ElementStress(
                        element_id=el.id, sigma_x=s, von_mises=s,
                    ))
                    if s > max_stress:
                        max_stress = s
            elif el.type == ElementType.BEAM3D:
                f = inst.internal_forces(u_el)
                element_forces.append(ElementForces(element_id=el.id, **f))
                from schemas.material import SECTIONS_DB
                sec = SECTIONS_DB.get(el.section_id)
                if sec and sec.Wply > 0:
                    s = max(abs(f["My_i"]), abs(f["My_j"]), abs(f["Mz_i"]), abs(f["Mz_j"])) / sec.Wply
                    element_stresses.append(ElementStress(element_id=el.id, sigma_x=s, von_mises=s))
                    if s > max_stress:
                        max_stress = s
            elif el.type in (ElementType.TRUSS2D, ElementType.TRUSS3D,
                             ElementType.CABLE2D, ElementType.CABLE3D):
                f = inst.internal_force(u_el)
                element_forces.append(ElementForces(element_id=el.id, N_i=f["N_i"], N_j=f["N_j"]))
                from schemas.material import SECTIONS_DB
                sec = SECTIONS_DB.get(el.section_id)
                if sec and sec.A > 0:
                    s = abs(f["N_j"]) / sec.A
                    element_stresses.append(ElementStress(element_id=el.id, sigma_x=s, von_mises=s))
                    if s > max_stress:
                        max_stress = s
            elif el.type in (ElementType.SHELL_Q4, ElementType.SHELL_Q4_MITC):
                st = inst.stresses(u_el)
                # Rimuovi campi extra del shell layered (es. "layers") che non
                # sono accettati dallo schema ElementStress
                st_keys = {"sigma_x", "sigma_y", "sigma_z", "tau_xy", "tau_yz",
                           "tau_xz", "von_mises", "sigma_max", "sigma_min",
                           "principal_angle_deg", "centroid",
                           "principal_dir1", "principal_dir2"}
                st_filtered = {k: v for k, v in st.items() if k in st_keys}
                element_stresses.append(ElementStress(element_id=el.id, **st_filtered))
                if st["von_mises"] > max_stress:
                    max_stress = st["von_mises"]
            elif el.type == ElementType.TRI3:
                st = inst.stresses(u_el)
                element_stresses.append(ElementStress(element_id=el.id, **st))
                if st["von_mises"] > max_stress:
                    max_stress = st["von_mises"]
            elif el.type in (ElementType.SOLID_H8, ElementType.SOLID_T4, ElementType.SOLID_T10):
                st = inst.stresses_center(u_el)
                element_stresses.append(ElementStress(element_id=el.id, **st))
                if st["von_mises"] > max_stress:
                    max_stress = st["von_mises"]
        return StaticResults(
            model_id=model.id,
            displacements=displacements,
            reactions=reactions,
            element_forces=element_forces,
            element_stresses=element_stresses,
            max_displacement=max_disp,
            max_stress=max_stress,
        )
