"""Provider usage tracker (Sprint 2 — F6).

Traccia ogni chiamata fatta dai provider F4 (meteo, geocoding, elevation,
seismic) per observability + billing futuro.

Schema SQLite:
    provider_usage(id, ts, domain, provider, endpoint, status, latency_ms,
                   cached, user_id)

API pubblica:
    tracker.record(domain, provider, endpoint, status, latency_ms, cached,
                   user_id=None)
    tracker.aggregate(domain=None, provider=None, since=None, user_id=None)
    tracker.timeline(domain=None, provider=None, granularity="day",
                     since=None)
    tracker.clear()                # solo per test

Vincoli:
    - Thread-safe via Lock (writer SQLite single-thread, reader concorrenti
      OK con WAL mode).
    - Async-safe: ogni call apre/chiude la propria connessione SQLite
      (cheap con WAL).
    - I provider chiamano `tracker.record(...)` dal proprio `_record_call`.
      Non sollevano mai eccezioni: errori del tracker vengono loggati e
      silenziati (osservabilita' non deve mai rompere il path produttivo).
"""
from __future__ import annotations

import logging
import os
import sqlite3
import threading
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any


logger = logging.getLogger(__name__)


def _default_data_dir() -> Path:
    """Cartella dove vive il tracker SQLite. Override via `FEAPRO_DATA_DIR=/data`."""
    return Path(os.environ.get("FEAPRO_DATA_DIR", ".cache"))


USAGE_DB: Path = _default_data_dir() / "usage.sqlite"


_SCHEMA = """
CREATE TABLE IF NOT EXISTS provider_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts INTEGER NOT NULL,
    domain TEXT NOT NULL,
    provider TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    status TEXT NOT NULL,
    latency_ms REAL NOT NULL,
    cached INTEGER NOT NULL,
    user_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_pu_ts ON provider_usage(ts);
CREATE INDEX IF NOT EXISTS idx_pu_domain_provider ON provider_usage(domain, provider, ts);
CREATE INDEX IF NOT EXISTS idx_pu_user_id ON provider_usage(user_id);
"""


@dataclass
class ProviderUsageStats:
    """Aggregato per (domain, provider, endpoint)."""

    domain: str
    provider: str
    endpoint: str
    n_calls: int
    n_cache_hits: int
    n_errors: int
    cache_hit_ratio: float  # n_cache_hits / n_calls
    error_ratio: float      # n_errors / n_calls
    avg_latency_ms: float
    total_latency_ms: float
    last_call_ts: int       # epoch ms

    def to_dict(self) -> dict[str, Any]:
        return {
            "domain": self.domain,
            "provider": self.provider,
            "endpoint": self.endpoint,
            "n_calls": self.n_calls,
            "n_cache_hits": self.n_cache_hits,
            "n_errors": self.n_errors,
            "cache_hit_ratio": round(self.cache_hit_ratio, 4),
            "error_ratio": round(self.error_ratio, 4),
            "avg_latency_ms": round(self.avg_latency_ms, 2),
            "total_latency_ms": round(self.total_latency_ms, 2),
            "last_call_ts": self.last_call_ts,
        }


@dataclass
class TimelineBin:
    """Singolo bin temporale (per timeline charts)."""

    bin_start_ts: int   # epoch ms
    n_calls: int
    n_cache_hits: int
    n_errors: int
    avg_latency_ms: float

    def to_dict(self) -> dict[str, Any]:
        return {
            "bin_start_ts": self.bin_start_ts,
            "n_calls": self.n_calls,
            "n_cache_hits": self.n_cache_hits,
            "n_errors": self.n_errors,
            "avg_latency_ms": round(self.avg_latency_ms, 2),
        }


# Status che contano come "cache hit" (oltre al flag cached=1)
_CACHE_HIT_STATUSES = {"cache_hit"}
# Status che contano come "error"
_ERROR_STATUSES = {"error", "rate_limit", "timeout", "unavailable"}


_GRANULARITY_MS: dict[str, int] = {
    "hour": 3600 * 1000,
    "day": 86400 * 1000,
    "week": 7 * 86400 * 1000,
}


class UsageTracker:
    """Tracker SQLite per provider usage."""

    def __init__(self, db_path: Path | None = None) -> None:
        self.db_path = Path(db_path) if db_path is not None else USAGE_DB
        self._lock = threading.Lock()
        self._enabled = self._read_enabled_flag()
        self._init_db()

    # ---- config ----------------------------------------------------------
    @staticmethod
    def _read_enabled_flag() -> bool:
        """Disable tramite env var `FEAPRO_USAGE_TRACKER_DISABLED=1`."""
        return os.environ.get("FEAPRO_USAGE_TRACKER_DISABLED", "").strip() not in (
            "1",
            "true",
            "True",
        )

    @property
    def enabled(self) -> bool:
        return self._enabled

    def set_enabled(self, value: bool) -> None:
        """Permette di abilitare/disabilitare runtime (test)."""
        self._enabled = bool(value)

    # ---- private ---------------------------------------------------------
    def _connect(self) -> sqlite3.Connection:
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(str(self.db_path), isolation_level=None, timeout=10)
        conn.execute("PRAGMA journal_mode=WAL")
        return conn

    def _init_db(self) -> None:
        with self._lock, self._connect() as conn:
            conn.executescript(_SCHEMA)

    # ---- public: write ---------------------------------------------------
    def record(
        self,
        domain: str,
        provider: str,
        endpoint: str,
        status: str,
        latency_ms: float,
        cached: bool,
        user_id: str | None = None,
    ) -> None:
        """Registra una chiamata. Mai solleva eccezioni (silenzia).

        Args:
            domain: dominio del provider (es. "meteo", "geocoding")
            provider: nome del provider (es. "open_meteo_forecast")
            endpoint: endpoint logico chiamato (es. "forecast", "lookup")
            status: "ok" | "cache_hit" | "error" | "rate_limit" | "timeout" | ...
            latency_ms: latenza misurata, 0 per cache hit
            cached: True se servito da cache
            user_id: opzionale, per multi-tenancy futura
        """
        if not self._enabled:
            return
        ts = int(time.time() * 1000)
        try:
            with self._lock, self._connect() as conn:
                conn.execute(
                    "INSERT INTO provider_usage "
                    "(ts, domain, provider, endpoint, status, latency_ms, cached, user_id) "
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    (
                        ts,
                        str(domain),
                        str(provider),
                        str(endpoint),
                        str(status),
                        float(latency_ms),
                        1 if cached else 0,
                        str(user_id) if user_id is not None else None,
                    ),
                )
        except Exception as exc:
            # Tracker e' fire-and-forget: log e prosegui.
            logger.debug("usage_tracker.record failed: %s", exc)

    # ---- public: read ----------------------------------------------------
    def aggregate(
        self,
        *,
        domain: str | None = None,
        provider: str | None = None,
        endpoint: str | None = None,
        since_ts: int | None = None,
        until_ts: int | None = None,
        user_id: str | None = None,
    ) -> list[ProviderUsageStats]:
        """Aggregato per (domain, provider, endpoint).

        Args:
            since_ts / until_ts: epoch ms. Default: ultimo mese.
            domain/provider/endpoint/user_id: filtri opzionali.
        """
        if since_ts is None:
            since_ts = int(time.time() * 1000) - 30 * 86400 * 1000
        clauses = ["ts >= ?"]
        params: list[Any] = [since_ts]
        if until_ts is not None:
            clauses.append("ts <= ?")
            params.append(until_ts)
        if domain is not None:
            clauses.append("domain = ?")
            params.append(domain)
        if provider is not None:
            clauses.append("provider = ?")
            params.append(provider)
        if endpoint is not None:
            clauses.append("endpoint = ?")
            params.append(endpoint)
        if user_id is not None:
            clauses.append("user_id = ?")
            params.append(user_id)
        where = " AND ".join(clauses)
        sql = f"""
            SELECT
                domain, provider, endpoint,
                COUNT(*) AS n_calls,
                SUM(CASE WHEN cached=1 THEN 1 ELSE 0 END) AS n_cache_hits,
                SUM(CASE WHEN status IN ('error','rate_limit','timeout','unavailable') THEN 1 ELSE 0 END) AS n_errors,
                AVG(latency_ms) AS avg_latency_ms,
                SUM(latency_ms) AS total_latency_ms,
                MAX(ts) AS last_call_ts
            FROM provider_usage
            WHERE {where}
            GROUP BY domain, provider, endpoint
            ORDER BY n_calls DESC
        """
        with self._lock, self._connect() as conn:
            cur = conn.execute(sql, params)
            rows = cur.fetchall()
        out: list[ProviderUsageStats] = []
        for r in rows:
            n = int(r[3] or 0)
            n_hits = int(r[4] or 0)
            n_err = int(r[5] or 0)
            out.append(
                ProviderUsageStats(
                    domain=str(r[0]),
                    provider=str(r[1]),
                    endpoint=str(r[2]),
                    n_calls=n,
                    n_cache_hits=n_hits,
                    n_errors=n_err,
                    cache_hit_ratio=(n_hits / n) if n > 0 else 0.0,
                    error_ratio=(n_err / n) if n > 0 else 0.0,
                    avg_latency_ms=float(r[6] or 0.0),
                    total_latency_ms=float(r[7] or 0.0),
                    last_call_ts=int(r[8] or 0),
                )
            )
        return out

    def timeline(
        self,
        *,
        granularity: str = "day",
        domain: str | None = None,
        provider: str | None = None,
        since_ts: int | None = None,
        until_ts: int | None = None,
        user_id: str | None = None,
    ) -> list[TimelineBin]:
        """Distribuzione temporale a bin di larghezza `granularity`.

        Granularita' supportate: "hour", "day", "week".
        """
        if granularity not in _GRANULARITY_MS:
            raise ValueError(
                f"granularity '{granularity}' non supportata: "
                f"{sorted(_GRANULARITY_MS.keys())}"
            )
        bin_ms = _GRANULARITY_MS[granularity]
        if since_ts is None:
            since_ts = int(time.time() * 1000) - 7 * 86400 * 1000

        clauses = ["ts >= ?"]
        params: list[Any] = [since_ts]
        if until_ts is not None:
            clauses.append("ts <= ?")
            params.append(until_ts)
        if domain is not None:
            clauses.append("domain = ?")
            params.append(domain)
        if provider is not None:
            clauses.append("provider = ?")
            params.append(provider)
        if user_id is not None:
            clauses.append("user_id = ?")
            params.append(user_id)
        where = " AND ".join(clauses)
        # Bucket SQL: floor(ts / bin_ms) * bin_ms
        sql = f"""
            SELECT
                (ts / {bin_ms}) * {bin_ms} AS bin_start,
                COUNT(*) AS n_calls,
                SUM(CASE WHEN cached=1 THEN 1 ELSE 0 END) AS n_cache_hits,
                SUM(CASE WHEN status IN ('error','rate_limit','timeout','unavailable') THEN 1 ELSE 0 END) AS n_errors,
                AVG(latency_ms) AS avg_latency_ms
            FROM provider_usage
            WHERE {where}
            GROUP BY bin_start
            ORDER BY bin_start ASC
        """
        with self._lock, self._connect() as conn:
            cur = conn.execute(sql, params)
            rows = cur.fetchall()
        return [
            TimelineBin(
                bin_start_ts=int(r[0] or 0),
                n_calls=int(r[1] or 0),
                n_cache_hits=int(r[2] or 0),
                n_errors=int(r[3] or 0),
                avg_latency_ms=float(r[4] or 0.0),
            )
            for r in rows
        ]

    def health(self) -> dict[str, Any]:
        """Sanity check: ritorna total rows + domain breakdown."""
        with self._lock, self._connect() as conn:
            cur = conn.execute(
                "SELECT COUNT(*), MIN(ts), MAX(ts) FROM provider_usage"
            )
            row = cur.fetchone()
            total = int(row[0] or 0)
            min_ts = int(row[1] or 0)
            max_ts = int(row[2] or 0)
            cur = conn.execute(
                "SELECT domain, COUNT(*) FROM provider_usage GROUP BY domain"
            )
            by_domain = {str(r[0]): int(r[1]) for r in cur.fetchall()}
        return {
            "enabled": self._enabled,
            "db_path": str(self.db_path),
            "total_records": total,
            "earliest_ts": min_ts,
            "latest_ts": max_ts,
            "by_domain": by_domain,
        }

    # ---- testing ---------------------------------------------------------
    def clear(self) -> None:
        """Svuota la tabella. Solo per test."""
        with self._lock, self._connect() as conn:
            conn.execute("DELETE FROM provider_usage")


# Singleton process-wide
tracker = UsageTracker()
