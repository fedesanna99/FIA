"""Tests A5 — JobWorker (Sprint 1)."""
from __future__ import annotations

import asyncio
import time
from pathlib import Path

import pytest

import storage
from billing import job_meter, quotas as quotas_mod
from billing.quotas import QuotaStore
from billing.schemas import CostEstimate
from jobs import worker as worker_mod
from jobs.models import Job
from jobs.store import JobStore
from jobs.worker import JobWorker


@pytest.fixture(autouse=True)
def _isolate(tmp_path: Path, monkeypatch):
    """Isola audit JSONL e quota store su tmp_path per ogni test."""
    monkeypatch.setattr(job_meter, "AUDIT_LOG", tmp_path / "jobs.jsonl")
    qs = QuotaStore(path=tmp_path / "quotas.json")
    monkeypatch.setattr(quotas_mod, "quota_store", qs)
    import billing.middleware as mw
    monkeypatch.setattr(mw, "_global_store", qs, raising=False)
    monkeypatch.setattr(worker_mod, "quota_store", qs, raising=False)
    yield


def _estimate(credits: float = 0.5) -> CostEstimate:
    return CostEstimate(
        solver="linear", n_dof=120, cpu_min=0.01, ram_mb=80.0,
        eta_s=0.1, credits=credits, explanation="t",
    )


def _enqueue(store: JobStore, **overrides) -> Job:
    base = dict(
        user_id="alice", solver="linear", model_id="m1",
        params={}, estimate=_estimate(), priority="standard",
        max_retries=0,
    )
    base.update(overrides)
    j = Job(**base)
    return store.enqueue(j)


def _ok_dispatcher(model, params, cb):
    if cb:
        cb(0.5, "halfway")
        cb(1.0, "done")
    return {"ok": True, "n": len(model.get("nodes", []) if isinstance(model, dict) else [])}


def _flaky_dispatcher_factory():
    calls = {"n": 0}

    def fn(model, params, cb):
        calls["n"] += 1
        if calls["n"] < 2:
            raise RuntimeError("flaky")
        return {"ok": True, "calls": calls["n"]}

    return fn, calls


def _slow_dispatcher(model, params, cb):
    time.sleep(0.05)
    return {"slow": True}


def _model_lookup(model_id: str):
    return {"id": model_id, "nodes": [{"id": 1}, {"id": 2}]}


def _run_async(coro):
    return asyncio.run(coro)


def test_worker_processes_queued_job(tmp_path):
    store = JobStore(db_path=tmp_path / "jobs.sqlite")
    worker = JobWorker(
        dispatcher={"linear": _ok_dispatcher},
        store=store, get_model=_model_lookup,
    )
    job = _enqueue(store)
    final = _run_async(worker.run_one())
    assert final is not None
    assert final.status == "done"
    assert final.error is None


def test_worker_updates_status_done(tmp_path):
    store = JobStore(db_path=tmp_path / "jobs.sqlite")
    worker = JobWorker(
        dispatcher={"linear": _ok_dispatcher},
        store=store, get_model=_model_lookup,
    )
    job = _enqueue(store)
    _run_async(worker.run_one())
    j = store.get(job.job_id)
    assert j.status == "done"
    assert j.ended_at is not None


def test_worker_records_via_measure_job(tmp_path):
    store = JobStore(db_path=tmp_path / "jobs.sqlite")
    worker = JobWorker(
        dispatcher={"linear": _ok_dispatcher},
        store=store, get_model=_model_lookup,
    )
    _enqueue(store)
    _run_async(worker.run_one())
    rows = job_meter.read_audit_log()
    assert len(rows) == 1
    assert rows[0]["status"] == "done"


def test_worker_consumes_quota_on_done(tmp_path):
    store = JobStore(db_path=tmp_path / "jobs.sqlite")
    worker = JobWorker(
        dispatcher={"linear": _ok_dispatcher},
        store=store, get_model=_model_lookup,
    )
    _enqueue(store, estimate=_estimate(credits=2.0))
    _run_async(worker.run_one())
    q = quotas_mod.quota_store.get("alice")
    assert q.used_credits > 0


def test_worker_re_enqueues_on_failure_under_max_retries(tmp_path):
    store = JobStore(db_path=tmp_path / "jobs.sqlite")
    fn, calls = _flaky_dispatcher_factory()
    worker = JobWorker(
        dispatcher={"linear": fn},
        store=store, get_model=_model_lookup,
    )
    j = _enqueue(store, max_retries=2)
    _run_async(worker.run_one())   # primo tentativo: failure -> requeue
    # status dovrebbe essere queued di nuovo
    after = store.get(j.job_id)
    assert after.status == "queued"
    # secondo run consuma e completa
    _run_async(worker.run_one())
    final = store.get(j.job_id)
    assert final.status == "done"
    assert calls["n"] == 2


def test_worker_marks_failed_after_max_retries(tmp_path):
    store = JobStore(db_path=tmp_path / "jobs.sqlite")

    def always_fail(model, params, cb):
        raise RuntimeError("nope")

    worker = JobWorker(
        dispatcher={"linear": always_fail},
        store=store, get_model=_model_lookup,
    )
    j = _enqueue(store, max_retries=0)
    _run_async(worker.run_one())
    final = store.get(j.job_id)
    assert final.status == "failed"
    assert "nope" in (final.error or "")


def test_worker_respects_priority_order(tmp_path):
    store = JobStore(db_path=tmp_path / "jobs.sqlite")
    order: list[str] = []

    def fn(model, params, cb):
        order.append(params.get("tag", "?"))
        return {}

    worker = JobWorker(
        dispatcher={"linear": fn},
        store=store, get_model=_model_lookup,
    )
    _enqueue(store, priority="standard", params={"tag": "std"})
    _enqueue(store, priority="urgent", params={"tag": "urg"})
    _enqueue(store, priority="fast", params={"tag": "fast"})

    async def run_three():
        await worker.run_one()
        await worker.run_one()
        await worker.run_one()

    _run_async(run_three())
    assert order == ["urg", "fast", "std"]


def test_worker_stops_gracefully(tmp_path):
    store = JobStore(db_path=tmp_path / "jobs.sqlite")
    worker = JobWorker(
        dispatcher={"linear": _ok_dispatcher},
        store=store, get_model=_model_lookup,
    )

    async def body():
        await worker.start()
        # poco tempo per partire
        await asyncio.sleep(0.05)
        await worker.stop()
        return worker.is_running()

    res = _run_async(body())
    assert res is False
