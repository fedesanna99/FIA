"""Provider auto-registration helper (Sprint 2 — F8).

Da chiamare al boot dell'app per registrare tutti i provider concreti
F4 nel registry singleton. Senza questa chiamata, l'orchestratore F8
non trova nessun provider e solleva `KeyError`.

Esempio:
    # main.py (FastAPI startup)
    from services.providers.registration import register_all
    register_all()
"""
from __future__ import annotations

import logging

from ..registry import ProviderRegistry, registry as default_registry


logger = logging.getLogger(__name__)


def register_all(target: ProviderRegistry | None = None) -> ProviderRegistry:
    """Registra tutti i provider F4 nel registry.

    Args:
        target: registry da popolare. Default: singleton globale.

    Returns:
        Il registry popolato.

    Note:
        Il primo provider per ciascun dominio diventa il "default"
        (selezionato da `registry.get(domain)` se non c'e' env var
        `FEAPRO_<DOMAIN>_PROVIDER`). L'ordine sotto stabilisce questa
        default-chain:
            geocoding   : open_meteo_geocoding > nominatim
            meteo       : open_meteo_forecast > open_meteo_archive
            elevation   : open_elevation > usgs_elevation
            seismic     : usgs_earthquake (unico)
    """
    reg = target if target is not None else default_registry

    # Import lazy per evitare side effects al solo `from registration import ...`
    from .meteo import OpenMeteoArchiveProvider, OpenMeteoForecastProvider
    from .geocoding import NominatimProvider, OpenMeteoGeocodingProvider
    from .elevation import OpenElevationProvider, USGSElevationProvider
    from .seismic import USGSEarthquakeProvider

    # Ordine import = ordine di default-chain (primo registrato = default)
    reg.register(OpenMeteoForecastProvider)
    reg.register(OpenMeteoArchiveProvider)

    reg.register(OpenMeteoGeocodingProvider)
    reg.register(NominatimProvider)

    reg.register(OpenElevationProvider)
    reg.register(USGSElevationProvider)

    reg.register(USGSEarthquakeProvider)

    logger.info(
        "registered providers: %s",
        {d: reg.list_providers(d) for d in reg.list_domains()},
    )
    return reg
