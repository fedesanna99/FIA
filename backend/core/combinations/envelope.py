"""
Inviluppo delle sollecitazioni per più combinazioni di carico.
"""
from __future__ import annotations
from dataclasses import dataclass


@dataclass(frozen=True)
class EnvelopeResult:
    max_value: float
    min_value: float
    governing_combination_max: str
    governing_combination_min: str
    all_values: dict[str, float]   # {combinazione: valore}


def envelope_scalar(values_per_combo: dict[str, float]) -> EnvelopeResult:
    """Inviluppo: massimo e minimo fra una serie di valori di una sollecitazione.

    Args:
        values_per_combo: dizionario {nome_combinazione: valore_scalare}

    Returns:
        EnvelopeResult con max, min e quale combinazione governa.
    """
    if not values_per_combo:
        raise ValueError("values_per_combo non può essere vuoto")
    sorted_items = sorted(values_per_combo.items(), key=lambda kv: kv[1])
    min_name, min_v = sorted_items[0]
    max_name, max_v = sorted_items[-1]
    return EnvelopeResult(
        max_value=max_v, min_value=min_v,
        governing_combination_max=max_name,
        governing_combination_min=min_name,
        all_values=dict(values_per_combo),
    )
