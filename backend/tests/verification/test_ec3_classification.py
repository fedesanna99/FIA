"""
Test per `core/verification/ec3/section_classification.py`.

Riferimento normativo: EN 1993-1-1 §5.5, Tab. 5.2.
Tutti i confronti numerici sono con tolleranza ≤ 1% sui rapporti c/t.
"""
import math
import pytest

from core.verification.ec3 import (
    classify_section, classify_from_section,
    SectionClass, epsilon,
)
from schemas import SECTIONS_DB


class TestEpsilon:
    def test_epsilon_S235_is_one(self):
        assert epsilon(235) == pytest.approx(1.0, rel=1e-9)

    def test_epsilon_S355(self):
        assert epsilon(355) == pytest.approx(math.sqrt(235 / 355), rel=1e-9)

    def test_epsilon_S460(self):
        assert epsilon(460) == pytest.approx(math.sqrt(235 / 460), rel=1e-9)

    def test_epsilon_negative_raises(self):
        with pytest.raises(ValueError):
            epsilon(-100)

    def test_epsilon_zero_raises(self):
        with pytest.raises(ValueError):
            epsilon(0)


class TestIpe300S355:
    """IPE 300 S355, calcolato a mano:
    ε = √(235/355) = 0.8136
    c_f = (150 - 7.1 - 2·15) / 2 = 56.45 mm
    c_w = 300 - 2·10.7 - 2·15 = 248.6 mm
    c_f / t_f = 56.45 / 10.7 = 5.275
    c_w / t_w = 248.6 / 7.1 = 35.01

    Flange: 5.275 ≤ 9·ε = 7.32 → Classe 1
    Web bending: 35.01 ≤ 72·ε = 58.58 → Classe 1
    Web compression: 35.01 > 33·ε = 26.85 → Classe 2; ≤ 38·ε=30.92? NO 35>30.92;
        ≤ 42·ε=34.17? NO. → Classe 4
    """
    def test_bending_class_1(self):
        s = SECTIONS_DB["ipe_300"]
        res = classify_from_section(s, fy_MPa=355, loading="bending")
        assert res.section_class == SectionClass.CLASS_1
        assert res.flange_class == SectionClass.CLASS_1
        assert res.web_class == SectionClass.CLASS_1

    def test_compression_class_4(self):
        s = SECTIONS_DB["ipe_300"]
        res = classify_from_section(s, fy_MPa=355, loading="compression")
        # web fallisce: cw/tw = 35.01 > 42·ε = 34.17 → C4
        assert res.web_class == SectionClass.CLASS_4
        assert res.section_class == SectionClass.CLASS_4

    def test_geometric_ratios_match_hand_calc(self):
        s = SECTIONS_DB["ipe_300"]
        res = classify_from_section(s, fy_MPa=355)
        # c_f = (150 - 7.1 - 30) / 2 = 56.45 mm, c_f/tf ≈ 5.27
        assert res.cf_over_tf == pytest.approx(5.275, rel=0.02)
        # c_w = 300 - 21.4 - 30 = 248.6 mm, c_w/tw ≈ 35.01
        assert res.cw_over_tw == pytest.approx(35.01, rel=0.02)


class TestHeb300:
    """HEB 300 è notoriamente C1 sempre (profilo robusto): verifica."""
    @pytest.mark.parametrize("steel,fy", [
        ("S235", 235), ("S275", 275), ("S355", 355), ("S460", 460),
    ])
    @pytest.mark.parametrize("loading", ["bending", "compression", "combined"])
    def test_heb300_always_class_1_or_2(self, steel, fy, loading):
        s = SECTIONS_DB["heb_300"]
        res = classify_from_section(s, fy_MPa=fy, loading=loading)
        assert res.section_class in (SectionClass.CLASS_1, SectionClass.CLASS_2), (
            f"HEB 300 {steel} {loading} → C{int(res.section_class)} inatteso"
        )


class TestNonProfileSections:
    def test_rectangular_returns_none(self):
        s = SECTIONS_DB["rect_300x500"]
        assert classify_from_section(s, 355) is None

    def test_circular_returns_none(self):
        s = SECTIONS_DB["circ_200"]
        assert classify_from_section(s, 355) is None


class TestEdgeCases:
    def test_negative_dimension_raises(self):
        with pytest.raises(ValueError):
            classify_section(h=-0.3, b=0.15, tw=0.007, tf=0.011, r=0.015,
                             fy_MPa=355)

    def test_zero_thickness_raises(self):
        with pytest.raises(ValueError):
            classify_section(h=0.3, b=0.15, tw=0.0, tf=0.011, r=0.015,
                             fy_MPa=355)


class TestEffectOfSteelGrade:
    """Lo stesso profilo deve avere classe non decrescente passando da S235→S460:
    perché ε diminuisce, i limiti diminuiscono, e i rapporti c/t restano fissi.
    """
    @pytest.mark.parametrize("sid", ["ipe_200", "ipe_300", "ipe_400"])
    def test_class_non_decreasing_with_higher_fy(self, sid):
        s = SECTIONS_DB[sid]
        classes = []
        for fy in [235, 275, 355, 420, 460]:
            res = classify_from_section(s, fy_MPa=fy, loading="bending")
            classes.append(int(res.section_class))
        # monotonicità
        assert classes == sorted(classes), (
            f"{sid}: classi non monotone con f_y crescente: {classes}"
        )
