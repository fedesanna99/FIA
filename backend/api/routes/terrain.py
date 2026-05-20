"""Endpoint terrain (Sprint 2 — B2).

Espone TerrainService via REST.

Routes:
    POST /api/terrain/batch   — quota per N punti lat/lon
    POST /api/terrain/profile — profilo lungo una linea
    POST /api/terrain/bbox    — griglia n×n in un bbox
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from services.facades.terrain import TerrainProfile, service as terrain_service
from services.providers.meteo.errors import (
    ProviderError,
    ProviderUnavailableError,
)


logger = logging.getLogger(__name__)


router = APIRouter()


class PointInput(BaseModel):
    lat: float = Field(ge=-90.0, le=90.0)
    lon: float = Field(ge=-180.0, le=180.0)


class BatchRequest(BaseModel):
    points: list[PointInput] = Field(min_length=1, max_length=1000)


class ProfileRequest(BaseModel):
    lat1: float = Field(ge=-90.0, le=90.0)
    lon1: float = Field(ge=-180.0, le=180.0)
    lat2: float = Field(ge=-90.0, le=90.0)
    lon2: float = Field(ge=-180.0, le=180.0)
    n_points: int = Field(default=50, ge=2, le=1000)


class BboxRequest(BaseModel):
    lat_min: float = Field(ge=-90.0, le=90.0)
    lon_min: float = Field(ge=-180.0, le=180.0)
    lat_max: float = Field(ge=-90.0, le=90.0)
    lon_max: float = Field(ge=-180.0, le=180.0)
    n_grid: int = Field(default=10, ge=2, le=32)


def _handle_errors(exc: Exception) -> HTTPException:
    """Map exception to HTTPException."""
    if isinstance(exc, ProviderUnavailableError):
        return HTTPException(status_code=503, detail=str(exc))
    if isinstance(exc, ProviderError):
        return HTTPException(status_code=502, detail=str(exc))
    if isinstance(exc, ValueError):
        return HTTPException(status_code=422, detail=str(exc))
    return HTTPException(status_code=500, detail=str(exc))


@router.post("/batch", response_model=TerrainProfile)
async def terrain_batch(req: BatchRequest) -> TerrainProfile:
    """Quota per N punti arbitrari (batch via Open-Elevation o fallback)."""
    pts = [(p.lat, p.lon) for p in req.points]
    try:
        return await terrain_service.lookup_points(pts)
    except (ProviderUnavailableError, ProviderError, ValueError) as exc:
        logger.warning("terrain_batch error: %s", exc)
        raise _handle_errors(exc) from exc


@router.post("/profile", response_model=TerrainProfile)
async def terrain_profile(req: ProfileRequest) -> TerrainProfile:
    """Profilo elevazione lungo una linea (lat1,lon1) → (lat2,lon2)."""
    try:
        return await terrain_service.profile_along_line(
            lat1=req.lat1, lon1=req.lon1,
            lat2=req.lat2, lon2=req.lon2,
            n_points=req.n_points,
        )
    except (ProviderUnavailableError, ProviderError, ValueError) as exc:
        logger.warning("terrain_profile error: %s", exc)
        raise _handle_errors(exc) from exc


@router.post("/bbox", response_model=TerrainProfile)
async def terrain_bbox(req: BboxRequest) -> TerrainProfile:
    """Statistiche elevazione su griglia n×n nel bbox."""
    try:
        return await terrain_service.bbox_statistics(
            lat_min=req.lat_min, lon_min=req.lon_min,
            lat_max=req.lat_max, lon_max=req.lon_max,
            n_grid=req.n_grid,
        )
    except (ProviderUnavailableError, ProviderError, ValueError) as exc:
        logger.warning("terrain_bbox error: %s", exc)
        raise _handle_errors(exc) from exc
