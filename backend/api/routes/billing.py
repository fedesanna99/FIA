"""Endpoint billing: /api/billing/estimate (Sprint 1 — A1)."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from billing import cost_estimator
from billing.schemas import CostEstimate, EstimateRequest
import storage


router = APIRouter()


@router.post("/estimate", response_model=CostEstimate)
def estimate_endpoint(req: EstimateRequest) -> CostEstimate:
    """Stima cpu_min/ram_mb/eta_s/credits per il job richiesto.

    Carica `req.model_id` dallo storage e dispatch su `cost_estimator.estimate`.
    """
    model = storage.get_model(req.model_id)
    if model is None:
        raise HTTPException(404, f"Modello '{req.model_id}' non trovato")
    try:
        return cost_estimator.estimate(req.solver, model, req.params or {})
    except ValueError as e:
        raise HTTPException(400, str(e))
