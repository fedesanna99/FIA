"""Schemas Pydantic per il layer billing (Sprint 1)."""
from __future__ import annotations
from typing import Literal

from pydantic import BaseModel, Field


SolverKind = Literal[
    "linear", "modal", "buckling", "pushover",
    "response_spectrum", "dynamic_th", "seismic_th",
    "nonlinear", "arclength", "winkler",
]

SOLVER_KINDS: tuple[str, ...] = (
    "linear", "modal", "buckling", "pushover",
    "response_spectrum", "dynamic_th", "seismic_th",
    "nonlinear", "arclength", "winkler",
)


class CostEstimate(BaseModel):
    """Risultato di cost_estimator.estimate() per un singolo job."""

    solver: SolverKind
    n_dof: int = Field(ge=0)
    cpu_min: float = Field(ge=0.0, description="CPU-minutes stimati")
    ram_mb: float = Field(ge=0.0, description="RAM peak stimata MB")
    eta_s: float = Field(ge=0.0, description="Wall-time ETA in secondi")
    credits: float = Field(ge=0.0, description="Crediti FEA Pro (10 crediti ~ 1 EUR)")
    explanation: str = Field(description="Breve breakdown per UI")


class EstimateRequest(BaseModel):
    """Payload per POST /api/billing/estimate."""

    model_id: str
    solver: SolverKind
    params: dict = Field(default_factory=dict)
