"""
Tet4 — Tetraedro lineare a 4 nodi, 3 GdL per nodo.

Formulazione:
    - Funzioni di forma lineari in coordinate baricentriche (L1, L2, L3, L4)
      con L4 = 1 - L1 - L2 - L3.
    - Strain costante per elemento (CST 3D), un solo punto di integrazione
      al baricentro (peso V).
    - Massa consistente: m_total = ρ·V, distribuzione lumped (V/4 per nodo).

Limitazioni note:
    - Locking volumetrico e shear locking per ν → 0.5 e mesh grossolane.
    - Per accuratezza meglio T10 (quadratic) o mesh raffinata.

Riferimenti:
    - Zienkiewicz & Taylor (2005) "The Finite Element Method", Vol. 1,
      §6.4 (tetrahedron elements).
"""
from __future__ import annotations
import numpy as np

DOFS_PER_NODE = 3
NODES_PER_ELEMENT = 4


def _build_D_isotropic(E: float, nu: float) -> np.ndarray:
    """Matrice costitutiva isotropa 3D (6×6, notazione Voigt)."""
    c = E / ((1 + nu) * (1 - 2 * nu))
    D = c * np.array([
        [1 - nu, nu,     nu,     0, 0, 0],
        [nu,     1 - nu, nu,     0, 0, 0],
        [nu,     nu,     1 - nu, 0, 0, 0],
        [0, 0, 0, (1 - 2 * nu) / 2, 0, 0],
        [0, 0, 0, 0, (1 - 2 * nu) / 2, 0],
        [0, 0, 0, 0, 0, (1 - 2 * nu) / 2],
    ], dtype=float)
    return D


class SolidTet4:
    """Tetraedro lineare a 4 nodi (CST 3D)."""

    def __init__(self, nodes_xyz, E: float, nu: float, rho: float = 0.0):
        self.nodes = np.array(nodes_xyz, dtype=float)
        if self.nodes.shape != (4, 3):
            raise ValueError("SolidTet4 richiede 4 nodi.")
        self.E = float(E)
        self.nu = float(nu)
        self.rho = float(rho)
        self.D = _build_D_isotropic(self.E, self.nu)
        self._compute_geometry()

    def _compute_geometry(self) -> None:
        """Calcola B (costante) e volume V."""
        # x_ij = x_i - x_j (i=1..3, j=4 — convenzione classica)
        x = self.nodes  # (4,3)
        # Matrice [1, x, y, z]_4×4
        A = np.ones((4, 4))
        A[:, 1:] = x
        # 6V = det(A)
        det = np.linalg.det(A)
        self.V = abs(det) / 6.0
        if self.V < 1e-30:
            raise ValueError("SolidTet4 ha volume nullo o degenere.")

        # Coefficienti b_i, c_i, d_i = derivate parziali delle shape function
        # rispetto a x, y, z. Formula classica: N_i = (a_i + b_i·x + c_i·y + d_i·z)/(6V)
        # I coefficienti b_i, c_i, d_i sono i cofattori della matrice A.
        cof = np.zeros((4, 3))  # b_i, c_i, d_i per ogni nodo i
        sign_orient = np.sign(det) if det != 0 else 1.0
        for i in range(4):
            # Calcola dN_i/dx, dN_i/dy, dN_i/dz come cofattori di A_{i,1..3}
            # con segno alternato
            for k in range(3):
                # Cofattore di A[i, k+1]
                rows = [r for r in range(4) if r != i]
                cols = [c for c in [0, 1, 2, 3] if c != (k + 1)]
                M = A[np.ix_(rows, cols)]
                cof[i, k] = ((-1) ** (i + k + 1)) * np.linalg.det(M) * sign_orient
        # B matrix 6×12 (costante)
        B = np.zeros((6, 12))
        for i in range(4):
            bx, by, bz = cof[i] / (6.0 * self.V)
            B[0, 3 * i]     = bx
            B[1, 3 * i + 1] = by
            B[2, 3 * i + 2] = bz
            B[3, 3 * i]     = by; B[3, 3 * i + 1] = bx
            B[4, 3 * i + 1] = bz; B[4, 3 * i + 2] = by
            B[5, 3 * i]     = bz; B[5, 3 * i + 2] = bx
        self.B = B
        self._cof = cof

    def stiffness_global(self) -> np.ndarray:
        """K = ∫ Bᵀ D B dV = Bᵀ D B · V (B costante)."""
        return self.B.T @ self.D @ self.B * self.V

    def mass_global(self) -> np.ndarray:
        """Lumped diagonale: m_node = ρV/4 sui 3 dof traslazionali."""
        if self.rho == 0:
            return np.zeros((12, 12))
        m_node = self.rho * self.V / 4.0
        return m_node * np.eye(12)

    def stresses_center(self, u_global_12: np.ndarray) -> dict:
        """σ al baricentro (= ovunque, dato che B è costante)."""
        eps = self.B @ u_global_12
        sigma = self.D @ eps
        sx, sy, sz, txy, tyz, txz = sigma
        vm = np.sqrt(0.5 * (
            (sx - sy) ** 2 + (sy - sz) ** 2 + (sz - sx) ** 2
            + 6 * (txy ** 2 + tyz ** 2 + txz ** 2)
        ))
        return {
            "sigma_x": float(sx), "sigma_y": float(sy), "sigma_z": float(sz),
            "tau_xy": float(txy), "tau_yz": float(tyz), "tau_xz": float(txz),
            "von_mises": float(vm),
        }
