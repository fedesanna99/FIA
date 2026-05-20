"""
Shell Q4 laminato — composito multistrato (BL-4).

Estende ShellQuad4 con la teoria classica dei laminati (CLT):
  - N layer, ciascuno con (E, ν, thickness, theta).
  - Matrici A (membrana), B (coupling), D (bending) calcolate dai Q̄ ruotati
    di ciascuno strato.
  - Per laminati simmetrici B = 0 (assenza di coupling membrana-flessione).
  - Stress per layer al top / bottom: σ_k = Q̄_k · (ε_0 + z · κ).

Riferimenti:
  - Reddy, J.N. (2004), "Mechanics of Laminated Composite Plates and Shells",
    §4.2 (CLT) e §5.2 (FSDT con shear correction 5/6).
  - Jones, R.M. (1999), "Mechanics of Composite Materials", §4.2.

NB: questa è una formulazione di prima approssimazione (FSDT shear-correction
5/6); per laminati molto eterogenei la HSDT è più accurata ma più costosa.
"""
from __future__ import annotations
from dataclasses import dataclass
import math

import numpy as np


DOFS_PER_NODE = 6
NODES_PER_ELEMENT = 4


@dataclass
class CompositeLayer:
    """Singolo strato di un laminato.

    Attributi:
        E1       : modulo elastico longitudinale (direzione fibra) [Pa]
        E2       : modulo trasversale [Pa] (se None → isotropo = E1)
        nu12     : Poisson principale
        G12      : shear in-plane [Pa] (se None → derivato isotropo)
        thickness: spessore strato [m]
        theta    : angolo fibra rispetto all'asse x dell'elemento [rad]
        rho      : densità [kg/m³]
    """
    E1: float
    thickness: float
    theta: float = 0.0           # rad
    E2: float | None = None
    nu12: float = 0.3
    G12: float | None = None
    rho: float = 0.0


def _Q_local(layer: CompositeLayer) -> np.ndarray:
    """Matrice di rigidezza ridotta Q nelle coordinate del materiale (1,2)."""
    E1 = layer.E1
    E2 = layer.E2 if layer.E2 is not None else E1
    nu12 = layer.nu12
    G12 = layer.G12 if layer.G12 is not None else E1 / (2.0 * (1.0 + nu12))
    nu21 = nu12 * E2 / E1
    denom = 1.0 - nu12 * nu21
    if abs(denom) < 1e-30:
        denom = 1e-30
    Q = np.array([
        [E1 / denom,         nu21 * E1 / denom, 0.0],
        [nu12 * E2 / denom,  E2 / denom,        0.0],
        [0.0,                0.0,                G12],
    ], dtype=float)
    return Q


def _T_rotation(theta: float) -> np.ndarray:
    """Matrice di trasformazione 3×3 per stress/strain (Voigt)."""
    c, s = math.cos(theta), math.sin(theta)
    return np.array([
        [c*c,  s*s,    2*s*c],
        [s*s,  c*c,   -2*s*c],
        [-s*c, s*c,  c*c - s*s],
    ], dtype=float)


def _Q_bar(layer: CompositeLayer) -> np.ndarray:
    """Q̄ — Q ruotato dall'angolo θ (laminato → elemento)."""
    Q = _Q_local(layer)
    T = _T_rotation(layer.theta)
    # Q̄ = T⁻¹ · Q · R · T · R⁻¹, dove R = diag(1,1,2)
    R = np.diag([1.0, 1.0, 2.0])
    R_inv = np.diag([1.0, 1.0, 0.5])
    T_inv = np.linalg.inv(T)
    return T_inv @ Q @ R @ T @ R_inv


def _compute_ABD(layers: list[CompositeLayer]) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, list[float]]:
    """Calcola le matrici A (3×3), B (3×3), D (3×3) e Ds (2×2 shear).

    Restituisce anche la lista delle quote z_k (interfacce dei layer, partendo
    da z₀ = −h/2 fino a z_N = +h/2).
    """
    total_t = sum(L.thickness for L in layers)
    z = [-total_t / 2.0]
    for L in layers:
        z.append(z[-1] + L.thickness)

    A = np.zeros((3, 3))
    B = np.zeros((3, 3))
    D = np.zeros((3, 3))
    for k, L in enumerate(layers):
        Qb = _Q_bar(L)
        zk, zk1 = z[k], z[k + 1]
        A += Qb * (zk1 - zk)
        B += Qb * 0.5 * (zk1 ** 2 - zk ** 2)
        D += Qb * (1.0 / 3.0) * (zk1 ** 3 - zk ** 3)

    # Shear stiffness Ds — media ponderata per spessore del modulo G
    G_avg = 0.0
    for L in layers:
        E2 = L.E2 if L.E2 is not None else L.E1
        G12 = L.G12 if L.G12 is not None else L.E1 / (2.0 * (1.0 + L.nu12))
        G_avg += G12 * L.thickness
    G_avg = G_avg / total_t
    # Shear correction factor κ_s = 5/6 (FSDT)
    Ds = (5.0 / 6.0) * G_avg * total_t * np.eye(2)
    return A, B, D, Ds, z


class ShellQuad4Layered:
    """Shell Q4 laminato (composito multi-strato) — FSDT.

    Same nodal DOF layout as ShellQuad4 (6 per nodo: u,v,w,rx,ry,rz).
    """

    GAUSS_2 = np.array([
        [-1 / np.sqrt(3), -1 / np.sqrt(3)],
        [ 1 / np.sqrt(3), -1 / np.sqrt(3)],
        [ 1 / np.sqrt(3),  1 / np.sqrt(3)],
        [-1 / np.sqrt(3),  1 / np.sqrt(3)],
    ])

    def __init__(self, nodes_xyz, layers: list[CompositeLayer]):
        self.nodes = np.array(nodes_xyz, dtype=float)
        if self.nodes.shape != (4, 3):
            raise ValueError("ShellQuad4Layered richiede 4 nodi con 3 coordinate.")
        if not layers:
            raise ValueError("Almeno un layer è richiesto.")
        self.layers = list(layers)
        self.A, self.B, self.D, self.Ds, self.z_interfaces = _compute_ABD(self.layers)
        self.t = sum(L.thickness for L in self.layers)
        self.rho_avg = (sum(L.rho * L.thickness for L in self.layers) / self.t
                       if self.t > 0 else 0.0)
        self._build_local_frame()

    # ── geometria locale (identica a ShellQuad4) ──────────────────────────
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

    # ── rigidezza membrana (A) e flessione (D), couping B ──────────────────
    def _stiffness_local_membrane_bending(self) -> np.ndarray:
        """K_mb 20×20 ordinato come (u, v, w, rx, ry) per nodo = 20.

        Layout: u₁ v₁ w₁ rx₁ ry₁ | u₂ v₂ w₂ rx₂ ry₂ | ...
        """
        K = np.zeros((20, 20))
        xy = self.local_xy
        for xi, eta in self.GAUSS_2:
            N, dN_dxi, dN_deta = self._shape_functions(xi, eta)
            J = np.array([[dN_dxi @ xy[:, 0], dN_dxi @ xy[:, 1]],
                          [dN_deta @ xy[:, 0], dN_deta @ xy[:, 1]]])
            detJ = np.linalg.det(J)
            invJ = np.linalg.inv(J)

            # B_m (3×20) — membrane strain {ε_x, ε_y, γ_xy}
            #   dipende solo da u,v (dof 0,1 di ciascun nodo).
            # B_b (3×20) — curvature {κ_x, κ_y, κ_xy} da rx,ry (dof 3,4).
            #   con convenzione κ_x = ∂ry/∂x, κ_y = -∂rx/∂y, κ_xy = ∂ry/∂y - ∂rx/∂x
            # B_s (2×20) — shear {γ_xz, γ_yz} da w, rx, ry.
            Bm = np.zeros((3, 20))
            Bb = np.zeros((3, 20))
            Bs = np.zeros((2, 20))
            for i in range(4):
                dN = invJ @ np.array([dN_dxi[i], dN_deta[i]])
                # Membrane (u_i, v_i)
                Bm[0, 5 * i + 0] = dN[0]
                Bm[1, 5 * i + 1] = dN[1]
                Bm[2, 5 * i + 0] = dN[1]
                Bm[2, 5 * i + 1] = dN[0]
                # Bending da rx_i (dof 3), ry_i (dof 4)
                #   κ_x = ∂ry/∂x ; κ_y = -∂rx/∂y ; κ_xy = ∂ry/∂y - ∂rx/∂x
                Bb[0, 5 * i + 4] =  dN[0]
                Bb[1, 5 * i + 3] = -dN[1]
                Bb[2, 5 * i + 3] = -dN[0]
                Bb[2, 5 * i + 4] =  dN[1]
                # Shear γ_xz = ∂w/∂x + ry, γ_yz = ∂w/∂y - rx
                Bs[0, 5 * i + 2] = dN[0]    # ∂w/∂x
                Bs[0, 5 * i + 4] = N[i]     # +ry
                Bs[1, 5 * i + 2] = dN[1]    # ∂w/∂y
                Bs[1, 5 * i + 3] = -N[i]    # -rx

            # K = [Bm Bb]ᵀ · [[A, B], [B, D]] · [Bm Bb] + Bsᵀ Ds Bs
            # Espandiamo:
            K += (Bm.T @ self.A @ Bm
                  + Bm.T @ self.B @ Bb
                  + Bb.T @ self.B @ Bm
                  + Bb.T @ self.D @ Bb
                  + Bs.T @ self.Ds @ Bs) * detJ
        return K

    def stiffness_local_24(self) -> np.ndarray:
        """Riassembla K 24×24 (6 DOF/node) iniettando K_mb (5 DOF/node attivi)
        e una piccola rigidezza drilling sul rz per evitare singolarità."""
        K_mb = self._stiffness_local_membrane_bending()
        K = np.zeros((24, 24))
        # Map 5-DOF (u, v, w, rx, ry) → 24-DOF (u, v, w, rx, ry, rz)
        for i in range(4):
            for j in range(4):
                K[6*i:6*i+5, 6*j:6*j+5] = K_mb[5*i:5*i+5, 5*j:5*j+5]
        # Drilling penalty (rz)
        kmax = K.diagonal().max() if K.diagonal().max() > 0 else 1.0
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
        m_total = self.rho_avg * self.t * self._area()
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

    # ── stress per layer ────────────────────────────────────────────────────
    def stresses_per_layer(self, u_global_24: np.ndarray) -> list[dict]:
        """Calcola σ al baricentro per ogni layer (top e bottom).

        Restituisce lista di dict:
            {
              "layer_index": k,
              "z_top": z_{k+1},
              "z_bot": z_k,
              "theta_deg": θ in gradi,
              "sigma_top":  [σ_x, σ_y, τ_xy] in coordinate elemento,
              "sigma_bot":  [σ_x, σ_y, τ_xy] in coordinate elemento,
              "von_mises_top": vm_top,
              "von_mises_bot": vm_bot,
            }
        """
        T = self._transformation_matrix()
        u_local = T @ u_global_24
        # Estraiamo i dof 0..4 (u, v, w, rx, ry) per ogni nodo
        u_5n = np.array([u_local[6 * i + j] for i in range(4) for j in range(5)])

        # Strain di membrana e curvature al baricentro
        xy = self.local_xy
        N, dN_dxi, dN_deta = self._shape_functions(0.0, 0.0)
        J = np.array([[dN_dxi @ xy[:, 0], dN_dxi @ xy[:, 1]],
                      [dN_deta @ xy[:, 0], dN_deta @ xy[:, 1]]])
        invJ = np.linalg.inv(J)
        Bm = np.zeros((3, 20))
        Bb = np.zeros((3, 20))
        for i in range(4):
            dN = invJ @ np.array([dN_dxi[i], dN_deta[i]])
            Bm[0, 5 * i + 0] = dN[0]
            Bm[1, 5 * i + 1] = dN[1]
            Bm[2, 5 * i + 0] = dN[1]
            Bm[2, 5 * i + 1] = dN[0]
            Bb[0, 5 * i + 4] =  dN[0]
            Bb[1, 5 * i + 3] = -dN[1]
            Bb[2, 5 * i + 3] = -dN[0]
            Bb[2, 5 * i + 4] =  dN[1]
        eps_0 = Bm @ u_5n   # ε_x, ε_y, γ_xy
        kappa = Bb @ u_5n   # κ_x, κ_y, κ_xy

        out = []
        for k, L in enumerate(self.layers):
            Qb = _Q_bar(L)
            z_bot = self.z_interfaces[k]
            z_top = self.z_interfaces[k + 1]
            sigma_bot = Qb @ (eps_0 + z_bot * kappa)
            sigma_top = Qb @ (eps_0 + z_top * kappa)

            def _vm(s):
                sx, sy, txy = s
                return float(np.sqrt(sx * sx - sx * sy + sy * sy + 3 * txy * txy))

            out.append({
                "layer_index": k,
                "z_top": float(z_top),
                "z_bot": float(z_bot),
                "theta_deg": float(math.degrees(L.theta)),
                "sigma_top": [float(v) for v in sigma_top],
                "sigma_bot": [float(v) for v in sigma_bot],
                "von_mises_top": _vm(sigma_top),
                "von_mises_bot": _vm(sigma_bot),
            })
        return out

    def stresses(self, u_global_24: np.ndarray) -> dict:
        """Compatibilità con StaticSolver — restituisce stress aggregati (max)."""
        per_layer = self.stresses_per_layer(u_global_24)
        vm_max = 0.0
        sx_max = sy_max = txy_max = 0.0
        for L in per_layer:
            for s, vm in [(L["sigma_top"], L["von_mises_top"]),
                          (L["sigma_bot"], L["von_mises_bot"])]:
                if vm > vm_max:
                    vm_max = vm
                    sx_max, sy_max, txy_max = s
        return {
            "sigma_x": float(sx_max), "sigma_y": float(sy_max),
            "tau_xy": float(txy_max),
            "von_mises": vm_max,
            "sigma_max": vm_max, "sigma_min": -vm_max,
            "principal_angle_deg": 0.0,
            "centroid": [float(self.nodes.mean(axis=0)[i]) for i in range(3)],
            "principal_dir1": [1.0, 0.0, 0.0],
            "principal_dir2": [0.0, 1.0, 0.0],
            "layers": per_layer,
        }
