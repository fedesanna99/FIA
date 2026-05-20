"""Middleware billing (Sprint 1 — A3).

Funzione `check_quota_for_solve(user_id, estimate)` da chiamare PRIMA del solve.
Solleva HTTPException 402 con payload strutturato se il cap sarebbe superato.
"""
from __future__ import annotations

from fastapi import HTTPException

from .quotas import QuotaStore, quota_store as _global_store
from .schemas import CostEstimate


def check_quota_for_solve(
    user_id: str,
    estimate: CostEstimate,
    store: QuotaStore | None = None,
) -> None:
    """Solleva HTTP 402 Payment Required se cap < used + estimate.credits."""
    s = store if store is not None else _global_store
    quota = s.get(user_id)
    cap_total = quota.cap_credits + quota.bonus_credits
    if quota.used_credits + estimate.credits > cap_total + 1e-9:
        raise HTTPException(
            status_code=402,
            detail={
                "code": "quota_exceeded",
                "user_id": user_id,
                "tier": quota.tier,
                "used": float(quota.used_credits),
                "cap": float(cap_total),
                "requested": float(estimate.credits),
            },
        )
