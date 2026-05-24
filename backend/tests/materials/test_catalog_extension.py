"""Regression test catalogo materiali esteso v2.4.8.2.

Verifica:
- acciai EN 10025-2 (S235..S460) disponibili e con fy corretto
- calcestruzzi EN 1992-1-1 Tab. 3.1 disponibili e con fck corretto
- helper `materials/__init__.py` funzionante
- nessuna regressione al catalogo Material esistente
"""
from __future__ import annotations
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.abspath(os.path.join(HERE, "..", "..")))

import pytest


# ── Acciai EN 10025-2 ────────────────────────────────────────────────────


def test_steel_s420_available():
    from materials import get_steel_grade
    s = get_steel_grade("S420")
    assert s.fy == 420e6
    # S420: f_u >= 500 MPa (EN 10025-2 Tab. 4)
    # Note: il catalogo Material non popola f_u; verifichiamo fy + E
    assert s.E == 210e9


def test_steel_s460_available():
    from materials import get_steel_grade
    s = get_steel_grade("S460")
    assert s.fy == 460e6
    assert s.E == 210e9


@pytest.mark.parametrize("grade,expected_fy", [
    ("S235", 235e6),
    ("S275", 275e6),
    ("S355", 355e6),
    ("S420", 420e6),
    ("S460", 460e6),
])
def test_steel_grades_fy(grade, expected_fy):
    from materials import get_steel_grade
    s = get_steel_grade(grade)
    assert s.fy == expected_fy


def test_steel_catalog_size():
    """Catalogo acciai deve essere ≥ 5 grades (EN 10025-2 base)."""
    from materials import list_steel_grades
    grades = list_steel_grades()
    assert len(grades) >= 5
    assert {"S235", "S275", "S355", "S420", "S460"}.issubset(set(grades))


# ── Calcestruzzi EN 1992-1-1 Tab. 3.1 ────────────────────────────────────


@pytest.mark.parametrize("grade,expected_fck", [
    ("C12/15", 12e6),
    ("C16/20", 16e6),
    ("C20/25", 20e6),
    ("C25/30", 25e6),
    ("C30/37", 30e6),
    ("C35/45", 35e6),
    ("C40/50", 40e6),
    ("C45/55", 45e6),
    ("C50/60", 50e6),
    ("C55/67", 55e6),
    ("C60/75", 60e6),
])
def test_concrete_grades_available(grade, expected_fck):
    from materials import get_concrete_grade
    c = get_concrete_grade(grade)
    assert c.fck == expected_fck


def test_concrete_catalog_size():
    """Catalogo calcestruzzi deve essere ≥ 7 grades (EC2 base)."""
    from materials import list_concrete_grades
    grades = list_concrete_grades()
    assert len(grades) >= 7
    # Verifica almeno la base EC2 standard
    assert {"C20/25", "C25/30", "C30/37", "C35/45", "C40/50",
            "C45/55", "C50/60"}.issubset(set(grades))


def test_concrete_E_increases_with_fck():
    """Modulo E_cm deve crescere monotonicamente con fck (EC2 §3.1.3)."""
    from materials import get_concrete_grade, list_concrete_grades
    grades = list_concrete_grades()
    E_values = [get_concrete_grade(g).E for g in grades]
    # crescita non strettamente monotona (alcuni grades hanno stesso E_cm
    # arrotondato), ma deve essere non-decrescente
    for prev_E, next_E in zip(E_values, E_values[1:]):
        assert next_E >= prev_E


# ── Legni EN 338 + EN 14080 ──────────────────────────────────────────────


@pytest.mark.parametrize("grade", ["C24", "C30", "GL24h", "GL28h"])
def test_timber_grades_available(grade):
    from materials import get_timber_grade
    m = get_timber_grade(grade)
    assert m.E > 0
    assert m.rho > 0


def test_timber_catalog_size():
    """Catalogo legni ≥ 4 (coverage parziale EN 338, gap noto #15)."""
    from materials import list_timber_grades
    grades = list_timber_grades()
    assert len(grades) >= 4


# ── Error handling ───────────────────────────────────────────────────────


def test_unknown_steel_grade_raises():
    from materials import get_steel_grade, MaterialNotFoundError
    with pytest.raises(MaterialNotFoundError):
        get_steel_grade("S999")


def test_unknown_concrete_grade_raises():
    from materials import get_concrete_grade, MaterialNotFoundError
    with pytest.raises(MaterialNotFoundError):
        get_concrete_grade("C999/999")


# ── Backward compat ──────────────────────────────────────────────────────


def test_materials_db_still_accessible():
    """MATERIALS_DB rimane accessibile via schemas (no rottura import esistenti)."""
    from schemas import MATERIALS_DB
    assert "steel_s235" in MATERIALS_DB
    assert "concrete_c50" in MATERIALS_DB     # v2.4.8.2 nuovo
    assert "concrete_c12" in MATERIALS_DB     # v2.4.8.2 nuovo (low-end EC2)


def test_get_material_by_id_helper():
    from materials import get_material_by_id
    m = get_material_by_id("steel_s355")
    assert m.id == "steel_s355"
    assert m.fy == 355e6
