"""
Combinazione modale per analisi spettrale (EC8 §4.3.3.3 / NTC 2018 §7.3.3.1).

Per un'analisi a risposta spettrale, ogni modo i-esimo contribuisce con una
risposta R_i (spostamento, sollecitazione, reazione). Le combinazioni:

SRSS (Square Root of Sum of Squares):
    R = √(Σ R_i²)

CQC (Complete Quadratic Combination, Der Kiureghian 1981):
    R = √(Σ_i Σ_j ρ_ij · R_i · R_j)

dove ρ_ij è il coefficiente di correlazione cross-modale:
    ρ_ij = 8·ξ² · (1 + r) · r^(3/2) / ((1-r²)² + 4·ξ²·r·(1+r)²)
    r    = ω_i / ω_j

Per modi distanti (r << 1 o >> 1):    ρ_ij → 0  → CQC ≈ SRSS
Per modi vicini (r → 1):              ρ_ij → 1  → CQC > SRSS

CQC è obbligatoria quando ci sono modi vicini fra loro (es. modi torsionali
e flessionali accoppiati). SRSS è una semplificazione lecita solo se i modi
sono ben separati (rapporto ω_i/ω_j ≤ 0.9 oppure ≥ 1.1).
"""
from __future__ import annotations
import math
import numpy as np


def srss(values: list[float] | np.ndarray) -> float:
    """SRSS: R = √(Σ R_i²)."""
    arr = np.asarray(values, dtype=float)
    return float(np.sqrt(np.sum(arr ** 2)))


def cqc_correlation(omega_i: float, omega_j: float,
                     damping_ratio: float) -> float:
    """ρ_ij per CQC (Der Kiureghian 1981).

    Args:
        omega_i, omega_j: pulsazioni modali [rad/s]
        damping_ratio   : ξ (frazione di smorzamento critico, es. 0.05)
    """
    if omega_i <= 0 or omega_j <= 0:
        raise ValueError("Pulsazioni devono essere positive")
    if damping_ratio <= 0 or damping_ratio >= 1:
        raise ValueError("ξ deve essere fra 0 e 1")
    r = omega_i / omega_j
    xi = damping_ratio
    num = 8.0 * xi ** 2 * (1.0 + r) * (r ** 1.5)
    den = (1.0 - r ** 2) ** 2 + 4.0 * xi ** 2 * r * (1.0 + r) ** 2
    return num / den


def cqc(
    values: list[float] | np.ndarray,
    omegas: list[float] | np.ndarray,
    damping_ratio: float = 0.05,
) -> float:
    """CQC con coefficienti di correlazione cross-modale.

    R = √(Σ_i Σ_j ρ_ij · R_i · R_j)
    """
    R = np.asarray(values, dtype=float)
    w = np.asarray(omegas, dtype=float)
    if R.shape != w.shape:
        raise ValueError("values e omegas devono avere stessa lunghezza")
    n = len(R)
    total = 0.0
    for i in range(n):
        for j in range(n):
            rho = cqc_correlation(w[i], w[j], damping_ratio)
            total += rho * R[i] * R[j]
    if total < 0:
        # Numericamente può capitare per perdita di precisione
        total = max(total, 0.0)
    return float(math.sqrt(total))


def response_spectrum_combination(
    modal_contributions: list[float] | np.ndarray,
    omegas: list[float] | np.ndarray,
    method: str = "CQC",
    damping_ratio: float = 0.05,
) -> float:
    """Wrapper unificato: applica SRSS o CQC.

    Args:
        modal_contributions: lista di R_i = ψ_i · Γ_i · Sa(T_i) per ogni modo
        omegas             : pulsazioni modali corrispondenti
        method             : "SRSS" o "CQC"
        damping_ratio      : ξ (solo per CQC)
    """
    if method.upper() == "SRSS":
        return srss(modal_contributions)
    if method.upper() == "CQC":
        return cqc(modal_contributions, omegas, damping_ratio)
    raise ValueError(f"Metodo '{method}' non supportato (usa SRSS o CQC)")


def directional_combination(
    R_x: float, R_y: float = 0.0, R_z: float = 0.0,
    rule: str = "30",
) -> tuple[float, float, float]:
    """Combinazione delle direzioni sismiche.

    rule = "30" (regola 30%, EN 1998-1 §4.3.3.5.1):
        ±|R_x| ± 0.3·|R_y| ± 0.3·|R_z|
        ±0.3·|R_x| ± |R_y| ± 0.3·|R_z|
        ±0.3·|R_x| ± 0.3·|R_y| ± |R_z|
    Restituisce 3 combinazioni (max per ogni direzione dominante).

    rule = "SRSS":
        |R| = √(R_x² + R_y² + R_z²)
    """
    Rx, Ry, Rz = abs(R_x), abs(R_y), abs(R_z)
    if rule == "30":
        a = Rx + 0.3 * Ry + 0.3 * Rz
        b = 0.3 * Rx + Ry + 0.3 * Rz
        c = 0.3 * Rx + 0.3 * Ry + Rz
        return a, b, c
    if rule.upper() == "SRSS":
        v = math.sqrt(Rx ** 2 + Ry ** 2 + Rz ** 2)
        return v, v, v
    raise ValueError(f"Regola '{rule}' sconosciuta (usa '30' o 'SRSS')")


def participating_mass_ratio(
    modal_participation_masses: list[float],
    total_mass: float,
) -> list[float]:
    """Frazione di massa partecipante per ogni modo (NTC 2018 §7.3.3.1).

    Args:
        modal_participation_masses: M_i* per ogni modo [kg]
        total_mass                : massa totale della struttura [kg]

    Returns:
        Lista delle percentuali di massa partecipante (somma = totale relativa).

    NOTA: NTC 2018 richiede che la somma dei modi considerati superi 85% per
    direzione (verificabile dalla cumulata).
    """
    if total_mass <= 0:
        raise ValueError("total_mass deve essere positiva")
    return [m / total_mass for m in modal_participation_masses]


def cumulative_mass_ratio(modal_ratios: list[float]) -> list[float]:
    """Cumulata delle masse partecipanti (per controllo soglia 85%)."""
    out = []
    running = 0.0
    for r in modal_ratios:
        running += r
        out.append(running)
    return out
