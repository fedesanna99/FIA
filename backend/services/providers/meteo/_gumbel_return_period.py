"""Gumbel Type I return period estimator (Sprint 2 — F4.1).

Funzione pura per calcolare il quantile di return period T (anni)
dato un campione di massimi annuali.

Riferimenti:
    - EN 1991-1-4 §4.2 — wind reference velocity v_b,0 = 10-min mean
      at 10 m AGL, 50-year return period.
    - Coles "An Introduction to Statistical Modeling of Extreme Values"
      Springer 2001, Ch. 3.3 (Method of moments for Gumbel).
    - Wikipedia "Gumbel distribution" sez. "Parameter estimation".

Formule:
    Distribuzione: F(x) = exp(-exp(-(x - mu) / beta))
    Method-of-moments dalla media campionaria m e std s:
        beta = s * sqrt(6) / pi
        mu   = m - euler_mascheroni * beta
    Quantile a probabilita' di non-eccedenza p:
        x_p = mu - beta * ln(-ln(p))
    Per return period T anni con massimi annuali: p = 1 - 1/T.
"""
from __future__ import annotations

import math
from typing import Sequence


# Costante Euler-Mascheroni con piena precisione double
EULER_MASCHERONI: float = 0.5772156649015329


def gumbel_return_period(annual_maxima: Sequence[float], T: int = 50) -> float:
    """Stima il quantile a T-anno return period via Gumbel Type I MoM.

    Args:
        annual_maxima: massimi annuali (es. raffica vento massima per anno).
        T: return period in anni (default 50, per design loads EC1/NTC).

    Returns:
        Quantile stimato (stessa unita' dei dati). Mai negativo per
        variabili fisicamente non-negative — viene clippato a 0 se il
        modello produce valori negativi (es. campione tutto-zero o
        molto sotto-disperso).

    Edge cases:
        - len(annual_maxima) == 0  -> 0.0
        - len(annual_maxima) == 1  -> ritorna l'unico valore (no stima)
        - std == 0 (campione costante) -> ritorna il valore costante
        - T <= 1                   -> ValueError
    """
    if T <= 1:
        raise ValueError(f"T deve essere > 1 anno, ricevuto T={T}")

    xs = [float(x) for x in annual_maxima if x is not None]
    n = len(xs)
    if n == 0:
        return 0.0
    if n == 1:
        return max(xs[0], 0.0)

    # Sample mean, sample std (unbiased N-1)
    m = sum(xs) / n
    var = sum((x - m) ** 2 for x in xs) / (n - 1)
    s = math.sqrt(var)

    if s == 0.0:
        # Tutti i valori uguali: il modello degenerare, ritorna mean
        return max(m, 0.0)

    beta = s * math.sqrt(6.0) / math.pi
    mu = m - EULER_MASCHERONI * beta

    # Quantile a p = 1 - 1/T
    p = 1.0 - 1.0 / T
    # ln(-ln(p)) ben definito per 0 < p < 1
    x_T = mu - beta * math.log(-math.log(p))

    # Clip a 0 per variabili fisicamente non-negative
    return max(x_T, 0.0)


def annual_maxima_from_daily(
    dates: Sequence[str],
    values: Sequence[float | None],
) -> list[float]:
    """Aggrega serie giornaliere in massimi annuali.

    Args:
        dates: liste di ISO date "YYYY-MM-DD".
        values: valore giornaliero (None = missing, ignorato).

    Returns:
        Lista di massimi annuali (un valore per anno con dato disponibile).
        Ordinati per anno crescente.

    Esempio:
        >>> annual_maxima_from_daily(["2020-01-01","2020-06-15","2021-03-10"], [10.0, 25.0, 18.0])
        [25.0, 18.0]
    """
    if len(dates) != len(values):
        raise ValueError(
            f"dates ({len(dates)}) e values ({len(values)}) devono avere stessa lunghezza"
        )
    by_year: dict[str, float] = {}
    for d, v in zip(dates, values):
        if v is None:
            continue
        year = d[:4]
        cur = by_year.get(year)
        if cur is None or v > cur:
            by_year[year] = float(v)
    return [by_year[y] for y in sorted(by_year.keys())]
