"""JobStore SQLite persistente (Sprint 1 — A5)."""
from __future__ import annotations

import json
import os
import sqlite3
import threading
import time
from pathlib import Path
from typing import Any

from .models import Job, JobStatus, PRIORITY_ORDER


def _default_data_dir() -> Path:
    """Cartella dove vive lo JobStore SQLite. Override via `FEAPRO_DATA_DIR=/data`."""
    return Path(os.environ.get("FEAPRO_DATA_DIR", ".cache"))


JOBS_DB: Path = _default_data_dir() / "jobs.sqlite"

_SCHEMA = """
CREATE TABLE IF NOT EXISTS jobs (
  job_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  solver TEXT NOT NULL,
  model_id TEXT NOT NULL,
  priority TEXT NOT NULL,
  status TEXT NOT NULL,
  priority_rank INTEGER NOT NULL,
  created_at REAL NOT NULL,
  payload TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_user ON jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_pri ON jobs(priority_rank, created_at);
"""


class JobStore:
    """Persistenza SQLite di Job, dequeue atomico per priorita'."""

    def __init__(self, db_path: Path | None = None) -> None:
        self.db_path = Path(db_path) if db_path is not None else JOBS_DB
        self._lock = threading.RLock()
        self._init_db()

    def _connect(self) -> sqlite3.Connection:
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(str(self.db_path), isolation_level=None, timeout=10)
        conn.execute("PRAGMA journal_mode=WAL")
        return conn

    def _init_db(self) -> None:
        with self._lock, self._connect() as conn:
            conn.executescript(_SCHEMA)

    def _row_to_job(self, row: tuple) -> Job:
        payload = json.loads(row[-1])
        return Job(**payload)

    def _save(self, conn: sqlite3.Connection, job: Job) -> None:
        payload = job.model_dump_json()
        conn.execute(
            "INSERT OR REPLACE INTO jobs "
            "(job_id, user_id, solver, model_id, priority, status, priority_rank, created_at, payload) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                job.job_id, job.user_id, job.solver, job.model_id, job.priority,
                job.status, PRIORITY_ORDER.get(job.priority, 2),
                job.created_at, payload,
            ),
        )

    # ----- public --------------------------------------------------------
    def enqueue(self, job: Job) -> Job:
        with self._lock, self._connect() as conn:
            self._save(conn, job)
        return job

    def dequeue(self) -> Job | None:
        """Pop atomico del job con priorita' piu' alta (PRIORITY_ORDER asc, created_at asc).

        Marca lo status come `running` e ritorna il Job aggiornato.
        """
        with self._lock, self._connect() as conn:
            cur = conn.execute(
                "SELECT payload FROM jobs WHERE status='queued' "
                "ORDER BY priority_rank ASC, created_at ASC LIMIT 1"
            )
            row = cur.fetchone()
            if row is None:
                return None
            job = Job(**json.loads(row[0]))
            job.status = "running"
            job.started_at = time.time()
            job.attempts = (job.attempts or 0) + 1
            self._save(conn, job)
            return job

    def update(self, job_id: str, **fields: Any) -> Job:
        with self._lock, self._connect() as conn:
            cur = conn.execute("SELECT payload FROM jobs WHERE job_id=?", (job_id,))
            row = cur.fetchone()
            if row is None:
                raise KeyError(job_id)
            job = Job(**json.loads(row[0]))
            for k, v in fields.items():
                if hasattr(job, k):
                    setattr(job, k, v)
            self._save(conn, job)
            return job

    def get(self, job_id: str) -> Job:
        with self._lock, self._connect() as conn:
            cur = conn.execute("SELECT payload FROM jobs WHERE job_id=?", (job_id,))
            row = cur.fetchone()
            if row is None:
                raise KeyError(job_id)
            return Job(**json.loads(row[0]))

    def list(
        self,
        user_id: str | None = None,
        status: JobStatus | None = None,
        limit: int = 100,
    ) -> list[Job]:
        with self._lock, self._connect() as conn:
            where: list[str] = []
            params: list[Any] = []
            if user_id is not None:
                where.append("user_id=?")
                params.append(user_id)
            if status is not None:
                where.append("status=?")
                params.append(status)
            clause = (" WHERE " + " AND ".join(where)) if where else ""
            sql = f"SELECT payload FROM jobs{clause} ORDER BY created_at DESC LIMIT ?"
            params.append(int(limit))
            cur = conn.execute(sql, tuple(params))
            return [Job(**json.loads(r[0])) for r in cur.fetchall()]

    def cancel(self, job_id: str) -> Job:
        with self._lock, self._connect() as conn:
            cur = conn.execute("SELECT payload FROM jobs WHERE job_id=?", (job_id,))
            row = cur.fetchone()
            if row is None:
                raise KeyError(job_id)
            job = Job(**json.loads(row[0]))
            if job.status in ("done", "failed", "cancelled"):
                # idempotente: gia' in stato finale
                return job
            job.status = "cancelled"
            job.ended_at = time.time()
            self._save(conn, job)
            return job

    def clear_for_tests(self) -> None:
        with self._lock, self._connect() as conn:
            conn.execute("DELETE FROM jobs")


# Singleton
job_store = JobStore()
