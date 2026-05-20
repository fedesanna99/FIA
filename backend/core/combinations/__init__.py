"""
Combinazioni di carico — NTC 2018 §2.5 / EN 1990.

Stati limite:
    SLU fondamentale          (2.5.1)
    SLE caratteristica/rara   (2.5.2)
    SLE frequente             (2.5.3)
    SLE quasi-permanente      (2.5.4)
    SLU sismica               (2.5.5)
    SLU eccezionale           (2.5.6)
"""
from .actions import Action, ActionType, LoadCategory
from .ntc2018 import (
    combine_value, enumerate_combinations,
    CombinationType, Combination,
    GAMMA, PSI_0, PSI_1, PSI_2,
)
from .envelope import envelope_scalar, EnvelopeResult

__all__ = [
    "Action", "ActionType", "LoadCategory",
    "combine_value", "enumerate_combinations",
    "CombinationType", "Combination",
    "GAMMA", "PSI_0", "PSI_1", "PSI_2",
    "envelope_scalar", "EnvelopeResult",
]
