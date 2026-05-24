"""Test parametrico EC3 §5.5 section classification per IPE/HEA/HEB.

v2.4.8-ec3-section-class-coverage (Sprint 3 del compound v2.4.x).

Coverage sistematica sul catalogo profili reale di FEA Pro:
- IPE 100..500 (8 profili)
- HEA 100..300 (4 profili)
- HEB 100..300 (4 profili)
Acciai testati: S235 e S355.

Test assertion: la classe ritornata da `classify_section()` deve coincidere
esattamente con la classe attesa pre-calcolata da EN 1993-1-1 Tab. 5.2.
Se il fix di un bug futuro cambia l'output anche per un solo profilo,
questo test cattura la regressione.
"""
from __future__ import annotations
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.abspath(os.path.join(HERE, "..", "..")))
sys.path.insert(0, os.path.abspath(os.path.join(HERE, "..")))

import pytest

from schemas import SECTIONS_DB
from core.verification.ec3.section_classification import (
    classify_section, SectionClass,
)

from verification._ec3_section_class_expected import (
    IPE_S235, HEA_S235, HEB_S235, HEM_S235,
    IPE_S355, HEA_S355, HEB_S355, HEM_S355,
)


def _classify_from_catalog(sid: str, fy_MPa: float, loading: str):
    """Helper: classifica profilo del catalogo via dimensioni reali."""
    sec = SECTIONS_DB[sid]
    return classify_section(
        h=sec.h, b=sec.b, tw=sec.tw, tf=sec.tf, r=sec.r or 0.0,
        fy_MPa=fy_MPa, loading=loading,
    )


# ── IPE S235 ──────────────────────────────────────────────────────────────


@pytest.mark.parametrize("sid,fy,exp_comp,exp_bend", IPE_S235)
def test_ipe_s235_classification(sid, fy, exp_comp, exp_bend):
    """IPE S235 — pure compression + pure bending vs EC3 §5.5 ground truth."""
    r_comp = _classify_from_catalog(sid, fy, "compression")
    r_bend = _classify_from_catalog(sid, fy, "bending")

    assert int(r_comp.section_class) == exp_comp, (
        f"{sid} S{fy} compression: atteso Cl{exp_comp}, "
        f"ottenuto Cl{int(r_comp.section_class)} "
        f"(c_f/tf={r_comp.cf_over_tf:.2f}, c_w/tw={r_comp.cw_over_tw:.2f})"
    )
    assert int(r_bend.section_class) == exp_bend, (
        f"{sid} S{fy} bending: atteso Cl{exp_bend}, "
        f"ottenuto Cl{int(r_bend.section_class)}"
    )


# ── HEA S235 ──────────────────────────────────────────────────────────────


@pytest.mark.parametrize("sid,fy,exp_comp,exp_bend", HEA_S235)
def test_hea_s235_classification(sid, fy, exp_comp, exp_bend):
    """HEA S235 — pure compression + pure bending."""
    r_comp = _classify_from_catalog(sid, fy, "compression")
    r_bend = _classify_from_catalog(sid, fy, "bending")
    assert int(r_comp.section_class) == exp_comp
    assert int(r_bend.section_class) == exp_bend


# ── HEB S235 ──────────────────────────────────────────────────────────────


@pytest.mark.parametrize("sid,fy,exp_comp,exp_bend", HEB_S235)
def test_heb_s235_classification(sid, fy, exp_comp, exp_bend):
    """HEB S235 — pure compression + pure bending (profili tozzi → Cl 1 fino a HEB 600)."""
    r_comp = _classify_from_catalog(sid, fy, "compression")
    r_bend = _classify_from_catalog(sid, fy, "bending")
    assert int(r_comp.section_class) == exp_comp
    assert int(r_bend.section_class) == exp_bend


# ── HEM S235 ──────────────────────────────────────────────────────────────


@pytest.mark.parametrize("sid,fy,exp_comp,exp_bend", HEM_S235)
def test_hem_s235_classification(sid, fy, exp_comp, exp_bend):
    """HEM S235 — sezioni a parete pesante, Cl 1 fino a HEM 800."""
    r_comp = _classify_from_catalog(sid, fy, "compression")
    r_bend = _classify_from_catalog(sid, fy, "bending")
    assert int(r_comp.section_class) == exp_comp
    assert int(r_bend.section_class) == exp_bend


# ── IPE S355 ──────────────────────────────────────────────────────────────


@pytest.mark.parametrize("sid,fy,exp_comp,exp_bend", IPE_S355)
def test_ipe_s355_classification(sid, fy, exp_comp, exp_bend):
    """IPE S355 — ε ridotto a 0.814, thresholds più severi."""
    r_comp = _classify_from_catalog(sid, fy, "compression")
    r_bend = _classify_from_catalog(sid, fy, "bending")
    assert int(r_comp.section_class) == exp_comp, (
        f"{sid} S{fy} compression: atteso Cl{exp_comp}, "
        f"ottenuto Cl{int(r_comp.section_class)} (ε={r_comp.epsilon:.3f})"
    )
    assert int(r_bend.section_class) == exp_bend


# ── HEA S355 ──────────────────────────────────────────────────────────────


@pytest.mark.parametrize("sid,fy,exp_comp,exp_bend", HEA_S355)
def test_hea_s355_classification(sid, fy, exp_comp, exp_bend):
    """HEA S355 — flange c_f/tf può salire di classe rispetto a S235."""
    r_comp = _classify_from_catalog(sid, fy, "compression")
    r_bend = _classify_from_catalog(sid, fy, "bending")
    assert int(r_comp.section_class) == exp_comp
    assert int(r_bend.section_class) == exp_bend


# ── HEB S355 ──────────────────────────────────────────────────────────────


@pytest.mark.parametrize("sid,fy,exp_comp,exp_bend", HEB_S355)
def test_heb_s355_classification(sid, fy, exp_comp, exp_bend):
    """HEB S355 — Cl 1 fino a HEB 450, progressive degradazione poi."""
    r_comp = _classify_from_catalog(sid, fy, "compression")
    r_bend = _classify_from_catalog(sid, fy, "bending")
    assert int(r_comp.section_class) == exp_comp
    assert int(r_bend.section_class) == exp_bend


# ── HEM S355 ──────────────────────────────────────────────────────────────


@pytest.mark.parametrize("sid,fy,exp_comp,exp_bend", HEM_S355)
def test_hem_s355_classification(sid, fy, exp_comp, exp_bend):
    """HEM S355 — Cl 1 fino a HEM 650, web slender solo per HEM 800+."""
    r_comp = _classify_from_catalog(sid, fy, "compression")
    r_bend = _classify_from_catalog(sid, fy, "bending")
    assert int(r_comp.section_class) == exp_comp
    assert int(r_bend.section_class) == exp_bend


# ── Sanity checks ─────────────────────────────────────────────────────────


def test_ipe_300_s235_pure_bending_class_1():
    """Sanity: IPE 300 S235 pure bending Cl 1 (web c_w/tw=35 << 72ε=72)."""
    r = _classify_from_catalog("ipe_300", 235, "bending")
    assert r.section_class == SectionClass.CLASS_1


def test_ipe_500_s235_pure_compression_class_3():
    """Sanity: IPE 500 S235 pure compression Cl 3 (web borderline)."""
    r = _classify_from_catalog("ipe_500", 235, "compression")
    assert r.section_class == SectionClass.CLASS_3


def test_ipe_300_s355_pure_compression_class_4():
    """Sanity: IPE 300 S355 pure compression Cl 4 (slender web, ε=0.814)."""
    r = _classify_from_catalog("ipe_300", 355, "compression")
    assert r.section_class == SectionClass.CLASS_4


def test_hea_300_s355_flange_drives_class():
    """HEA 300 S355: la flange c_f/tf=8.48 supera 10ε=8.14, Cl 3."""
    r = _classify_from_catalog("hea_300", 355, "compression")
    assert r.flange_class == SectionClass.CLASS_3
    assert r.section_class == SectionClass.CLASS_3


def test_epsilon_s235_is_one():
    """ε(S235) = 1 esatto."""
    from core.verification.ec3.section_classification import epsilon
    assert epsilon(235.0) == pytest.approx(1.0, rel=1e-9)


def test_epsilon_s355_correct():
    """ε(S355) = √(235/355) ≈ 0.8136."""
    import math
    from core.verification.ec3.section_classification import epsilon
    assert epsilon(355.0) == pytest.approx(math.sqrt(235.0 / 355.0), rel=1e-9)
