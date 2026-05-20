"""
Zone sismiche italiane — accelerazioni di picco a_g per il SLV (T_R = 475 anni).

NOTA: i valori reali di a_g dipendono dalle coordinate geografiche (microzonazione
basata sulla mappa INGV MPS04). Qui forniamo solo una semplificazione per le
4 zone sismiche storiche di OPCM 3274/2003, ancora usata come default rapido.

I valori puntuali per le città italiane si ottengono interpolando la mappa
INGV: questo lookup è demandato a una fase successiva (Fase 13 — accelerogrammi
reali da INGV).

Riferimento: OPCM 3274/2003 (zonazione semplificata).
"""
from __future__ import annotations
from typing import Literal


SeismicZone = Literal[1, 2, 3, 4]

# OPCM 3274 — a_g [g] su suolo rigido (categoria A), T_R=475 anni
ITALY_ZONES: dict[int, float] = {
    1: 0.35,   # zona 1: ag ≥ 0.25 g (rappresentativa 0.35)
    2: 0.25,   # zona 2: 0.15 ≤ ag < 0.25 (rappr. 0.20 → conservativo 0.25)
    3: 0.15,   # zona 3: 0.05 ≤ ag < 0.15 (rappr. 0.10 → 0.15)
    4: 0.05,   # zona 4: ag < 0.05 g
}


def seismic_zone_ag(zone: SeismicZone, in_g: bool = True) -> float:
    """Restituisce a_g per una zona sismica italiana.

    Args:
        zone : 1, 2, 3 o 4
        in_g : se True ritorna in g (default); se False in m/s²
    """
    if zone not in ITALY_ZONES:
        raise ValueError(f"Zona sismica '{zone}' non valida (usa 1-4)")
    ag = ITALY_ZONES[zone]
    return ag if in_g else ag * 9.81
