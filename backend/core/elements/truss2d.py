"""Elemento asta 2D — solo rigidezza assiale EA/L. 2 GdL per nodo (u, v)."""
import numpy as np

DOFS_PER_NODE = 2
NODES_PER_ELEMENT = 2


class Truss2D:
    def __init__(self, n1, n2, E: float, A: float, rho: float = 0.0):
        self.n1 = np.array(n1, dtype=float)[:2]
        self.n2 = np.array(n2, dtype=float)[:2]
        self.E = float(E)
        self.A = float(A)
        self.rho = float(rho)
        dx, dy = self.n2 - self.n1
        self.L = float(np.hypot(dx, dy))
        if self.L == 0:
            raise ValueError("Truss2D ha lunghezza nulla.")
        self.cos = dx / self.L
        self.sin = dy / self.L

    def stiffness_global(self) -> np.ndarray:
        c, s, k0 = self.cos, self.sin, self.E * self.A / self.L
        cc, ss, cs = c * c, s * s, c * s
        return k0 * np.array([
            [ cc,  cs, -cc, -cs],
            [ cs,  ss, -cs, -ss],
            [-cc, -cs,  cc,  cs],
            [-cs, -ss,  cs,  ss],
        ], dtype=float)

    def mass_global(self) -> np.ndarray:
        m_total = self.rho * self.A * self.L
        if m_total == 0:
            return np.zeros((4, 4))
        return (m_total / 2.0) * np.eye(4)

    def internal_force(self, u_global: np.ndarray) -> dict:
        c, s = self.cos, self.sin
        delta = (u_global[2] - u_global[0]) * c + (u_global[3] - u_global[1]) * s
        N = self.E * self.A * delta / self.L
        return {"N_i": -N, "N_j": N}
