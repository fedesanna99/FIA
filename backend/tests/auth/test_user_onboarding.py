"""v2.6.4 A.2 — Tests per onboarding_completed flag.

Coverage:
  - User dataclass espone il nuovo campo
  - to_public_dict include onboarding_completed
  - Migration ALTER TABLE idempotente (DB pre-esistente NO ALTER)
  - UsersDB.set_onboarding_completed update + returns user
  - PATCH /api/auth/onboarding requires auth (401 senza Bearer)
  - PATCH /api/auth/onboarding {completed:true} → user.onboarding_completed=True
  - PATCH /api/auth/onboarding {completed:false} → reset per replay tour
  - register/me default a False per nuovi utenti (gate per autoplay)
"""
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

import auth.users_db as users_db_module
from auth.password import hash_password
from auth.users_db import UsersDB, UserNotFoundError
from main import app


# ── unit tests UsersDB ──────────────────────────────────────────────────────


@pytest.fixture
def db(tmp_path: Path) -> UsersDB:
    return UsersDB(db_path=tmp_path / "test_users.sqlite")


def test_register_default_onboarding_not_completed(db: UsersDB):
    """v2.6.4 A.2: nuovi user nascono con onboarding_completed=False."""
    user = db.register("alice@example.com", hash_password("longerThan8"))
    assert user.onboarding_completed is False


def test_to_public_dict_includes_onboarding(db: UsersDB):
    user = db.register("bob@example.com", hash_password("longerThan8"))
    payload = user.to_public_dict()
    assert "onboarding_completed" in payload
    assert payload["onboarding_completed"] is False
    # password_hash NON leakata
    assert "password_hash" not in payload


def test_set_onboarding_completed_true(db: UsersDB):
    user = db.register("carol@example.com", hash_password("longerThan8"))
    updated = db.set_onboarding_completed(user.id, True)
    assert updated.onboarding_completed is True
    # Read-back conferma persistenza
    fetched = db.get_by_id(user.id)
    assert fetched.onboarding_completed is True


def test_set_onboarding_completed_false_for_replay(db: UsersDB):
    """v2.6.4 A.2: 'Rivedi tour' Help → reset a False per replay."""
    user = db.register("dave@example.com", hash_password("longerThan8"))
    db.set_onboarding_completed(user.id, True)
    updated = db.set_onboarding_completed(user.id, False)
    assert updated.onboarding_completed is False


def test_set_onboarding_unknown_user_raises(db: UsersDB):
    with pytest.raises(UserNotFoundError):
        db.set_onboarding_completed("nonexistent-id", True)


def test_migration_idempotent_on_pre_existing_db(tmp_path: Path):
    """v2.6.4 A.2: ALTER TABLE è skip-safe se la colonna esiste già."""
    db_path = tmp_path / "test_users.sqlite"
    # Primo init: crea schema completo (con onboarding_completed)
    db1 = UsersDB(db_path=db_path)
    u = db1.register("test@example.com", hash_password("longerThan8"))
    db1.set_onboarding_completed(u.id, True)
    # Secondo init sullo stesso file: NON deve sollevare "duplicate column"
    db2 = UsersDB(db_path=db_path)
    fetched = db2.get_by_id(u.id)
    assert fetched.onboarding_completed is True


# ── integration tests routes ────────────────────────────────────────────────


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


def _register_and_token(client: TestClient, email: str = "u@x.com") -> str:
    r = client.post("/api/auth/register", json={"email": email, "password": "longerThan8"})
    assert r.status_code == 201, r.text
    return r.json()["token"]


def test_register_response_includes_onboarding_false(client):
    """v2.6.4 A.2: il payload di register espone onboarding_completed=False."""
    r = client.post("/api/auth/register", json={
        "email": "fresh@example.com", "password": "longerThan8",
    })
    assert r.status_code == 201
    assert r.json()["user"]["onboarding_completed"] is False


def test_me_includes_onboarding_completed(client):
    token = _register_and_token(client, "me@example.com")
    r = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["user"]["onboarding_completed"] is False


def test_patch_onboarding_requires_auth(client):
    """v2.6.4 A.2: PATCH /onboarding senza Bearer → 401."""
    r = client.patch("/api/auth/onboarding", json={"completed": True})
    # FastAPI con Depends(get_current_user) → 401 (HTTPBearer)
    assert r.status_code in (401, 403), r.text


def test_patch_onboarding_completed_true(client):
    """v2.6.4 A.2: tour completato/skippato → completed=True."""
    token = _register_and_token(client, "u1@example.com")
    r = client.patch(
        "/api/auth/onboarding",
        json={"completed": True},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200, r.text
    assert r.json()["user"]["onboarding_completed"] is True
    # Read-back via /me conferma
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.json()["user"]["onboarding_completed"] is True


def test_patch_onboarding_reset_for_replay(client):
    """v2.6.4 A.2: 'Rivedi tour' Help → completed=False (replay)."""
    token = _register_and_token(client, "u2@example.com")
    # 1. completa
    client.patch(
        "/api/auth/onboarding",
        json={"completed": True},
        headers={"Authorization": f"Bearer {token}"},
    )
    # 2. reset
    r = client.patch(
        "/api/auth/onboarding",
        json={"completed": False},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200
    assert r.json()["user"]["onboarding_completed"] is False
