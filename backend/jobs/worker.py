"""JobWorker async (Sprint 1 — A5).

Worker single-shot che consuma la coda. Dispatcher mappa SolverKind a una
callable sync `(model, params, progress_cb) -> result`. Risultati salvati in
`storage.save_results`. Eventi pubblicati via WebSocket.
"""
from __future__ import annotations

import asyncio
import time
from dataclasses import asdict, is_dataclass
from typing import Any, Callable

from billing import job_meter
from billing.middleware import check_quota_for_solve
from billing.quotas import QuotaExceeded, quota_store
from api.websocket import broadcast_job_event, broadcast_progress

from .models import Job
from .store import JobStore, job_store as _global_store


SolverCallable = Callable[[Any, dict, Callable | None], Any]


# Idle sleep tra polling della queue (s).
_POLL_INTERVAL = 0.1


def _serialize_result(result: Any) -> dict:
    """Converte risultati solver (dataclass / pydantic / dict / primitive) in dict."""
    if result is None:
        return {}
    if isinstance(result, dict):
        return result
    if is_dataclass(result):
        return asdict(result)
    if hasattr(result, "model_dump"):
        return result.model_dump()
    if hasattr(result, "dict"):
        return result.dict()
    return {"value": result}


def build_default_dispatcher() -> dict[str, SolverCallable]:
    """Mappa SolverKind -> funzione di esecuzione sincrona.

    Importazioni lazy per evitare cicli all'avvio dei test.
    """
    from core.solver import StaticSolver, ModalSolver, DynamicSolver, BucklingSolver
    from core.solver.pushover_solver import PushoverSolver
    from core.solver.seismic_th_solver import SeismicTimeHistorySolver
    from core.solver.nonlinear_solver import NonLinearStaticSolver
    from core.solver.arclength_solver import ArcLengthSolver
    import math

    def _run_linear(model, params, cb):
        return StaticSolver(model).solve(progress_cb=cb)

    def _run_modal(model, params, cb):
        return ModalSolver(model, n_modes=int(params.get("n_modes", 10))).solve(progress_cb=cb)

    def _run_dynamic(model, params, cb):
        return DynamicSolver(
            model,
            dt=float(params.get("dt", 0.01)),
            t_end=float(params.get("t_end", 1.0)),
            beta=float(params.get("beta", 0.25)),
            gamma=float(params.get("gamma", 0.5)),
        ).solve(progress_cb=cb)

    def _run_buckling(model, params, cb):
        return BucklingSolver(model, n_modes=int(params.get("n_modes", 5))).solve()

    def _run_pushover(model, params, cb):
        return PushoverSolver(
            model,
            lambda_step=float(params.get("lambda_step", 0.05)),
            lambda_max=float(params.get("lambda_max", 5.0)),
            max_steps=int(params.get("max_steps", 200)),
            delta_max_for_stop=float(params.get("delta_max_for_stop", 1.0)),
        ).solve(progress_cb=cb)

    def _run_seismic(model, params, cb):
        components = params.get("components") or {}
        return SeismicTimeHistorySolver(
            model,
            components=components,
            dt=float(params.get("dt", 0.01)),
            t_end=params.get("t_end"),
            damping_xi=float(params.get("damping_xi", 0.05)),
            omega_lo=2 * math.pi * float(params.get("omega_lo_hz", 0.5)),
            omega_hi=2 * math.pi * float(params.get("omega_hi_hz", 10.0)),
            save_every=int(params.get("save_every", 1)),
            store_nodes=params.get("store_nodes"),
        ).solve(progress_cb=cb)

    def _run_nonlinear(model, params, cb):
        return NonLinearStaticSolver(
            model,
            n_steps=int(params.get("n_steps", 10)),
            max_iter=int(params.get("max_iter", 25)),
            tol=float(params.get("tol", 1e-6)),
            include_kg_beam=bool(params.get("include_kg_beam", True)),
        ).solve(progress_cb=cb)

    def _run_arclength(model, params, cb):
        return ArcLengthSolver(
            model,
            n_steps=int(params.get("n_steps", 30)),
            delta_s=params.get("delta_s"),
            max_iter=int(params.get("max_iter", 25)),
            tol=float(params.get("tol", 1e-6)),
            control_dof=params.get("control_dof"),
            lambda_max=float(params.get("lambda_max", 50.0)),
            delta_max=float(params.get("delta_max", 1.0)),
            initial_lambda=float(params.get("initial_lambda", 0.05)),
        ).solve(progress_cb=cb)

    return {
        "linear": _run_linear,
        "modal": _run_modal,
        "buckling": _run_buckling,
        "dynamic_th": _run_dynamic,
        "seismic_th": _run_seismic,
        "pushover": _run_pushover,
        "nonlinear": _run_nonlinear,
        "arclength": _run_arclength,
    }


class JobWorker:
    """Worker async che consuma la coda finche' `stop()` non viene chiamato."""

    def __init__(
        self,
        dispatcher: dict[str, SolverCallable] | None = None,
        store: JobStore | None = None,
        get_model: Callable[[str], Any] | None = None,
    ) -> None:
        self.dispatcher = dispatcher or {}
        self.store = store or _global_store
        if get_model is None:
            import storage as _storage
            get_model = _storage.get_model
        self.get_model = get_model
        self._task: asyncio.Task | None = None
        self._running = False
        self._idle_event = asyncio.Event()  # set quando la coda e' vuota

    def is_running(self) -> bool:
        return self._running

    async def start(self) -> None:
        if self._task is not None:
            return
        self._running = True
        self._task = asyncio.create_task(self._loop())

    async def stop(self) -> None:
        self._running = False
        if self._task is not None:
            self._task.cancel()
            try:
                await self._task
            except (asyncio.CancelledError, Exception):
                pass
            self._task = None

    async def _loop(self) -> None:
        try:
            while self._running:
                job = self.store.dequeue()
                if job is None:
                    self._idle_event.set()
                    await asyncio.sleep(_POLL_INTERVAL)
                    continue
                self._idle_event.clear()
                await self._run_job(job)
        except asyncio.CancelledError:
            pass

    async def run_one(self) -> Job | None:
        """Esegue UN job se disponibile (utile per i test)."""
        job = self.store.dequeue()
        if job is None:
            return None
        await self._run_job(job)
        return self.store.get(job.job_id)

    async def _run_job(self, job: Job) -> None:
        # Notifica started
        try:
            await broadcast_job_event(
                job.user_id, "job_started", {"job_id": job.job_id, "solver": job.solver}
            )
        except Exception:
            pass

        # 1. quota check
        try:
            check_quota_for_solve(job.user_id, job.estimate)
        except Exception as exc:  # noqa: BLE001
            self.store.update(job.job_id, status="failed", error=f"quota: {exc}", ended_at=time.time())
            await broadcast_job_event(
                job.user_id, "job_failed", {"job_id": job.job_id, "error": str(exc)}
            )
            return

        # 2. carica modello
        model = self.get_model(job.model_id)
        if model is None:
            self.store.update(
                job.job_id, status="failed",
                error=f"model {job.model_id} non trovato", ended_at=time.time(),
            )
            await broadcast_job_event(
                job.user_id, "job_failed",
                {"job_id": job.job_id, "error": "model_not_found"},
            )
            return

        fn = self.dispatcher.get(job.solver)
        if fn is None:
            self.store.update(
                job.job_id, status="failed",
                error=f"solver {job.solver} non in dispatcher", ended_at=time.time(),
            )
            await broadcast_job_event(
                job.user_id, "job_failed",
                {"job_id": job.job_id, "error": "solver_not_dispatched"},
            )
            return

        # 3. esegui con measure_job + executor
        loop = asyncio.get_running_loop()

        def _progress_cb(p: float, msg: str = ""):
            # progress sync -> WS sia /ws/analysis che /ws/jobs
            try:
                asyncio.run_coroutine_threadsafe(
                    broadcast_progress(job.model_id, p, msg), loop
                )
                asyncio.run_coroutine_threadsafe(
                    broadcast_job_event(job.user_id, "job_progress",
                                         {"job_id": job.job_id, "progress": float(p),
                                          "message": msg}), loop
                )
            except Exception:
                pass

        try:
            with job_meter.measure_job(
                user_id=job.user_id,
                solver=job.solver,
                model_id=job.model_id,
                n_dof=job.estimate.n_dof,
                estimate=job.estimate,
            ) as record:
                result = await loop.run_in_executor(
                    None, lambda: fn(model, dict(job.params or {}), _progress_cb)
                )
            # success: serializza + salva
            payload = _serialize_result(result)
            try:
                import storage as _storage
                _storage.save_results(job.model_id, job.solver, payload)
            except Exception:
                pass
            # consuma quota
            try:
                actual = record.actual_credits if record.actual_credits is not None else job.estimate.credits
                quota_store.consume(job.user_id, float(actual))
            except QuotaExceeded:
                pass
            self.store.update(
                job.job_id, status="done", ended_at=time.time(),
                result_ref=f"results:{job.model_id}:{job.solver}",
            )
            await broadcast_job_event(
                job.user_id, "job_done",
                {"job_id": job.job_id, "result_ref": f"results:{job.model_id}:{job.solver}"},
            )
        except Exception as exc:  # noqa: BLE001
            # Retry se sotto max_retries
            if job.attempts < (job.max_retries or 0):
                # re-enqueue: status -> queued
                self.store.update(
                    job.job_id, status="queued",
                    error=f"{type(exc).__name__}: {exc}",
                )
                await broadcast_job_event(
                    job.user_id, "job_retry",
                    {"job_id": job.job_id, "attempts": job.attempts + 1,
                     "error": str(exc)},
                )
            else:
                self.store.update(
                    job.job_id, status="failed", ended_at=time.time(),
                    error=f"{type(exc).__name__}: {exc}",
                )
                await broadcast_job_event(
                    job.user_id, "job_failed",
                    {"job_id": job.job_id, "error": str(exc)},
                )


# Singleton lazy: creato con dispatcher di default al primo accesso
_worker_singleton: JobWorker | None = None


def get_worker() -> JobWorker:
    global _worker_singleton
    if _worker_singleton is None:
        _worker_singleton = JobWorker(dispatcher=build_default_dispatcher())
    return _worker_singleton
