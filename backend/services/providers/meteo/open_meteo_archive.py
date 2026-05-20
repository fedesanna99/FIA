"""OpenMeteoArchiveProvider (Sprint 2 — F4.1).

Endpoint: https://archive-api.open-meteo.com/v1/archive
Source: ERA5 reanalysis, daily resolution, copertura dal 1940.

Vincoli operativi:
    - cache TTL 30 giorni (i dati storici non cambiano, ma ricomputiamo
      i 50y in caso di nuove osservazioni in coda alla serie)
    - rate limit bucket "open_meteo" condiviso con il forecast provider
    - timeout 30 s (payload puo' essere grande per 80 anni di dati)
    - lat/lon arrotondati a 4 decimali (~10 m) per cache hit stabile
"""
from __future__ import annotations

import logging
import time
from datetime import date, timedelta
from typing import Any, ClassVar

import httpx

from ...cache import ServiceCache, cache as default_cache
from ...rate_limiter import RateLimiter, limiter as default_limiter
from ._gumbel_return_period import annual_maxima_from_daily, gumbel_return_period
from .base import MeteoProvider, VariableName
from .errors import (
    ProviderError,
    ProviderTimeoutError,
    ProviderUnavailableError,
)
from .open_meteo_forecast import _map_status_to_error, _ReusableClient, _safe_float
from .types import ArchiveResult, DailyEntry, ProviderHealth, WindSnowExtremes


logger = logging.getLogger(__name__)


# ERA5 ha lag di ~5 giorni; chiediamo fino a -7 per sicurezza
_END_DATE_LAG_DAYS = 7

_DAILY_PARAMS = ",".join(
    [
        "wind_gusts_10m_max",
        "snowfall_sum",
    ]
)


class OpenMeteoArchiveProvider(MeteoProvider):
    """Provider archive Open-Meteo (ERA5)."""

    name: ClassVar[str] = "open_meteo_archive"

    BASE_URL: ClassVar[str] = "https://archive-api.open-meteo.com/v1/archive"
    RATE_LIMIT_BUCKET: ClassVar[str] = "open_meteo"
    CACHE_TTL_ARCHIVE_S: ClassVar[int] = 30 * 24 * 3600
    HTTP_TIMEOUT_S: ClassVar[float] = 30.0
    HEALTH_TIMEOUT_S: ClassVar[float] = 3.0
    MAX_YEARS: ClassVar[int] = 85  # ERA5 inizia 1940

    def __init__(
        self,
        cache: ServiceCache | None = None,
        rate_limiter: RateLimiter | None = None,
        client: httpx.AsyncClient | None = None,
    ) -> None:
        super().__init__()
        self.cache = cache if cache is not None else default_cache
        self.rate_limiter = rate_limiter if rate_limiter is not None else default_limiter
        self._client = client

    # ---- F6 usage_tracker hook (stub) ------------------------------------
    def _record_call(
        self,
        endpoint: str,
        status: str,
        latency_ms: float,
        cached: bool,
    ) -> None:
        """No-op stub. Sara' sovrascritto da F6 settimana 3 di Sprint 2."""

    # ---- public API ------------------------------------------------------
    async def forecast(
        self,
        lat: float,
        lon: float,
        days: int = 7,
    ) -> Any:
        # L'archive non gestisce forecast: gli orchestratori useranno
        # OpenMeteoForecastProvider per le previsioni.
        raise NotImplementedError(
            "OpenMeteoArchiveProvider non supporta forecast — usa "
            "OpenMeteoForecastProvider"
        )

    async def historical_extremes(
        self,
        lat: float,
        lon: float,
        years: int = 80,
        variables: list[VariableName] | None = None,
    ) -> WindSnowExtremes:
        if not (1 <= years <= self.MAX_YEARS):
            raise ValueError(
                f"years deve essere tra 1 e {self.MAX_YEARS}, ricevuto {years}"
            )

        lat_r = round(float(lat), 4)
        lon_r = round(float(lon), 4)
        cache_key = f"{self.name}:extremes:{lat_r:.4f}:{lon_r:.4f}:{years}"

        cached = self.cache.get("meteo", cache_key)
        if cached is not None:
            self._record_call("extremes", "cache_hit", 0.0, cached=True)
            try:
                return WindSnowExtremes.model_validate(cached)
            except Exception:
                self.cache.invalidate("meteo", cache_key)

        end_date = date.today() - timedelta(days=_END_DATE_LAG_DAYS)
        start_date = end_date.replace(year=end_date.year - years)

        await self.rate_limiter.acquire(self.RATE_LIMIT_BUCKET)
        t0 = time.perf_counter()
        try:
            data = await self._fetch_archive(lat_r, lon_r, start_date, end_date)
        except ProviderError:
            self._record_call(
                "extremes",
                "error",
                (time.perf_counter() - t0) * 1000.0,
                cached=False,
            )
            raise

        result = self._extract_extremes(data, lat_r, lon_r, years)
        self.cache.set(
            "meteo",
            cache_key,
            result.model_dump(),
            ttl_s=self.CACHE_TTL_ARCHIVE_S,
        )
        self._record_call(
            "extremes",
            "ok",
            (time.perf_counter() - t0) * 1000.0,
            cached=False,
        )
        return result

    async def get_archive(
        self,
        lat: float,
        lon: float,
        start_date: date,
        end_date: date,
    ) -> ArchiveResult:
        """Helper esposto per esplorazione: ritorna la serie giornaliera grezza.

        Non cachato — uso solo in development. La cache si applica solo a
        `historical_extremes()`.
        """
        await self.rate_limiter.acquire(self.RATE_LIMIT_BUCKET)
        data = await self._fetch_archive(lat, lon, start_date, end_date)
        return self._parse_archive(data, lat, lon)

    async def health_check(self) -> ProviderHealth:
        t0 = time.perf_counter()
        try:
            async with self._client_ctx(timeout=self.HEALTH_TIMEOUT_S) as client:
                today = date.today() - timedelta(days=_END_DATE_LAG_DAYS)
                resp = await client.get(
                    self.BASE_URL,
                    params={
                        "latitude": 0,
                        "longitude": 0,
                        "start_date": today.isoformat(),
                        "end_date": today.isoformat(),
                        "daily": "snowfall_sum",
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
        if resp.status_code in (200, 400):
            status: Any = "ok" if latency_ms < 2000 else "degraded"
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
        if self._client is not None:
            return _ReusableClient(self._client)
        return httpx.AsyncClient(timeout=timeout or self.HTTP_TIMEOUT_S)

    async def _fetch_archive(
        self,
        lat: float,
        lon: float,
        start_date: date,
        end_date: date,
    ) -> dict[str, Any]:
        params = {
            "latitude": f"{lat:.4f}",
            "longitude": f"{lon:.4f}",
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "daily": _DAILY_PARAMS,
            "wind_speed_unit": "ms",
            "timezone": "UTC",
        }
        try:
            async with self._client_ctx() as client:
                resp = await client.get(self.BASE_URL, params=params)
        except httpx.TimeoutException as exc:
            raise ProviderTimeoutError(
                f"archive timeout: {exc}", provider=self.name
            ) from exc
        except httpx.HTTPError as exc:
            raise ProviderUnavailableError(
                f"archive network error: {exc}", provider=self.name
            ) from exc

        return _map_status_to_error(resp, self.name)

    def _parse_archive(
        self,
        data: dict[str, Any],
        lat: float,
        lon: float,
    ) -> ArchiveResult:
        daily_block: dict[str, list[Any]] = data.get("daily") or {}
        dates_arr: list[str] = list(daily_block.get("time") or [])
        gusts_arr: list[Any] = list(daily_block.get("wind_gusts_10m_max") or [])
        snows_arr: list[Any] = list(daily_block.get("snowfall_sum") or [])

        n = len(dates_arr)
        years = max(1, _years_span(dates_arr))
        daily: list[DailyEntry] = []
        for i in range(n):
            daily.append(
                DailyEntry(
                    date=str(dates_arr[i]),
                    wind_gust_max_ms=_nullable_float(gusts_arr, i),
                    snowfall_sum_cm=_nullable_float(snows_arr, i),
                )
            )
        return ArchiveResult(
            provider=self.name,
            lat=float(data.get("latitude", lat)),
            lon=float(data.get("longitude", lon)),
            period_years=years,
            daily=daily,
        )

    def _extract_extremes(
        self,
        data: dict[str, Any],
        lat: float,
        lon: float,
        years: int,
    ) -> WindSnowExtremes:
        daily_block: dict[str, list[Any]] = data.get("daily") or {}
        dates_arr: list[str] = list(daily_block.get("time") or [])
        gusts_raw: list[Any] = list(daily_block.get("wind_gusts_10m_max") or [])
        snows_raw: list[Any] = list(daily_block.get("snowfall_sum") or [])

        # Allinea le tre liste alla stessa lunghezza
        n = len(dates_arr)
        gusts_aligned: list[float | None] = [
            _nullable_float(gusts_raw, i) for i in range(n)
        ]
        snows_aligned: list[float | None] = [
            _nullable_float(snows_raw, i) for i in range(n)
        ]

        gust_max = _max_nonnull(gusts_aligned)
        snow_max = _max_nonnull(snows_aligned)

        # Massimi annuali per Gumbel 50y
        gust_annual = annual_maxima_from_daily(dates_arr, gusts_aligned)
        snow_annual = annual_maxima_from_daily(dates_arr, snows_aligned)

        gust_50y = gumbel_return_period(gust_annual, T=50)
        snow_50y = gumbel_return_period(snow_annual, T=50)

        # years_used: numero distinto di anni con almeno un dato
        years_used = max(1, _years_span(dates_arr))

        return WindSnowExtremes(
            lat=float(data.get("latitude", lat)),
            lon=float(data.get("longitude", lon)),
            years_used=years_used,
            wind_gust_max_ms=gust_max,
            wind_gust_50y_ms=gust_50y,
            snowfall_max_cm=snow_max,
            snowfall_50y_cm=snow_50y,
            source="ERA5",
        )


# ---- helpers ---------------------------------------------------------------


def _nullable_float(arr: list[Any], i: int) -> float | None:
    """Come `_safe_float` ma propaga None invece di sostituire con default."""
    if i >= len(arr) or arr[i] is None:
        return None
    try:
        v = float(arr[i])
    except (TypeError, ValueError):
        return None
    return v


def _max_nonnull(arr: list[float | None]) -> float:
    """Max sui valori non-None; 0.0 se tutti None o lista vuota."""
    vals = [v for v in arr if v is not None]
    if not vals:
        return 0.0
    return max(vals)


def _years_span(dates: list[str]) -> int:
    """Numero di anni distinti rappresentati nella serie."""
    years = {d[:4] for d in dates if len(d) >= 4 and d[:4].isdigit()}
    return len(years)


# Re-export per __init__: _safe_float importato per side effects (linting)
_ = _safe_float  # noqa: F841 — silenzia "imported but unused"
