"""
In-memory sliding-window rate limiter per /api/auth/login.

Implementazione zero-dipendenze: deque[timestamp] per IP, finestra 15 min,
soglia 5 tentativi falliti.

Bug #28 dell'audit v2.3.5-nafems-truth-audit (P0 security, brute force).

NOTA architettura: in-memory per process — adatto al deploy single-machine
attuale di Fly.io. Per multi-machine futuro serve Redis o equivalente
condiviso. Documentato come limit conosciuto.
"""
from __future__ import annotations

import threading
import time
from collections import defaultdict, deque
from typing import Deque, Dict


class LoginRateLimiter:
    """Sliding-window counter di tentativi falliti per IP.

    Args:
        max_attempts: numero massimo tentativi falliti consentiti nella finestra.
        window_seconds: durata finestra rolling in secondi.
    """

    def __init__(self, max_attempts: int = 5, window_seconds: int = 15 * 60):
        self.max_attempts = max_attempts
        self.window = float(window_seconds)
        self._buckets: Dict[str, Deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def _prune(self, key: str, now: float) -> None:
        """Rimuove timestamp fuori dalla finestra."""
        bucket = self._buckets[key]
        cutoff = now - self.window
        while bucket and bucket[0] < cutoff:
            bucket.popleft()

    def is_blocked(self, key: str) -> bool:
        """True se ``key`` ha già esaurito i tentativi nella finestra corrente."""
        now = time.monotonic()
        with self._lock:
            self._prune(key, now)
            return len(self._buckets[key]) >= self.max_attempts

    def record_failure(self, key: str) -> int:
        """Registra un tentativo fallito. Restituisce conteggio corrente nella finestra."""
        now = time.monotonic()
        with self._lock:
            self._prune(key, now)
            self._buckets[key].append(now)
            return len(self._buckets[key])

    def reset(self, key: str) -> None:
        """Reset esplicito (es. login riuscito → azzera contatore IP)."""
        with self._lock:
            self._buckets.pop(key, None)

    def reset_all(self) -> None:
        """Clear globale (uso solo nei test)."""
        with self._lock:
            self._buckets.clear()


# Singleton condiviso fra request (in-memory, single-process).
# Per multi-process / multi-machine, sostituire con backend Redis.
login_limiter = LoginRateLimiter(max_attempts=5, window_seconds=15 * 60)
