"""Tests D2 — Validation page (Sprint 1)."""
from __future__ import annotations

import time

import pytest
from fastapi.testclient import TestClient

import storage
from main import app
from api.routes import validation as validation_route
from validation.benchmarks import Benchmark, get_benchmarks


@pytest.fixture(autouse=True)
def _reset(monkeypatch):
    storage.reset_for_tests()
    validation_route.invalidate_cache_for_tests()
    yield


def test_report_endpoint_returns_html_200():
    client = TestClient(app)
    resp = client.get("/api/validation/report")
    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("text/html")
    assert "<title>" in resp.text
    assert "Validation Report" in resp.text


def test_report_contains_all_benchmark_families():
    client = TestClient(app)
    resp = client.get("/api/validation/report")
    families = {b.family for b in get_benchmarks()}
    for fam in families:
        assert fam in resp.text, f"famiglia {fam!r} mancante nell'HTML"


def test_report_marks_failures_clearly():
    """Forziamo un benchmark fasullo (target enorme + actual piccolo) e verifichiamo FAIL nel HTML."""
    bad = Benchmark(
        id="forced_fail", family="Test", description="forced fail",
        target_value=1.0e6, target_unit="unit",
        tolerance_pct=1.0,
        actual_value_fn=lambda: 0.0,
    )
    original = validation_route.get_benchmarks

    def patched():
        return original() + [bad]

    validation_route.get_benchmarks = patched
    validation_route.invalidate_cache_for_tests()
    try:
        client = TestClient(app)
        resp = client.get("/api/validation/report")
    finally:
        validation_route.get_benchmarks = original
        validation_route.invalidate_cache_for_tests()
    assert "forced_fail" in resp.text
    # Cerca il badge FAIL nell'HTML
    assert "badge fail" in resp.text


def test_report_cache_avoids_recomputation(monkeypatch):
    """La seconda chiamata in finestra TTL non deve ri-eseguire i benchmark."""
    calls = {"n": 0}
    real = validation_route.get_benchmarks

    def counted():
        calls["n"] += 1
        return real()

    monkeypatch.setattr(validation_route, "get_benchmarks", counted)
    monkeypatch.setenv("FEAPRO_VALIDATION_REPORT_TTL", "3600")
    validation_route.invalidate_cache_for_tests()
    client = TestClient(app)
    r1 = client.get("/api/validation/report")
    r2 = client.get("/api/validation/report")
    assert r1.status_code == 200 and r2.status_code == 200
    # 2 chiamate ma get_benchmarks invocata 1 volta sola (cache hit la seconda)
    assert calls["n"] == 1


def test_benchmarks_list_non_empty():
    benches = get_benchmarks()
    assert len(benches) >= 4


def test_report_json_endpoint():
    client = TestClient(app)
    resp = client.get("/api/validation/report.json")
    assert resp.status_code == 200
    body = resp.json()
    assert body["n_total"] >= 4
    assert "results" in body and isinstance(body["results"], list)
    assert all("id" in r and "passed" in r for r in body["results"])
