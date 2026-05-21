"""Password hashing wrapper (bcrypt).

bcrypt e' compute-bound: ~50ms per hash su shared-cpu-1x (Fly). E'
voluto: rallenta gli attacchi brute-force. Il cost factor 12 e' lo
standard 2025 (OWASP: >= 10, raccomandato 12).
"""
from __future__ import annotations

import bcrypt

# Cost factor: 2^12 = 4096 iter, ~50ms/hash su CPU moderna
_COST_FACTOR = 12


def hash_password(plain: str) -> str:
    """Hash una password plaintext con bcrypt.

    Restituisce uno string ASCII (formato `$2b$...`) safe per SQLite/UTF-8.
    Solleva ValueError se la password e' vuota o troppo lunga (>72 byte:
    bcrypt non supporta input piu' lunghi).
    """
    if not plain:
        raise ValueError("password cannot be empty")
    pw_bytes = plain.encode("utf-8")
    if len(pw_bytes) > 72:
        raise ValueError("password too long (>72 bytes after UTF-8 encode)")
    salt = bcrypt.gensalt(rounds=_COST_FACTOR)
    return bcrypt.hashpw(pw_bytes, salt).decode("ascii")


def verify_password(plain: str, hashed: str) -> bool:
    """Verifica password plain contro hash bcrypt.

    Restituisce False (no eccezione) se hash malformato o password vuota,
    cosi' il caller puo' fare flusso uniforme `if not verify(...): 401`.
    """
    if not plain or not hashed:
        return False
    try:
        pw_bytes = plain.encode("utf-8")
        # bcrypt tronca silenziosamente >72 byte; check esplicito
        if len(pw_bytes) > 72:
            return False
        return bcrypt.checkpw(pw_bytes, hashed.encode("ascii"))
    except (ValueError, UnicodeError):
        return False
