"""
Regression test per bug #6 (audit v2.3.5-nafems-truth-audit).

Prima di v2.4.1:
    shear_check ignorava V_Ed -> needs_stirrups dipendeva da (A_sw > 0)
    Conseguenza: utente con V_Ed=200kN e A_sw=0 riceveva
    needs_stirrups=False e UR>1.0 contemporaneamente (incoerente).

Dopo v2.4.1:
    shear_check accetta V_Ed -> needs_stirrups = (V_Ed > V_Rd_c)
    Risposta strutturalmente coerente con UR.
"""
from __future__ import annotations

import pytest

from core.verification.ec2.shear import shear_check, ShearResult


# === Modello di riferimento: trave rettangolare standard ===
# b_w=300mm, d=500mm, A_sl=10cm² (~4 phi 18), fck=25 MPa C25/30
# V_Rd_c calcolato ~75 kN (smoke test T1)
DEFAULT_PARAMS = dict(
    b_w=0.30,
    d=0.50,
    A_sl=10e-4,
    fck=25e6,
)


def test_needs_stirrups_true_when_V_Ed_exceeds_V_Rd_c():
    """
    Caso reale fail: V_Ed grande, no staffe modellate.
    Atteso: needs_stirrups=True (servono!), UR>1.0 (FAIL), V_Ed riportato.
    Pre-v2.4.1: needs_stirrups era False (bug #6).
    """
    # V_Ed=200 kN ben oltre V_Rd_c (~75 kN)
    result = shear_check(
        **DEFAULT_PARAMS,
        A_sw=0.0,
        V_Ed=200e3,
    )

    assert result.needs_stirrups is True, (
        f"V_Ed=200kN supera V_Rd_c={result.V_Rd_c/1e3:.1f}kN, "
        f"staffe DEVONO essere richieste"
    )
    assert result.UR is not None and result.UR > 1.0, (
        f"UR={result.UR} dovrebbe essere >1 con V_Ed=200kN e no staffe"
    )
    assert result.V_Ed == pytest.approx(200e3)


def test_needs_stirrups_false_when_V_Ed_below_V_Rd_c():
    """
    Caso reale OK: V_Ed piccolo, cls regge senza staffe.
    Atteso: needs_stirrups=False (non servono), UR<1.0 (OK), V_Ed riportato.
    """
    # V_Ed=20 kN ben sotto V_Rd_c (~75 kN)
    result = shear_check(
        **DEFAULT_PARAMS,
        A_sw=0.0,
        V_Ed=20e3,
    )

    assert result.needs_stirrups is False, (
        f"V_Ed=20kN inferiore a V_Rd_c={result.V_Rd_c/1e3:.1f}kN, "
        f"staffe NON necessarie"
    )
    assert result.UR is not None and result.UR < 1.0
    assert result.V_Ed == pytest.approx(20e3)


def test_backward_compat_when_V_Ed_not_passed():
    """
    Backward-compat per test capacity-side legacy.
    V_Ed=None (default) -> comportamento pre-v2.4.1 (needs basato su A_sw).
    UR e V_Ed in ShearResult sono None.
    """
    # Caso A: senza staffe
    r1 = shear_check(**DEFAULT_PARAMS, A_sw=0.0)
    assert r1.needs_stirrups is False  # legacy: A_sw=0 -> False
    assert r1.UR is None
    assert r1.V_Ed is None

    # Caso B: con staffe
    r2 = shear_check(**DEFAULT_PARAMS, A_sw=1e-4, s=0.15)
    assert r2.needs_stirrups is True   # legacy: A_sw>0 -> True
    assert r2.UR is None
    assert r2.V_Ed is None


def test_api_integration_passes_V_Ed():
    """
    Integration test: endpoint POST /api/verify/ec2/shear riceve V_Ed e
    lo passa al solver. Verifica end-to-end del wiring API -> shear_check.
    """
    from fastapi.testclient import TestClient
    from main import app

    client = TestClient(app)

    response = client.post(
        "/api/verify/ec2/shear",
        json={
            "b_w": 0.30,
            "d": 0.50,
            "A_sl": 10e-4,
            "fck": 25e6,
            "A_sw": 0.0,
            "V_Ed": 200e3,
        },
    )

    assert response.status_code == 200, response.text
    data = response.json()

    # Bug #6 fix: needs_stirrups=True quando V_Ed > V_Rd_c
    assert data["needs_stirrups"] is True, (
        f"API integration fail: needs_stirrups={data['needs_stirrups']} "
        f"con V_Ed=200kN e A_sw=0 (V_Rd_c={data['V_Rd_c']/1e3:.1f}kN)"
    )
    # UR riportato e > 1.0
    assert data["UR"] is not None
    assert data["UR"] > 1.0
    # V_Ed echo
    assert data["V_Ed"] == pytest.approx(200e3)
    # status string sincronizzato
    assert data["status"] == "FAIL"


def test_edge_case_V_Ed_zero_treated_as_OK():
    """
    Edge: V_Ed=0 (nessuna sollecitazione applicata).
    Atteso: needs=False (0 < V_Rd_c sempre), UR=0.
    """
    result = shear_check(**DEFAULT_PARAMS, A_sw=0.0, V_Ed=0.0)
    assert result.needs_stirrups is False
    assert result.UR == pytest.approx(0.0)
    assert result.V_Ed == 0.0
