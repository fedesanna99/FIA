"""Triangolo CST (Constant Strain Triangle) — plane stress 2D.

3 nodi, 6 GdL (ux, uy per nodo). Spessore costante t.
Tensione costante all'interno dell'elemento.
"""
from __future__ import annotations
import numpy as np

DOFS_PER_NODE = 2
NODES_PER_ELEMENT = 3


class Tri3:
    """Triangolo 2D plane-stress."""

    def __init__(self, nodes_xy, E: float, nu: float, t: float, rho: float = 0.0):
        self.nodes = np.array(nodes_xy, dtype=float)
        if self.nodes.shape not in ((3, 2), (3, 3)):
            raise ValueError("Tri3 richiede 3 nodi (2D o 3D coplanari).")
        if self.nodes.shape == (3, 3):
            self.nodes3d = self.nodes.copy()
            self.nodes = self.nodes[:, :2]
        else:
            self.nodes3d = np.hstack([self.nodes, np.zeros((3, 1))])
        self.E = float(E)
        self.nu = float(nu)
        self.t = float(t)
        self.rho = float(rho)
        x1, y1 = self.nodes[0]
        x2, y2 = self.nodes[1]
        x3, y3 = self.nodes[2]
        self.area = 0.5 * abs((x2 - x1) * (y3 - y1) - (x3 - x1) * (y2 - y1))
        if self.area < 1e-12:
            raise ValueError("Tri3: area nulla (nodi collineari).")
        self.D = (E / (1 - nu * nu)) * np.array([
            [1, nu, 0],
            [nu, 1, 0],
            [0, 0, (1 - nu) / 2],
        ])

    def _B_matrix(self) -> np.ndarray:
        x1, y1 = self.nodes[0]
        x2, y2 = self.nodes[1]
        x3, y3 = self.nodes[2]
        b1 = y2 - y3; b2 = y3 - y1; b3 = y1 - y2
        c1 = x3 - x2; c2 = x1 - x3; c3 = x2 - x1
        coeff = 1.0 / (2.0 * self.area)
        B = coeff * np.array([
            [b1, 0, b2, 0, b3, 0],
            [0, c1, 0, c2, 0, c3],
            [c1, b1, c2, b2, c3, b3],
        ])
        return B

    def stiffness_global(self) -> np.ndarray:
        B = self._B_matrix()
        return B.T @ self.D @ B * self.area * self.t

    def mass_global(self) -> np.ndarray:
        if self.rho == 0:
            return np.zeros((6, 6))
        m_total = self.rho * self.area * self.t
        m_node = m_total / 3.0
        return m_node * np.eye(6)

    def stresses(self, u_global_6: np.ndarray) -> dict:
        B = self._B_matrix()
        eps = B @ u_global_6
        sigma = self.D @ eps
        sx, sy, txy = sigma
        vm = float(np.sqrt(sx * sx - sx * sy + sy * sy + 3 * txy * txy))
        radius = np.sqrt((0.5 * (sx - sy)) ** 2 + txy * txy)
        principal_max = 0.5 * (sx + sy) + radius
        principal_min = 0.5 * (sx + sy) - radius
        angle_rad = 0.5 * np.arctan2(2 * txy, sx - sy) if abs(sx - sy) + abs(txy) > 1e-12 else 0.0
        centroid = self.nodes3d.mean(axis=0)
        c, s = np.cos(angle_rad), np.sin(angle_rad)
        dir1 = np.array([c, s, 0.0])
        dir2 = np.array([-s, c, 0.0])
        return {
            "sigma_x": float(sx), "sigma_y": float(sy), "tau_xy": float(txy),
            "von_mises": vm,
            "sigma_max": float(principal_max), "sigma_min": float(principal_min),
            "principal_angle_deg": float(np.degrees(angle_rad)),
            "centroid": [float(centroid[0]), float(centroid[1]), float(centroid[2])],
            "principal_dir1": [float(v) for v in dir1],
            "principal_dir2": [float(v) for v in dir2],
        }
