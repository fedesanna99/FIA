"""Sistema quote utente con cap mensile (Sprint 1 — A3).

Persistenza JSON in `.quotas/quotas.json` (gitignored). Reset automatico al
cambio del mese (`YYYY-MM`).
"""
from __future__ import annotations

import json
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, Field


QUOTAS_FILE: Path = Path(".quotas/quotas.json")

Tier = Literal["free", "starter", "pro", "enterprise"]

# enterprise: float("inf") non serializzabile in JSON --> usiamo un sentinel grande.
_ENTERPRISE_CAP = 1.0e12
TIER_CAPS: dict[str, float] = {
    "free": 50.0,
    "starter": 500.0,
    "pro": 5000.0,
    "enterprise": _ENTERPRISE_CAP,
}


def _current_month() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m")


class UserQuota(BaseModel):
    user_id: str
    tier: Tier = "free"
    month: str = Field(default_factory=_current_month)
    used_credits: float = 0.0
    cap_credits: float
    bonus_credits: float = 0.0


class QuotaExceeded(Exception):
    def __init__(self, current: float, requested: float, cap: float) -> None:
        self.current = float(current)
        self.requested = float(requested)
        self.cap = float(cap)
        super().__init__(
            f"Quota esaurita: used={current:.2f} + requested={requested:.2f} > cap={cap:.2f}"
        )


class QuotaStore:
    """Persistenza JSON delle quote utente. Reentrant lock per concorrenza in-process."""

    def __init__(self, path: Path | None = None) -> None:
        self.path = Path(path) if path is not None else QUOTAS_FILE
        self._lock = threading.RLock()

    # ----- persistenza (no lock interno) ---------------------------------
    def _read_all(self) -> dict[str, dict]:
        if not self.path.exists():
            return {}
        try:
            return json.loads(self.path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            return {}

    def _write_all(self, data: dict[str, dict]) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        tmp = self.path.with_suffix(self.path.suffix + ".tmp")
        tmp.write_text(json.dumps(data, indent=2, default=str), encoding="utf-8")
        tmp.replace(self.path)

    def _get_unlocked(self, data: dict[str, dict], user_id: str) -> tuple[UserQuota, bool]:
        """Restituisce la UserQuota corrente + flag `mutated` se serve flush.

        Crea record se assente, ri-emette al cambio del mese, sincronizza il
        cap col tier.
        """
        month = _current_month()
        raw = data.get(user_id)
        mutated = False
        if raw is None:
            q = UserQuota(
                user_id=user_id,
                tier="free",
                month=month,
                cap_credits=TIER_CAPS["free"],
                bonus_credits=0.0,
                used_credits=0.0,
            )
            data[user_id] = q.model_dump()
            return q, True
        # auto-reset al cambio mese
        if raw.get("month") != month:
            tier = raw.get("tier", "free")
            q = UserQuota(
                user_id=user_id,
                tier=tier,
                month=month,
                cap_credits=TIER_CAPS.get(tier, TIER_CAPS["free"]),
                bonus_credits=0.0,
                used_credits=0.0,
            )
            data[user_id] = q.model_dump()
            return q, True
        return UserQuota(**raw), False

    # ----- public --------------------------------------------------------
    def get(self, user_id: str) -> UserQuota:
        with self._lock:
            data = self._read_all()
            q, mutated = self._get_unlocked(data, user_id)
            if mutated:
                self._write_all(data)
            return q

    def consume(self, user_id: str, credits: float) -> UserQuota:
        if credits < 0:
            raise ValueError("credits deve essere >= 0")
        with self._lock:
            data = self._read_all()
            q, _ = self._get_unlocked(data, user_id)
            cap_total = q.cap_credits + q.bonus_credits
            new_used = q.used_credits + credits
            if new_used > cap_total + 1e-9:
                raise QuotaExceeded(q.used_credits, credits, cap_total)
            q.used_credits = new_used
            data[user_id] = q.model_dump()
            self._write_all(data)
            return q

    def set_tier(self, user_id: str, tier: Tier) -> UserQuota:
        if tier not in TIER_CAPS:
            raise ValueError(f"Tier sconosciuto: {tier!r}")
        with self._lock:
            data = self._read_all()
            q, _ = self._get_unlocked(data, user_id)
            q.tier = tier
            q.cap_credits = TIER_CAPS[tier]
            data[user_id] = q.model_dump()
            self._write_all(data)
            return q

    def reset_month(self, user_id: str) -> UserQuota:
        with self._lock:
            data = self._read_all()
            q, _ = self._get_unlocked(data, user_id)
            q.month = _current_month()
            q.used_credits = 0.0
            q.bonus_credits = 0.0
            q.cap_credits = TIER_CAPS.get(q.tier, TIER_CAPS["free"])
            data[user_id] = q.model_dump()
            self._write_all(data)
            return q

    def add_bonus(self, user_id: str, credits: float) -> UserQuota:
        with self._lock:
            data = self._read_all()
            q, _ = self._get_unlocked(data, user_id)
            q.bonus_credits = float(q.bonus_credits) + float(credits)
            data[user_id] = q.model_dump()
            self._write_all(data)
            return q


# Singleton process-wide
quota_store = QuotaStore()
