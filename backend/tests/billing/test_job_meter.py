"""Tests A2 — JobMeter middleware + audit JSONL + usage summary (Sprint 1)."""
from __future__ import annotations

import json
import threading
import time
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

import storage
from main import app
from billing import job_meter
from billing.schemas import CostEstimate


def _est(credits: float = 1.0) -> CostEstimate:
    return CostEstimate(
        solver="linear",
        n_dof=120,
        cpu_min=0.01,
        ram_mb=80.0,
        eta_s=0.15,
        credits=credits,
        explanation="test",
    )


@pytest.fixture
def audit_path(tmp_path: Path) -> Path:
    return tmp_path / "jobs.jsonl"


def _read_lines(p: Path) -> list[dict]:
    if not p.exists():
        return []
    return [json.loads(line) for line in p.read_text(encoding="utf-8").splitlines() if line.strip()]


def test_measure_job_writes_jsonl(audit_path):
    with job_meter.measure_job("u1", "linear", "m1", n_dof=120, estimate=_est(), audit_log=audit_path):
        time.sleep(0.01)
    rows = _read_lines(audit_path)
    assert len(rows) == 1
    rec = rows[0]
    assert rec["user_id"] == "u1"
    assert rec["solver"] == "linear"
    assert rec["model_id"] == "m1"
    assert rec["status"] == "done"
    assert rec["job_id"]


def test_measure_job_records_wall_time(audit_path):
    with job_meter.measure_job("u", "linear", "m", n_dof=10, estimate=_est(), audit_log=audit_path):
        time.sleep(0.05)
    rec = _read_lines(audit_path)[0]
    assert rec["wall_s"] is not None and rec["wall_s"] >= 0.04


def test_measure_job_records_cpu_time(audit_path):
    with job_meter.measure_job("u", "linear", "m", n_dof=10, estimate=_est(), audit_log=audit_path):
        # piccolo carico CPU
        s = 0
        for i in range(50_000):
            s += i * i
    rec = _read_lines(audit_path)[0]
    assert rec["cpu_s"] is not None and rec["cpu_s"] >= 0.0


def test_measure_job_records_ram_peak(audit_path):
    with job_meter.measure_job("u", "linear", "m", n_dof=10, estimate=_est(), audit_log=audit_path):
        # alloca ~1 MB di liste python
        _ = [0] * 256_000
    rec = _read_lines(audit_path)[0]
    assert rec["ram_peak_mb"] is not None and rec["ram_peak_mb"] >= 0.0


def test_measure_job_on_exception_records_failed(audit_path):
    with pytest.raises(RuntimeError):
        with job_meter.measure_job("u", "linear", "m", n_dof=10, estimate=_est(), audit_log=audit_path):
            raise RuntimeError("boom")
    rec = _read_lines(audit_path)[0]
    assert rec["status"] == "failed"
    assert "RuntimeError" in (rec.get("error") or "")
    assert rec["wall_s"] is not None  # comunque misurato


def test_measure_job_actual_credits_correlated_with_wall_s(audit_path):
    with job_meter.measure_job("u", "linear", "m", n_dof=10, estimate=_est(credits=999.0), audit_log=audit_path):
        time.sleep(0.05)
    rec = _read_lines(audit_path)[0]
    # actual_credits != estimate_credits (calcolato da wall + ram)
    assert rec["actual_credits"] != 999.0
    assert rec["actual_credits"] > 0


def test_measure_job_atomic_write_concurrent(audit_path):
    """5 thread scrivono concorrentemente: tutte le righe devono apparire."""
    errors: list[Exception] = []

    def worker(i: int):
        try:
            with job_meter.measure_job(
                f"u{i}", "linear", f"m{i}", n_dof=10, estimate=_est(), audit_log=audit_path,
            ):
                time.sleep(0.005)
        except Exception as e:  # noqa: BLE001
            errors.append(e)

    threads = [threading.Thread(target=worker, args=(i,)) for i in range(5)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    assert not errors
    rows = _read_lines(audit_path)
    assert len(rows) == 5
    # ogni riga e' un JSON valido (parsing gia' fatto)
    user_ids = {r["user_id"] for r in rows}
    assert user_ids == {f"u{i}" for i in range(5)}


def test_usage_summary_aggregates_by_solver(audit_path, monkeypatch):
    monkeypatch.setattr(job_meter, "AUDIT_LOG", audit_path)
    with job_meter.measure_job("alice", "linear", "m1", n_dof=10, estimate=_est()):
        pass
    with job_meter.measure_job("alice", "modal", "m1", n_dof=10, estimate=_est()):
        pass
    with job_meter.measure_job("alice", "linear", "m2", n_dof=10, estimate=_est()):
        pass

    client = TestClient(app)
    resp = client.get("/api/usage/alice/summary")
    assert resp.status_code == 200
    s = resp.json()
    assert s["n_jobs"] == 3
    assert s["jobs_by_solver"] == {"linear": 2, "modal": 1}
    assert s["jobs_by_status"] == {"done": 3}


def test_usage_summary_window_filter(audit_path, monkeypatch):
    monkeypatch.setattr(job_meter, "AUDIT_LOG", audit_path)
    # entry "vecchia" a mano
    old_payload = {
        "job_id": "old", "user_id": "bob", "solver": "linear", "model_id": "m",
        "started_at": time.time() - 365 * 24 * 3600,  # 1 anno fa
        "ended_at": None, "wall_s": 0.01, "cpu_s": 0.0, "ram_peak_mb": 0.0,
        "n_dof": 1, "status": "done", "error": None,
        "estimate_credits": 1.0, "actual_credits": 1.0,
    }
    audit_path.parent.mkdir(parents=True, exist_ok=True)
    audit_path.write_text(json.dumps(old_payload) + "\n", encoding="utf-8")
    # entry recente
    with job_meter.measure_job("bob", "linear", "m", n_dof=10, estimate=_est()):
        pass

    client = TestClient(app)
    # finestra 30 giorni -> solo 1
    resp = client.get("/api/usage/bob/summary", params={"window_days": 30})
    assert resp.json()["n_jobs"] == 1
    # finestra 400 giorni -> 2
    resp = client.get("/api/usage/bob/summary", params={"window_days": 400})
    assert resp.json()["n_jobs"] == 2


def test_usage_summary_empty_user_returns_zeros(audit_path, monkeypatch):
    monkeypatch.setattr(job_meter, "AUDIT_LOG", audit_path)
    client = TestClient(app)
    resp = client.get("/api/usage/ghost/summary")
    assert resp.status_code == 200
    s = resp.json()
    assert s["n_jobs"] == 0
    assert s["total_credits"] == 0.0
    assert s["last_job_at"] is None


def test_static_endpoint_logs_to_audit(audit_path, monkeypatch):
    """E2E smoke: POST /api/analysis/static/{id} scrive una riga JSONL."""
    storage.reset_for_tests()
    monkeypatch.setattr(job_meter, "AUDIT_LOG", audit_path)
    client = TestClient(app)
    resp = client.post(
        "/api/analysis/static/ex_simple_beam_2d",
        params={"user_id": "demo_user"},
        json={"include_self_weight": False, "g": 9.81},
    )
    assert resp.status_code == 200, resp.text
    rows = _read_lines(audit_path)
    assert len(rows) >= 1
    assert rows[-1]["user_id"] == "demo_user"
    assert rows[-1]["solver"] == "linear"
    assert rows[-1]["status"] == "done"
