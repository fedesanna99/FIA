"""
Combinazioni di carico secondo NTC 2018 §2.5.

Formule (per azioni sfavorevoli; per favorevoli i γ_G/Q sono diversi —
qui assumiamo sempre sfavorevoli, scenario di calcolo standard):

(2.5.1) SLU fondamentale:
    γ_G1·G1 + γ_G2·G2 + γ_P·P + γ_Q1·Q_k1 + Σ γ_Qi·ψ_0,i·Q_ki

(2.5.2) SLE caratteristica/rara:
    G1 + G2 + P + Q_k1 + Σ ψ_0,i·Q_ki

(2.5.3) SLE frequente:
    G1 + G2 + P + ψ_1,1·Q_k1 + Σ ψ_2,i·Q_ki

(2.5.4) SLE quasi-permanente:
    G1 + G2 + P + Σ ψ_2,i·Q_ki

(2.5.5) SLU sismica:
    G1 + G2 + P + E + Σ ψ_2,i·Q_ki

(2.5.6) SLU eccezionale:
    G1 + G2 + P + A_d + ψ_1,1·Q_k1 + Σ ψ_2,i·Q_ki

Coefficienti γ (NTC 2018 Tab. 2.6.I, condizione SFAVOREVOLE):
    γ_G1 = 1.30  (permanenti strutturali)
    γ_G2 = 1.50  (permanenti non strutturali)
    γ_P  = 1.00
    γ_Q  = 1.50  (variabili)

Coefficienti ψ (NTC 2018 Tab. 2.5.I):
    vedi PSI_0, PSI_1, PSI_2.
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import Literal
from .actions import Action, LoadCategory


CombinationType = Literal[
    "SLU_fundamental",         # 2.5.1
    "SLE_characteristic",      # 2.5.2 (rara)
    "SLE_frequent",            # 2.5.3
    "SLE_quasi_permanent",     # 2.5.4
    "SLU_seismic",             # 2.5.5
    "SLU_accidental",          # 2.5.6
]


# Coefficienti γ — NTC 2018 Tab. 2.6.I, condizione sfavorevole
GAMMA: dict[str, float] = {
    "G1_unfav": 1.30,  "G1_fav": 1.00,
    "G2_unfav": 1.50,  "G2_fav": 0.00,
    "P_unfav":  1.00,  "P_fav":  0.90,
    "Q_unfav":  1.50,  "Q_fav":  0.00,
}


# Coefficienti ψ — NTC 2018 Tab. 2.5.I
PSI_0: dict[LoadCategory, float] = {
    "A_residential":   0.70,
    "B_office":        0.70,
    "C_assembly":      0.70,
    "D_shopping":      0.70,
    "E_storage":       1.00,
    "F_parking_light": 0.70,
    "G_parking_heavy": 0.70,
    "H_roof":          0.00,
    "snow_low":        0.50,
    "snow_high":       0.70,
    "wind":            0.60,
    "temperature":     0.60,
}

PSI_1: dict[LoadCategory, float] = {
    "A_residential":   0.50,
    "B_office":        0.50,
    "C_assembly":      0.70,
    "D_shopping":      0.70,
    "E_storage":       0.90,
    "F_parking_light": 0.70,
    "G_parking_heavy": 0.50,
    "H_roof":          0.00,
    "snow_low":        0.20,
    "snow_high":       0.50,
    "wind":            0.20,
    "temperature":     0.50,
}

PSI_2: dict[LoadCategory, float] = {
    "A_residential":   0.30,
    "B_office":        0.30,
    "C_assembly":      0.60,
    "D_shopping":      0.60,
    "E_storage":       0.80,
    "F_parking_light": 0.60,
    "G_parking_heavy": 0.30,
    "H_roof":          0.00,
    "snow_low":        0.00,
    "snow_high":       0.20,
    "wind":            0.00,
    "temperature":     0.00,
}


@dataclass(frozen=True)
class Combination:
    name: str                            # es. "SLU_fundamental:Q_main=neve"
    type: CombinationType
    factors: dict[str, float]            # coefficiente moltiplicativo per ogni azione
    value: float                         # somma pesata dei valori


def _category(action: Action) -> LoadCategory:
    if action.category is None:
        raise ValueError(f"Azione {action.name}: categoria mancante")
    return action.category


def combine_value(
    actions: list[Action],
    combination_type: CombinationType,
    main_Q: Action | None = None,
) -> Combination:
    """Calcola il valore della combinazione data per un set di azioni.

    Args:
        actions          : tutte le azioni del modello (G1, G2, P, Q, E, A)
        combination_type : tipo NTC
        main_Q           : per SLU_fundamental, SLE_characteristic, SLE_frequent,
                           SLU_accidental: la variabile principale (Q_k1)

    Returns:
        Combination con valore totale e fattori applicati.
    """
    q_actions = [a for a in actions if a.type == "Q"]
    if combination_type in (
        "SLU_fundamental", "SLE_characteristic",
        "SLE_frequent", "SLU_accidental",
    ):
        if main_Q is None and q_actions:
            raise ValueError(
                f"{combination_type}: serve main_Q quando ci sono Q nelle azioni"
            )

    factors: dict[str, float] = {}
    total = 0.0

    for a in actions:
        if a.type == "G1":
            f = GAMMA["G1_unfav"] if combination_type == "SLU_fundamental" else 1.0
        elif a.type == "G2":
            f = GAMMA["G2_unfav"] if combination_type == "SLU_fundamental" else 1.0
        elif a.type == "P":
            f = GAMMA["P_unfav"] if combination_type == "SLU_fundamental" else 1.0
        elif a.type == "Q":
            cat = _category(a)
            is_main = (main_Q is not None and a.name == main_Q.name)
            if combination_type == "SLU_fundamental":
                f = GAMMA["Q_unfav"] if is_main else GAMMA["Q_unfav"] * PSI_0[cat]
            elif combination_type == "SLE_characteristic":
                f = 1.0 if is_main else PSI_0[cat]
            elif combination_type == "SLE_frequent":
                f = PSI_1[cat] if is_main else PSI_2[cat]
            elif combination_type == "SLE_quasi_permanent":
                f = PSI_2[cat]
            elif combination_type == "SLU_seismic":
                f = PSI_2[cat]
            elif combination_type == "SLU_accidental":
                f = PSI_1[cat] if is_main else PSI_2[cat]
            else:
                raise ValueError(f"Tipo {combination_type} sconosciuto")
        elif a.type == "E":
            f = 1.0 if combination_type == "SLU_seismic" else 0.0
        elif a.type == "A":
            f = 1.0 if combination_type == "SLU_accidental" else 0.0
        else:
            raise ValueError(f"Tipo azione '{a.type}' sconosciuto")

        factors[a.name] = f
        total += f * a.value

    main_name = main_Q.name if main_Q is not None else "—"
    return Combination(
        name=f"{combination_type}:Q_main={main_name}",
        type=combination_type, factors=factors, value=total,
    )


def enumerate_combinations(
    actions: list[Action],
    combination_type: CombinationType,
) -> list[Combination]:
    """Genera tutte le combinazioni per il tipo specificato.

    Per SLU_fundamental / SLE_characteristic / SLE_frequent / SLU_accidental
    enumera una combinazione per ogni Q candidata a Q_k1 (principale).

    Per SLE_quasi_permanent / SLU_seismic restituisce 1 sola combinazione.
    """
    q_actions = [a for a in actions if a.type == "Q"]
    if combination_type in ("SLE_quasi_permanent", "SLU_seismic"):
        return [combine_value(actions, combination_type, main_Q=None)]
    if not q_actions:
        return [combine_value(actions, combination_type, main_Q=None)]
    return [combine_value(actions, combination_type, main_Q=q) for q in q_actions]
