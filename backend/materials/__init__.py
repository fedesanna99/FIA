"""High-level helpers per il catalogo materiali EN 1992/1993.

v2.4.8.2 — facade sopra `schemas.MATERIALS_DB`. Espone API a designazione
canonica EN (es. "S420", "C50/60") invece degli id interni (`steel_s420`,
`concrete_c50`).

Utilizzato dall'UI per popolare dropdown materiali e dal test parametrico
per verificare la coverage del catalogo.
"""
from __future__ import annotations

from schemas.material import MATERIALS_DB, Material


# Mapping designazione canonica EN → id interno MATERIALS_DB
_STEEL_GRADES_MAP: dict[str, str] = {
    "S235": "steel_s235",
    "S275": "steel_s275",
    "S355": "steel_s355",
    "S420": "steel_s420",
    "S460": "steel_s460",
}

_CONCRETE_GRADES_MAP: dict[str, str] = {
    "C12/15": "concrete_c12",
    "C16/20": "concrete_c16",
    "C20/25": "concrete_c20",
    "C25/30": "concrete_c25",
    "C30/37": "concrete_c30",
    "C35/45": "concrete_c35",
    "C40/50": "concrete_c40",
    "C45/55": "concrete_c45",
    "C50/60": "concrete_c50",
    "C55/67": "concrete_c55",
    "C60/75": "concrete_c60",
}

_TIMBER_GRADES_MAP: dict[str, str] = {
    "C24":    "timber_c24",
    "C30":    "timber_c30",
    "GL24h":  "glulam_gl24h",
    "GL28h":  "glulam_gl28h",
}


class MaterialNotFoundError(KeyError):
    """Sollevata quando la designazione materiale non è nel catalogo."""


def _get(grade: str, mapping: dict[str, str], kind: str) -> Material:
    internal_id = mapping.get(grade)
    if internal_id is None:
        raise MaterialNotFoundError(
            f"{kind} grade '{grade}' non in catalogo. "
            f"Disponibili: {list(mapping.keys())}"
        )
    mat = MATERIALS_DB.get(internal_id)
    if mat is None:
        raise MaterialNotFoundError(
            f"{kind} '{grade}' mappato a '{internal_id}' ma assente da MATERIALS_DB"
        )
    return mat


def get_steel_grade(grade: str) -> Material:
    """Recupera un acciaio EN 10025 per designazione canonica (es. 'S420')."""
    return _get(grade, _STEEL_GRADES_MAP, "Steel")


def get_concrete_grade(grade: str) -> Material:
    """Recupera un calcestruzzo EN 1992-1-1 (es. 'C50/60')."""
    return _get(grade, _CONCRETE_GRADES_MAP, "Concrete")


def get_timber_grade(grade: str) -> Material:
    """Recupera un legno EN 338 / EN 14080 (es. 'C24', 'GL28h')."""
    return _get(grade, _TIMBER_GRADES_MAP, "Timber")


def list_steel_grades() -> list[str]:
    """Lista designazioni acciaio disponibili (EN 10025-2)."""
    return list(_STEEL_GRADES_MAP.keys())


def list_concrete_grades() -> list[str]:
    """Lista designazioni calcestruzzo disponibili (EN 1992-1-1 Tab. 3.1)."""
    return list(_CONCRETE_GRADES_MAP.keys())


def list_timber_grades() -> list[str]:
    """Lista designazioni legno disponibili (EN 338 + EN 14080).

    Nota: copertura attuale parziale rispetto a 27 classi EN 338 totali
    (#15 BACKLOG aperto per estensione futura).
    """
    return list(_TIMBER_GRADES_MAP.keys())


# Accessor coerente al modulo `Material` (BaseModel) per casi avanzati
def get_material_by_id(internal_id: str) -> Material:
    """Recupera materiale per id interno (es. 'steel_s420'). Più granulare di get_steel_grade."""
    mat = MATERIALS_DB.get(internal_id)
    if mat is None:
        raise MaterialNotFoundError(f"id '{internal_id}' non in MATERIALS_DB")
    return mat


__all__ = [
    "Material",
    "MaterialNotFoundError",
    "get_steel_grade",
    "get_concrete_grade",
    "get_timber_grade",
    "list_steel_grades",
    "list_concrete_grades",
    "list_timber_grades",
    "get_material_by_id",
]
