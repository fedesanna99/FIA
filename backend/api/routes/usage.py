"""Endpoint usage: /api/usage/{user_id}/summary (Sprint 1 — A2)."""
from __future__ import annotations

import time
from typing import Any

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

from billing import job_meter


router = APIRouter()


class UsageSummary(BaseModel):
    user_id: str
    window_days: int
    n_jobs: int
    total_credits: float
    jobs_by_solver: dict[str, int] = Field(default_factory=dict)
    jobs_by_status: dict[str, int] = Field(default_factory=dict)
    last_job_at: float | None = None


def _aggregate(records: list[dict], user_id: str, window_days: int) -> UsageSummary:
    now = time.time()
    cutoff = now - window_days * 24 * 3600

    n = 0
    total_credits = 0.0
    by_solver: dict[str, int] = {}
    by_status: dict[str, int] = {}
    last_at: float | None = None

    for r in records:
        if r.get("user_id") != user_id:
            continue
        started = float(r.get("started_at") or 0.0)
        if started < cutoff:
            continue
        n += 1
        c = r.get("actual_credits")
        if c is None:
            c = r.get("estimate_credits") or 0.0
        total_credits += float(c or 0.0)
        solver = str(r.get("solver") or "unknown")
        status = str(r.get("status") or "unknown")
        by_solver[solver] = by_solver.get(solver, 0) + 1
        by_status[status] = by_status.get(status, 0) + 1
        if last_at is None or started > last_at:
            last_at = started

    return UsageSummary(
        user_id=user_id,
        window_days=window_days,
        n_jobs=n,
        total_credits=round(total_credits, 4),
        jobs_by_solver=by_solver,
        jobs_by_status=by_status,
        last_job_at=last_at,
    )


@router.get("/{user_id}/summary", response_model=UsageSummary)
def usage_summary(
    user_id: str,
    window_days: int = Query(default=30, ge=1, le=3650),
) -> UsageSummary:
    """Aggrega audit/jobs.jsonl filtrato per user_id e finestra temporale."""
    records = job_meter.read_audit_log()
    return _aggregate(records, user_id=user_id, window_days=window_days)
