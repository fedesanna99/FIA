"""
API AI Copilot.

Endpoint:
    POST /api/ai/ask
        body: {model_id, question, include_static_results?, include_modal_results?}
        response: {answer, provider, elapsed_ms}

Default provider selezionato da get_default_provider() (Gemini se
GEMINI_API_KEY è impostata, altrimenti MockProvider per offline).
"""
from __future__ import annotations
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

import storage
from core.ai import FEAProCopilot, get_default_provider, AIError


router = APIRouter()


class AskRequest(BaseModel):
    model_id: str
    question: str
    include_static_results: bool = False
    include_modal_results: bool = False


@router.post("/ask")
def ai_ask(req: AskRequest):
    m = storage.get_model(req.model_id)
    if not m:
        raise HTTPException(404, f"Modello {req.model_id} non trovato")

    sr = mr = None
    if req.include_static_results:
        from core.solver import StaticSolver
        try:
            sr = StaticSolver(m).solve()
        except Exception as e:
            raise HTTPException(400, f"Errore solver statico: {e}")
    if req.include_modal_results:
        from core.solver import ModalSolver
        try:
            mr = ModalSolver(m).solve()
        except Exception as e:
            raise HTTPException(400, f"Errore solver modale: {e}")

    provider = get_default_provider()
    copilot = FEAProCopilot(provider)
    try:
        ans = copilot.ask(m, req.question,
                            static_results=sr, modal_results=mr)
    except AIError as e:
        raise HTTPException(502, f"Provider AI: {e}")
    except ValueError as e:
        raise HTTPException(400, str(e))
    return {
        "answer": ans.answer,
        "provider": ans.provider,
        "elapsed_ms": ans.elapsed_ms,
        "prompt_tokens_approx": ans.prompt_tokens_approx,
    }
