"""Endpoint design loads (Sprint 2 — B3 + B4).

Espone le facade `services.facades` come API REST.

Routes:
    POST /api/loads/meteo    — wind + snow loads (B4, EN 1991-1-4/1-3)
    POST /api/loads/seismic  — a_g + response spectrum (B3, NTC 2018 §3.2)
"""
from __future__ import annotations

import logging
from typing import Any, Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from services.facades.meteo_loads import MeteoLoadsResult, service as meteo_service
from services.facades.seismic_loads import (
    SeismicLoadsResult,
    service as seismic_service,
)
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


class SeismicLoadsRequest(BaseModel):
    lat: float = Field(ge=-90.0, le=90.0)
    lon: float = Field(ge=-180.0, le=180.0)
    elevation_m: float | None = Field(default=None, ge=-500.0, le=9000.0)
    max_radius_km: float = Field(default=100.0, gt=0.0, le=1000.0)
    years_back: int = Field(default=100, ge=10, le=200)
    soil_category: Literal["A", "B", "C", "D", "E"] = Field(default="A")
    F_0: float = Field(default=2.5, ge=2.0, le=3.5)
    T_c_star_s: float = Field(default=0.35, ge=0.1, le=1.0)
    damping_ratio: float = Field(default=0.05, ge=0.01, le=0.30)
    gmpe_R_km: float = Field(default=20.0, gt=0.0, le=500.0)
    spectrum_n_points: int = Field(default=100, ge=10, le=1000)
    spectrum_t_max_s: float = Field(default=4.0, gt=0.0, le=10.0)


@router.post("/seismic", response_model=SeismicLoadsResult)
async def seismic_loads(req: SeismicLoadsRequest) -> SeismicLoadsResult:
    """Calcola seismic loads (NTC 2018 / EC8 simplified).

    Pipeline (vedi `services.facades.seismic_loads`):
      1. Storico USGS earthquake catalog: M_max nel raggio richiesto
      2. GMPE Sabetta-Pugliese 1996 (taratura Italia) → a_g/g
      3. Parametri spettrali NTC 2018 §3.2.3.2 + soil category
      4. Response spectrum elastico orizzontale

    Errori HTTP:
      - 503 nessun provider disponibile
      - 502 errore provider non recoverable
      - 422 input invalido

    NOTA: output e' una STIMA preliminare per fasi di pre-progetto /
    didattica. Per progetto reale serve la tabella ufficiale NTC 2018
    (reticolo 10751 nodi + Vita di Riferimento + Classe d'Uso).
    """
    try:
        result = await seismic_service.compute(
            lat=req.lat,
            lon=req.lon,
            elevation_m=req.elevation_m,
            max_radius_km=req.max_radius_km,
            years_back=req.years_back,
            soil_category=req.soil_category,
            F_0=req.F_0,
            T_c_star_s=req.T_c_star_s,
            damping_ratio=req.damping_ratio,
            gmpe_R_km=req.gmpe_R_km,
            spectrum_n_points=req.spectrum_n_points,
            spectrum_t_max_s=req.spectrum_t_max_s,
        )
    except ProviderUnavailableError as exc:
        logger.warning("seismic_loads providers unavailable: %s", exc)
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ProviderError as exc:
        logger.warning("seismic_loads provider error: %s", exc)
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return result
