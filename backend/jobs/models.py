"""Modelli Job (Sprint 1 — A5)."""
from __future__ import annotations

import time
import uuid
from typing import Literal

from pydantic import BaseModel, Field

from billing.schemas import CostEstimate, SolverKind


JobStatus = Literal["queued", "running", "done", "failed", "cancelled"]
JobPriority = Literal["standard", "fast", "urgent"]

PRIORITY_ORDER: dict[str, int] = {"urgent": 0, "fast": 1, "standard": 2}


class Job(BaseModel):
    job_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    solver: SolverKind
    model_id: str
    params: dict = Field(default_factory=dict)
    estimate: CostEstimate
    priority: JobPriority = "standard"
    status: JobStatus = "queued"
    created_at: float = Field(default_factory=time.time)
    started_at: float | None = None
    ended_at: float | None = None
    attempts: int = 0
    max_retries: int = 1
    error: str | None = None
    result_ref: str | None = None
