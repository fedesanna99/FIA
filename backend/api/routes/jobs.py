"""Endpoint REST per i job (Sprint 1 — A5, alpha.15 user_id auth-aware)."""
from __future__ import annotations

from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from auth import (
    DEFAULT_USER_ID,
    User,
    get_current_user_optional,
    resolve_user_id,
)
from billing import cost_estimator
from billing.middleware import check_quota_for_solve
from billing.schemas import SolverKind
from jobs.models import Job, JobPriority, JobStatus
from jobs.store import job_store
import storage


router = APIRouter()


class JobSubmitRequest(BaseModel):
    model_id: str
    solver: SolverKind
    params: dict = Field(default_factory=dict)
    priority: JobPriority = "standard"
    # alpha.15: opzionale. Se presente JWT, viene IGNORATO a favore di
    # current_user.id. Mantenuto per backward compat (CLI/legacy clients).
    user_id: Optional[str] = None
    max_retries: int = 1


@router.post("", response_model=Job, status_code=201)
def submit_job(
    req: JobSubmitRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
) -> Job:
    user_id = resolve_user_id(current_user, req.user_id)
    model = storage.get_model(req.model_id)
    if model is None:
        raise HTTPException(404, f"Modello '{req.model_id}' non trovato")
    estimate = cost_estimator.estimate(req.solver, model, req.params or {})
    # quota check pre-enqueue (blocca subito se cap esaurito)
    check_quota_for_solve(user_id, estimate)
    job = Job(
        user_id=user_id,
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
    user_id: Optional[str] = None,
    status: JobStatus | None = None,
    limit: int = 100,
    current_user: Optional[User] = Depends(get_current_user_optional),
) -> list[Job]:
    effective_uid = resolve_user_id(current_user, user_id)
    return job_store.list(user_id=effective_uid, status=status, limit=limit)


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
