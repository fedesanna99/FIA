# `services.providers.meteo` — Open-Meteo providers (Sprint 2 — F4.1)

Provider concreti per dati meteo (forecast + storico ERA5) sopra
l'infrastruttura `services/{cache,rate_limiter,registry}.py` di Sprint 1.

## API pubblica

```python
from services.providers.meteo import (
    OpenMeteoForecastProvider,
    OpenMeteoArchiveProvider,
    ForecastResult,
    WindSnowExtremes,
)

# Forecast 7 giorni
provider = OpenMeteoForecastProvider()  # usa cache + limiter di default
forecast: ForecastResult = await provider.forecast(lat=39.21, lon=9.11, days=7)
for h in forecast.hourly:
    print(h.ts, h.temp_C, h.wind_gust_ms)

# Estremi storici 50 anni (per design loads NTC/EC1)
archive = OpenMeteoArchiveProvider()
extremes: WindSnowExtremes = await archive.historical_extremes(
    lat=42.35, lon=13.40, years=50,
)
print(f"Vento 50y: {extremes.wind_gust_50y_ms:.1f} m/s")
print(f"Neve 50y:  {extremes.snowfall_50y_cm:.1f} cm")
```

## Vincoli operativi

| Provider | Endpoint | Cache TTL | Rate bucket | Timeout |
|---|---|---|---|---|
| Forecast | `https://api.open-meteo.com/v1/forecast` | 6 ore | `open_meteo` (10 rps) | 10 s |
| Archive  | `https://archive-api.open-meteo.com/v1/archive` | 30 giorni | `open_meteo` (10 rps) | 30 s |

- Lat/lon arrotondati a 4 decimali (~10 m) per cache hit stabile.
- Tutti gli output sono in unita' SI: temp °C, wind m/s, neve cm, prec mm.
- Licenza Open-Meteo free tier non-commercial — no API key richiesta.

## Errori sollevati

I provider mappano errori HTTP/network in eccezioni semantiche
per consentire all'orchestratore F8 (fallback chain) di decidere se
ritentare, skippare al provider successivo, o propagare.

| Eccezione | Causa |
|---|---|
| `ProviderRateLimitError` | HTTP 429 |
| `ProviderUnavailableError` | HTTP 5xx, network error |
| `ProviderTimeoutError` | Timeout connessione/lettura |
| `ProviderError` (base) | 4xx ≠ 429, parse error, response non-JSON |

## Stima return period 50 anni (Gumbel Type I)

`OpenMeteoArchiveProvider.historical_extremes()` ritorna sia il massimo
storico osservato sia la stima a 50 anni di tempo di ritorno (design
loads EC1). La stima usa la distribuzione Gumbel Type I con method-of-
moments:

```text
beta = std·sqrt(6)/pi
mu   = mean - gamma·beta      (gamma = costante di Euler-Mascheroni)
x_T  = mu - beta·ln(-ln(1 - 1/T))
```

Riferimenti:
- EN 1991-1-4 §4.2 — wind reference velocity 50y
- Coles "An Introduction to Statistical Modeling of Extreme Values",
  Springer 2001, Ch. 3.3.

Edge cases gestiti:
- campione vuoto → 0
- campione singolo → ritorna il valore
- std = 0 (campione costante) → ritorna media
- quantile negativo → clippato a 0 (variabili fisicamente non-neg.)

## Test

```bash
# Unit test (rapidi, no network)
pytest tests/services/providers/meteo -v

# Integration test (network reale, opt-in)
pytest tests/services/providers/meteo -v -m slow

# Coverage
pytest tests/services/providers/meteo --cov=services.providers.meteo \
    --cov-report=term-missing
```

## Roadmap Sprint 2

- **F4.2**: `OpenMeteoGeocodingProvider` + `NominatimProvider`
- **F4.3**: `OpenElevationProvider` + `USGSElevationProvider`
- **F4.4**: `USGSEarthquakeProvider`
- **F6**: `usage_tracker.py` — sostituisce gli stub `_record_call()`
  con tracking persistente
- **F8**: fallback chain orchestrator (per ogni dominio: primary +
  fallbacks ordinati)
- **B4**: `meteo_loads_service.py` — orchestrator che usa
  `OpenMeteoArchiveProvider` per popolare loads NTC 2018 vento/neve
