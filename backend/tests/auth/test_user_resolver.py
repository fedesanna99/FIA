"""Tests for auth.user_resolver (alpha.15 bridge JWT ↔ demo_user)."""
import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

import auth.users_db as users_db_module
from auth import User, resolve_user_id, DEFAULT_USER_ID


def test_resolve_with_jwt_user_wins_over_explicit():
    """current_user prevale su explicit (JWT > body/query)."""
    user = User(
        id="u-jwt-123", email="a@b.com", password_hash="x",
        created_at=0, last_login_at=None,
    )
    assert resolve_user_id(user, explicit_user_id="other") == "u-jwt-123"


def test_resolve_no_jwt_uses_explicit():
    """No JWT + explicit user_id passato → usa explicit."""
    assert resolve_user_id(None, explicit_user_id="legacy_cli_user") == "legacy_cli_user"


def test_resolve_no_jwt_no_explicit_returns_default():
    """No JWT, no explicit → DEFAULT_USER_ID (demo_user)."""
    assert resolve_user_id(None, explicit_user_id=None) == DEFAULT_USER_ID


def test_resolve_no_jwt_empty_explicit_returns_default():
    """Stringhe vuote/whitespace trattate come None."""
    assert resolve_user_id(None, explicit_user_id="") == DEFAULT_USER_ID
    assert resolve_user_id(None, explicit_user_id="   ") == DEFAULT_USER_ID


def test_resolve_strips_whitespace_from_explicit():
    """Trim whitespace dall'explicit user_id."""
    assert resolve_user_id(None, explicit_user_id="  manual_user  ") == "manual_user"


# ─── Integration test: jobs endpoint con/senza JWT ──────────────────────────
@pytest.fixture
def client(tmp_path: Path, monkeypatch):
    """Setup fresh users DB + secret JWT + reset singletons."""
    test_db = tmp_path / "test_users.sqlite"
    monkeypatch.setenv("FEAPRO_USERS_DB", str(test_db))
    monkeypatch.setenv("FEAPRO_JWT_SECRET", "test-stable-1234567890abcdef")
    monkeypatch.setenv("FEAPRO_JWT_TTL_HOURS", "1")
    users_db_module._reset_singleton_for_tests()
    from main import app
    with TestClient(app) as c:
        yield c
    users_db_module._reset_singleton_for_tests()


def test_jobs_list_without_jwt_uses_default(client):
    """GET /api/jobs senza header → lista jobs di demo_user."""
    r = client.get("/api/jobs")
    assert r.status_code == 200
    # No assert sul contenuto: dipende dallo store. L'importante e' che
    # NON crashi e che il default sia applicato (no 422 missing user_id).


def test_jobs_list_with_jwt_uses_jwt_user(client):
    """GET /api/jobs con JWT → lista jobs dell'user dal token."""
    # Registra utente
    r = client.post("/api/auth/register", json={
        "email": "loginjobs@x.com", "password": "longerThan8",
    })
    assert r.status_code == 201
    token = r.json()["token"]
    user_id_jwt = r.json()["user"]["id"]

    # GET /api/jobs con bearer token
    r = client.get(
        "/api/jobs",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200
    # Per ora la lista e' vuota (no jobs creati). Il test conferma
    # che l'endpoint accetta il bearer e non crasha.
    assert isinstance(r.json(), list)


def test_jobs_list_explicit_user_id_query_works_without_jwt(client):
    """Backward compat: query ?user_id=foo funziona senza JWT."""
    r = client.get("/api/jobs?user_id=manual_user")
    assert r.status_code == 200
    assert isinstance(r.json(), list)
