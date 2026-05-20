"""TerrainService — facade per profili quota e mesh elevation (Sprint 2 — B2).

Orchestrator F8 → chain "elevation":
    - Open-Elevation primary (batch nativo, worldwide)
    - USGS fallback (US only, alta risoluzione)

API:
    service.lookup_points(points: list[(lat, lon)]) -> TerrainProfile
        Estrae quota per N punti arbitrari. Sblocca workflow:
          - importa mesh DXF planare → riproietta su quote reali SRTM
          - genera curva profilo terreno lungo una linea
          - statistiche sito (min/max/mean elevation per bbox)

    service.profile_along_line(lat1, lon1, lat2, lon2, n_points=50)
        Helper convenience: genera N punti interpolati linearmente
        lat/lon e ne calcola le quote.

    service.bbox_statistics(lat_min, lon_min, lat_max, lon_max, n_grid=10)
        Helper: genera griglia n×n nel bbox, ritorna stats elevation.

Nota strutturale:
    - Per workflow georeferenziato 3D (mesh quotata) usare lookup_points.
    - Per anteprima profilo lungo una sezione usare profile_along_line.
    - Per visualizzazione bbox usare bbox_statistics.
"""
from __future__ import annotations

import logging
from typing import Sequence

from pydantic import BaseModel, Field

from ..orchestrator import ServiceOrchestrator, orchestrator as default_orchestrator
from ..providers.elevation.types import ElevationPoint
from ..providers.meteo.errors import (
    ProviderError,
    ProviderUnavailableError,
)


logger = logging.getLogger(__name__)


# ---- DTO ----------------------------------------------------------------


class TerrainStatistics(BaseModel):
    n_points: int = Field(ge=0)
    elevation_min_m: float
    elevation_max_m: float
    elevation_mean_m: float
    elevation_range_m: float = Field(description="max - min")


class TerrainProfile(BaseModel):
    points: list[ElevationPoint] = Field(default_factory=list)
    stats: TerrainStatistics
    source_provider: str = ""
    notes: list[str] = Field(default_factory=list)


# ---- helpers funzioni pure ----------------------------------------------


def compute_terrain_stats(points: Sequence[ElevationPoint]) -> TerrainStatistics:
    """Calcola statistiche elevazione sulla lista di punti."""
    if not points:
        return TerrainStatistics(
            n_points=0,
            elevation_min_m=0.0, elevation_max_m=0.0,
            elevation_mean_m=0.0, elevation_range_m=0.0,
        )
    elevations = [p.elevation_m for p in points]
    e_min = min(elevations)
    e_max = max(elevations)
    return TerrainStatistics(
        n_points=len(points),
        elevation_min_m=round(e_min, 2),
        elevation_max_m=round(e_max, 2),
        elevation_mean_m=round(sum(elevations) / len(elevations), 2),
        elevation_range_m=round(e_max - e_min, 2),
    )


def interpolate_line(
    lat1: float, lon1: float, lat2: float, lon2: float, n_points: int,
) -> list[tuple[float, float]]:
    """Interpola n_points punti lungo la linea (lat1,lon1) → (lat2,lon2).

    Args:
        n_points: numero punti totali (incluso start + end). Min 2.

    Returns:
        Lista di (lat, lon) ordinata da start a end.

    Note:
        Interpolazione lineare in coordinate WGS84 (no geodesica).
        Per distanze < ~50 km l'errore e' trascurabile per uso strutturale.
    """
    if n_points < 2:
        raise ValueError(f"n_points deve essere >= 2, ricevuto {n_points}")
    if n_points > 1000:
        raise ValueError(f"n_points troppi: {n_points} > 1000")
    points: list[tuple[float, float]] = []
    for i in range(n_points):
        t = i / (n_points - 1)
        lat = lat1 + t * (lat2 - lat1)
        lon = lon1 + t * (lon2 - lon1)
        points.append((lat, lon))
    return points


def generate_bbox_grid(
    lat_min: float, lon_min: float, lat_max: float, lon_max: float, n_grid: int,
) -> list[tuple[float, float]]:
    """Genera una griglia n×n di punti nel bbox.

    Args:
        n_grid: numero punti per lato (totale = n_grid²). Min 2.

    Returns:
        Lista di (lat, lon) ordinata row-major.
    """
    if n_grid < 2:
        raise ValueError(f"n_grid deve essere >= 2, ricevuto {n_grid}")
    if n_grid > 32:  # max 32² = 1024 punti
        raise ValueError(f"n_grid troppi: {n_grid} > 32 (max 1024 punti)")
    if lat_max <= lat_min or lon_max <= lon_min:
        raise ValueError(
            f"bbox invalido: lat ({lat_min},{lat_max}), lon ({lon_min},{lon_max})"
        )
    points: list[tuple[float, float]] = []
    for i in range(n_grid):
        for j in range(n_grid):
            t_lat = i / (n_grid - 1)
            t_lon = j / (n_grid - 1)
            lat = lat_min + t_lat * (lat_max - lat_min)
            lon = lon_min + t_lon * (lon_max - lon_min)
            points.append((lat, lon))
    return points


# ---- Service ------------------------------------------------------------


class TerrainService:
    """Facade per terrain profiles e elevation queries batch."""

    MAX_BATCH_POINTS = 1000

    def __init__(self, orchestrator: ServiceOrchestrator | None = None) -> None:
        self.orchestrator = (
            orchestrator if orchestrator is not None else default_orchestrator
        )

    async def lookup_points(
        self,
        points: Sequence[tuple[float, float]],
    ) -> TerrainProfile:
        """Quota per ogni (lat, lon) della lista.

        Args:
            points: lista di tuple (lat, lon). Max 1000.

        Raises:
            ValueError: lista vuota o troppo grande, coordinate fuori range
            ProviderUnavailableError: nessun provider elevation disponibile
        """
        if not points:
            raise ValueError("points non puo' essere vuota")
        if len(points) > self.MAX_BATCH_POINTS:
            raise ValueError(
                f"troppi punti: {len(points)} > {self.MAX_BATCH_POINTS}"
            )
        for i, (lat, lon) in enumerate(points):
            if not (-90.0 <= lat <= 90.0):
                raise ValueError(f"point[{i}].lat fuori range: {lat}")
            if not (-180.0 <= lon <= 180.0):
                raise ValueError(f"point[{i}].lon fuori range: {lon}")

        notes: list[str] = []
        try:
            result = await self.orchestrator.call(
                "elevation", "lookup_batch", list(points),
            )
        except KeyError as exc:
            raise ProviderUnavailableError(
                "no elevation providers registered — call register_all() at boot",
                provider="terrain_service",
            ) from exc

        ele_points: list[ElevationPoint] = list(result.points)
        if len(ele_points) != len(points):
            notes.append(
                f"provider returned {len(ele_points)}/{len(points)} points"
            )

        stats = compute_terrain_stats(ele_points)
        source = str(getattr(result, "source", "unknown"))
        return TerrainProfile(
            points=ele_points,
            stats=stats,
            source_provider=source,
            notes=notes,
        )

    async def profile_along_line(
        self,
        lat1: float, lon1: float,
        lat2: float, lon2: float,
        n_points: int = 50,
    ) -> TerrainProfile:
        """Genera N punti lungo la linea e ne calcola le quote.

        Args:
            lat1, lon1: start point
            lat2, lon2: end point
            n_points: numero punti totali (default 50). Min 2, max 1000.

        Returns:
            TerrainProfile ordinato da start a end (utile per chart "section").
        """
        pts = interpolate_line(lat1, lon1, lat2, lon2, n_points)
        return await self.lookup_points(pts)

    async def bbox_statistics(
        self,
        lat_min: float, lon_min: float,
        lat_max: float, lon_max: float,
        n_grid: int = 10,
    ) -> TerrainProfile:
        """Statistiche elevazione su griglia n×n nel bbox.

        Args:
            n_grid: punti per lato (totale n²). Default 10 (100 punti), max 32.

        Returns:
            TerrainProfile con tutti i punti della griglia + stats.
        """
        pts = generate_bbox_grid(lat_min, lon_min, lat_max, lon_max, n_grid)
        return await self.lookup_points(pts)


# ---- Singleton ----------------------------------------------------------

service = TerrainService()
