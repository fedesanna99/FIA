"""Verifiche EN 1992-1-1 (Eurocodice 2 — strutture in calcestruzzo armato)."""
from .bending import (
    M_Rd_rectangular, design_strength_fcd, design_strength_fyd,
    minimum_reinforcement, BendingResult,
)
from .shear import V_Rd_c, V_Rd_s, V_Rd_max, ShearResult

GAMMA_C = 1.5   # NTC 2018 §4.1.2
GAMMA_S = 1.15  # NTC 2018 §4.1.2
ALPHA_CC = 0.85  # coefficiente di lunga durata (NTC: 0.85, EC base: 1.0)

__all__ = [
    "M_Rd_rectangular", "design_strength_fcd", "design_strength_fyd",
    "minimum_reinforcement", "BendingResult",
    "V_Rd_c", "V_Rd_s", "V_Rd_max", "ShearResult",
    "GAMMA_C", "GAMMA_S", "ALPHA_CC",
]
