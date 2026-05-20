"""Base astratta per i provider esterni (Sprint 1 — F1).

Generalizza il pattern v1.2 `AIProvider` a tutti i servizi:
geocoding, meteo, sismica, elevation, AI, ...

Sottoclassi devono dichiarare due ClassVar:
    domain: str   # es. "geocoding", "meteo", "ai"
    name: str     # es. "open_meteo", "nominatim", "gemini"

E implementare il coroutine `async def health(self) -> bool`.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, ClassVar, Generic, TypeVar


T = TypeVar("T")


class Provider(ABC, Generic[T]):
    """Base astratta. Stateless di default; sottoclassi possono iniettare client HTTP."""

    domain: ClassVar[str] = ""
    name: ClassVar[str] = ""

    def __init_subclass__(cls, **kwargs: Any) -> None:  # noqa: D401
        super().__init_subclass__(**kwargs)
        # Le classi concrete devono dichiarare domain+name; le ABC intermedie no.
        if not getattr(cls, "__abstractmethods__", None):
            if not cls.domain:
                raise TypeError(
                    f"Provider subclass {cls.__name__} must declare ClassVar `domain`"
                )
            if not cls.name:
                raise TypeError(
                    f"Provider subclass {cls.__name__} must declare ClassVar `name`"
                )

    @abstractmethod
    async def health(self) -> bool:
        """Ritorna True se il provider e' raggiungibile / configurato correttamente."""
        raise NotImplementedError
