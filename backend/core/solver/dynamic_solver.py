"""Analisi dinamica transitoria con schema implicito di Newmark-β.

M ü + C u̇ + K u = F(t)
Con β=0.25, γ=0.5 lo schema è incondizionatamente stabile.
"""
from __future__ import annotations
import time
import numpy as np
import scipy.sparse as sp
import scipy.sparse.linalg as spla

from schemas import FEAModel, LoadType
from schemas.results import DynamicResults
from .assembler import GlobalAssembler, GLOBAL_DOFS_PER_NODE


class DynamicSolver:
    def __init__(
        self,
        model: FEAModel,
        dt: float = 0.01,
        t_end: float = 1.0,
        beta: float = 0.25,
        gamma: float = 0.5,
        rayleigh_alpha: float = 0.0,
        rayleigh_beta: float = 0.0,
        save_every: int = 1,
        store_nodes: list[int] | None = None,
    ):
        self.model = model
        self.dt = float(dt)
        self.t_end = float(t_end)
        self.beta = float(beta)
        self.gamma = float(gamma)
        self.alpha_r = float(rayleigh_alpha)
        self.beta_r = float(rayleigh_beta)
        self.save_every = max(1, int(save_every))
        self.store_nodes = store_nodes

    def _build_time_force(self, assembler: GlobalAssembler, n_steps: int, M=None):
        """Costruisce F(t) per ogni step di tempo. Combina:
        - Carichi nodali statici (costanti nel tempo)
        - Carichi dinamici puntuali con time_history
        - Accelerogrammi alla base (GROUND_ACCEL): F_eff = -M·r·a_g(t)
        """
        F_static = assembler.build_load_vector(0.0)
        F_t = np.zeros((n_steps + 1, assembler.n_dofs))
        for i in range(n_steps + 1):
            F_t[i] = F_static
        for load in self.model.loads:
            if load.type == LoadType.DYNAMIC and load.time_history:
                nid = load.target_id
                if nid not in assembler.node_dofs:
                    continue
                d = assembler.node_dofs[nid]
                direction = np.array(load.direction or [0.0, -1.0, 0.0], dtype=float)
                if np.linalg.norm(direction) > 0:
                    direction = direction / np.linalg.norm(direction)
                history = np.array(load.time_history, dtype=float)
                t_arr = history[:, 0]; v_arr = history[:, 1]
                for i in range(n_steps + 1):
                    t = i * self.dt
                    val = float(np.interp(t, t_arr, v_arr, left=0.0, right=0.0))
                    F_t[i, d[0]] += val * direction[0]
                    F_t[i, d[1]] += val * direction[1]
                    F_t[i, d[2]] += val * direction[2]
            elif load.type == LoadType.GROUND_ACCEL and load.time_history and M is not None:
                direction = np.array(load.direction or [1.0, 0.0, 0.0], dtype=float)
                if np.linalg.norm(direction) > 0:
                    direction = direction / np.linalg.norm(direction)
                r = np.zeros(assembler.n_dofs)
                for nid, d in assembler.node_dofs.items():
                    r[d[0]] = direction[0]
                    r[d[1]] = direction[1]
                    r[d[2]] = direction[2]
                M_r = (M @ r)
                history = np.array(load.time_history, dtype=float)
                t_arr = history[:, 0]; a_arr = history[:, 1]
                for i in range(n_steps + 1):
                    t = i * self.dt
                    ag = float(np.interp(t, t_arr, a_arr, left=0.0, right=0.0))
                    F_t[i] -= M_r * ag
        return F_t

    def solve(self, progress_cb=None) -> DynamicResults:
        t0 = time.time()
        assembler = GlobalAssembler(self.model)
        if progress_cb: progress_cb(0.05, "Assemblaggio K e M...")
        K = assembler.assemble_stiffness()
        M = assembler.assemble_mass()
        if progress_cb: progress_cb(0.15, "Vincoli...")
        K_ff, M_ff, F0, free_dofs, _ = assembler.apply_boundary_conditions(K, M, np.zeros(assembler.n_dofs))
        n_free = K_ff.shape[0]
        n_steps = int(np.ceil(self.t_end / self.dt))
        if progress_cb: progress_cb(0.25, "Costruzione storia temporale carichi...")
        F_t = self._build_time_force(assembler, n_steps, M=M)
        F_t_free = F_t[:, free_dofs]
        C_ff = self.alpha_r * M_ff + self.beta_r * K_ff
        beta, gamma, dt = self.beta, self.gamma, self.dt
        a0 = 1.0 / (beta * dt * dt)
        a1 = gamma / (beta * dt)
        a2 = 1.0 / (beta * dt)
        a3 = 1.0 / (2.0 * beta) - 1.0
        a4 = gamma / beta - 1.0
        a5 = dt * (gamma / (2.0 * beta) - 1.0)
        a6 = dt * (1.0 - gamma)
        a7 = dt * gamma
        K_eff = K_ff + a0 * M_ff + a1 * C_ff
        K_eff_csc = K_eff.tocsc()
        if progress_cb: progress_cb(0.4, "Fattorizzazione LU effettiva...")
        solve = spla.factorized(K_eff_csc)
        u = np.zeros(n_free)
        v = np.zeros(n_free)
        a = np.zeros(n_free)
        try:
            a = spla.spsolve(M_ff.tocsc(), F_t_free[0] - C_ff @ v - K_ff @ u)
        except Exception:
            a = np.zeros(n_free)
        node_dofs = assembler.node_dofs
        store_node_ids = self.store_nodes or [n.id for n in self.model.nodes]
        node_history: dict[int, dict[str, list[float]]] = {
            nid: {"ux": [], "uy": [], "uz": [], "ax": [], "ay": [], "az": []}
            for nid in store_node_ids
        }
        times: list[float] = []
        max_disp = 0.0
        max_disp_node = 0
        max_disp_time = 0.0
        save_step = 0
        for step in range(n_steps + 1):
            t = step * dt
            if step > 0:
                rhs = F_t_free[step] + M_ff @ (a0 * u + a2 * v + a3 * a) + C_ff @ (a1 * u + a4 * v + a5 * a)
                u_new = solve(rhs)
                a_new = a0 * (u_new - u) - a2 * v - a3 * a
                v_new = v + a6 * a + a7 * a_new
                u, v, a = u_new, v_new, a_new
            if step % self.save_every == 0:
                times.append(t)
                u_full = np.zeros(assembler.n_dofs)
                u_full[free_dofs] = u
                a_full = np.zeros(assembler.n_dofs)
                a_full[free_dofs] = a
                for nid in store_node_ids:
                    d = node_dofs[nid]
                    ux, uy, uz = u_full[d[0]], u_full[d[1]], u_full[d[2]]
                    ax_, ay_, az_ = a_full[d[0]], a_full[d[1]], a_full[d[2]]
                    node_history[nid]["ux"].append(float(ux))
                    node_history[nid]["uy"].append(float(uy))
                    node_history[nid]["uz"].append(float(uz))
                    node_history[nid]["ax"].append(float(ax_))
                    node_history[nid]["ay"].append(float(ay_))
                    node_history[nid]["az"].append(float(az_))
                    mag = float(np.hypot(np.hypot(ux, uy), uz))
                    if mag > max_disp:
                        max_disp = mag
                        max_disp_node = nid
                        max_disp_time = t
                save_step += 1
            if progress_cb and step % max(1, n_steps // 20) == 0:
                progress_cb(0.4 + 0.6 * step / n_steps, f"Step {step}/{n_steps}")
        if progress_cb: progress_cb(1.0, "Completato")
        return DynamicResults(
            model_id=self.model.id,
            dt=dt,
            n_steps=n_steps,
            times=times,
            node_history=node_history,
            max_displacement=max_disp,
            max_displacement_node=max_disp_node,
            max_displacement_time=max_disp_time,
            solve_time_ms=(time.time() - t0) * 1000.0,
        )
