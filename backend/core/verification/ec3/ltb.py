"""
Instabilità flesso-torsionale (LTB) secondo EN 1993-1-1 §6.3.2.

Procedura (metodo generale §6.3.2.2):
    1. Calcolo M_cr (momento critico elastico LTB)
    2. λ̄_LT = √(W_y · f_y / M_cr)
    3. χ_LT da curve LTB (curva 'a','b','c','d' — Tab. 6.4 e 6.5)
    4. M_b,Rd = χ_LT · W_y · f_y / γ_M1

Formula M_cr per trave semplicemente appoggiata sotto momento uniforme
(caso fondamentale, C1=1.0):

    M_cr = (π / L) · √( E·I_z · G·I_t  +  (π·E/L)² · I_z · I_w )

dove:
    L   = lunghezza non controventata laterale
    I_z = momento d'inerzia attorno all'asse debole [m⁴]
    I_w = costante di warping (Iw) [m⁶]
    I_t = costante torsionale (J di Saint-Venant) [m⁴]
    G   = E / (2(1+ν))

Coefficiente C1 (effetto della distribuzione del momento):
    momento uniforme:           C1 = 1.000
    momento triangolare:        C1 = 1.879  (max al centro, 0 agli estremi)
    UDL:                        C1 ≈ 1.132
    carico concentrato al ctr:  C1 ≈ 1.365

Riferimento: EN 1993-1-1 §6.3.2.2 + ECCS Pub. 119 (Tab. C.1).

Curve LTB (Tab. 6.5 — sezioni a doppio T laminate):
    h/b ≤ 2 :  curva 'a' (α_LT = 0.21)  — metodo generale 'b' (0.34) per LTB
    h/b > 2 :  curva 'b' (α_LT = 0.34)  — metodo generale 'c' (0.49) per LTB

Qui usiamo il Metodo generale (§6.3.2.2 + Tab. 6.4):
    h/b ≤ 2 :  α_LT = 0.34   (curva 'b')
    h/b > 2 :  α_LT = 0.49   (curva 'c')

(EN 1993-1-1 §6.3.2.3 prevede un metodo alternativo "ridotto" per profili
laminati, con λ̄_LT,0 = 0.4 e β = 0.75 — non implementato qui.)
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import Literal
import math


GAMMA_M1_NTC = 1.05
GAMMA_M1_EC = 1.00


# Imperfection factor α_LT — metodo generale §6.3.2.2 Tab. 6.4
_ALPHA_LT = {
    "a": 0.21,
    "b": 0.34,
    "c": 0.49,
    "d": 0.76,
}


@dataclass(frozen=True)
class LTBResult:
    chi_LT: float
    M_b_Rd: float          # [N·m]
    lambda_LT: float       # snellezza adimensionale LTB
    Phi_LT: float
    M_cr: float            # [N·m]
    curve_LT: str
    alpha_LT: float
    notes: str = ""


def M_cr_simply_supported_uniform(
    E: float, G: float, Iz: float, It: float, Iw: float, L: float,
    C1: float = 1.0,
) -> float:
    """Momento critico elastico LTB per trave appoggiata sotto momento uniforme.

    Formula classica (vd. ECCS 119 eq. 5.5 con k=kw=1):

        M_cr = C1 · (π/L) · √( E·Iz · G·It  +  (π/L)² · E²·Iz·Iw )

    """
    if min(E, G, Iz, It, L) <= 0:
        raise ValueError("E, G, Iz, It, L devono essere positivi")
    if Iw < 0:
        raise ValueError("Iw non può essere negativo")
    term1 = G * It
    term2 = (math.pi / L) ** 2 * E * Iw
    return C1 * (math.pi / L) * math.sqrt(E * Iz * (term1 + term2))


def _curve_LT_general(h: float, b: float) -> str:
    """Selezione curva LTB nel metodo generale (Tab. 6.4)."""
    if min(h, b) <= 0:
        raise ValueError("h, b positivi richiesti")
    return "b" if h / b <= 2.0 else "c"


def chi_LT(
    lambda_LT: float,
    curve_LT: str = "b",
) -> tuple[float, float]:
    """χ_LT secondo EN 1993-1-1 (6.56) — metodo generale.

    Returns:
        (chi_LT, Phi_LT)
    """
    if lambda_LT < 0:
        raise ValueError("λ̄_LT deve essere non negativo")
    if curve_LT not in _ALPHA_LT:
        raise ValueError(f"Curva LT '{curve_LT}' sconosciuta")
    if lambda_LT <= 0.2:
        return 1.0, 0.5
    alpha = _ALPHA_LT[curve_LT]
    Phi_LT = 0.5 * (1 + alpha * (lambda_LT - 0.2) + lambda_LT ** 2)
    chi = 1.0 / (Phi_LT + math.sqrt(Phi_LT ** 2 - lambda_LT ** 2))
    return min(chi, 1.0), Phi_LT


def M_b_Rd(
    Wy: float, fy: float,
    M_cr: float,
    h: float, b: float,
    gamma_M1: float = GAMMA_M1_NTC,
) -> LTBResult:
    """M_b,Rd resistenza all'instabilità flesso-torsionale (§6.3.2.1).

    Args:
        Wy        : modulo della sezione attorno all'asse forte [m³]
                    (W_pl per Classi 1/2, W_el per Classe 3, W_eff per Classe 4)
        fy        : f_y [Pa]
        M_cr      : momento critico elastico LTB [N·m]
        h, b      : altezza e larghezza profilo (selezione curva)
        gamma_M1  : coefficiente parziale
    """
    if Wy <= 0 or fy <= 0 or M_cr <= 0:
        raise ValueError("Wy, fy, M_cr devono essere positivi")
    curve = _curve_LT_general(h=h, b=b)
    alpha = _ALPHA_LT[curve]
    lambda_LT = math.sqrt(Wy * fy / M_cr)
    chi, Phi_LT = chi_LT(lambda_LT, curve_LT=curve)
    M_b = chi * Wy * fy / gamma_M1
    return LTBResult(
        chi_LT=chi, M_b_Rd=M_b, lambda_LT=lambda_LT, Phi_LT=Phi_LT,
        M_cr=M_cr, curve_LT=curve, alpha_LT=alpha,
        notes=f"M_cr={M_cr/1e3:.0f}kN·m λ̄_LT={lambda_LT:.3f}",
    )
