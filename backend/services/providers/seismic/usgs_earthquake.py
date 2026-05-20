"""USGSEarthquakeProvider (Sprint 2 — F4.4).

Endpoint: https://earthquake.usgs.gov/fdsnws/event/1/query
Format:   GeoJSON (default)
Licenza:  USGS public domain, no API key.

Caratteristiche:
    - copertura mondiale, catalogo storico fino al 1900+
    - rate limit bucket "usgs_earthquake" (0.5 rps, pre-registrato in F3)
    - cache TTL 7 giorni (dominio "seismic" — il catalogo aggiunge eventi
      ma quello storico per N anni indietro e' stabile per settimane)
    - timeout 30s (catalogo grande, payload puo' essere lento)
"""
from __future__ import annotations

import logging
import time
from datetime import datetime, timedelta, timezone
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
from .base import SeismicProvider
from .types import Earthquake, EarthquakeResult


logger = logging.getLogger(__name__)


class USGSEarthquakeProvider(SeismicProvider):
    """Provider catalogo USGS FDSN (worldwide)."""

    name: ClassVar[str] = "usgs_earthquake"

    BASE_URL: ClassVar[str] = "https://earthquake.usgs.gov/fdsnws/event/1/query"
    RATE_LIMIT_BUCKET: ClassVar[str] = "usgs_earthquake"
    CACHE_TTL_SEISMIC_S: ClassVar[int] = 7 * 24 * 3600
    HTTP_TIMEOUT_S: ClassVar[float] = 30.0
    HEALTH_TIMEOUT_S: ClassVar[float] = 5.0
    MAX_LIMIT: ClassVar[int] = 20000  # USGS hard limit per request

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

    # ---- public ----------------------------------------------------------
    async def search_nearby(
        self,
        lat: float,
        lon: float,
        max_radius_km: float = 200.0,
        years_back: int = 50,
        min_magnitude: float = 4.0,
        limit: int = 1000,
    ) -> EarthquakeResult:
        if max_radius_km <= 0:
            raise ValueError(f"max_radius_km deve essere > 0, ricevuto {max_radius_km}")
        if not (1 <= years_back <= 200):
            raise ValueError(f"years_back deve essere 1-200, ricevuto {years_back}")
        if not (0.0 <= min_magnitude <= 10.0):
            raise ValueError(
                f"min_magnitude deve essere 0-10, ricevuto {min_magnitude}"
            )
        if not (1 <= limit <= self.MAX_LIMIT):
            raise ValueError(f"limit deve essere 1-{self.MAX_LIMIT}, ricevuto {limit}")

        lat_r = round(float(lat), 4)
        lon_r = round(float(lon), 4)
        cache_key = (
            f"{self.name}:search:{lat_r:.4f}:{lon_r:.4f}:"
            f"{max_radius_km:.0f}:{years_back}:{min_magnitude:.1f}:{limit}"
        )

        cached = self.cache.get("seismic", cache_key)
        if cached is not None:
            self._record_call("search_nearby", "cache_hit", 0.0, cached=True)
            try:
                return EarthquakeResult.model_validate(cached)
            except Exception:
                self.cache.invalidate("seismic", cache_key)

        await self.rate_limiter.acquire(self.RATE_LIMIT_BUCKET)
        t0 = time.perf_counter()
        try:
            data = await self._fetch(
                lat_r, lon_r, max_radius_km, years_back, min_magnitude, limit
            )
        except ProviderError:
            self._record_call(
                "search_nearby",
                "error",
                (time.perf_counter() - t0) * 1000.0,
                cached=False,
            )
            raise

        result = self._parse(data, lat_r, lon_r, max_radius_km, years_back, min_magnitude, limit)
        self.cache.set(
            "seismic",
            cache_key,
            result.model_dump(),
            ttl_s=self.CACHE_TTL_SEISMIC_S,
        )
        self._record_call(
            "search_nearby",
            "ok",
            (time.perf_counter() - t0) * 1000.0,
            cached=False,
        )
        return result

    async def historical_max_magnitude(
        self,
        lat: float,
        lon: float,
        max_radius_km: float = 100.0,
        years_back: int = 100,
    ) -> float:
        """Massima magnitudo storica entro radius/years.

        Riutilizza `search_nearby` internamente con min_magnitude=0
        (per non escludere niente) e limit alto. La cache di search_nearby
        copre anche questo (stessa key se chiamato 2 volte).
        """
        result = await self.search_nearby(
            lat=lat,
            lon=lon,
            max_radius_km=max_radius_km,
            years_back=years_back,
            min_magnitude=0.0,
            limit=20000,
        )
        if not result.earthquakes:
            return 0.0
        return max(eq.magnitude for eq in result.earthquakes)

    async def health_check(self) -> ProviderHealth:
        t0 = time.perf_counter()
        try:
            async with self._client_ctx(timeout=self.HEALTH_TIMEOUT_S) as client:
                # Query minimale: ultimo giorno con M >= 4.5 (sempre poche).
                end = datetime.now(timezone.utc)
                start = end - timedelta(days=1)
                resp = await client.get(
                    self.BASE_URL,
                    params={
                        "format": "geojson",
                        "starttime": start.strftime("%Y-%m-%dT%H:%M:%S"),
                        "endtime": end.strftime("%Y-%m-%dT%H:%M:%S"),
                        "minmagnitude": 4.5,
                        "limit": 1,
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

    async def _fetch(
        self,
        lat: float,
        lon: float,
        max_radius_km: float,
        years_back: int,
        min_magnitude: float,
        limit: int,
    ) -> dict[str, Any]:
        end = datetime.now(timezone.utc)
        start = end - timedelta(days=int(years_back * 365.25))
        params = {
            "format": "geojson",
            "latitude": f"{lat:.4f}",
            "longitude": f"{lon:.4f}",
            "maxradiuskm": float(max_radius_km),
            "starttime": start.strftime("%Y-%m-%dT%H:%M:%S"),
            "endtime": end.strftime("%Y-%m-%dT%H:%M:%S"),
            "minmagnitude": float(min_magnitude),
            "limit": int(limit),
            "orderby": "time",  # decrescente per default
        }
        try:
            async with self._client_ctx() as client:
                resp = await client.get(self.BASE_URL, params=params)
        except httpx.TimeoutException as exc:
            raise ProviderTimeoutError(
                f"usgs earthquake timeout: {exc}", provider=self.name
            ) from exc
        except httpx.HTTPError as exc:
            raise ProviderUnavailableError(
                f"usgs earthquake network error: {exc}", provider=self.name
            ) from exc
        return _map_status_to_error(resp, self.name)

    def _parse(
        self,
        data: dict[str, Any],
        lat: float,
        lon: float,
        max_radius_km: float,
        years_back: int,
        min_magnitude: float,
        limit: int,
    ) -> EarthquakeResult:
        features: list[dict[str, Any]] = list(data.get("features") or [])
        earthquakes: list[Earthquake] = []

        for f in features:
            try:
                props = f.get("properties") or {}
                geom = f.get("geometry") or {}
                coords = geom.get("coordinates") or []
                # USGS: [lon, lat, depth_km]
                if len(coords) < 2:
                    continue
                lon_eq = float(coords[0])
                lat_eq = float(coords[1])
                depth_km = float(coords[2]) if len(coords) >= 3 else 0.0

                mag = props.get("mag")
                if mag is None:
                    continue  # eventi senza magnitudo skippati
                magnitude = float(mag)

                t_ms = props.get("time")
                if t_ms is not None:
                    t_iso = datetime.fromtimestamp(
                        int(t_ms) / 1000.0, tz=timezone.utc
                    ).strftime("%Y-%m-%dT%H:%M:%S.%fZ")[:-4] + "Z"  # ms precision
                else:
                    t_iso = ""

                earthquakes.append(
                    Earthquake(
                        id=str(f.get("id") or ""),
                        time_iso=t_iso,
                        lat=lat_eq,
                        lon=lon_eq,
                        depth_km=depth_km,
                        magnitude=magnitude,
                        place=str(props.get("place") or ""),
                        event_type=str(props.get("type") or "earthquake"),
                        url=props.get("url"),
                        source=self.name,
                    )
                )
            except Exception as exc:
                logger.debug("skip malformed earthquake feature: %s (%s)", exc, f)
                continue

        return EarthquakeResult(
            query={
                "lat": lat,
                "lon": lon,
                "max_radius_km": max_radius_km,
                "years_back": years_back,
                "min_magnitude": min_magnitude,
                "limit": limit,
            },
            earthquakes=earthquakes,
            source=self.name,
            count=len(earthquakes),
        )
