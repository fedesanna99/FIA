"""Token bucket rate limiter + backoff helper (Sprint 1 — F3).

Bucket pre-registrati al boot per i provider che useremo in Sprint 2:
  - nominatim (1 req/s)
  - usgs_earthquake (0.5 req/s)
  - open_meteo (10 req/s)

Esempio:
    await limiter.acquire("nominatim")
    return await limiter.with_backoff("nominatim", lambda: client.get(...))
"""
from __future__ import annotations

import asyncio
import time
from dataclasses import dataclass, field
from typing import Any, Awaitable, Callable, TypeVar


T = TypeVar("T")


@dataclass
class TokenBucket:
    rate_per_s: float
    capacity: float
    tokens: float = field(init=False)
    last_refill: float = field(init=False)

    def __post_init__(self) -> None:
        if self.rate_per_s <= 0:
            raise ValueError("rate_per_s deve essere > 0")
        if self.capacity <= 0:
            raise ValueError("capacity deve essere > 0")
        self.tokens = float(self.capacity)
        self.last_refill = time.monotonic()

    def _refill(self) -> None:
        now = time.monotonic()
        dt = now - self.last_refill
        if dt > 0:
            self.tokens = min(self.capacity, self.tokens + dt * self.rate_per_s)
            self.last_refill = now

    async def acquire(self, n: float = 1.0) -> None:
        """Attende finche' ci sono `n` token, poi li consuma."""
        if n <= 0:
            return
        while True:
            self._refill()
            if self.tokens >= n:
                self.tokens -= n
                return
            deficit = n - self.tokens
            wait = deficit / self.rate_per_s
            # Piccola guardia per evitare sleep <= 0 in caso di race.
            await asyncio.sleep(max(wait, 0.001))


class RateLimiterError(Exception):
    """Errore base del rate limiter."""


class _HTTPStatusErrorLike(Exception):
    """Stand-in per `httpx.HTTPStatusError` quando httpx non e' importabile.

    `with_backoff` controlla `getattr(exc, "response", None).status_code` per
    determinare se applicare il retry su 429/5xx.
    """


def _is_retryable_status(exc: BaseException) -> bool:
    """True se l'eccezione e' un HTTPStatusError 429 o 5xx."""
    resp = getattr(exc, "response", None)
    status = getattr(resp, "status_code", None)
    if status is None:
        return False
    return status == 429 or 500 <= status < 600


class RateLimiter:
    """Manager di token bucket multipli per dominio."""

    def __init__(self) -> None:
        self._buckets: dict[str, TokenBucket] = {}

    def register(self, name: str, rate_per_s: float, capacity: float | None = None) -> TokenBucket:
        bucket = TokenBucket(
            rate_per_s=rate_per_s,
            capacity=capacity if capacity is not None else max(rate_per_s * 2.0, 1.0),
        )
        self._buckets[name] = bucket
        return bucket

    def has(self, name: str) -> bool:
        return name in self._buckets

    def get(self, name: str) -> TokenBucket:
        if name not in self._buckets:
            raise KeyError(f"Bucket {name!r} non registrato")
        return self._buckets[name]

    async def acquire(self, name: str, n: float = 1.0) -> None:
        bucket = self.get(name)
        await bucket.acquire(n)

    async def with_backoff(
        self,
        name: str,
        fn: Callable[[], Awaitable[T]],
        max_retries: int = 3,
        initial_delay: float = 1.0,
        max_delay: float = 30.0,
        backoff_factor: float = 2.0,
    ) -> T:
        """Esegue `fn()` rispettando il rate limit + retry esponenziale.

        Retry su:
          - eccezione con `.response.status_code` in (429, 5xx)
        Si arrende dopo `max_retries` tentativi ri-sollevando l'ultima eccezione.
        """
        delay = max(initial_delay, 0.001)
        attempts = 0
        last_exc: BaseException | None = None
        while True:
            await self.acquire(name)
            try:
                return await fn()
            except BaseException as exc:  # noqa: BLE001
                if not _is_retryable_status(exc):
                    raise
                last_exc = exc
                attempts += 1
                if attempts > max_retries:
                    break
                await asyncio.sleep(min(delay, max_delay))
                delay = min(delay * backoff_factor, max_delay)
        assert last_exc is not None
        raise last_exc

    def clear(self) -> None:
        self._buckets.clear()


# Singleton + bucket pre-registrati (Sprint 2 sblocco).
limiter = RateLimiter()
limiter.register("nominatim", rate_per_s=1.0, capacity=2.0)
limiter.register("usgs_earthquake", rate_per_s=0.5, capacity=5.0)
limiter.register("open_meteo", rate_per_s=10.0, capacity=20.0)
