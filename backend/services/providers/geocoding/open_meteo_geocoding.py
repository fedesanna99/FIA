"""OpenMeteoGeocodingProvider (Sprint 2 — F4.2).

Endpoint: https://geocoding-api.open-meteo.com/v1/search
Licenza: Open-Meteo free tier non-commercial, no API key.

Caratteristiche:
    - solo forward geocoding (reverse non supportato — solleva NotImplementedError)
    - copertura mondiale buona, EU eccellente
    - rate limit bucket "open_meteo" (10 rps, condiviso con meteo F4.1)
    - cache TTL 1 anno (locations sono stabili)
"""
from __future__ import annotations

import logging
import time
from typing import Any, ClassVar

import httpx

from ...cache import ServiceCache, cache as default_cache
from ...rate_limiter import RateLimiter, limiter as default_limiter
from ..meteo.errors import (
    ProviderError,
    ProviderTimeoutError,
    ProviderUnavailableError,
)
from ..meteo.open_meteo_forecast import _map_status_to_error, _ReusableClient
from ..meteo.types import ProviderHealth
from .base import GeocodingProvider
from .types import GeocodingResult, Location, ReverseResult


logger = logging.getLogger(__name__)


class OpenMeteoGeocodingProvider(GeocodingProvider):
    """Provider geocoding Open-Meteo (search only)."""

    name: ClassVar[str] = "open_meteo_geocoding"

    BASE_URL: ClassVar[str] = "https://geocoding-api.open-meteo.com/v1/search"
    RATE_LIMIT_BUCKET: ClassVar[str] = "open_meteo"
    CACHE_TTL_GEOCODING_S: ClassVar[int] = 365 * 24 * 3600
    HTTP_TIMEOUT_S: ClassVar[float] = 10.0
    HEALTH_TIMEOUT_S: ClassVar[float] = 3.0
    MAX_COUNT: ClassVar[int] = 100

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

    # ---- F6 usage hook stub ----------------------------------------------
    def _record_call(
        self,
        endpoint: str,
        status: str,
        latency_ms: float,
        cached: bool,
    ) -> None:
        """No-op stub. Sara' sovrascritto da F6 settimana 3."""

    # ---- public API ------------------------------------------------------
    async def search(
        self,
        query: str,
        count: int = 10,
        language: str = "en",
    ) -> GeocodingResult:
        q = (query or "").strip()
        if not q:
            raise ValueError("query non puo' essere vuota")
        if not (1 <= count <= self.MAX_COUNT):
            raise ValueError(
                f"count deve essere tra 1 e {self.MAX_COUNT}, ricevuto {count}"
            )

        cache_key = f"{self.name}:search:{q.lower()}:{count}:{language}"
        cached = self.cache.get("geocoding", cache_key)
        if cached is not None:
            self._record_call("search", "cache_hit", 0.0, cached=True)
            try:
                return GeocodingResult.model_validate(cached)
            except Exception:
                self.cache.invalidate("geocoding", cache_key)

        await self.rate_limiter.acquire(self.RATE_LIMIT_BUCKET)
        t0 = time.perf_counter()
        try:
            data = await self._fetch_search(q, count, language)
        except ProviderError:
            self._record_call(
                "search",
                "error",
                (time.perf_counter() - t0) * 1000.0,
                cached=False,
            )
            raise

        result = self._parse_search(data, q)
        self.cache.set(
            "geocoding",
            cache_key,
            result.model_dump(),
            ttl_s=self.CACHE_TTL_GEOCODING_S,
        )
        self._record_call(
            "search",
            "ok",
            (time.perf_counter() - t0) * 1000.0,
            cached=False,
        )
        return result

    async def reverse(
        self,
        lat: float,
        lon: float,
        language: str = "en",
    ) -> ReverseResult:
        raise NotImplementedError(
            "OpenMeteoGeocodingProvider non supporta reverse geocoding — "
            "usa NominatimProvider"
        )

    async def health_check(self) -> ProviderHealth:
        t0 = time.perf_counter()
        try:
            async with self._client_ctx(timeout=self.HEALTH_TIMEOUT_S) as client:
                resp = await client.get(
                    self.BASE_URL,
                    params={"name": "Rome", "count": 1},
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
        if self._client is not None:
            return _ReusableClient(self._client)
        return httpx.AsyncClient(timeout=timeout or self.HTTP_TIMEOUT_S)

    async def _fetch_search(
        self,
        query: str,
        count: int,
        language: str,
    ) -> dict[str, Any]:
        params = {
            "name": query,
            "count": count,
            "language": language,
            "format": "json",
        }
        try:
            async with self._client_ctx() as client:
                resp = await client.get(self.BASE_URL, params=params)
        except httpx.TimeoutException as exc:
            raise ProviderTimeoutError(
                f"geocoding search timeout: {exc}", provider=self.name
            ) from exc
        except httpx.HTTPError as exc:
            raise ProviderUnavailableError(
                f"geocoding search network error: {exc}", provider=self.name
            ) from exc

        return _map_status_to_error(resp, self.name)

    def _parse_search(self, data: dict[str, Any], query: str) -> GeocodingResult:
        raw_results: list[dict[str, Any]] = list(data.get("results") or [])
        locations: list[Location] = []
        for r in raw_results:
            try:
                cc = r.get("country_code")
                cc_norm = cc.lower() if isinstance(cc, str) else None
                locations.append(
                    Location(
                        name=str(r.get("name") or ""),
                        lat=float(r.get("latitude", 0.0)),
                        lon=float(r.get("longitude", 0.0)),
                        country=r.get("country"),
                        country_code=cc_norm,
                        admin1=r.get("admin1"),
                        admin2=r.get("admin2"),
                        timezone=r.get("timezone"),
                        population=_safe_int(r.get("population")),
                        elevation=_safe_float_opt(r.get("elevation")),
                        source=self.name,
                    )
                )
            except Exception as exc:
                logger.debug("skip malformed result: %s (%s)", exc, r)
                continue
        return GeocodingResult(query=query, results=locations)


def _safe_int(v: Any) -> int | None:
    if v is None:
        return None
    try:
        return int(v)
    except (TypeError, ValueError):
        return None


def _safe_float_opt(v: Any) -> float | None:
    if v is None:
        return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return None
