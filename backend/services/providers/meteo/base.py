"""MeteoProvider — ABC per provider meteo (Sprint 2 — F4.1).

Eredita da `services.base.Provider` per integrarsi con registry + health_all.
Aggiunge contratto domain-specifico:
    forecast(lat, lon, days)               -> ForecastResult
    historical_extremes(lat, lon, years)   -> WindSnowExtremes
    health_check()                          -> ProviderHealth   (ricco)
    health()                                -> bool             (compat Provider ABC)

Il runbook ipotizzava un `typing.Protocol` ma il pattern esistente in
Sprint 1 (services/base.py) usa ABC + ClassVar enforcement, e il
registry chiama `health()` sui provider registrati. Inheriting via
ABC conserva compat + duck-typing al `MeteoProvider` Protocol.
"""
from __future__ import annotations

from abc import abstractmethod
from typing import Any, ClassVar, Literal

from ...base import Provider
from .types import ForecastResult, ProviderHealth, WindSnowExtremes


VariableName = Literal["wind_gust", "snowfall"]


class MeteoProvider(Provider[Any]):
    """Base astratta per provider meteo.

    Dominio fisso `"meteo"`. Le sottoclassi concrete devono solo
    dichiarare `name` (ClassVar) e implementare i 3 metodi abstract.

    NOTA implementativa: `Provider.__init_subclass__` controlla che
    `domain` + `name` siano valorizzati al momento della creazione della
    classe, ma `ABCMeta` popola `__abstractmethods__` solo DOPO che
    `__init_subclass__` e' stato eseguito. Per questo dichiariamo
    `name="_abstract"` come placeholder: il check passa, ma il nome
    "_abstract" non viene mai usato perche' nessuno istanzia / registra
    `MeteoProvider` direttamente (e' ABC, non istanziabile).
    """

    domain: ClassVar[str] = "meteo"
    name: ClassVar[str] = "_abstract"  # vedi nota sopra

    @abstractmethod
    async def forecast(
        self,
        lat: float,
        lon: float,
        days: int = 7,
    ) -> ForecastResult:
        """Previsioni orarie per `days` giorni a partire da oggi."""
        raise NotImplementedError

    @abstractmethod
    async def historical_extremes(
        self,
        lat: float,
        lon: float,
        years: int = 80,
        variables: list[VariableName] | None = None,
    ) -> WindSnowExtremes:
        """Estremi (max + 50y) su finestra storica `years` anni.

        Args:
            lat, lon: coordinate punto.
            years: numero di anni di reanalysis (max 85 = ERA5 dal 1940).
            variables: subset di variabili da elaborare (default tutte).
        """
        raise NotImplementedError

    @abstractmethod
    async def health_check(self) -> ProviderHealth:
        """Snapshot health ricco (con latency e ultimo errore)."""
        raise NotImplementedError

    # ---- Provider ABC compat ---------------------------------------------
    async def health(self) -> bool:
        """Compat con :class:`services.base.Provider`.

        Chiamato dal registry. Wrappa `health_check()` e ritorna bool.
        Eccezioni vengono catturate (un provider down non deve far
        crashare `registry.health_all()`).
        """
        try:
            h = await self.health_check()
        except Exception:
            return False
        return h.status == "ok"
