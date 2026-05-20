"""
Spettri di risposta elastici e di progetto — EN 1998-1 §3.2.2.

Spettro elastico orizzontale (3.2.2.2):
    0 ≤ T ≤ T_B :   S_e(T) = a_g · S · [1 + T/T_B · (η·2.5 - 1)]
    T_B ≤ T ≤ T_C: S_e(T) = a_g · S · η · 2.5
    T_C ≤ T ≤ T_D: S_e(T) = a_g · S · η · 2.5 · (T_C / T)
    T_D ≤ T ≤ 4s : S_e(T) = a_g · S · η · 2.5 · (T_C · T_D / T²)

Con η = √(10/(5+ξ%))   ≥ 0.55     (correzione smorzamento)

Tipi di spettro (Tab. 3.2):
    Tipo 1: per sismicità con M_s > 5.5   (caso comune in IT)
    Tipo 2: per sismicità con M_s ≤ 5.5   (intra-placca)

Categorie di suolo (Tab. 3.1, secondo V_s30):
    A: roccia                     V_s30 > 800
    B: depositi rigidi            360 < V_s30 ≤ 800
    C: depositi medi              180 < V_s30 ≤ 360
    D: depositi soffici           V_s30 ≤ 180
    E: strato A su un C/D (≤20m)

Spettro di progetto (3.2.2.5): come elastico ma con 2.5 → 2.5/q (dove q è il
fattore di struttura). Il limite inferiore è 0.2·a_g (3.4).
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import Literal
import math


SpectrumType = Literal["1", "2"]
GroundType = Literal["A", "B", "C", "D", "E"]


@dataclass(frozen=True)
class SpectrumParams:
    S: float        # fattore di amplificazione del suolo
    T_B: float      # periodo limite inferiore [s]
    T_C: float      # periodo limite superiore [s]
    T_D: float      # periodo limite di displacement constant [s]


# Tab. 3.2 / 3.3 EN 1998-1 — parametri spettro elastico orizzontale
# (S, T_B, T_C, T_D)
_PARAMS_TYPE_1: dict[GroundType, SpectrumParams] = {
    "A": SpectrumParams(S=1.00, T_B=0.15, T_C=0.40, T_D=2.0),
    "B": SpectrumParams(S=1.20, T_B=0.15, T_C=0.50, T_D=2.0),
    "C": SpectrumParams(S=1.15, T_B=0.20, T_C=0.60, T_D=2.0),
    "D": SpectrumParams(S=1.35, T_B=0.20, T_C=0.80, T_D=2.0),
    "E": SpectrumParams(S=1.40, T_B=0.15, T_C=0.50, T_D=2.0),
}
_PARAMS_TYPE_2: dict[GroundType, SpectrumParams] = {
    "A": SpectrumParams(S=1.00, T_B=0.05, T_C=0.25, T_D=1.2),
    "B": SpectrumParams(S=1.35, T_B=0.05, T_C=0.25, T_D=1.2),
    "C": SpectrumParams(S=1.50, T_B=0.10, T_C=0.25, T_D=1.2),
    "D": SpectrumParams(S=1.80, T_B=0.10, T_C=0.30, T_D=1.2),
    "E": SpectrumParams(S=1.60, T_B=0.05, T_C=0.25, T_D=1.2),
}


def ground_parameters(spectrum_type: SpectrumType, ground: GroundType) -> SpectrumParams:
    """Restituisce (S, T_B, T_C, T_D) per tipo di spettro e categoria di suolo."""
    table = _PARAMS_TYPE_1 if spectrum_type == "1" else _PARAMS_TYPE_2
    if ground not in table:
        raise ValueError(f"Categoria suolo '{ground}' sconosciuta")
    return table[ground]


def eta_damping(xi_pct: float = 5.0) -> float:
    """η = √(10/(5+ξ)) ≥ 0.55 (3.6)"""
    if xi_pct <= -5:
        raise ValueError("ξ deve essere > -5 (in %)")
    return max(math.sqrt(10.0 / (5.0 + xi_pct)), 0.55)


def elastic_spectrum(
    T: float, a_g: float,
    spectrum_type: SpectrumType, ground: GroundType,
    xi_pct: float = 5.0,
) -> float:
    """Valore S_e(T) dello spettro elastico orizzontale [m/s²].

    Args:
        T            : periodo strutturale [s]
        a_g          : accelerazione orizzontale di picco [m/s²]
        spectrum_type: "1" o "2"
        ground       : categoria suolo "A".."E"
        xi_pct       : smorzamento equivalente [%], default 5%
    """
    if T < 0:
        raise ValueError("T non può essere negativo")
    if a_g < 0:
        raise ValueError("a_g non può essere negativo")
    p = ground_parameters(spectrum_type, ground)
    eta = eta_damping(xi_pct)
    if T <= p.T_B:
        return a_g * p.S * (1.0 + T / p.T_B * (eta * 2.5 - 1.0))
    if T <= p.T_C:
        return a_g * p.S * eta * 2.5
    if T <= p.T_D:
        return a_g * p.S * eta * 2.5 * (p.T_C / T)
    return a_g * p.S * eta * 2.5 * (p.T_C * p.T_D / T ** 2)


def design_spectrum(
    T: float, a_g: float,
    spectrum_type: SpectrumType, ground: GroundType,
    q: float,
    beta: float = 0.20,
) -> float:
    """Spettro di progetto orizzontale (3.13–3.16):

        0 ≤ T ≤ T_B :   S_d(T) = a_g · S · [2/3 + T/T_B · (2.5/q - 2/3)]
        T_B ≤ T ≤ T_C: S_d(T) = a_g · S · 2.5/q
        T_C ≤ T ≤ T_D: S_d(T) = max(a_g · S · 2.5/q · T_C/T,  β · a_g)
        T_D ≤ T     :  S_d(T) = max(a_g · S · 2.5/q · T_C·T_D/T²,  β · a_g)

    NOTA: a differenza dello spettro elastico, qui non si usa η (smorzamento
    già implicito nel fattore q).
    """
    if T < 0:
        raise ValueError("T non può essere negativo")
    if a_g < 0:
        raise ValueError("a_g non può essere negativo")
    if q <= 0:
        raise ValueError("q deve essere positivo")
    p = ground_parameters(spectrum_type, ground)
    floor = beta * a_g  # limite inferiore (3.16)
    if T <= p.T_B:
        return a_g * p.S * (2.0/3.0 + T / p.T_B * (2.5 / q - 2.0/3.0))
    if T <= p.T_C:
        return a_g * p.S * 2.5 / q
    if T <= p.T_D:
        return max(a_g * p.S * 2.5 / q * (p.T_C / T), floor)
    return max(a_g * p.S * 2.5 / q * (p.T_C * p.T_D / T ** 2), floor)
