"""
AI Copilot per FEA Pro.

Modulo:
    - provider.py : AIProvider (interface) + GeminiProvider + MockProvider
    - copilot.py  : logica di alto livello (serializza modello → prompt → risposta)

Usage:
    from core.ai import get_default_provider, FEAProCopilot
    provider = get_default_provider()
    copilot = FEAProCopilot(provider)
    answer = copilot.ask(model, "Quante travi sono presenti?")
"""
from .provider import (
    AIProvider, GeminiProvider, MockProvider,
    get_default_provider, AIError,
)
from .copilot import FEAProCopilot, CopilotAnswer

__all__ = [
    "AIProvider", "GeminiProvider", "MockProvider",
    "get_default_provider", "AIError",
    "FEAProCopilot", "CopilotAnswer",
]
