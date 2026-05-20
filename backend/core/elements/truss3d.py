"""Elemento asta 3D — 3 GdL per nodo (u, v, w)."""
import numpy as np

DOFS_PER_NODE = 3
NODES_PER_ELEMENT = 2


class Truss3D:
    def __init__(self, n1, n2, E: float, A: float, rho: float = 0.0):
        self.n1 = np.array(n1, dtype=float)
        self.n2 = np.array(n2, dtype=float)
        self.E = float(E)
        self.A = float(A)
        self.rho = float(rho)
        d = self.n2 - self.n1
        self.L = float(np.linalg.norm(d))
        if self.L == 0:
            raise ValueError("Truss3D ha lunghezza nulla.")
        self.cos = d / self.L

    def stiffness_global(self) -> np.ndarray:
        c = self.cos.reshape(3, 1)
        k0 = self.E * self.A / self.L
        sub = c @ c.T
        K = np.zeros((6, 6), dtype=float)
        K[:3, :3] = sub
        K[3:, 3:] = sub
        K[:3, 3:] = -sub
        K[3:, :3] = -sub
        return k0 * K

    def mass_global(self) -> np.ndarray:
        m_total = self.rho * self.A * self.L
        if m_total == 0:
            return np.zeros((6, 6))
        return (m_total / 2.0) * np.eye(6)

    def internal_force(self, u_global: np.ndarray) -> dict:
        d = self.cos
        delta = (u_global[3:] - u_global[:3]) @ d
        N = self.E * self.A * delta / self.L
        return {"N_i": -N, "N_j": N}
