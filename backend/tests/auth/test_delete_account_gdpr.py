"""
Regression test per bug #22 (audit v2.3.5).

Verifica che ``DELETE /api/auth/me`` esegua cascade delete completo e che
l'utente non possa piu' loggare dopo cancellazione (GDPR Art. 17 — right
to erasure).
"""
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

import auth.users_db as users_db_module
from main import app


@pytest.fixture
def client(tmp_path: Path, monkeypatch):
    """Stesso pattern di test_routes_auth.py: SQLite isolato per test."""
    test_db = tmp_path / "test_users.sqlite"
    monkeypatch.setenv("FEAPRO_USERS_DB", str(test_db))
    monkeypatch.setenv("FEAPRO_JWT_SECRET", "test-secret-stable-1234567890abcd")
    monkeypatch.setenv("FEAPRO_JWT_TTL_HOURS", "1")
    users_db_module._reset_singleton_for_tests()
    with TestClient(app) as c:
        yield c
    users_db_module._reset_singleton_for_tests()


@pytest.fixture
def credentials():
    return {"email": "gdpr-test@example.com", "password": "longerThan8Char"}


@pytest.fixture
def auth_token(client: TestClient, credentials: dict) -> tuple[str, str]:
    """Registra utente e restituisce (token, user_id)."""
    r = client.post("/api/auth/register", json=credentials)
    assert r.status_code == 201, r.text
    return r.json()["token"], r.json()["user"]["id"]


def test_delete_account_returns_204(client: TestClient, auth_token: tuple[str, str]):
    """DELETE /me ritorna 204 No Content quando autenticato."""
    token, _ = auth_token
    r = client.delete("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 204, r.text
    assert r.content == b""


def test_delete_account_requires_auth(client: TestClient):
    """DELETE /me senza token ritorna 401 o 403."""
    r = client.delete("/api/auth/me")
    assert r.status_code in (401, 403), f"unexpected {r.status_code}: {r.text}"


def test_login_fails_after_delete(client: TestClient, credentials: dict):
    """Dopo DELETE /me, login con stesse credentials fallisce."""
    # 1. Register + login
    reg = client.post("/api/auth/register", json=credentials)
    assert reg.status_code == 201, reg.text
    token = reg.json()["token"]

    # Verifica login funzionante prima del delete
    pre = client.post("/api/auth/login", json=credentials)
    assert pre.status_code == 200, pre.text

    # 2. Delete account
    r = client.delete("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 204, r.text

    # 3. Login deve fallire (utente non più nel DB)
    relogin = client.post("/api/auth/login", json=credentials)
    assert relogin.status_code == 401, (
        f"Login dopo DELETE /me dovrebbe fallire 401, ottenuto {relogin.status_code}"
    )


def test_cascade_delete_stats(client: TestClient, auth_token: tuple[str, str]):
    """Verifica diretta della funzione cascade_delete (non via endpoint).

    Controlla che ``delete_user_cascade`` restituisca stats corrette e che
    l'utente venga effettivamente eliminato dal DB.
    """
    from auth.cascade_delete import delete_user_cascade
    from auth.users_db import get_users_db, UserNotFoundError

    _, user_id = auth_token

    # Pre-condition: utente esiste
    db = get_users_db()
    db.get_by_id(user_id)  # non solleva

    # Esegui cascade
    stats = delete_user_cascade(user_id=user_id)

    # Check stats
    assert stats["user_deleted"] is True
    assert stats["user_id_hash"]  # hash valorizzato
    assert len(stats["user_id_hash"]) == 16  # SHA256 troncato 16 char
    assert stats["jobs_deleted"] == 0  # nessun job per questo test
    assert "deleted_at" in stats
    # Stub fields documentati (gap pre-esistenti del modello dati)
    assert stats["models_deleted"] == 0
    assert stats["snapshots_deleted"] == 0
    assert stats["billing_records_deleted"] == 0
    assert stats["audit_entries_anonymized"] == 0

    # Post-condition: utente NON esiste piu'
    with pytest.raises(UserNotFoundError):
        db.get_by_id(user_id)
