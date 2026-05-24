"""Auth REST endpoints (alpha.13).

- POST /api/auth/register {email, password} -> {user, token}
- POST /api/auth/login    {email, password} -> {user, token}
- GET  /api/auth/me        Authorization: Bearer  -> {user}
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field

from auth import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from auth.users_db import (
    User,
    UserAlreadyExistsError,
    UserNotFoundError,
    get_users_db,
)


router = APIRouter()


# ── Schemas ────────────────────────────────────────────────────────────────
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=72)


class AuthResponse(BaseModel):
    """Risposta per register/login: contiene token + user info pubblico."""
    token: str
    token_type: str = "bearer"
    user: dict


class UserResponse(BaseModel):
    user: dict


# ── Endpoints ──────────────────────────────────────────────────────────────
@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(req: RegisterRequest) -> AuthResponse:
    """Crea un nuovo user. Solleva 409 se email gia' esiste."""
    try:
        pw_hash = hash_password(req.password)
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(e)) from e

    try:
        user = get_users_db().register(str(req.email), pw_hash)
    except UserAlreadyExistsError as e:
        raise HTTPException(
            status.HTTP_409_CONFLICT, detail=str(e)
        ) from e

    token = create_access_token(user.id, extra_claims={"email": user.email})
    return AuthResponse(token=token, user=user.to_public_dict())


@router.post("/login", response_model=AuthResponse)
def login(req: LoginRequest) -> AuthResponse:
    """Login con email + password. 401 se credenziali errate."""
    try:
        user = get_users_db().get_by_email(str(req.email))
    except UserNotFoundError as e:
        # NON rivelare se l'email esiste o no (info leak)
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED, detail="invalid email or password"
        ) from e

    if not verify_password(req.password, user.password_hash):
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED, detail="invalid email or password"
        )

    # Aggiorna timestamp ultimo login (best-effort, errore non-fatal)
    try:
        get_users_db().update_last_login(user.id)
    except Exception:  # noqa: BLE001
        pass

    token = create_access_token(user.id, extra_claims={"email": user.email})
    return AuthResponse(token=token, user=user.to_public_dict())


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)) -> UserResponse:
    """Ritorna info dell'utente autenticato (richiede Bearer token valido)."""
    return UserResponse(user=current_user.to_public_dict())


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(current_user: User = Depends(get_current_user)):
    """
    GDPR Art. 17 — Right to erasure.

    Hard delete dell'account utente e cascade su tutti i dati personali
    collegati (vedi ``auth.cascade_delete.delete_user_cascade`` per dettaglio).

    Irreversibile: il client DEVE confermare prima di chiamare.
    Risposta: ``204 No Content`` se cancellazione riuscita.

    Bug #22 dell'audit v2.3.5-nafems-truth-audit (P0 legal — UE GDPR).
    """
    from auth.cascade_delete import delete_user_cascade

    delete_user_cascade(user_id=current_user.id)
    return None
