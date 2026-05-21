"""Tests for auth.jwt_tokens (PyJWT wrapper)."""
import os
import time
import datetime as _dt

import pytest

from auth.jwt_tokens import (
    JWTError, create_access_token, decode_access_token,
)


@pytest.fixture(autouse=True)
def _isolated_secret(monkeypatch):
    """Forza secret stabile durante i test (no shared state)."""
    monkeypatch.setenv("FEAPRO_JWT_SECRET", "test-secret-stable-32-bytes-min-1234")
    monkeypatch.setenv("FEAPRO_JWT_TTL_HOURS", "1")
    yield


def test_create_and_decode_roundtrip():
    token = create_access_token("user-123")
    payload = decode_access_token(token)
    assert payload["sub"] == "user-123"
    assert "iat" in payload
    assert "exp" in payload
    assert payload["exp"] > payload["iat"]


def test_decode_includes_extra_claims():
    token = create_access_token("u1", extra_claims={"email": "a@b.com", "role": "admin"})
    payload = decode_access_token(token)
    assert payload["email"] == "a@b.com"
    assert payload["role"] == "admin"
    assert payload["sub"] == "u1"


def test_extra_claims_cant_override_sub_iat_exp():
    token = create_access_token("user-real", extra_claims={
        "sub": "user-fake", "iat": 0, "exp": 0
    })
    payload = decode_access_token(token)
    assert payload["sub"] == "user-real"  # NON sovrascritto
    assert payload["iat"] > 0
    assert payload["exp"] > payload["iat"]


def test_empty_user_id_raises():
    with pytest.raises(ValueError, match="cannot be empty"):
        create_access_token("")


def test_decode_empty_token_raises():
    with pytest.raises(JWTError, match="empty"):
        decode_access_token("")


def test_decode_invalid_signature_raises(monkeypatch):
    token = create_access_token("u1")
    # Cambio secret → firma non valida
    monkeypatch.setenv("FEAPRO_JWT_SECRET", "other-secret-totally-different")
    with pytest.raises(JWTError, match="invalid"):
        decode_access_token(token)


def test_decode_malformed_token_raises():
    with pytest.raises(JWTError, match="invalid"):
        decode_access_token("not.a.real.jwt.token")


def test_decode_expired_token_raises(monkeypatch):
    """TTL negativa (token gia' scaduto al momento della creazione)."""
    monkeypatch.setenv("FEAPRO_JWT_TTL_HOURS", "-1")  # scaduto 1h fa
    token = create_access_token("u1")
    # PyJWT applica un leeway di 0s di default
    with pytest.raises(JWTError, match="expired"):
        decode_access_token(token)


def test_default_ttl_is_one_week(monkeypatch):
    """Senza env: TTL default = 7 giorni = 7*24*3600s."""
    monkeypatch.delenv("FEAPRO_JWT_TTL_HOURS", raising=False)
    token = create_access_token("u1")
    payload = decode_access_token(token)
    diff = payload["exp"] - payload["iat"]
    expected = 7 * 24 * 3600
    # Tolleranza 5s per latenza
    assert abs(diff - expected) < 5


def test_invalid_ttl_falls_back_to_default(monkeypatch):
    monkeypatch.setenv("FEAPRO_JWT_TTL_HOURS", "not-a-number")
    token = create_access_token("u1")
    # Non crash; usa default 7*24h
    payload = decode_access_token(token)
    diff = payload["exp"] - payload["iat"]
    assert diff > 24 * 3600  # almeno 1 giorno
