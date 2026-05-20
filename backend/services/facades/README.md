# `services.facades` — Service Facade (Sprint 2 piano B)

Le facade sono **UI-friendly orchestrators** sopra `services.orchestrator`
(F8) + `services.providers` (F4) + `services.usage_tracker` (F6).

Traducono dati grezzi del provider in payload pronti per:
- design loads strutturali (EN 1991/NTC 2018) — `MeteoLoadsService`,
  `SeismicLoadsService`
- UX flow (search-by-name + map preview) — `GeocodingService`,
  `TerrainService`

## API & REST endpoint

| Facade | Service API | REST endpoint |
|---|---|---|
| `MeteoLoadsService` | `compute(lat, lon, elevation, years, terrain)` | `POST /api/loads/meteo` |
| `SeismicLoadsService` | `compute(lat, lon, ..., soil, F_0, T_c*, ...)` | `POST /api/loads/seismic` |
| `GeocodingService` | `search(q, count, lang)`, `reverse(lat, lon)`, `find_best(q)` | `GET /api/geocoding/{search,reverse,best}` |
| `TerrainService` | `lookup_points(pts)`, `profile_along_line(...)`, `bbox_statistics(...)` | `POST /api/terrain/{batch,profile,bbox}` |

## Esempi numerici per validazione

### B4 — MeteoLoadsService

**Roma centro (lat=41.9, lon=12.5)** — gust 50y ~35 m/s, snow 50y ~30 cm:

```
v_b,0  ≈ 25 m/s         (gust / 1.4)
q_b    ≈ 0.39 kN/m²     (0.5·ρ_air·v²)
q_p(10m, terr.II) ≈ 0.66 kN/m²
s_k    ≈ 0.59 kN/m²     (ρ_snow=200 · g · h)
s_design ≈ 0.47 kN/m²   (μ_i=0.8 · s_k)
```

### B3 — SeismicLoadsService

**Norcia (lat=42.79, lon=13.10)** — M_max storico 6.5 (sequenza Centro Italia 2016):

```
a_g/g  ≈ 0.16 (GMPE Sabetta-Pugliese 1996, R=20 km)
F_0 = 2.5, T_C* = 0.35 s, η = 1.0 (5% damping)
T_B = 0.117 s, T_C = 0.350 s, T_D = 2.24 s
Plateau S_e = a_g·S·η·F_0 = 0.40 g (soil A)
                        = 0.48 g (soil B, S=1.2)
```

### B1 — GeocodingService

```python
loc = await service.find_best("Cagliari, Italy")
# loc.lat=39.21, loc.lon=9.11, country_code="it"
```

### B2 — TerrainService

```python
# 3 città italiane
profile = await service.lookup_points([(41.9, 12.5), (45.46, 9.19), (39.21, 9.11)])
# profile.stats.elevation_min/max/mean reflect SRTM data
```

## Workflow utente end-to-end (post-UI integration Sprint 2)

```
┌─ user ─┐
│         │ types "Cagliari"
│         ▼
│   B1 search → top hit (39.21, 9.11)
│         ▼
│   B2 batch (1 point) → elevation 7m
│         ▼
│   B3 + B4 in parallelo:
│       wind/snow (EN 1991)
│       seismic spectrum (NTC 2018)
│         ▼
│   Apply → LoadCase nel modello FEA Pro
└─────────┘
```

Workflow REST analog:
```bash
# 1. Search
curl 'http://localhost:8765/api/geocoding/best?q=Cagliari,%20Italy'
# → {"name":"Cagliari","lat":39.21,"lon":9.11,...}

# 2. Meteo loads
curl -X POST http://localhost:8765/api/loads/meteo \
  -H 'Content-Type: application/json' \
  -d '{"lat":39.21,"lon":9.11}'
# → {"wind":{"q_p_z10_kN_m2":0.66,...},"snow":{"s_design_kN_m2":0.47,...}}

# 3. Seismic loads (con soil C)
curl -X POST http://localhost:8765/api/loads/seismic \
  -H 'Content-Type: application/json' \
  -d '{"lat":39.21,"lon":9.11,"soil_category":"C"}'
# → {"site_params":{"a_g_over_g":0.045,"S":1.5,...},"spectrum":[...]}
```

## Architettura

```
┌──────────────────────────────────────────────────────┐
│  Facade B1/B2/B3/B4                                   │
│  (services.facades.*)                                 │
└──────────────────────────────────────────────────────┘
                       │
                       ▼ orchestrator.call(domain, method, **kwargs)
┌──────────────────────────────────────────────────────┐
│  F8 ServiceOrchestrator                               │
│  - fallback chain: primary → fallback (env var CSV)  │
│  - retry semantics: 5xx/timeout/429/NotImplemented   │
└──────────────────────────────────────────────────────┘
                       │
                       ▼ getattr(provider, method)(*args, **kwargs)
┌──────────────────────────────────────────────────────┐
│  F4 Provider concreti (8)                             │
│  meteo: open_meteo_forecast/archive                  │
│  geocoding: open_meteo_geocoding, nominatim          │
│  elevation: open_elevation, usgs_elevation           │
│  seismic: usgs_earthquake                            │
└──────────────────────────────────────────────────────┘
                       │
                       ▼ tracker.record(...)
┌──────────────────────────────────────────────────────┐
│  F6 UsageTracker (SQLite)                             │
│  GET /api/providers/usage/{summary,timeline,health}  │
└──────────────────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────┐
│  F1/F2/F3 (Sprint 1)                                  │
│  registry singleton + ServiceCache (SQLite TTL)      │
│  + TokenBucket rate_limiter                          │
└──────────────────────────────────────────────────────┘
```

## Test

```bash
# Facade specifici
pytest tests/services/facades -v

# Endpoint REST
pytest tests/api/test_{loads,loads_seismic,geocoding,terrain}_endpoint.py -v

# Coverage targetata
pytest tests/services/facades tests/api/test_loads* \
       tests/api/test_geocoding* tests/api/test_terrain* \
  --cov=services.facades --cov=api.routes.loads \
  --cov=api.routes.geocoding --cov=api.routes.terrain \
  --cov-report=term-missing
```

## Note operative

- **Niente caching custom nelle facade**: la cache vive nei provider F4
  (dominio-specific TTL gia' configurato in `services/cache.py`).
- **Niente rate-limiting custom**: il limiter F3 viene chiamato dai
  provider F4 prima di ogni request HTTP.
- **Observability automatica**: ogni call di un provider sotto la
  facade viene tracciata dal singleton `tracker` (F6) — niente codice
  custom necessario nelle facade.
- **Validation lato endpoint**: i `Field(...)` con `ge`/`le` di Pydantic
  v2 producono 422 automatici. Le facade aggiungono validation di
  business (es. `terrain_category="II"` only in v1.3).

## Roadmap upgrade (v1.4+)

- **B3**: integrare tabella ufficiale NTC 2018 (reticolo 10751 nodi)
  per ottenere a_g vero (non stimato via GMPE).
- **B4**: zone NTC vento + altitude-dependent s_k Alpine/Mediterraneo.
- **B2**: triangolazione Delaunay + interpolazione baricentrica per
  mesh non-uniformi (al posto del semplice lookup grid).
- **B1**: autocomplete con debouncing client-side (300 ms) per UX
  reactive (vedi `LocationPickerDialog`).
