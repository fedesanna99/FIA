"""
Analisi statica non-lineare (BL-1).

Solver Newton-Raphson per:
    - **Cavi tension-only** (Cable2D / Cable3D): la rigidezza di un cavo
      compresso viene azzerata (tecnicamente ridotta a un valore residuo
      molto piccolo) finché non torna in trazione.
    - **Non-linearità geometrica leggera** per beam2D: K_T = K_e + K_G(N).
      Per modelli con cavi che cambiano configurazione di trazione, lo schema
      converge tipicamente in 5-15 iterazioni.

Schema NR:
    Loop su step di carico s = 1..n_steps con λ_s ∈ (0, 1]:
        F_target = λ_s · F_ext
        u = u_prev
        per k = 1..max_iter:
            Calcola K_T(u), f_int(u)
            r = F_target - f_int
            applica BC su (K_T, r)
            Δu_free = K_T_ff^{-1} · r_f
            u += Δu (espanso ai dof globali)
            se ||r_f|| / ||F_target_f|| < tol → convergenza
        se non converge → warning, ma continua salvando lo step

Riferimenti:
    - Bathe, "Finite Element Procedures" (2014) §6.1-6.3.
    - Crisfield, "Non-linear Finite Element Analysis of Solids and Structures",
      Vol. 1 §1.1-1.3 (1991) — pure NR + load-control.
"""
from __future__ import annotations
from dataclasses import dataclass, field
import time
import numpy as np
import scipy.sparse as sp
import scipy.sparse.linalg as spla

from schemas import FEAModel, ElementType
from schemas.results import StaticResults, NodalDisplacement, ElementForces
from .assembler import GlobalAssembler, _element_dofs


@dataclass
class NonLinearStep:
    """Snapshot di uno step Newton-Raphson convergente (o non)."""
    step: int
    load_factor: float          # λ ∈ (0,1]
    iterations: int             # n. iterate Newton-Raphson usate
    residual_norm: float        # ||r_f|| / ||F_f|| al termine
    converged: bool
    max_displacement: float
    active_cables: int          # # cavi in trazione
    slack_cables: int           # # cavi rilassati


@dataclass
class NonLinearResults:
    analysis_type: str = "nonlinear_static"
    model_id: str = ""
    converged: bool = False
    n_steps: int = 0
    steps: list[NonLinearStep] = field(default_factory=list)
    final_displacements: list[NodalDisplacement] = field(default_factory=list)
    final_element_forces: list[ElementForces] = field(default_factory=list)
    max_displacement: float = 0.0
    solve_time_ms: float = 0.0
    diagnostics: dict = field(default_factory=dict)


class NonLinearStaticSolver:
    """Newton-Raphson load-controlled per cavi tension-only + non-linearità
    geometrica beam2D.

    Args:
        model           : FEA model
        n_steps         : numero di sub-steps di carico (default 10)
        max_iter        : max iterate NR per step (default 25)
        tol             : tolleranza relativa sul residuo (default 1e-6)
        include_kg_beam : se True, include K_G(N) per beam2D — disattivare
                          per debug o quando interessa solo il behaviour dei cavi
                          (default True)
    """

    def __init__(
        self,
        model: FEAModel,
        n_steps: int = 10,
        max_iter: int = 25,
        tol: float = 1.0e-6,
        include_kg_beam: bool = True,
    ):
        if n_steps < 1:
            raise ValueError("n_steps deve essere >= 1")
        if max_iter < 1:
            raise ValueError("max_iter deve essere >= 1")
        self.model = model
        self.n_steps = n_steps
        self.max_iter = max_iter
        self.tol = tol
        self.include_kg_beam = include_kg_beam

    # ── tangente + forza interna ────────────────────────────────────────────
    def _assemble_tangent_and_internal(
        self,
        assembler: GlobalAssembler,
        u: np.ndarray,
    ) -> tuple[sp.csr_matrix, np.ndarray, dict[int, float]]:
        """Restituisce (K_T globale, f_int globale, mappa elem_id → N corrente)."""
        n = assembler.n_dofs
        rows: list[int] = []
        cols: list[int] = []
        data: list[float] = []
        f_int = np.zeros(n, dtype=float)
        cable_forces: dict[int, float] = {}

        for inst, dofs, el in assembler._element_cache:
            u_el = u[dofs]

            # --- K_T elemento + f_int elemento ---------------------------
            if el.type in (ElementType.CABLE2D, ElementType.CABLE3D):
                # Tensione corrente (positiva o 0 se slack)
                T = inst.axial_force(u_el) if hasattr(inst, "axial_force") else 0.0
                cable_forces[el.id] = T
                K_el = inst.tangent_stiffness_global(T)
                f_int_el = K_el @ u_el  # per cavi lineari + K_G ≈ K_T·u
                # Aggiungi contributo pretensione (forza interna iniziale)
                if getattr(inst, "pretension", 0.0) > 0 and T > 0:
                    # forza nodale equivalente -P·c sul nodo i, +P·c sul nodo j
                    P = inst.pretension
                    if el.type == ElementType.CABLE2D:
                        c, s = inst.cos, inst.sin
                        f_pre = np.array([-P*c, -P*s, P*c, P*s])
                    else:
                        d = inst.cos
                        f_pre = np.array([-P*d[0], -P*d[1], -P*d[2],
                                           P*d[0],  P*d[1],  P*d[2]])
                    f_int_el = f_int_el + f_pre

            elif el.type == ElementType.BEAM2D and self.include_kg_beam:
                # Forza assiale corrente
                from core.elements import Beam2D  # type: ignore
                f_dict = inst.internal_forces(u_el)
                N = f_dict["N_j"]  # trazione = positiva
                K_e = inst.stiffness_global(
                    releases=el.releases if el.releases else None,
                    winkler_k=el.winkler_k if el.winkler_k else None,
                )
                # K_G in coordinate globali
                K_G = inst.geometric_stiffness_global(N)
                K_el = K_e + K_G
                f_int_el = K_e @ u_el  # forze interne dipendono solo da K_e·u (lineare)
                # NB: K_G contribuisce solo al tangente, non a f_int
                # (Bathe §6.2 — TL formulation con strain GL piccolo).

            elif el.type in (ElementType.TRUSS2D, ElementType.TRUSS3D):
                K_el = inst.stiffness_global()
                f_int_el = K_el @ u_el

            elif el.type == ElementType.BEAM2D:
                kwargs: dict = {}
                if el.releases:
                    kwargs["releases"] = el.releases
                if el.winkler_k and el.winkler_k > 0:
                    kwargs["winkler_k"] = el.winkler_k
                K_el = inst.stiffness_global(**kwargs)
                f_int_el = K_el @ u_el

            elif el.type == ElementType.BEAM3D and el.releases:
                K_el = inst.stiffness_global(releases=el.releases)
                f_int_el = K_el @ u_el

            else:
                K_el = inst.stiffness_global()
                f_int_el = K_el @ u_el

            # --- assembla in globale ------------------------------------
            ne = len(dofs)
            for i in range(ne):
                f_int[dofs[i]] += f_int_el[i]
                for j in range(ne):
                    rows.append(dofs[i])
                    cols.append(dofs[j])
                    data.append(K_el[i, j])

        K_T = sp.coo_matrix((data, (rows, cols)), shape=(n, n)).tocsr()
        return K_T, f_int, cable_forces

    # ── solve ───────────────────────────────────────────────────────────────
    def solve(self, progress_cb=None) -> NonLinearResults:
        t0 = time.time()
        assembler = GlobalAssembler(self.model)
        F_ext = assembler.build_load_vector(0.0)
        # Boundary conditions (fixed e springs)
        fixed_dofs, springs = assembler.constrained_dofs()
        n = assembler.n_dofs
        u = np.zeros(n, dtype=float)

        results = NonLinearResults(model_id=self.model.id)

        # Pre-computa dofs liberi tenendo conto della "dead-DOF" detection.
        # Importante: usiamo la *tangente* iniziale a u=0 (include K_G da
        # pretensione cavi) per identificare correttamente i DOF trasversali
        # dei cavi pretensionati — altrimenti la K_e lineare li flaggerebbe
        # come "dead" e li bloccherebbe.
        K_init, _, _ = self._assemble_tangent_and_internal(assembler, u)
        if springs:
            K_init = K_init.tolil()
            for d, k in springs.items():
                K_init[d, d] += k
            K_init = K_init.tocsr()
        dead = assembler._dead_dofs(K_init, None)
        all_fixed = sorted(set(fixed_dofs) | set(dead))
        free = [i for i in range(n) if i not in set(all_fixed)]
        free_arr = np.array(free, dtype=int)

        any_step_failed = False

        for step in range(1, self.n_steps + 1):
            lam = step / self.n_steps
            F_target = lam * F_ext
            if progress_cb:
                progress_cb(step / self.n_steps,
                            f"Step {step}/{self.n_steps}, λ={lam:.3f}")

            converged = False
            iter_used = 0
            r_norm_rel = 1.0
            cable_forces: dict[int, float] = {}

            for k in range(1, self.max_iter + 1):
                iter_used = k
                K_T, f_int, cable_forces = self._assemble_tangent_and_internal(
                    assembler, u,
                )
                # Aggiungi springs (extra rigidezza nodale)
                if springs:
                    K_T = K_T.tolil()
                    for d, kk in springs.items():
                        K_T[d, d] += kk
                    # Le springs contribuiscono anche a f_int come k·u
                    for d, kk in springs.items():
                        f_int[d] += kk * u[d]
                    K_T = K_T.tocsr()

                r = F_target - f_int

                # Forza l'azzeramento sui dof bloccati
                r_f = r[free_arr]
                F_target_f = F_target[free_arr]
                norm_F = float(np.linalg.norm(F_target_f))
                norm_r = float(np.linalg.norm(r_f))

                if norm_F < 1e-30:
                    # Carico nullo → converge banalmente
                    r_norm_rel = 0.0
                    converged = True
                    break

                r_norm_rel = norm_r / norm_F

                if r_norm_rel < self.tol:
                    converged = True
                    break

                # Risolvi K_T_ff · Δu = r_f
                K_ff = K_T[free_arr, :][:, free_arr]
                try:
                    du_f = spla.spsolve(K_ff.tocsc(), r_f)
                except Exception:
                    # Riprova con pseudo-inversa densa (small models only)
                    K_ff_d = K_ff.toarray()
                    du_f, *_ = np.linalg.lstsq(K_ff_d, r_f, rcond=None)
                # Espandi a tutti i dof
                du = np.zeros(n, dtype=float)
                du[free_arr] = du_f
                u = u + du

            # diagnostica per lo step
            max_disp_step = 0.0
            for nd in self.model.nodes:
                d = assembler.node_dofs[nd.id]
                ux, uy, uz = u[d[0]], u[d[1]], u[d[2]]
                mag = float(np.hypot(np.hypot(ux, uy), uz))
                if mag > max_disp_step:
                    max_disp_step = mag

            active = sum(1 for T in cable_forces.values() if T > 0)
            slack = len(cable_forces) - active

            results.steps.append(NonLinearStep(
                step=step, load_factor=lam, iterations=iter_used,
                residual_norm=r_norm_rel, converged=converged,
                max_displacement=max_disp_step,
                active_cables=active, slack_cables=slack,
            ))
            if not converged:
                any_step_failed = True

        # ── post: estrai displacements ed element forces ───────────────────
        for nd in self.model.nodes:
            d = assembler.node_dofs[nd.id]
            results.final_displacements.append(NodalDisplacement(
                node_id=nd.id,
                ux=float(u[d[0]]), uy=float(u[d[1]]), uz=float(u[d[2]]),
                rx=float(u[d[3]]), ry=float(u[d[4]]), rz=float(u[d[5]]),
            ))
            mag = float(np.hypot(np.hypot(u[d[0]], u[d[1]]), u[d[2]]))
            if mag > results.max_displacement:
                results.max_displacement = mag

        for inst, dofs, el in assembler._element_cache:
            u_el = u[dofs]
            if el.type == ElementType.BEAM2D:
                f = inst.internal_forces(u_el)
                results.final_element_forces.append(ElementForces(
                    element_id=el.id,
                    N_i=f["N_i"], Vy_i=f["Vy_i"], Mz_i=f["Mz_i"],
                    N_j=f["N_j"], Vy_j=f["Vy_j"], Mz_j=f["Mz_j"],
                ))
            elif el.type == ElementType.BEAM3D:
                f = inst.internal_forces(u_el)
                results.final_element_forces.append(ElementForces(element_id=el.id, **f))
            elif el.type in (
                ElementType.TRUSS2D, ElementType.TRUSS3D,
                ElementType.CABLE2D, ElementType.CABLE3D,
            ):
                f = inst.internal_force(u_el)
                results.final_element_forces.append(ElementForces(
                    element_id=el.id, N_i=f["N_i"], N_j=f["N_j"],
                ))

        results.n_steps = len(results.steps)
        results.converged = (not any_step_failed) and all(s.converged for s in results.steps)
        results.solve_time_ms = (time.time() - t0) * 1000.0
        results.diagnostics = {
            "n_cables": sum(1 for el in self.model.elements
                            if el.type in (ElementType.CABLE2D, ElementType.CABLE3D)),
            "include_kg_beam": self.include_kg_beam,
            "tol": self.tol,
        }
        if progress_cb:
            progress_cb(1.0, "Completato")
        return results
