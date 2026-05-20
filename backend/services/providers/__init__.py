"""Concrete provider implementations (Sprint 2 — F4 onward).

Sub-packages organize providers by domain:
    providers.meteo      — weather + historical (Open-Meteo, ...)
    providers.geocoding  — coming F4.2
    providers.elevation  — coming F4.3
    providers.seismic    — coming F4.4

Each concrete provider inherits from :class:`services.base.Provider`
and is registered at app boot via :func:`services.registry.registry.register`.
"""
