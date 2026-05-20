"""
Convergence checker per h-refinement.

Strategia (Richardson extrapolation):
    Sia q(h) la quantità di interesse (es. freccia massima) per mesh con
    elemento di taglia h. Per un elemento di ordine p (es. p=2 per
    Euler-Bernoulli beam, p=2 per CST/Tri3, p=2 per Q4 quad), si ha:

        q(h) = q_exact + C · h^p + O(h^{p+1})

    Da 3 valori (q1=q(h), q2=q(h/2), q3=q(h/4)):
        order ≈ log2( (q1 - q2) / (q2 - q3) )

    Se order è prossimo a p, la convergenza è quella attesa.
    L'estrapolazione di Richardson dà q_exact ≈ q3 + (q3 - q2) / (2^p - 1).

Funzioni:
    convergence_order(values, ratio=2) → float
    richardson_extrapolation(values, p, ratio=2) → float
    grid_convergence_index(values, p=2, fs=1.25) → GCI (ASME V&V20)
"""
from __future__ import annotations
import math
from dataclasses import dataclass


@dataclass
class ConvergenceResult:
    values: list[float]              # q(h), q(h/r), q(h/r^2), ...
    apparent_order: float            # order stimato da Richardson
    extrapolated_value: float        # q_exact estrapolato
    gci_fine: float                  # Grid Convergence Index sul mesh più fine
    is_monotonic: bool               # |q_{k+1} - q_k| < |q_k - q_{k-1}|


def convergence_order(values: list[float], ratio: float = 2.0) -> float:
    """Stima dell'ordine apparente di convergenza.

    Args:
        values : lista di almeno 3 valori successivi a mesh più fini
                 (ratio è il fattore di rifinitura, default 2).

    Returns:
        order = log_r( (q1-q2) / (q2-q3) ); NaN se denominatore ~ 0.
    """
    if len(values) < 3:
        raise ValueError("Servono almeno 3 valori per stimare l'ordine")
    e1 = values[0] - values[1]
    e2 = values[1] - values[2]
    if abs(e2) < 1e-30:
        return float("nan")
    rapp = abs(e1 / e2)
    return math.log(rapp) / math.log(ratio)


def richardson_extrapolation(values: list[float], p: float, ratio: float = 2.0) -> float:
    """Estrapolazione di Richardson dal mesh più fine.

    q_exact ≈ q_n + (q_n - q_{n-1}) / (r^p - 1)
    """
    if len(values) < 2:
        raise ValueError("Servono almeno 2 valori")
    q_n = values[-1]
    q_nm1 = values[-2]
    denom = ratio ** p - 1.0
    if abs(denom) < 1e-30:
        return q_n
    return q_n + (q_n - q_nm1) / denom


def grid_convergence_index(
    values: list[float], p: float = 2.0,
    ratio: float = 2.0, fs: float = 1.25,
) -> float:
    """Grid Convergence Index (Roache 1994, ASME V&V20) sul mesh più fine.

    GCI = fs · |ε| / (r^p - 1)
    dove ε = (q_n - q_{n-1}) / q_n e fs è il fattore di sicurezza (1.25
    per 3+ mesh, 3.0 per 2 mesh).
    """
    if len(values) < 2:
        raise ValueError("Servono almeno 2 valori")
    q_n = values[-1]
    q_nm1 = values[-2]
    if abs(q_n) < 1e-30:
        return float("nan")
    eps = abs((q_n - q_nm1) / q_n)
    return fs * eps / (ratio ** p - 1.0)


def analyze_convergence(
    values: list[float], *, ratio: float = 2.0, fs: float = 1.25,
) -> ConvergenceResult:
    """Analisi completa: order, estrapolato, GCI, monotonicità."""
    p_est = convergence_order(values, ratio=ratio) if len(values) >= 3 else 2.0
    # Per Richardson uso l'ordine stimato (se valido) altrimenti default 2
    p_use = p_est if (p_est > 0 and not math.isnan(p_est)) else 2.0
    q_ex = richardson_extrapolation(values, p_use, ratio=ratio)
    gci = grid_convergence_index(values, p_use, ratio=ratio, fs=fs)
    is_mono = True
    if len(values) >= 3:
        e_prev = abs(values[1] - values[0])
        for i in range(2, len(values)):
            e_cur = abs(values[i] - values[i - 1])
            if e_cur > e_prev + 1e-15:
                is_mono = False
                break
            e_prev = e_cur
    return ConvergenceResult(
        values=list(values),
        apparent_order=p_est,
        extrapolated_value=q_ex,
        gci_fine=gci,
        is_monotonic=is_mono,
    )
