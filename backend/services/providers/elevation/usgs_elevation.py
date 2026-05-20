"""USGSElevationProvider (Sprint 2 — F4.3).

Endpoint: https://epqs.nationalmap.gov/v1/json
Source: USGS National Elevation Dataset (NED), alta risoluzione (1-3m).
Copertura: SOLO US (incluso Alaska, Hawaii, territori).

Per location fuori US, ritorna "value" speciale -1000000 o similare.
Il provider mappa questo a ProviderError per consentire al fallback chain
F8 di skippare.
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
from .types import ElevationPoint


logger = logging.getLogger(__name__)


# Soglia: USGS ritorna -1000000 (o simile) per punti fuori dataset US.
# Tipicamente l'Italia non e' coperta; questo ci protegge se l'orchestratore
# manda accidentalmente coordinate non-US.
USGS_NODATA_THRESHOLD = -100000.0


class USGSElevationProvider(ElevationProvider):
    """Provider USGS EPQS (US-only, alta precisione)."""

    name: ClassVar[str] = "usgs_elevation"

    BASE_URL: ClassVar[str] = "https://epqs.nationalmap.gov/v1/json"
    RATE_LIMIT_BUCKET: ClassVar[str] = "usgs_elevation"
    CACHE_TTL_ELEVATION_S: ClassVar[int] = 10 * 365 * 24 * 3600
    HTTP_TIMEOUT_S: ClassVar[float] = 10.0
    HEALTH_TIMEOUT_S: ClassVar[float] = 5.0

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
            data = await self._fetch(lat_r, lon_r)
        except ProviderError:
            self._record_call(
                "lookup",
                "error",
                (time.perf_counter() - t0) * 1000.0,
                cached=False,
            )
            raise

        point = self._parse(data, lat_r, lon_r)
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

    async def health_check(self) -> ProviderHealth:
        """Probe con coordinate US note (Washington DC ~38.9, -77.0)."""
        t0 = time.perf_counter()
        try:
            async with self._client_ctx(timeout=self.HEALTH_TIMEOUT_S) as client:
                resp = await client.get(
                    self.BASE_URL,
                    params={
                        "x": -77.0365,
                        "y": 38.8977,
                        "wkid": 4326,
                        "units": "Meters",
                        "includeDate": "false",
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
            status: Any = "ok" if latency_ms < 2500 else "degraded"
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

    async def _fetch(self, lat: float, lon: float) -> dict[str, Any]:
        params = {
            "x": f"{lon:.5f}",
            "y": f"{lat:.5f}",
            "wkid": 4326,
            "units": "Meters",
            "includeDate": "false",
        }
        try:
            async with self._client_ctx() as client:
                resp = await client.get(self.BASE_URL, params=params)
        except httpx.TimeoutException as exc:
            raise ProviderTimeoutError(
                f"usgs timeout: {exc}", provider=self.name
            ) from exc
        except httpx.HTTPError as exc:
            raise ProviderUnavailableError(
                f"usgs network error: {exc}", provider=self.name
            ) from exc

        return _map_status_to_error(resp, self.name)

    def _parse(
        self,
        data: dict[str, Any],
        lat_in: float,
        lon_in: float,
    ) -> ElevationPoint:
        raw_value = data.get("value")
        if raw_value is None:
            raise ProviderError(
                "usgs: response missing 'value' field",
                provider=self.name,
            )
        try:
            elev = float(raw_value)
        except (TypeError, ValueError) as exc:
            raise ProviderError(
                f"usgs: cannot parse value {raw_value!r}",
                provider=self.name,
            ) from exc

        if elev <= USGS_NODATA_THRESHOLD:
            raise ProviderError(
                f"usgs: no data at ({lat_in:.5f}, {lon_in:.5f}) — "
                f"likely outside US coverage (value={elev})",
                provider=self.name,
            )

        # USGS ritorna location.x/y se incluso, ma per coerenza usiamo input
        loc = data.get("location") or {}
        try:
            actual_lat = float(loc.get("y", lat_in))
            actual_lon = float(loc.get("x", lon_in))
        except (TypeError, ValueError):
            actual_lat = lat_in
            actual_lon = lon_in

        return ElevationPoint(
            lat=actual_lat,
            lon=actual_lon,
            elevation_m=elev,
            source=self.name,
        )
