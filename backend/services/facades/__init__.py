"""Service facade — UI-friendly API che orchestrano provider F4 via F8.

Le facade traducono dati grezzi del provider in payload pronti per il
dimensionamento strutturale (EN 1991/NTC 2018) o per workflow UX.

Lista facade Sprint 2 (COMPLETA):
    MeteoLoadsService    — vento + neve (B4)                ✅
    SeismicLoadsService  — a_g + spectrum EC8/NTC 2018 (B3) ✅
    GeocodingService     — forward/reverse + best-match (B1) ✅
    TerrainService       — profili quota + bbox stats (B2)  ✅
"""
from .geocoding import GeocodingService
from .meteo_loads import (
    MeteoLoadsLocation,
    MeteoLoadsResult,
    MeteoLoadsService,
    SnowLoads,
    WindLoads,
)
from .seismic_loads import (
    ResponseSpectrumPoint,
    SeismicLoadsLocation,
    SeismicLoadsResult,
    SeismicLoadsService,
    SeismicSiteParams,
)
from .terrain import TerrainProfile, TerrainService, TerrainStatistics


__all__ = [
    "MeteoLoadsService",
    "MeteoLoadsResult",
    "MeteoLoadsLocation",
    "WindLoads",
    "SnowLoads",
    "SeismicLoadsService",
    "SeismicLoadsResult",
    "SeismicLoadsLocation",
    "SeismicSiteParams",
    "ResponseSpectrumPoint",
    "GeocodingService",
    "TerrainService",
    "TerrainProfile",
    "TerrainStatistics",
]
