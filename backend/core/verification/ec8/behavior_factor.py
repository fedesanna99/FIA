"""
Fattore di struttura q — EN 1998-1 §5.2, 6.3, 7.

Approccio semplificato per gli edifici regolari (formula generale):
    q = q_0 · k_w  ≥ 1.5

Dove:
    q_0 dipende dal sistema strutturale e dalla classe di duttilità (DC):
        - CA (EC8 Tab. 5.1):
            DCH (alta duttilità):  telai = 4.5 · α_u/α_1
            DCM (media duttilità): telai = 3.0 · α_u/α_1
        - Acciaio (EC8 Tab. 6.2):
            DCH telai: 5.0 · α_u/α_1
            DCM telai: 4.0
        - Legno (EC8 Tab. 8.1):
            DCH telai con connettori meccanici: 5.0
            DCM telai con connettori: 4.0
            DCL (bassa duttilità): 1.5

    k_w = 1.0 (telai in CA) | 0.5–1.0 (pareti)

Valori semplificati α_u/α_1:
    - Edifici a un piano:        α_u/α_1 = 1.1
    - Telai multi-piano regolari:α_u/α_1 = 1.3
"""
from __future__ import annotations
from typing import Literal


BehaviorClass = Literal["DCL", "DCM", "DCH"]
StructuralSystem = Literal[
    "frame_concrete", "wall_concrete",
    "frame_steel", "concentric_braced_steel", "eccentric_braced_steel",
    "frame_timber",
]


_Q0_TABLE: dict[tuple[str, str], float] = {
    # (system, class) -> q_0
    ("frame_concrete", "DCL"):  1.5,
    ("frame_concrete", "DCM"):  3.0,
    ("frame_concrete", "DCH"):  4.5,
    ("wall_concrete",  "DCL"):  1.5,
    ("wall_concrete",  "DCM"):  3.0,
    ("wall_concrete",  "DCH"):  4.0,
    ("frame_steel",    "DCL"):  1.5,
    ("frame_steel",    "DCM"):  4.0,
    ("frame_steel",    "DCH"):  5.0,
    ("concentric_braced_steel", "DCL"): 1.5,
    ("concentric_braced_steel", "DCM"): 2.5,  # X-bracing
    ("concentric_braced_steel", "DCH"): 4.0,
    ("eccentric_braced_steel",  "DCM"): 4.0,
    ("eccentric_braced_steel",  "DCH"): 6.0,
    ("frame_timber",   "DCL"):  1.5,
    ("frame_timber",   "DCM"):  4.0,
    ("frame_timber",   "DCH"):  5.0,
}


def q_factor(
    system: StructuralSystem,
    ductility_class: BehaviorClass,
    alpha_u_over_alpha_1: float = 1.3,
    k_w: float = 1.0,
) -> float:
    """Fattore di struttura q = q_0 · α_u/α_1 · k_w ≥ 1.5.

    Args:
        system               : tipologia strutturale
        ductility_class      : DCL / DCM / DCH
        alpha_u_over_alpha_1 : sovra-resistenza (1.0 ÷ 1.5; default 1.3)
        k_w                  : per pareti (default 1.0)
    """
    key = (system, ductility_class)
    if key not in _Q0_TABLE:
        raise ValueError(
            f"Combinazione system='{system}', class='{ductility_class}' non gestita"
        )
    if alpha_u_over_alpha_1 < 1.0 or alpha_u_over_alpha_1 > 1.5:
        raise ValueError("α_u/α_1 deve essere fra 1.0 e 1.5")
    if not 0.0 < k_w <= 1.0:
        raise ValueError("k_w deve essere fra 0 e 1.0")
    q0 = _Q0_TABLE[key]
    # alpha_u/alpha_1 si applica solo a sistemi a duttilità DCM/DCH; per DCL
    # rimane q = q_0
    if ductility_class == "DCL":
        q = q0
    else:
        q = q0 * alpha_u_over_alpha_1
    q = q * k_w
    return max(q, 1.5)
