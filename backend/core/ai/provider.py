"""
AIProvider — astrazione per backend AI (Gemini, mock, future: OpenAI, Anthropic).

Gemini API:
    POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
    Header: x-goog-api-key
    Body: {"contents":[{"parts":[{"text": "..."}]}]}
    Risposta: {"candidates":[{"content":{"parts":[{"text":"..."}]}}]}

MockProvider: per test offline. Risponde con euristiche locali (regole)
basate su keyword nel prompt — sufficiente per validare la pipeline.
"""
from __future__ import annotations
import os
import re
from abc import ABC, abstractmethod
from typing import Optional

import httpx


class AIError(RuntimeError):
    """Errore generico del provider AI."""


class AIProvider(ABC):
    """Interfaccia astratta per provider AI."""
    @abstractmethod
    def generate(self, prompt: str, *, max_tokens: int = 512) -> str:
        """Genera una risposta dal prompt. Solleva AIError su problemi."""


class GeminiProvider(AIProvider):
    """Provider Google Gemini 1.5 Flash (default) via REST."""

    DEFAULT_MODEL = "gemini-1.5-flash"
    BASE_URL = "https://generativelanguage.googleapis.com/v1beta"

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: str = DEFAULT_MODEL,
        timeout: float = 30.0,
    ):
        self.api_key = api_key or os.environ.get("GEMINI_API_KEY", "")
        self.model = model
        self.timeout = timeout

    def generate(self, prompt: str, *, max_tokens: int = 512) -> str:
        if not self.api_key:
            raise AIError(
                "GEMINI_API_KEY non impostata. "
                "Imposta la variabile d'ambiente o passa api_key esplicito."
            )
        url = f"{self.BASE_URL}/models/{self.model}:generateContent"
        body = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "maxOutputTokens": max_tokens,
                "temperature": 0.2,
            },
        }
        try:
            r = httpx.post(
                url,
                headers={"x-goog-api-key": self.api_key,
                          "Content-Type": "application/json"},
                json=body, timeout=self.timeout,
            )
        except httpx.HTTPError as e:
            raise AIError(f"Errore rete Gemini: {e}")
        if r.status_code >= 400:
            raise AIError(f"Gemini HTTP {r.status_code}: {r.text[:300]}")
        data = r.json()
        try:
            return data["candidates"][0]["content"]["parts"][0]["text"]
        except (KeyError, IndexError):
            raise AIError(f"Risposta Gemini malformata: {data}")


class MockProvider(AIProvider):
    """Provider locale, regola-based. Risponde a domande comuni sul modello
    serializzato nel prompt.

    Riconosce keyword:
        - "quanti nodi" / "how many nodes"     → conta i nodi
        - "quanti element" / "how many element" → conta gli elementi
        - "freccia" / "max displacement"        → cerca nel prompt
        - "verifica" / "check"                   → suggerimento generico
        - default: echo strutturato
    """

    def generate(self, prompt: str, *, max_tokens: int = 512) -> str:
        p = prompt.lower()
        # Conta nodi/elementi se l'informazione è nel prompt
        n_nodes = self._count_after(p, ["nodi:", "nodes:"])
        n_elements = self._count_after(p, ["elementi:", "elements:"])

        if any(k in p for k in ["quanti nodi", "how many nodes"]):
            return f"Il modello contiene {n_nodes or 0} nodi."
        if any(k in p for k in ["quanti element", "how many element"]):
            return f"Il modello contiene {n_elements or 0} elementi."
        if any(k in p for k in ["freccia massima", "max displacement"]):
            m = re.search(r"max[_ ]displacement[:= ]*([0-9.eE+-]+)", prompt)
            if m:
                return f"La freccia massima è {float(m.group(1)):.3e} m."
            return "Per calcolare la freccia massima, esegui prima l'analisi statica."
        if any(k in p for k in ["verifica", "check", "ec3", "ec2"]):
            return ("Suggerimento: per verificare gli elementi in acciaio "
                    "secondo EN 1993-1-1 usa l'endpoint POST /api/verify/ec3/{model_id}.")
        if any(k in p for k in ["sismic", "seismic", "spettro"]):
            return ("Per un'analisi sismica con spettro EC8 usa l'endpoint "
                    "/api/analysis/response-spectrum con i parametri "
                    "del sito (ag, S, TB/TC/TD).")
        # default: riassunto del prompt
        snippet = prompt[:120].replace("\n", " ").strip()
        return (
            f"[MockProvider] Ho ricevuto la richiesta: \"{snippet}...\". "
            "Per risposte AI reali, configura GEMINI_API_KEY e usa GeminiProvider."
        )

    @staticmethod
    def _count_after(text: str, keys: list[str]) -> int | None:
        for k in keys:
            m = re.search(re.escape(k) + r"\s*(\d+)", text)
            if m:
                return int(m.group(1))
        return None


def get_default_provider() -> AIProvider:
    """Sceglie il provider in base alle variabili d'ambiente.

    Se GEMINI_API_KEY è impostata, ritorna GeminiProvider; altrimenti MockProvider.
    Forzare via FEAPRO_AI_PROVIDER=mock|gemini.
    """
    forced = os.environ.get("FEAPRO_AI_PROVIDER", "").lower()
    if forced == "mock":
        return MockProvider()
    if forced == "gemini":
        return GeminiProvider()
    if os.environ.get("GEMINI_API_KEY"):
        return GeminiProvider()
    return MockProvider()
