# Changelog FEA Pro

## [Unreleased] — Sprint 2

### Added
- **F8: ServiceOrchestrator + fallback chain** (Sprint 2)
  - **`services/orchestrator.py`**: orchestratore async generico che
    legge la fallback chain dal `ProviderRegistry` (env var
    `FEAPRO_<DOMAIN>_PROVIDER` + `FEAPRO_<DOMAIN>_FALLBACK=csv`) e
    delega al primo provider che ha successo.
  - **API**: `orchestrator.call(domain, method, *args, **kwargs)` ←
    chiamata via `getattr(provider, method)(*args, **kwargs)`,
    type-generic; `orchestrator.call_by_name(domain, provider_name,
    method, ...)` bypassa la chain per uso esplicito;
    `orchestrator.get_chain(domain)` introspezione.
  - **Eccezioni retryable** (skip al next provider):
    `ProviderUnavailableError`, `ProviderTimeoutError`,
    `ProviderRateLimitError`, `NotImplementedError`, provider senza
    il metodo richiesto (AttributeError gestito internamente).
  - **Eccezioni non-retryable** (propaga subito): `ValueError`,
    `ProviderError` con status 4xx (es. 400 bad request), altre.
  - **`AllProvidersFailedError`** (extends `ProviderUnavailableError`):
    sollevata quando tutti i provider della chain hanno fallito.
    Attributo `.attempts: list[(name, exception)]` con la cronologia
    completa dei tentativi.
  - **`services/providers/registration.py`**: helper `register_all()`
    che registra tutti i provider F4 (8 totali su 4 domini) nel
    registry singleton. Ordine di registrazione fissa la "default
    chain" (primo = primary):
      - meteo: open_meteo_forecast > open_meteo_archive
      - geocoding: open_meteo_geocoding > nominatim
      - elevation: open_elevation > usgs_elevation
      - seismic: usgs_earthquake (unico)

### Tests
- **+24 unit test** `tests/services/test_orchestrator.py`:
  - Base: primary ok, fallback su unavailable/timeout/rate_limit/
    NotImplementedError, propaga ValueError, propaga ProviderError 400,
    AllProvidersFailedError con cronologia completa, provider senza
    metodo, unknown domain KeyError.
  - call_by_name: bypass chain, unknown provider KeyError, method
    missing AttributeError, propaga errori (no skip).
  - get_chain: chain di default + env var fallback CSV, empty per
    unknown domain.
  - register_all: popola 4 domini (8 provider), ritorna registry,
    funziona col singleton globale.
  - E2E con tracker: provider reale (MockTransport) + orchestrator +
    tracker singleton enabled → record presente dopo call.
  - AllProvidersFailedError: message format, inheritance da
    ProviderUnavailableError (chain-able), singleton existence.

### Gate
| Gate | F6 | **F8** |
|---|---|---|
| pytest backend (no-slow) | 1117 | **1141** (+24) |
| F8 modules coverage | — | **100% + 100%** |
| mypy --strict | clean | clean |

### Note operative
- **Pattern uso B1-B4**: i futuri service facade (`geocoding_service`,
  `meteo_loads_service`, ...) chiameranno `orchestrator.call(...)`
  invece di gestire manualmente la fallback chain.
- **`call_by_name`**: utile per UI admin "test connection" che
  voglia testare un provider specifico bypass-and-the chain.
- **Tracker F6 + Orchestrator F8 integrati**: ogni call sotto
  l'orchestrator viene tracciata individualmente dal provider; se
  fallback viene attivato, il tracker registra 2 righe (1 error +
  1 ok) per la stessa logical operation. La distinzione orchestrator-
  level "quale provider e' stato scelto alla fine" e' lasciata ai
  log (logger.info) — non aggiunge righe al tracker.

---

### Added
- **F6: provider usage_tracker** (Sprint 2)
  - **`services/usage_tracker.py`**: tracker SQLite per ogni call ai
    provider F4. Tabella `provider_usage(id, ts, domain, provider,
    endpoint, status, latency_ms, cached, user_id)` con indici su `ts`,
    `(domain, provider, ts)`, `user_id`. Mode WAL, thread-safe.
  - **API tracker**: `record()` fire-and-forget (errori silenziati,
    observability non rompe path produttivo); `aggregate(domain, provider,
    endpoint, user_id, since_ts, until_ts)` → `list[ProviderUsageStats]`
    con cache_hit_ratio + error_ratio + avg/total latency; `timeline()`
    per bin hour/day/week.
  - **`set_enabled(bool)`** + env var `FEAPRO_USAGE_TRACKER_DISABLED=1`
    per controllo lifecycle. Conftest backend disabilita il singleton
    di default in test (evita pollution `.cache/usage.sqlite`).
  - **Wiring providers**: i 9 stub `_record_call()` accumulati in F4.1-
    F4.4 ora chiamano realmente `tracker.record(...)`. Pattern uniforme
    su 7 provider (open_meteo_forecast/archive, open_meteo_geocoding,
    nominatim, open_elevation, usgs_elevation, usgs_earthquake).
  - **REST endpoint** `/api/providers/usage/*`:
    - `GET /summary?domain&provider&endpoint&user_id&window_days` →
      aggregato + totals (cache_hit_ratio, error_ratio)
    - `GET /timeline?granularity={hour,day,week}&...` → bins per chart
    - `GET /health` → totale record + breakdown per domain
  - Prefisso `/api/providers/usage/` (non `/api/usage/providers/`) per
    evitare collisione con `/api/usage/{user_id}/summary` (Sprint 1).

### Tests
- **+46 unit/integration test**:
  - `tests/services/test_usage_tracker.py` (24 test): record + aggregate
    + filtri (domain/provider/endpoint/user_id/time-window), error
    status counting, disabled tracker no-op, set_enabled toggle, record
    silently swallows exceptions, timeline (hour/day/week + filtri +
    invalid granularity), health (empty + populated), clear, to_dict
    serialization, singleton disabled in tests.
  - `tests/services/test_provider_tracker_wiring.py` (10 test): verifica
    che ognuno dei 7 provider F4 chiami effettivamente il tracker via
    `_record_call`. Test error_status_recorded_correctly (5xx →
    `n_errors`++) + disabled_tracker_doesnt_record_via_provider.
  - `tests/api/test_providers_usage_endpoint.py` (11 test): summary
    no-filter + per domain/provider/endpoint, combined filters,
    window_days validation 422, timeline by granularity + invalid 422,
    health endpoint, empty DB zero totals.

### Gate
| Gate | F4.4 | **F6** |
|---|---|---|
| pytest (no-cov, no-slow) | 1071 | **1117** (+46) |
| F6 modules coverage | — | `usage_tracker.py` 95%, `providers_usage.py` 100% |
| mypy --strict | clean | clean |

### Note operative
- **Pattern provider invariato**: ognuno dei 7 provider F4 ha lo stesso
  `_record_call` body — 3 righe di chiamata `tracker.record(...)`.
  Refactoring futuro: spostare in metodo base `services.base.Provider`
  per evitare duplicazione.
- **Conftest backend** modificato: disabilita il SINGLETON tracker
  (non setta env var) cosi' nuove istanze `UsageTracker(db_path=tmp)`
  restano enabled by default per test isolati.
- **Hook `with_global_tracker` fixture**: pattern per test che vogliono
  verificare il singleton — temp swap db_path + clear + set_enabled,
  ripristino in teardown.
- **F6 sblocca**: dashboard frontend di osservabilita' (futuro), billing
  per-user piu' accurato, alerting su cache_hit_ratio basso o
  error_ratio alto (futuro).

---

### Added
- **F4.4: USGSEarthquakeProvider** (Sprint 2)
  - Implementa `SeismicProvider` ABC (dominio `seismic`) sopra
    `services.base.Provider`. Catalogo USGS FDSN Earthquake event API.
  - **`search_nearby(lat, lon, max_radius_km, years_back, min_magnitude, limit)`**
    → `EarthquakeResult`: eventi entro raggio km dalla location nel
    periodo richiesto, ordinati per tempo decrescente, magnitudo
    filtrabile. Output con `Earthquake` strutturati (id, time_iso,
    lat/lon, depth_km, magnitude, place, event_type, url).
  - **`historical_max_magnitude(lat, lon, max_radius_km, years_back)`**
    → float: magnitudo massima storica, comodita' per NTC/EC8 site
    assessment. Riutilizza la cache di `search_nearby` (stessa chiave
    se lat/lon/radius/years coincidono).
  - GeoJSON parsing tollerante: feature senza magnitude/url/time, con
    coords 2D (no depth) sono gestite senza crash (skip o default).
  - Cache TTL 7 giorni (`DEFAULT_TTL["seismic"]` Sprint 1 F2).
  - Rate bucket `usgs_earthquake` 0.5 rps (pre-registrato Sprint 1 F3).
  - Hook `_record_call()` stub per F6.

### Tests
- **+23 unit test** `tests/services/providers/seismic/`:
  - `test_usgs_earthquake.py`: parse Norcia 2016 fixture (Mw 6.5+6.2+...),
    cache hit + params completi nella key, empty/malformed features
    skip, 429/500/400/timeout error mapping, usage hook, corrupt cache
    fallback con payload pydantic-invalid (earthquakes="not-a-list"),
    invalid args (radius<=0, years_back range, min_mag range, limit
    range), historical_max_magnitude basic + empty + cache-reuse,
    health ok/down/timeout/degraded, classvars, feature senza url/time,
    coords 2D = depth 0.
- **+4 integration test** `test_seismic_integration.py` (`@pytest.mark.slow`):
  - Norcia 2016 sequence (M>=5 entro 50km/15y, attesi >=2 eventi)
  - Tokyo 500km/20y → M_max >= 7.5 (Tohoku 2011 9.0)
  - Sahara 100km/10y M>=4 → <20 eventi (zona quasi asismica)
  - Cache hit reale su 2 chiamate identiche

### Gate
| Gate | F4.1 | F4.2 | F4.3 | F4.4 |
|---|---|---|---|---|
| pytest (no-cov, no-slow) | 964 | 1011 | 1048 | **1071** (+23) |
| Module coverage | 93% | 92.1% | 90.6% | **91.1%** |
| mypy --strict | clean | clean | clean | **clean** |
| Slow integration | 8 | 15 | 21 | **25** (+4) |

### Note operative
- USGS Earthquake unico provider per dominio `seismic` (no fallback
  chain per ora). Architettura comunque pronta: aggiungere INGV
  Earthquake Catalog API (Italia, piu' dettagliato per piccoli M<3.5)
  sara' uno step opzionale futuro.
- Pattern `historical_*` che riusa cache di `search_*` testato come
  funzionante: ottimizzazione importante per workflow "assessment +
  visualizzazione lista eventi" sulla stessa UI page.

---

### Added
- **F4.3: OpenElevationProvider + USGSElevationProvider** (Sprint 2)
  - Implementa `ElevationProvider` ABC (dominio `elevation`) sopra il
    Provider abstraction Sprint 1. Riutilizza il modulo errori F4.1.
  - **`OpenElevationProvider`**: worldwide, endpoint
    `https://api.open-elevation.com/api/v1/lookup`. Cache TTL 10 anni,
    rate limit 5 rps bucket `open_elevation`. **Batch nativo** via POST
    JSON `{locations: [...]}` (max 1000 punti). Cache batch per-punto
    (riusa cache hit individuali → solo i mancanti vengono fetchati).
  - **`USGSElevationProvider`**: solo US, alta risoluzione (1-3 m NED),
    endpoint `https://epqs.nationalmap.gov/v1/json`. Cache TTL 10 anni,
    rate limit 5 rps bucket `usgs_elevation`. No batch nativo →
    fallback su loop sequenziale. Soglia "no data" `value <= -100000`
    convertita in `ProviderError` per consentire fallback chain F8.
  - Bucket `open_elevation` + `usgs_elevation` auto-registrati al
    primo import del package (idempotente, no modifiche a Sprint 1).
  - Cache key lat/lon a 5° decimale (~1 m) per cache hit stabile.
  - Hook `_record_call()` per F6 (lookup + lookup_batch + cache_hit).

### Tests
- **+37 unit test** `tests/services/providers/elevation/`:
  - `test_open_elevation.py` (20 test): single lookup parse Roma,
    cache hit + round 5° decimale, empty results, 429/500/timeout,
    usage hook, corrupt cache fallback. **Batch**: 3 punti parse, cache
    per-punto (prepop + fetch parziale), batch empty/too-large,
    truncated response. Health ok/down/timeout/degraded.
  - `test_usgs_elevation.py` (17 test): parse DC, cache, outside-US
    → ProviderError, malformed/non-numeric value, 429/500/timeout,
    usage hook, corrupt cache, batch via default loop seq, health,
    location field snap-to-grid.
- **+6 integration test** `test_elevation_integration.py` (`@pytest.mark.slow`):
  Open-Elevation Roma/Monte Bianco/batch 3 punti italiani, USGS
  Washington DC/Denver alta quota, USGS Roma (fuori US) → ProviderError.

### Gate
| Gate | F4.1 | F4.2 | F4.3 |
|---|---|---|---|
| pytest (no-cov, no-slow) | 964 | 1011 | **1048** (+37) |
| Module coverage | 93% | 92.1% | **90.6%** |
| mypy --strict | clean | clean | **clean** |
| Slow integration | 8 | 15 | **21** (+6) |

### Note operative
- Bucket registration at-import-time pattern: il package
  `services.providers.elevation/__init__.py` registra `open_elevation`
  + `usgs_elevation` idempotentemente. Pattern riutilizzabile per F4.4
  (USGS earthquake ha gia' bucket pre-registrato in Sprint 1).
- `lookup_batch` con cache per-punto: per N punti dove K sono gia' in
  cache, fa 1 HTTP call per N-K punti (anziche' N call separate).
  Importante per workflow "interpolate mesh quota su SRTM".

---

### Added
- **F4.2: OpenMeteoGeocodingProvider + NominatimProvider** (Sprint 2)
  - Implementa `GeocodingProvider` ABC (dominio `geocoding`) sopra il
    Provider abstraction Sprint 1. Riutilizza il modulo errori F4.1.
  - **`OpenMeteoGeocodingProvider`**: forward search only (no reverse —
    solleva `NotImplementedError`), endpoint
    `https://geocoding-api.open-meteo.com/v1/search`. Cache TTL 1 anno
    (location stabili), rate limit 10 rps bucket condiviso `open_meteo`,
    no API key.
  - **`NominatimProvider`**: forward search + reverse geocoding,
    endpoint `https://nominatim.openstreetmap.org/{search,reverse}`.
    Cache TTL 1 anno, rate limit **1 rps strict** bucket `nominatim`,
    User-Agent identificativo obbligatorio (default
    `FEA-Pro/1.3 (...)`, override via env `FEAPRO_NOMINATIM_USER_AGENT`).
  - Cache key search case-insensitive (`query.lower()`), include
    `count` e `language`. Reverse key con lat/lon a 5° decimale (~1 m).
  - Hook `_record_call()` stub per F6 (forward + reverse + cache_hit).

### Tests
- **+47 unit test** `tests/services/providers/geocoding/`:
  - `test_open_meteo_geocoding.py` (19 test): parse Rome multi-result,
    cache hit + case-insensitive, empty results, 429/500/400/timeout
    error mapping, usage hook, invalid args, reverse NotImplemented,
    health ok/down/degraded/timeout, corrupt cache fallback, parse
    malformed skip, `_safe_int`/`_safe_float_opt` helpers, country_code
    None safe.
  - `test_nominatim.py` (28 test): parse Cagliari, cache search +
    reverse, User-Agent custom + env + default, 429/500/403/timeout,
    non-list response, invalid args, reverse not-found, routed transport
    search+reverse insieme, corrupt cache fallback (search + reverse),
    reverse timeout/usage hook, health unexpected status degraded,
    parse skip malformed entries, classvars match spec.
- **+7 integration test** `test_geocoding_integration.py` (`@pytest.mark.slow`):
  Open-Meteo Cagliari/Tokyo/no-results, Nominatim Cagliari/reverse
  Cagliari/ocean reverse, rate limit 1 rps su 3 query.

### Gate
| Gate | F4.1 | F4.2 |
|---|---|---|
| pytest (no-cov, no-slow) | 964 | **1011** (+47) |
| Module coverage | 93% | **92.1%** |
| mypy --strict | clean | clean |
| Slow integration | 8 collected | 15 collected (8+7) |

### Note operative
- Bucket `nominatim` (1 rps) era gia' pre-registrato in F3 — pronto
  per uso senza modifiche al limiter.
- Dominio cache `"geocoding"` ha TTL default 1 anno gia' configurato
  in `services/cache.py:DEFAULT_TTL`.
- Pattern provider identico a F4.1 (cache hit → rate_limit → fetch →
  parse → cache set → return; corrupt cache fallback; usage hook).

---

### Added
- **F4.1: OpenMeteoForecastProvider + OpenMeteoArchiveProvider** (Sprint 2)
  - Implementa `MeteoProvider` ABC sopra `Provider` (Sprint 1 F1/F2/F3).
  - **`OpenMeteoForecastProvider`**: previsioni 16 giorni, endpoint
    `https://api.open-meteo.com/v1/forecast`. Cache TTL 6h, rate limit
    10 rps su bucket condiviso `open_meteo`, timeout 10s. Output:
    `ForecastResult` con lista `HourlyEntry`.
  - **`OpenMeteoArchiveProvider`**: estremi storici ERA5 dal 1940
    (≤85 anni), endpoint `https://archive-api.open-meteo.com/v1/archive`.
    Cache TTL 30 giorni, stesso bucket rate limit, timeout 30s. Output:
    `WindSnowExtremes` con max assoluto + return period 50 anni stimato
    via **Gumbel Type I** (method-of-moments, formula EN 1991-1-4 §4.2).
  - Error mapping: 429 → `ProviderRateLimitError`, 5xx →
    `ProviderUnavailableError`, timeout → `ProviderTimeoutError`,
    altri 4xx + parse error → `ProviderError`.
  - Hook stub `_record_call()` per F6 `usage_tracker` (settimana 3).
  - Cache key: lat/lon arrotondati a 4 decimali (~10 m, sufficiente
    per cache hit stabile su input GUI imprecisi).
  - Licenza Open-Meteo free tier non-commercial, no API key richiesta.
- **Helper Gumbel** `_gumbel_return_period.py`: funzione pura riusabile,
  `gumbel_return_period(annual_maxima, T=50)` + helper
  `annual_maxima_from_daily(dates, values)` per pipeline ERA5 → estremi.
  Edge cases: campione vuoto/singolo/costante, T≤1 ValueError,
  quantile clippato a 0 per variabili fisicamente non-negative.

### Tests
- **+48 unit test** `tests/services/providers/meteo/`:
  - `test_gumbel_return_period.py` (14 test): dataset noto MoM, monotonicita',
    edge cases (empty/single/constant/None/clip), `annual_maxima_from_daily`.
  - `test_open_meteo_forecast.py` (17 test): parse, cache hit/key
    rounding/corrupt-fallback, 429/500/503/400/timeout error mapping,
    usage hook, days validation, health_check ok/down/timeout, abstract
    `health()` wrapper.
  - `test_open_meteo_archive.py` (17 test): parse, cache, errori,
    Gumbel 50y, no-snowfall location, invalid years, empty daily safe,
    `get_archive` raw access, health_check.
- **+8 integration test** `test_open_meteo_integration.py` (`@pytest.mark.slow`,
  skippati di default): forecast Cagliari/Roma reali, archive 50y Cagliari/
  L'Aquila/Roma con sanity range (wind 20-60 m/s Cagliari, snow >10 cm
  L'Aquila, snow <50 cm Roma), rate limit throttling oltre capacity 20,
  cache hit reale.

### Fixed
- `services/base.py:__init_subclass__` annotata con `**kwargs: Any -> None`
  per consentire `mypy --strict` clean sui nuovi provider (1-line type-only
  fix, zero impatto runtime).

### Gate
| Gate | alpha.4 | Sprint 2 F4.1 |
|---|---|---|
| pytest (no-cov, no-slow) | 916 | **964** (+48) |
| F4.1 module coverage | — | **~93%** (target ≥90%) |
| mypy --strict (F4.1 files) | — | **clean** |
| vitest | 96 | 96 |
| tsc / build | OK | OK |

### Note operative
- **`pytest-httpx` NON aggiunta** alle dipendenze: usiamo
  `httpx.MockTransport` nativo (zero nuove dep, compat 100% con httpx 0.28).
- **Provider ABC quirk**: `Provider.__init_subclass__` controlla
  `__abstractmethods__` ma `ABCMeta` lo popola DOPO. Workaround in
  `MeteoProvider`: dichiariamo `name = "_abstract"` come placeholder
  (la classe e' comunque non istanziabile, e nessuno la registra).
- **No automatic fallback** dentro i provider: il fallback chain F8 vive
  a livello orchestratore. I provider sollevano l'eccezione semantica
  giusta e l'orchestratore decide.

---

## v1.3.0-alpha.4 — UX gap fill: AccountDialog + validation link — 2026-05-20

Chiusura dei 5 gap UI/UX identificati nell'audit post-Sprint 1: gli endpoint
backend `/api/usage`, `/api/quotas/{tier,reset,bonus}`, `/api/validation/report`
erano disponibili ma non raggiungibili dall'interfaccia utente.

### Frontend
- **`api/usage/index.ts`**: client REST per `GET /api/usage/{user_id}/summary`
  + `POST /api/quotas/{user_id}/{reset,bonus}` (chiude GAP 1, 2, 3).
- **`components/dialogs/AccountDialog.tsx`**: nuovo dialog con 3 tab
  - **Usage**: tabella aggregata job by solver / status, finestra temporale
    selezionabile (7/30/90/365 giorni).
  - **Tier**: cambio piano `free/starter/pro/enterprise` con preview cap
    (chiude GAP 4 — `setQuotaTier` ora effettivamente bindato a UI).
  - **Admin**: reset mese + bonus credits (azioni admin / mock per v1.3).
  - Footer: link "View system validation report" a `/api/validation/report`
    (chiude GAP 5).
- **TopBar**: nuovo bottone "Account" (icona User) tra Run e Export
  che apre `AccountDialog`.

### Test
- **+6 test** `AccountDialog.test.tsx`: tabs Usage / Tier / Admin,
  validation report link, mutation calls (setQuotaTier, resetQuota,
  addQuotaBonus), window selector.

### Verificato in preview
- TopBar `[data-testid="topbar-account"]` apre il dialog
- Usage tab fetcha live `/api/usage/demo_user/summary?window_days=30`
  e mostra 132 job (linear 129, pushover 2, nonlinear 1) con 0.84 crediti
- Validation link href `/api/validation/report` (apre in new tab)

### Gate
| Gate | alpha.3 | alpha.4 |
|---|---|---|
| pytest (no-cov) | 916 | **916** |
| vitest | 90 | **96** (+6) |
| tsc | 0 | 0 |
| vite build | OK | OK |

### Backend / orfani pre-Sprint 1
L'audit non ha rilevato endpoint legacy v1.2 orfani: tutti i path
`analysis/`, `verify/`, `io/`, `ai/`, `materials/` sono consumati dai
panel esistenti.

---

## v1.3.0-alpha.3 — Test depth + coverage uplift — 2026-05-20

Polish post-migration: amplia drasticamente la suite di test per dare
confidenza piena su tutti i nuovi sottosistemi Sprint 1.

### Tests
- **+15 test** `tests/jobs/test_worker_edge_cases.py`: copertura
  `jobs/worker.py` 75% → 87%. Esercita `_serialize_result` (None / dict
  / dataclass / pydantic v1 / v2 / primitive), failure paths
  (`model_not_found`, `solver_not_dispatched`, quota_exceeded), worker
  lifecycle (start/stop loop), `build_default_dispatcher`, `get_worker`
  singleton.
- **+29 test** `tests/test_deep_e2e_sprint1.py`: deep integration suite
  in 9 sezioni (API contract, quota lifecycle, priority+retry,
  concorrenza multi-thread, failure injection, invariant
  audit↔DB↔usage↔quota, validation report HTML/JSON parity, cost
  estimator monotonicity con **hypothesis** property-based, full E2E
  smoke catena estimate→quota→submit→worker→result→audit).
- **+16 test** `tests/services/test_registry_edge_cases.py`: copertura
  `services/registry.py` 82% → 97%, `services/base.py` 82% → 94%.
  Esercita `register` con istanza/classe, `get_by_name`, fallback
  chain con env CSV malformato, `health_all` con provider exception /
  already-running loop / empty registry, `clear()`.
- **+4 test** `frontend/src/hooks/useJobRun.test.tsx`: WS job_done →
  onSuccess, WS job_failed → onError, polling fallback quando WS muto,
  filtro job_id (eventi di altri job ignorati).

### Coverage
| Modulo | Sprint 1 alpha.2 | alpha.3 |
|---|---|---|
| `services/base.py` | 82% | **94%** |
| `services/registry.py` | 82% | **97%** |
| `jobs/worker.py` | 75% | **87%** |
| TOTAL backend | 90% | **90%** (preservato) |

### Gate
| Gate | alpha.2 | alpha.3 |
|---|---|---|
| pytest (no-cov) | 856 | **916** (+60) |
| pytest (cov) | 849+7skip | **909+7skip** (+60) |
| vitest | 86 | **90** (+4) |
| tsc / build | OK | OK |

### Coverage env
- `pytest.ini`: `--cov` ora misura `billing,services,jobs,validation`
  oltre a `core`.
- Calibration test auto-skip sotto coverage instrumentation (rumore
  sui tempi rende non-deterministico il check ±30%).

---

## v1.3.0-alpha.2 — Sprint 1 polish — 2026-05-20

Completamento della DoD A5 (migrazione effettiva dei 4 endpoint long-running
alla JobQueue) + integrazione UI completa della queue + LE1 mesh refined.

### Frontend
- **hooks/useJobRun.ts**: wrappa POST `/api/jobs` + WS wait + GET result in
  un'interfaccia mutation-like, con polling 1s fallback e timeout 5min.
- **PushoverPanel, NonlinearPanel, ArcLengthPanel, SeismicTHPanel** migrati
  da `analysisExtApi.{solver}` (sync) a `useJobRun` (async via JobQueue).
  Stesso flusso UX: CostPreviewDialog → Procedi → progress → risultato.
- **JobsPanel** ora **tab dedicato in AnalysisWorkspace** (8° tab, icona
  ListChecks) con polling REST 15s + WebSocket `/ws/jobs/{user_id}` per
  update real-time. Badge `live/offline` + ultimo evento visibili.
- **api/jobs/index.ts**: aggiunto `openJobsSocket(userId, onEvent)` helper
  + tipo `JobEvent`.
- Test vitest panel aggiornati con mock `submitJob` + stub `useJobRun`.

### Backend
- **validation/benchmarks.py**: LE1 mesh raddoppiata 8x8 → 24x24 (576 elem),
  tolleranza ridotta da 400% a 100% (errore tipico ~49%).
- Tutti i 5 benchmark passano (cantilever, simply supported, NAFEMS LE2,
  Euler buckling, NAFEMS LE1).

### Smoke E2E verificato
- Pushover via JobQueue: POST `/api/jobs` → WS `job_done` arriva in real-time
  → GET `/api/jobs/{id}/result` ritorna PushoverResults (55 step, 6
  cerniere, lambda_collapse=2.750 sul ponte strallato).
- Nonlinear via JobQueue: 10 step convergenti, max|u|=6.29e-2 m, 507ms.
- JobsPanel: badge `live` quando WS connesso, riga submitted appare
  immediatamente via WS evento `job_done`.

### Gate
| Gate | v1.3.0-alpha.1 | v1.3.0-alpha.2 |
|---|---|---|
| pytest backend | 856 | **856** |
| vitest frontend | 86 | **86** |
| tsc | 0 errori | **0 errori** |
| vite build | OK | **OK** |
| Validation report | 5/5 (LE1 tol 400%) | **5/5 (LE1 tol 100%)** |

---

## v1.3.0-alpha.1 — Sprint 1 (closed) — 2026-05-20

Foundations per la monetizzazione (cost estimator, job metering, quote,
queue persistente) + scaffolding services layer + completamento gap NAFEMS BL-6.

### Backend
- **A1 — cost_estimator**: `billing/cost_estimator.py` con dispatcher per 10
  SolverKind (`linear`, `modal`, `buckling`, `pushover`, `response_spectrum`,
  `dynamic_th`, `seismic_th`, `nonlinear`, `arclength`, `winkler`). Power-law
  tarata `cpu_min ~ alpha * n_dof^beta * mult` calibrata entro +-30% sui modelli
  demo. Endpoint `POST /api/billing/estimate`.
- **A2 — JobMeter**: context manager `measure_job(...)` con tracking di
  wall-time / CPU-time / RAM peak (cross-platform via `tracemalloc`). Append
  JSONL atomico thread-safe in `audit/jobs.jsonl`. Endpoint
  `GET /api/usage/{user_id}/summary` con aggregazioni per solver/status.
- **F1 — Provider registry**: `services/base.py` + `services/registry.py`
  con singleton process-wide, selezione provider via env var
  `FEAPRO_<DOMAIN>_PROVIDER` + fallback chain
  `FEAPRO_<DOMAIN>_FALLBACK=csv,list`. Zero provider concreti in Sprint 1
  (Sprint 2 sblocco).
- **F2 — SQLite TTL cache**: `services/cache.py` con WAL journal, TTL
  default per dominio, override via `FEAPRO_CACHE_TTL_<DOMAIN>=<seconds>`,
  helper `cache_key(...)`.
- **F3 — Token bucket rate limiter**: `services/rate_limiter.py` con
  `with_backoff()` per retry esponenziale su 429/5xx. 3 bucket pre-registrati
  (`nominatim 1 rps`, `usgs_earthquake 0.5 rps`, `open_meteo 10 rps`).
- **A3 — Quota system**: `billing/quotas.py` con JSON persistence, auto-reset
  al cambio mese UTC, RLock thread-safe. Middleware `check_quota_for_solve`
  -> HTTPException 402 strutturata. Endpoint admin `GET|POST /api/quotas`.
- **A5 — Persistent JobQueue**: `jobs/store.py` (SQLite) + `jobs/worker.py`
  async + `api/routes/jobs.py` REST + WS `/ws/jobs/{user_id}` per eventi
  `job_queued|started|progress|done|failed|retry`. Worker avviato/fermato via
  `@app.on_event("startup"/"shutdown")`. Dispatcher copre tutti gli 8 solver.
- **D1 — NAFEMS LE1/LE2/LE10**: `tests/nafems/` con 9 test (LE1 Q4/Tri3 +
  convergenza, LE2 cantilever Beam3D + convergenza + reazioni, LE10 thick
  plate Q4 + h-refinement + linearita'). Mesh ellittica via Coons patch.
  BL-6 chiuso.
- **D2 — Validation page**: `GET /api/validation/report` (HTML
  auto-contained) + `GET /api/validation/report.json`. Cache TTL configurabile
  via `FEAPRO_VALIDATION_REPORT_TTL`.

### Frontend
- **A4 — CostPreviewDialog**: `api/billing/` + `store/billingStore` (con
  `persist` per skipCostPreview) + `hooks/useCostPreview` + dialog modale
  con breakdown DOF/ETA/RAM/CPU/credits + banner "quota esaurita".
  Integrato in PushoverPanel, NonlinearPanel, ArcLengthPanel, SeismicTHPanel.
- **A5 frontend**: `api/jobs/` client REST + nuovo `JobsPanel` con
  filtro stato, cancel inline, detail card. Pronto per integrazione UI
  futura nel workspace Analysis.
- **E1 — vitest coverage**: 18 nuovi test per NonlinearPanel,
  ArcLengthPanel, IsosurfacePanel, LiveMonitorPanel, JobsPanel,
  CostPreviewDialog, useCostPreview.

### Migration notes
- Nuovi hidden file: `.cache/services.sqlite`, `.cache/jobs.sqlite`,
  `.quotas/quotas.json`, `audit/jobs.jsonl` -- tutti in `.gitignore`.
- Nuove env var: `FEAPRO_<DOMAIN>_PROVIDER`, `FEAPRO_<DOMAIN>_FALLBACK`,
  `FEAPRO_CACHE_TTL_<DOMAIN>`, `FEAPRO_VALIDATION_REPORT_TTL`,
  `FEAPRO_DEFAULT_USER_ID`.
- Endpoint legacy (pushover, seismic_th, nonlinear, arclength) restano sync
  per compatibilita' col frontend esistente; il flow JobQueue e' accessibile
  via `POST /api/jobs` con lo stesso dispatcher.

### Gate
| Gate | v1.2 baseline | v1.3 Sprint 1 |
|---|---|---|
| pytest backend | 730 | **856** (+126) |
| vitest frontend | 58 | **86** (+28) |
| tsc | 0 errori | **0 errori** |
| vite build | OK | **OK** |
| Cost estimator +-30% | -- | **green (7/7)** |
| Validation report green | -- | **green (5/5)** |
| BL-6 | aperto | **chiuso** |

### Smoke E2E verificato
- API: `POST /api/billing/estimate` -> `POST /api/jobs` -> worker async ->
  `GET /api/jobs/{id}/result` + quota consume + audit JSONL + usage summary.
- UI: app `:5273` con modello `ex_cable_bridge_2d`, Analisi -> Push-over ->
  Esegui pushover -> CostPreviewDialog si apre con stima + quota residua
  "49.83 / 50 (free)" -> Procedi -> solve completato (55 step, 6 cerniere,
  lambda collapse = 2.750) -> deformata visibile nel viewport.

---

## v1.2.0 — 2026-05-20 (UX polish + progress live)

Continuazione di v1.1 con focus sul **completamento del ciclo utente** per le
feature BL-1/BL-7 e sul monitor live.

### Backend
- Tutti i solver lunghi (pushover, seismic_th, **nonlinear**, **arclength**)
  ora iniettano `progress_cb` → broadcast su `/ws/analysis/{model_id}`.
  Gli endpoint REST sono diventati `async` con `_make_progress_cb()` helper
  thread-safe (cattura il running loop).
- Tutti i 4 endpoint convertono gli errori in `broadcast_progress(1.0, "Errore: …")`
  così il client viene notificato anche su exception.

### Frontend
- **NonlinearPanel** e **ArcLengthPanel** ora persistono il risultato come
  `staticResults` in `useResultsStore` → la deformata appare **automaticamente**
  nel viewport (riusando `DeformedShape`, `InternalForceDiagram`).
- **ElementDialog** esteso con:
  - 5 nuovi tipi: `cable2d`, `cable3d`, `shell_q4_mitc`, `solid_t4`, `solid_t10`
  - Campo `pretension` (N₀ in N) visibile solo per cavi, con default vuoto
    e hint sezioni `cable_d20`/`cable_d50`.
- **ColorLegend** generalizzato con `format` callback custom + parametro
  `position` (top-right, top-right-2, bottom-right) → permette legende multiple.
- **IsosurfaceLegend** nuovo overlay nel viewport che mostra min/max dei livelli
  iso attualmente visualizzati (notazione scientifica neutra).

### Test
- Tutti i gate restano verdi: pytest 730/730, vitest 58/58, tsc 0, build OK.

---

## v1.1.0 — 2026-05-20 (Completamento UX feature BL)

Dopo l'audit di integrazione UI-UX, sono state esposte all'utente le feature
BL-1/BL-2/BL-7 che erano solo backend, e sono stati creati i modelli demo per
testarle senza dover modellare da zero.

### Nuovi pannelli frontend
- **NonlinearPanel** (`POST /api/analysis/nonlinear/{id}`) — Newton-Raphson +
  cavi tension-only (BL-1), con form parametri, curva λ vs max|u|, tabella step
  con badge convergenza e contatori active/slack cables.
- **ArcLengthPanel** (`POST /api/analysis/arclength/{id}`) — Crisfield
  path-following (BL-2), con form ricco (Δs auto/prescritto, control DOF, λ_max,
  δ_max, λ_init), grafico equilibrium path λ-δ, peak λ in ReferenceLine.
- **IsosurfacePanel** (`POST /api/postprocess/{id}/isosurfaces`) — marching
  tetra/cubes (BL-7) con smoothing nodale automatico di σ_VM, riepilogo aree
  per livello, integrazione con `setIsosurfaceData` per rendering nel viewport.
- **LiveMonitorPanel** — log streaming via WebSocket `/ws/analysis/{id}` +
  eventi dello store locale, auto-scroll pausabile, badge running/idle,
  clear button, max 500 eventi.

### Viewport
- **CableLine** (BL-1) — cavi disegnati come linee sottili, verdi se
  pre-tesi, grigie se slack.
- **TetMesh** (BL-3) — render tetraedri T4/T10 (T10 usa solo i 4 vertici).
- **IsosurfaceLayer** (BL-7) — mesh triangoli iso 3D con colormap jet,
  trasparenti (opacity 0.55, depthWrite=false).
- **shell_q4_mitc** ora condivide il rendering di `shell_q4`.

### Modelli demo seed
- `ex_cube_solid_h8` — cubo H8 in trazione (BL-3/BL-7).
- `ex_cable_bridge_2d` — ponte strallato 2D con 4 cavi pre-tesi 50 kN (BL-1).
- `ex_laminate_plate` — piastra 4×4 SHELL_Q4 con laminato cross-ply 0/90/0 (BL-4).

### Database materiali/sezioni
- Materiali: `cable_steel_y1860` (trefolo Y1860), `carbon_uni` (fibra carbonio T300).
- Sezioni: `cable_d20`, `cable_d50` (cavi tension-only), `laminate_cross_ply`
  (3 strati 1 mm carbon, simmetrico).

### Fix responsive (precedenti all'audit)
- **TopBar** — pulsanti CRUD solo icona sotto md, select modello fluido su mobile.
- **StatusBar** — gerarchia visiva graduale `sm/md/lg`, progress bar adattiva.
- **Dialog (custom)** — `w-[calc(100vw-24px)]` con `maxWidth` cap → mobile-safe.
- **TabsList** workspace ora scrollabili orizzontalmente.

### Workspace estesi
- **AnalysisWorkspace** — 7 tab (era 5): + Non-lin., + Arc-len.
- **ResultsWorkspace** — 7 tab (era 6): + Iso 3D.

### Gate v1.1
- pytest 730/730 ✅ (coverage 90%)
- vitest 58/58 ✅
- tsc 0 errori ✅
- vite build 9.7s ✅

---

## v1.0.0 — 2026-05-19

Prima release ufficiale dopo il completamento del piano in 25 fasi.

### Riepilogo numerico

- **655 test pytest** passati (era 75 alla baseline)
- **58 test vitest** passati (era 19 alla baseline)
- **Backend coverage: 92%** (gate ≥70%)
- **0 errori TypeScript**, build Vite verde
- **0 test xfail**

### Funzionalità per fase

**FASE 0 — Setup test infrastructure**
- pytest-cov, pytest-benchmark, hypothesis
- vitest + @testing-library + msw
- Cartelle tests/benchmarks e tests/validation

**FASE 1 — Benchmarks analitici**
- Cantilever PL³/3EI
- Simply supported UDL 5wL⁴/384EI
- Euler buckling (sblocked in Fase 5)
- NAFEMS FV4 modal cantilever, LE10 plate
- Patch test Tri3 e Q4

**FASE 2 — Verifiche EC3 (EN 1993-1-1)**
- MATERIALS_DB esteso (S275/S420/S460)
- SECTIONS_DB con 16 profili IPE/HEA/HEB completi
- Classificazione sezioni §5.5
- Resistenze §6.2
- Instabilità flessionale §6.3.1
- Instabilità flesso-torsionale (LTB) §6.3.2
- API POST /api/verify/ec3 + UI VerificationPanel

**FASE 3 — Verifiche EC2/EC5/EC8**
- Materiali B450C, cls C20-C45, legno C24/GL24h
- EC2: flessione e taglio CA
- EC5: resistenze legno con k_mod
- EC8: spettri elastici 4-rami, fattore q, combinazioni sismiche, zone

**FASE 4 — Combinazioni NTC 2018**
- Schema azioni + tabelle γ/ψ
- Generatore SLU/SLE (formule 2.5.1-2.5.6)
- Envelope sollecitazioni
- Property-based tests con hypothesis

**FASE 5 — Buckling beam Euler-Bernoulli**
- K_G con interpolazione cubica Bathe §6.6.3
- Refactor buckling_solver per BEAM2D
- Errore Eulero: 0.00%

**FASE 6 — Push-over analysis**
- PushoverSolver λ-incrementale
- Tracking plastic hinges (|M| > M_pl)
- Curva capacità λ-δ

**FASE 7 — Response spectrum analysis**
- SRSS, CQC con Der Kiureghian 1981
- Direzione combinations
- Mass participation ratio (verifica 61.3% Blevins)

**FASE 8 — Beam su suolo elastico Winkler**
- Element.winkler_k schema
- K_winkler con consistent mass matrix
- Test Hetényi (errore 0.02%)

**FASE 9 — Molle unilaterali**
- Constraint.compression_only schema
- UnilateralSolver con algoritmo active-set
- Iterazioni ≤ 5 per problemi piccoli

**FASE 10 — I/O BIM/CAD**
- DXF importer/exporter (ezdxf)
- IFC4 importer/exporter (ifcopenshell)
- API /api/io/import|export

**FASE 11 — Mesh automatica**
- Delaunay 2D per poligoni con holes
- Gmsh wrapper thread-safe per 2D e box surface
- Geometrie parametriche (rectangle, L, T, circle, ring)
- API /api/models/{id}/mesh/parametric

**FASE 12 — Sismica time-history multi-componente**
- SeismicTimeHistorySolver wrapper su Newmark-β
- Rayleigh damping da ξ + ω_lo/ω_hi
- Postprocess drift e drift ratio

**FASE 13 — Catalogo accelerogrammi**
- Parser PEER NGA (.AT2), ESM ASCII, CSV
- Kanai-Tajimi + Boore con envelope Saragoni-Hart
- 2 file embedded; API /api/io/accelerograms

**FASE 14 — Fatica (Rainflow + S-N + Miner)**
- Algoritmo Rainflow ASTM E1049-85 4-point
- S-N a 2 pendenze (m=3, m=5) con 14 categorie EC3-1-9
- Danno Palmgren-Miner con γ_Mf

**FASE 15 — UI: undo/redo, commenti, misure**
- 3 store Zustand (historyStore, commentsStore, measurementsStore)
- Utility geometriche (distance3D, angleDeg, chainLength)

**FASE 16 — Slicing, iso-curve, modi sovrapposti**
- Marching triangles per isolinee TRI3
- Slice planes per tetraedri ed esaedri
- Superposizione modale lineare

**FASE 17 — Export Excel multi-sheet**
- openpyxl con 5-8 sheet stilizzati
- API /api/io/export/{id}/xlsx

**FASE 18 — Confronto modelli A vs B**
- ModelDiff (nodes/elements/loads/constraints added/removed/moved/modified)
- StaticResultsDiff (max Δu, Δ%, ΔN, ΔM)
- API POST /api/models/compare

**FASE 19 — Convergence + ZZ error**
- Richardson extrapolation, GCI (Roache ASME V&V20)
- Zienkiewicz-Zhu error estimator semplificato

**FASE 20 — Python client + CLI**
- FEAProClient sync httpx con http_client iniettabile
- CLI argparse con 7 subcommand

**FASE 21 — AI Copilot**
- AIProvider astratto, GeminiProvider REST, MockProvider offline
- Copilot serializza modello+risultati in prompt
- API POST /api/ai/ask

**FASE 22 — Real-time collaboration**
- CollabSession con Lamport clock thread-safe
- WebSocket /ws/collab/{model_id} con join/op/cursor

**FASE 23 — Auto-detection problemi modello**
- 5 detector (duplicate_elements, coincident_nodes, orphan_loads, missing_section, winkler_jump)
- API GET /api/models/{id}/auto-detect

**FASE 24 — Report PDF parametrico**
- reportlab con 7 sezioni
- API GET /api/io/export/{id}/pdf

**FASE 25 — Release**
- Smoke test end-to-end (5 test workflow completi)
- Version bump a 1.0.0
- Endpoint /api con features list

### Carry-over noti (non bloccanti)

Tutti i carry-over sono tracciati in **[BACKLOG.md](BACKLOG.md)** con priorità,
complessità stimata e sketch tecnico di implementazione. Sintesi:

| ID | Voce | Priorità |
|---|---|---|
| BL-1 | Newton-Raphson + Cable 2D/3D (non-linearità geometrica) | 🔴 alta |
| BL-2 | Arc-length post-buckling + Williams toggle frame | 🔴 alta |
| BL-3 | Elementi Tet4 / T10 solidi | 🟡 media |
| BL-4 | Shell layered (composite stack-up) | 🟡 media |
| BL-5 | Q4 MITC4 / reduced integration (anti shear-locking) | 🟡 media |
| BL-6 | NAFEMS LE1/LE2/LE10 con geometria ellittica | 🟢 bassa |
| BL-7 | 3D iso-surfaces (marching tetra/cubes nativo) | 🟢 bassa |
| BL-8 | DXF layer → material/section mapping | 🟢 bassa |
| BL-9 | Bump jsPDF per CVE noto (solo client) | 🔵 esterno |

### Stack

**Backend Python 3.14**: FastAPI, NumPy, SciPy, Pydantic, ezdxf, ifcopenshell, gmsh, openpyxl, reportlab, httpx, pytest+cov+benchmark+hypothesis.

**Frontend**: React 18 + TypeScript + Three.js + Zustand + TanStack Query + Vitest + msw.
