"""Elemento solido esaedrico H8 — 8 nodi, 3 GdL per nodo, Gauss 2x2x2."""
import numpy as np

DOFS_PER_NODE = 3
NODES_PER_ELEMENT = 8


class SolidHex8:
    G1 = 1.0 / np.sqrt(3.0)
    GAUSS = np.array([
        [-G1, -G1, -G1], [G1, -G1, -G1], [G1, G1, -G1], [-G1, G1, -G1],
        [-G1, -G1,  G1], [G1, -G1,  G1], [G1, G1,  G1], [-G1, G1,  G1],
    ])

    def __init__(self, nodes_xyz, E: float, nu: float, rho: float = 0.0):
        self.nodes = np.array(nodes_xyz, dtype=float)
        if self.nodes.shape != (8, 3):
            raise ValueError("SolidHex8 richiede 8 nodi.")
        self.E = float(E)
        self.nu = float(nu)
        self.rho = float(rho)
        self.D = self._build_D()

    def _build_D(self) -> np.ndarray:
        E, nu = self.E, self.nu
        c = E / ((1 + nu) * (1 - 2 * nu))
        D = c * np.array([
            [1 - nu, nu, nu, 0, 0, 0],
            [nu, 1 - nu, nu, 0, 0, 0],
            [nu, nu, 1 - nu, 0, 0, 0],
            [0, 0, 0, (1 - 2 * nu) / 2, 0, 0],
            [0, 0, 0, 0, (1 - 2 * nu) / 2, 0],
            [0, 0, 0, 0, 0, (1 - 2 * nu) / 2],
        ])
        return D

    def _shape_derivs(self, xi, eta, zeta):
        signs = np.array([
            [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
            [-1, -1,  1], [1, -1,  1], [1, 1,  1], [-1, 1,  1],
        ])
        dN = np.zeros((8, 3))
        for i, (sx, sy, sz) in enumerate(signs):
            dN[i, 0] = 0.125 * sx * (1 + sy * eta) * (1 + sz * zeta)
            dN[i, 1] = 0.125 * sy * (1 + sx * xi) * (1 + sz * zeta)
            dN[i, 2] = 0.125 * sz * (1 + sx * xi) * (1 + sy * eta)
        return dN

    def _B_matrix(self, dN_xyz: np.ndarray) -> np.ndarray:
        B = np.zeros((6, 24))
        for i in range(8):
            dx, dy, dz = dN_xyz[i]
            B[0, 3 * i] = dx
            B[1, 3 * i + 1] = dy
            B[2, 3 * i + 2] = dz
            B[3, 3 * i] = dy; B[3, 3 * i + 1] = dx
            B[4, 3 * i + 1] = dz; B[4, 3 * i + 2] = dy
            B[5, 3 * i] = dz; B[5, 3 * i + 2] = dx
        return B

    def stiffness_global(self) -> np.ndarray:
        K = np.zeros((24, 24))
        for xi, eta, zeta in self.GAUSS:
            dN = self._shape_derivs(xi, eta, zeta)
            J = dN.T @ self.nodes
            detJ = np.linalg.det(J)
            invJ = np.linalg.inv(J)
            dN_xyz = dN @ invJ.T
            B = self._B_matrix(dN_xyz)
            K += B.T @ self.D @ B * detJ
        return K

    def mass_global(self) -> np.ndarray:
        if self.rho == 0:
            return np.zeros((24, 24))
        vol = self._volume()
        m_total = self.rho * vol
        m_node = m_total / 8.0
        return m_node * np.eye(24)

    def _volume(self) -> float:
        V = 0.0
        for xi, eta, zeta in self.GAUSS:
            dN = self._shape_derivs(xi, eta, zeta)
            V += abs(np.linalg.det(dN.T @ self.nodes))
        return V

    def stresses_center(self, u_global_24: np.ndarray) -> dict:
        dN = self._shape_derivs(0.0, 0.0, 0.0)
        J = dN.T @ self.nodes
        invJ = np.linalg.inv(J)
        dN_xyz = dN @ invJ.T
        B = self._B_matrix(dN_xyz)
        eps = B @ u_global_24
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
