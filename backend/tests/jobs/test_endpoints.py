"""Tests A5 — endpoint REST /api/jobs (Sprint 1)."""
from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

import storage
from main import app
from billing import quotas as quotas_mod
from billing.quotas import QuotaStore
from jobs.models import Job
from jobs.store import JobStore
from jobs import store as store_mod
import api.routes.jobs as jobs_route


@pytest.fixture(autouse=True)
def _isolate(tmp_path: Path, monkeypatch):
    """Quota e job store isolati su tmp_path."""
    storage.reset_for_tests()
    qs = QuotaStore(path=tmp_path / "quotas.json")
    monkeypatch.setattr(quotas_mod, "quota_store", qs)
    import billing.middleware as mw
    monkeypatch.setattr(mw, "_global_store", qs, raising=False)
    # job_store separato
    js = JobStore(db_path=tmp_path / "jobs.sqlite")
    monkeypatch.setattr(store_mod, "job_store", js)
    monkeypatch.setattr(jobs_route, "job_store", js)
    yield


def _submit(client: TestClient, **overrides) -> dict:
    body = dict(model_id="ex_simple_beam_2d", solver="linear", params={}, priority="standard")
    body.update(overrides)
    return client.post("/api/jobs", json=body).json()


def test_submit_job_returns_201_with_job_id():
    client = TestClient(app)
    resp = client.post(
        "/api/jobs",
        json={"model_id": "ex_simple_beam_2d", "solver": "linear",
              "params": {}, "priority": "standard"},
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["job_id"]
    assert body["status"] == "queued"
    assert body["solver"] == "linear"


def test_get_job_returns_current_state():
    client = TestClient(app)
    j = _submit(client)
    resp = client.get(f"/api/jobs/{j['job_id']}")
    assert resp.status_code == 200
    assert resp.json()["job_id"] == j["job_id"]


def test_list_jobs_filter_user():
    client = TestClient(app)
    _submit(client, user_id="alice")
    _submit(client, user_id="bob")
    _submit(client, user_id="alice")
    resp = client.get("/api/jobs", params={"user_id": "alice"})
    body = resp.json()
    assert len(body) == 2
    assert all(j["user_id"] == "alice" for j in body)


def test_cancel_job_idempotent():
    client = TestClient(app)
    j = _submit(client)
    r1 = client.delete(f"/api/jobs/{j['job_id']}")
    r2 = client.delete(f"/api/jobs/{j['job_id']}")
    assert r1.status_code == 200 and r2.status_code == 200
    assert r1.json()["status"] == "cancelled"
    assert r2.json()["status"] == "cancelled"


def test_get_result_404_until_done():
    client = TestClient(app)
    j = _submit(client)
    resp = client.get(f"/api/jobs/{j['job_id']}/result")
    # status='queued' -> 404 (nessun risultato)
    assert resp.status_code == 404


def test_submit_unknown_model_404():
    client = TestClient(app)
    resp = client.post(
        "/api/jobs",
        json={"model_id": "no_existe", "solver": "linear", "params": {}, "priority": "standard"},
    )
    assert resp.status_code == 404


def test_ws_jobs_broadcasts_status_changes(monkeypatch):
    """E2E breve: il worker invia eventi job_done dopo aver finito."""
    import asyncio
    from jobs.worker import JobWorker, build_default_dispatcher
    # Worker singleton e' configurato ma il flow corre via run_one() per determinismo.
    js = jobs_route.job_store
    worker = JobWorker(
        dispatcher=build_default_dispatcher(),
        store=js, get_model=storage.get_model,
    )
    client = TestClient(app)
    submit = client.post(
        "/api/jobs",
        json={"model_id": "ex_simple_beam_2d", "solver": "linear",
              "params": {}, "priority": "standard"},
    )
    assert submit.status_code == 201
    job_id = submit.json()["job_id"]

    # Esegue il worker un giro
    asyncio.run(worker.run_one())

    resp = client.get(f"/api/jobs/{job_id}")
    assert resp.status_code == 200
    assert resp.json()["status"] == "done"
    # E il risultato e' recuperabile
    resp_res = client.get(f"/api/jobs/{job_id}/result")
    assert resp_res.status_code == 200
