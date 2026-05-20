"""
Resistenze di sezione secondo EN 1993-1-1 §6.2.

Formule implementate:
    §6.2.3 Trazione assiale:        N_t,Rd = A · f_y / γ_M0           (6.6)
    §6.2.4 Compressione assiale:    N_c,Rd = A · f_y / γ_M0           (6.10) Classi 1/2/3
                                    N_c,Rd = A_eff · f_y / γ_M0       Classe 4 (semplif. con A_eff = A)
    §6.2.5 Flessione monoassiale:
        Classi 1/2:                 M_c,Rd = W_pl · f_y / γ_M0        (6.13)
        Classe 3:                   M_c,Rd = W_el · f_y / γ_M0        (6.14)
        Classe 4:                   M_c,Rd = W_eff · f_y / γ_M0  (semplif. con W_eff=W_el)
    §6.2.6 Taglio:                  V_pl,Rd = A_v · (f_y / √3) / γ_M0 (6.18)
        Per profili I/H sotto carico parallelo all'anima:
            A_v = A - 2·b·tf + (tw + 2r)·tf      (6.23 cl. (a))

Coefficiente di sicurezza:
    γ_M0 = 1.05 (NTC 2018) oppure 1.00 (EC3 raccomandato).
    Default qui: 1.05 (uso italiano).

Riferimento: EN 1993-1-1:2005 + AC:2009, NTC 2018 §4.2.

NOTA: per Classe 4 le formule semplificate usano A=A_eff e W=W_el (lato sicurezza).
L'algoritmo di calcolo effettivo di sezioni efficaci (riduzione per imbozzamento
locale) richiede EN 1993-1-5 ed è demandato a una fase successiva.
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import Literal

from .section_classification import SectionClass, classify_section


GAMMA_M0_NTC = 1.05
GAMMA_M0_EC = 1.00


@dataclass(frozen=True)
class ResistanceResult:
    value: float       # N o N·m, a seconda della grandezza
    formula: str       # nome della formula EC3 (es. "6.13")
    section_class: SectionClass
    gamma_M0: float
    notes: str = ""


# --------------------------- §6.2.3 Trazione ---------------------------

def N_t_Rd(A: float, fy: float, gamma_M0: float = GAMMA_M0_NTC) -> ResistanceResult:
    """N_t,Rd = A · f_y / γ_M0   [EN 1993-1-1 (6.6)]

    Args:
        A       : area lorda [m²]
        fy      : f_y [Pa]
        gamma_M0: coefficiente parziale (default 1.05 NTC, raccomandato 1.00 EC)

    Note: la rottura a sezione netta su collegamenti bullonati (6.7) non è
    qui considerata — solo lo snervamento della sezione lorda.
    """
    if A <= 0 or fy <= 0:
        raise ValueError("A e f_y devono essere positivi")
    if gamma_M0 <= 0:
        raise ValueError("γ_M0 deve essere positivo")
    return ResistanceResult(
        value=A * fy / gamma_M0,
        formula="6.6",
        section_class=SectionClass.CLASS_1,  # trazione: la classe non riduce
        gamma_M0=gamma_M0,
        notes=f"A={A*1e4:.2f} cm², fy={fy/1e6:.0f} MPa",
    )


# --------------------------- §6.2.4 Compressione ---------------------------

def N_c_Rd(
    A: float, fy: float, section_class: SectionClass,
    A_eff: float | None = None,
    gamma_M0: float = GAMMA_M0_NTC,
) -> ResistanceResult:
    """N_c,Rd resistenza a compressione della sezione.

    Args:
        A             : area lorda [m²]
        fy            : f_y [Pa]
        section_class : classe di sezione (1/2/3/4)
        A_eff         : area efficace [m²] — solo Classe 4. Default A.
    """
    if A <= 0 or fy <= 0:
        raise ValueError("A e f_y devono essere positivi")
    if section_class == SectionClass.CLASS_4:
        A_used = A_eff if A_eff is not None else A
        formula = "6.11"
        note_extra = " (Classe 4, A_eff)"
    else:
        A_used = A
        formula = "6.10"
        note_extra = ""
    return ResistanceResult(
        value=A_used * fy / gamma_M0,
        formula=formula,
        section_class=section_class,
        gamma_M0=gamma_M0,
        notes=f"A={A*1e4:.2f} cm², fy={fy/1e6:.0f} MPa{note_extra}",
    )


# --------------------------- §6.2.5 Flessione ---------------------------

def M_c_Rd(
    Wpl: float, Wel: float, fy: float, section_class: SectionClass,
    Weff: float | None = None,
    gamma_M0: float = GAMMA_M0_NTC,
) -> ResistanceResult:
    """M_c,Rd resistenza a flessione monoassiale della sezione.

    Selezione del modulo in base alla classe:
        Classi 1/2 → W_pl    (6.13)
        Classe 3   → W_el    (6.14)
        Classe 4   → W_eff   (6.15)  — semplif. W_eff = W_el
    """
    if fy <= 0:
        raise ValueError("f_y deve essere positivo")
    if section_class in (SectionClass.CLASS_1, SectionClass.CLASS_2):
        if Wpl <= 0:
            raise ValueError("W_pl deve essere noto per Classi 1/2")
        W = Wpl
        formula = "6.13"
    elif section_class == SectionClass.CLASS_3:
        if Wel <= 0:
            raise ValueError("W_el deve essere noto per Classe 3")
        W = Wel
        formula = "6.14"
    else:  # Classe 4
        W = Weff if Weff is not None else Wel
        formula = "6.15"
    return ResistanceResult(
        value=W * fy / gamma_M0,
        formula=formula,
        section_class=section_class,
        gamma_M0=gamma_M0,
        notes=f"W={W*1e6:.1f} cm³, fy={fy/1e6:.0f} MPa",
    )


# --------------------------- §6.2.6 Taglio ---------------------------

def shear_area_I_profile(A: float, b: float, tf: float, tw: float,
                          r: float) -> float:
    """Area di taglio A_v per profili I/H con carico parallelo all'anima.

    A_v = A - 2 b tf + (tw + 2 r) tf       (EN 1993-1-1 6.23 cl. (a))

    L'EC3 raccomanda inoltre η · h_w · t_w come limite inferiore (η=1 cons.).
    Qui restituiamo direttamente il valore della (6.23a).
    """
    if min(A, b, tf, tw) <= 0:
        raise ValueError("Tutte le dimensioni devono essere positive")
    return A - 2 * b * tf + (tw + 2 * r) * tf


def V_c_Rd(
    A_v: float, fy: float,
    gamma_M0: float = GAMMA_M0_NTC,
) -> ResistanceResult:
    """V_pl,Rd = A_v · (f_y / √3) / γ_M0   [EN 1993-1-1 (6.18)]"""
    if A_v <= 0 or fy <= 0:
        raise ValueError("A_v e f_y devono essere positivi")
    import math
    return ResistanceResult(
        value=A_v * (fy / math.sqrt(3.0)) / gamma_M0,
        formula="6.18",
        section_class=SectionClass.CLASS_1,
        gamma_M0=gamma_M0,
        notes=f"A_v={A_v*1e4:.2f} cm², fy/√3={fy/1e6/math.sqrt(3):.1f} MPa",
    )
