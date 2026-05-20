"""Test edge cases JobWorker (Sprint 1 follow-up — coverage 75%->90%)."""
from __future__ import annotations

import asyncio
from dataclasses import dataclass
from pathlib import Path

import pytest

import storage
from billing import job_meter, quotas as quotas_mod
from billing.quotas import QuotaStore, Tier
from billing.schemas import CostEstimate
from jobs import worker as worker_mod
from jobs.models import Job
from jobs.store import JobStore
from jobs.worker import (
    JobWorker, _serialize_result, build_default_dispatcher, get_worker,
)


@pytest.fixture(autouse=True)
def _isolate(tmp_path: Path, monkeypatch):
    monkeypatch.setattr(job_meter, "AUDIT_LOG", tmp_path / "jobs.jsonl")
    qs = QuotaStore(path=tmp_path / "quotas.json")
    monkeypatch.setattr(quotas_mod, "quota_store", qs)
    import billing.middleware as mw
    monkeypatch.setattr(mw, "_global_store", qs, raising=False)
    monkeypatch.setattr(worker_mod, "quota_store", qs, raising=False)
    yield


def _est(credits: float = 0.5) -> CostEstimate:
    return CostEstimate(
        solver="linear", n_dof=120, cpu_min=0.01, ram_mb=80.0,
        eta_s=0.1, credits=credits, explanation="t",
    )


def _enqueue(store: JobStore, **overrides) -> Job:
    base = dict(
        user_id="alice", solver="linear", model_id="m1",
        params={}, estimate=_est(), priority="standard",
        max_retries=0,
    )
    base.update(overrides)
    return store.enqueue(Job(**base))


def _run_async(coro):
    return asyncio.run(coro)


# ---------------------- _serialize_result ----------------------

def test_serialize_result_none_returns_empty_dict():
    assert _serialize_result(None) == {}


def test_serialize_result_dict_passthrough():
    assert _serialize_result({"a": 1}) == {"a": 1}


def test_serialize_result_dataclass():
    @dataclass
    class R:
        x: int
        y: str
    assert _serialize_result(R(x=1, y="hi")) == {"x": 1, "y": "hi"}


def test_serialize_result_pydantic_like_model_dump():
    class Fake:
        def model_dump(self):
            return {"k": "v"}
    assert _serialize_result(Fake()) == {"k": "v"}


def test_serialize_result_pydantic_v1_like_dict():
    class Fake:
        def dict(self):
            return {"k1": "v1"}
    assert _serialize_result(Fake()) == {"k1": "v1"}


def test_serialize_result_primitive_fallback():
    assert _serialize_result(42) == {"value": 42}


# ---------------------- model_not_found ----------------------

def test_worker_marks_failed_when_model_not_found(tmp_path):
    store = JobStore(db_path=tmp_path / "jobs.sqlite")
    worker = JobWorker(
        dispatcher={"linear": lambda m, p, cb: {}},
        store=store,
        get_model=lambda _id: None,  # sempre None
    )
    j = _enqueue(store)
    _run_async(worker.run_one())
    final = store.get(j.job_id)
    assert final.status == "failed"
    assert "non trovato" in (final.error or "")


# ---------------------- solver_not_dispatched ----------------------

def test_worker_marks_failed_when_solver_not_in_dispatcher(tmp_path):
    store = JobStore(db_path=tmp_path / "jobs.sqlite")
    worker = JobWorker(
        dispatcher={},  # nessuno
        store=store,
        get_model=lambda _id: {"id": _id, "nodes": [{"id": 1}]},
    )
    j = _enqueue(store)
    _run_async(worker.run_one())
    final = store.get(j.job_id)
    assert final.status == "failed"
    assert "dispatcher" in (final.error or "")


# ---------------------- quota_exceeded blocking ----------------------

def test_worker_marks_failed_when_quota_exceeded(tmp_path, monkeypatch):
    # Imposta cap basso per forzare la quota
    qs = quotas_mod.quota_store
    qs.set_tier("alice", "free")
    qs.consume("alice", 49.99)  # quasi al cap

    store = JobStore(db_path=tmp_path / "jobs.sqlite")
    worker = JobWorker(
        dispatcher={"linear": lambda m, p, cb: {}},
        store=store,
        get_model=lambda _id: {"id": _id, "nodes": [{"id": 1}]},
    )
    # Job che richiede 10 crediti (oltre cap residuo)
    j = _enqueue(store, estimate=_est(credits=10.0))
    _run_async(worker.run_one())
    final = store.get(j.job_id)
    assert final.status == "failed"
    assert "quota" in (final.error or "").lower()


# ---------------------- run_one empty ----------------------

def test_worker_run_one_empty_returns_none(tmp_path):
    store = JobStore(db_path=tmp_path / "jobs.sqlite")
    worker = JobWorker(dispatcher={}, store=store, get_model=lambda _: None)
    res = _run_async(worker.run_one())
    assert res is None


# ---------------------- start/loop processes queued job ----------------------

def test_worker_start_loop_consumes_queue(tmp_path):
    store = JobStore(db_path=tmp_path / "jobs.sqlite")
    calls = {"n": 0}

    def fn(model, params, cb):
        calls["n"] += 1
        return {"ok": True}

    worker = JobWorker(
        dispatcher={"linear": fn},
        store=store,
        get_model=lambda _id: {"id": _id, "nodes": [{"id": 1}]},
    )
    _enqueue(store)

    async def body():
        await worker.start()
        # attendi al massimo 2 s che il loop processi
        for _ in range(40):
            await asyncio.sleep(0.05)
            if calls["n"] >= 1:
                break
        await worker.stop()

    _run_async(body())
    assert calls["n"] == 1


# ---------------------- build_default_dispatcher ----------------------

def test_build_default_dispatcher_returns_all_solvers():
    dispatcher = build_default_dispatcher()
    expected = {
        "linear", "modal", "buckling", "dynamic_th",
        "seismic_th", "pushover", "nonlinear", "arclength",
    }
    assert expected <= set(dispatcher.keys())


def test_build_default_dispatcher_linear_runs_on_demo_model():
    """Smoke: dispatcher linear() effettivamente solve un modello demo."""
    storage.reset_for_tests()
    model = storage.get_model("ex_simple_beam_2d")
    assert model is not None
    fn = build_default_dispatcher()["linear"]
    result = fn(model, {}, None)
    # StaticResults pydantic ha .displacements
    assert hasattr(result, "displacements")
    assert len(result.displacements) > 0


# ---------------------- get_worker singleton ----------------------

def test_get_worker_returns_same_instance():
    w1 = get_worker()
    w2 = get_worker()
    assert w1 is w2
    # dispatcher pre-popolato con tutti i solver
    assert "linear" in w1.dispatcher


# ---------------------- progress_cb cattura eccezioni ----------------------

def test_worker_progress_cb_swallows_exceptions(tmp_path):
    store = JobStore(db_path=tmp_path / "jobs.sqlite")

    def fn_with_bad_progress(model, params, cb):
        # Invoca cb fuori dal loop principale: il run_coroutine_threadsafe
        # potrebbe fallire; il worker deve assorbirlo
        if cb:
            cb(0.5, "mid")
        return {"ok": True}

    worker = JobWorker(
        dispatcher={"linear": fn_with_bad_progress},
        store=store,
        get_model=lambda _id: {"id": _id, "nodes": [{"id": 1}]},
    )
    j = _enqueue(store)
    _run_async(worker.run_one())
    assert store.get(j.job_id).status == "done"
