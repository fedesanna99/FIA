"""
Regression test per bug #28 (audit v2.3.5).

Verifica che dopo 5 tentativi falliti, il 6° tentativo ritorni 429.
Implementazione in-memory: ``auth.login_rate_limiter.LoginRateLimiter``
(sliding window 15 min per IP, soglia 5).
"""
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

import auth.users_db as users_db_module
from auth.login_rate_limiter import login_limiter
from main import app


@pytest.fixture
def client(tmp_path: Path, monkeypatch):
    """Isolated SQLite + reset rate limiter PRIMA di ogni test."""
    test_db = tmp_path / "test_users.sqlite"
    monkeypatch.setenv("FEAPRO_USERS_DB", str(test_db))
    monkeypatch.setenv("FEAPRO_JWT_SECRET", "test-secret-stable-1234567890abcd")
    monkeypatch.setenv("FEAPRO_JWT_TTL_HOURS", "1")
    users_db_module._reset_singleton_for_tests()
    login_limiter.reset_all()
    with TestClient(app) as c:
        yield c
    users_db_module._reset_singleton_for_tests()
    login_limiter.reset_all()


def test_login_rate_limit_after_5_failed_attempts(client: TestClient):
    """6° tentativo login fallito → 429 Too Many Requests."""
    bad_credentials = {"email": "fake@example.com", "password": "wrongPwd123"}

    # 5 tentativi falliti devono dare 401 (utente inesistente o pwd errata)
    for i in range(5):
        r = client.post("/api/auth/login", json=bad_credentials)
        assert r.status_code == 401, (
            f"Tentativo {i+1} dovrebbe dare 401, ottenuto {r.status_code}: {r.text}"
        )

    # 6° tentativo deve essere bloccato dal rate limiter → 429
    r = client.post("/api/auth/login", json=bad_credentials)
    assert r.status_code == 429, (
        f"6° tentativo dovrebbe essere 429, ottenuto {r.status_code}: {r.text}"
    )
    # Messaggio italiano user-facing
    assert "tentativ" in r.json()["detail"].lower() or "minut" in r.json()["detail"].lower()


def test_register_not_rate_limited(client: TestClient):
    """Register NON è rate limited (solo login)."""
    # 6 register diversi devono tutti dare 201, mai 429
    for i in range(6):
        r = client.post(
            "/api/auth/register",
            json={"email": f"user{i}@example.com", "password": "Valid12345"},
        )
        assert r.status_code != 429, (
            f"Register #{i} non doveva essere rate-limited, ottenuto 429"
        )
        # 201 (created) o eventualmente 409 (duplicate); mai 429
        assert r.status_code in (201, 409), r.text


def test_successful_login_resets_rate_counter(client: TestClient):
    """Login riuscito azzera contatore IP — l'utente legittimo che ha avuto
    typo prima non viene penalizzato sui prossimi login.
    """
    # Registra utente reale
    creds = {"email": "real@example.com", "password": "RealPwd12345"}
    reg = client.post("/api/auth/register", json=creds)
    assert reg.status_code == 201

    # 3 tentativi falliti con pwd errata
    bad = {"email": "real@example.com", "password": "wrongPwd1"}
    for _ in range(3):
        r = client.post("/api/auth/login", json=bad)
        assert r.status_code == 401

    # Ora login con pwd corretta funziona (no 429 — 3 < 5)
    ok = client.post("/api/auth/login", json=creds)
    assert ok.status_code == 200, ok.text

    # Dopo login riuscito, di nuovo 5 tentativi falliti consecutivi dovrebbero
    # essere consentiti (contatore resettato). 5 tentativi successivi devono
    # tutti dare 401, NON 429 anticipato.
    for i in range(5):
        r = client.post("/api/auth/login", json=bad)
        assert r.status_code == 401, (
            f"Dopo reset, tentativo {i+1} dovrebbe essere 401, ottenuto {r.status_code}"
        )

    # 6° tentativo blocca di nuovo
    r = client.post("/api/auth/login", json=bad)
    assert r.status_code == 429
