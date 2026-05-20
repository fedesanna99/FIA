"""Elemento shell quadrilatero Q4 — Mindlin-Reissner.

Formulazione semplificata: membrane (plane stress) + bending DKQ.
6 GdL per nodo (u, v, w, rx, ry, rz) — totale 24 GdL.
Integrazione di Gauss 2x2.
"""
import numpy as np

DOFS_PER_NODE = 6
NODES_PER_ELEMENT = 4


class ShellQuad4:
    """Shell Q4 piano (per shell complanari).

    Le coordinate dei 4 nodi vengono proiettate sul piano dell'elemento.
    Combina rigidezza membrana (8 GdL: u,v per nodo) + flessione (12 GdL: w, rx, ry per nodo).
    """

    GAUSS_2 = np.array([[-1 / np.sqrt(3), -1 / np.sqrt(3)],
                        [ 1 / np.sqrt(3), -1 / np.sqrt(3)],
                        [ 1 / np.sqrt(3),  1 / np.sqrt(3)],
                        [-1 / np.sqrt(3),  1 / np.sqrt(3)]])

    def __init__(self, nodes_xyz, E: float, nu: float, t: float, rho: float = 0.0):
        self.nodes = np.array(nodes_xyz, dtype=float)
        if self.nodes.shape != (4, 3):
            raise ValueError("ShellQuad4 richiede 4 nodi con 3 coordinate.")
        self.E = float(E)
        self.nu = float(nu)
        self.t = float(t)
        self.rho = float(rho)
        self._build_local_frame()

    def _build_local_frame(self):
        p0, p1, p2 = self.nodes[0], self.nodes[1], self.nodes[2]
        ex = p1 - p0
        ex /= np.linalg.norm(ex)
        normal = np.cross(p1 - p0, p2 - p0)
        ez = normal / np.linalg.norm(normal)
        ey = np.cross(ez, ex)
        self.R = np.vstack([ex, ey, ez])
        self.local_xy = np.array([self.R @ (p - p0) for p in self.nodes])[:, :2]

    def _shape_functions(self, xi, eta):
        N = 0.25 * np.array([
            (1 - xi) * (1 - eta),
            (1 + xi) * (1 - eta),
            (1 + xi) * (1 + eta),
            (1 - xi) * (1 + eta),
        ])
        dN_dxi = 0.25 * np.array([-(1 - eta), (1 - eta), (1 + eta), -(1 + eta)])
        dN_deta = 0.25 * np.array([-(1 - xi), -(1 + xi), (1 + xi), (1 - xi)])
        return N, dN_dxi, dN_deta

    def _membrane_stiffness(self) -> np.ndarray:
        E, nu, t = self.E, self.nu, self.t
        D = (E / (1 - nu * nu)) * np.array([
            [1, nu, 0],
            [nu, 1, 0],
            [0, 0, (1 - nu) / 2],
        ])
        K = np.zeros((8, 8))
        xy = self.local_xy
        for xi, eta in self.GAUSS_2:
            _, dN_dxi, dN_deta = self._shape_functions(xi, eta)
            J = np.array([[dN_dxi @ xy[:, 0], dN_dxi @ xy[:, 1]],
                          [dN_deta @ xy[:, 0], dN_deta @ xy[:, 1]]])
            detJ = np.linalg.det(J)
            invJ = np.linalg.inv(J)
            B = np.zeros((3, 8))
            for i in range(4):
                dN = invJ @ np.array([dN_dxi[i], dN_deta[i]])
                B[0, 2 * i] = dN[0]
                B[1, 2 * i + 1] = dN[1]
                B[2, 2 * i] = dN[1]
                B[2, 2 * i + 1] = dN[0]
            K += B.T @ D @ B * detJ * t
        return K

    def _bending_stiffness(self) -> np.ndarray:
        E, nu, t = self.E, self.nu, self.t
        Dp = (E * t**3 / (12 * (1 - nu**2))) * np.array([
            [1, nu, 0],
            [nu, 1, 0],
            [0, 0, (1 - nu) / 2],
        ])
        Ds = (5.0 / 6.0) * E * t / (2 * (1 + nu)) * np.eye(2)
        K = np.zeros((12, 12))
        xy = self.local_xy
        for xi, eta in self.GAUSS_2:
            N, dN_dxi, dN_deta = self._shape_functions(xi, eta)
            J = np.array([[dN_dxi @ xy[:, 0], dN_dxi @ xy[:, 1]],
                          [dN_deta @ xy[:, 0], dN_deta @ xy[:, 1]]])
            detJ = np.linalg.det(J)
            invJ = np.linalg.inv(J)
            Bb = np.zeros((3, 12))
            Bs = np.zeros((2, 12))
            for i in range(4):
                dN = invJ @ np.array([dN_dxi[i], dN_deta[i]])
                Bb[0, 3 * i + 1] = dN[0]
                Bb[1, 3 * i + 2] = dN[1]
                Bb[2, 3 * i + 1] = dN[1]
                Bb[2, 3 * i + 2] = dN[0]
                Bs[0, 3 * i] = dN[0]
                Bs[0, 3 * i + 1] = -N[i]
                Bs[1, 3 * i] = dN[1]
                Bs[1, 3 * i + 2] = -N[i]
            K += (Bb.T @ Dp @ Bb + Bs.T @ Ds @ Bs) * detJ
        return K

    def stiffness_local_24(self) -> np.ndarray:
        K = np.zeros((24, 24))
        Km = self._membrane_stiffness()
        Kb = self._bending_stiffness()
        for i in range(4):
            for j in range(4):
                K[6 * i:6 * i + 2, 6 * j:6 * j + 2] = Km[2 * i:2 * i + 2, 2 * j:2 * j + 2]
                K[6 * i + 2:6 * i + 5, 6 * j + 2:6 * j + 5] = Kb[3 * i:3 * i + 3, 3 * j:3 * j + 3]
        for i in range(4):
            K[6 * i + 5, 6 * i + 5] = 1e-6 * (Km.diagonal().max() + Kb.diagonal().max())
        return K

    def _transformation_matrix(self) -> np.ndarray:
        T = np.zeros((24, 24))
        for i in range(8):
            T[3 * i:3 * i + 3, 3 * i:3 * i + 3] = self.R
        return T

    def stiffness_global(self) -> np.ndarray:
        T = self._transformation_matrix()
        return T.T @ self.stiffness_local_24() @ T

    def mass_global(self) -> np.ndarray:
        m_total = self.rho * self.t * self._area()
        if m_total == 0:
            return np.zeros((24, 24))
        M = np.zeros((24, 24))
        m_node = m_total / 4.0
        for i in range(4):
            for j in range(3):
                M[6 * i + j, 6 * i + j] = m_node
        return M

    def _area(self) -> float:
        xy = self.local_xy
        x = xy[:, 0]; y = xy[:, 1]
        return 0.5 * abs(
            x[0] * (y[1] - y[3]) + x[1] * (y[2] - y[0]) +
            x[2] * (y[3] - y[1]) + x[3] * (y[0] - y[2])
        )

    def stresses(self, u_global_24: np.ndarray) -> dict:
        T = self._transformation_matrix()
        u_local = T @ u_global_24
        u_membrane = np.array([u_local[6 * i + j] for i in range(4) for j in range(2)])
        E, nu = self.E, self.nu
        D = (E / (1 - nu * nu)) * np.array([
            [1, nu, 0],
            [nu, 1, 0],
            [0, 0, (1 - nu) / 2],
        ])
        xy = self.local_xy
        _, dN_dxi, dN_deta = self._shape_functions(0.0, 0.0)
        J = np.array([[dN_dxi @ xy[:, 0], dN_dxi @ xy[:, 1]],
                      [dN_deta @ xy[:, 0], dN_deta @ xy[:, 1]]])
        invJ = np.linalg.inv(J)
        B = np.zeros((3, 8))
        for i in range(4):
            dN = invJ @ np.array([dN_dxi[i], dN_deta[i]])
            B[0, 2 * i] = dN[0]
            B[1, 2 * i + 1] = dN[1]
            B[2, 2 * i] = dN[1]
            B[2, 2 * i + 1] = dN[0]
        eps = B @ u_membrane
        sigma = D @ eps
        sx, sy, txy = sigma
        vm = float(np.sqrt(sx * sx - sx * sy + sy * sy + 3 * txy * txy))
        radius = np.sqrt((0.5 * (sx - sy)) ** 2 + txy * txy)
        principal_max = 0.5 * (sx + sy) + radius
        principal_min = 0.5 * (sx + sy) - radius
        angle_local = (0.5 * np.arctan2(2 * txy, sx - sy)
                       if abs(sx - sy) + abs(txy) > 1e-12 else 0.0)
        c_a, s_a = np.cos(angle_local), np.sin(angle_local)
        dir1_local = np.array([c_a, s_a, 0.0])
        dir2_local = np.array([-s_a, c_a, 0.0])
        dir1_global = self.R.T @ dir1_local
        dir2_global = self.R.T @ dir2_local
        centroid = self.nodes.mean(axis=0)
        return {
            "sigma_x": float(sx), "sigma_y": float(sy), "tau_xy": float(txy),
            "von_mises": vm,
            "sigma_max": float(principal_max), "sigma_min": float(principal_min),
            "principal_angle_deg": float(np.degrees(angle_local)),
            "centroid": [float(centroid[0]), float(centroid[1]), float(centroid[2])],
            "principal_dir1": [float(v) for v in dir1_global],
            "principal_dir2": [float(v) for v in dir2_global],
        }
