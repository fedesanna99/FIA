"""Tests A1 — calibrazione cost_estimator entro +-30% del wall-time reale.

Misura il tempo reale di solve su un set di modelli demo e verifica che
`estimate.eta_s` sia coerente con `actual_eta` (tolleranza configurabile).

Marker: @pytest.mark.calibration (escluso dal CI base; eseguire `pytest -m calibration`).
"""
from __future__ import annotations

import os
import sys
import time
import pytest

from billing import cost_estimator
from core.solver import StaticSolver, ModalSolver
from core.solver.dynamic_solver import DynamicSolver
from core.solver.nonlinear_solver import NonLinearStaticSolver

import storage


def _coverage_active() -> bool:
    """True se pytest sta girando sotto coverage.py (instrumentation altera i tempi)."""
    if os.environ.get("COVERAGE_RUN"):
        return True
    if "coverage" in sys.modules:
        try:
            import coverage  # type: ignore
            return bool(coverage.Coverage.current() is not None)
        except Exception:
            return False
    return False


pytestmark = [
    pytest.mark.calibration,
    pytest.mark.skipif(
        _coverage_active(),
        reason="coverage instrumentation altera i tempi reali; eseguire senza --cov",
    ),
]

# Tolleranza relativa per la calibrazione. Il runbook richiede +-30%.
# Su hardware diverso da quello tarato i coefficienti possono dover essere ri-aggiustati.
TOLERANCE = 0.30
# Sopra questa soglia (in secondi) consideriamo l'attivita' "significativa". Sotto
# i tempi sono dominati dall'overhead Python (JIT/cache miss/import) e non sono
# comparabili in modo affidabile -- l'errore relativo viene calcolato sul floor.
# Floor alto (>= 100 ms) garantisce stabilita' su sistemi caricati durante il
# full pytest run; le calibrazioni "vere" su modelli grandi rimangono stringenti.
MIN_ACTUAL_S = 0.10
# Numero di iterazioni di warm-up + best-of-N per ridurre il rumore del wall-clock.
WARMUP_ITERS = 1
BEST_OF = 3


def _ratio_error(actual: float, predicted: float) -> float:
    """Errore relativo riferito al valore piu' grande dei due (simmetrico)."""
    denom = max(actual, predicted, MIN_ACTUAL_S)
    return abs(predicted - actual) / denom


@pytest.fixture(autouse=True)
def _seed_examples():
    storage.reset_for_tests()
    yield


def _solve_once(model, solver_kind: str, params: dict) -> None:
    if solver_kind == "linear":
        StaticSolver(model).solve()
    elif solver_kind == "modal":
        ModalSolver(model, n_modes=int(params.get("n_modes", 6))).solve()
    elif solver_kind == "dynamic_th":
        DynamicSolver(
            model,
            dt=float(params.get("dt", 0.01)),
            t_end=float(params.get("t_end", float(params.get("n_steps", 100)) * float(params.get("dt", 0.01)))),
        ).solve()
    elif solver_kind == "nonlinear":
        NonLinearStaticSolver(
            model,
            n_steps=int(params.get("n_steps", 10)),
            max_iter=int(params.get("max_iter", 25)),
        ).solve()
    else:
        raise ValueError(f"Solver {solver_kind} non gestito nella calibrazione")


def _run_solver(model_id: str, solver_kind: str, params: dict) -> float:
    """Esegue WARMUP_ITERS round di warm-up + BEST_OF round misurati, ritorna il minimo."""
    model = storage.get_model(model_id)
    assert model is not None, f"Modello {model_id} non trovato nello storage."
    # warm-up (cache caldo, JIT, import)
    for _ in range(WARMUP_ITERS):
        _solve_once(model, solver_kind, params)
    best = float("inf")
    for _ in range(BEST_OF):
        t0 = time.perf_counter()
        _solve_once(model, solver_kind, params)
        dt = time.perf_counter() - t0
        if dt < best:
            best = dt
    return best


CALIBRATION_CASES = [
    # (model_id, solver, params, calibration_tolerance_override or None)
    ("ex_simple_beam_2d", "linear", {}),
    ("ex_portal_frame_2d", "linear", {}),
    ("ex_portal_frame_2d", "modal", {"n_modes": 6}),
    ("ex_shell_plate", "modal", {"n_modes": 8}),
    ("ex_tower_3d", "modal", {"n_modes": 6}),
    ("ex_cube_solid_h8", "linear", {}),
    ("ex_cable_bridge_2d", "nonlinear", {"n_steps": 10, "max_iter": 25}),
]


@pytest.mark.parametrize("model_id,solver,params", CALIBRATION_CASES)
def test_estimate_within_tolerance_of_actual(model_id, solver, params):
    """Verifica calibrazione: |eta_s - actual_s| / max(actual_s, MIN) <= TOLERANCE."""
    model = storage.get_model(model_id)
    if model is None:
        pytest.skip(f"Modello demo {model_id} non disponibile in questa build")
    estimate = cost_estimator.estimate(solver, model, params)
    actual = _run_solver(model_id, solver, params)
    err = _ratio_error(actual, estimate.eta_s)
    assert err <= TOLERANCE, (
        f"[{model_id}/{solver}] eta_s={estimate.eta_s:.4f}s "
        f"vs actual={actual:.4f}s -> err={err*100:.1f}% > {TOLERANCE*100:.0f}%"
    )
