"""JobMeter middleware (Sprint 1 — A2).

Misura wall-time, CPU-time, peak RSS di ogni solve. Scrive una riga JSONL in
`audit/jobs.jsonl` per ogni job. Esporta `measure_job` come context manager.

Implementazione cross-platform (Windows/Linux/macOS): usa `time.process_time`
per la CPU e `tracemalloc` per il picco di RAM (in MB).
"""
from __future__ import annotations

import json
import os
import threading
import time
import tracemalloc
import uuid
from contextlib import contextmanager
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Iterator

from .schemas import CostEstimate, SolverKind


# Path del log JSONL. Risolto lazy in modo che i test possano monkey-patchare
# `AUDIT_LOG = Path(tmp_path)/...` prima di chiamare il context manager.
# In produzione (Fly.io) `FEAPRO_DATA_DIR=/data` redirige a /data/audit/jobs.jsonl
# per persistenza tra redeploy.
def _default_audit_log() -> Path:
    base = os.environ.get("FEAPRO_DATA_DIR")
    if base:
        return Path(base) / "audit" / "jobs.jsonl"
    return Path("audit/jobs.jsonl")


AUDIT_LOG: Path = _default_audit_log()

# Lock globale per scritture atomiche concorrenti (multi-thread).
_write_lock = threading.Lock()


@dataclass
class JobRecord:
    job_id: str
    user_id: str
    solver: SolverKind
    model_id: str
    started_at: float
    ended_at: float | None = None
    wall_s: float | None = None
    cpu_s: float | None = None
    ram_peak_mb: float | None = None
    n_dof: int = 0
    status: str = "running"            # "running" | "done" | "failed"
    error: str | None = None
    estimate_credits: float = 0.0
    actual_credits: float | None = None


def _bytes_to_mb(b: int) -> float:
    return float(b) / (1024.0 * 1024.0)


def _credits_from_wall(wall_s: float, ram_peak_mb: float) -> float:
    """Crediti effettivi: 0.10 credits/s + 0.0005 credits/MB-s (semplice, lineare)."""
    return round(0.10 * max(wall_s, 0.0) + 0.0005 * max(ram_peak_mb, 0.0), 4)


def _ensure_log_dir(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


def _append_jsonl(path: Path, payload: dict) -> None:
    _ensure_log_dir(path)
    line = json.dumps(payload, default=str)
    # Lock + open in "a" + flush per garantire scritture atomiche in concorrenza.
    with _write_lock:
        with path.open("a", encoding="utf-8") as fh:
            fh.write(line + "\n")
            fh.flush()
            try:
                os.fsync(fh.fileno())
            except OSError:
                pass


@contextmanager
def measure_job(
    user_id: str,
    solver: SolverKind,
    model_id: str,
    n_dof: int,
    estimate: CostEstimate,
    audit_log: Path | None = None,
) -> Iterator[JobRecord]:
    """Context manager: misura wall_s, cpu_s, ram_peak_mb e scrive un JobRecord JSONL.

    Usage:
        with measure_job(user_id="u", solver="linear", model_id="m", n_dof=120, estimate=est) as rec:
            run_solver()
    """
    log = audit_log if audit_log is not None else AUDIT_LOG

    record = JobRecord(
        job_id=str(uuid.uuid4()),
        user_id=user_id,
        solver=solver,
        model_id=model_id,
        started_at=time.time(),
        n_dof=int(n_dof),
        estimate_credits=float(estimate.credits),
    )

    t0_wall = time.perf_counter()
    t0_cpu = time.process_time()
    # tracemalloc.start() e' idempotente (start su instanza gia' attiva = no-op).
    tracemalloc.start()
    try:
        yield record
        record.status = "done"
    except BaseException as exc:
        record.status = "failed"
        record.error = f"{type(exc).__name__}: {exc}"
        raise
    finally:
        # Sempre: aggiorna metriche + flush JSONL.
        wall_s = time.perf_counter() - t0_wall
        cpu_s = time.process_time() - t0_cpu
        try:
            _, peak = tracemalloc.get_traced_memory()
            ram_peak_mb = _bytes_to_mb(peak)
        except Exception:
            ram_peak_mb = 0.0
        record.ended_at = time.time()
        record.wall_s = float(wall_s)
        record.cpu_s = float(cpu_s)
        record.ram_peak_mb = float(ram_peak_mb)
        if record.actual_credits is None:
            record.actual_credits = _credits_from_wall(wall_s, ram_peak_mb)
        try:
            _append_jsonl(log, asdict(record))
        except Exception:
            # Non-blocking: il logging non deve mai far fallire il solve.
            pass


def read_audit_log(audit_log: Path | None = None) -> list[dict]:
    """Legge tutte le righe del JSONL e ritorna lista di dict. None-safe."""
    path = audit_log if audit_log is not None else AUDIT_LOG
    if not path.exists():
        return []
    out: list[dict] = []
    with path.open("r", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                out.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    return out
