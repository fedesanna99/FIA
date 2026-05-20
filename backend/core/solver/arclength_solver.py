"""
Arc-length solver — Crisfield cylindrical (BL-2).

Per analisi non-lineare *path-following* attraverso punti limite (snap-through,
snap-back, biforcazione). Diversamente dal load-control (NonLinearStaticSolver),
qui λ (fattore di carico) è un'incognita aggiuntiva del problema, soggetta al
vincolo che la "lunghezza d'arco" Δs di ogni incremento sia prescritta.

Equazioni:
    K_T(u) · Δu = Δλ · F_ext + r            (equilibrio)
    Δu^T · Δu + ψ² · Δλ² · ||F_ext||² = Δs²  (vincolo arc-length)

Crisfield (cylindrical, ψ=0):
    Δu^T · Δu = Δs²

L'iterata Newton sotto-iterata k risolve:
    δu = δu_bar + δλ · δu_t
    δu_bar = K_T^-1 · r                     (correzione residuale)
    δu_t   = K_T^-1 · F_ext                 (modo tangente)

L'incognita δλ si trova imponendo che Δu_k+1 = Δu_k + δu rispetti il vincolo:
    a · δλ² + b · δλ + c = 0
con a = δu_t·δu_t, b = 2·(Δu_k + δu_bar)·δu_t, c = (Δu_k + δu_bar)^T(Δu_k + δu_bar) - Δs²

La radice scelta è quella che minimizza il cambio d'angolo del path
(criterio di "dot-product" di Crisfield).

Riferimenti:
    - Crisfield, M.A. (1981), "A fast incremental/iterative solution procedure
      that handles snap-through", Comp. Struct., 13, 55-62.
    - Crisfield (1991) "Non-linear Finite Element Analysis of Solids and
      Structures", Vol. 1, §9.3 (spherical), §9.4 (cylindrical).
"""
from __future__ import annotations
from dataclasses import dataclass, field
import time
import math

import numpy as np
import scipy.sparse as sp
import scipy.sparse.linalg as spla

from schemas import FEAModel
from schemas.results import NodalDisplacement
from .assembler import GlobalAssembler
from .nonlinear_solver import NonLinearStaticSolver


@dataclass
class ArcLengthStep:
    step: int
    load_factor: float
    iterations: int
    residual_norm: float
    converged: bool
    arc_length: float
    max_displacement: float
    control_displacement: float  # valore monitorato (dof di controllo)


@dataclass
class ArcLengthResults:
    analysis_type: str = "arc_length"
    model_id: str = ""
    converged_all: bool = False
    steps: list[ArcLengthStep] = field(default_factory=list)
    # Curva carico-spostamento (lambda, delta) per il dof di controllo
    lambda_curve: list[float] = field(default_factory=list)
    delta_curve: list[float] = field(default_factory=list)
    final_displacements: list[NodalDisplacement] = field(default_factory=list)
    solve_time_ms: float = 0.0
    diagnostics: dict = field(default_factory=dict)


class ArcLengthSolver:
    """Cylindrical arc-length per analisi post-buckling.

    Riusa l'assembler tangente di `NonLinearStaticSolver`. Pensato per
    strutture con instabilità di ramificazione (es. trave Williams toggle).

    Args:
        model        : FEA model con K_G + cavi (opzionali) attivi
        n_steps      : numero target di sub-step (default 30)
        delta_s      : lunghezza d'arco prescritta (default = ||F_ext|| / 100)
        max_iter     : max iterate per step (default 25)
        tol          : tolleranza relativa sul residuo (default 1e-6)
        control_dof  : dof globale di cui tracciare la curva λ-δ (default:
                       il dof con il massimo valore di F_ext in modulo)
        lambda_max   : se |λ| supera questo valore, arresta il path-following
        delta_max    : se |δ_control| supera questo valore, arresta
    """

    def __init__(
        self,
        model: FEAModel,
        n_steps: int = 30,
        delta_s: float | None = None,
        max_iter: int = 25,
        tol: float = 1e-6,
        control_dof: int | None = None,
        lambda_max: float = 50.0,
        delta_max: float = 1.0,
        initial_lambda: float = 0.05,
    ):
        if n_steps < 1:
            raise ValueError("n_steps deve essere >= 1")
        self.model = model
        self.n_steps = n_steps
        self.delta_s = delta_s
        self.max_iter = max_iter
        self.tol = tol
        self.control_dof = control_dof
        self.lambda_max = lambda_max
        self.delta_max = delta_max
        self.initial_lambda = initial_lambda

    # ── solve ───────────────────────────────────────────────────────────────
    def solve(self, progress_cb=None) -> ArcLengthResults:  # noqa: C901
        t0 = time.time()
        assembler = GlobalAssembler(self.model)
        F_ext = assembler.build_load_vector(0.0)
        n = assembler.n_dofs

        # Riusa la routine di tangente dal NonLinearStaticSolver — singleton
        nl_helper = NonLinearStaticSolver(self.model, n_steps=1, tol=self.tol,
                                            include_kg_beam=True)

        # Boundary conditions
        fixed_dofs, springs = assembler.constrained_dofs()
        # Identifica dofs liberi una volta usando K_T iniziale
        u_zero = np.zeros(n, dtype=float)
        K0, _, _ = nl_helper._assemble_tangent_and_internal(assembler, u_zero)
        if springs:
            K0 = K0.tolil()
            for d, kk in springs.items():
                K0[d, d] += kk
            K0 = K0.tocsr()
        dead = assembler._dead_dofs(K0, None)
        all_fixed = sorted(set(fixed_dofs) | set(dead))
        free = [i for i in range(n) if i not in set(all_fixed)]
        free_arr = np.array(free, dtype=int)

        # Sceglie il control dof: argmax |F_ext| fra i free dofs
        if self.control_dof is None:
            free_f = np.abs(F_ext[free_arr])
            if free_f.max() > 0:
                self.control_dof = int(free_arr[int(np.argmax(free_f))])
            else:
                self.control_dof = int(free_arr[0])

        # Δs iniziale: se None → norma F_ext * 0.01 (euristica robusta)
        if self.delta_s is None:
            F_norm = float(np.linalg.norm(F_ext[free_arr]))
            self.delta_s = max(F_norm * 1e-4, 1e-3)

        u = np.zeros(n, dtype=float)
        lam = 0.0
        results = ArcLengthResults(model_id=self.model.id)
        results.lambda_curve.append(0.0)
        results.delta_curve.append(0.0)

        prev_du_pred: np.ndarray | None = None  # per criterio segno δλ

        for step in range(1, self.n_steps + 1):
            if progress_cb:
                progress_cb(step / self.n_steps,
                            f"Step {step}/{self.n_steps}, λ={lam:.3f}")

            # ── Predictor (tangent direction) ────────────────────────────
            K_T, f_int, _ = nl_helper._assemble_tangent_and_internal(assembler, u)
            if springs:
                K_T = K_T.tolil()
                for d, kk in springs.items():
                    K_T[d, d] += kk
                    f_int[d] += kk * u[d]
                K_T = K_T.tocsr()
            K_ff = K_T[free_arr, :][:, free_arr]
            try:
                du_t_f = spla.spsolve(K_ff.tocsc(), F_ext[free_arr])
            except Exception:
                results.diagnostics["error"] = f"K_T singolare a step {step}"
                break

            du_t = np.zeros(n)
            du_t[free_arr] = du_t_f

            # Lunghezza d'arco del predittore:
            #   Δu_p = ±Δλ_p · du_t
            #   ||Δu_p|| = |Δλ_p| · ||du_t_f||
            #   ⇒ Δλ_p = ±Δs / ||du_t_f||
            du_t_norm = float(np.linalg.norm(du_t_f))
            if du_t_norm < 1e-30:
                results.diagnostics["error"] = "du_t è nullo"
                break

            if step == 1:
                # Primo step: forza Δλ_p > 0 (segui il carico)
                dlam_p = self.initial_lambda
                # Calibrate delta_s sul primo predictor
                # Vogliamo Δu_p tale che ||Δu_p|| = self.delta_s
                # Δu_p = dlam_p · du_t  ⇒  ||Δu_p|| = dlam_p · du_t_norm
                # Allineiamo delta_s a questa misura per coerenza nel resto
                self.delta_s = abs(dlam_p) * du_t_norm
            else:
                # Sign predictor: usa il criterio "dot-product" di Crisfield
                if prev_du_pred is not None:
                    sign = math.copysign(1.0, float(prev_du_pred @ du_t_f))
                else:
                    sign = 1.0
                dlam_p = sign * self.delta_s / du_t_norm

            Du_f = dlam_p * du_t_f  # incremento accumulato (lungo lo step)
            Dlam = dlam_p
            prev_du_pred = Du_f.copy()

            # Applica predittore
            u_step = u.copy()
            u_step[free_arr] = u[free_arr] + Du_f
            lam_step = lam + Dlam

            # ── Corrector (Newton arc-length) ────────────────────────────
            converged = False
            r_norm_rel = 1.0
            iter_used = 0
            for k in range(1, self.max_iter + 1):
                iter_used = k

                K_T, f_int, _ = nl_helper._assemble_tangent_and_internal(
                    assembler, u_step,
                )
                if springs:
                    K_T = K_T.tolil()
                    for d, kk in springs.items():
                        K_T[d, d] += kk
                        f_int[d] += kk * u_step[d]
                    K_T = K_T.tocsr()
                r = lam_step * F_ext - f_int
                r_f = r[free_arr]
                F_target = lam_step * F_ext
                F_target_f = F_target[free_arr]
                F_ext_f = F_ext[free_arr]
                norm_F = float(np.linalg.norm(F_target_f)) or 1.0
                norm_r = float(np.linalg.norm(r_f))
                r_norm_rel = norm_r / norm_F
                if r_norm_rel < self.tol:
                    converged = True
                    break

                K_ff = K_T[free_arr, :][:, free_arr]
                try:
                    du_bar_f = spla.spsolve(K_ff.tocsc(), r_f)
                    du_t_f = spla.spsolve(K_ff.tocsc(), F_ext_f)
                except Exception:
                    break

                # Constraint quadratico (cylindrical, ψ=0):
                # Δu_new = Du_f + δu_bar + δλ · δu_t
                # ||Δu_new||² = Δs²
                a = float(du_t_f @ du_t_f)
                tmp = Du_f + du_bar_f
                b = 2.0 * float(du_t_f @ tmp)
                c = float(tmp @ tmp) - self.delta_s ** 2

                # Risolvi a·δλ² + b·δλ + c = 0
                disc = b * b - 4.0 * a * c
                if disc < 0 or a < 1e-30:
                    # Fallback: load-control puro (δλ = 0, accetta solo correzione)
                    dlam_k = 0.0
                    du_f = du_bar_f
                else:
                    sqrt_disc = math.sqrt(disc)
                    r1 = (-b + sqrt_disc) / (2 * a)
                    r2 = (-b - sqrt_disc) / (2 * a)
                    # Crisfield: scegli δλ che mantiene la direzione
                    Du1 = tmp + r1 * du_t_f
                    Du2 = tmp + r2 * du_t_f
                    dot1 = float(Du_f @ Du1)
                    dot2 = float(Du_f @ Du2)
                    dlam_k = r1 if dot1 > dot2 else r2
                    du_f = du_bar_f + dlam_k * du_t_f

                u_step[free_arr] = u_step[free_arr] + du_f
                Du_f = Du_f + du_f
                lam_step = lam_step + dlam_k
                Dlam = Dlam + dlam_k

            # Aggiornamento finale
            if converged:
                u = u_step
                lam = lam_step

            max_disp_step = 0.0
            for nd in self.model.nodes:
                d = assembler.node_dofs[nd.id]
                ux, uy, uz = u[d[0]], u[d[1]], u[d[2]]
                mag = float(math.hypot(math.hypot(ux, uy), uz))
                if mag > max_disp_step:
                    max_disp_step = mag

            control_disp = float(u[self.control_dof])

            results.steps.append(ArcLengthStep(
                step=step, load_factor=lam, iterations=iter_used,
                residual_norm=r_norm_rel, converged=converged,
                arc_length=self.delta_s,
                max_displacement=max_disp_step,
                control_displacement=control_disp,
            ))
            results.lambda_curve.append(lam)
            results.delta_curve.append(control_disp)

            # Stopping criteria
            if abs(lam) > self.lambda_max:
                results.diagnostics["stopped"] = "lambda_max"
                break
            if abs(control_disp) > self.delta_max:
                results.diagnostics["stopped"] = "delta_max"
                break
            if not converged:
                # Riduci Δs e prova ancora? Per semplicità: stop.
                results.diagnostics["stopped"] = f"non converge a step {step}"
                break

        for nd in self.model.nodes:
            d = assembler.node_dofs[nd.id]
            results.final_displacements.append(NodalDisplacement(
                node_id=nd.id,
                ux=float(u[d[0]]), uy=float(u[d[1]]), uz=float(u[d[2]]),
                rx=float(u[d[3]]), ry=float(u[d[4]]), rz=float(u[d[5]]),
            ))
        results.converged_all = all(s.converged for s in results.steps)
        results.solve_time_ms = (time.time() - t0) * 1000.0
        results.diagnostics.update({
            "control_dof": self.control_dof,
            "delta_s_used": self.delta_s,
            "n_steps_done": len(results.steps),
        })
        if progress_cb:
            progress_cb(1.0, "Completato")
        return results
