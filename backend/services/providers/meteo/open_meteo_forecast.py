"""OpenMeteoForecastProvider (Sprint 2 — F4.1).

Endpoint: https://api.open-meteo.com/v1/forecast
Licenza: Open-Meteo free tier non-commercial, no API key.

Vincoli operativi:
    - cache TTL 6 ore (forecast cambia ~3-4 volte/giorno upstream)
    - rate limit bucket condiviso "open_meteo" (10 rps, capacity 20)
    - lat/lon arrotondati a 4 decimali (~10 m, sufficiente per cache hit)
    - timeout 10 s su request HTTP
"""
from __future__ import annotations

import logging
import time
from typing import Any, ClassVar

import httpx

from ...cache import ServiceCache, cache as default_cache
from ...rate_limiter import RateLimiter, limiter as default_limiter
from .base import MeteoProvider
from .errors import (
    ProviderError,
    ProviderRateLimitError,
    ProviderTimeoutError,
    ProviderUnavailableError,
)
from .types import ForecastResult, HourlyEntry, ProviderHealth


logger = logging.getLogger(__name__)


# m/s direttamente (no conversione km/h)
_HOURLY_PARAMS = ",".join(
    [
        "temperature_2m",
        "wind_speed_10m",
        "wind_gusts_10m",
        "precipitation",
        "snowfall",
    ]
)


class OpenMeteoForecastProvider(MeteoProvider):
    """Provider forecast Open-Meteo (16 giorni)."""

    name: ClassVar[str] = "open_meteo_forecast"

    BASE_URL: ClassVar[str] = "https://api.open-meteo.com/v1/forecast"
    RATE_LIMIT_BUCKET: ClassVar[str] = "open_meteo"
    CACHE_TTL_FORECAST_S: ClassVar[int] = 6 * 3600
    HTTP_TIMEOUT_S: ClassVar[float] = 10.0
    HEALTH_TIMEOUT_S: ClassVar[float] = 3.0

    def __init__(
        self,
        cache: ServiceCache | None = None,
        rate_limiter: RateLimiter | None = None,
        client: httpx.AsyncClient | None = None,
    ) -> None:
        super().__init__()
        self.cache = cache if cache is not None else default_cache
        self.rate_limiter = rate_limiter if rate_limiter is not None else default_limiter
        # Client iniettabile per test (es. con httpx.MockTransport). Se None
        # ogni call apre/chiude il proprio client.
        self._client = client

    # ---- F6 usage_tracker hook ------------------------------------------
    def _record_call(
        self,
        endpoint: str,
        status: str,
        latency_ms: float,
        cached: bool,
    ) -> None:
        """Inoltra la chiamata al tracker singleton (F6)."""
        from ...usage_tracker import tracker
        tracker.record(
            domain=self.domain,
            provider=self.name,
            endpoint=endpoint,
            status=status,
            latency_ms=latency_ms,
            cached=cached,
        )

    # ---- public API ------------------------------------------------------
    async def forecast(
        self,
        lat: float,
        lon: float,
        days: int = 7,
    ) -> ForecastResult:
        if not (1 <= days <= 16):
            raise ValueError(f"days deve essere tra 1 e 16, ricevuto {days}")

        lat_r = round(float(lat), 4)
        lon_r = round(float(lon), 4)
        cache_key = f"{self.name}:{lat_r:.4f}:{lon_r:.4f}:{days}"

        cached = self.cache.get("meteo", cache_key)
        if cached is not None:
            self._record_call("forecast", "cache_hit", 0.0, cached=True)
            try:
                return ForecastResult.model_validate(cached)
            except Exception:
                # Cache entry corrotta: invalida e prosegui col fetch
                self.cache.invalidate("meteo", cache_key)

        await self.rate_limiter.acquire(self.RATE_LIMIT_BUCKET)
        t0 = time.perf_counter()
        try:
            data = await self._fetch_forecast(lat_r, lon_r, days)
        except ProviderError:
            self._record_call(
                "forecast",
                "error",
                (time.perf_counter() - t0) * 1000.0,
                cached=False,
            )
            raise

        result = self._parse_forecast(data, lat_r, lon_r, days)
        # Salva su cache solo se valida (parse non e' fallito)
        self.cache.set(
            "meteo",
            cache_key,
            result.model_dump(),
            ttl_s=self.CACHE_TTL_FORECAST_S,
        )
        self._record_call(
            "forecast",
            "ok",
            (time.perf_counter() - t0) * 1000.0,
            cached=False,
        )
        return result

    async def historical_extremes(
        self,
        lat: float,
        lon: float,
        years: int = 80,
        variables: list[Any] | None = None,
    ) -> Any:
        # Il forecast provider non gestisce historical. Gli orchestratori
        # di B4 useranno OpenMeteoArchiveProvider per quello.
        raise NotImplementedError(
            "OpenMeteoForecastProvider non supporta historical_extremes "
            "— usa OpenMeteoArchiveProvider"
        )

    async def health_check(self) -> ProviderHealth:
        """Probe endpoint con HEAD (tollerante a 405)."""
        t0 = time.perf_counter()
        try:
            async with self._client_ctx(timeout=self.HEALTH_TIMEOUT_S) as client:
                # Open-Meteo accetta GET solo; HEAD ritorna 405. Una GET
                # senza params ritorna 400 (params mancanti) ma il server
                # e' raggiungibile. Usiamo una GET minimale a payload valido.
                resp = await client.get(
                    self.BASE_URL,
                    params={
                        "latitude": 0,
                        "longitude": 0,
                        "hourly": "temperature_2m",
                        "forecast_days": 1,
                    },
                )
        except httpx.TimeoutException as exc:
            return ProviderHealth(
                provider=self.name,
                status="down",
                latency_ms=(time.perf_counter() - t0) * 1000.0,
                last_error=f"timeout: {exc}",
            )
        except httpx.HTTPError as exc:
            return ProviderHealth(
                provider=self.name,
                status="down",
                latency_ms=(time.perf_counter() - t0) * 1000.0,
                last_error=str(exc),
            )

        latency_ms = (time.perf_counter() - t0) * 1000.0
        if 500 <= resp.status_code < 600:
            return ProviderHealth(
                provider=self.name,
                status="down",
                latency_ms=latency_ms,
                last_error=f"HTTP {resp.status_code}",
            )
        if resp.status_code in (200, 400):  # 400 = param errati ma server vivo
            status: Any = "ok" if latency_ms < 1500 else "degraded"
            return ProviderHealth(
                provider=self.name,
                status=status,
                latency_ms=latency_ms,
            )
        return ProviderHealth(
            provider=self.name,
            status="degraded",
            latency_ms=latency_ms,
            last_error=f"HTTP {resp.status_code}",
        )

    # ---- private ---------------------------------------------------------
    def _client_ctx(self, timeout: float | None = None) -> Any:
        """Context manager che ritorna un AsyncClient.

        Se un client e' stato iniettato in __init__ (es. test con MockTransport),
        lo riusiamo. Altrimenti istanziamo un client effimero.
        """
        if self._client is not None:
            return _ReusableClient(self._client)
        return httpx.AsyncClient(timeout=timeout or self.HTTP_TIMEOUT_S)

    async def _fetch_forecast(
        self,
        lat: float,
        lon: float,
        days: int,
    ) -> dict[str, Any]:
        params = {
            "latitude": f"{lat:.4f}",
            "longitude": f"{lon:.4f}",
            "hourly": _HOURLY_PARAMS,
            "wind_speed_unit": "ms",
            "timezone": "auto",
            "forecast_days": days,
        }
        try:
            async with self._client_ctx() as client:
                resp = await client.get(self.BASE_URL, params=params)
        except httpx.TimeoutException as exc:
            raise ProviderTimeoutError(
                f"forecast timeout: {exc}", provider=self.name
            ) from exc
        except httpx.HTTPError as exc:
            raise ProviderUnavailableError(
                f"forecast network error: {exc}", provider=self.name
            ) from exc

        return _map_status_to_error(resp, self.name)

    def _parse_forecast(
        self,
        data: dict[str, Any],
        lat: float,
        lon: float,
        days: int,
    ) -> ForecastResult:
        hourly_block: dict[str, list[Any]] = data.get("hourly") or {}
        times: list[str] = list(hourly_block.get("time") or [])
        temps: list[float] = list(hourly_block.get("temperature_2m") or [])
        winds: list[float] = list(hourly_block.get("wind_speed_10m") or [])
        gusts: list[float] = list(hourly_block.get("wind_gusts_10m") or [])
        precs: list[float] = list(hourly_block.get("precipitation") or [])
        snows: list[float] = list(hourly_block.get("snowfall") or [])

        n = len(times)
        entries: list[HourlyEntry] = []
        for i in range(n):
            entries.append(
                HourlyEntry(
                    ts=str(times[i]),
                    temp_C=_safe_float(temps, i, 0.0),
                    wind_speed_ms=_safe_nonneg(winds, i),
                    wind_gust_ms=_safe_nonneg(gusts, i),
                    precipitation_mm=_safe_nonneg(precs, i),
                    snowfall_cm=_safe_nonneg(snows, i),
                )
            )
        return ForecastResult(
            provider=self.name,
            lat=float(data.get("latitude", lat)),
            lon=float(data.get("longitude", lon)),
            generated_at=_now_iso(),
            days=days,
            hourly=entries,
        )


# ---- helpers (shared con archive provider) ----------------------------------


def _now_iso() -> str:
    """ISO8601 timestamp UTC (compat Python 3.11+, no zoneinfo)."""
    from datetime import datetime, timezone

    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _safe_float(arr: list[Any], i: int, default: float) -> float:
    if i >= len(arr) or arr[i] is None:
        return default
    try:
        return float(arr[i])
    except (TypeError, ValueError):
        return default


def _safe_nonneg(arr: list[Any], i: int) -> float:
    v = _safe_float(arr, i, 0.0)
    return v if v >= 0.0 else 0.0


def _map_status_to_error(resp: httpx.Response, provider: str) -> dict[str, Any]:
    """Verifica status_code e ritorna il JSON parsato. Solleva eccezioni semantiche.

    Implementa il contratto di errore di F4.1:
      - 200 -> ritorna dict
      - 429 -> ProviderRateLimitError
      - 5xx -> ProviderUnavailableError
      - altro 4xx -> ProviderError
    """
    code = resp.status_code
    if 200 <= code < 300:
        try:
            return dict(resp.json())
        except Exception as exc:
            raise ProviderError(
                f"response not JSON: {exc}", provider=provider, status=code
            ) from exc
    if code == 429:
        raise ProviderRateLimitError(
            f"rate limit upstream (HTTP 429)", provider=provider, status=code
        )
    if 500 <= code < 600:
        raise ProviderUnavailableError(
            f"upstream {code}", provider=provider, status=code
        )
    raise ProviderError(
        f"unexpected HTTP {code}: {resp.text[:200]}",
        provider=provider,
        status=code,
    )


class _ReusableClient:
    """Wrapper che fa "async with" su un AsyncClient gia' istanziato.

    Necessario perche' `async with httpx.AsyncClient(...)` chiude il
    client all'uscita; se vogliamo riusare lo stesso client tra piu'
    chiamate (es. test) NON dobbiamo chiuderlo.
    """

    def __init__(self, client: httpx.AsyncClient) -> None:
        self._client = client

    async def __aenter__(self) -> httpx.AsyncClient:
        return self._client

    async def __aexit__(self, exc_type: Any, exc: Any, tb: Any) -> None:
        # NON chiudere il client iniettato.
        return None
