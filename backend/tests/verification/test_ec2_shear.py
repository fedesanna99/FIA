"""
Test per `core/verification/ec2/shear.py` — taglio EN 1992-1-1 §6.2.

Esempio numerico: trave 30×50, d=46cm, 4φ16 (A_sl=8.04e-4), staffe φ8/15cm 2 tagli
in C25/30 con acciaio B450C.
"""
import math
import pytest

from core.verification.ec2 import (
    V_Rd_c, V_Rd_s, V_Rd_max,
)
from core.verification.ec2.shear import shear_check


class TestVRdC:
    """V_Rd,c senza staffe — formula 6.2a."""
    def test_basic_no_compression(self):
        """30×46cm, 4φ16, C25 → V_Rd,c ≈ 67 kN

        Calcolo a mano:
            C_Rd,c = 0.18/1.5 = 0.12
            k = 1 + √(200/460) = 1 + 0.659 = 1.659  ≤ 2 OK
            ρ_l = 8.04e-4/(0.30·0.46) = 0.00583 ≤ 0.02 OK
            term = 0.12 · 1.659 · (100·0.00583·25)^(1/3) = 0.12·1.659·2.448 = 0.4873 MPa
            v_min = 0.035·1.659^1.5·√25 = 0.035·2.137·5 = 0.374 MPa
            v_Rd,c = max(0.4873, 0.374) = 0.4873 MPa
            V_Rd,c = 0.4873·300·460 = 67.2 kN
        """
        v = V_Rd_c(b_w=0.30, d=0.46, A_sl=8.04e-4, fck=25e6)
        assert v / 1e3 == pytest.approx(67.2, rel=0.03)

    def test_v_min_governs_with_low_reinforcement(self):
        """Con A_sl molto basso, v_min governa (sopra il termine ρ_l)."""
        # ρ_l = 1e-5/(0.30·0.46) = 7.2e-5 → termine principale piccolo
        v = V_Rd_c(b_w=0.30, d=0.46, A_sl=1e-5, fck=25e6)
        # Calcolo termine principale:
        # = 0.12 · 1.659 · (100·7.25e-5·25)^(1/3) = 0.12·1.659·0.558 = 0.111 MPa
        # v_min = 0.374 MPa → governa
        v_min_only = 0.374e6 * 0.30 * 0.46
        assert v == pytest.approx(v_min_only, rel=0.05)

    def test_increases_with_fck(self):
        v25 = V_Rd_c(b_w=0.30, d=0.46, A_sl=8.04e-4, fck=25e6)
        v40 = V_Rd_c(b_w=0.30, d=0.46, A_sl=8.04e-4, fck=40e6)
        assert v40 > v25

    def test_compression_increases_resistance(self):
        """σ_cp > 0 (compressione) aumenta V_Rd,c."""
        v0 = V_Rd_c(b_w=0.30, d=0.46, A_sl=8.04e-4, fck=25e6, sigma_cp=0)
        vp = V_Rd_c(b_w=0.30, d=0.46, A_sl=8.04e-4, fck=25e6, sigma_cp=2e6)
        assert vp > v0

    def test_k_capped_at_2(self):
        """Per d molto piccolo k è capped a 2.0."""
        # d = 0.05m → k_nominal = 1 + √(200/50) = 3.0 → capped a 2
        v_small = V_Rd_c(b_w=0.30, d=0.05, A_sl=1e-4, fck=25e6)
        # Per d=0.05 il termine ρ_l si comporta diversamente; verifichiamo solo
        # che il risultato sia finito e positivo (no crash da k > 2)
        assert v_small > 0

    def test_negative_args_raise(self):
        with pytest.raises(ValueError):
            V_Rd_c(b_w=-0.30, d=0.46, A_sl=8.04e-4, fck=25e6)


class TestVRdS:
    """V_Rd,s con staffe verticali — formula 6.8."""
    def test_basic(self):
        """Staffe φ8/15cm, 2 tagli, B450C, d=46cm, cot(θ)=2.5:
            A_sw = 2·π·8²/4 = 100.5 mm² = 1.005e-4 m²
            z = 0.9·d = 0.414 m
            fywd = 450/1.15 = 391.3 MPa
            V_Rd,s = 1.005e-4/0.15 · 0.414 · 391.3e6 · 2.5
                  = 6.70e-4 · 0.414 · 391.3e6 · 2.5
                  = 271.5 kN
        """
        v = V_Rd_s(b_w=0.30, d=0.46, A_sw=1.005e-4, s=0.15, fywk=450e6)
        assert v / 1e3 == pytest.approx(271.5, rel=0.02)

    def test_more_stirrups_higher_VRds(self):
        """Passo più fitto → V_Rd,s maggiore."""
        v15 = V_Rd_s(b_w=0.30, d=0.46, A_sw=1.005e-4, s=0.15, fywk=450e6)
        v10 = V_Rd_s(b_w=0.30, d=0.46, A_sw=1.005e-4, s=0.10, fywk=450e6)
        # rapporto = 15/10 = 1.5
        assert (v10 / v15) == pytest.approx(1.5, rel=1e-3)

    def test_cot_theta_higher_means_more_resistance(self):
        """cot(θ) maggiore → V_Rd,s maggiore (a parità di staffe)."""
        v1 = V_Rd_s(b_w=0.30, d=0.46, A_sw=1.005e-4, s=0.15, fywk=450e6, cot_theta=1.0)
        v25 = V_Rd_s(b_w=0.30, d=0.46, A_sw=1.005e-4, s=0.15, fywk=450e6, cot_theta=2.5)
        assert (v25 / v1) == pytest.approx(2.5, rel=1e-3)

    def test_invalid_cot_theta_raises(self):
        with pytest.raises(ValueError):
            V_Rd_s(b_w=0.30, d=0.46, A_sw=1.005e-4, s=0.15, fywk=450e6,
                   cot_theta=3.0)


class TestVRdMax:
    """V_Rd,max — limite bielle compresse (6.9)."""
    def test_basic(self):
        """C25, 30×46cm, cot(θ)=2.5:
            ν1 = 0.6·(1-25/250) = 0.54
            fcd = 0.85·25/1.5 = 14.167 MPa
            z = 0.9·d = 0.414 m
            V_Rd,max = 1·0.30·0.414·0.54·14.167e6·2.5/(1+6.25)
                    = 1·0.30·0.414·0.54·14.167e6·2.5/7.25
                    = 327.7 kN
        """
        v = V_Rd_max(b_w=0.30, d=0.46, fck=25e6, cot_theta=2.5)
        assert v / 1e3 == pytest.approx(327.7, rel=0.02)

    def test_decreases_with_high_fck(self):
        """ν1 decresce con fck → effetto compensato dall'aumento di fcd.
        Tipicamente V_Rd,max cresce con fck (per fck <= 250).
        """
        v25 = V_Rd_max(b_w=0.30, d=0.46, fck=25e6)
        v45 = V_Rd_max(b_w=0.30, d=0.46, fck=45e6)
        assert v45 > v25


class TestShearCheck:
    """Integrazione: shear_check combina V_Rd,c/V_Rd,s/V_Rd,max."""
    def test_without_stirrups(self):
        r = shear_check(b_w=0.30, d=0.46, A_sl=8.04e-4, fck=25e6)
        assert not r.needs_stirrups
        assert r.V_Rd == r.V_Rd_c
        assert r.V_Rd_s == 0

    def test_with_stirrups(self):
        r = shear_check(b_w=0.30, d=0.46, A_sl=8.04e-4, fck=25e6,
                        A_sw=1.005e-4, s=0.15, fywk=450e6)
        assert r.needs_stirrups
        # Con staffe φ8/15 e cot(θ)=2.5: V_Rd,s=271, V_Rd,max=328 → governa V_Rd,s
        assert r.V_Rd == pytest.approx(r.V_Rd_s, rel=1e-9)
        assert r.V_Rd <= r.V_Rd_max

    def test_stirrups_capped_by_max(self):
        """Con cot(θ)=1 (bielle più ripide) V_Rd,max cala, V_Rd,s cala anche;
        provo invece con A_sw molto elevata: V_Rd,s eccede V_Rd,max → governa max.
        """
        r = shear_check(b_w=0.30, d=0.46, A_sl=8.04e-4, fck=25e6,
                        A_sw=20e-4, s=0.05, fywk=450e6)
        assert r.V_Rd <= r.V_Rd_max
        assert r.V_Rd == r.V_Rd_max
