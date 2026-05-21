"""Integration tests per /api/auth/{register,login,me}."""
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

import auth.users_db as users_db_module
from main import app


@pytest.fixture
def client(tmp_path: Path, monkeypatch):
    """Override il path SQLite + secret JWT per isolare i test."""
    test_db = tmp_path / "test_users.sqlite"
    monkeypatch.setenv("FEAPRO_USERS_DB", str(test_db))
    monkeypatch.setenv("FEAPRO_JWT_SECRET", "test-secret-stable-1234567890abcd")
    monkeypatch.setenv("FEAPRO_JWT_TTL_HOURS", "1")
    # Reset singleton: next call to get_users_db() lo ricreera' col nuovo path
    users_db_module._reset_singleton_for_tests()
    with TestClient(app) as c:
        yield c
    users_db_module._reset_singleton_for_tests()


def test_register_success(client):
    r = client.post("/api/auth/register", json={
        "email": "user@example.com", "password": "longerThan8",
    })
    assert r.status_code == 201, r.text
    data = r.json()
    assert "token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "user@example.com"
    assert "id" in data["user"]
    assert "password_hash" not in data["user"]  # no leak


def test_register_short_password_400(client):
    r = client.post("/api/auth/register", json={
        "email": "user@example.com", "password": "short",
    })
    assert r.status_code == 422  # pydantic validation


def test_register_invalid_email_400(client):
    r = client.post("/api/auth/register", json={
        "email": "not-an-email", "password": "longerThan8",
    })
    assert r.status_code == 422


def test_register_duplicate_email_409(client):
    payload = {"email": "dup@example.com", "password": "longerThan8"}
    r1 = client.post("/api/auth/register", json=payload)
    assert r1.status_code == 201
    r2 = client.post("/api/auth/register", json=payload)
    assert r2.status_code == 409


def test_login_success_returns_token(client):
    client.post("/api/auth/register", json={
        "email": "alice@x.com", "password": "longerThan8",
    })
    r = client.post("/api/auth/login", json={
        "email": "alice@x.com", "password": "longerThan8",
    })
    assert r.status_code == 200, r.text
    data = r.json()
    assert "token" in data
    assert data["user"]["email"] == "alice@x.com"
    # last_login_at popolato dopo questo login
    assert data["user"]["last_login_at"] is None  # response e' PRE-update
    # Verifica che lookup successivo abbia last_login aggiornato
    me = client.get("/api/auth/me", headers={
        "Authorization": f"Bearer {data['token']}"
    })
    assert me.status_code == 200
    assert me.json()["user"]["last_login_at"] is not None


def test_login_wrong_password_401(client):
    client.post("/api/auth/register", json={
        "email": "bob@x.com", "password": "longerThan8",
    })
    r = client.post("/api/auth/login", json={
        "email": "bob@x.com", "password": "wrongpassword",
    })
    assert r.status_code == 401
    assert "invalid" in r.json()["detail"].lower()


def test_login_nonexistent_user_401(client):
    """Non rivela se l'email esiste o no (lo stesso 401)."""
    r = client.post("/api/auth/login", json={
        "email": "ghost@nowhere.com", "password": "anypassword",
    })
    assert r.status_code == 401


def test_me_requires_bearer_token(client):
    r = client.get("/api/auth/me")
    assert r.status_code == 401


def test_me_invalid_token_401(client):
    r = client.get("/api/auth/me", headers={"Authorization": "Bearer not-a-jwt"})
    assert r.status_code == 401


def test_me_missing_bearer_prefix_401(client):
    """Header senza 'Bearer ' prefix → 401."""
    client.post("/api/auth/register", json={
        "email": "c@x.com", "password": "longerThan8",
    })
    # Solo il token, senza "Bearer "
    r = client.get("/api/auth/me", headers={"Authorization": "abc.def.ghi"})
    assert r.status_code == 401


def test_me_valid_token_returns_user(client):
    r = client.post("/api/auth/register", json={
        "email": "dave@x.com", "password": "longerThan8",
    })
    token = r.json()["token"]
    me = client.get("/api/auth/me", headers={
        "Authorization": f"Bearer {token}"
    })
    assert me.status_code == 200
    assert me.json()["user"]["email"] == "dave@x.com"


def test_full_flow_register_login_me(client):
    """End-to-end: registro → login → me."""
    email, password = "flow@test.com", "longerThan8"

    # Registra
    r = client.post("/api/auth/register", json={"email": email, "password": password})
    assert r.status_code == 201
    register_token = r.json()["token"]

    # Login (token DIVERSO dal precedente, ma valido)
    r = client.post("/api/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200
    login_token = r.json()["token"]

    # Entrambi i token devono funzionare con /me
    for tok in (register_token, login_token):
        me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {tok}"})
        assert me.status_code == 200
        assert me.json()["user"]["email"] == email
