"""JWT (RFC 7519) bearer tokens via PyJWT.

Secret key: env var `FEAPRO_JWT_SECRET`. In dev se non set, usa un default
INSECURE che logga warning — in produzione Fly.io e' obbligatorio settarlo.
"""
from __future__ import annotations

import datetime as _dt
import logging
import os
from typing import Any

import jwt

logger = logging.getLogger(__name__)


_DEFAULT_INSECURE_SECRET = "INSECURE-DEV-SECRET-DO-NOT-USE-IN-PRODUCTION"
_ALGORITHM = "HS256"
_DEFAULT_TTL_HOURS = 24 * 7  # 7 giorni (refresh-less, semplice)


class JWTError(Exception):
    """Wrapper per errori JWT (expired/invalid signature/malformed)."""


def _secret() -> str:
    secret = os.getenv("FEAPRO_JWT_SECRET", "").strip()
    if not secret:
        logger.warning(
            "FEAPRO_JWT_SECRET not set — using INSECURE default. "
            "Set a strong random secret in production (>=32 bytes)."
        )
        return _DEFAULT_INSECURE_SECRET
    return secret


def _ttl_seconds() -> int:
    try:
        hours = float(os.getenv("FEAPRO_JWT_TTL_HOURS", str(_DEFAULT_TTL_HOURS)))
    except ValueError:
        hours = _DEFAULT_TTL_HOURS
    return int(hours * 3600)


def create_access_token(user_id: str, extra_claims: dict[str, Any] | None = None) -> str:
    """Crea un JWT firmato per `user_id`. Include `iat`, `exp`, `sub=user_id`.

    extra_claims: campi extra opzionali (es. email, role) inseriti nel payload.
    """
    if not user_id:
        raise ValueError("user_id cannot be empty")

    now = _dt.datetime.now(_dt.timezone.utc)
    payload = {
        "sub": str(user_id),
        "iat": int(now.timestamp()),
        "exp": int(now.timestamp()) + _ttl_seconds(),
    }
    if extra_claims:
        # Non sovrascrivere i campi standard (sub/iat/exp)
        for k, v in extra_claims.items():
            if k not in ("sub", "iat", "exp"):
                payload[k] = v

    return jwt.encode(payload, _secret(), algorithm=_ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any]:
    """Decode + verifica firma + scadenza. Solleva JWTError on fail."""
    if not token:
        raise JWTError("empty token")
    try:
        return jwt.decode(token, _secret(), algorithms=[_ALGORITHM])
    except jwt.ExpiredSignatureError as e:
        raise JWTError(f"token expired: {e}") from e
    except jwt.InvalidTokenError as e:
        raise JWTError(f"invalid token: {e}") from e
