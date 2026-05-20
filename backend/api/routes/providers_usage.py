"""Endpoint observability provider F6 — `/api/providers/usage/...`.

Espone aggregati + timeline del tracker `services.usage_tracker.tracker`.
Useful per dashboard admin: cache hit rate per provider, error rate,
latency p50/p95 (futuro), volume timeline.

NOTA: prefisso `/api/providers/usage` per evitare collisione con
`/api/usage/{user_id}/summary` di Sprint 1 (FastAPI matcherebbe
`providers` come `user_id`).
"""
from __future__ import annotations

import time
from typing import Any, Literal

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

from services.usage_tracker import tracker


router = APIRouter()


class ProviderUsageRow(BaseModel):
    domain: str
    provider: str
    endpoint: str
    n_calls: int
    n_cache_hits: int
    n_errors: int
    cache_hit_ratio: float
    error_ratio: float
    avg_latency_ms: float
    total_latency_ms: float
    last_call_ts: int


class ProviderUsageSummary(BaseModel):
    window_days: int
    domain: str | None = None
    provider: str | None = None
    user_id: str | None = None
    rows: list[ProviderUsageRow] = Field(default_factory=list)
    totals: dict[str, Any] = Field(default_factory=dict)


class TimelineBinModel(BaseModel):
    bin_start_ts: int
    n_calls: int
    n_cache_hits: int
    n_errors: int
    avg_latency_ms: float


class ProviderUsageTimeline(BaseModel):
    granularity: Literal["hour", "day", "week"]
    window_days: int
    domain: str | None = None
    provider: str | None = None
    bins: list[TimelineBinModel] = Field(default_factory=list)


def _since_ms_from_window(window_days: int) -> int:
    return int(time.time() * 1000) - int(window_days) * 86400 * 1000


@router.get("/summary", response_model=ProviderUsageSummary)
def providers_usage_summary(
    domain: str | None = Query(default=None),
    provider: str | None = Query(default=None),
    endpoint: str | None = Query(default=None),
    user_id: str | None = Query(default=None),
    window_days: int = Query(default=30, ge=1, le=3650),
) -> ProviderUsageSummary:
    """Aggregato chiamate provider per (domain, provider, endpoint).

    Filtri:
        - domain         (es. "meteo", "geocoding")
        - provider       (es. "open_meteo_forecast")
        - endpoint       (es. "forecast", "search", "lookup")
        - user_id        (multi-tenancy futura)
        - window_days    finestra in giorni (default 30)
    """
    since = _since_ms_from_window(window_days)
    stats = tracker.aggregate(
        domain=domain,
        provider=provider,
        endpoint=endpoint,
        since_ts=since,
        user_id=user_id,
    )
    rows = [ProviderUsageRow(**s.to_dict()) for s in stats]
    n_calls_total = sum(r.n_calls for r in rows)
    n_hits_total = sum(r.n_cache_hits for r in rows)
    n_err_total = sum(r.n_errors for r in rows)
    totals: dict[str, Any] = {
        "n_calls": n_calls_total,
        "n_cache_hits": n_hits_total,
        "n_errors": n_err_total,
        "cache_hit_ratio": (
            round(n_hits_total / n_calls_total, 4) if n_calls_total > 0 else 0.0
        ),
        "error_ratio": (
            round(n_err_total / n_calls_total, 4) if n_calls_total > 0 else 0.0
        ),
    }
    return ProviderUsageSummary(
        window_days=window_days,
        domain=domain,
        provider=provider,
        user_id=user_id,
        rows=rows,
        totals=totals,
    )


@router.get("/timeline", response_model=ProviderUsageTimeline)
def providers_usage_timeline(
    granularity: Literal["hour", "day", "week"] = Query(default="day"),
    domain: str | None = Query(default=None),
    provider: str | None = Query(default=None),
    user_id: str | None = Query(default=None),
    window_days: int = Query(default=7, ge=1, le=3650),
) -> ProviderUsageTimeline:
    """Timeline chiamate provider (bin = hour/day/week)."""
    since = _since_ms_from_window(window_days)
    bins = tracker.timeline(
        granularity=granularity,
        domain=domain,
        provider=provider,
        since_ts=since,
        user_id=user_id,
    )
    return ProviderUsageTimeline(
        granularity=granularity,
        window_days=window_days,
        domain=domain,
        provider=provider,
        bins=[TimelineBinModel(**b.to_dict()) for b in bins],
    )


@router.get("/health")
def providers_usage_health() -> dict[str, Any]:
    """Sanity: totale record, range temporale, breakdown per domain."""
    return tracker.health()
