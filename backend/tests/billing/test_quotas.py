"""Tests A3 — Quota system + middleware (Sprint 1)."""
from __future__ import annotations

from pathlib import Path

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

import storage
from main import app
from billing import quotas as quotas_mod
from billing.middleware import check_quota_for_solve
from billing.quotas import (
    QuotaExceeded, QuotaStore, TIER_CAPS, UserQuota,
)
from billing.schemas import CostEstimate


@pytest.fixture
def store(tmp_path: Path, monkeypatch) -> QuotaStore:
    """Quota store su disco temporaneo + monkey-patch del singleton globale."""
    s = QuotaStore(path=tmp_path / "quotas.json")
    monkeypatch.setattr(quotas_mod, "quota_store", s)
    # Anche il middleware importa quotas via re-export -> sostituisci li
    import billing.middleware as mw
    monkeypatch.setattr(mw, "_global_store", s, raising=False)
    # E i moduli che usano direttamente quota_store
    import api.routes.quotas as quotas_route
    monkeypatch.setattr(quotas_route, "quota_store", s)
    import api.routes.analysis as analysis_route
    monkeypatch.setattr(analysis_route, "quota_store", s)
    return s


def _est(credits: float = 10.0) -> CostEstimate:
    return CostEstimate(
        solver="linear", n_dof=120, cpu_min=0.05, ram_mb=80.0,
        eta_s=1.0, credits=credits, explanation="test",
    )


def test_get_default_quota_is_free_tier(store):
    q = store.get("alice")
    assert q.tier == "free"
    assert q.cap_credits == TIER_CAPS["free"]
    assert q.used_credits == 0.0


def test_consume_increments_used_credits(store):
    q = store.consume("alice", 5.0)
    assert q.used_credits == 5.0
    q2 = store.consume("alice", 3.0)
    assert q2.used_credits == 8.0


def test_consume_persists_to_disk(store):
    store.consume("alice", 7.0)
    # ricostruisco store dallo stesso path -> deve leggere dal disco
    s2 = QuotaStore(path=store.path)
    q = s2.get("alice")
    assert q.used_credits == 7.0


def test_consume_above_cap_raises_quota_exceeded(store):
    store.consume("alice", TIER_CAPS["free"] - 1.0)
    with pytest.raises(QuotaExceeded):
        store.consume("alice", 5.0)


def test_consume_within_bonus_allowed(store):
    store.set_tier("alice", "free")
    store.add_bonus("alice", 20.0)
    # cap = 50 + 20 = 70 totali; consumo 60 (over free, in bonus)
    q = store.consume("alice", 60.0)
    assert q.used_credits == 60.0


def test_set_tier_updates_cap(store):
    q = store.set_tier("alice", "starter")
    assert q.tier == "starter"
    assert q.cap_credits == TIER_CAPS["starter"]


def test_reset_month_zeros_used(store):
    store.consume("alice", 30.0)
    q = store.reset_month("alice")
    assert q.used_credits == 0.0
    assert q.bonus_credits == 0.0


def test_month_auto_resets_on_new_month(store, monkeypatch):
    # Forza month "vecchio"
    store.get("alice")
    data = store._read_all()
    data["alice"]["month"] = "1999-01"
    data["alice"]["used_credits"] = 42.0
    store._write_all(data)
    q = store.get("alice")
    assert q.month != "1999-01"
    assert q.used_credits == 0.0


def test_check_quota_for_solve_raises_402(store):
    store.consume("alice", TIER_CAPS["free"] - 0.1)
    with pytest.raises(HTTPException) as ei:
        check_quota_for_solve("alice", _est(credits=1.0), store=store)
    assert ei.value.status_code == 402
    detail = ei.value.detail
    assert detail["code"] == "quota_exceeded"
    assert detail["tier"] == "free"


def test_check_quota_for_solve_allows_under_cap(store):
    # Non solleva
    check_quota_for_solve("bob", _est(credits=5.0), store=store)


def test_endpoint_get_quota_returns_200(store):
    client = TestClient(app)
    resp = client.get("/api/quotas/charlie")
    assert resp.status_code == 200
    body = resp.json()
    assert body["user_id"] == "charlie"
    assert body["tier"] == "free"


def test_endpoint_set_tier_updates_state(store):
    client = TestClient(app)
    resp = client.post("/api/quotas/charlie/tier", json={"tier": "pro"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["tier"] == "pro"
    assert body["cap_credits"] == TIER_CAPS["pro"]


def test_endpoint_set_tier_unknown_400(store):
    client = TestClient(app)
    resp = client.post("/api/quotas/dave/tier", json={"tier": "platinum"})
    # Pydantic Literal -> 422; Tier non in TIER_CAPS via 400 dal nostro path.
    assert resp.status_code in (400, 422)


def test_endpoint_reset_quota(store):
    store.consume("eve", 10.0)
    client = TestClient(app)
    resp = client.post("/api/quotas/eve/reset")
    assert resp.status_code == 200
    assert resp.json()["used_credits"] == 0.0


def test_static_endpoint_blocked_by_quota_402(store, monkeypatch):
    """E2E: l'endpoint /api/analysis/static blocca con 402 se quota esaurita."""
    storage.reset_for_tests()
    # esaurisci la quota free
    store.consume("demo_user", TIER_CAPS["free"] - 0.5)
    client = TestClient(app)
    # ex_simple_beam_2d: n_dof grande -> credits sopra quota residua
    resp = client.post("/api/analysis/static/ex_simple_beam_2d",
                       params={"user_id": "demo_user"},
                       json={"include_self_weight": False, "g": 9.81})
    # Il modello demo e' piccolo: i crediti stimati sono bassi. Per assicurare 402,
    # consumiamo tutto il restante e ritentiamo.
    if resp.status_code == 200:
        # ora la quota residua e' minima: consumiamo i restanti
        cur = store.get("demo_user")
        remaining = cur.cap_credits + cur.bonus_credits - cur.used_credits
        if remaining > 0:
            try:
                store.consume("demo_user", max(remaining - 0.001, 0.0))
            except QuotaExceeded:
                pass
        resp = client.post("/api/analysis/static/ex_simple_beam_2d",
                           params={"user_id": "demo_user"},
                           json={"include_self_weight": False, "g": 9.81})
    assert resp.status_code == 402, resp.text
    detail = resp.json().get("detail", {})
    assert detail.get("code") == "quota_exceeded"
