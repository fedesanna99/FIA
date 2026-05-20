# `services.providers.elevation` — Elevation providers (Sprint 2 — F4.3)

Provider per lookup elevazione sopra l'infrastruttura
`services/{cache,rate_limiter,registry}.py` di Sprint 1.

## API pubblica

```python
from services.providers.elevation import (
    OpenElevationProvider,
    USGSElevationProvider,
    ElevationPoint,
    ElevationResult,
)

# Open-Elevation: worldwide, batch nativo via POST
oe = OpenElevationProvider()
p: ElevationPoint = await oe.lookup(lat=41.9, lon=12.5)
print(p.elevation_m, "m s.l.m.")

# Batch (fino a 1000 punti per richiesta)
result: ElevationResult = await oe.lookup_batch([
    (41.9, 12.5), (45.46, 9.19), (39.21, 9.11),
])

# USGS: US only, alta risoluzione (1-3 m)
usgs = USGSElevationProvider()
p = await usgs.lookup(lat=38.8977, lon=-77.0365)  # Washington DC
# Fuori US -> ProviderError ("no data outside US coverage")
```

## Confronto provider

| Feature | Open-Elevation | USGS EPQS |
|---|---|---|
| Copertura | mondiale | **solo US** (incluso Alaska, Hawaii) |
| Risoluzione | ~30 m (SRTM) | **1-3 m** (NED) |
| Batch nativo | ✅ POST (max 1000) | ❌ (fallback su loop seq) |
| Reliability | mediocre (puo' essere lento/down) | buona |
| Rate limit | 5 rps (bucket `open_elevation`) | 5 rps (bucket `usgs_elevation`) |
| API key | no | no |
| Cache TTL | 10 anni | 10 anni |

## Bucket registration

I bucket `open_elevation` e `usgs_elevation` sono registrati al primo
import del package `services.providers.elevation` (idempotente).
Non serve modificare `services/rate_limiter.py`.

## Fallback chain raccomandato

Per coperture miste US + worldwide:

```bash
FEAPRO_ELEVATION_PROVIDER=usgs_elevation
FEAPRO_ELEVATION_FALLBACK=open_elevation
```

USGS come primary per coordinate US (alta precisione), Open-Elevation
come fallback per il resto del mondo. USGS solleva `ProviderError`
fuori US, l'orchestratore F8 skippa al fallback.

Per uso solo worldwide:

```bash
FEAPRO_ELEVATION_PROVIDER=open_elevation
# nessun fallback
```

## Errori sollevati

Stesso contratto F4.1/F4.2 (riutilizzati da `services.providers.meteo.errors`).

In aggiunta, `USGSElevationProvider` solleva `ProviderError` quando il
valore restituito e' <= -100000 (sentinella USGS per "no data"). Questo
e' il segnale standard del fallback chain.

## Test

```bash
pytest tests/services/providers/elevation -v -m "not slow"  # unit
pytest tests/services/providers/elevation -v -m slow         # integration
pytest tests/services/providers/elevation \
    --cov=services.providers.elevation --cov-report=term-missing
```

## Roadmap

- **F4.4**: `USGSEarthquakeProvider`
- **F6**: `usage_tracker.py` collegato agli stub `_record_call()`
- **F8**: fallback chain orchestrator
- **B2**: `terrain_service.py` — facade UI-friendly + interpolazione mesh
  3D dal dataset SRTM
