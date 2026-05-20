"""
Resistenze di calcolo del legno — EN 1995-1-1 §2.4 + §6.

Formula generale (2.14):
    f_d = k_mod · f_k / γ_M

Dove:
    k_mod  : coefficiente di durata del carico e classe di servizio (Tab. 3.1)
    γ_M    : coefficiente parziale (NTC 2018: 1.50 per legno massiccio, 1.45 lamellare)

Classi di servizio (Tab. 1.1):
    1 — ambiente interno, umidità <65%       (es. interno riscaldato)
    2 — coperto, umidità <85%                (es. tettoia)
    3 — esterno esposto

Classi di durata del carico (Tab. 2.1):
    permanent    : carichi permanenti
    long_term    : > 6 mesi (es. magazzino)
    medium_term  : 1 sett. – 6 mesi (es. sovraccarico abitazioni)
    short_term   : < 1 sett. (es. neve a quote basse)
    instantaneous: < 5 min (es. vento)

Riferimento: EN 1995-1-1 Tab. 3.1, Tab. 2.3
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import Literal
from .timber_grades import TimberClass


ServiceClass = Literal[1, 2, 3]
LoadDuration = Literal[
    "permanent", "long_term", "medium_term", "short_term", "instantaneous",
]


# Tab. 3.1 EN 1995-1-1 — k_mod per legno massiccio / lamellare / LVL
# Indice: (service_class, load_duration) → k_mod
_K_MOD_SOLID_GLULAM: dict[tuple[int, str], float] = {
    (1, "permanent"):     0.60,
    (1, "long_term"):     0.70,
    (1, "medium_term"):   0.80,
    (1, "short_term"):    0.90,
    (1, "instantaneous"): 1.10,
    (2, "permanent"):     0.60,
    (2, "long_term"):     0.70,
    (2, "medium_term"):   0.80,
    (2, "short_term"):    0.90,
    (2, "instantaneous"): 1.10,
    (3, "permanent"):     0.50,
    (3, "long_term"):     0.55,
    (3, "medium_term"):   0.65,
    (3, "short_term"):    0.70,
    (3, "instantaneous"): 0.90,
}


def k_mod_value(service_class: ServiceClass, load_duration: LoadDuration) -> float:
    """k_mod per legno massiccio o lamellare (Tab. 3.1).

    NOTA: i valori coincidono per massiccio e lamellare nelle prime tre colonne
    della tabella; per LVL e altri materiali ingegnerizzati i valori sono diversi
    (non gestiti qui).
    """
    key = (int(service_class), load_duration)
    if key not in _K_MOD_SOLID_GLULAM:
        raise ValueError(
            f"Combinazione service_class={service_class}, "
            f"load_duration='{load_duration}' non valida"
        )
    return _K_MOD_SOLID_GLULAM[key]


def gamma_M_value(is_glulam: bool) -> float:
    """γ_M per legno (NTC 2018 §4.4.6 / EN 1995-1-1 §2.4.1).

        massiccio:  γ_M = 1.50
        lamellare:  γ_M = 1.45
    """
    return 1.45 if is_glulam else 1.50


@dataclass(frozen=True)
class TimberDesignResult:
    value: float           # resistenza di calcolo [Pa]
    f_k: float             # resistenza caratteristica
    k_mod: float
    gamma_M: float
    label: str             # es. "f_m,d", "f_t,0,d"
    notes: str = ""


def f_d(
    f_k: float, is_glulam: bool,
    service_class: ServiceClass,
    load_duration: LoadDuration,
    label: str = "f_d",
) -> TimberDesignResult:
    """Formula generale: f_d = k_mod · f_k / γ_M."""
    if f_k <= 0:
        raise ValueError("f_k deve essere positivo")
    km = k_mod_value(service_class, load_duration)
    gm = gamma_M_value(is_glulam)
    return TimberDesignResult(
        value=km * f_k / gm,
        f_k=f_k, k_mod=km, gamma_M=gm, label=label,
        notes=f"SC{service_class} {load_duration}",
    )


def f_t_0_d(tc: TimberClass, service_class: ServiceClass,
            load_duration: LoadDuration) -> TimberDesignResult:
    """Trazione parallela alle fibre."""
    return f_d(f_k=tc.f_t_0_k, is_glulam=tc.is_glulam,
               service_class=service_class, load_duration=load_duration,
               label="f_t,0,d")


def f_c_0_d(tc: TimberClass, service_class: ServiceClass,
            load_duration: LoadDuration) -> TimberDesignResult:
    """Compressione parallela alle fibre."""
    return f_d(f_k=tc.f_c_0_k, is_glulam=tc.is_glulam,
               service_class=service_class, load_duration=load_duration,
               label="f_c,0,d")


def f_m_d(tc: TimberClass, service_class: ServiceClass,
          load_duration: LoadDuration) -> TimberDesignResult:
    """Flessione."""
    return f_d(f_k=tc.f_m_k, is_glulam=tc.is_glulam,
               service_class=service_class, load_duration=load_duration,
               label="f_m,d")


def f_v_d(tc: TimberClass, service_class: ServiceClass,
          load_duration: LoadDuration) -> TimberDesignResult:
    """Taglio."""
    return f_d(f_k=tc.f_v_k, is_glulam=tc.is_glulam,
               service_class=service_class, load_duration=load_duration,
               label="f_v,d")
