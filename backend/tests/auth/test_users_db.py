"""Tests for auth.users_db (SQLite CRUD)."""
import os
from pathlib import Path

import pytest

from auth.users_db import (
    User, UserAlreadyExistsError, UserNotFoundError, UsersDB,
)
from auth.password import hash_password


@pytest.fixture
def db(tmp_path: Path) -> UsersDB:
    """UsersDB con path isolato per test."""
    return UsersDB(db_path=tmp_path / "test_users.sqlite")


def test_init_creates_db_file(tmp_path):
    db_path = tmp_path / "subdir" / "users.sqlite"
    assert not db_path.exists()
    UsersDB(db_path=db_path)
    assert db_path.exists()


def test_register_creates_user(db: UsersDB):
    user = db.register("alice@example.com", hash_password("pw123"))
    assert user.id  # UUID hex generato
    assert user.email == "alice@example.com"
    assert user.created_at > 0
    assert user.last_login_at is None


def test_register_normalizes_email(db: UsersDB):
    """Email in maiuscolo + spazi → normalizzata lowercase + trim."""
    user = db.register("  Alice@Example.COM  ", hash_password("pw"))
    assert user.email == "alice@example.com"


def test_register_duplicate_email_raises(db: UsersDB):
    db.register("a@b.com", hash_password("p1"))
    with pytest.raises(UserAlreadyExistsError):
        db.register("a@b.com", hash_password("p2"))


def test_register_duplicate_email_case_insensitive(db: UsersDB):
    """SQLite COLLATE NOCASE: A@B.com e a@b.com sono lo stesso."""
    db.register("Foo@Bar.com", hash_password("p1"))
    with pytest.raises(UserAlreadyExistsError):
        db.register("foo@bar.com", hash_password("p2"))


def test_register_empty_email_raises(db: UsersDB):
    with pytest.raises(ValueError):
        db.register("", hash_password("p"))


def test_register_empty_hash_raises(db: UsersDB):
    with pytest.raises(ValueError):
        db.register("a@b.com", "")


def test_get_by_email_found(db: UsersDB):
    db.register("x@y.com", hash_password("pw"))
    user = db.get_by_email("x@y.com")
    assert user.email == "x@y.com"


def test_get_by_email_not_found(db: UsersDB):
    with pytest.raises(UserNotFoundError):
        db.get_by_email("nope@nowhere.com")


def test_get_by_id_roundtrip(db: UsersDB):
    created = db.register("z@z.com", hash_password("p"))
    fetched = db.get_by_id(created.id)
    assert fetched.id == created.id
    assert fetched.email == "z@z.com"


def test_get_by_id_not_found(db: UsersDB):
    with pytest.raises(UserNotFoundError):
        db.get_by_id("nonexistent-id-1234")


def test_update_last_login(db: UsersDB):
    u = db.register("e@e.com", hash_password("p"))
    db.update_last_login(u.id, ts=1779999999)
    fetched = db.get_by_id(u.id)
    assert fetched.last_login_at == 1779999999


def test_update_last_login_default_now(db: UsersDB):
    u = db.register("f@f.com", hash_password("p"))
    db.update_last_login(u.id)
    fetched = db.get_by_id(u.id)
    assert fetched.last_login_at is not None
    assert fetched.last_login_at > 0


def test_count(db: UsersDB):
    assert db.count() == 0
    db.register("u1@x.com", hash_password("p"))
    db.register("u2@x.com", hash_password("p"))
    assert db.count() == 2


def test_to_public_dict_omits_password_hash(db: UsersDB):
    u = db.register("g@g.com", hash_password("supersecret"))
    pub = u.to_public_dict()
    assert "password_hash" not in pub
    assert pub["email"] == "g@g.com"
    assert pub["id"] == u.id
