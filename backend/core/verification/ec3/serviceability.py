"""
Verifiche di esercizio (SLE) — frecce ammissibili.

Riferimenti:
- EN 1990 §A1.4.2 (deformazioni)
- NTC 2018 §4.2.4.2

Frecce ammissibili (rapporto L/limite):
    travi di copertura:                 δ_max ≤ L / 200
    travi di solaio (uso ordinario):    δ_max ≤ L / 250
    travi a sbalzo:                     δ_max ≤ L / 125 (2·L/250 equiv. trave appoggiata)
    travi con elementi fragili sotto:   δ_max ≤ L / 350
    travi sotto carichi variabili (δ_2): L / 300
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import Literal


CategoryUse = Literal[
    "roof", "floor_ordinary", "floor_brittle",
    "cantilever_ordinary", "cantilever_brittle",
    "variable_load",
]


_LIMITS = {
    "roof":               200.0,   # δ ≤ L/200
    "floor_ordinary":     250.0,   # δ ≤ L/250
    "floor_brittle":      350.0,   # δ ≤ L/350
    "cantilever_ordinary": 125.0,
    "cantilever_brittle":  175.0,
    "variable_load":      300.0,
}


@dataclass(frozen=True)
class ServiceabilityResult:
    UR: float            # utilization ratio (≤1 OK)
    delta_max: float     # freccia di calcolo [m]
    delta_lim: float     # freccia limite [m]
    limit_ratio: float   # L/n del limite (es. 250 per L/250)
    L: float


def deflection_limit(L: float, category: CategoryUse) -> float:
    """Restituisce la freccia limite in metri."""
    if L <= 0:
        raise ValueError("L deve essere positivo")
    if category not in _LIMITS:
        raise ValueError(f"Categoria sconosciuta: {category}")
    return L / _LIMITS[category]


def serviceability_check(
    delta_max: float, L: float, category: CategoryUse,
) -> ServiceabilityResult:
    """Verifica SLE — confronto fra freccia calcolata e limite.

    Args:
        delta_max : freccia massima [m] (sempre in valore assoluto)
        L         : luce della trave [m]
        category  : categoria d'uso
    """
    if L <= 0:
        raise ValueError("L deve essere positivo")
    delta_max = abs(delta_max)
    delta_lim = deflection_limit(L=L, category=category)
    return ServiceabilityResult(
        UR=delta_max / delta_lim,
        delta_max=delta_max, delta_lim=delta_lim,
        limit_ratio=_LIMITS[category], L=L,
    )
