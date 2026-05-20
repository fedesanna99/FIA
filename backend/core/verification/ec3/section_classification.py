"""
Classificazione delle sezioni in acciaio secondo EN 1993-1-1 §5.5 (Tab. 5.2).

Per profili a doppio T (IPE/HEA/HEB/HEM) la classe è il MASSIMO fra le classi
calcolate per anima e ali:

ALA (parte a sbalzo, compressa):
    c_f = (b - tw - 2 r) / 2
    Classe 1: c_f / tf ≤  9 ε
    Classe 2: c_f / tf ≤ 10 ε
    Classe 3: c_f / tf ≤ 14 ε
    altrimenti Classe 4

ANIMA (interna, sollecitazione varia):
- Compressione pura:
    Classe 1: c_w / tw ≤ 33 ε
    Classe 2: c_w / tw ≤ 38 ε
    Classe 3: c_w / tw ≤ 42 ε
- Flessione pura:
    Classe 1: c_w / tw ≤ 72 ε
    Classe 2: c_w / tw ≤ 83 ε
    Classe 3: c_w / tw ≤ 124 ε

con c_w = h - 2 tf - 2 r   (altezza netta anima)
e   ε = √(235 / f_y)        (f_y in MPa)
"""
from __future__ import annotations
from dataclasses import dataclass
from enum import IntEnum
from typing import Literal, Optional
import math


class SectionClass(IntEnum):
    CLASS_1 = 1  # plastica (cerniera + rotazione)
    CLASS_2 = 2  # plastica (cerniera senza rotazione)
    CLASS_3 = 3  # elastica
    CLASS_4 = 4  # snella (instabilità locale)


def epsilon(fy_MPa: float) -> float:
    """ε = √(235 / f_y), con f_y in MPa.

    Esempi: S235 → ε=1.000;  S355 → ε≈0.814;  S460 → ε≈0.715.
    """
    if fy_MPa <= 0:
        raise ValueError("f_y deve essere positivo")
    return math.sqrt(235.0 / fy_MPa)


@dataclass(frozen=True)
class ClassificationResult:
    section_class: SectionClass
    web_class: SectionClass
    flange_class: SectionClass
    cf_over_tf: float
    cw_over_tw: float
    epsilon: float
    notes: str = ""


def _classify_outstand_flange(cf_over_tf: float, eps: float) -> SectionClass:
    """Ala a sbalzo in compressione (EN 1993-1-1 Tab. 5.2 sheet 2)."""
    if cf_over_tf <= 9 * eps:
        return SectionClass.CLASS_1
    if cf_over_tf <= 10 * eps:
        return SectionClass.CLASS_2
    if cf_over_tf <= 14 * eps:
        return SectionClass.CLASS_3
    return SectionClass.CLASS_4


def _classify_web(cw_over_tw: float, eps: float, loading: str) -> SectionClass:
    """Anima interna (EN 1993-1-1 Tab. 5.2 sheet 1).

    loading = "compression" | "bending" | "combined" (semplificato a "compression")
    """
    if loading == "bending":
        # parte interna soggetta a flessione (α = 0.5)
        if cw_over_tw <= 72 * eps:
            return SectionClass.CLASS_1
        if cw_over_tw <= 83 * eps:
            return SectionClass.CLASS_2
        if cw_over_tw <= 124 * eps:
            return SectionClass.CLASS_3
        return SectionClass.CLASS_4
    # compression o combined → uso compressione (conservativo per N + M)
    if cw_over_tw <= 33 * eps:
        return SectionClass.CLASS_1
    if cw_over_tw <= 38 * eps:
        return SectionClass.CLASS_2
    if cw_over_tw <= 42 * eps:
        return SectionClass.CLASS_3
    return SectionClass.CLASS_4


def classify_section(
    h: float, b: float, tw: float, tf: float, r: float,
    fy_MPa: float,
    loading: Literal["compression", "bending", "combined"] = "bending",
) -> ClassificationResult:
    """Classifica una sezione a doppio T (IPE/HEA/HEB/HEM/UB/UC).

    Args:
        h, b, tw, tf, r : dimensioni in METRI (h=altezza, b=larghezza ala,
                          tw=spessore anima, tf=spessore ala, r=raccordo)
        fy_MPa          : tensione di snervamento in MPa
        loading         : tipo di sollecitazione dominante sull'anima
                          ("compression", "bending", "combined")

    Returns:
        ClassificationResult con classi parziali e totale (max).
    """
    if min(h, b, tw, tf) <= 0:
        raise ValueError("Dimensioni positive richieste")
    if r < 0:
        raise ValueError("Raggio r non può essere negativo")

    eps = epsilon(fy_MPa)
    cf = (b - tw - 2 * r) / 2.0
    cw = h - 2 * tf - 2 * r
    cf_tf = cf / tf
    cw_tw = cw / tw

    flange_cls = _classify_outstand_flange(cf_tf, eps)
    web_cls = _classify_web(cw_tw, eps, loading)

    return ClassificationResult(
        section_class=SectionClass(max(int(web_cls), int(flange_cls))),
        web_class=web_cls,
        flange_class=flange_cls,
        cf_over_tf=cf_tf,
        cw_over_tw=cw_tw,
        epsilon=eps,
        notes=f"loading={loading}, ε={eps:.4f}",
    )


def classify_from_section(section, fy_MPa: float,
                          loading: str = "bending") -> Optional[ClassificationResult]:
    """Helper: classifica una `Section` Pydantic se ha i dati EC3 disponibili.

    Restituisce None se la sezione non è un profilo a doppio T con tf, tw, r noti.
    """
    if section.type != "I_profile":
        return None
    if section.tf is None or section.tw is None or section.h is None or section.b is None:
        return None
    r = section.r if section.r is not None else 0.0
    return classify_section(
        h=section.h, b=section.b,
        tw=section.tw, tf=section.tf, r=r,
        fy_MPa=fy_MPa, loading=loading,
    )
