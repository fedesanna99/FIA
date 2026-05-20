# `services.providers.seismic` — Seismic catalog providers (Sprint 2 — F4.4)

Provider per catalogo eventi sismici sopra l'infrastruttura
`services/{cache,rate_limiter,registry}.py` di Sprint 1.

## API pubblica

```python
from services.providers.seismic import (
    USGSEarthquakeProvider,
    Earthquake,
    EarthquakeResult,
)

provider = USGSEarthquakeProvider()

# Search nearby: eventi entro 50 km da Norcia con Mw>=5 negli ultimi 20 anni
result: EarthquakeResult = await provider.search_nearby(
    lat=42.79, lon=13.10,
    max_radius_km=50,
    years_back=20,
    min_magnitude=5.0,
)
for eq in result.earthquakes:
    print(eq.time_iso, "Mw", eq.magnitude, eq.place, f"depth={eq.depth_km}km")

# Magnitudo massima storica (per assessment NTC 2018 a_g)
m_max = await provider.historical_max_magnitude(
    lat=42.79, lon=13.10,
    max_radius_km=100,
    years_back=100,
)
print(f"M_max storico 100 anni: {m_max:.1f}")
```

## Vincoli operativi

| Spec | Valore |
|---|---|
| Endpoint | `https://earthquake.usgs.gov/fdsnws/event/1/query` |
| Formato | GeoJSON |
| Rate bucket | `usgs_earthquake` (0.5 rps, pre-registrato in F3) |
| Cache TTL | 7 giorni (dominio "seismic") |
| Timeout HTTP | 30 s |
| Limit max | 20000 eventi per request |
| API key | no |

## Output Earthquake

```python
class Earthquake(BaseModel):
    id: str               # ID USGS (es. "us10007h7r")
    time_iso: str         # ISO8601 UTC con millisecondi
    lat: float
    lon: float
    depth_km: float       # profondita' ipocentro
    magnitude: float      # Mw preferenziale
    place: str            # "10 km NE of Norcia, Italy"
    event_type: str       # "earthquake" | "explosion" | ...
    url: str | None       # link a pagina USGS
    source: str = "usgs_earthquake"
```

## Use cases — strutturale

- **NTC 2018 / EC8 seismic design**: leggere M_max storico per validare
  che il sito non sia in zona ad alta sismicita' rispetto ai parametri
  di catalogo (a_g, F_0, T_c*).
- **PGA estimation**: integrare con leggi di attenuazione (GMPE)
  ground-motion per stimare PGA al sito da M e distanza.
- **Risk assessment**: cluster eventi recenti per allerta su attivita'
  in corso.
- **Education / what-if**: simulare lo storico sismico vicino a una
  location per studenti / valutazioni preliminari.

## Cache key

Stessa query (lat/lon/radius/years/min_mag/limit) → cache hit.
Cambio anche minimo di un parametro → nuova call HTTP.

Esempio:
```
usgs_earthquake:search:42.7900:13.1000:50:20:5.0:1000
```

`historical_max_magnitude` riusa internamente `search_nearby` con
`min_magnitude=0`, `limit=20000` — quindi la stessa lat/lon/radius/years
viene cachato condiviso tra le due API.

## Errori

Stesso contratto F4.1+ (riutilizzati da `services.providers.meteo.errors`).

USGS e' generalmente molto affidabile; il 5xx capita di rado e
tipicamente durante manutenzione settimanale.

## Test

```bash
pytest tests/services/providers/seismic -v -m "not slow"  # unit (23)
pytest tests/services/providers/seismic -v -m slow        # integration (4)
```

## Roadmap

- **B3**: `seismic_loads_service.py` — calcola a_g (NTC 2018 zone) +
  M_max storico per il sito, output pronto per EC8 spectrum solver
- **F6**: `usage_tracker.py` collegato agli stub `_record_call()`
- **F8**: fallback chain orchestrator (anche se per "seismic" USGS e'
  l'unico provider — il fallback chain rimane no-op per ora)
