"""OpenElevationProvider (Sprint 2 — F4.3).

Endpoint: https://api.open-elevation.com/api/v1/lookup
Licenza: free, no API key. Reliability mediocre (puo' essere lento/down).

Caratteristiche:
    - copertura mondiale (dataset SRTM 30m + altri)
    - supporto batch via POST con JSON body `{"locations": [...]}`
    - single-point via GET `?locations=lat,lon`
    - cache TTL 10 anni (dominio "elevation")
    - rate limit bucket "open_elevation" (5 rps, registrato in __init__.py)
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
from ..meteo.open_meteo_forecast import _ReusableClient, _map_status_to_error
from ..meteo.types import ProviderHealth
from .base import ElevationProvider
from .types import ElevationPoint, ElevationResult


logger = logging.getLogger(__name__)


class OpenElevationProvider(ElevationProvider):
    """Provider Open-Elevation (worldwide, batch via POST)."""

    name: ClassVar[str] = "open_elevation"

    BASE_URL: ClassVar[str] = "https://api.open-elevation.com/api/v1/lookup"
    RATE_LIMIT_BUCKET: ClassVar[str] = "open_elevation"
    CACHE_TTL_ELEVATION_S: ClassVar[int] = 10 * 365 * 24 * 3600
    HTTP_TIMEOUT_S: ClassVar[float] = 15.0
    HEALTH_TIMEOUT_S: ClassVar[float] = 5.0
    MAX_BATCH: ClassVar[int] = 1000  # limite open-elevation per request

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

    def _record_call(
        self,
        endpoint: str,
        status: str,
        latency_ms: float,
        cached: bool,
    ) -> None:
        """No-op stub per F6."""

    # ---- public ----------------------------------------------------------
    async def lookup(self, lat: float, lon: float) -> ElevationPoint:
        lat_r = round(float(lat), 5)
        lon_r = round(float(lon), 5)
        cache_key = f"{self.name}:{lat_r:.5f}:{lon_r:.5f}"

        cached = self.cache.get("elevation", cache_key)
        if cached is not None:
            self._record_call("lookup", "cache_hit", 0.0, cached=True)
            try:
                return ElevationPoint.model_validate(cached)
            except Exception:
                self.cache.invalidate("elevation", cache_key)

        await self.rate_limiter.acquire(self.RATE_LIMIT_BUCKET)
        t0 = time.perf_counter()
        try:
            data = await self._fetch_single(lat_r, lon_r)
        except ProviderError:
            self._record_call(
                "lookup",
                "error",
                (time.perf_counter() - t0) * 1000.0,
                cached=False,
            )
            raise

        point = self._parse_single(data, lat_r, lon_r)
        self.cache.set(
            "elevation",
            cache_key,
            point.model_dump(),
            ttl_s=self.CACHE_TTL_ELEVATION_S,
        )
        self._record_call(
            "lookup",
            "ok",
            (time.perf_counter() - t0) * 1000.0,
            cached=False,
        )
        return point

    async def lookup_batch(
        self,
        points: list[tuple[float, float]],
    ) -> ElevationResult:
        if not points:
            return ElevationResult(points=[], source=self.name)
        if len(points) > self.MAX_BATCH:
            raise ValueError(
                f"batch troppo grande: {len(points)} > {self.MAX_BATCH}"
            )

        # Tenta cache hit per ogni punto; raccoglie quelli da fetchare.
        to_fetch: list[tuple[int, float, float, str]] = []  # (idx, lat, lon, cache_key)
        results: list[ElevationPoint | None] = [None] * len(points)
        for i, (lat, lon) in enumerate(points):
            lat_r = round(float(lat), 5)
            lon_r = round(float(lon), 5)
            cache_key = f"{self.name}:{lat_r:.5f}:{lon_r:.5f}"
            cached = self.cache.get("elevation", cache_key)
            if cached is not None:
                try:
                    results[i] = ElevationPoint.model_validate(cached)
                    continue
                except Exception:
                    self.cache.invalidate("elevation", cache_key)
            to_fetch.append((i, lat_r, lon_r, cache_key))

        if to_fetch:
            await self.rate_limiter.acquire(self.RATE_LIMIT_BUCKET)
            t0 = time.perf_counter()
            try:
                data = await self._fetch_batch(
                    [(lat, lon) for _, lat, lon, _ in to_fetch]
                )
            except ProviderError:
                self._record_call(
                    "lookup_batch",
                    "error",
                    (time.perf_counter() - t0) * 1000.0,
                    cached=False,
                )
                raise

            raw_results = data.get("results") or []
            for n, (idx, lat_r, lon_r, ck) in enumerate(to_fetch):
                point = self._parse_batch_item(raw_results, n, lat_r, lon_r)
                results[idx] = point
                self.cache.set(
                    "elevation",
                    ck,
                    point.model_dump(),
                    ttl_s=self.CACHE_TTL_ELEVATION_S,
                )
            self._record_call(
                "lookup_batch",
                "ok",
                (time.perf_counter() - t0) * 1000.0,
                cached=False,
            )

        return ElevationResult(
            points=[p for p in results if p is not None],
            source=self.name,
        )

    async def health_check(self) -> ProviderHealth:
        t0 = time.perf_counter()
        try:
            async with self._client_ctx(timeout=self.HEALTH_TIMEOUT_S) as client:
                resp = await client.get(
                    self.BASE_URL, params={"locations": "0,0"}
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
            status: Any = "ok" if latency_ms < 3000 else "degraded"
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

    async def _fetch_single(self, lat: float, lon: float) -> dict[str, Any]:
        params = {"locations": f"{lat:.5f},{lon:.5f}"}
        try:
            async with self._client_ctx() as client:
                resp = await client.get(self.BASE_URL, params=params)
        except httpx.TimeoutException as exc:
            raise ProviderTimeoutError(
                f"open-elevation timeout: {exc}", provider=self.name
            ) from exc
        except httpx.HTTPError as exc:
            raise ProviderUnavailableError(
                f"open-elevation network error: {exc}", provider=self.name
            ) from exc
        return _map_status_to_error(resp, self.name)

    async def _fetch_batch(
        self,
        points: list[tuple[float, float]],
    ) -> dict[str, Any]:
        body = {
            "locations": [
                {"latitude": float(lat), "longitude": float(lon)}
                for lat, lon in points
            ]
        }
        try:
            async with self._client_ctx() as client:
                resp = await client.post(self.BASE_URL, json=body)
        except httpx.TimeoutException as exc:
            raise ProviderTimeoutError(
                f"open-elevation batch timeout: {exc}", provider=self.name
            ) from exc
        except httpx.HTTPError as exc:
            raise ProviderUnavailableError(
                f"open-elevation batch network error: {exc}", provider=self.name
            ) from exc
        return _map_status_to_error(resp, self.name)

    def _parse_single(
        self,
        data: dict[str, Any],
        lat_in: float,
        lon_in: float,
    ) -> ElevationPoint:
        results = data.get("results") or []
        if not results:
            raise ProviderError(
                "open-elevation: empty results", provider=self.name
            )
        r = results[0]
        return ElevationPoint(
            lat=float(r.get("latitude", lat_in)),
            lon=float(r.get("longitude", lon_in)),
            elevation_m=float(r.get("elevation", 0.0)),
            source=self.name,
        )

    def _parse_batch_item(
        self,
        all_results: list[dict[str, Any]],
        idx: int,
        lat_in: float,
        lon_in: float,
    ) -> ElevationPoint:
        if idx >= len(all_results):
            raise ProviderError(
                f"open-elevation batch returned {len(all_results)} results but expected at least {idx+1}",
                provider=self.name,
            )
        r = all_results[idx]
        return ElevationPoint(
            lat=float(r.get("latitude", lat_in)),
            lon=float(r.get("longitude", lon_in)),
            elevation_m=float(r.get("elevation", 0.0)),
            source=self.name,
        )
