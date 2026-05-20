"""Service facade — UI-friendly API che orchestrano provider F4 via F8.

Le facade traducono dati grezzi del provider in **design loads** pronti
per il dimensionamento strutturale secondo EN 1991/NTC 2018.

Lista facade Sprint 2:
    MeteoLoadsService    — vento + neve (B4)                ✅
    SeismicLoadsService  — a_g + spectrum EC8/NTC 2018 (B3) ✅
    GeocodingService     — forward/reverse + autocomplete (B1) TODO
    TerrainService       — interpolazione quota mesh (B2)   TODO
"""
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
]
