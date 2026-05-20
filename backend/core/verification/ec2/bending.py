"""
Flessione di sezione rettangolare in cemento armato — EN 1992-1-1 §6.1.

Modello: blocco rettangolare equivalente (rectangular stress block).

Per cls di classe ≤ C50/60:
    f_cd = α_cc · f_ck / γ_C        (α_cc = 0.85 NTC, 1.0 EC base)
    f_yd = f_yk / γ_S
    η = 1.0,  λ = 0.8   (parametri stress-block per fck ≤ 50 MPa)

Equilibrio (semplice armatura inferiore A_s, no armatura compressa):
    F_c = η · f_cd · b · (λ·x)
    F_s = A_s · f_yd
    F_c = F_s    →    x = A_s · f_yd / (η · λ · b · f_cd)

Momento resistente:
    M_Rd = A_s · f_yd · (d - λ·x/2)

Limite di duttilità (NTC 2018 §4.1.2.1.2):
    x / d ≤ 0.45  per Classi B450C (per il "rotation capacity")

Armatura minima (§9.2.1.1):
    A_s,min = max(0.26 · f_ctm / f_yk · b_t · d ;  0.0013 · b_t · d)

Riferimento: EN 1992-1-1 §6.1 + NTC 2018 §4.1.

NOTA: l'algoritmo restituisce M_Rd assumendo che l'acciaio raggiunga f_yd
(rottura duttile / armatura non eccessiva). Per verifica completa di sezione
con armatura compressa (sezione doppiamente armata) e/o sezioni non
rettangolari serve un'implementazione più completa, in roadmap.
"""
from __future__ import annotations
from dataclasses import dataclass
import math

GAMMA_C = 1.5
GAMMA_S = 1.15
ALPHA_CC = 0.85  # NTC


@dataclass(frozen=True)
class BendingResult:
    M_Rd: float          # [N·m]
    x: float             # profondità asse neutro [m]
    z: float             # braccio coppia interna [m]
    x_over_d: float      # rapporto x/d (controllo duttilità)
    f_cd: float          # [Pa]
    f_yd: float          # [Pa]
    A_s: float           # [m²]
    is_ductile: bool     # x/d ≤ 0.45
    notes: str = ""


def design_strength_fcd(fck: float, alpha_cc: float = ALPHA_CC,
                         gamma_C: float = GAMMA_C) -> float:
    """f_cd = α_cc · f_ck / γ_C   [Pa → Pa]"""
    if fck <= 0:
        raise ValueError("f_ck deve essere positivo")
    return alpha_cc * fck / gamma_C


def design_strength_fyd(fyk: float, gamma_S: float = GAMMA_S) -> float:
    """f_yd = f_yk / γ_S"""
    if fyk <= 0:
        raise ValueError("f_yk deve essere positivo")
    return fyk / gamma_S


def f_ctm(fck_MPa: float) -> float:
    """Resistenza a trazione media — EN 1992-1-1 Tab. 3.1.

    Per cls di classe ≤ C50/60:
        f_ctm = 0.30 · f_ck^(2/3)   [MPa]
    Restituisce in Pa.
    """
    if fck_MPa <= 0:
        raise ValueError("f_ck deve essere positivo")
    return 0.30 * fck_MPa ** (2.0 / 3.0) * 1e6


def minimum_reinforcement(b: float, d: float, fck: float, fyk: float) -> float:
    """A_s,min secondo EN 1992-1-1 (9.1N).

        A_s,min = max(0.26 · f_ctm/f_yk · b · d ;  0.0013 · b · d)

    Args:
        b, d : larghezza e altezza utile [m]
        fck  : f_ck [Pa]
        fyk  : f_yk [Pa]
    """
    if min(b, d, fck, fyk) <= 0:
        raise ValueError("Tutti i parametri devono essere positivi")
    fctm = f_ctm(fck / 1e6)
    Asmin_a = 0.26 * fctm / fyk * b * d
    Asmin_b = 0.0013 * b * d
    return max(Asmin_a, Asmin_b)


def M_Rd_rectangular(
    b: float, d: float,
    A_s: float, fck: float, fyk: float,
    alpha_cc: float = ALPHA_CC,
    gamma_C: float = GAMMA_C,
    gamma_S: float = GAMMA_S,
) -> BendingResult:
    """Momento resistente di sezione rettangolare in CA (singola armatura).

    Args:
        b      : larghezza sezione [m]
        d      : altezza utile (h - copriferro - φ/2) [m]
        A_s    : area armatura tesa [m²]
        fck    : resistenza caratteristica cls [Pa]
        fyk    : resistenza caratteristica acciaio [Pa]
    """
    if min(b, d, A_s, fck, fyk) <= 0:
        raise ValueError("Tutti gli argomenti devono essere positivi")
    eta = 1.0    # fck ≤ 50 MPa
    lam = 0.8

    fcd = design_strength_fcd(fck, alpha_cc=alpha_cc, gamma_C=gamma_C)
    fyd = design_strength_fyd(fyk, gamma_S=gamma_S)

    # Equilibrio: A_s · fyd = η · fcd · b · λ·x  →  x
    x = A_s * fyd / (eta * lam * b * fcd)
    z = d - lam * x / 2.0
    M_Rd = A_s * fyd * z
    x_over_d = x / d
    is_ductile = x_over_d <= 0.45
    return BendingResult(
        M_Rd=M_Rd, x=x, z=z, x_over_d=x_over_d,
        f_cd=fcd, f_yd=fyd, A_s=A_s,
        is_ductile=is_ductile,
        notes=f"fcd={fcd/1e6:.1f}MPa fyd={fyd/1e6:.0f}MPa x/d={x_over_d:.3f}",
    )
