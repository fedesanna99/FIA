"""Elemento trave 3D spaziale con 6 GdL per nodo (u, v, w, θx, θy, θz)."""
import numpy as np

DOFS_PER_NODE = 6
NODES_PER_ELEMENT = 2


class Beam3D:
    """Trave 3D Euler-Bernoulli + torsione St.Venant.

    GdL per nodo: ux, uy, uz, rx (torsione), ry, rz.
    Stiffness 12x12 nel sistema locale, ruotata al sistema globale.
    """

    def __init__(self, n1, n2, E: float, G: float, A: float,
                 Iy: float, Iz: float, J: float, rho: float = 0.0,
                 ref_vec=None):
        self.n1 = np.array(n1, dtype=float)
        self.n2 = np.array(n2, dtype=float)
        self.E = float(E)
        self.G = float(G)
        self.A = float(A)
        self.Iy = float(Iy)
        self.Iz = float(Iz)
        self.J = float(J)
        self.rho = float(rho)
        dx = self.n2 - self.n1
        self.L = float(np.linalg.norm(dx))
        if self.L == 0:
            raise ValueError("Beam3D ha lunghezza nulla.")
        self.ex = dx / self.L
        if ref_vec is None:
            ref_vec = np.array([0.0, 0.0, 1.0]) if abs(self.ex[2]) < 0.99 else np.array([1.0, 0.0, 0.0])
        ref = np.array(ref_vec, dtype=float)
        ey = np.cross(ref, self.ex)
        if np.linalg.norm(ey) < 1e-9:
            ref = np.array([0.0, 1.0, 0.0])
            ey = np.cross(ref, self.ex)
        ey = ey / np.linalg.norm(ey)
        ez = np.cross(self.ex, ey)
        self.R = np.vstack([self.ex, ey, ez])

    def local_stiffness(self) -> np.ndarray:
        E, G, A, Iy, Iz, J, L = self.E, self.G, self.A, self.Iy, self.Iz, self.J, self.L
        L2, L3 = L * L, L * L * L
        k = np.zeros((12, 12), dtype=float)
        EAL = E * A / L
        GJL = G * J / L
        k[0, 0] = EAL; k[0, 6] = -EAL
        k[6, 0] = -EAL; k[6, 6] = EAL
        k[3, 3] = GJL; k[3, 9] = -GJL
        k[9, 3] = -GJL; k[9, 9] = GJL
        a = 12 * E * Iz / L3
        b = 6 * E * Iz / L2
        c = 4 * E * Iz / L
        d = 2 * E * Iz / L
        k[1, 1] = a; k[1, 5] = b; k[1, 7] = -a; k[1, 11] = b
        k[5, 1] = b; k[5, 5] = c; k[5, 7] = -b; k[5, 11] = d
        k[7, 1] = -a; k[7, 5] = -b; k[7, 7] = a; k[7, 11] = -b
        k[11, 1] = b; k[11, 5] = d; k[11, 7] = -b; k[11, 11] = c
        a2 = 12 * E * Iy / L3
        b2 = 6 * E * Iy / L2
        c2 = 4 * E * Iy / L
        d2 = 2 * E * Iy / L
        k[2, 2] = a2; k[2, 4] = -b2; k[2, 8] = -a2; k[2, 10] = -b2
        k[4, 2] = -b2; k[4, 4] = c2; k[4, 8] = b2; k[4, 10] = d2
        k[8, 2] = -a2; k[8, 4] = b2; k[8, 8] = a2; k[8, 10] = b2
        k[10, 2] = -b2; k[10, 4] = d2; k[10, 8] = b2; k[10, 10] = c2
        return k

    def local_mass(self) -> np.ndarray:
        rho, A, L = self.rho, self.A, self.L
        m_total = rho * A * L
        if m_total == 0:
            return np.zeros((12, 12))
        m = np.zeros((12, 12), dtype=float)
        for i in range(12):
            m[i, i] = m_total / 2.0
        return m

    def transformation_matrix(self) -> np.ndarray:
        T = np.zeros((12, 12), dtype=float)
        for i in range(4):
            T[3 * i:3 * i + 3, 3 * i:3 * i + 3] = self.R
        return T

    def stiffness_global(self, releases: list[int] | None = None) -> np.ndarray:
        T = self.transformation_matrix()
        k_local = self.local_stiffness()
        if releases:
            from .beam2d import _condensate_releases
            k_local = _condensate_releases(k_local, releases)
        return T.T @ k_local @ T

    def mass_global(self) -> np.ndarray:
        T = self.transformation_matrix()
        return T.T @ self.local_mass() @ T

    def internal_forces(self, u_global: np.ndarray) -> dict:
        T = self.transformation_matrix()
        u_local = T @ u_global
        f_local = self.local_stiffness() @ u_local
        return {
            "N_i": -f_local[0], "Vy_i": -f_local[1], "Vz_i": -f_local[2],
            "Mx_i": -f_local[3], "My_i": -f_local[4], "Mz_i": -f_local[5],
            "N_j":  f_local[6], "Vy_j":  f_local[7], "Vz_j":  f_local[8],
            "Mx_j":  f_local[9], "My_j":  f_local[10], "Mz_j":  f_local[11],
        }
