"""Endpoint REST per i job (Sprint 1 — A5)."""
from __future__ import annotations

import os
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from billing import cost_estimator
from billing.middleware import check_quota_for_solve
from billing.schemas import SolverKind
from jobs.models import Job, JobPriority, JobStatus
from jobs.store import job_store
import storage


router = APIRouter()


DEFAULT_USER_ID = os.environ.get("FEAPRO_DEFAULT_USER_ID", "demo_user")


class JobSubmitRequest(BaseModel):
    model_id: str
    solver: SolverKind
    params: dict = Field(default_factory=dict)
    priority: JobPriority = "standard"
    user_id: str = DEFAULT_USER_ID
    max_retries: int = 1


@router.post("", response_model=Job, status_code=201)
def submit_job(req: JobSubmitRequest) -> Job:
    model = storage.get_model(req.model_id)
    if model is None:
        raise HTTPException(404, f"Modello '{req.model_id}' non trovato")
    estimate = cost_estimator.estimate(req.solver, model, req.params or {})
    # quota check pre-enqueue (blocca subito se cap esaurito)
    check_quota_for_solve(req.user_id, estimate)
    job = Job(
        user_id=req.user_id,
        solver=req.solver,
        model_id=req.model_id,
        params=req.params or {},
        estimate=estimate,
        priority=req.priority,
        max_retries=req.max_retries,
    )
    return job_store.enqueue(job)


@router.get("/{job_id}", response_model=Job)
def get_job(job_id: str) -> Job:
    try:
        return job_store.get(job_id)
    except KeyError:
        raise HTTPException(404, f"Job '{job_id}' non trovato")


@router.get("", response_model=list[Job])
def list_jobs(
    user_id: str = DEFAULT_USER_ID,
    status: JobStatus | None = None,
    limit: int = 100,
) -> list[Job]:
    return job_store.list(user_id=user_id, status=status, limit=limit)


@router.delete("/{job_id}", response_model=Job)
def cancel_job(job_id: str) -> Job:
    try:
        return job_store.cancel(job_id)
    except KeyError:
        raise HTTPException(404, f"Job '{job_id}' non trovato")


@router.get("/{job_id}/result")
def get_job_result(job_id: str) -> Any:
    try:
        job = job_store.get(job_id)
    except KeyError:
        raise HTTPException(404, f"Job '{job_id}' non trovato")
    if job.status != "done":
        raise HTTPException(404, f"Job '{job_id}' non ha ancora un risultato (status={job.status})")
    # Il worker salva i risultati in storage.save_results(model_id, solver, payload)
    result = storage.get_results(job.model_id, job.solver)
    if result is None:
        raise HTTPException(404, "Risultato non disponibile in storage")
    return result
