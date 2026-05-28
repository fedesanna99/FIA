"""Auth REST endpoints (alpha.13, esteso v2.6.4 + v2.7.0 F.5).

- POST /api/auth/register {email, password, nome?, cognome?,
                            ruolo_professionale?, accepted_terms?}
                          -> {user, token}    (status 201; 409 conflict;
                              422 se ruolo invalido o accepted_terms=False)
- POST /api/auth/login    {email, password}  -> {user, token}
- GET  /api/auth/me        Authorization: Bearer  -> {user}
- PATCH /api/auth/onboarding {completed}     -> {user}
- DELETE /api/auth/me      Authorization: Bearer  -> 204 (GDPR cascade)
"""
from __future__ import annotations

import time
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr, Field

from auth import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
    verify_dummy_password_timing_safe,
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
    """v2.7.0 F.5 (D.2=B): payload signup esteso con metadata mockup-driven.

    Backward compat: i 4 campi nuovi sono `Optional[...] = None`. Le
    chiamate legacy `{email, password}` continuano a funzionare e creano
    user senza metadata. La validation strict (es. `accepted_terms==True`)
    è applicata solo se i campi sono PRESENTI nel payload.
    """
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    nome: Optional[str] = Field(default=None, max_length=80)
    cognome: Optional[str] = Field(default=None, max_length=80)
    ruolo_professionale: Optional[
        Literal["ingegnere", "architetto", "docente", "studente", "altro"]
    ] = None
    # Backward compat: None ⇒ utente pre-v2.7.0 (no enforcement); True ⇒
    # frontend mockup-driven (set terms_accepted_at = now); False ⇒ 422
    # (l'utente ha esplicitamente NON accettato → respinto).
    accepted_terms: Optional[bool] = None


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


class OnboardingUpdate(BaseModel):
    """v2.6.4 A.2: payload PATCH /api/auth/onboarding."""
    completed: bool


# ── Endpoints ──────────────────────────────────────────────────────────────
@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(request: Request, req: RegisterRequest) -> AuthResponse:
    """Crea un nuovo user. Solleva 409 se email gia' esiste.

    v2.7.0 F.5 (D.2=B): payload esteso con metadata mockup signup. Validation
    strict di `accepted_terms` solo se esplicitamente False (None ⇒
    backward compat per chiamate legacy). Quando accepted_terms=True,
    `terms_accepted_at` è popolato con int(time.time()) come timestamp
    consenso GDPR (Art. 6/7 lawful basis).

    v3.1.2 audit-fix L1-7 (P0 security): rate-limited (10 req/IP/10min) +
    detail 409 generico per non rivelare quali email sono registrate (no
    enumeration via brute force).
    """
    from auth.login_rate_limiter import register_limiter

    ip = _client_ip(request)
    if register_limiter.is_blocked(ip):
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Troppi tentativi di registrazione. Riprova fra 10 minuti.",
        )

    # v2.7.0 F.5: enforcement consenso solo se esplicitamente False.
    if req.accepted_terms is False:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Devi accettare termini e privacy policy per creare un account.",
        )

    try:
        pw_hash = hash_password(req.password)
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(e)) from e

    # v2.7.0 F.5: estensione signup metadata. Sanitize trim whitespace
    # sui campi text optional.
    nome = req.nome.strip() if req.nome else None
    cognome = req.cognome.strip() if req.cognome else None
    terms_accepted_at: Optional[int] = (
        int(time.time()) if req.accepted_terms is True else None
    )

    try:
        user = get_users_db().register(
            str(req.email),
            pw_hash,
            nome=nome or None,
            cognome=cognome or None,
            ruolo_professionale=req.ruolo_professionale,
            terms_accepted_at=terms_accepted_at,
        )
    except UserAlreadyExistsError as e:
        # v3.1.2 audit-fix L1-7: detail GENERICO per evitare enumeration.
        # Prima esponeva l'email nel messaggio (`email already registered: foo@bar`).
        # Ora un attaccante riceve sempre lo stesso `registration_failed`
        # indipendentemente dal motivo (email duplicata vs invalid email).
        register_limiter.record_failure(ip)
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            detail="Registrazione fallita: verifica i dati inseriti.",
        ) from e

    token = create_access_token(user.id, extra_claims={"email": user.email})
    return AuthResponse(token=token, user=user.to_public_dict())


def _client_ip(request: Request) -> str:
    """Estrae l'IP del client per il rate limiter.

    Considera X-Forwarded-For se presente (Fly.io / reverse proxy) e fa
    fallback su request.client.host. Restituisce ``"unknown"`` se non
    determinabile (es. test senza client). NON usato per logica di
    business — solo come chiave del rate limiter.
    """
    xff = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
    if xff:
        return xff
    if request.client is not None:
        return request.client.host
    return "unknown"


@router.post("/login", response_model=AuthResponse)
def login(request: Request, req: LoginRequest) -> AuthResponse:
    """Login con email + password. 401 se credenziali errate.

    Bug #28 dell'audit v2.3.5 (P0 security, brute force):
    rate-limited a 5 tentativi falliti per IP in 15 min. Eccesso → 429.
    """
    from auth.login_rate_limiter import login_limiter

    ip = _client_ip(request)
    if login_limiter.is_blocked(ip):
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Troppi tentativi di login. Riprova fra 15 minuti.",
        )

    try:
        user = get_users_db().get_by_email(str(req.email))
    except UserNotFoundError as e:
        # v3.1.2 audit-fix L1-8 (P0 security · timing attack):
        # esegui un verify_password dummy contro un hash fisso per
        # uniformare il response time con il caso "password sbagliata"
        # (~50ms bcrypt cost 12). Senza, l'attaccante distingue
        # email-esiste vs email-no per la differenza di latency.
        verify_dummy_password_timing_safe(req.password)
        login_limiter.record_failure(ip)
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED, detail="invalid email or password"
        ) from e

    if not verify_password(req.password, user.password_hash):
        login_limiter.record_failure(ip)
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED, detail="invalid email or password"
        )

    # Aggiorna timestamp ultimo login (best-effort, errore non-fatal)
    try:
        get_users_db().update_last_login(user.id)
    except Exception:  # noqa: BLE001
        pass

    # Login riuscito → reset contatore IP (no penalty per utente legittimo
    # che ha avuto qualche typo prima).
    login_limiter.reset(ip)

    token = create_access_token(user.id, extra_claims={"email": user.email})
    return AuthResponse(token=token, user=user.to_public_dict())


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)) -> UserResponse:
    """Ritorna info dell'utente autenticato (richiede Bearer token valido)."""
    return UserResponse(user=current_user.to_public_dict())


@router.patch("/onboarding", response_model=UserResponse)
def update_onboarding(
    payload: OnboardingUpdate,
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    """v2.6.4 A.2: setta lo stato onboarding del current user.

    Body: ``{"completed": bool}``.

    Usato dal frontend:
      - `useMarkOnboardingComplete()` → ``{completed: true}`` quando l'utente
        chiude il tour (`[Salta]`, `[Fine]`, ESC, click backdrop).
      - `useResetOnboarding()` → ``{completed: false}`` per "Rivedi tour"
        dal menu Help (replay).

    Risposta: user aggiornato (stesso shape di GET /me, include il nuovo
    ``onboarding_completed: bool`` nel ``user.to_public_dict()``).
    """
    updated = get_users_db().set_onboarding_completed(
        current_user.id, payload.completed
    )
    return UserResponse(user=updated.to_public_dict())


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
