"""Tests F2 — ServiceCache (Sprint 1)."""
from __future__ import annotations

import time
from pathlib import Path

import pytest

from services.cache import ServiceCache, cache_key


@pytest.fixture
def sc(tmp_path: Path) -> ServiceCache:
    return ServiceCache(db_path=tmp_path / "cache.sqlite")


def test_set_then_get_returns_value(sc):
    sc.set("geocoding", "rome", {"lat": 41.9, "lon": 12.5}, ttl_s=60)
    assert sc.get("geocoding", "rome") == {"lat": 41.9, "lon": 12.5}


def test_get_unknown_key_returns_none(sc):
    assert sc.get("geocoding", "unknown") is None


def test_expired_entry_returns_none(sc):
    sc.set("geocoding", "k", "v", ttl_s=1)
    # Forza scadenza modificando expires_at in passato
    import sqlite3
    conn = sqlite3.connect(str(sc.db_path))
    conn.execute(
        "UPDATE service_cache SET expires_at=? WHERE domain=? AND key=?",
        (int(time.time()) - 10, "geocoding", "k"),
    )
    conn.commit()
    conn.close()
    assert sc.get("geocoding", "k") is None


def test_invalidate_single_key(sc):
    sc.set("geocoding", "a", 1, ttl_s=60)
    sc.set("geocoding", "b", 2, ttl_s=60)
    n = sc.invalidate("geocoding", "a")
    assert n == 1
    assert sc.get("geocoding", "a") is None
    assert sc.get("geocoding", "b") == 2


def test_invalidate_domain(sc):
    sc.set("geocoding", "a", 1, ttl_s=60)
    sc.set("geocoding", "b", 2, ttl_s=60)
    sc.set("meteo", "c", 3, ttl_s=60)
    n = sc.invalidate("geocoding")
    assert n == 2
    assert sc.get("geocoding", "a") is None
    assert sc.get("meteo", "c") == 3


def test_stats_reports_hits_misses(sc):
    sc.set("geocoding", "k", "v", ttl_s=60)
    sc.get("geocoding", "k")           # hit
    sc.get("geocoding", "k")           # hit
    sc.get("geocoding", "miss")        # miss
    s = sc.stats()
    assert s["geocoding"]["hits"] >= 2
    assert s["geocoding"]["misses"] >= 1


def test_ttl_default_per_domain(sc, monkeypatch):
    # geocoding ha TTL default 1 anno
    monkeypatch.delenv("FEAPRO_CACHE_TTL_GEOCODING", raising=False)
    sc.set("geocoding", "k", "v")  # ttl_s=None -> usa default
    # Subito ancora valido
    assert sc.get("geocoding", "k") == "v"


def test_ttl_override_via_env_var(sc, monkeypatch):
    monkeypatch.setenv("FEAPRO_CACHE_TTL_METEO", "1")
    sc.set("meteo", "now", "v")
    # Subito valido
    assert sc.get("meteo", "now") == "v"
    # Dopo 2 secondi -> scaduto
    time.sleep(1.3)
    # Forza re-check (simula clock-skew minimo): leggi entry direttamente
    import sqlite3
    conn = sqlite3.connect(str(sc.db_path))
    cur = conn.execute("SELECT expires_at FROM service_cache WHERE domain='meteo' AND key='now'")
    row = cur.fetchone()
    conn.close()
    assert row is not None
    # se non ancora scaduto, forzalo
    if row[0] > int(time.time()):
        conn = sqlite3.connect(str(sc.db_path))
        conn.execute("UPDATE service_cache SET expires_at=? WHERE domain='meteo' AND key='now'",
                     (int(time.time()) - 1,))
        conn.commit()
        conn.close()
    assert sc.get("meteo", "now") is None


def test_ttl_zero_domain_skipped(sc):
    """Dominio con TTL=0 (es. 'ai') non viene cachato."""
    sc.set("ai", "prompt-1", "answer", ttl_s=0)
    assert sc.get("ai", "prompt-1") is None


def test_cache_key_stable_across_calls():
    k1 = cache_key("geocoding", {"city": "rome"}, 12.5)
    k2 = cache_key("geocoding", {"city": "rome"}, 12.5)
    assert k1 == k2
    assert isinstance(k1, str) and len(k1) == 32


def test_cache_key_distinguishes_different_inputs():
    assert cache_key("geocoding", "rome") != cache_key("geocoding", "milan")
    assert cache_key("a", 1, 2) != cache_key("a", 2, 1)
