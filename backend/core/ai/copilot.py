"""
FEAProCopilot — logica di alto livello dell'assistente AI.

Pipeline:
    1. Serializza il modello in una "scheda riassuntiva" testuale compatta
       (nodi, elementi per tipo, vincoli, carichi, eventuali risultati).
    2. Concatena alla scheda la domanda dell'utente.
    3. Chiama il provider AI per generare la risposta.
    4. Ritorna CopilotAnswer con risposta + tempo di risposta + provider usato.
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import Optional
import time

from schemas import FEAModel
from schemas.results import StaticResults, ModalResults
from .provider import AIProvider, AIError


_SYSTEM_PROMPT = (
    "Sei un assistente AI esperto in analisi strutturale agli elementi finiti. "
    "Rispondi in modo conciso, in italiano se la domanda è in italiano. "
    "Quando suggerisci comandi/endpoint API, usa la sintassi di FEA Pro: "
    "/api/analysis/static/{model_id}, /api/verify/ec3/{model_id}, ecc.\n"
)


@dataclass
class CopilotAnswer:
    answer: str
    provider: str
    elapsed_ms: float
    prompt_tokens_approx: int = 0


def _summarize_model(model: FEAModel) -> str:
    """Produce un riassunto testuale compatto del modello."""
    by_type: dict[str, int] = {}
    for e in model.elements:
        by_type[e.type.value] = by_type.get(e.type.value, 0) + 1
    parts = [
        f"Modello: {model.name or model.id}",
        f"Is 3D: {model.is_3d}",
        f"Nodi: {len(model.nodes)}",
        f"Elementi: {len(model.elements)}",
    ]
    if by_type:
        parts.append("Per tipo: " + ", ".join(
            f"{k}={v}" for k, v in sorted(by_type.items())
        ))
    parts.extend([
        f"Vincoli: {len(model.constraints)}",
        f"Carichi: {len(model.loads)}",
    ])
    if model.description:
        parts.append(f"Descrizione: {model.description[:200]}")
    return "\n".join(parts)


def _summarize_static(results: StaticResults) -> str:
    return (
        f"Risultati statici disponibili:\n"
        f"max_displacement: {results.max_displacement:.3e} m\n"
        f"max_stress: {results.max_stress:.3e} Pa\n"
        f"n_dofs: {results.n_dofs}\n"
        f"solve_time_ms: {results.solve_time_ms:.1f}"
    )


def _summarize_modal(results: ModalResults) -> str:
    lines = [f"Risultati modali ({results.n_modes} modi):"]
    for m in results.modes[:5]:
        lines.append(
            f"  Modo {m.mode}: f={m.frequency_hz:.3f} Hz, T={m.period:.3f} s, "
            f"px={m.participation_x:.2f} py={m.participation_y:.2f}"
        )
    return "\n".join(lines)


class FEAProCopilot:
    """Copilot conversazionale sopra l'AIProvider iniettato."""

    def __init__(self, provider: AIProvider, *, system_prompt: str = _SYSTEM_PROMPT):
        self.provider = provider
        self.system_prompt = system_prompt

    def ask(
        self,
        model: FEAModel,
        question: str,
        *,
        static_results: Optional[StaticResults] = None,
        modal_results: Optional[ModalResults] = None,
        max_tokens: int = 512,
    ) -> CopilotAnswer:
        """Compone il prompt e invia al provider."""
        if not question or not question.strip():
            raise ValueError("question non può essere vuota")

        chunks = [self.system_prompt, _summarize_model(model)]
        if static_results is not None:
            chunks.append(_summarize_static(static_results))
        if modal_results is not None:
            chunks.append(_summarize_modal(modal_results))
        chunks.append(f"\nDomanda: {question.strip()}")
        prompt = "\n".join(chunks)

        t0 = time.time()
        try:
            answer = self.provider.generate(prompt, max_tokens=max_tokens)
        except AIError:
            raise
        elapsed = (time.time() - t0) * 1000.0

        return CopilotAnswer(
            answer=answer.strip(),
            provider=type(self.provider).__name__,
            elapsed_ms=elapsed,
            prompt_tokens_approx=len(prompt) // 4,  # rough heuristic
        )
