"""Endpoint design loads (Sprint 2 — B4 e seguenti).

Espone le facade `services.facades` come API REST.

Routes:
    POST /api/loads/meteo  — wind + snow loads (B4)
    [futuro] POST /api/loads/seismic  — a_g + spectrum EC8 (B3)
"""
from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from services.facades.meteo_loads import MeteoLoadsResult, service as meteo_service
from services.providers.meteo.errors import (
    ProviderError,
    ProviderUnavailableError,
)


logger = logging.getLogger(__name__)


router = APIRouter()


class MeteoLoadsRequest(BaseModel):
    lat: float = Field(ge=-90.0, le=90.0)
    lon: float = Field(ge=-180.0, le=180.0)
    elevation_m: float | None = Field(default=None, ge=-500.0, le=9000.0)
    years: int = Field(default=80, ge=10, le=85)


@router.post("/meteo", response_model=MeteoLoadsResult)
async def meteo_loads(req: MeteoLoadsRequest) -> MeteoLoadsResult:
    """Calcola wind + snow loads EN 1991 per la location.

    Pipeline (vedi `services.facades.meteo_loads`):
      1. Estremi 50y vento/neve via provider meteo (chain F8)
      2. Quota via provider elevation (opzionale)
      3. Formule semplificate EN 1991-1-4 + EN 1991-1-3

    Errori HTTP:
      - 503 se nessun provider disponibile (registry vuoto o tutti down)
      - 502 se errore upstream provider non recoverable
      - 422 input invalido (FastAPI auto)
    """
    try:
        result = await meteo_service.compute(
            lat=req.lat,
            lon=req.lon,
            elevation_m=req.elevation_m,
            years=req.years,
        )
    except ProviderUnavailableError as exc:
        logger.warning("meteo_loads providers unavailable: %s", exc)
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ProviderError as exc:
        logger.warning("meteo_loads provider error: %s", exc)
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return result
