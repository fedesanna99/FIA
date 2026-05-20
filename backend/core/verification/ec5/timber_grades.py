"""
Classi di legno strutturale — EN 338 (massiccio) ed EN 14080 (lamellare).

Valori caratteristici principali (MPa) per le classi più usate:

LEGNO MASSICCIO (EN 338):
    C24    f_m,k=24    f_t,0,k=14    f_c,0,k=21    f_v,k=4.0    E_0,mean=11000
    C30    f_m,k=30    f_t,0,k=18    f_c,0,k=23    f_v,k=4.0    E_0,mean=12000

LEGNO LAMELLARE (EN 14080):
    GL24h  f_m,k=24    f_t,0,k=19.2  f_c,0,k=24    f_v,k=3.5    E_0,mean=11500
    GL28h  f_m,k=28    f_t,0,k=22.3  f_c,0,k=28    f_v,k=3.5    E_0,mean=12600
"""
from __future__ import annotations
from dataclasses import dataclass


@dataclass(frozen=True)
class TimberClass:
    id: str
    name: str
    is_glulam: bool
    f_m_k: float        # flessione [Pa]
    f_t_0_k: float      # trazione parallela alle fibre [Pa]
    f_t_90_k: float     # trazione perpendicolare [Pa]
    f_c_0_k: float      # compressione parallela [Pa]
    f_c_90_k: float     # compressione perpendicolare [Pa]
    f_v_k: float        # taglio [Pa]
    E_0_mean: float     # modulo elastico parallelo [Pa]
    G_mean: float       # modulo di taglio [Pa]
    rho_k: float        # densità caratteristica [kg/m³]


TIMBER_CLASSES: dict[str, TimberClass] = {
    "C24": TimberClass(
        id="C24", name="Legno massiccio C24", is_glulam=False,
        f_m_k=24e6, f_t_0_k=14e6, f_t_90_k=0.4e6,
        f_c_0_k=21e6, f_c_90_k=2.5e6, f_v_k=4.0e6,
        E_0_mean=11.0e9, G_mean=0.69e9, rho_k=350.0,
    ),
    "C30": TimberClass(
        id="C30", name="Legno massiccio C30", is_glulam=False,
        f_m_k=30e6, f_t_0_k=18e6, f_t_90_k=0.4e6,
        f_c_0_k=23e6, f_c_90_k=2.7e6, f_v_k=4.0e6,
        E_0_mean=12.0e9, G_mean=0.75e9, rho_k=380.0,
    ),
    "GL24h": TimberClass(
        id="GL24h", name="Legno lamellare GL24h", is_glulam=True,
        f_m_k=24e6, f_t_0_k=19.2e6, f_t_90_k=0.5e6,
        f_c_0_k=24e6, f_c_90_k=2.5e6, f_v_k=3.5e6,
        E_0_mean=11.5e9, G_mean=0.72e9, rho_k=385.0,
    ),
    "GL28h": TimberClass(
        id="GL28h", name="Legno lamellare GL28h", is_glulam=True,
        f_m_k=28e6, f_t_0_k=22.3e6, f_t_90_k=0.5e6,
        f_c_0_k=28e6, f_c_90_k=3.0e6, f_v_k=3.5e6,
        E_0_mean=12.6e9, G_mean=0.78e9, rho_k=425.0,
    ),
}


def get_timber_class(class_id: str) -> TimberClass:
    """Restituisce la TimberClass dato il suo id (es. 'C24', 'GL24h')."""
    if class_id not in TIMBER_CLASSES:
        raise ValueError(
            f"Classe '{class_id}' sconosciuta. "
            f"Disponibili: {sorted(TIMBER_CLASSES)}"
        )
    return TIMBER_CLASSES[class_id]
