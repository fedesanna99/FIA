"""Fallback chain orchestrator (Sprint 2 — F8).

Genericamente esegue un metodo sul provider primary di un dominio.
Su errore "retryable" (provider down, timeout, rate limit) o
`NotImplementedError` skippa al provider successivo della fallback
chain (env var `FEAPRO_<DOMAIN>_FALLBACK=csv`).

Esempio:
    # Registra i provider al boot
    from services.providers.registration import register_all
    register_all()

    # Usa l'orchestratore
    from services.orchestrator import orchestrator
    point = await orchestrator.call("elevation", "lookup", lat=41.9, lon=12.5)

Eccezioni:
    - ProviderUnavailableError / Timeout / RateLimit -> skip to next
    - NotImplementedError                              -> skip to next
    - Altri errori (ValueError, ProviderError 4xx)     -> propaga subito
    - Se TUTTI i provider falliscono                   -> ProviderUnavailableError
      aggregato con elenco dei tentativi.
"""
from __future__ import annotations

import logging
from typing import Any

from .providers.meteo.errors import (
    ProviderError,
    ProviderRateLimitError,
    ProviderTimeoutError,
    ProviderUnavailableError,
)
from .registry import ProviderRegistry, registry as default_registry


logger = logging.getLogger(__name__)


# Errori che attivano lo skip al prossimo provider della chain.
_RETRYABLE_EXCEPTIONS: tuple[type[BaseException], ...] = (
    ProviderUnavailableError,
    ProviderTimeoutError,
    ProviderRateLimitError,
    NotImplementedError,
)


class AllProvidersFailedError(ProviderUnavailableError):
    """Sollevata quando tutti i provider della chain falliscono.

    L'attributo `attempts` contiene la lista (provider_name, exception)
    per ogni tentativo, in ordine di esecuzione.
    """

    def __init__(self, domain: str, attempts: list[tuple[str, BaseException]]) -> None:
        names = " -> ".join(name for name, _ in attempts)
        msg = (
            f"All {len(attempts)} provider(s) for domain {domain!r} failed: {names}. "
            f"Last error: {attempts[-1][1] if attempts else 'unknown'}"
        )
        super().__init__(msg, provider="orchestrator")
        self.domain = domain
        self.attempts = attempts


class ServiceOrchestrator:
    """Orchestratore stateless basato sul registry."""

    def __init__(self, registry: ProviderRegistry | None = None) -> None:
        self.registry = registry if registry is not None else default_registry

    def get_chain(self, domain: str) -> list[Any]:
        """Ritorna la lista ordinata [primary, *fallbacks] dei provider."""
        return self.registry.fallback_chain(domain)

    async def call(
        self,
        domain: str,
        method: str,
        *args: Any,
        **kwargs: Any,
    ) -> Any:
        """Esegue `method(*args, **kwargs)` sul primary; fallback su errori
        retryable.

        Args:
            domain: dominio del provider (es. "elevation", "meteo")
            method: nome del metodo da chiamare (es. "lookup", "search")
            *args, **kwargs: parametri passati al metodo

        Returns:
            Il risultato del primo provider che ha successo.

        Raises:
            KeyError: dominio non registrato nel registry
            AllProvidersFailedError: tutti i provider della chain hanno fallito
            ValueError / ProviderError / altre: errori non-retryable propagati
              subito (no fallback)
        """
        chain = self.get_chain(domain)
        if not chain:
            raise KeyError(f"No providers registered for domain {domain!r}")

        attempts: list[tuple[str, BaseException]] = []
        for provider in chain:
            provider_name = getattr(provider, "name", "<unnamed>")
            fn = getattr(provider, method, None)
            if fn is None or not callable(fn):
                # Provider non implementa questo metodo: skip al next.
                attempts.append(
                    (
                        provider_name,
                        AttributeError(
                            f"provider {provider_name!r} has no method {method!r}"
                        ),
                    )
                )
                logger.info(
                    "orchestrator: provider %s has no method %s, trying next",
                    provider_name, method,
                )
                continue

            try:
                return await fn(*args, **kwargs)
            except _RETRYABLE_EXCEPTIONS as exc:
                attempts.append((provider_name, exc))
                logger.info(
                    "orchestrator: provider %s failed with %s, trying next",
                    provider_name, type(exc).__name__,
                )
                continue
            except Exception:
                # Non-retryable: propaga immediatamente senza tentare fallback.
                raise

        # Tutti i provider hanno fallito
        raise AllProvidersFailedError(domain=domain, attempts=attempts)

    async def call_by_name(
        self,
        domain: str,
        provider_name: str,
        method: str,
        *args: Any,
        **kwargs: Any,
    ) -> Any:
        """Bypassa la fallback chain e chiama un provider specifico per nome.

        Utile per scenari dove l'utente sceglie esplicitamente quale
        provider usare (es. tab admin "test connection").
        """
        provider = self.registry.get_by_name(domain, provider_name)
        fn = getattr(provider, method, None)
        if fn is None or not callable(fn):
            raise AttributeError(
                f"provider {provider_name!r} has no method {method!r}"
            )
        return await fn(*args, **kwargs)


# Singleton process-wide
orchestrator = ServiceOrchestrator()
