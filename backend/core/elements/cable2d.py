"""
Elemento cavo 2D — solo trazione (tension-only).

Formulazione:
    - DOF identici a Truss2D (u, v per nodo, 4 DOF totali).
    - Rigidezza assiale lineare EA/L con correzione di Ernst per il sag:
          E_eq = E / (1 + (w·L)²·A·E / (12·T³))
      dove w è il peso lineare e T la tensione corrente. Per cavi corti o
      molto tesi, E_eq ≈ E.
    - Quando il cavo è in compressione (N < 0) la rigidezza è ridotta a un
      valore "fittizio" (K_slack = ε·EA/L con ε=1e-6) per stabilità numerica.
      La gestione attiva-disattiva è demandata al NonLinearStaticSolver
      tramite Newton-Raphson (vedi `tangent_stiffness_global`).
    - Rigidezza geometrica K_G = (N/L)·diag trasversale, classica per truss
      tesi (Bathe §6.6.2). Contribuisce al tangent quando il cavo è teso.

Riferimenti:
    - Ernst, H.J. (1965), "Der E-Modul von Seilen unter Berücksichtigung des
      Durchhanges", Der Bauingenieur 40(2), 52-55.
    - Irvine, H.M. (1981), "Cable Structures", MIT Press.
"""
from __future__ import annotations
import numpy as np

DOFS_PER_NODE = 2
NODES_PER_ELEMENT = 2

# Rigidezza residua (frazione di EA/L) quando il cavo è in compressione.
# Mantiene il sistema risolvibile senza vincolare il cavo. La N restante
# viene azzerata dal solver al successivo passo Newton-Raphson.
SLACK_STIFFNESS_RATIO = 1.0e-6


class Cable2D:
    """Cavo 2D nel piano XY.

    DOF per nodo: (u, v). Solo trazione (N>=0). In compressione la rigidezza
    è drasticamente ridotta — il solver non-lineare la riconosce come "slack".
    """

    def __init__(
        self,
        n1, n2,
        E: float, A: float, rho: float = 0.0,
        pretension: float = 0.0,
        w_self: float = 0.0,
    ):
        self.n1 = np.array(n1, dtype=float)[:2]
        self.n2 = np.array(n2, dtype=float)[:2]
        self.E = float(E)
        self.A = float(A)
        self.rho = float(rho)
        self.pretension = float(pretension)
        # peso lineare [N/m] (per Ernst). Se 0 → correzione inattiva.
        self.w_self = float(w_self)
        dx, dy = self.n2 - self.n1
        self.L = float(np.hypot(dx, dy))
        if self.L == 0:
            raise ValueError("Cable2D ha lunghezza nulla.")
        self.cos = dx / self.L
        self.sin = dy / self.L

    # ── modulo equivalente di Ernst ─────────────────────────────────────────
    def ernst_modulus(self, T: float) -> float:
        """Modulo di Young equivalente con correzione di Ernst.

        E_eq = E / (1 + (w·L_h)² · A · E / (12 · T³))

        Per T → 0 ritorna un valore molto piccolo (degenere). Per cavi
        senza peso (w_self=0) o T grande → E.
        """
        if self.w_self <= 0 or T <= 0:
            return self.E
        # L_h = lunghezza orizzontale ≈ L per cavi tesi
        L_h = self.L * abs(self.cos) if abs(self.cos) > 1e-6 else self.L
        denom = 1.0 + (self.w_self * L_h) ** 2 * self.A * self.E / (12.0 * T ** 3)
        return self.E / denom

    # ── rigidezza elastica (cavo lineare, ignora stato) ─────────────────────
    def stiffness_global(self) -> np.ndarray:
        """Rigidezza assiale (come Truss2D). Usata da assembler.
        Per analisi statica lineare il cavo si comporta come un'asta tesa.
        """
        c, s = self.cos, self.sin
        k0 = self.E * self.A / self.L
        cc, ss, cs = c * c, s * s, c * s
        return k0 * np.array([
            [ cc,  cs, -cc, -cs],
            [ cs,  ss, -cs, -ss],
            [-cc, -cs,  cc,  cs],
            [-cs, -ss,  cs,  ss],
        ], dtype=float)

    # ── tangent stiffness (per Newton-Raphson) ──────────────────────────────
    def tangent_stiffness_global(self, N: float) -> np.ndarray:
        """K_T = K_e(E_eq) + K_G(N). Se N <= 0 → solo SLACK_STIFFNESS_RATIO·K_e."""
        c, s = self.cos, self.sin
        # K elastica con E_eq se in trazione
        if N > 0:
            E_eq = self.ernst_modulus(N)
            k0 = E_eq * self.A / self.L
        else:
            k0 = SLACK_STIFFNESS_RATIO * self.E * self.A / self.L
        cc, ss, cs = c * c, s * s, c * s
        K_e = k0 * np.array([
            [ cc,  cs, -cc, -cs],
            [ cs,  ss, -cs, -ss],
            [-cc, -cs,  cc,  cs],
            [-cs, -ss,  cs,  ss],
        ], dtype=float)
        # K_G (geometric) solo se in trazione
        if N > 0:
            # K_G_truss2D = (N/L) · [[ss, -cs, -ss, cs],
            #                        [-cs, cc, cs, -cc],
            #                        [-ss, cs, ss, -cs],
            #                        [cs, -cc, -cs, cc]]
            kg = (N / self.L) * np.array([
                [ ss, -cs, -ss,  cs],
                [-cs,  cc,  cs, -cc],
                [-ss,  cs,  ss, -cs],
                [ cs, -cc, -cs,  cc],
            ], dtype=float)
            return K_e + kg
        return K_e

    def mass_global(self) -> np.ndarray:
        m_total = self.rho * self.A * self.L
        if m_total == 0:
            return np.zeros((4, 4))
        return (m_total / 2.0) * np.eye(4)

    def internal_force(self, u_global: np.ndarray) -> dict:
        """N = EA·Δ/L. Δ è l'allungamento assiale. Se Δ < 0 → cavo slack (N=0)."""
        c, s = self.cos, self.sin
        delta = (u_global[2] - u_global[0]) * c + (u_global[3] - u_global[1]) * s
        N_lin = self.E * self.A * delta / self.L + self.pretension
        if N_lin < 0:
            return {"N_i": 0.0, "N_j": 0.0}
        return {"N_i": -N_lin, "N_j": N_lin}

    def axial_force(self, u_global: np.ndarray) -> float:
        """Tensione assiale corrente, scalare positivo (0 se slack)."""
        f = self.internal_force(u_global)
        return f["N_j"]
