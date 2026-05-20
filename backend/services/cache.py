"""SQLite TTL cache per call a provider esterni (Sprint 1 — F2).

Una singola tabella `service_cache` con primary key (domain, key). TTL
configurabile per dominio via DEFAULT_TTL o env var
`FEAPRO_CACHE_TTL_<DOMAIN>=<seconds>`.

Tracking: hits / misses per dominio in memoria.
"""
from __future__ import annotations

import hashlib
import json
import os
import sqlite3
import threading
import time
from pathlib import Path
from typing import Any


CACHE_DB: Path = Path(".cache/services.sqlite")

DEFAULT_TTL: dict[str, int] = {
    "geocoding": 365 * 24 * 3600,          # 1 anno
    "meteo": 30 * 24 * 3600,                # 30 giorni
    "elevation": 10 * 365 * 24 * 3600,      # ~forever
    "seismic": 7 * 24 * 3600,               # 1 settimana
    "ai": 0,                                 # no cache
}

_SCHEMA = """
CREATE TABLE IF NOT EXISTS service_cache (
  domain TEXT NOT NULL,
  key TEXT NOT NULL,
  value BLOB NOT NULL,
  written_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  hits INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (domain, key)
);
CREATE INDEX IF NOT EXISTS idx_cache_expires ON service_cache(expires_at);
"""


class ServiceCache:
    """Cache TTL persistente su SQLite, thread-safe via Lock."""

    def __init__(self, db_path: Path | None = None) -> None:
        self.db_path = Path(db_path) if db_path is not None else CACHE_DB
        self._lock = threading.Lock()
        self._stats: dict[str, dict[str, int]] = {}  # domain -> {hits, misses, sets}
        self._init_db()

    # ----- private -------------------------------------------------------
    def _connect(self) -> sqlite3.Connection:
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(str(self.db_path), isolation_level=None, timeout=10)
        conn.execute("PRAGMA journal_mode=WAL")
        return conn

    def _init_db(self) -> None:
        with self._lock, self._connect() as conn:
            conn.executescript(_SCHEMA)

    def _bump(self, domain: str, key: str) -> None:
        self._stats.setdefault(domain, {"hits": 0, "misses": 0, "sets": 0})
        self._stats[domain][key] = self._stats[domain].get(key, 0) + 1

    def _ttl_for_domain(self, domain: str) -> int:
        env_override = os.environ.get(f"FEAPRO_CACHE_TTL_{domain.upper()}")
        if env_override:
            try:
                return int(env_override)
            except ValueError:
                pass
        return DEFAULT_TTL.get(domain, 3600)

    # ----- public --------------------------------------------------------
    def get(self, domain: str, key: str) -> Any | None:
        now = int(time.time())
        with self._lock, self._connect() as conn:
            cur = conn.execute(
                "SELECT value, expires_at FROM service_cache WHERE domain=? AND key=?",
                (domain, key),
            )
            row = cur.fetchone()
            if row is None:
                self._bump(domain, "misses")
                return None
            value_blob, expires_at = row
            if expires_at <= now:
                # scaduto: pulisce e ritorna None
                conn.execute(
                    "DELETE FROM service_cache WHERE domain=? AND key=?",
                    (domain, key),
                )
                self._bump(domain, "misses")
                return None
            # hit: bump hits in tabella e in memoria
            conn.execute(
                "UPDATE service_cache SET hits = hits + 1 WHERE domain=? AND key=?",
                (domain, key),
            )
            self._bump(domain, "hits")
            try:
                return json.loads(value_blob)
            except (TypeError, json.JSONDecodeError):
                return None

    def set(self, domain: str, key: str, value: Any, ttl_s: int | None = None) -> None:
        ttl = ttl_s if ttl_s is not None else self._ttl_for_domain(domain)
        if ttl <= 0:
            # dominio non-cachable: salta
            return
        now = int(time.time())
        blob = json.dumps(value, default=str)
        with self._lock, self._connect() as conn:
            conn.execute(
                "INSERT OR REPLACE INTO service_cache "
                "(domain, key, value, written_at, expires_at, hits) "
                "VALUES (?, ?, ?, ?, ?, COALESCE("
                "  (SELECT hits FROM service_cache WHERE domain=? AND key=?), 0))",
                (domain, key, blob, now, now + ttl, domain, key),
            )
            self._bump(domain, "sets")

    def invalidate(self, domain: str, key: str | None = None) -> int:
        with self._lock, self._connect() as conn:
            if key is None:
                cur = conn.execute(
                    "DELETE FROM service_cache WHERE domain=?", (domain,)
                )
            else:
                cur = conn.execute(
                    "DELETE FROM service_cache WHERE domain=? AND key=?",
                    (domain, key),
                )
            return int(cur.rowcount or 0)

    def stats(self) -> dict[str, dict[str, int]]:
        # Ritorna copia immutabile
        return {d: dict(v) for d, v in self._stats.items()}


def cache_key(*parts: Any) -> str:
    """Helper: chiave stabile (SHA256 troncato) da parti eterogenee."""
    encoded = "|".join(
        (json.dumps(p, sort_keys=True, default=str) if not isinstance(p, str) else p)
        for p in parts
    )
    return hashlib.sha256(encoded.encode("utf-8")).hexdigest()[:32]


# Singleton process-wide
cache = ServiceCache()
