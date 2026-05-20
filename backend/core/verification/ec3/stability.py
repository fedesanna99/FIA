"""
Instabilità flessionale di colonne secondo EN 1993-1-1 §6.3.1.

Procedura (Tab. 6.1, 6.2):
    1. Calcolo N_cr = π² E I / L_cr²
    2. λ_bar = √(A · f_y / N_cr)         (per Classi 1/2/3)
       λ_bar = √(A_eff · f_y / N_cr)     (per Classe 4)
    3. Selezione curva di buckling a/b/c/d → α (imperfection factor)
    4. Φ = 0.5 [1 + α(λ_bar - 0.2) + λ_bar²]
    5. χ = 1 / (Φ + √(Φ² - λ_bar²))     ma χ ≤ 1.0
    6. N_b,Rd = χ · A · f_y / γ_M1

Coefficienti α per curva (Tab. 6.1):
    a₀: 0.13   (sezioni speciali)
    a : 0.21
    b : 0.34
    c : 0.49
    d : 0.76

Selezione curva (Tab. 6.2) per profili a doppio T laminati a caldo,
acciaio S235-S420:
    h/b > 1.2 :
        t_f ≤ 40 mm:  buckling y-y → a   ;  buckling z-z → b
        t_f > 40 mm:  buckling y-y → b   ;  buckling z-z → c
    h/b ≤ 1.2 :
        t_f ≤ 100 mm: buckling y-y → b   ;  buckling z-z → c
        t_f > 100 mm: buckling y-y → d   ;  buckling z-z → d
S460: curve specifiche (a₀ per molti casi).

Riferimento: EN 1993-1-1 §6.3.1 + Tab. 6.1 e 6.2.
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import Literal
import math

from .section_classification import SectionClass


GAMMA_M1_NTC = 1.05
GAMMA_M1_EC = 1.00


# Imperfection factor α per curva di buckling (Tab. 6.1)
_ALPHA_CURVE = {
    "a0": 0.13,
    "a": 0.21,
    "b": 0.34,
    "c": 0.49,
    "d": 0.76,
}

BucklingAxis = Literal["y", "z"]
BucklingCurveName = Literal["a0", "a", "b", "c", "d"]


@dataclass(frozen=True)
class BucklingResult:
    chi: float                  # χ (riduttivo, 0 < χ ≤ 1)
    N_b_Rd: float              # [N]
    lambda_bar: float           # snellezza adimensionale λ̄
    Phi: float                  # Φ intermedio
    N_cr: float                 # [N] carico critico euleriano
    curve: BucklingCurveName
    alpha: float                # imperfection factor
    axis: BucklingAxis
    notes: str = ""


def buckling_curve(
    h: float, b: float, tf: float,
    axis: BucklingAxis,
    fy_MPa: float,
    hot_rolled: bool = True,
) -> BucklingCurveName:
    """Determina la curva di buckling (a₀/a/b/c/d) per profili a doppio T.

    Segue EN 1993-1-1 Tab. 6.2.

    NOTA: caso S460 (fy=460) → ritorna 'a0' o 'a' a seconda dei casi (semplif.).
    """
    if min(h, b, tf) <= 0:
        raise ValueError("Dimensioni positive richieste")
    if not hot_rolled:
        # Profili saldati o laminati a freddo richiedono curve diverse: stub
        # default a "c" (conservativo).
        return "c"
    ratio_h_b = h / b
    # Caso S460 (fy >= 460): la Tab. 6.2 specifica curva a₀ per la maggior parte
    # delle combinazioni nei profili laminati a caldo.
    if fy_MPa >= 460:
        if ratio_h_b > 1.2:
            return "a0" if tf <= 0.040 else "a"
        # h/b ≤ 1.2
        return "a0" if tf <= 0.100 else "a"

    if ratio_h_b > 1.2:
        if tf <= 0.040:
            return "a" if axis == "y" else "b"
        # tf > 40mm
        return "b" if axis == "y" else "c"
    # h/b ≤ 1.2
    if tf <= 0.100:
        return "b" if axis == "y" else "c"
    return "d"


def chi_flexural(
    lambda_bar: float,
    curve: BucklingCurveName,
) -> tuple[float, float]:
    """Coefficiente χ di instabilità (EN 1993-1-1 6.49).

    Returns:
        (chi, Phi)
    """
    if lambda_bar < 0:
        raise ValueError("λ̄ deve essere non negativo")
    if curve not in _ALPHA_CURVE:
        raise ValueError(f"Curva sconosciuta '{curve}'")
    if lambda_bar <= 0.2:
        # Limite EC3 §6.3.1.2(4): per λ̄ ≤ 0.2 effetti di buckling trascurabili
        return 1.0, 0.5
    alpha = _ALPHA_CURVE[curve]
    Phi = 0.5 * (1 + alpha * (lambda_bar - 0.2) + lambda_bar ** 2)
    chi = 1.0 / (Phi + math.sqrt(Phi ** 2 - lambda_bar ** 2))
    return min(chi, 1.0), Phi


def N_cr_euler(E: float, I: float, L_cr: float) -> float:
    """Carico critico di Eulero N_cr = π² E I / L_cr²."""
    if min(E, I, L_cr) <= 0:
        raise ValueError("E, I, L_cr devono essere positivi")
    return math.pi ** 2 * E * I / L_cr ** 2


def N_b_Rd(
    A: float, I: float, fy: float, E: float, L_cr: float,
    section_class: SectionClass,
    h: float, b: float, tf: float,
    axis: BucklingAxis = "y",
    A_eff: float | None = None,
    gamma_M1: float = GAMMA_M1_NTC,
    fy_MPa_hint: float | None = None,
) -> BucklingResult:
    """N_b,Rd resistenza all'instabilità flessionale (EN 1993-1-1 §6.3.1).

    Args:
        A             : area lorda [m²]
        I             : momento d'inerzia attorno all'asse di buckling [m⁴]
        fy            : f_y [Pa]
        E             : modulo di Young [Pa]
        L_cr          : lunghezza critica = K · L [m]
        section_class : classe sezione (per scegliere A o A_eff)
        h, b, tf      : dimensioni profilo (selezione curva)
        axis          : asse di buckling ("y" o "z")
        A_eff         : area efficace per Classe 4 [m²] — default A
        gamma_M1      : coefficiente parziale (default 1.05 NTC)
        fy_MPa_hint   : f_y in MPa per selezionare curva (default da fy)
    """
    if min(A, I, fy, E, L_cr) <= 0:
        raise ValueError("Argomenti positivi richiesti")
    fy_MPa = fy_MPa_hint if fy_MPa_hint is not None else fy / 1e6
    curve = buckling_curve(h=h, b=b, tf=tf, axis=axis, fy_MPa=fy_MPa)
    alpha = _ALPHA_CURVE[curve]
    N_cr = N_cr_euler(E=E, I=I, L_cr=L_cr)

    A_used = A_eff if (section_class == SectionClass.CLASS_4 and A_eff is not None) else A
    lambda_bar = math.sqrt(A_used * fy / N_cr)
    chi, Phi = chi_flexural(lambda_bar, curve)
    N_b = chi * A_used * fy / gamma_M1

    return BucklingResult(
        chi=chi, N_b_Rd=N_b, lambda_bar=lambda_bar, Phi=Phi, N_cr=N_cr,
        curve=curve, alpha=alpha, axis=axis,
        notes=f"L_cr={L_cr:.2f}m, N_cr={N_cr/1e3:.0f}kN, λ̄={lambda_bar:.3f}",
    )
