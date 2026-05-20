"""Verifiche EN 1995-1-1 (Eurocodice 5 — strutture in legno)."""
from .timber_grades import (
    TimberClass, get_timber_class,
    TIMBER_CLASSES,
)
from .resistance import (
    f_d, f_t_0_d, f_c_0_d, f_m_d, f_v_d,
    k_mod_value, gamma_M_value,
    ServiceClass, LoadDuration,
    TimberDesignResult,
)

__all__ = [
    "TimberClass", "get_timber_class", "TIMBER_CLASSES",
    "f_d", "f_t_0_d", "f_c_0_d", "f_m_d", "f_v_d",
    "k_mod_value", "gamma_M_value",
    "ServiceClass", "LoadDuration",
    "TimberDesignResult",
]
