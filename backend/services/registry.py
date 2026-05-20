"""Provider registry singleton (Sprint 1 — F1).

Selezione del provider per dominio via env var:
    FEAPRO_<DOMAIN>_PROVIDER=<provider_name>

Fallback chain CSV:
    FEAPRO_<DOMAIN>_FALLBACK=nominatim,geoapify

Esempio d'uso (Sprint 2):
    registry.register(OpenMeteoGeocodingProvider)
    registry.register(NominatimProvider)
    provider = registry.get("geocoding")  # legge env var FEAPRO_GEOCODING_PROVIDER
"""
from __future__ import annotations

import asyncio
import os
from typing import Type

from .base import Provider


class ProviderRegistry:
    """Registry singleton process-wide.

    - I provider concreti vengono registrati al boot via `register()`.
    - `get(domain)` risolve il provider attivo leggendo l'env var
      `FEAPRO_<DOMAIN>_PROVIDER`. Il primo provider registrato per dominio
      diventa il default.
    - `fallback_chain(domain)` ritorna la lista ordinata
      [primary, *fallbacks] dei provider configurati per `domain`.
    - Nessun network call viene fatto in `register()` o `get()`.
    """

    def __init__(self) -> None:
        # domain -> name -> Provider instance
        self._providers: dict[str, dict[str, Provider]] = {}
        # domain -> default provider name (primo registrato o env override)
        self._default_by_domain: dict[str, str] = {}

    # ----- registrazione -------------------------------------------------
    def register(self, provider: Provider | Type[Provider]) -> Provider:
        """Registra un provider per il suo dominio.

        Accetta sia istanze sia classi (in quest'ultimo caso la istanzia con `()`).
        """
        instance = provider() if isinstance(provider, type) else provider
        domain = instance.domain
        name = instance.name
        if not domain or not name:
            raise ValueError("Provider must declare both `domain` and `name`")
        self._providers.setdefault(domain, {})[name] = instance
        # Primo registrato diventa default
        self._default_by_domain.setdefault(domain, name)
        return instance

    # ----- lookup --------------------------------------------------------
    def get(self, domain: str) -> Provider:
        """Restituisce il provider attivo per `domain`.

        Risoluzione:
          1. Env var `FEAPRO_<DOMAIN_UPPER>_PROVIDER` se presente e registrata
          2. Primo provider registrato per quel dominio
        """
        registered = self._providers.get(domain) or {}
        if not registered:
            raise KeyError(f"No provider registered for domain {domain!r}")
        env_var = f"FEAPRO_{domain.upper()}_PROVIDER"
        env_choice = os.environ.get(env_var, "").strip()
        if env_choice and env_choice in registered:
            return registered[env_choice]
        # Fallback al default
        default_name = self._default_by_domain.get(domain)
        if default_name and default_name in registered:
            return registered[default_name]
        # Se il default non c'e' (es. unregister), prendi qualunque
        return next(iter(registered.values()))

    def get_by_name(self, domain: str, name: str) -> Provider:
        registered = self._providers.get(domain) or {}
        if name not in registered:
            raise KeyError(f"Provider {name!r} for domain {domain!r} non registrato")
        return registered[name]

    def fallback_chain(self, domain: str) -> list[Provider]:
        """Ritorna la lista ordinata [primary, *fallbacks] secondo env var."""
        registered = self._providers.get(domain) or {}
        if not registered:
            return []
        primary = self.get(domain)
        chain: list[Provider] = [primary]
        seen: set[str] = {primary.name}
        env_var = f"FEAPRO_{domain.upper()}_FALLBACK"
        csv = os.environ.get(env_var, "").strip()
        if csv:
            for n in (s.strip() for s in csv.split(",")):
                if n and n in registered and n not in seen:
                    chain.append(registered[n])
                    seen.add(n)
        return chain

    # ----- introspezione -------------------------------------------------
    def list_domains(self) -> list[str]:
        return sorted(self._providers.keys())

    def list_providers(self, domain: str) -> list[str]:
        return sorted((self._providers.get(domain) or {}).keys())

    def health_all(self) -> dict[str, bool]:
        """Esegue health() su tutti i provider registrati. Sincrono per semplicita'.

        Ritorna un dict "{domain}/{name}" -> bool.
        """
        results: dict[str, bool] = {}
        for domain, by_name in self._providers.items():
            for name, prov in by_name.items():
                key = f"{domain}/{name}"
                try:
                    res = asyncio.run(prov.health())
                    results[key] = bool(res)
                except RuntimeError:
                    # Gia' in event loop: skip (l'host puo' richiamare async esplicitamente).
                    results[key] = False
                except Exception:
                    results[key] = False
        return results

    # ----- testing -------------------------------------------------------
    def clear(self) -> None:
        """Helper per i test: svuota il registry."""
        self._providers.clear()
        self._default_by_domain.clear()


# Singleton process-wide
registry = ProviderRegistry()
