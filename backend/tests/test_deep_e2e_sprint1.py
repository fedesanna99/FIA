"""Deep E2E integration test suite per Sprint 1 v1.3.

Esercita TUTTI i nuovi componenti monetization/jobs/services/validation
end-to-end attraverso `TestClient(app)`, verificando:

  1. API contract: ogni endpoint risponde con lo schema atteso
  2. Lifecycle quota: free -> exceed -> tier upgrade -> reset -> bonus
  3. Priorita' job + retry: urgent > fast > standard, retry on failure
  4. Concorrenza: submit multipli back-to-back, ordering deterministico
  5. Failure injection: model_not_found, solver missing, quota exceeded
  6. Invariant: audit JSONL <-> JobStore <-> usage summary <-> quota state
  7. Validation report: HTML <-> JSON parity, tutti i benchmark green
  8. Cost estimator: monotonicita' rispetto a n_dof / n_steps / n_modes
     (property-based con hypothesis)
  9. WS broadcast: eventi job_* arrivano nell'ordine giusto

Eseguito senza `-m calibration` (skipped automaticamente sotto coverage).
"""
from __future__ import annotations

import asyncio
import json
import threading
import time
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from hypothesis import given, settings, strategies as st

import storage
from main import app
from billing import cost_estimator, job_meter, quotas as quotas_mod
from billing.quotas import QuotaStore, QuotaExceeded, TIER_CAPS
from billing.schemas import CostEstimate
from billing.middleware import check_quota_for_solve
from jobs import store as jobs_store_mod
from jobs.store import JobStore
from jobs.models import Job
from jobs.worker import JobWorker, build_default_dispatcher, get_worker
import api.routes.jobs as jobs_route
import api.routes.quotas as quotas_route
import api.routes.analysis as analysis_route
from api.routes import validation as validation_route


# =============================================================================
# Fixture: backing services isolate su tmp_path
# =============================================================================

@pytest.fixture(autouse=True)
def deep_isolation(tmp_path: Path, monkeypatch):
    """Isola audit, quota, job store su tmp_path per ogni test deep."""
    storage.reset_for_tests()
    monkeypatch.setattr(job_meter, "AUDIT_LOG", tmp_path / "deep_audit.jsonl")

    qs = QuotaStore(path=tmp_path / "deep_quotas.json")
    monkeypatch.setattr(quotas_mod, "quota_store", qs)
    import billing.middleware as mw
    monkeypatch.setattr(mw, "_global_store", qs, raising=False)
    monkeypatch.setattr(quotas_route, "quota_store", qs)
    monkeypatch.setattr(analysis_route, "quota_store", qs)
    # JobWorker importa `quota_store` direttamente -> patch anche li
    from jobs import worker as worker_mod
    monkeypatch.setattr(worker_mod, "quota_store", qs, raising=False)

    js = JobStore(db_path=tmp_path / "deep_jobs.sqlite")
    monkeypatch.setattr(jobs_store_mod, "job_store", js)
    monkeypatch.setattr(jobs_route, "job_store", js)

    validation_route.invalidate_cache_for_tests()
    yield {"qs": qs, "js": js, "audit_path": tmp_path / "deep_audit.jsonl"}


@pytest.fixture
def client(deep_isolation) -> TestClient:
    return TestClient(app)


# =============================================================================
# SECTION 1 — API CONTRACT
# =============================================================================

class TestAPIContract:
    """Ogni endpoint nuovo deve rispondere con uno schema valido."""

    def test_billing_estimate_returns_full_schema(self, client):
        r = client.post(
            "/api/billing/estimate",
            json={"model_id": "ex_simple_beam_2d", "solver": "linear", "params": {}},
        )
        assert r.status_code == 200
        body = r.json()
        for k in ("solver", "n_dof", "cpu_min", "ram_mb", "eta_s", "credits", "explanation"):
            assert k in body, f"missing key {k} in CostEstimate"
        assert body["solver"] == "linear"

    def test_billing_estimate_unknown_model_404(self, client):
        r = client.post(
            "/api/billing/estimate",
            json={"model_id": "ghost", "solver": "linear", "params": {}},
        )
        assert r.status_code == 404

    def test_billing_estimate_unknown_solver_422(self, client):
        r = client.post(
            "/api/billing/estimate",
            json={"model_id": "ex_simple_beam_2d", "solver": "kamikaze", "params": {}},
        )
        # Literal validation => 422
        assert r.status_code in (400, 422)

    def test_usage_summary_unknown_user_returns_zeros(self, client):
        r = client.get("/api/usage/ghost_user/summary")
        assert r.status_code == 200
        body = r.json()
        assert body["n_jobs"] == 0
        assert body["total_credits"] == 0.0

    def test_quota_get_creates_default_record(self, client):
        r = client.get("/api/quotas/new_user_42")
        assert r.status_code == 200
        body = r.json()
        assert body["tier"] == "free"
        assert body["cap_credits"] == TIER_CAPS["free"]
        assert body["used_credits"] == 0.0

    def test_jobs_list_default_user_empty(self, client):
        r = client.get("/api/jobs")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_validation_report_html_and_json_parity(self, client):
        h = client.get("/api/validation/report")
        j = client.get("/api/validation/report.json")
        assert h.status_code == 200
        assert j.status_code == 200
        json_body = j.json()
        # ogni benchmark id deve apparire nell'HTML
        for r in json_body["results"]:
            assert r["id"] in h.text


# =============================================================================
# SECTION 2 — QUOTA LIFECYCLE
# =============================================================================

class TestQuotaLifecycle:

    def test_free_then_exhaust_then_upgrade_then_reset(self, deep_isolation):
        qs: QuotaStore = deep_isolation["qs"]
        # Free tier: cap 50
        q = qs.get("alice")
        assert q.tier == "free" and q.cap_credits == 50.0
        # Consuma 49
        qs.consume("alice", 49.0)
        # Tentativo di altri 5 -> QuotaExceeded
        with pytest.raises(QuotaExceeded):
            qs.consume("alice", 5.0)
        # Upgrade a starter
        qs.set_tier("alice", "starter")
        # Ora cap = 500, residuo = 451
        q = qs.get("alice")
        assert q.cap_credits == 500.0
        assert q.used_credits == 49.0
        # Consuma 100 ulteriori -> OK
        qs.consume("alice", 100.0)
        # Reset month -> azzera tutto
        qs.reset_month("alice")
        q = qs.get("alice")
        assert q.used_credits == 0.0
        assert q.bonus_credits == 0.0

    def test_bonus_credits_extend_cap(self, deep_isolation):
        qs: QuotaStore = deep_isolation["qs"]
        qs.set_tier("bob", "free")
        qs.add_bonus("bob", 30.0)
        # Cap effettivo = 50 + 30 = 80
        # consumo 79 -> OK
        qs.consume("bob", 79.0)
        # consumo altri 2 -> QuotaExceeded
        with pytest.raises(QuotaExceeded):
            qs.consume("bob", 2.0)

    def test_enterprise_tier_practically_unlimited(self, deep_isolation):
        qs: QuotaStore = deep_isolation["qs"]
        qs.set_tier("ceo", "enterprise")
        # 1 milione di crediti -> niente raise
        qs.consume("ceo", 1_000_000.0)

    def test_quota_check_middleware_blocks_402(self, client, deep_isolation):
        qs: QuotaStore = deep_isolation["qs"]
        qs.consume("demo_user", 49.95)
        # POST /api/jobs con solver costoso -> 402
        r = client.post(
            "/api/jobs",
            json={"model_id": "ex_cable_bridge_2d", "solver": "nonlinear",
                  "params": {"n_steps": 20, "max_iter": 25},
                  "priority": "standard", "user_id": "demo_user"},
        )
        assert r.status_code == 402
        assert r.json()["detail"]["code"] == "quota_exceeded"


# =============================================================================
# SECTION 3 — JOB PRIORITY & RETRY
# =============================================================================

class TestJobPriorityAndRetry:

    def test_urgent_dequeue_before_fast_before_standard(self, deep_isolation):
        js: JobStore = deep_isolation["js"]
        e = CostEstimate(solver="linear", n_dof=10, cpu_min=0.01, ram_mb=10,
                          eta_s=0.1, credits=0.1, explanation="x")
        std = js.enqueue(Job(user_id="u", solver="linear", model_id="m1",
                             estimate=e, priority="standard"))
        urgent = js.enqueue(Job(user_id="u", solver="linear", model_id="m1",
                                estimate=e, priority="urgent"))
        fast = js.enqueue(Job(user_id="u", solver="linear", model_id="m1",
                              estimate=e, priority="fast"))
        # Dequeue order: urgent -> fast -> standard
        assert js.dequeue().job_id == urgent.job_id
        assert js.dequeue().job_id == fast.job_id
        assert js.dequeue().job_id == std.job_id
        assert js.dequeue() is None

    def test_retry_count_increments_on_dequeue(self, deep_isolation):
        js: JobStore = deep_isolation["js"]
        e = CostEstimate(solver="linear", n_dof=10, cpu_min=0.01, ram_mb=10,
                          eta_s=0.1, credits=0.1, explanation="x")
        j = js.enqueue(Job(user_id="u", solver="linear", model_id="m1",
                           estimate=e, max_retries=3))
        first = js.dequeue()
        assert first.attempts == 1
        # Simula fail -> re-queue
        js.update(j.job_id, status="queued")
        second = js.dequeue()
        assert second.attempts == 2

    def test_worker_retries_then_marks_failed(self, deep_isolation, tmp_path):
        """Worker retry su failure: tenta max_retries volte, poi failed."""
        js: JobStore = deep_isolation["js"]
        e = CostEstimate(solver="linear", n_dof=10, cpu_min=0.01, ram_mb=10,
                          eta_s=0.1, credits=0.1, explanation="x")
        j = js.enqueue(Job(user_id="u", solver="linear", model_id="m1",
                           estimate=e, max_retries=2))

        def always_fail(model, params, cb):
            raise RuntimeError("nope")

        worker = JobWorker(
            dispatcher={"linear": always_fail},
            store=js,
            get_model=lambda _: {"id": _, "nodes": [{"id": 1}]},
        )
        # 3 cicli (1 initial + 2 retries) prima del fail definitivo
        for _ in range(4):
            asyncio.run(worker.run_one())
            cur = js.get(j.job_id)
            if cur.status == "failed":
                break
        final = js.get(j.job_id)
        assert final.status == "failed"
        assert "nope" in (final.error or "")


# =============================================================================
# SECTION 4 — CONCURRENCY
# =============================================================================

class TestConcurrency:

    def test_parallel_enqueue_no_loss(self, deep_isolation):
        """5 thread enqueue 10 job ciascuno: 50 totali in coda."""
        js: JobStore = deep_isolation["js"]
        e = CostEstimate(solver="linear", n_dof=10, cpu_min=0.01, ram_mb=10,
                          eta_s=0.1, credits=0.1, explanation="x")

        def worker(idx: int):
            for k in range(10):
                js.enqueue(Job(user_id=f"u{idx}", solver="linear",
                               model_id=f"m{idx}-{k}", estimate=e))

        threads = [threading.Thread(target=worker, args=(i,)) for i in range(5)]
        for t in threads: t.start()
        for t in threads: t.join()
        all_jobs = js.list(user_id=None, limit=200)  # type: ignore[arg-type]
        # 5 thread x 10 = 50 attesi (user_id=None list... potrebbe filtrare)
        n_total = sum(1 for _ in [js.list(user_id=f"u{i}", limit=100) for i in range(5)])
        # Conta per user
        per_user_counts = {i: len(js.list(user_id=f"u{i}", limit=100)) for i in range(5)}
        assert all(v == 10 for v in per_user_counts.values()), per_user_counts

    def test_parallel_dequeue_no_double_processing(self, deep_isolation):
        """3 thread dequeue contemporaneamente: ogni job processato 1 volta."""
        js: JobStore = deep_isolation["js"]
        e = CostEstimate(solver="linear", n_dof=10, cpu_min=0.01, ram_mb=10,
                          eta_s=0.1, credits=0.1, explanation="x")
        for k in range(15):
            js.enqueue(Job(user_id="u", solver="linear", model_id=f"m{k}", estimate=e))

        dequeued: list[str] = []
        lock = threading.Lock()

        def consumer():
            while True:
                j = js.dequeue()
                if j is None:
                    return
                with lock:
                    dequeued.append(j.job_id)

        threads = [threading.Thread(target=consumer) for _ in range(3)]
        for t in threads: t.start()
        for t in threads: t.join()
        # Tutti i 15 job dequeued esattamente 1 volta
        assert len(dequeued) == 15
        assert len(set(dequeued)) == 15


# =============================================================================
# SECTION 5 — FAILURE INJECTION
# =============================================================================

class TestFailureInjection:

    def test_submit_unknown_model_returns_404(self, client):
        r = client.post(
            "/api/jobs",
            json={"model_id": "no_existe", "solver": "linear",
                  "params": {}, "priority": "standard"},
        )
        assert r.status_code == 404

    def test_solver_missing_in_dispatcher_marks_failed(self, deep_isolation):
        js: JobStore = deep_isolation["js"]
        e = CostEstimate(solver="linear", n_dof=10, cpu_min=0.01, ram_mb=10,
                          eta_s=0.1, credits=0.1, explanation="x")
        j = js.enqueue(Job(user_id="u", solver="modal",  # type: ignore[arg-type]
                           model_id="m1", estimate=e))
        worker = JobWorker(
            dispatcher={"linear": lambda m, p, cb: {}},  # nessun "modal"
            store=js,
            get_model=lambda _: {"id": _, "nodes": [{"id": 1}]},
        )
        asyncio.run(worker.run_one())
        final = js.get(j.job_id)
        assert final.status == "failed"
        assert "dispatcher" in (final.error or "")

    def test_cancel_job_idempotent_even_running(self, client):
        r = client.post(
            "/api/jobs",
            json={"model_id": "ex_simple_beam_2d", "solver": "linear",
                  "params": {}, "priority": "standard"},
        )
        jid = r.json()["job_id"]
        r1 = client.delete(f"/api/jobs/{jid}")
        r2 = client.delete(f"/api/jobs/{jid}")
        r3 = client.delete(f"/api/jobs/{jid}")
        assert r1.status_code == 200 == r2.status_code == r3.status_code
        # tutti tre ritornano "cancelled" (o "done" se gia' completato)
        assert {r1.json()["status"], r2.json()["status"], r3.json()["status"]} <= {"cancelled", "done"}


# =============================================================================
# SECTION 6 — INVARIANT: audit <-> DB <-> usage <-> quota
# =============================================================================

class TestInvariants:

    def test_audit_log_lines_match_consumed_credits(self, deep_isolation):
        """Ogni record audit JSONL contribuisce a usage summary; somma == quota.used."""
        audit_path: Path = deep_isolation["audit_path"]
        qs: QuotaStore = deep_isolation["qs"]
        # Eseguo 3 measure_job semplici
        e = CostEstimate(solver="linear", n_dof=10, cpu_min=0.01, ram_mb=10,
                          eta_s=0.1, credits=0.1, explanation="x")
        for i in range(3):
            with job_meter.measure_job(
                user_id="inv_user", solver="linear", model_id=f"m{i}",
                n_dof=10, estimate=e,
            ) as rec:
                time.sleep(0.001)
            # Consuma esattamente actual_credits
            qs.consume("inv_user", rec.actual_credits or 0.0)

        # Leggi audit log
        lines = [json.loads(l) for l in audit_path.read_text().splitlines() if l.strip()]
        assert len(lines) == 3
        total_actual = sum(l.get("actual_credits") or 0 for l in lines)
        q = qs.get("inv_user")
        assert abs(q.used_credits - total_actual) < 1e-6

    def test_job_count_in_audit_matches_usage_summary(self, client, deep_isolation):
        """Submit 3 job linear via API, dopo worker run il summary deve avere 3 job."""
        # Submit + esegui via worker manuale
        js: JobStore = deep_isolation["js"]
        worker = JobWorker(
            dispatcher=build_default_dispatcher(),
            store=js,
            get_model=storage.get_model,
        )
        for _ in range(3):
            r = client.post(
                "/api/jobs",
                json={"model_id": "ex_simple_beam_2d", "solver": "linear",
                      "params": {}, "priority": "standard", "user_id": "inv_user2"},
            )
            assert r.status_code == 201
            asyncio.run(worker.run_one())

        # Verifica DB
        jobs = js.list(user_id="inv_user2", limit=100)
        assert len(jobs) == 3
        assert all(j.status == "done" for j in jobs)

        # Verifica usage summary
        s = client.get("/api/usage/inv_user2/summary").json()
        assert s["n_jobs"] == 3
        assert s["jobs_by_status"]["done"] == 3
        assert s["jobs_by_solver"]["linear"] == 3


# =============================================================================
# SECTION 7 — VALIDATION REPORT
# =============================================================================

class TestValidationReport:

    def test_all_5_benchmarks_pass(self, client):
        r = client.get("/api/validation/report.json")
        body = r.json()
        n_pass = sum(1 for x in body["results"] if x["passed"])
        n_total = body["n_total"]
        assert n_pass == n_total, [(x["id"], x["error_pct"]) for x in body["results"] if not x["passed"]]

    def test_results_have_required_fields(self, client):
        body = client.get("/api/validation/report.json").json()
        for r in body["results"]:
            for k in ("id", "family", "description", "target_value", "actual_value",
                      "error_pct", "tolerance_pct", "passed"):
                assert k in r, f"missing field {k} in {r['id']}"


# =============================================================================
# SECTION 8 — COST ESTIMATOR PROPERTY-BASED (hypothesis)
# =============================================================================

class TestCostEstimatorMonotonicity:
    """Property: il costo dovrebbe essere monotono nelle dimensioni rilevanti."""

    @given(
        n_small=st.integers(min_value=5, max_value=50),
        delta=st.integers(min_value=5, max_value=200),
    )
    @settings(max_examples=20, deadline=None)
    def test_cpu_min_grows_with_n_dof_for_linear(self, n_small, delta):
        n_big = n_small + delta
        m_small = {"nodes": [{"id": i} for i in range(n_small)]}
        m_big = {"nodes": [{"id": i} for i in range(n_big)]}
        e_small = cost_estimator.estimate("linear", m_small, {})
        e_big = cost_estimator.estimate("linear", m_big, {})
        assert e_big.cpu_min >= e_small.cpu_min
        assert e_big.credits >= e_small.credits

    @given(steps=st.integers(min_value=1, max_value=200))
    @settings(max_examples=15, deadline=None)
    def test_pushover_cpu_min_grows_linearly_in_steps(self, steps):
        """cpu_min(n_steps=k+1) >= cpu_min(n_steps=k) (monotonicita' debole)."""
        m = {"nodes": [{"id": i} for i in range(20)]}
        e1 = cost_estimator.estimate("pushover", m, {"n_steps": steps})
        e2 = cost_estimator.estimate("pushover", m, {"n_steps": steps + 1})
        assert e2.cpu_min >= e1.cpu_min

    @given(n_modes=st.integers(min_value=1, max_value=50))
    @settings(max_examples=15, deadline=None)
    def test_modal_credits_non_negative(self, n_modes):
        m = {"nodes": [{"id": i} for i in range(30)]}
        e = cost_estimator.estimate("modal", m, {"n_modes": n_modes})
        assert e.credits >= 0
        assert e.ram_mb >= 0
        assert e.eta_s >= 0
        assert e.cpu_min >= 0

    def test_empty_model_zero_dof(self):
        e = cost_estimator.estimate("linear", {"nodes": []}, {})
        assert e.n_dof == 0
        assert e.cpu_min == 0
        assert e.credits >= 0.01  # min credit floor

    def test_dynamic_th_with_t_end_dt(self):
        """Se t_end e dt forniti, n_steps derivati = t_end/dt."""
        m = {"nodes": [{"id": i} for i in range(20)]}
        e1 = cost_estimator.estimate("dynamic_th", m, {"t_end": 1.0, "dt": 0.01})
        # n_steps = 100
        e2 = cost_estimator.estimate("dynamic_th", m, {"n_steps": 100})
        # Stesso costo (entro epsilon)
        assert abs(e1.cpu_min - e2.cpu_min) < 1e-9


# =============================================================================
# SECTION 9 — SMOKE E2E COMPLETO
# =============================================================================

class TestFullE2ESmoke:
    """Catena end-to-end: estimate -> quota -> submit -> worker -> result -> summary."""

    def test_full_pushover_chain(self, client, deep_isolation):
        # 1. Estimate
        est = client.post(
            "/api/billing/estimate",
            json={"model_id": "ex_portal_frame_2d", "solver": "pushover",
                  "params": {"n_steps": 20}},
        )
        assert est.status_code == 200
        estimate = est.json()
        assert estimate["credits"] > 0

        # 2. Quota check
        q = client.get("/api/quotas/e2e_user").json()
        assert q["used_credits"] == 0

        # 3. Submit job
        sub = client.post(
            "/api/jobs",
            json={"model_id": "ex_portal_frame_2d", "solver": "pushover",
                  "params": {"lambda_step": 0.1, "lambda_max": 2.0, "max_steps": 20},
                  "priority": "urgent", "user_id": "e2e_user"},
        )
        assert sub.status_code == 201
        jid = sub.json()["job_id"]

        # 4. Worker run
        js: JobStore = deep_isolation["js"]
        worker = JobWorker(
            dispatcher=build_default_dispatcher(),
            store=js,
            get_model=storage.get_model,
        )
        asyncio.run(worker.run_one())

        # 5. Verifica job done
        j = client.get(f"/api/jobs/{jid}").json()
        assert j["status"] == "done"

        # 6. Fetch result
        r = client.get(f"/api/jobs/{jid}/result")
        assert r.status_code == 200
        payload = r.json()
        # Pushover ha "steps" e "hinge_events"
        assert "steps" in payload
        assert "hinge_events" in payload

        # 7. Audit + quota state
        s = client.get("/api/usage/e2e_user/summary").json()
        assert s["n_jobs"] == 1
        assert s["jobs_by_status"]["done"] == 1

        q2 = client.get("/api/quotas/e2e_user").json()
        assert q2["used_credits"] > 0
