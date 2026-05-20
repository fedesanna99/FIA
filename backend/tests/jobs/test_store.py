"""Tests A5 — JobStore SQLite (Sprint 1)."""
from __future__ import annotations

import time
from pathlib import Path

import pytest

from billing.schemas import CostEstimate
from jobs.models import Job
from jobs.store import JobStore


@pytest.fixture
def store(tmp_path: Path) -> JobStore:
    return JobStore(db_path=tmp_path / "jobs.sqlite")


def _make_job(**overrides) -> Job:
    estimate = CostEstimate(
        solver="linear", n_dof=120, cpu_min=0.01, ram_mb=80.0,
        eta_s=0.1, credits=0.5, explanation="t",
    )
    base = dict(
        user_id="alice", solver="linear", model_id="m1",
        params={}, estimate=estimate, priority="standard",
        max_retries=1,
    )
    base.update(overrides)
    return Job(**base)


def test_enqueue_persists_job(store):
    j = store.enqueue(_make_job())
    assert j.status == "queued"
    again = store.get(j.job_id)
    assert again.job_id == j.job_id
    assert again.status == "queued"


def test_dequeue_returns_highest_priority(store):
    store.enqueue(_make_job(priority="standard"))
    urgent = store.enqueue(_make_job(priority="urgent"))
    store.enqueue(_make_job(priority="fast"))
    j = store.dequeue()
    assert j is not None
    assert j.job_id == urgent.job_id
    assert j.status == "running"


def test_dequeue_marks_running_atomic(store):
    j_in = store.enqueue(_make_job())
    j = store.dequeue()
    assert j is not None
    assert j.status == "running"
    assert j.started_at is not None
    assert j.attempts == 1
    # Riletto: stato persistito
    again = store.get(j_in.job_id)
    assert again.status == "running"


def test_dequeue_empty_returns_none(store):
    assert store.dequeue() is None


def test_update_persists(store):
    j = store.enqueue(_make_job())
    upd = store.update(j.job_id, status="done", error=None)
    assert upd.status == "done"
    assert store.get(j.job_id).status == "done"


def test_list_filters_by_user_and_status(store):
    store.enqueue(_make_job(user_id="alice"))
    store.enqueue(_make_job(user_id="alice"))
    store.enqueue(_make_job(user_id="bob"))
    assert len(store.list(user_id="alice")) == 2
    assert len(store.list(user_id="bob")) == 1
    # cambia status
    j = store.enqueue(_make_job(user_id="alice"))
    store.update(j.job_id, status="done")
    queued = store.list(user_id="alice", status="queued")
    assert all(x.status == "queued" for x in queued)
    assert len(queued) == 2


def test_cancel_marks_cancelled(store):
    j = store.enqueue(_make_job())
    c = store.cancel(j.job_id)
    assert c.status == "cancelled"


def test_cancel_running_job_idempotent(store):
    j = store.enqueue(_make_job())
    store.dequeue()  # diventa running
    c = store.cancel(j.job_id)
    assert c.status == "cancelled"
    # secondo cancel: idempotente
    c2 = store.cancel(j.job_id)
    assert c2.status == "cancelled"


def test_dequeue_skips_cancelled(store):
    j = store.enqueue(_make_job())
    store.cancel(j.job_id)
    assert store.dequeue() is None


def test_priority_order_within_same_status(store):
    a = store.enqueue(_make_job(priority="standard"))
    time.sleep(0.005)
    b = store.enqueue(_make_job(priority="standard"))
    # standard, standard: FIFO sul created_at
    first = store.dequeue()
    assert first.job_id == a.job_id
    second = store.dequeue()
    assert second.job_id == b.job_id
