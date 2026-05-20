"""
Definizione delle azioni strutturali secondo NTC 2018 §2.5.

Tipi di azione:
    G1 : permanenti strutturali (peso proprio)
    G2 : permanenti non strutturali (finiture, impianti)
    P  : pre-sollecitazione
    Q  : variabili (sovraccarichi, neve, vento, temperatura)
    E  : sismica
    A  : eccezionale (es. urto)
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import Literal, Optional


ActionType = Literal["G1", "G2", "P", "Q", "E", "A"]

# Categorie carichi variabili (NTC 2018 Tab. 2.5.I)
LoadCategory = Literal[
    "A_residential",       # cat A: residenziale
    "B_office",            # cat B: uffici
    "C_assembly",          # cat C: luoghi affollati (scuole, teatri)
    "D_shopping",          # cat D: commerciale
    "E_storage",           # cat E: deposito
    "F_parking_light",     # cat F: parcheggio veicoli ≤30 kN
    "G_parking_heavy",     # cat G: parcheggio veicoli >30 kN
    "H_roof",              # cat H: coperture non praticabili
    "snow_low",            # neve, quota ≤ 1000 m
    "snow_high",           # neve, quota > 1000 m
    "wind",                # vento
    "temperature",         # variazione termica
]


@dataclass(frozen=True)
class Action:
    """Singola azione caratteristica.

    Args:
        name     : identificatore (es. "G1_peso_proprio", "Q_neve")
        type     : G1/G2/P/Q/E/A
        value    : valore caratteristico (kN, kN/m, kN/m², ecc. a seconda del contesto)
        category : per Q soltanto, categoria d'uso (ψ_0,1,2)
    """
    name: str
    type: ActionType
    value: float
    category: Optional[LoadCategory] = None

    def __post_init__(self):
        if self.type == "Q" and self.category is None:
            raise ValueError(
                f"Azione variabile '{self.name}' richiede una categoria"
            )
        if self.type != "Q" and self.category is not None:
            # Non bloccante ma chiariamo: G1/G2/P/E/A non usano ψ
            pass
