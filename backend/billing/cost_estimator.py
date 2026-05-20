"""Cost estimator backend per ogni solver disponibile (Sprint 1 — A1).

Stima cpu_min, ram_mb, eta_s, credits per un solve. I coefficienti sono tarati
empiricamente sui modelli demo (cfr. tests/billing/test_estimator_calibration.py).

Benchmark hardware di calibrazione: Windows 11 / Python 3.14, CPU desktop multi-core,
2026-05-20. Su hardware diverso può servire ri-tarare α/β/γ/δ.
"""
from __future__ import annotations

from typing import Any

from .schemas import CostEstimate, SolverKind, SOLVER_KINDS


# ---------------------------------------------------------------------------
# Coefficienti tarati (DOF totali = n_nodes * 6).
# Le formule sono semplici power-law sul n. di DOF + termini lineari sui step.
# Tarate per ricadere entro ±30% dell'ETA reale sui demo (vedi calibration test).
# ---------------------------------------------------------------------------
ASSUMED_CORES = 4

# Linear / Winkler / Buckling: una fattorizzazione + back-substitution.
_LINEAR_ALPHA = 8.0e-7        # cpu_min ~ α * n_dof^β
_LINEAR_BETA = 1.30

# Modal / response spectrum: Lanczos su K, M -- ogni modo costa O(n_dof^β_m).
_MODAL_ALPHA = 6.0e-7
_MODAL_BETA = 1.25

# Dynamic / seismic time-history: n_steps * fattorizzazione iniziale.
_DYNAMIC_ALPHA = 5.0e-7
_DYNAMIC_BETA = 1.20

# Pushover / nonlinear / arclength: Newton outer * step * fattorizzazione.
_NONLINEAR_ALPHA = 1.2e-6
_NONLINEAR_BETA = 1.30

# RAM (lineare in n_dof) + storage time-history (lineare in n_steps).
_RAM_GAMMA_PER_DOF = 0.08      # MB per DOF (sparse matrix + factorization)
_RAM_BASELINE = 60.0           # MB overhead Python/NumPy/SciPy
_RAM_DELTA_PER_STEP = 0.02     # MB per step memorizzato

# Crediti: target ~ 1 credito = 0.10 EUR ~ 1 secondo di compute.
_CREDIT_PER_CPU_MIN = 6.0
_CREDIT_PER_RAM_GB = 0.5
_CREDIT_MIN = 0.01


def _cpu_min_power(alpha: float, beta: float, n_dof: int, multiplier: float = 1.0) -> float:
    if n_dof <= 0:
        return 0.0
    return float(alpha * (n_dof ** beta) * max(multiplier, 1.0))


def _ram_mb(n_dof: int, n_steps: int = 0) -> float:
    return _RAM_BASELINE + _RAM_GAMMA_PER_DOF * max(n_dof, 0) + _RAM_DELTA_PER_STEP * max(n_steps, 0)


def _eta_s_from_cpu_min(cpu_min: float) -> float:
    """Wall-time atteso assumendo ASSUMED_CORES utilizzati parzialmente."""
    return float(cpu_min * 60.0 / max(ASSUMED_CORES, 1))


def _credits(cpu_min: float, ram_mb: float) -> float:
    c = _CREDIT_PER_CPU_MIN * cpu_min + _CREDIT_PER_RAM_GB * (ram_mb / 1024.0)
    return float(max(round(c + 1e-9, 4), _CREDIT_MIN))


def _build(
    solver: SolverKind,
    n_dof: int,
    cpu_min: float,
    n_steps: int = 0,
    explanation: str = "",
) -> CostEstimate:
    ram = _ram_mb(n_dof, n_steps)
    eta = _eta_s_from_cpu_min(cpu_min)
    return CostEstimate(
        solver=solver,
        n_dof=int(max(n_dof, 0)),
        cpu_min=float(max(cpu_min, 0.0)),
        ram_mb=float(max(ram, 0.0)),
        eta_s=float(max(eta, 0.0)),
        credits=_credits(cpu_min, ram),
        explanation=explanation or f"{solver}: n_dof={n_dof}, cpu_min={cpu_min:.4f}",
    )


# ---------------------------------------------------------------------------
# Estimator per ogni famiglia di solver.
# ---------------------------------------------------------------------------

def _estimate_linear(n_dof: int) -> CostEstimate:
    cpu = _cpu_min_power(_LINEAR_ALPHA, _LINEAR_BETA, n_dof)
    expl = f"Linear: 1 fattorizzazione su {n_dof} DOF."
    return _build("linear", n_dof, cpu, explanation=expl)


def _estimate_modal(n_dof: int, n_modes: int) -> CostEstimate:
    n_modes = max(int(n_modes or 1), 1)
    cpu = _cpu_min_power(_MODAL_ALPHA, _MODAL_BETA, n_dof, multiplier=max(n_modes / 5.0, 1.0))
    expl = f"Modal: Lanczos {n_modes} modi su {n_dof} DOF."
    return _build("modal", n_dof, cpu, explanation=expl)


def _estimate_buckling(n_dof: int) -> CostEstimate:
    cpu = _cpu_min_power(_MODAL_ALPHA * 1.1, _MODAL_BETA, n_dof)
    expl = f"Buckling: K, K_G linear eigenproblem su {n_dof} DOF."
    return _build("buckling", n_dof, cpu, explanation=expl)


def _estimate_pushover(n_dof: int, n_steps: int) -> CostEstimate:
    n_steps = max(int(n_steps or 1), 1)
    cpu = _cpu_min_power(_NONLINEAR_ALPHA, _NONLINEAR_BETA, n_dof, multiplier=n_steps)
    expl = f"Pushover: {n_steps} step lambda-incrementali su {n_dof} DOF."
    return _build("pushover", n_dof, cpu, n_steps=n_steps, explanation=expl)


def _estimate_response_spectrum(n_dof: int, n_modes: int) -> CostEstimate:
    n_modes = max(int(n_modes or 1), 1)
    cpu = _cpu_min_power(_MODAL_ALPHA, _MODAL_BETA, n_dof, multiplier=max(n_modes / 5.0, 1.0))
    cpu *= 1.1  # SRSS/CQC post-processing overhead
    expl = f"Response spectrum: {n_modes} modi + CQC/SRSS su {n_dof} DOF."
    return _build("response_spectrum", n_dof, cpu, explanation=expl)


def _estimate_dynamic_th(n_dof: int, n_steps: int) -> CostEstimate:
    n_steps = max(int(n_steps or 1), 1)
    cpu = _cpu_min_power(_DYNAMIC_ALPHA, _DYNAMIC_BETA, n_dof, multiplier=n_steps)
    expl = f"Dynamic TH: Newmark-beta {n_steps} step su {n_dof} DOF."
    return _build("dynamic_th", n_dof, cpu, n_steps=n_steps, explanation=expl)


def _estimate_seismic_th(n_dof: int, n_steps: int, n_components: int) -> CostEstimate:
    n_steps = max(int(n_steps or 1), 1)
    n_components = max(int(n_components or 1), 1)
    cpu = _cpu_min_power(
        _DYNAMIC_ALPHA, _DYNAMIC_BETA, n_dof,
        multiplier=n_steps * max(n_components, 1),
    )
    expl = (
        f"Seismic TH: {n_components} componenti x {n_steps} step "
        f"Newmark su {n_dof} DOF."
    )
    return _build("seismic_th", n_dof, cpu, n_steps=n_steps, explanation=expl)


def _estimate_nonlinear(n_dof: int, n_steps: int, max_iter: int) -> CostEstimate:
    n_steps = max(int(n_steps or 1), 1)
    max_iter = max(int(max_iter or 1), 1)
    # multiplier: n_steps * sqrt(max_iter) — Newton converge tipicamente in <max_iter
    iter_factor = (max_iter ** 0.5) / (10 ** 0.5)
    cpu = _cpu_min_power(
        _NONLINEAR_ALPHA, _NONLINEAR_BETA, n_dof,
        multiplier=n_steps * max(iter_factor, 1.0),
    )
    expl = f"Nonlinear NR: {n_steps} step, max_iter={max_iter} su {n_dof} DOF."
    return _build("nonlinear", n_dof, cpu, n_steps=n_steps, explanation=expl)


def _estimate_arclength(n_dof: int, n_steps: int) -> CostEstimate:
    n_steps = max(int(n_steps or 1), 1)
    cpu = _cpu_min_power(
        _NONLINEAR_ALPHA * 1.15, _NONLINEAR_BETA, n_dof,
        multiplier=n_steps,
    )
    expl = f"Arc-length Crisfield: {n_steps} step path-following su {n_dof} DOF."
    return _build("arclength", n_dof, cpu, n_steps=n_steps, explanation=expl)


def _estimate_winkler(n_dof: int) -> CostEstimate:
    cpu = _cpu_min_power(_LINEAR_ALPHA * 1.05, _LINEAR_BETA, n_dof)
    expl = f"Winkler: linear + K_soil su {n_dof} DOF."
    return _build("winkler", n_dof, cpu, explanation=expl)


# ---------------------------------------------------------------------------
# Helpers per estrarre n_dof e numero di step/modi.
# ---------------------------------------------------------------------------

def _model_n_dof(model: Any) -> int:
    """Restituisce DOF totali = n_nodes * 6 (convenzione globale FEA Pro)."""
    if model is None:
        return 0
    nodes = None
    if isinstance(model, dict):
        nodes = model.get("nodes")
    else:
        nodes = getattr(model, "nodes", None)
    if not nodes:
        return 0
    return int(len(nodes) * 6)


def _params_int(params: dict | None, key: str, default: int = 0) -> int:
    if not params:
        return default
    v = params.get(key, default)
    try:
        return int(v) if v is not None else default
    except (TypeError, ValueError):
        return default


# ---------------------------------------------------------------------------
# Dispatcher pubblico.
# ---------------------------------------------------------------------------

def estimate(solver: SolverKind, model: Any, params: dict | None = None) -> CostEstimate:
    """Dispatcher principale.

    Args:
        solver: nome del solver (vedi SolverKind).
        model: FEAModel (pydantic) o dict con campo `nodes`.
        params: dizionario di parametri solver-specifici (n_steps, n_modes, ...).

    Raises:
        ValueError: se solver non e' uno dei SolverKind noti.
    """
    if solver not in SOLVER_KINDS:
        raise ValueError(f"Unknown solver kind: {solver!r}")
    n_dof = _model_n_dof(model)
    p = params or {}

    if solver == "linear":
        return _estimate_linear(n_dof)
    if solver == "modal":
        n_modes = _params_int(p, "n_modes", 10)
        return _estimate_modal(n_dof, n_modes)
    if solver == "buckling":
        return _estimate_buckling(n_dof)
    if solver == "pushover":
        # max_steps oppure n_steps fallback
        n_steps = _params_int(p, "n_steps", _params_int(p, "max_steps", 50))
        return _estimate_pushover(n_dof, n_steps)
    if solver == "response_spectrum":
        n_modes = _params_int(p, "n_modes", 10)
        return _estimate_response_spectrum(n_dof, n_modes)
    if solver == "dynamic_th":
        # Se t_end e dt forniti, deriva n_steps.
        n_steps = _params_int(p, "n_steps", 0)
        if n_steps <= 0:
            t_end = float(p.get("t_end", 0.0) or 0.0)
            dt = float(p.get("dt", 0.01) or 0.01)
            if t_end > 0 and dt > 0:
                n_steps = int(t_end / dt)
        n_steps = max(n_steps, 1)
        return _estimate_dynamic_th(n_dof, n_steps)
    if solver == "seismic_th":
        components = p.get("components") or {}
        n_components = max(len(components), 1) if isinstance(components, dict) else 1
        n_steps = _params_int(p, "n_steps", 0)
        if n_steps <= 0:
            t_end = float(p.get("t_end", 0.0) or 0.0)
            dt = float(p.get("dt", 0.01) or 0.01)
            if t_end > 0 and dt > 0:
                n_steps = int(t_end / dt)
        n_steps = max(n_steps, 1)
        return _estimate_seismic_th(n_dof, n_steps, n_components)
    if solver == "nonlinear":
        n_steps = _params_int(p, "n_steps", 10)
        max_iter = _params_int(p, "max_iter", 25)
        return _estimate_nonlinear(n_dof, n_steps, max_iter)
    if solver == "arclength":
        n_steps = _params_int(p, "n_steps", 30)
        return _estimate_arclength(n_dof, n_steps)
    if solver == "winkler":
        return _estimate_winkler(n_dof)

    # Difensivo: il check sopra dovrebbe coprire tutto.
    raise ValueError(f"Unhandled solver kind: {solver!r}")
