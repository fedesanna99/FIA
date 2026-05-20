# `services.providers.geocoding` — Geocoding providers (Sprint 2 — F4.2)

Provider concreti per forward/reverse geocoding sopra l'infrastruttura
`services/{cache,rate_limiter,registry}.py` di Sprint 1.

## API pubblica

```python
from services.providers.geocoding import (
    OpenMeteoGeocodingProvider,
    NominatimProvider,
    GeocodingResult,
    Location,
    ReverseResult,
)

# Forward search (Open-Meteo, veloce, no API key, no reverse)
om = OpenMeteoGeocodingProvider()
result: GeocodingResult = await om.search("Cagliari", count=5, language="it")
for loc in result.results:
    print(loc.name, loc.lat, loc.lon, loc.country_code)

# Forward search (Nominatim/OSM, anche reverse)
nom = NominatimProvider()
result = await nom.search("Cagliari, Sardegna", count=3)

# Reverse geocoding (solo Nominatim)
addr: ReverseResult = await nom.reverse(lat=39.2154, lon=9.1166)
if addr.location:
    print(addr.location.name)
```

## Confronto provider

| Feature | Open-Meteo | Nominatim |
|---|---|---|
| Forward search | ✅ | ✅ |
| Reverse geocoding | ❌ (`NotImplementedError`) | ✅ |
| Copertura EU | eccellente | eccellente |
| Copertura mondiale | buona | eccellente |
| Rate limit (default) | 10 rps (bucket `open_meteo`) | **1 rps strict** (bucket `nominatim`) |
| User-Agent richiesto | no | **sì, obbligatorio** |
| API key | no | no |
| Cache TTL default | 1 anno | 1 anno |

## Vincoli operativi

### Nominatim
- **User-Agent identificativo obbligatorio**. Default:
  `"FEA-Pro/1.3 (https://github.com/fedesanna99/FIA)"`. Override via env
  `FEAPRO_NOMINATIM_USER_AGENT="MyApp/1.0 (contact@example.com)"`.
- Rate limit 1 rps strict per usage policy OSM. Per >1000 req/day si
  raccomanda self-hosting o uso provider commerciale.
- HTTP 403 in caso di User-Agent mancante o "abuso" rilevato.

### Open-Meteo
- Free non-commercial, no key. Limits: 10000 daily, 5000 hourly, 600/min.
- Bucket `open_meteo` condiviso con i provider meteo F4.1 — attenzione
  a non saturarlo se si usa il fallback chain.

## Errori sollevati

Stesso contratto F4.1 (riutilizzati da `services.providers.meteo.errors`):

| Eccezione | Causa |
|---|---|
| `ProviderRateLimitError` | HTTP 429 |
| `ProviderUnavailableError` | HTTP 5xx, network error |
| `ProviderTimeoutError` | Timeout |
| `ProviderError` | 403 (no UA), 400, parse error |

## Fallback chain raccomandato (F8 — Sprint 2 settimana 3)

Per geocoding, suggerito:

```bash
FEAPRO_GEOCODING_PROVIDER=open_meteo_geocoding
FEAPRO_GEOCODING_FALLBACK=nominatim
```

Open-Meteo come primary (più rapido, no UA constraint), Nominatim come
fallback per reverse o quando Open-Meteo non ha risultati.

## Test

```bash
# Unit (rapidi, no network)
pytest tests/services/providers/geocoding -v -m "not slow"

# Integration (network reale)
pytest tests/services/providers/geocoding -v -m slow

# Coverage
pytest tests/services/providers/geocoding \
    --cov=services.providers.geocoding --cov-report=term-missing
```

## Roadmap

- **F4.3**: `OpenElevationProvider` + `USGSElevationProvider`
- **F4.4**: `USGSEarthquakeProvider`
- **F6**: `usage_tracker.py` collegato agli stub `_record_call()`
- **F8**: fallback chain orchestrator (registry-based)
- **B1**: `geocoding_service.py` — facade UI-friendly che usa il
  fallback chain
