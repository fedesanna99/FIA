"""JWT (RFC 7519) bearer tokens via PyJWT.

Secret key: env var `FEAPRO_JWT_SECRET`. In dev se non set, usa un default
INSECURE che logga warning — in produzione Fly.io e' obbligatorio settarlo.
"""
from __future__ import annotations

import datetime as _dt
import logging
import os
import secrets
from typing import Any

import jwt

logger = logging.getLogger(__name__)


_ALGORITHM = "HS256"
_DEFAULT_TTL_HOURS = 24 * 7  # 7 giorni (refresh-less, semplice)

# v3.1.2 audit-fix L1-9 (P0 security): in `prod` il server NON può partire
# senza `FEAPRO_JWT_SECRET`. In `dev` un secret random per-process viene
# generato al boot, così:
#  - i token NON sono prevedibili (no hardcoded default leakato nel repo);
#  - i token "scadono" al restart del server (limita reuse cross-session in dev).
_PROD_ENVS = {"prod", "production"}


def _is_prod() -> bool:
    return os.getenv("FEAPRO_ENV", "dev").strip().lower() in _PROD_ENVS


_RANDOM_DEV_SECRET = secrets.token_urlsafe(48)


class JWTError(Exception):
    """Wrapper per errori JWT (expired/invalid signature/malformed)."""


def _secret() -> str:
    """v3.1.2 audit-fix L1-9: enforce JWT secret in prod.

    - prod: env `FEAPRO_JWT_SECRET` obbligatoria. Mancante → RuntimeError
      al primo uso (deploy fail-fast invece di token forgeable in giro).
    - dev: se mancante usa un secret random per-process (no hardcoded).

    NB: non caching del valore env per non interferire con test che
    monkeypatchano `FEAPRO_JWT_SECRET` (es. `test_decode_invalid_signature`).
    `os.getenv` è O(1) — overhead trascurabile vs costo dei test broken.
    """
    secret = os.getenv("FEAPRO_JWT_SECRET", "").strip()
    if not secret:
        if _is_prod():
            raise RuntimeError(
                "FEAPRO_JWT_SECRET non impostato in ambiente production. "
                "Configurare un secret random (>=32 byte) via env var prima "
                "del deploy. Esempio: `fly secrets set FEAPRO_JWT_SECRET=$(openssl rand -hex 32)`."
            )
        logger.warning(
            "FEAPRO_JWT_SECRET not set (dev mode) — using random per-process secret. "
            "Tokens won't survive a server restart. Set a stable secret if needed."
        )
        secret = _RANDOM_DEV_SECRET
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
