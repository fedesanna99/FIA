"""FastAPI dependencies: `get_current_user`, `get_current_user_optional`.

Estraggono il token JWT dall'header `Authorization: Bearer <token>`,
decodificano, lookup user. Solleva HTTPException 401 su fail (required)
oppure restituiscono None (optional, usato per endpoint backward-compat
"demo_user" fallback durante migrazione).
"""
from __future__ import annotations

from typing import Optional

from fastapi import Depends, Header, HTTPException, status

from .jwt_tokens import JWTError, decode_access_token
from .users_db import User, UserNotFoundError, get_users_db


def _extract_bearer(authorization: Optional[str]) -> Optional[str]:
    """Restituisce il token da `Authorization: Bearer X`. None se assente."""
    if not authorization:
        return None
    parts = authorization.strip().split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None
    return parts[1]


def get_current_user(
    authorization: Optional[str] = Header(None),
) -> User:
    """Dependency strict: solleva 401 se token manca/invalido/expired."""
    token = _extract_bearer(authorization)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="missing Authorization: Bearer header",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        payload = decode_access_token(token)
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"invalid or expired token: {e}",
            headers={"WWW-Authenticate": "Bearer"},
        ) from e

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="token missing 'sub' claim",
        )
    try:
        return get_users_db().get_by_id(user_id)
    except UserNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"user not found: {user_id}",
        ) from e


def get_current_user_optional(
    authorization: Optional[str] = Header(None),
) -> Optional[User]:
    """Dependency tollerante: restituisce None se no token (no eccezioni).

    Utile durante migrazione alpha.15: endpoint che accettano sia JWT
    (multi-user) sia legacy "demo_user" hardcoded.
    """
    token = _extract_bearer(authorization)
    if not token:
        return None
    try:
        payload = decode_access_token(token)
        user_id = payload.get("sub")
        if not user_id:
            return None
        return get_users_db().get_by_id(user_id)
    except (JWTError, UserNotFoundError):
        return None
