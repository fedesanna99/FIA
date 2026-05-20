"""Tests A1 — cost_estimator backend (Sprint 1)."""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from billing import cost_estimator
from billing.schemas import CostEstimate

import storage
from main import app


def _model_with_nodes(n_nodes: int = 100):
    """Stub minimo per test: solo `nodes` conta (n_dof = n_nodes * 6)."""
    return {"nodes": [{"id": i, "x": 0.0, "y": 0.0, "z": 0.0} for i in range(n_nodes)]}


def test_estimate_linear_returns_valid_cost_estimate():
    est = cost_estimator.estimate("linear", _model_with_nodes(50), {})
    assert isinstance(est, CostEstimate)
    assert est.solver == "linear"
    assert est.n_dof == 50 * 6
    assert est.cpu_min > 0
    assert est.ram_mb > 0
    assert est.eta_s > 0
    assert est.credits >= 0.01
    assert est.explanation


def test_estimate_modal_scales_with_n_modes():
    model = _model_with_nodes(80)
    e_few = cost_estimator.estimate("modal", model, {"n_modes": 3})
    e_many = cost_estimator.estimate("modal", model, {"n_modes": 30})
    assert e_many.cpu_min > e_few.cpu_min
    assert e_many.credits > e_few.credits


def test_estimate_buckling_similar_to_modal():
    model = _model_with_nodes(60)
    e_b = cost_estimator.estimate("buckling", model, {})
    e_m = cost_estimator.estimate("modal", model, {"n_modes": 5})
    # buckling = linear eigenproblem su K, K_G --> stesso ordine di grandezza del modal
    assert 0.3 <= (e_b.cpu_min / max(e_m.cpu_min, 1e-12)) <= 3.0


def test_estimate_pushover_scales_with_n_steps():
    model = _model_with_nodes(40)
    e_short = cost_estimator.estimate("pushover", model, {"n_steps": 5})
    e_long = cost_estimator.estimate("pushover", model, {"n_steps": 100})
    assert e_long.cpu_min > 10 * e_short.cpu_min * 0.5  # almeno ~10x se scaling lineare nei step


def test_estimate_response_spectrum_scales_with_n_modes():
    model = _model_with_nodes(50)
    e_few = cost_estimator.estimate("response_spectrum", model, {"n_modes": 3})
    e_many = cost_estimator.estimate("response_spectrum", model, {"n_modes": 25})
    assert e_many.cpu_min > e_few.cpu_min


def test_estimate_dynamic_th_scales_with_n_steps():
    model = _model_with_nodes(30)
    e_short = cost_estimator.estimate("dynamic_th", model, {"n_steps": 50})
    e_long = cost_estimator.estimate("dynamic_th", model, {"n_steps": 500})
    # 10x step -> ~10x costo
    assert e_long.cpu_min >= 8 * e_short.cpu_min


def test_estimate_seismic_th_scales_with_n_components():
    model = _model_with_nodes(30)
    e_1c = cost_estimator.estimate(
        "seismic_th", model, {"n_steps": 100, "components": {"X": []}},
    )
    e_3c = cost_estimator.estimate(
        "seismic_th", model, {"n_steps": 100, "components": {"X": [], "Y": [], "Z": []}},
    )
    assert e_3c.cpu_min > e_1c.cpu_min
    # ~3x con 3 componenti, lasciamo margine ampio
    assert 2.0 <= e_3c.cpu_min / e_1c.cpu_min <= 4.0


def test_estimate_nonlinear_scales_with_max_iter():
    model = _model_with_nodes(50)
    e_low = cost_estimator.estimate("nonlinear", model, {"n_steps": 20, "max_iter": 5})
    e_high = cost_estimator.estimate("nonlinear", model, {"n_steps": 20, "max_iter": 80})
    assert e_high.cpu_min > e_low.cpu_min


def test_estimate_arclength_similar_to_nonlinear():
    model = _model_with_nodes(40)
    e_a = cost_estimator.estimate("arclength", model, {"n_steps": 30})
    e_n = cost_estimator.estimate("nonlinear", model, {"n_steps": 30, "max_iter": 25})
    # arclength e nonlinear stesso ordine di grandezza
    assert 0.5 <= (e_a.cpu_min / max(e_n.cpu_min, 1e-12)) <= 2.0


def test_estimate_winkler_similar_to_linear():
    model = _model_with_nodes(50)
    e_w = cost_estimator.estimate("winkler", model, {})
    e_l = cost_estimator.estimate("linear", model, {})
    assert 0.7 <= (e_w.cpu_min / max(e_l.cpu_min, 1e-12)) <= 1.5


@pytest.mark.parametrize("solver,params", [
    ("linear", {}),
    ("modal", {"n_modes": 5}),
    ("buckling", {}),
    ("pushover", {"n_steps": 10}),
    ("dynamic_th", {"n_steps": 100}),
    ("nonlinear", {"n_steps": 10, "max_iter": 25}),
    ("arclength", {"n_steps": 30}),
    ("winkler", {}),
])
def test_credits_always_non_negative(solver, params):
    est = cost_estimator.estimate(solver, _model_with_nodes(20), params)
    assert est.credits >= 0
    assert est.ram_mb >= 0
    assert est.cpu_min >= 0


def test_eta_s_consistent_with_cpu_min():
    est = cost_estimator.estimate("linear", _model_with_nodes(100), {})
    # eta_s = cpu_min * 60 / ASSUMED_CORES
    expected = est.cpu_min * 60.0 / cost_estimator.ASSUMED_CORES
    assert abs(est.eta_s - expected) < 1e-9


def test_explanation_non_empty():
    for solver in ["linear", "modal", "buckling", "pushover", "response_spectrum",
                   "dynamic_th", "seismic_th", "nonlinear", "arclength", "winkler"]:
        params = {"n_steps": 10} if solver in (
            "pushover", "dynamic_th", "seismic_th", "nonlinear", "arclength"
        ) else {}
        if solver == "seismic_th":
            params["components"] = {"X": []}
        est = cost_estimator.estimate(solver, _model_with_nodes(10), params)
        assert est.explanation and len(est.explanation) > 5
        assert est.solver == solver


def test_unknown_solver_raises():
    with pytest.raises(ValueError):
        cost_estimator.estimate("zoldyck", _model_with_nodes(10), {})  # type: ignore[arg-type]


def test_endpoint_billing_estimate_returns_200():
    """Smoke: POST /api/billing/estimate restituisce CostEstimate JSON valido."""
    storage.reset_for_tests()
    client = TestClient(app)
    resp = client.post(
        "/api/billing/estimate",
        json={
            "model_id": "ex_portal_frame_2d",
            "solver": "linear",
            "params": {},
        },
    )
    assert resp.status_code == 200, resp.text
    payload = resp.json()
    assert payload["solver"] == "linear"
    assert payload["n_dof"] > 0
    assert payload["cpu_min"] >= 0
    assert payload["credits"] >= 0
    assert payload["explanation"]


def test_endpoint_billing_estimate_unknown_model_404():
    client = TestClient(app)
    resp = client.post(
        "/api/billing/estimate",
        json={"model_id": "nope_nonesiste", "solver": "linear", "params": {}},
    )
    assert resp.status_code == 404
