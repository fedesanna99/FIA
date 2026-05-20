"""Tests F6 — UsageTracker (Sprint 2).

Il singleton globale `services.usage_tracker.tracker` viene disabilitato
dal conftest. Questi test usano istanze fresche con tmp_path o
riabilitano temporaneamente il singleton.
"""
from __future__ import annotations

import time
from pathlib import Path

import pytest

from services.usage_tracker import (
    ProviderUsageStats,
    TimelineBin,
    UsageTracker,
    tracker as global_tracker,
)


@pytest.fixture
def t(tmp_path: Path) -> UsageTracker:
    """Fresh tracker su tmp DB per ogni test."""
    return UsageTracker(db_path=tmp_path / "usage.sqlite")


def test_record_and_aggregate_single_call(t):
    t.record("meteo", "open_meteo_forecast", "forecast", "ok", 123.4, cached=False)
    rows = t.aggregate(since_ts=0)
    assert len(rows) == 1
    r = rows[0]
    assert r.domain == "meteo"
    assert r.provider == "open_meteo_forecast"
    assert r.endpoint == "forecast"
    assert r.n_calls == 1
    assert r.n_cache_hits == 0
    assert r.n_errors == 0
    assert r.cache_hit_ratio == 0.0
    assert r.avg_latency_ms == pytest.approx(123.4, abs=0.01)
    assert r.total_latency_ms == pytest.approx(123.4, abs=0.01)
    assert r.last_call_ts > 0


def test_aggregate_groups_by_endpoint(t):
    t.record("meteo", "open_meteo_forecast", "forecast", "ok", 100.0, False)
    t.record("meteo", "open_meteo_forecast", "forecast", "cache_hit", 0.0, True)
    t.record("meteo", "open_meteo_forecast", "forecast", "ok", 80.0, False)
    t.record("meteo", "open_meteo_archive", "extremes", "ok", 5000.0, False)
    rows = t.aggregate(since_ts=0)
    assert len(rows) == 2

    by_provider = {r.provider: r for r in rows}
    forecast = by_provider["open_meteo_forecast"]
    assert forecast.n_calls == 3
    assert forecast.n_cache_hits == 1
    assert forecast.cache_hit_ratio == pytest.approx(1 / 3, abs=0.001)
    assert forecast.avg_latency_ms == pytest.approx(60.0, abs=0.1)

    archive = by_provider["open_meteo_archive"]
    assert archive.n_calls == 1
    assert archive.avg_latency_ms == pytest.approx(5000.0, abs=0.1)


def test_aggregate_error_status_counted(t):
    t.record("meteo", "p", "x", "ok", 10.0, False)
    t.record("meteo", "p", "x", "error", 0.0, False)
    t.record("meteo", "p", "x", "rate_limit", 0.0, False)
    t.record("meteo", "p", "x", "timeout", 0.0, False)
    t.record("meteo", "p", "x", "unavailable", 0.0, False)
    t.record("meteo", "p", "x", "cache_hit", 0.0, True)
    rows = t.aggregate(since_ts=0)
    assert len(rows) == 1
    r = rows[0]
    assert r.n_calls == 6
    assert r.n_errors == 4  # error + rate_limit + timeout + unavailable
    assert r.n_cache_hits == 1
    assert r.error_ratio == pytest.approx(4 / 6, abs=0.001)


def test_aggregate_filter_by_domain(t):
    t.record("meteo", "a", "x", "ok", 10.0, False)
    t.record("geocoding", "b", "y", "ok", 20.0, False)
    t.record("elevation", "c", "z", "ok", 30.0, False)
    rows = t.aggregate(since_ts=0, domain="geocoding")
    assert len(rows) == 1
    assert rows[0].domain == "geocoding"


def test_aggregate_filter_by_provider(t):
    t.record("meteo", "p1", "x", "ok", 10.0, False)
    t.record("meteo", "p2", "y", "ok", 20.0, False)
    rows = t.aggregate(since_ts=0, provider="p2")
    assert len(rows) == 1
    assert rows[0].provider == "p2"


def test_aggregate_filter_by_endpoint(t):
    t.record("meteo", "p", "e1", "ok", 10.0, False)
    t.record("meteo", "p", "e2", "ok", 20.0, False)
    rows = t.aggregate(since_ts=0, endpoint="e2")
    assert len(rows) == 1
    assert rows[0].endpoint == "e2"


def test_aggregate_filter_by_user_id(t):
    t.record("meteo", "p", "x", "ok", 10.0, False, user_id="alice")
    t.record("meteo", "p", "x", "ok", 20.0, False, user_id="bob")
    t.record("meteo", "p", "x", "ok", 30.0, False, user_id=None)
    rows = t.aggregate(since_ts=0, user_id="alice")
    assert len(rows) == 1
    assert rows[0].n_calls == 1


def test_aggregate_time_window(t):
    # Manually adjust ts via direct SQL insert
    import sqlite3
    now = int(time.time() * 1000)
    old = now - 31 * 86400 * 1000  # >30 giorni fa
    # Inserisci 1 record "recente" + 1 "vecchio"
    t.record("meteo", "p", "x", "ok", 10.0, False)
    # Manipola ts del record per simulare vecchio
    conn = sqlite3.connect(str(t.db_path))
    conn.execute("UPDATE provider_usage SET ts=?", (old,))
    conn.commit()
    conn.close()
    t.record("meteo", "p", "x", "ok", 20.0, False)  # questo e' recente

    # Default since_ts = 30 giorni fa -> solo il recente
    rows = t.aggregate()
    assert len(rows) == 1
    assert rows[0].n_calls == 1

    # Con since_ts=0 prende entrambi
    rows = t.aggregate(since_ts=0)
    assert rows[0].n_calls == 2


def test_aggregate_empty_db_returns_empty_list(t):
    assert t.aggregate(since_ts=0) == []


def test_disabled_tracker_does_nothing(t):
    t.set_enabled(False)
    t.record("meteo", "p", "x", "ok", 10.0, False)
    assert t.aggregate(since_ts=0) == []


def test_set_enabled_toggle(t):
    assert t.enabled is True
    t.set_enabled(False)
    assert t.enabled is False
    t.set_enabled(True)
    assert t.enabled is True


def test_record_invalid_status_still_recorded(t):
    """Status sconosciuto non solleva, viene comunque persistito."""
    t.record("meteo", "p", "x", "weird_status", 10.0, False)
    rows = t.aggregate(since_ts=0)
    assert rows[0].n_calls == 1
    assert rows[0].n_errors == 0  # weird_status non e' in _ERROR_STATUSES


def test_record_silently_swallows_exceptions(tmp_path, monkeypatch):
    """Se la DB non e' raggiungibile, record() non solleva."""
    tracker = UsageTracker(db_path=tmp_path / "usage.sqlite")
    tracker.record("meteo", "p", "x", "ok", 10.0, False)

    # Forza fallimento patchando _connect
    def broken_connect(self):
        raise sqlite3_error

    import sqlite3
    sqlite3_error = sqlite3.OperationalError("simulated")
    monkeypatch.setattr(UsageTracker, "_connect", broken_connect)
    # Non solleva
    tracker.record("meteo", "p", "x", "ok", 10.0, False)


def test_timeline_by_day(t):
    """Timeline aggrega in bin giornalieri."""
    t.record("meteo", "p", "x", "ok", 10.0, False)
    t.record("meteo", "p", "x", "cache_hit", 0.0, True)
    t.record("meteo", "p", "x", "error", 0.0, False)
    bins = t.timeline(granularity="day", since_ts=0)
    assert len(bins) >= 1
    total_calls = sum(b.n_calls for b in bins)
    total_hits = sum(b.n_cache_hits for b in bins)
    total_err = sum(b.n_errors for b in bins)
    assert total_calls == 3
    assert total_hits == 1
    assert total_err == 1


def test_timeline_by_hour(t):
    """Granularity hour."""
    for i in range(5):
        t.record("meteo", "p", "x", "ok", 10.0 + i, False)
    bins = t.timeline(granularity="hour", since_ts=0)
    total = sum(b.n_calls for b in bins)
    assert total == 5


def test_timeline_by_week(t):
    """Granularity week."""
    t.record("meteo", "p", "x", "ok", 10.0, False)
    bins = t.timeline(granularity="week", since_ts=0)
    assert sum(b.n_calls for b in bins) == 1


def test_timeline_invalid_granularity_raises(t):
    with pytest.raises(ValueError):
        t.timeline(granularity="month", since_ts=0)


def test_timeline_filters(t):
    t.record("meteo", "p1", "x", "ok", 10.0, False)
    t.record("geocoding", "p2", "y", "ok", 20.0, False)
    bins_meteo = t.timeline(domain="meteo", since_ts=0)
    bins_geo = t.timeline(domain="geocoding", since_ts=0)
    assert sum(b.n_calls for b in bins_meteo) == 1
    assert sum(b.n_calls for b in bins_geo) == 1


def test_health_empty_db(t):
    h = t.health()
    assert h["enabled"] is True
    assert h["total_records"] == 0
    assert h["by_domain"] == {}


def test_health_with_records(t):
    t.record("meteo", "a", "x", "ok", 10.0, False)
    t.record("meteo", "b", "y", "ok", 20.0, False)
    t.record("geocoding", "c", "z", "ok", 30.0, False)
    h = t.health()
    assert h["total_records"] == 3
    assert h["by_domain"]["meteo"] == 2
    assert h["by_domain"]["geocoding"] == 1
    assert h["earliest_ts"] > 0
    assert h["latest_ts"] >= h["earliest_ts"]


def test_clear_removes_all_rows(t):
    t.record("meteo", "p", "x", "ok", 10.0, False)
    t.record("meteo", "p", "y", "ok", 20.0, False)
    assert len(t.aggregate(since_ts=0)) == 2
    t.clear()
    assert t.aggregate(since_ts=0) == []


def test_to_dict_serialization():
    """ProviderUsageStats.to_dict serializza in JSON-safe."""
    s = ProviderUsageStats(
        domain="meteo", provider="p", endpoint="x",
        n_calls=10, n_cache_hits=3, n_errors=1,
        cache_hit_ratio=0.3, error_ratio=0.1,
        avg_latency_ms=123.456, total_latency_ms=1234.56,
        last_call_ts=1700000000000,
    )
    d = s.to_dict()
    assert d["cache_hit_ratio"] == 0.3
    assert d["avg_latency_ms"] == 123.46  # rounded
    assert d["last_call_ts"] == 1700000000000


def test_timeline_bin_to_dict():
    b = TimelineBin(
        bin_start_ts=1700000000000,
        n_calls=5, n_cache_hits=2, n_errors=1,
        avg_latency_ms=42.123,
    )
    d = b.to_dict()
    assert d["avg_latency_ms"] == 42.12


def test_singleton_disabled_in_tests():
    """Conftest disabilita il singleton globale."""
    assert global_tracker.enabled is False


# ---- Fixture per riabilitare il singleton (test wiring) ----


@pytest.fixture
def with_global_tracker(tmp_path: Path):
    """Riabilita il singleton tracker con tmp DB, lo ripristina dopo il test."""
    orig_db = global_tracker.db_path
    orig_enabled = global_tracker.enabled
    global_tracker.db_path = tmp_path / "global_usage.sqlite"
    global_tracker._init_db()
    global_tracker.clear()
    global_tracker.set_enabled(True)
    yield global_tracker
    global_tracker.set_enabled(orig_enabled)
    global_tracker.db_path = orig_db


def test_singleton_tracker_can_be_re_enabled(with_global_tracker):
    with_global_tracker.record("test", "p", "x", "ok", 10.0, False)
    rows = with_global_tracker.aggregate(since_ts=0)
    assert len(rows) == 1
    assert rows[0].domain == "test"
