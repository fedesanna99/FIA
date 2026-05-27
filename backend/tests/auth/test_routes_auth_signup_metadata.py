"""v2.7.0 F.5 (D.2=B) · integration tests per signup metadata extension.

Verifica l'estensione di POST /api/auth/register accettando nome / cognome /
ruolo_professionale / accepted_terms come da mockup signup state Auth.html.

Backward compat: i 4 campi sono Optional[None] → chiamate legacy
``{email, password}`` continuano a funzionare (vedi test_routes_auth.py).

Test in scope:
  1. signup con tutti i campi metadata + accepted_terms=True → 201
     e tutti i campi restituiti nel ``data.user``.
  2. signup con accepted_terms=False (esplicito) → 422 con messaggio
     italiano "Devi accettare termini…"
  3. signup con ruolo_professionale invalido (non in Literal) → 422
     Pydantic validation error.
  4. signup minimal {email, password} senza accepted_terms (backward
     compat) → 201 con i 4 metadata campi a None nel response.
"""
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

import auth.users_db as users_db_module
from main import app


@pytest.fixture
def client(tmp_path: Path, monkeypatch):
    test_db = tmp_path / "test_users.sqlite"
    monkeypatch.setenv("FEAPRO_USERS_DB", str(test_db))
    monkeypatch.setenv("FEAPRO_JWT_SECRET", "test-secret-stable-1234567890abcd")
    monkeypatch.setenv("FEAPRO_JWT_TTL_HOURS", "1")
    users_db_module._reset_singleton_for_tests()
    with TestClient(app) as c:
        yield c
    users_db_module._reset_singleton_for_tests()


def test_signup_with_all_metadata_returns_201_and_persists_fields(client):
    """Payload completo del mockup signup."""
    r = client.post(
        "/api/auth/register",
        json={
            "email": "fede@studio.it",
            "password": "Strong123!",
            "nome": "Federico",
            "cognome": "Sanna",
            "ruolo_professionale": "ingegnere",
            "accepted_terms": True,
        },
    )
    assert r.status_code == 201, r.text
    data = r.json()
    assert data["user"]["email"] == "fede@studio.it"
    assert data["user"]["nome"] == "Federico"
    assert data["user"]["cognome"] == "Sanna"
    assert data["user"]["ruolo_professionale"] == "ingegnere"
    # terms_accepted_at popolato con int(time.time()) quando True
    assert isinstance(data["user"]["terms_accepted_at"], int)
    assert data["user"]["terms_accepted_at"] > 0
    # password_hash mai esposto
    assert "password_hash" not in data["user"]


def test_signup_with_explicit_accepted_terms_false_returns_422(client):
    """Consenso esplicito negativo deve respingere il signup (GDPR)."""
    r = client.post(
        "/api/auth/register",
        json={
            "email": "no-consent@example.com",
            "password": "Strong123!",
            "nome": "Test",
            "cognome": "Refuser",
            "ruolo_professionale": "altro",
            "accepted_terms": False,
        },
    )
    assert r.status_code == 422, r.text
    data = r.json()
    assert "termini" in data["detail"].lower()


def test_signup_with_invalid_ruolo_returns_422(client):
    """Pydantic Literal valida l'enum dei ruoli."""
    r = client.post(
        "/api/auth/register",
        json={
            "email": "ufo@example.com",
            "password": "Strong123!",
            "ruolo_professionale": "ufologo",  # not in Literal
            "accepted_terms": True,
        },
    )
    assert r.status_code == 422, r.text


def test_signup_legacy_payload_without_metadata_returns_201_backward_compat(client):
    """Chiamata legacy {email, password} deve continuare a funzionare; i 4
    campi nuovi appaiono None nel response."""
    r = client.post(
        "/api/auth/register",
        json={"email": "legacy@example.com", "password": "longerThan8"},
    )
    assert r.status_code == 201, r.text
    data = r.json()
    assert data["user"]["email"] == "legacy@example.com"
    assert data["user"]["nome"] is None
    assert data["user"]["cognome"] is None
    assert data["user"]["ruolo_professionale"] is None
    assert data["user"]["terms_accepted_at"] is None
