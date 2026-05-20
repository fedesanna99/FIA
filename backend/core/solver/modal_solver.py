"""Analisi modale — risolve l'autoproblema (K - ω² M) φ = 0."""
from __future__ import annotations
import time
import numpy as np
import scipy.sparse as sp
import scipy.sparse.linalg as spla

from schemas import FEAModel
from schemas.results import ModalResults, ModeShape, NodalDisplacement
from .assembler import GlobalAssembler, GLOBAL_DOFS_PER_NODE


class ModalSolver:
    def __init__(self, model: FEAModel, n_modes: int = 10):
        self.model = model
        self.n_modes = max(1, int(n_modes))

    def solve(self, progress_cb=None) -> ModalResults:
        t0 = time.time()
        assembler = GlobalAssembler(self.model)
        if progress_cb: progress_cb(0.1, "Assemblaggio K e M...")
        K = assembler.assemble_stiffness()
        M = assembler.assemble_mass()
        if progress_cb: progress_cb(0.4, "Applicazione vincoli...")
        K_ff, M_ff, _, free_dofs, _ = assembler.apply_boundary_conditions(K, M, np.zeros(assembler.n_dofs))
        n_free = K_ff.shape[0]
        n_eig = min(self.n_modes, n_free - 2) if n_free > 4 else max(1, n_free - 1)
        if n_eig <= 0:
            raise ValueError("Modello insufficiente per analisi modale.")
        if progress_cb: progress_cb(0.55, f"Risoluzione autoproblema ({n_eig} modi)...")
        try:
            eigenvalues, eigenvectors = spla.eigsh(K_ff.tocsc(), k=n_eig, M=M_ff.tocsc(), sigma=0, which="LM")
        except Exception:
            K_dense = K_ff.toarray()
            M_dense = M_ff.toarray()
            from scipy.linalg import eigh
            eigenvalues, eigenvectors = eigh(K_dense, M_dense)
            eigenvalues = eigenvalues[:n_eig]
            eigenvectors = eigenvectors[:, :n_eig]
        idx = np.argsort(eigenvalues)
        eigenvalues = eigenvalues[idx]
        eigenvectors = eigenvectors[:, idx]
        eigenvalues = np.clip(eigenvalues, 0, None)
        omegas = np.sqrt(eigenvalues)
        freqs = omegas / (2.0 * np.pi)
        if progress_cb: progress_cb(0.85, "Calcolo partecipazioni modali...")
        modes: list[ModeShape] = []
        total_mass = float(M_ff.diagonal().sum())
        node_dofs = assembler.node_dofs
        n_total = assembler.n_dofs
        for i in range(n_eig):
            phi_free = eigenvectors[:, i]
            phi_full = np.zeros(n_total)
            phi_full[free_dofs] = phi_free
            phi_norm = phi_full / (np.max(np.abs(phi_full)) if np.max(np.abs(phi_full)) > 0 else 1.0)
            disps: list[NodalDisplacement] = []
            for n in self.model.nodes:
                d = node_dofs[n.id]
                disps.append(NodalDisplacement(
                    node_id=n.id,
                    ux=float(phi_norm[d[0]]), uy=float(phi_norm[d[1]]), uz=float(phi_norm[d[2]]),
                    rx=float(phi_norm[d[3]]), ry=float(phi_norm[d[4]]), rz=float(phi_norm[d[5]]),
                ))
            r_x = np.zeros(n_free); r_y = np.zeros(n_free); r_z = np.zeros(n_free)
            free_set = set(free_dofs)
            free_list = list(free_dofs)
            for j, d_global in enumerate(free_list):
                node_idx = d_global // GLOBAL_DOFS_PER_NODE
                dof_within = d_global % GLOBAL_DOFS_PER_NODE
                if dof_within == 0:
                    r_x[j] = 1.0
                elif dof_within == 1:
                    r_y[j] = 1.0
                elif dof_within == 2:
                    r_z[j] = 1.0
            M_mat = M_ff.tocsr()
            Mphi = M_mat @ phi_free
            denom = phi_free @ Mphi
            if denom < 1e-12:
                px = py = pz = mx = my = mz = 0.0
            else:
                px = float(r_x @ Mphi); py = float(r_y @ Mphi); pz = float(r_z @ Mphi)
                mx = px * px / denom
                my = py * py / denom
                mz = pz * pz / denom
            period = float(2.0 * np.pi / omegas[i]) if omegas[i] > 0 else 0.0
            modes.append(ModeShape(
                mode=i + 1,
                frequency_hz=float(freqs[i]),
                omega=float(omegas[i]),
                period=period,
                displacements=disps,
                participation_x=px, participation_y=py, participation_z=pz,
                effective_mass_x=mx, effective_mass_y=my, effective_mass_z=mz,
            ))
        if progress_cb: progress_cb(1.0, "Completato")
        return ModalResults(
            model_id=self.model.id,
            n_modes=n_eig,
            modes=modes,
            total_mass=total_mass,
            solve_time_ms=(time.time() - t0) * 1000.0,
        )
