"""Endpoint geocoding (Sprint 2 — B1).

Espone GeocodingService via REST.

Routes:
    GET /api/geocoding/search?q=<query>&count=10&language=en
    GET /api/geocoding/reverse?lat=...&lon=...&language=en
    GET /api/geocoding/best?q=<query>&language=en  (top hit only)
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, Query

from services.facades.geocoding import service as geocoding_service
from services.providers.geocoding.types import (
    GeocodingResult,
    Location,
    ReverseResult,
)
from services.providers.meteo.errors import (
    ProviderError,
    ProviderUnavailableError,
)


logger = logging.getLogger(__name__)


router = APIRouter()


@router.get("/search", response_model=GeocodingResult)
async def geocoding_search(
    q: str = Query(min_length=1, max_length=200),
    count: int = Query(default=10, ge=1, le=100),
    language: str = Query(default="en", min_length=2, max_length=10),
) -> GeocodingResult:
    """Forward geocoding (chain F8: open_meteo → nominatim fallback)."""
    try:
        return await geocoding_service.search(query=q, count=count, language=language)
    except ProviderUnavailableError as exc:
        logger.warning("geocoding search providers unavailable: %s", exc)
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ProviderError as exc:
        logger.warning("geocoding search provider error: %s", exc)
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.get("/reverse", response_model=ReverseResult)
async def geocoding_reverse(
    lat: float = Query(ge=-90.0, le=90.0),
    lon: float = Query(ge=-180.0, le=180.0),
    language: str = Query(default="en", min_length=2, max_length=10),
) -> ReverseResult:
    """Reverse geocoding. Open-Meteo non supporta -> auto-fallback Nominatim."""
    try:
        return await geocoding_service.reverse(lat=lat, lon=lon, language=language)
    except ProviderUnavailableError as exc:
        logger.warning("geocoding reverse providers unavailable: %s", exc)
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ProviderError as exc:
        logger.warning("geocoding reverse provider error: %s", exc)
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.get("/best", response_model=Location | None)
async def geocoding_best(
    q: str = Query(min_length=1, max_length=200),
    language: str = Query(default="en", min_length=2, max_length=10),
) -> Location | None:
    """Top hit del forward search. Utile per "user types address → autofill"."""
    try:
        return await geocoding_service.find_best(query=q, language=language)
    except ProviderUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ProviderError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
