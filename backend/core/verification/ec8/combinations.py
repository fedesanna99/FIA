"""
Combinazioni sismiche — NTC 2018 §2.5.3 / EN 1998-1 §3.2.4.

Combinazione sismica fondamentale (3.17):
    E_d = G_k1 + G_k2 + P + E + Σ ψ_2,i · Q_k,i

Coefficienti ψ_2 (NTC 2018 Tab. 2.5.I):
    Cat. A (residenziale):           ψ_2 = 0.30
    Cat. B (uffici):                  ψ_2 = 0.30
    Cat. C (luoghi affollati):       ψ_2 = 0.60
    Cat. D (commerciali):             ψ_2 = 0.60
    Cat. E (depositi):                ψ_2 = 0.80
    Cat. F (parcheggi <30kN):         ψ_2 = 0.60
    Cat. G (parcheggi >30kN):         ψ_2 = 0.30
    Cat. H (coperture):               ψ_2 = 0.00
    Neve (quota ≤ 1000m):             ψ_2 = 0.00
    Neve (quota > 1000m):             ψ_2 = 0.20
    Vento:                            ψ_2 = 0.00
    Temperatura:                      ψ_2 = 0.00
"""
from __future__ import annotations
from typing import Literal


LoadCategory = Literal[
    "A_residential", "B_office", "C_assembly", "D_shopping", "E_storage",
    "F_parking_light", "G_parking_heavy", "H_roof",
    "snow_low", "snow_high", "wind", "temperature",
]


_PSI_2_TABLE: dict[str, float] = {
    "A_residential":  0.30,
    "B_office":       0.30,
    "C_assembly":     0.60,
    "D_shopping":     0.60,
    "E_storage":      0.80,
    "F_parking_light": 0.60,
    "G_parking_heavy": 0.30,
    "H_roof":         0.00,
    "snow_low":       0.00,
    "snow_high":      0.20,
    "wind":           0.00,
    "temperature":    0.00,
}


def ψ_2(category: LoadCategory) -> float:
    """Coefficiente ψ_2 per la combinazione sismica."""
    if category not in _PSI_2_TABLE:
        raise ValueError(f"Categoria '{category}' sconosciuta")
    return _PSI_2_TABLE[category]


def seismic_combination(
    G: float, E: float,
    Q_with_psi: list[tuple[float, LoadCategory]] | None = None,
) -> float:
    """Combinazione sismica E_d = G + E + Σ ψ_2,i · Q_k,i

    Args:
        G          : carichi permanenti totali (G_k1 + G_k2 + P)
        E          : azione sismica di calcolo
        Q_with_psi : lista di (Q_k, categoria) da pesare con ψ_2

    Returns: valore totale di calcolo nella combinazione.
    """
    total = G + E
    if Q_with_psi:
        for Q, cat in Q_with_psi:
            total += ψ_2(cat) * Q
    return total


def EA_combination(
    E_x: float, E_y: float = 0.0, E_z: float = 0.0,
    factor_off_axis: float = 0.30,
) -> tuple[float, float, float]:
    """Combinazione delle direzioni sismiche (EN 1998-1 §4.3.3.5.1).

    Combinazione SRSS sostituita dalla regola dei 30%:
        ±E_x ± 0.30 E_y ± 0.30 E_z
        ±0.30 E_x ± E_y ± 0.30 E_z
        ±0.30 E_x ± 0.30 E_y ± E_z

    Restituisce i 3 valori massimi (uno per ogni direzione dominante).
    """
    if factor_off_axis < 0 or factor_off_axis > 1:
        raise ValueError("factor_off_axis deve essere fra 0 e 1")
    a = E_x + factor_off_axis * E_y + factor_off_axis * E_z
    b = factor_off_axis * E_x + E_y + factor_off_axis * E_z
    c = factor_off_axis * E_x + factor_off_axis * E_y + E_z
    return a, b, c
