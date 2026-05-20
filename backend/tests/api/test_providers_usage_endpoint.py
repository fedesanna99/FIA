"""Tests F6 — REST endpoint /api/providers/usage/*."""
from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from services.usage_tracker import tracker as global_tracker


@pytest.fixture
def client(tmp_path: Path):
    """TestClient FastAPI + singleton tracker su tmp DB."""
    from main import app

    orig_db = global_tracker.db_path
    orig_enabled = global_tracker.enabled
    global_tracker.db_path = tmp_path / "endpoint_usage.sqlite"
    global_tracker._init_db()
    global_tracker.clear()
    global_tracker.set_enabled(True)

    # Pre-popola con dati noti
    global_tracker.record("meteo", "open_meteo_forecast", "forecast", "ok", 100.0, False)
    global_tracker.record("meteo", "open_meteo_forecast", "forecast", "cache_hit", 0.0, True)
    global_tracker.record("meteo", "open_meteo_forecast", "forecast", "ok", 80.0, False)
    global_tracker.record("meteo", "open_meteo_archive", "extremes", "ok", 5000.0, False)
    global_tracker.record("geocoding", "nominatim", "search", "error", 0.0, False)
    global_tracker.record("geocoding", "nominatim", "reverse", "ok", 200.0, False)

    tc = TestClient(app)
    yield tc

    global_tracker.set_enabled(orig_enabled)
    global_tracker.db_path = orig_db


def test_summary_no_filters(client):
    r = client.get("/api/providers/usage/summary")
    assert r.status_code == 200
    data = r.json()
    assert data["window_days"] == 30
    assert len(data["rows"]) >= 4  # 4 distinct (domain, provider, endpoint) tuples
    totals = data["totals"]
    assert totals["n_calls"] == 6
    assert totals["n_cache_hits"] == 1
    assert totals["n_errors"] == 1
    assert 0 < totals["cache_hit_ratio"] < 1
    assert 0 < totals["error_ratio"] < 1


def test_summary_filter_by_domain(client):
    r = client.get("/api/providers/usage/summary?domain=meteo")
    assert r.status_code == 200
    data = r.json()
    assert all(row["domain"] == "meteo" for row in data["rows"])
    assert data["totals"]["n_calls"] == 4


def test_summary_filter_by_provider(client):
    r = client.get("/api/providers/usage/summary?provider=open_meteo_forecast")
    assert r.status_code == 200
    data = r.json()
    assert len(data["rows"]) == 1
    assert data["rows"][0]["n_calls"] == 3
    assert data["rows"][0]["n_cache_hits"] == 1


def test_summary_filter_by_endpoint(client):
    r = client.get("/api/providers/usage/summary?endpoint=reverse")
    assert r.status_code == 200
    data = r.json()
    assert len(data["rows"]) == 1
    assert data["rows"][0]["endpoint"] == "reverse"


def test_summary_window_validation(client):
    # window_days troppo piccolo
    r = client.get("/api/providers/usage/summary?window_days=0")
    assert r.status_code == 422
    # window_days troppo grande
    r = client.get("/api/providers/usage/summary?window_days=4000")
    assert r.status_code == 422


def test_summary_combines_filters(client):
    r = client.get(
        "/api/providers/usage/summary?domain=meteo&provider=open_meteo_forecast&endpoint=forecast"
    )
    assert r.status_code == 200
    data = r.json()
    assert len(data["rows"]) == 1
    assert data["rows"][0]["n_calls"] == 3


def test_timeline_by_day(client):
    r = client.get("/api/providers/usage/timeline?granularity=day")
    assert r.status_code == 200
    data = r.json()
    assert data["granularity"] == "day"
    assert data["window_days"] == 7
    assert len(data["bins"]) >= 1
    total_calls = sum(b["n_calls"] for b in data["bins"])
    assert total_calls == 6


def test_timeline_invalid_granularity_returns_422(client):
    r = client.get("/api/providers/usage/timeline?granularity=month")
    assert r.status_code == 422  # FastAPI Literal validation


def test_timeline_filter_by_provider(client):
    r = client.get(
        "/api/providers/usage/timeline?provider=open_meteo_forecast&granularity=day"
    )
    assert r.status_code == 200
    data = r.json()
    total = sum(b["n_calls"] for b in data["bins"])
    assert total == 3


def test_health_endpoint(client):
    r = client.get("/api/providers/usage/health")
    assert r.status_code == 200
    data = r.json()
    assert data["enabled"] is True
    assert data["total_records"] == 6
    assert data["by_domain"]["meteo"] == 4
    assert data["by_domain"]["geocoding"] == 2


def test_summary_empty_db_returns_zero_totals(tmp_path):
    from main import app

    orig_db = global_tracker.db_path
    orig_enabled = global_tracker.enabled
    global_tracker.db_path = tmp_path / "empty.sqlite"
    global_tracker._init_db()
    global_tracker.clear()
    global_tracker.set_enabled(True)
    try:
        tc = TestClient(app)
        r = tc.get("/api/providers/usage/summary")
        assert r.status_code == 200
        data = r.json()
        assert data["rows"] == []
        assert data["totals"]["n_calls"] == 0
        assert data["totals"]["cache_hit_ratio"] == 0.0
        assert data["totals"]["error_ratio"] == 0.0
    finally:
        global_tracker.set_enabled(orig_enabled)
        global_tracker.db_path = orig_db
