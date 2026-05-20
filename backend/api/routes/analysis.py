"""Endpoint per avvio analisi e recupero risultati."""
from dataclasses import asdict
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from schemas import FEAModel
from schemas.results import StaticResults, ModalResults, DynamicResults
from core.solver import StaticSolver, ModalSolver, DynamicSolver, BucklingSolver
from core.solver.pushover_solver import PushoverSolver
from core.solver.seismic_th_solver import SeismicTimeHistorySolver
from core.solver.nonlinear_solver import NonLinearStaticSolver
from core.solver.arclength_solver import ArcLengthSolver
from core.postprocess import fft_spectrum, response_spectrum
from core.postprocess.fatigue import (
    extract_peaks_valleys, rainflow_count, cycle_histogram,
    miner_damage, ec3_category, SNCurve,
)
import storage
from api.websocket import broadcast_progress

router = APIRouter()


class StaticAnalysisRequest(BaseModel):
    include_self_weight: bool = False
    g: float = 9.81


class ModalAnalysisRequest(BaseModel):
    n_modes: int = Field(default=10, ge=1, le=100)


class DynamicAnalysisRequest(BaseModel):
    dt: float = Field(default=0.01, gt=0)
    t_end: float = Field(default=1.0, gt=0)
    beta: float = 0.25
    gamma: float = 0.5
    rayleigh_alpha: float = 0.0
    rayleigh_beta: float = 0.0
    save_every: int = 1
    store_nodes: list[int] | None = None


def _get_model(model_id: str) -> FEAModel:
    m = storage.get_model(model_id)
    if not m:
        raise HTTPException(404, f"Modello {model_id} non trovato")
    if not m.nodes or not m.elements:
        raise HTTPException(400, "Il modello deve avere almeno un nodo e un elemento")
    return m


async def _run(model_id: str, analysis_type: str, solver):
    async def progress(p, msg):
        await broadcast_progress(model_id, p, msg)
    def sync_cb(p, msg):
        import asyncio
        try:
            loop = asyncio.get_event_loop()
            loop.create_task(progress(p, msg))
        except RuntimeError:
            pass
    try:
        results = solver.solve(progress_cb=sync_cb)
    except Exception as e:
        await broadcast_progress(model_id, 1.0, f"Errore: {e}")
        raise HTTPException(500, str(e))
    storage.save_results(model_id, analysis_type, results)
    return results


@router.post("/static/{model_id}", response_model=StaticResults)
async def static_analysis(model_id: str, req: StaticAnalysisRequest = StaticAnalysisRequest()):
    model = _get_model(model_id)
    solver = StaticSolver(model, include_self_weight=req.include_self_weight, g=req.g)
    return await _run(model_id, "static", solver)


@router.post("/modal/{model_id}", response_model=ModalResults)
async def modal_analysis(model_id: str, req: ModalAnalysisRequest = ModalAnalysisRequest()):
    model = _get_model(model_id)
    solver = ModalSolver(model, n_modes=req.n_modes)
    return await _run(model_id, "modal", solver)


@router.post("/dynamic/{model_id}", response_model=DynamicResults)
async def dynamic_analysis(model_id: str, req: DynamicAnalysisRequest = DynamicAnalysisRequest()):
    model = _get_model(model_id)
    solver = DynamicSolver(
        model, dt=req.dt, t_end=req.t_end, beta=req.beta, gamma=req.gamma,
        rayleigh_alpha=req.rayleigh_alpha, rayleigh_beta=req.rayleigh_beta,
        save_every=req.save_every, store_nodes=req.store_nodes,
    )
    return await _run(model_id, "dynamic", solver)


@router.get("/results/{model_id}/{analysis_type}")
def get_results(model_id: str, analysis_type: str):
    r = storage.get_results(model_id, analysis_type)
    if r is None:
        raise HTTPException(404, f"Nessun risultato di tipo '{analysis_type}' per modello {model_id}")
    return r


class BucklingRequest(BaseModel):
    n_modes: int = Field(default=5, ge=1, le=20)


@router.post("/buckling/{model_id}")
async def buckling_analysis(model_id: str, req: BucklingRequest = BucklingRequest()):
    model = _get_model(model_id)
    solver = BucklingSolver(model, n_modes=req.n_modes)
    try:
        result = solver.solve()
    except Exception as e:
        raise HTTPException(500, str(e))
    storage.save_results(model_id, "buckling", result)
    return result


class RayleighRequest(BaseModel):
    f1_hz: float
    f2_hz: float
    damping_ratio: float = 0.05


@router.post("/rayleigh")
def rayleigh_from_targets(req: RayleighRequest):
    """Calcola α, β di Rayleigh data una coppia (f1, f2) con smorzamento ξ.

    Sistema: ξ_i = 0.5 (α/ω_i + β·ω_i)  i=1,2.
    """
    import math as _m
    if req.f1_hz <= 0 or req.f2_hz <= 0:
        raise HTTPException(400, "Le frequenze devono essere > 0")
    if abs(req.f1_hz - req.f2_hz) < 1e-9:
        raise HTTPException(400, "f1 e f2 devono essere distinte")
    w1 = 2 * _m.pi * req.f1_hz
    w2 = 2 * _m.pi * req.f2_hz
    xi = req.damping_ratio
    alpha = 2 * xi * (w1 * w2) / (w1 + w2)
    beta = 2 * xi / (w1 + w2)
    return {
        "alpha": float(alpha),
        "beta": float(beta),
        "omega1": float(w1),
        "omega2": float(w2),
        "damping_ratio": float(xi),
    }


class FFTRequest(BaseModel):
    node_id: int
    component: str = "ux"


@router.post("/fft/{model_id}")
def fft_of_node(model_id: str, req: FFTRequest):
    dyn = storage.get_results(model_id, "dynamic")
    if dyn is None:
        raise HTTPException(404, "Nessun risultato dinamico — esegui prima un'analisi dinamica.")
    history = dyn.node_history.get(req.node_id)
    if history is None:
        raise HTTPException(404, f"Nodo {req.node_id} non presente nella storia salvata.")
    signal = history.get(req.component)
    if signal is None:
        raise HTTPException(400, f"Componente '{req.component}' non valida (usa ux/uy/uz/ax/ay/az).")
    return fft_spectrum(dyn.times, signal)


class ResponseSpectrumRequest(BaseModel):
    node_id: int
    component: str = "ax"
    damping_ratio: float = 0.05


@router.post("/response_spectrum/{model_id}")
def response_spectrum_of_node(model_id: str, req: ResponseSpectrumRequest):
    dyn = storage.get_results(model_id, "dynamic")
    if dyn is None:
        raise HTTPException(404, "Nessun risultato dinamico disponibile.")
    history = dyn.node_history.get(req.node_id)
    if history is None:
        raise HTTPException(404, f"Nodo {req.node_id} non presente.")
    signal = history.get(req.component)
    if signal is None:
        raise HTTPException(400, f"Componente '{req.component}' non valida.")
    return response_spectrum(dyn.times, signal, damping_ratio=req.damping_ratio)


# ============================================================================
# M3 — Push-over (FASE 6)
# ============================================================================

class PushoverRequest(BaseModel):
    lambda_step: float = Field(default=0.05, gt=0, le=1.0,
                                description="Incremento del moltiplicatore di carico per step.")
    lambda_max: float = Field(default=5.0, gt=0, le=100.0,
                               description="Moltiplicatore massimo di carico.")
    max_steps: int = Field(default=200, ge=1, le=1000)
    delta_max_for_stop: float = Field(default=1.0, gt=0,
                                       description="Spostamento massimo [m] oltre il quale si arresta.")


@router.post("/pushover/{model_id}")
def pushover_analysis(model_id: str, req: PushoverRequest = PushoverRequest()):
    """Analisi pushover a controllo di carico con cerniere plastiche concentrate.

    NTC 2018 §7.3.4.1 / EC8 §4.3.3.4. Restituisce curva di capacità (λ, δ)
    + lista hinge events + collapse_lambda.
    """
    model = _get_model(model_id)
    solver = PushoverSolver(
        model,
        lambda_step=req.lambda_step,
        lambda_max=req.lambda_max,
        max_steps=req.max_steps,
        delta_max_for_stop=req.delta_max_for_stop,
    )
    try:
        results = solver.solve()
    except Exception as e:
        raise HTTPException(500, str(e))
    payload = asdict(results)
    storage.save_results(model_id, "pushover", payload)
    return payload


# ============================================================================
# M3 — Sismica time-history multi-componente (FASE 12)
# ============================================================================

class SeismicTHRequest(BaseModel):
    """Componenti X/Y/Z come liste [t, ag]. Almeno una richiesta."""
    components: dict[str, list[tuple[float, float]]] = Field(
        ...,
        description="Map asse→time history. Es: {\"X\": [[0,0],[0.01,0.5],...]}."
    )
    dt: float = Field(default=0.01, gt=0)
    t_end: float | None = Field(default=None, gt=0,
                                  description="Durata simulazione [s]. Auto = max(t).")
    damping_xi: float = Field(default=0.05, ge=0.0, le=0.5)
    omega_lo_hz: float = Field(default=0.5, gt=0,
                                description="Freq. bassa per Rayleigh damping [Hz].")
    omega_hi_hz: float = Field(default=10.0, gt=0,
                                description="Freq. alta per Rayleigh damping [Hz].")
    save_every: int = Field(default=1, ge=1)
    store_nodes: list[int] | None = None


@router.post("/seismic_th/{model_id}")
def seismic_time_history(model_id: str, req: SeismicTHRequest):
    """Analisi sismica time-history multi-componente (X/Y/Z).

    Vedi SeismicTimeHistorySolver (FASE 12). Output = DynamicResults.
    """
    import math
    model = _get_model(model_id)
    if not req.components:
        raise HTTPException(400, "Almeno una componente sismica richiesta (X/Y/Z).")
    try:
        solver = SeismicTimeHistorySolver(
            model,
            components=req.components,
            dt=req.dt,
            t_end=req.t_end,
            damping_xi=req.damping_xi,
            omega_lo=2 * math.pi * req.omega_lo_hz,
            omega_hi=2 * math.pi * req.omega_hi_hz,
            save_every=req.save_every,
            store_nodes=req.store_nodes,
        )
        results = solver.solve()
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, str(e))
    storage.save_results(model_id, "seismic_th", results)
    return results


# ============================================================================
# BL-1 — Statica non-lineare Newton-Raphson + cavi tension-only
# ============================================================================

class NonLinearRequest(BaseModel):
    """Parametri Newton-Raphson per cavi tension-only e K_G beam."""
    n_steps: int = Field(default=10, ge=1, le=200,
                          description="Numero sub-step di carico (load-control).")
    max_iter: int = Field(default=25, ge=1, le=200,
                           description="Massimo numero di iterate NR per step.")
    tol: float = Field(default=1e-6, gt=0, le=1e-2,
                        description="Tolleranza relativa sul residuo.")
    include_kg_beam: bool = Field(default=True,
                                   description="Se False, disabilita K_G(N) per beam2D "
                                              "(utile per debug delle non-linearità cavo).")


@router.post("/nonlinear/{model_id}")
def nonlinear_static_analysis(model_id: str, req: NonLinearRequest = NonLinearRequest()):
    """Statica non-lineare con Newton-Raphson load-controlled (BL-1).

    Supporta:
      - Cavi tension-only (CABLE2D/CABLE3D) — la rigidezza si annulla in
        compressione (slack).
      - Non-linearità geometrica leggera per BEAM2D via K_T = K_e + K_G(N).

    Restituisce step di carico, n. iterazioni e residuo, oltre a
    displacements/forces finali.
    """
    model = _get_model(model_id)
    try:
        solver = NonLinearStaticSolver(
            model,
            n_steps=req.n_steps,
            max_iter=req.max_iter,
            tol=req.tol,
            include_kg_beam=req.include_kg_beam,
        )
        results = solver.solve()
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, str(e))
    payload = asdict(results)
    storage.save_results(model_id, "nonlinear_static", payload)
    return payload


# ============================================================================
# BL-2 — Arc-length post-buckling solver (Crisfield)
# ============================================================================

class ArcLengthRequest(BaseModel):
    n_steps: int = Field(default=30, ge=1, le=500,
                          description="Numero target di sub-step path-following.")
    delta_s: float | None = Field(default=None, gt=0,
                                    description="Lunghezza d'arco prescritta. None=auto.")
    max_iter: int = Field(default=25, ge=1, le=200)
    tol: float = Field(default=1e-6, gt=0, le=1e-2)
    control_dof: int | None = Field(default=None,
                                      description="DOF di controllo per la curva λ-δ. None=auto.")
    lambda_max: float = Field(default=50.0, gt=0, le=1000)
    delta_max: float = Field(default=1.0, gt=0, le=1000)
    initial_lambda: float = Field(default=0.05, gt=0, le=1.0)


@router.post("/arclength/{model_id}")
def arclength_analysis(model_id: str, req: ArcLengthRequest = ArcLengthRequest()):
    """Arc-length cylindrical (Crisfield) per analisi post-buckling (BL-2).

    Restituisce la curva λ-δ (carico-spostamento del control dof), gli step
    Newton, e i displacements finali. Utile per tracciare snap-through e
    snap-back oltre i punti limite.
    """
    model = _get_model(model_id)
    try:
        solver = ArcLengthSolver(
            model,
            n_steps=req.n_steps,
            delta_s=req.delta_s,
            max_iter=req.max_iter,
            tol=req.tol,
            control_dof=req.control_dof,
            lambda_max=req.lambda_max,
            delta_max=req.delta_max,
            initial_lambda=req.initial_lambda,
        )
        results = solver.solve()
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, str(e))
    payload = asdict(results)
    storage.save_results(model_id, "arc_length", payload)
    return payload


# ============================================================================
# M3 — Fatica Rainflow + Miner (FASE 14)
# ============================================================================

class FatigueRequest(BaseModel):
    """Calcolo fatica su un segnale arbitrario di stress [MPa].

    Il chiamante fornisce il segnale (di solito Δσ derivato da un'analisi
    dinamica/time-history) e la categoria EC3 da applicare.
    """
    signal: list[float] = Field(..., description="Segnale di tensione [MPa].")
    ec3_category: int | None = Field(
        default=80,
        description="Categoria di dettaglio EC3-1-9 Tab. 8.1. None per usare delta_sigma_C custom.",
    )
    delta_sigma_C: float | None = Field(
        default=None,
        description="Range di riferimento [MPa] a 2e6 cicli (se ec3_category=None).",
    )
    gamma_Mf: float = Field(default=1.0, gt=0, le=2.0,
                             description="Fattore parziale γ_Mf (EC3-1-9 §3).")
    n_bins: int = Field(default=10, ge=2, le=50)


@router.post("/fatigue")
def fatigue_analysis(req: FatigueRequest):
    """Rainflow ASTM E1049-85 + Palmgren-Miner damage.

    Restituisce:
        - cycles: lista {range, mean, count}
        - histogram: {bins, counts}
        - damage_D: Σ n_i/N_i (failure se D ≥ 1)
        - n_cycles_total: somma count
        - delta_sigma_max: max range
    """
    if len(req.signal) < 2:
        raise HTTPException(400, "Il segnale deve avere almeno 2 punti.")

    # Curva S-N
    if req.ec3_category is not None:
        try:
            curve = ec3_category(req.ec3_category)
        except KeyError as e:
            raise HTTPException(400, str(e))
    elif req.delta_sigma_C is not None and req.delta_sigma_C > 0:
        curve = SNCurve(delta_sigma_C=req.delta_sigma_C)
    else:
        raise HTTPException(400, "Specifica ec3_category oppure delta_sigma_C > 0.")

    turning = extract_peaks_valleys(req.signal)
    cycles = rainflow_count(turning)
    bins, counts = cycle_histogram(cycles, n_bins=req.n_bins)
    damage = miner_damage(cycles, curve, safety_factor_gamma_Mf=req.gamma_Mf)

    return {
        "cycles": [
            {"range": c.range, "mean": c.mean, "count": c.count}
            for c in cycles
        ],
        "histogram": {
            "bins": [{"lo": b[0], "hi": b[1]} for b in bins],
            "counts": counts,
        },
        "damage_D": damage,
        "n_cycles_total": sum(c.count for c in cycles),
        "delta_sigma_max": max((c.range for c in cycles), default=0.0),
        "sn_curve": {
            "delta_sigma_C": curve.delta_sigma_C,
            "m1": curve.m1, "m2": curve.m2,
            "N_C": curve.N_C, "N_D": curve.N_D, "N_L": curve.N_L,
        },
        "gamma_Mf": req.gamma_Mf,
        "n_turning_points": len(turning),
    }
