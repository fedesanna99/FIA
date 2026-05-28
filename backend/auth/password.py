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


# v3.1.2 audit-fix L1-8 (P0 security): timing-safe dummy hash usato dal
# route /login quando l'email non esiste, per uniformare il response time
# con il caso "password sbagliata" (~50ms bcrypt cost 12). Senza questo
# fix, l'attaccante può enumerare email registrate misurando la differenza
# tra fast-path (email inesistente, no bcrypt) e slow-path (bcrypt verify).
# L'hash è generato al boot del modulo, una volta sola, con una password
# costante che NESSUN utente reale dovrebbe avere (ma comunque safe se sì).
_TIMING_DUMMY_HASH = bcrypt.hashpw(
    b"__feapro_dummy_timing_safe_password__",
    bcrypt.gensalt(rounds=_COST_FACTOR),
).decode("ascii")


def verify_dummy_password_timing_safe(plain: str) -> None:
    """Esegue un `verify_password` dummy per uniformare il timing.

    Da chiamare nel branch "utente non trovato" del login: il client
    osserva ~50ms identici al caso "password sbagliata", quindi non può
    distinguere via timing se l'email è registrata o no.
    """
    # Best-effort, errori silenti (l'hash dummy è valido, no eccezioni
    # attese; ma per robustezza non lasciamo passare).
    try:
        verify_password(plain or "x", _TIMING_DUMMY_HASH)
    except Exception:  # noqa: BLE001
        pass
