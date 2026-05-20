"""NominatimProvider (Sprint 2 — F4.2).

Endpoint: https://nominatim.openstreetmap.org
    /search   — forward geocoding
    /reverse  — reverse geocoding

Vincoli operativi Nominatim (usage policy):
    - User-Agent identificativo OBBLIGATORIO (no UA -> 403)
    - rate limit 1 rps STRICT (bucket "nominatim" gia' pre-registrato in F3)
    - cache TTL 1 anno (locations sono stabili)
    - per >1000 req/day si raccomanda self-hosting

User-Agent default: "FEA-Pro/1.3 (https://github.com/fedesanna99/FIA)"
Override via env var `FEAPRO_NOMINATIM_USER_AGENT`.
"""
from __future__ import annotations

import logging
import os
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


DEFAULT_USER_AGENT = "FEA-Pro/1.3 (https://github.com/fedesanna99/FIA)"


class NominatimProvider(GeocodingProvider):
    """Provider OpenStreetMap Nominatim (search + reverse)."""

    name: ClassVar[str] = "nominatim"

    BASE_URL: ClassVar[str] = "https://nominatim.openstreetmap.org"
    SEARCH_PATH: ClassVar[str] = "/search"
    REVERSE_PATH: ClassVar[str] = "/reverse"
    RATE_LIMIT_BUCKET: ClassVar[str] = "nominatim"
    CACHE_TTL_GEOCODING_S: ClassVar[int] = 365 * 24 * 3600
    HTTP_TIMEOUT_S: ClassVar[float] = 10.0
    HEALTH_TIMEOUT_S: ClassVar[float] = 5.0
    MAX_COUNT: ClassVar[int] = 50  # nominatim hard limit

    def __init__(
        self,
        cache: ServiceCache | None = None,
        rate_limiter: RateLimiter | None = None,
        client: httpx.AsyncClient | None = None,
        user_agent: str | None = None,
    ) -> None:
        super().__init__()
        self.cache = cache if cache is not None else default_cache
        self.rate_limiter = rate_limiter if rate_limiter is not None else default_limiter
        self._client = client
        self.user_agent = (
            user_agent
            or os.environ.get("FEAPRO_NOMINATIM_USER_AGENT")
            or DEFAULT_USER_AGENT
        )

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
            data_list = await self._fetch_search(q, count, language)
        except ProviderError:
            self._record_call(
                "search",
                "error",
                (time.perf_counter() - t0) * 1000.0,
                cached=False,
            )
            raise

        result = self._parse_search(data_list, q)
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
        lat_r = round(float(lat), 5)  # ~1 m precisione, basta per cache
        lon_r = round(float(lon), 5)
        cache_key = f"{self.name}:reverse:{lat_r:.5f}:{lon_r:.5f}:{language}"

        cached = self.cache.get("geocoding", cache_key)
        if cached is not None:
            self._record_call("reverse", "cache_hit", 0.0, cached=True)
            try:
                return ReverseResult.model_validate(cached)
            except Exception:
                self.cache.invalidate("geocoding", cache_key)

        await self.rate_limiter.acquire(self.RATE_LIMIT_BUCKET)
        t0 = time.perf_counter()
        try:
            data = await self._fetch_reverse(lat_r, lon_r, language)
        except ProviderError:
            self._record_call(
                "reverse",
                "error",
                (time.perf_counter() - t0) * 1000.0,
                cached=False,
            )
            raise

        result = self._parse_reverse(data, lat_r, lon_r)
        self.cache.set(
            "geocoding",
            cache_key,
            result.model_dump(),
            ttl_s=self.CACHE_TTL_GEOCODING_S,
        )
        self._record_call(
            "reverse",
            "ok",
            (time.perf_counter() - t0) * 1000.0,
            cached=False,
        )
        return result

    async def health_check(self) -> ProviderHealth:
        t0 = time.perf_counter()
        try:
            async with self._client_ctx(timeout=self.HEALTH_TIMEOUT_S) as client:
                resp = await client.get(
                    f"{self.BASE_URL}{self.SEARCH_PATH}",
                    params={"q": "Rome", "format": "json", "limit": 1},
                    headers={"User-Agent": self.user_agent},
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

    async def _fetch_search(
        self,
        query: str,
        count: int,
        language: str,
    ) -> list[dict[str, Any]]:
        params = {
            "q": query,
            "format": "json",
            "limit": count,
            "addressdetails": 1,
            "accept-language": language,
        }
        headers = {"User-Agent": self.user_agent}
        try:
            async with self._client_ctx() as client:
                resp = await client.get(
                    f"{self.BASE_URL}{self.SEARCH_PATH}",
                    params=params,
                    headers=headers,
                )
        except httpx.TimeoutException as exc:
            raise ProviderTimeoutError(
                f"nominatim search timeout: {exc}", provider=self.name
            ) from exc
        except httpx.HTTPError as exc:
            raise ProviderUnavailableError(
                f"nominatim network error: {exc}", provider=self.name
            ) from exc

        # Nominatim ritorna sempre lista JSON (anche vuota); usiamo
        # _map_status_to_error per gli errori e poi parsiamo manualmente
        # poiche' restituisce LIST e non DICT.
        code = resp.status_code
        if 200 <= code < 300:
            try:
                payload = resp.json()
            except Exception as exc:
                raise ProviderError(
                    f"nominatim response not JSON: {exc}",
                    provider=self.name,
                    status=code,
                ) from exc
            if not isinstance(payload, list):
                raise ProviderError(
                    f"nominatim search expected list, got {type(payload).__name__}",
                    provider=self.name,
                    status=code,
                )
            return [dict(x) for x in payload]
        # Riutilizza il mapper degli errori (gestisce 429/5xx/4xx).
        _map_status_to_error(resp, self.name)
        return []  # mai raggiunto: _map_status_to_error solleva sempre

    async def _fetch_reverse(
        self,
        lat: float,
        lon: float,
        language: str,
    ) -> dict[str, Any]:
        params = {
            "lat": f"{lat:.5f}",
            "lon": f"{lon:.5f}",
            "format": "json",
            "addressdetails": 1,
            "accept-language": language,
        }
        headers = {"User-Agent": self.user_agent}
        try:
            async with self._client_ctx() as client:
                resp = await client.get(
                    f"{self.BASE_URL}{self.REVERSE_PATH}",
                    params=params,
                    headers=headers,
                )
        except httpx.TimeoutException as exc:
            raise ProviderTimeoutError(
                f"nominatim reverse timeout: {exc}", provider=self.name
            ) from exc
        except httpx.HTTPError as exc:
            raise ProviderUnavailableError(
                f"nominatim network error: {exc}", provider=self.name
            ) from exc

        return _map_status_to_error(resp, self.name)

    def _parse_search(
        self,
        items: list[dict[str, Any]],
        query: str,
    ) -> GeocodingResult:
        locations: list[Location] = []
        for r in items:
            try:
                addr = r.get("address") or {}
                country_code = addr.get("country_code")
                cc_norm = country_code.lower() if isinstance(country_code, str) else None
                # admin1 = state, admin2 = county/province
                admin1 = (
                    addr.get("state")
                    or addr.get("region")
                    or addr.get("province")
                )
                admin2 = addr.get("county") or addr.get("city_district")
                locations.append(
                    Location(
                        name=str(r.get("display_name") or r.get("name") or ""),
                        lat=float(r.get("lat", 0.0)),
                        lon=float(r.get("lon", 0.0)),
                        country=addr.get("country"),
                        country_code=cc_norm,
                        admin1=admin1,
                        admin2=admin2,
                        timezone=None,
                        population=None,
                        elevation=None,
                        source=self.name,
                    )
                )
            except Exception as exc:
                logger.debug("skip malformed nominatim result: %s (%s)", exc, r)
                continue
        return GeocodingResult(query=query, results=locations)

    def _parse_reverse(
        self,
        data: dict[str, Any],
        lat: float,
        lon: float,
    ) -> ReverseResult:
        if not data or "error" in data:
            return ReverseResult(lat=lat, lon=lon, location=None)
        addr = data.get("address") or {}
        country_code = addr.get("country_code")
        cc_norm = country_code.lower() if isinstance(country_code, str) else None
        admin1 = addr.get("state") or addr.get("region")
        admin2 = addr.get("county") or addr.get("city_district")
        loc = Location(
            name=str(data.get("display_name") or ""),
            lat=float(data.get("lat", lat)),
            lon=float(data.get("lon", lon)),
            country=addr.get("country"),
            country_code=cc_norm,
            admin1=admin1,
            admin2=admin2,
            timezone=None,
            source=self.name,
        )
        return ReverseResult(lat=lat, lon=lon, location=loc)
