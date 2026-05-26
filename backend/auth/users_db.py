"""SQLite users storage (alpha.13).

Schema:
    users(id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL, created_at INTEGER NOT NULL,
          last_login_at INTEGER)

Path: env `FEAPRO_USERS_DB` o default `<FEAPRO_DATA_DIR>/users.sqlite`
(coerente con altre SQLite tracker/cache del progetto: stesso volume).
"""
from __future__ import annotations

import os
import sqlite3
import time
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Optional


# ── Exceptions ──────────────────────────────────────────────────────────────
class UserAlreadyExistsError(Exception):
    """Raised quando email gia' registrata (UNIQUE constraint)."""


class UserNotFoundError(Exception):
    """Raised quando lookup non trova alcun user."""


# ── DTO ─────────────────────────────────────────────────────────────────────
@dataclass(frozen=True)
class User:
    id: str
    email: str
    password_hash: str
    created_at: int
    last_login_at: Optional[int] = None
    # v2.6.4 A.2: gate per autoplay del tour onboarding al primo login.
    # Default False; PATCH /api/auth/onboarding lo setta a True quando l'utente
    # chiude il tour (`[Salta]`, `[Fine]`, ESC, click backdrop). "Rivedi tour"
    # dal menu Help lo riporta a False.
    onboarding_completed: bool = False

    def to_public_dict(self) -> dict:
        """Senza password_hash, per response API."""
        return {
            "id": self.id,
            "email": self.email,
            "created_at": self.created_at,
            "last_login_at": self.last_login_at,
            "onboarding_completed": self.onboarding_completed,
        }


# ── Default path helper ─────────────────────────────────────────────────────
def _default_db_path() -> Path:
    """Path file SQLite: FEAPRO_USERS_DB > FEAPRO_DATA_DIR/users.sqlite > cwd."""
    override = os.getenv("FEAPRO_USERS_DB", "").strip()
    if override:
        return Path(override)
    data_dir = os.getenv("FEAPRO_DATA_DIR", "").strip()
    if data_dir:
        return Path(data_dir) / "users.sqlite"
    return Path.cwd() / "users.sqlite"


# ── CRUD ────────────────────────────────────────────────────────────────────
class UsersDB:
    """Wrapper sottile su SQLite per la tabella `users`."""

    def __init__(self, db_path: Optional[Path] = None):
        self.db_path = db_path or _default_db_path()
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_schema()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path, isolation_level=None)
        conn.row_factory = sqlite3.Row
        # WAL = letture concorrenti senza bloccare scritture
        conn.execute("PRAGMA journal_mode=WAL")
        return conn

    def _init_schema(self) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    email TEXT UNIQUE NOT NULL COLLATE NOCASE,
                    password_hash TEXT NOT NULL,
                    created_at INTEGER NOT NULL,
                    last_login_at INTEGER
                )
                """
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)"
            )
            # v2.6.4 A.2: migration idempotente del campo onboarding_completed.
            # SQLite supporta ALTER TABLE ADD COLUMN solo se la colonna NON
            # esiste già; il check via pragma_table_info evita l'errore su DB
            # già migrati. Default 0 (false) — gli utenti pre-esistenti
            # vedranno il tour autoplay al loro prossimo login.
            cols = {
                row["name"]
                for row in conn.execute("PRAGMA table_info(users)").fetchall()
            }
            if "onboarding_completed" not in cols:
                conn.execute(
                    "ALTER TABLE users ADD COLUMN "
                    "onboarding_completed INTEGER NOT NULL DEFAULT 0"
                )

    def register(self, email: str, password_hash: str) -> User:
        """Insert nuovo user. Solleva UserAlreadyExistsError su UNIQUE conflict."""
        email_norm = email.strip().lower()
        if not email_norm:
            raise ValueError("email cannot be empty")
        if not password_hash:
            raise ValueError("password_hash cannot be empty")

        user_id = uuid.uuid4().hex
        now = int(time.time())
        try:
            with self._connect() as conn:
                conn.execute(
                    "INSERT INTO users(id, email, password_hash, created_at) "
                    "VALUES(?, ?, ?, ?)",
                    (user_id, email_norm, password_hash, now),
                )
        except sqlite3.IntegrityError as e:
            raise UserAlreadyExistsError(f"email already registered: {email_norm}") from e
        return User(
            id=user_id, email=email_norm,
            password_hash=password_hash,
            created_at=now, last_login_at=None,
        )

    def get_by_email(self, email: str) -> User:
        email_norm = email.strip().lower()
        with self._connect() as conn:
            row = conn.execute(
                "SELECT * FROM users WHERE email = ?", (email_norm,)
            ).fetchone()
        if row is None:
            raise UserNotFoundError(f"no user with email {email_norm}")
        return _row_to_user(row)

    def get_by_id(self, user_id: str) -> User:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT * FROM users WHERE id = ?", (user_id,)
            ).fetchone()
        if row is None:
            raise UserNotFoundError(f"no user with id {user_id}")
        return _row_to_user(row)

    def update_last_login(self, user_id: str, ts: Optional[int] = None) -> None:
        ts = ts if ts is not None else int(time.time())
        with self._connect() as conn:
            conn.execute(
                "UPDATE users SET last_login_at = ? WHERE id = ?",
                (ts, user_id),
            )

    def set_onboarding_completed(self, user_id: str, completed: bool) -> User:
        """v2.6.4 A.2: setta lo stato onboarding_completed dell'utente.

        Usato da:
          - PATCH /api/auth/onboarding {completed: true} → tour terminato/skippato
          - "Rivedi tour" dal menu Help → completed=False (replay)

        Solleva UserNotFoundError se user_id non esiste.
        """
        with self._connect() as conn:
            cur = conn.execute(
                "UPDATE users SET onboarding_completed = ? WHERE id = ?",
                (1 if completed else 0, user_id),
            )
            if cur.rowcount == 0:
                raise UserNotFoundError(f"no user with id {user_id}")
            row = conn.execute(
                "SELECT * FROM users WHERE id = ?", (user_id,)
            ).fetchone()
        return _row_to_user(row)

    def count(self) -> int:
        with self._connect() as conn:
            return conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]

    def delete(self, user_id: str) -> bool:
        """Hard delete user record. Returns True se eliminato, False se non esisteva.

        Usato esclusivamente dal cascade GDPR (DELETE /api/auth/me).
        Irreversibile. Da NON chiamare in flussi normali.
        """
        with self._connect() as conn:
            cur = conn.execute("DELETE FROM users WHERE id = ?", (user_id,))
            return cur.rowcount > 0


def _row_to_user(row: sqlite3.Row) -> User:
    # v2.6.4 A.2: onboarding_completed potrebbe non esistere se la migration
    # non è ancora stata applicata (es. tests legacy con DB pre-creato).
    # Default a False per backward compat.
    try:
        onboarding = bool(row["onboarding_completed"])
    except (KeyError, IndexError):
        onboarding = False
    return User(
        id=row["id"], email=row["email"],
        password_hash=row["password_hash"],
        created_at=row["created_at"],
        last_login_at=row["last_login_at"],
        onboarding_completed=onboarding,
    )


# ── Singleton helper ────────────────────────────────────────────────────────
_users_db_singleton: Optional[UsersDB] = None


def get_users_db() -> UsersDB:
    """Singleton handle. Usa il path da env (calcolato al primo uso)."""
    global _users_db_singleton
    if _users_db_singleton is None:
        _users_db_singleton = UsersDB()
    return _users_db_singleton


def _reset_singleton_for_tests() -> None:
    """Solo per pytest: forza ri-creazione (utile dopo env var changes)."""
    global _users_db_singleton
    _users_db_singleton = None
