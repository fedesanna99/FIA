"""Tests for auth.password (bcrypt wrapper)."""
import pytest

from auth.password import hash_password, verify_password


def test_hash_returns_bcrypt_format():
    """Hash bcrypt inizia con $2a$ o $2b$, lunghezza 60 char."""
    h = hash_password("hunter2!secret")
    assert h.startswith(("$2a$", "$2b$"))
    assert len(h) == 60


def test_hash_verify_roundtrip():
    h = hash_password("correct horse battery staple")
    assert verify_password("correct horse battery staple", h) is True


def test_verify_rejects_wrong_password():
    h = hash_password("correct password")
    assert verify_password("wrong password", h) is False


def test_hash_unique_per_call():
    """Stesso plaintext → hash diverso (salt random)."""
    h1 = hash_password("same input")
    h2 = hash_password("same input")
    assert h1 != h2
    assert verify_password("same input", h1) is True
    assert verify_password("same input", h2) is True


def test_empty_password_raises():
    with pytest.raises(ValueError, match="cannot be empty"):
        hash_password("")


def test_password_too_long_raises():
    """bcrypt non supporta > 72 byte di input."""
    with pytest.raises(ValueError, match="too long"):
        hash_password("x" * 73)


def test_verify_empty_plain_returns_false():
    h = hash_password("ok")
    assert verify_password("", h) is False


def test_verify_empty_hash_returns_false():
    assert verify_password("anything", "") is False


def test_verify_malformed_hash_returns_false():
    """Hash non valido → False, no crash."""
    assert verify_password("anything", "not-a-bcrypt-hash") is False


def test_verify_too_long_password_returns_false():
    """Plain > 72 byte → verify torna False (no crash)."""
    h = hash_password("normal")
    assert verify_password("x" * 73, h) is False


def test_unicode_password_works():
    """Caratteri non-ASCII (emoji, accenti) gestiti via UTF-8."""
    plain = "p4ssw0rd-💀-éàü"
    h = hash_password(plain)
    assert verify_password(plain, h) is True
    assert verify_password("p4ssw0rd-💀-eau", h) is False
