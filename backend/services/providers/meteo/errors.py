"""Provider errors (Sprint 2 — F4.1).

Mappa errori HTTP/network in eccezioni semantiche che l'orchestratore
(F8 fallback chain) puo' intercettare per decidere se usare il provider
successivo della catena o propagare l'errore al chiamante.

Convenzione:
    ProviderError                — base, errore non-retryable
    ProviderRateLimitError       — HTTP 429: rate limit upstream
    ProviderUnavailableError     — HTTP 5xx: provider down / degraded
    ProviderTimeoutError         — timeout connessione/lettura

Tutti gli errori conservano riferimento all'eccezione originale via
:attr:`__cause__` (impostato automaticamente da `raise ... from ...`).
"""
from __future__ import annotations


class ProviderError(Exception):
    """Errore base provider esterno.

    Sollevato per:
      - HTTP 4xx diversi da 429 (non retryable, dati richiesti invalidi)
      - errori di parsing della risposta
      - dati upstream malformati
    """

    def __init__(self, message: str, *, provider: str = "", status: int | None = None) -> None:
        super().__init__(message)
        self.provider = provider
        self.status = status


class ProviderRateLimitError(ProviderError):
    """HTTP 429 — rate limit upstream superato.

    L'orchestratore puo' decidere di:
      - aspettare e ritentare (in caso di bucket condiviso da piu' chiamate)
      - skippare al provider di fallback
    """


class ProviderUnavailableError(ProviderError):
    """HTTP 5xx — provider down o degraded.

    L'orchestratore tipicamente skippa al fallback senza retry.
    """


class ProviderTimeoutError(ProviderError):
    """Timeout connessione o lettura. Tratto come provider non disponibile."""
