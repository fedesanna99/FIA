"""Verifiche EN 1998-1 (Eurocodice 8 — strutture in zona sismica)."""
from .spectrum import (
    elastic_spectrum, design_spectrum,
    SpectrumType, GroundType, SpectrumParams,
    ground_parameters,
)
from .behavior_factor import (
    q_factor, BehaviorClass, StructuralSystem,
)
from .combinations import (
    seismic_combination, ψ_2,
    EA_combination,
)
from .zones import seismic_zone_ag, ITALY_ZONES

__all__ = [
    "elastic_spectrum", "design_spectrum",
    "SpectrumType", "GroundType", "SpectrumParams",
    "ground_parameters",
    "q_factor", "BehaviorClass", "StructuralSystem",
    "seismic_combination", "ψ_2", "EA_combination",
    "seismic_zone_ag", "ITALY_ZONES",
]
