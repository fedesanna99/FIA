"""Endpoint admin per /api/quotas (Sprint 1 — A3)."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from billing.quotas import Tier, UserQuota, quota_store


router = APIRouter()


class SetTierRequest(BaseModel):
    tier: Tier


class AddBonusRequest(BaseModel):
    credits: float


@router.get("/{user_id}", response_model=UserQuota)
def get_quota(user_id: str) -> UserQuota:
    return quota_store.get(user_id)


@router.post("/{user_id}/tier", response_model=UserQuota)
def set_tier(user_id: str, req: SetTierRequest) -> UserQuota:
    try:
        return quota_store.set_tier(user_id, req.tier)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/{user_id}/reset", response_model=UserQuota)
def reset_quota(user_id: str) -> UserQuota:
    return quota_store.reset_month(user_id)


@router.post("/{user_id}/bonus", response_model=UserQuota)
def add_bonus(user_id: str, req: AddBonusRequest) -> UserQuota:
    if req.credits < 0:
        raise HTTPException(400, "credits deve essere >= 0")
    return quota_store.add_bonus(user_id, req.credits)
