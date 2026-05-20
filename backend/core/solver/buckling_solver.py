"""Analisi di buckling lineare — autoproblema generalizzato K φ = λ (-K_G) φ.

Per beam Euler-Bernoulli usa la K_G corretta basata su interpolazione cubica
(Bathe, FEM Procedures 2014 §6.6.3). Per truss/beam3D usa K_G truss-like
(sufficiente per l'instabilità laterale delle aste compresse).

Procedura:
1. Statica preliminare con il carico di riferimento → forze assiali N_i.
2. Per ogni elemento, assembla K_G usando N (negativo per compressione).
3. Autoproblema K φ = λ (-K_G) φ → i λ positivi sono i moltiplicatori
   critici (il carico critico è λ · P_riferimento).
"""
from __future__ import annotations
import time
import numpy as np
import scipy.sparse.linalg as spla
from scipy.linalg import eigh

from schemas import FEAModel, ElementType
from .assembler import GlobalAssembler
from .static_solver import StaticSolver


def _geometric_stiffness_truss(L: float, N: float) -> np.ndarray:
    """Matrice K_G per elemento truss 3D, ricavata dalla forza assiale N.

    K_G = (N/L) * diag perpendicolare (rigidezza dovuta al carico assiale che
    induce instabilità). Forma standard 6×6 per asta a 3 GdL/nodo.
    """
    if L == 0:
        return np.zeros((6, 6))
    k = (N / L)
    G = np.zeros((6, 6))
    perp = np.array([[1, 0, 0, -1, 0, 0],
                     [0, 1, 0, 0, -1, 0],
                     [0, 0, 1, 0, 0, -1]])
    sub = perp.T @ perp
    G = k * sub
    return G


class BucklingSolver:
    """Analisi di buckling lineare per strutture a travi/aste.

    Procedura:
    1. Risolve statica con il carico di riferimento, ottiene N nei truss/beam.
    2. Assembla K_G usando le forze assiali N.
    3. Risolve l'autoproblema generalizzato K φ = λ K_G φ → moltiplicatori critici.
    """

    def __init__(self, model: FEAModel, n_modes: int = 5):
        self.model = model
        self.n_modes = max(1, int(n_modes))

    def solve(self, progress_cb=None) -> dict:
        t0 = time.time()
        if progress_cb: progress_cb(0.1, "Soluzione statica preliminare...")
        static = StaticSolver(self.model).solve()
        if progress_cb: progress_cb(0.4, "Assemblaggio K_G...")
        assembler = GlobalAssembler(self.model)
        K = assembler.assemble_stiffness()
        n_dofs = assembler.n_dofs
        K_G_data = []
        K_G_rows = []
        K_G_cols = []
        forces_by_id = {f.element_id: f for f in static.element_forces}
        for inst, dofs, el in assembler._element_cache:
            if el.type not in (ElementType.TRUSS3D, ElementType.TRUSS2D,
                               ElementType.BEAM3D, ElementType.BEAM2D):
                continue
            f = forces_by_id.get(el.id)
            if f is None:
                continue
            N = f.N_i if abs(f.N_i) > abs(f.N_j) else f.N_j
            L = inst.L if hasattr(inst, "L") else 1.0
            if el.type == ElementType.TRUSS3D:
                K_G_el = _geometric_stiffness_truss(L, N)
                for i in range(6):
                    for j in range(6):
                        K_G_rows.append(dofs[i]); K_G_cols.append(dofs[j])
                        K_G_data.append(K_G_el[i, j])
            elif el.type == ElementType.BEAM3D:
                K_G_el_3 = _geometric_stiffness_truss(L, N)
                idx_trans = [0, 1, 2, 6, 7, 8]
                for i, di in enumerate(idx_trans):
                    for j, dj in enumerate(idx_trans):
                        K_G_rows.append(dofs[di]); K_G_cols.append(dofs[dj])
                        K_G_data.append(K_G_el_3[i, j])
            elif el.type == ElementType.TRUSS2D:
                K_G_el = _geometric_stiffness_truss(L, N)[:4, :4]
                for i in range(4):
                    for j in range(4):
                        K_G_rows.append(dofs[i]); K_G_cols.append(dofs[j])
                        K_G_data.append(K_G_el[i, j])
            elif el.type == ElementType.BEAM2D:
                # K_G beam corretta (cubic interpolation, Bathe §6.6.3).
                # inst è un Beam2D con metodo geometric_stiffness_global(N).
                K_G_el = inst.geometric_stiffness_global(N)  # 6x6 globale
                # I dofs per beam2D sono [ux1, uy1, rotz1, ux2, uy2, rotz2]
                for i in range(6):
                    for j in range(6):
                        K_G_rows.append(dofs[i]); K_G_cols.append(dofs[j])
                        K_G_data.append(K_G_el[i, j])
        import scipy.sparse as sp
        K_G = sp.coo_matrix(
            (K_G_data, (K_G_rows, K_G_cols)), shape=(n_dofs, n_dofs)
        ).tocsr()

        if progress_cb: progress_cb(0.7, "Risoluzione autoproblema...")
        K_ff, _, _, free_dofs, _ = assembler.apply_boundary_conditions(K, None, np.zeros(n_dofs))
        K_G_ff = K_G[free_dofs, :][:, free_dofs]
        K_G_norm = float(abs(K_G_ff).max()) if K_G_ff.nnz > 0 else 0.0
        if K_G_norm < 1e-9:
            return {
                "analysis_type": "buckling",
                "model_id": self.model.id,
                "n_modes": 0,
                "load_factors": [],
                "critical_factor": 0.0,
                "solve_time_ms": (time.time() - t0) * 1000.0,
                "message": "Nessun carico assiale significativo: impossibile calcolare buckling.",
            }
        try:
            n_eig = min(self.n_modes, K_ff.shape[0] - 2)
            eigenvalues, eigenvectors = spla.eigs(
                K_ff.tocsc(), k=n_eig, M=(-K_G_ff).tocsc(),
                sigma=0.0, which="LM",
            )
            eigenvalues = np.real(eigenvalues)
        except Exception:
            K_dense = K_ff.toarray()
            KG_dense = (-K_G_ff).toarray()
            eigenvalues, eigenvectors = eigh(K_dense, KG_dense)
        eigenvalues = eigenvalues[eigenvalues > 1e-6]
        idx = np.argsort(eigenvalues)
        eigenvalues = eigenvalues[idx][:self.n_modes]
        if progress_cb: progress_cb(1.0, "Completato")
        return {
            "analysis_type": "buckling",
            "model_id": self.model.id,
            "n_modes": int(len(eigenvalues)),
            "load_factors": [float(v) for v in eigenvalues],
            "critical_factor": float(eigenvalues[0]) if len(eigenvalues) > 0 else 0.0,
            "solve_time_ms": (time.time() - t0) * 1000.0,
        }
