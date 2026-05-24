"""
Shell Q4 MITC4 — Mixed Interpolation of Tensorial Components (BL-5).

Cura il *shear-locking* del Q4 di Mindlin per piastre/shells sottili (t/L → 0).
Implementazione di Dvorkin & Bathe (1984): le deformazioni di taglio
trasversale γ_xz, γ_yz vengono valutate in 4 "tying points" sui mid-edge
dell'elemento di riferimento, poi interpolate al punto di integrazione di
Gauss invece di essere calcolate direttamente dal campo di spostamento.

Tying points (sull'elemento naturale ξ ∈ [−1,1], η ∈ [−1,1]):
    A = (0, −1) → γ_rz (lungo ξ)
    B = (+1, 0) → γ_sz (lungo η)
    C = (0, +1) → γ_rz
    D = (−1, 0) → γ_sz

Interpolazione assumed-strain:
    γ_rz(ξ,η) = 0.5·(1−η)·γ_rz^A + 0.5·(1+η)·γ_rz^C
    γ_sz(ξ,η) = 0.5·(1−ξ)·γ_sz^D + 0.5·(1+ξ)·γ_sz^B

Per shell complanari, il sistema (r,s) = (x,y) locale → γ_rz=γ_xz, γ_sz=γ_yz.

Riferimenti:
    - Dvorkin, E.N. & Bathe, K.J. (1984), "A continuum mechanics based four-node
      shell element for general non-linear analysis", Engineering Computations,
      1, 77-88.
    - Bathe, K.J. (1996) "Finite Element Procedures", §5.4.2.
"""
from __future__ import annotations
import numpy as np


DOFS_PER_NODE = 6
NODES_PER_ELEMENT = 4


class ShellQuad4MITC:
    """Q4 MITC4 — analogo a ShellQuad4 ma immune da shear-locking."""

    GAUSS_2 = np.array([
        [-1 / np.sqrt(3), -1 / np.sqrt(3)],
        [ 1 / np.sqrt(3), -1 / np.sqrt(3)],
        [ 1 / np.sqrt(3),  1 / np.sqrt(3)],
        [-1 / np.sqrt(3),  1 / np.sqrt(3)],
    ])

    # Tying points (ξ, η) per la valutazione dei shear strains
    _TYING_A = (0.0, -1.0)   # γ_xz sample @ ξ=0, η=-1
    _TYING_B = (1.0,  0.0)   # γ_yz sample @ ξ=+1, η=0
    _TYING_C = (0.0,  1.0)   # γ_xz sample @ ξ=0, η=+1
    _TYING_D = (-1.0, 0.0)   # γ_yz sample @ ξ=-1, η=0

    def __init__(self, nodes_xyz, E: float, nu: float, t: float, rho: float = 0.0):
        self.nodes = np.array(nodes_xyz, dtype=float)
        if self.nodes.shape != (4, 3):
            raise ValueError("ShellQuad4MITC richiede 4 nodi con 3 coordinate.")
        self.E = float(E)
        self.nu = float(nu)
        self.t = float(t)
        self.rho = float(rho)
        self._build_local_frame()

    # ─── geometria (uguale a ShellQuad4) ────────────────────────────────────
    def _build_local_frame(self):
        p0, p1, p2 = self.nodes[0], self.nodes[1], self.nodes[2]
        ex = p1 - p0
        ex /= np.linalg.norm(ex)
        normal = np.cross(p1 - p0, p2 - p0)
        ez = normal / np.linalg.norm(normal)
        ey = np.cross(ez, ex)
        self.R = np.vstack([ex, ey, ez])
        self.local_xy = np.array([self.R @ (p - p0) for p in self.nodes])[:, :2]

    def _shape_functions(self, xi: float, eta: float):
        N = 0.25 * np.array([
            (1 - xi) * (1 - eta),
            (1 + xi) * (1 - eta),
            (1 + xi) * (1 + eta),
            (1 - xi) * (1 + eta),
        ])
        dN_dxi = 0.25 * np.array([-(1 - eta), (1 - eta), (1 + eta), -(1 + eta)])
        dN_deta = 0.25 * np.array([-(1 - xi), -(1 + xi), (1 + xi), (1 - xi)])
        return N, dN_dxi, dN_deta

    # ─── membrane stiffness (identica a ShellQuad4 — locking-free) ─────────
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

    # ─── shear B-matrix MITC4 @ tying point ─────────────────────────────────
    def _Bs_at(self, xi: float, eta: float) -> np.ndarray:
        """Restituisce B_shear 2×12 al punto (ξ, η).

        DOF order: per ogni nodo (w, rx, ry), totale 12 DOF.
        γ_xz = ∂w/∂x + ry
        γ_yz = ∂w/∂y - rx
        """
        N, dN_dxi, dN_deta = self._shape_functions(xi, eta)
        xy = self.local_xy
        J = np.array([[dN_dxi @ xy[:, 0], dN_dxi @ xy[:, 1]],
                      [dN_deta @ xy[:, 0], dN_deta @ xy[:, 1]]])
        invJ = np.linalg.inv(J)
        Bs = np.zeros((2, 12))
        for i in range(4):
            dN = invJ @ np.array([dN_dxi[i], dN_deta[i]])
            Bs[0, 3 * i]     = dN[0]    # ∂w/∂x
            Bs[0, 3 * i + 2] = N[i]     # +ry
            Bs[1, 3 * i]     = dN[1]    # ∂w/∂y
            Bs[1, 3 * i + 1] = -N[i]    # -rx
        return Bs

    # ─── bending + shear stiffness con MITC4 ────────────────────────────────
    def _bending_stiffness(self) -> np.ndarray:
        E, nu, t = self.E, self.nu, self.t
        Dp = (E * t**3 / (12 * (1 - nu**2))) * np.array([
            [1, nu, 0],
            [nu, 1, 0],
            [0, 0, (1 - nu) / 2],
        ])
        # Modulo di taglio · spessore · κ_s
        Ds_scalar = (5.0 / 6.0) * E * t / (2 * (1 + nu))
        Ds = Ds_scalar * np.eye(2)

        K = np.zeros((12, 12))
        xy = self.local_xy

        # Pre-calcola B_s ai 4 tying points (MITC4)
        Bs_A = self._Bs_at(*self._TYING_A)   # γ_xz @ ξ=0, η=-1
        Bs_B = self._Bs_at(*self._TYING_B)   # γ_yz @ ξ=+1, η=0
        Bs_C = self._Bs_at(*self._TYING_C)   # γ_xz @ ξ=0, η=+1
        Bs_D = self._Bs_at(*self._TYING_D)   # γ_yz @ ξ=-1, η=0

        for xi, eta in self.GAUSS_2:
            N, dN_dxi, dN_deta = self._shape_functions(xi, eta)
            J = np.array([[dN_dxi @ xy[:, 0], dN_dxi @ xy[:, 1]],
                          [dN_deta @ xy[:, 0], dN_deta @ xy[:, 1]]])
            detJ = np.linalg.det(J)
            invJ = np.linalg.inv(J)

            # B_bending (3×12) — invariato
            Bb = np.zeros((3, 12))
            for i in range(4):
                dN = invJ @ np.array([dN_dxi[i], dN_deta[i]])
                Bb[0, 3 * i + 1] = dN[0]
                Bb[1, 3 * i + 2] = dN[1]
                Bb[2, 3 * i + 1] = dN[1]
                Bb[2, 3 * i + 2] = dN[0]

            # B_shear (2×12) MITC4 — interpolazione dai tying points
            # γ_xz row from Bs_A and Bs_C
            # γ_yz row from Bs_D and Bs_B
            Bs = np.zeros((2, 12))
            Bs[0, :] = 0.5 * (1 - eta) * Bs_A[0, :] + 0.5 * (1 + eta) * Bs_C[0, :]
            Bs[1, :] = 0.5 * (1 - xi)  * Bs_D[1, :] + 0.5 * (1 + xi)  * Bs_B[1, :]

            K += (Bb.T @ Dp @ Bb + Bs.T @ Ds @ Bs) * detJ
        return K

    def stiffness_local_24(self) -> np.ndarray:
        K = np.zeros((24, 24))
        Km = self._membrane_stiffness()
        Kb = self._bending_stiffness()
        # Map: 24 = 4 nodi × (u,v,w,rx,ry,rz)
        # Membrane (u,v) ai dof 0,1; bending (w,rx,ry) ai dof 2,3,4
        for i in range(4):
            for j in range(4):
                K[6*i:6*i+2, 6*j:6*j+2] = Km[2*i:2*i+2, 2*j:2*j+2]
                K[6*i+2:6*i+5, 6*j+2:6*j+5] = Kb[3*i:3*i+3, 3*j:3*j+3]
        # Drilling penalty (rz) per evitare singolarità
        kmax = max(Km.diagonal().max(), Kb.diagonal().max())
        for i in range(4):
            K[6 * i + 5, 6 * i + 5] = 1e-6 * kmax
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

    # v2.4.3c: matrice extrapolation Gauss 2×2 → 4 nodi (identica a Q4
    # standard, perché MITC modifica solo K_s shear, non K_b bending).
    _EXTRAP_GAUSS_TO_NODES = np.array([
        [1.0 + np.sqrt(3.0) / 2.0, -0.5, 1.0 - np.sqrt(3.0) / 2.0, -0.5],
        [-0.5, 1.0 + np.sqrt(3.0) / 2.0, -0.5, 1.0 - np.sqrt(3.0) / 2.0],
        [1.0 - np.sqrt(3.0) / 2.0, -0.5, 1.0 + np.sqrt(3.0) / 2.0, -0.5],
        [-0.5, 1.0 - np.sqrt(3.0) / 2.0, -0.5, 1.0 + np.sqrt(3.0) / 2.0],
    ])

    def stresses_at_nodes(self, u_global_24: np.ndarray) -> list[dict]:
        """v2.4.3c (NEW-1 fix): stress ai 4 nodi via extrapolation Gauss 2×2.

        Logica identica a ShellQuad4 (membrana + bending standard). Il
        contributo MITC al taglio shear K_s NON entra nel postprocess
        sigma membrana/bending → MITC e Q4 ritornano gli stessi valori
        nominali su problemi con bending puro. Differenza Q4/MITC sui
        risultati finali emerge dalla diversa rigidezza K (e quindi dai
        diversi displacements u).
        """
        T = self._transformation_matrix()
        u_local = T @ u_global_24
        u_membrane = np.array([u_local[6 * i + j] for i in range(4) for j in range(2)])
        u_bend = np.zeros(12)
        for i in range(4):
            u_bend[3 * i + 0] = u_local[6 * i + 2]
            u_bend[3 * i + 1] = u_local[6 * i + 3]
            u_bend[3 * i + 2] = u_local[6 * i + 4]

        E, nu, t = self.E, self.nu, self.t
        Dm = (E / (1 - nu * nu)) * np.array([
            [1, nu, 0],
            [nu, 1, 0],
            [0, 0, (1 - nu) / 2],
        ])
        Db = (E * t ** 3 / (12 * (1 - nu * nu))) * np.array([
            [1, nu, 0],
            [nu, 1, 0],
            [0, 0, (1 - nu) / 2],
        ])
        xy = self.local_xy

        sigma_m_gauss = np.zeros((4, 3))
        M_gauss = np.zeros((4, 3))
        for k, (xi, eta) in enumerate(self.GAUSS_2):
            _, dN_dxi, dN_deta = self._shape_functions(xi, eta)
            J = np.array([[dN_dxi @ xy[:, 0], dN_dxi @ xy[:, 1]],
                          [dN_deta @ xy[:, 0], dN_deta @ xy[:, 1]]])
            invJ = np.linalg.inv(J)
            Bm = np.zeros((3, 8))
            Bb = np.zeros((3, 12))
            for i in range(4):
                dN = invJ @ np.array([dN_dxi[i], dN_deta[i]])
                Bm[0, 2 * i] = dN[0]
                Bm[1, 2 * i + 1] = dN[1]
                Bm[2, 2 * i] = dN[1]
                Bm[2, 2 * i + 1] = dN[0]
                Bb[0, 3 * i + 1] = dN[0]
                Bb[1, 3 * i + 2] = dN[1]
                Bb[2, 3 * i + 1] = dN[1]
                Bb[2, 3 * i + 2] = dN[0]
            sigma_m_gauss[k] = Dm @ (Bm @ u_membrane)
            M_gauss[k] = Db @ (Bb @ u_bend)

        sigma_m_nodes = self._EXTRAP_GAUSS_TO_NODES @ sigma_m_gauss
        M_nodes = self._EXTRAP_GAUSS_TO_NODES @ M_gauss

        # Convenzione σ in fibra estrema z=±t/2 (v2.4.4 NEW-4-followup-segno fix):
        # Mindlin Bathe §5.4, z up → σ_top = σ_m − 6M/t² (segno -).
        # Vedi ShellQuad4.stresses_at_nodes per docstring completo.
        b_factor = 6.0 / (t * t) if t > 0 else 0.0
        result = []
        for i in range(4):
            sx, sy, txy = sigma_m_nodes[i]
            Mx, My, Mxy = M_nodes[i]
            result.append({
                "sigma_x": float(sx), "sigma_y": float(sy), "tau_xy": float(txy),
                "M_x": float(Mx), "M_y": float(My), "M_xy": float(Mxy),
                # σ_top = σ_m − 6M/t² (z=+t/2, convenzione Mindlin Bathe z-up)
                "sigma_x_top": float(sx) - b_factor * float(Mx),
                "sigma_y_top": float(sy) - b_factor * float(My),
                "tau_xy_top": float(txy) - b_factor * float(Mxy),
                # σ_bot = σ_m + 6M/t² (z=-t/2, antisimmetrico)
                "sigma_x_bot": float(sx) + b_factor * float(Mx),
                "sigma_y_bot": float(sy) + b_factor * float(My),
                "tau_xy_bot": float(txy) + b_factor * float(Mxy),
            })
        return result

    def stresses(self, u_global_24: np.ndarray) -> dict:
        """Stress di membrana + bending al baricentro.

        v2.4.3b (NEW-4 audit v2.3.7): aggiunge bending stress in fibra
        estrema z=±t/2 e momenti M_x/M_y/M_xy (back-compat: campi
        ``sigma_*`` esistenti restano membrana).
        """
        T = self._transformation_matrix()
        u_local = T @ u_global_24

        # ── 1. Membrana (back-compat) ─────────────────────────────────────────
        u_membrane = np.array([u_local[6 * i + j] for i in range(4) for j in range(2)])
        E, nu, t = self.E, self.nu, self.t
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
        Bm = np.zeros((3, 8))
        for i in range(4):
            dN = invJ @ np.array([dN_dxi[i], dN_deta[i]])
            Bm[0, 2 * i] = dN[0]
            Bm[1, 2 * i + 1] = dN[1]
            Bm[2, 2 * i] = dN[1]
            Bm[2, 2 * i + 1] = dN[0]
        eps = Bm @ u_membrane
        sigma = D @ eps
        sx, sy, txy = sigma

        # ── 2. Bending: curvature → momenti → stress fibra estrema ────────────
        # NOTA: in MITC il B_b di flessione PURA è ancora la formulazione
        # standard (i tying points modificano solo B_s = shear). Quindi B_b
        # è identica a Q4 standard. La differenza fra Q4 e MITC è solo nel
        # contributo shear (qui non incluso nel postprocess perché shear è
        # già integrato implicitamente nel solver via K_s in _bending_stiffness).
        u_bend = np.zeros(12)
        for i in range(4):
            u_bend[3 * i + 0] = u_local[6 * i + 2]
            u_bend[3 * i + 1] = u_local[6 * i + 3]
            u_bend[3 * i + 2] = u_local[6 * i + 4]
        Bb = np.zeros((3, 12))
        for i in range(4):
            dN = invJ @ np.array([dN_dxi[i], dN_deta[i]])
            Bb[0, 3 * i + 1] = dN[0]
            Bb[1, 3 * i + 2] = dN[1]
            Bb[2, 3 * i + 1] = dN[1]
            Bb[2, 3 * i + 2] = dN[0]
        kappa = Bb @ u_bend
        Db = (E * t ** 3 / (12 * (1 - nu * nu))) * np.array([
            [1, nu, 0],
            [nu, 1, 0],
            [0, 0, (1 - nu) / 2],
        ])
        M = Db @ kappa
        Mx, My, Mxy = float(M[0]), float(M[1]), float(M[2])

        # v2.4.4 NEW-4-followup-segno fix: convenzione Mindlin Bathe z-up
        # σ_top = σ_m − 6M/t² (vedi `stresses_at_nodes` per docstring).
        b_factor = 6.0 / (t * t) if t > 0 else 0.0
        sx_top = float(sx) - b_factor * Mx
        sy_top = float(sy) - b_factor * My
        txy_top = float(txy) - b_factor * Mxy
        sx_bot = float(sx) + b_factor * Mx
        sy_bot = float(sy) + b_factor * My
        txy_bot = float(txy) + b_factor * Mxy

        def _vm(sxx, syy, sxy):
            return float(np.sqrt(sxx * sxx - sxx * syy + syy * syy + 3 * sxy * sxy))
        vm = max(_vm(sx, sy, txy), _vm(sx_top, sy_top, txy_top), _vm(sx_bot, sy_bot, txy_bot))

        centroid = self.nodes.mean(axis=0)
        return {
            "sigma_x": float(sx), "sigma_y": float(sy), "tau_xy": float(txy),
            "von_mises": vm,
            "sigma_max": vm, "sigma_min": -vm,
            "principal_angle_deg": 0.0,
            "centroid": [float(centroid[0]), float(centroid[1]), float(centroid[2])],
            "principal_dir1": [1.0, 0.0, 0.0],
            "principal_dir2": [0.0, 1.0, 0.0],
            # === Additivo v2.4.3b NEW-4 ============================
            "sigma_x_top": sx_top, "sigma_y_top": sy_top, "tau_xy_top": txy_top,
            "sigma_x_bot": sx_bot, "sigma_y_bot": sy_bot, "tau_xy_bot": txy_bot,
            "M_x": Mx, "M_y": My, "M_xy": Mxy,
        }
