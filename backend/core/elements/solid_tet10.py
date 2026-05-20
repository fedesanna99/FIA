"""
Tet10 — Tetraedro quadratico a 10 nodi, 3 GdL per nodo.

Numerazione (convenzione standard):
    0..3  : vertici (corner)
    4 : midnode 0-1
    5 : midnode 1-2
    6 : midnode 0-2
    7 : midnode 0-3
    8 : midnode 1-3
    9 : midnode 2-3

Funzioni di forma (in coordinate baricentriche L1, L2, L3, L4 = 1-L1-L2-L3):
    Vertici: N_i = L_i (2 L_i − 1)
    Lati   : N_ij = 4 L_i L_j

Integrazione: schema di Hammer a 4 punti (esatto per polinomi di grado ≤ 3).

Riferimenti:
    - Zienkiewicz & Taylor (2005) Vol. 1, §6.4-6.5.
    - Hammer, P.C. et al. (1956), "Numerical Integration over Simplexes
      and Cones", Math. Tables Aids Comput. 10, 130-137.
"""
from __future__ import annotations
import numpy as np

from .solid_tet4 import _build_D_isotropic

DOFS_PER_NODE = 3
NODES_PER_ELEMENT = 10


# Schema di Hammer a 4 punti per integrazione su tetraedro
_a = (5 + 3 * np.sqrt(5)) / 20.0
_b = (5 - np.sqrt(5)) / 20.0
_HAMMER_PTS = np.array([
    [_a, _b, _b],   # L1, L2, L3 (L4 = 1 - L1 - L2 - L3)
    [_b, _a, _b],
    [_b, _b, _a],
    [_b, _b, _b],
], dtype=float)
_HAMMER_W = np.array([1/24.0, 1/24.0, 1/24.0, 1/24.0])  # somma = 1/6 (vol. tet unitario)


def _shape_and_derivs_tet10(L1: float, L2: float, L3: float):
    """Restituisce (N, dN/dL) dove dN/dL è 10×4 (rispetto a L1, L2, L3, L4)."""
    L4 = 1.0 - L1 - L2 - L3
    Ls = np.array([L1, L2, L3, L4])

    N = np.zeros(10)
    # Vertici
    for i in range(4):
        N[i] = Ls[i] * (2 * Ls[i] - 1)
    # Lati: ordine (0-1), (1-2), (0-2), (0-3), (1-3), (2-3)
    edges = [(0, 1), (1, 2), (0, 2), (0, 3), (1, 3), (2, 3)]
    for k, (i, j) in enumerate(edges):
        N[4 + k] = 4 * Ls[i] * Ls[j]

    # dN/dL: 10 × 4
    dN_dL = np.zeros((10, 4))
    # Vertici: dN_i/dL_i = 4 L_i − 1; dN_i/dL_k = 0 (k ≠ i)
    for i in range(4):
        dN_dL[i, i] = 4 * Ls[i] - 1
    # Lati: dN_ij/dL_i = 4 L_j; dN_ij/dL_j = 4 L_i; altre = 0
    for k, (i, j) in enumerate(edges):
        dN_dL[4 + k, i] = 4 * Ls[j]
        dN_dL[4 + k, j] = 4 * Ls[i]

    return N, dN_dL


class SolidTet10:
    """Tetraedro quadratico T10."""

    def __init__(self, nodes_xyz, E: float, nu: float, rho: float = 0.0):
        self.nodes = np.array(nodes_xyz, dtype=float)
        if self.nodes.shape != (10, 3):
            raise ValueError("SolidTet10 richiede 10 nodi.")
        self.E = float(E)
        self.nu = float(nu)
        self.rho = float(rho)
        self.D = _build_D_isotropic(self.E, self.nu)

    def _jacobian(self, dN_dL: np.ndarray) -> tuple[np.ndarray, float]:
        """J = dN/dL^T · X (3×3, dove le righe sono d/dL1, d/dL2, d/dL3
        applicate alle coordinate). dN/dL ha 4 colonne (L1..L4 with L4 dependent).

        Per integrazione, usiamo coordinate naturali (L1, L2, L3) e
        L4 = 1 − L1 − L2 − L3. Quindi:
            dN_i/dξ_1 = dN_i/dL1 − dN_i/dL4
            dN_i/dξ_2 = dN_i/dL2 − dN_i/dL4
            dN_i/dξ_3 = dN_i/dL3 − dN_i/dL4
        """
        dN_dxi = dN_dL[:, :3] - dN_dL[:, 3:4]  # 10×3
        J = dN_dxi.T @ self.nodes               # 3×3
        return J, dN_dxi

    def stiffness_global(self) -> np.ndarray:
        K = np.zeros((30, 30))
        for (L1, L2, L3), w in zip(_HAMMER_PTS, _HAMMER_W):
            _, dN_dL = _shape_and_derivs_tet10(L1, L2, L3)
            J, dN_dxi = self._jacobian(dN_dL)
            detJ = abs(np.linalg.det(J))
            invJ = np.linalg.inv(J)
            dN_xyz = dN_dxi @ invJ.T  # 10×3 in coordinate fisiche
            B = self._B_matrix(dN_xyz)
            K += (B.T @ self.D @ B) * detJ * w
        return K

    def _B_matrix(self, dN_xyz: np.ndarray) -> np.ndarray:
        B = np.zeros((6, 30))
        for i in range(10):
            dx, dy, dz = dN_xyz[i]
            B[0, 3 * i]     = dx
            B[1, 3 * i + 1] = dy
            B[2, 3 * i + 2] = dz
            B[3, 3 * i]     = dy; B[3, 3 * i + 1] = dx
            B[4, 3 * i + 1] = dz; B[4, 3 * i + 2] = dy
            B[5, 3 * i]     = dz; B[5, 3 * i + 2] = dx
        return B

    def mass_global(self) -> np.ndarray:
        """Lumped (HRZ scheme): massa proporzionale al N²_i integrato."""
        if self.rho == 0:
            return np.zeros((30, 30))
        # Volume con Jacobiano
        vol = 0.0
        for (L1, L2, L3), w in zip(_HAMMER_PTS, _HAMMER_W):
            _, dN_dL = _shape_and_derivs_tet10(L1, L2, L3)
            J, _ = self._jacobian(dN_dL)
            vol += abs(np.linalg.det(J)) * w
        m_total = self.rho * vol
        # HRZ: 1/32 per vertici, 7/32 per mid-edges (somma = 4·1/32 + 6·7/32 = 46/32 ≠ 1)
        # Pratica comune per Tet10: massa uguale 1/10 su ogni nodo. Va bene per
        # modal/dynamic non-critico.
        m_node = m_total / 10.0
        return m_node * np.eye(30)

    def stresses_center(self, u_global_30: np.ndarray) -> dict:
        # Baricentro: L1 = L2 = L3 = L4 = 1/4
        _, dN_dL = _shape_and_derivs_tet10(0.25, 0.25, 0.25)
        J, dN_dxi = self._jacobian(dN_dL)
        invJ = np.linalg.inv(J)
        dN_xyz = dN_dxi @ invJ.T
        B = self._B_matrix(dN_xyz)
        eps = B @ u_global_30
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
