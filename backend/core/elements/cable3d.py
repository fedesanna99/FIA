"""
Elemento cavo 3D — tension-only.

Formulazione:
    - DOF identici a Truss3D (u, v, w per nodo, 6 DOF totali).
    - Rigidezza elastica EA/L con correzione di Ernst (vedi cable2d.py).
    - In compressione (N<0) rigidezza ridotta a SLACK_STIFFNESS_RATIO.
    - K_G geometrica per truss 3D (Bathe §6.6.2):
          K_G = (N/L) · [[I - d⊗d, -(I - d⊗d)], [-(I - d⊗d), I - d⊗d]]
      con d versore corda. Contribuisce al tangente solo in trazione.

Riferimenti:
    - Ernst (1965), Irvine (1981) — vedi cable2d.py.
"""
from __future__ import annotations
import numpy as np

from .cable2d import SLACK_STIFFNESS_RATIO

DOFS_PER_NODE = 3
NODES_PER_ELEMENT = 2


class Cable3D:
    """Cavo 3D — tension-only.

    DOF per nodo: (u, v, w). Pretensione opzionale.
    """

    def __init__(
        self,
        n1, n2,
        E: float, A: float, rho: float = 0.0,
        pretension: float = 0.0,
        w_self: float = 0.0,
    ):
        self.n1 = np.array(n1, dtype=float)
        self.n2 = np.array(n2, dtype=float)
        self.E = float(E)
        self.A = float(A)
        self.rho = float(rho)
        self.pretension = float(pretension)
        self.w_self = float(w_self)
        d = self.n2 - self.n1
        self.L = float(np.linalg.norm(d))
        if self.L == 0:
            raise ValueError("Cable3D ha lunghezza nulla.")
        self.cos = d / self.L  # versore (cx, cy, cz)

    def ernst_modulus(self, T: float) -> float:
        if self.w_self <= 0 or T <= 0:
            return self.E
        # proiezione orizzontale = sqrt(cx² + cy²) · L
        L_h = self.L * float(np.hypot(self.cos[0], self.cos[1])) or self.L
        denom = 1.0 + (self.w_self * L_h) ** 2 * self.A * self.E / (12.0 * T ** 3)
        return self.E / denom

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

    def tangent_stiffness_global(self, N: float) -> np.ndarray:
        c = self.cos.reshape(3, 1)
        sub = c @ c.T
        if N > 0:
            E_eq = self.ernst_modulus(N)
            k0 = E_eq * self.A / self.L
        else:
            k0 = SLACK_STIFFNESS_RATIO * self.E * self.A / self.L
        K_e = np.zeros((6, 6), dtype=float)
        K_e[:3, :3] = sub
        K_e[3:, 3:] = sub
        K_e[:3, 3:] = -sub
        K_e[3:, :3] = -sub
        K_e *= k0
        if N > 0:
            I3 = np.eye(3)
            block = (N / self.L) * (I3 - sub)
            K_G = np.zeros((6, 6), dtype=float)
            K_G[:3, :3] = block
            K_G[3:, 3:] = block
            K_G[:3, 3:] = -block
            K_G[3:, :3] = -block
            return K_e + K_G
        return K_e

    def mass_global(self) -> np.ndarray:
        m_total = self.rho * self.A * self.L
        if m_total == 0:
            return np.zeros((6, 6))
        return (m_total / 2.0) * np.eye(6)

    def internal_force(self, u_global: np.ndarray) -> dict:
        d = self.cos
        delta = (u_global[3:] - u_global[:3]) @ d
        N_lin = self.E * self.A * delta / self.L + self.pretension
        if N_lin < 0:
            return {"N_i": 0.0, "N_j": 0.0}
        return {"N_i": -N_lin, "N_j": N_lin}

    def axial_force(self, u_global: np.ndarray) -> float:
        f = self.internal_force(u_global)
        return f["N_j"]
