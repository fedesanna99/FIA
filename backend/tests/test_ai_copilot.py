"""
Test AI Copilot — MockProvider, Copilot, API /api/ai/ask.

Tutti i test offline: nessuna chiamata di rete a Gemini.
"""
from __future__ import annotations
import os
import pytest

from schemas import (
    FEAModel, Node, Element, Load, Constraint,
    ElementType, LoadType, ConstraintType,
)
from core.ai import MockProvider, GeminiProvider, FEAProCopilot, AIError, get_default_provider


def _sample_model() -> FEAModel:
    return FEAModel(
        id="aitest", name="AITest", is_3d=False,
        nodes=[Node(id=i + 1, x=i, y=0, z=0) for i in range(3)],
        elements=[
            Element(id=1, type=ElementType.BEAM2D, nodes=[1, 2],
                     material_id="steel_s355", section_id="ipe_300"),
            Element(id=2, type=ElementType.BEAM2D, nodes=[2, 3],
                     material_id="steel_s355", section_id="ipe_300"),
        ],
        constraints=[Constraint(id=1, type=ConstraintType.FIXED, node_id=1)],
        loads=[Load(id=1, type=LoadType.NODAL, target_id=3, fy=-1000)],
    )


class TestMockProvider:
    def test_counts_nodes(self):
        p = MockProvider()
        prompt = "Nodi: 5\nElementi: 4\nQuanti nodi ci sono?"
        ans = p.generate(prompt)
        assert "5" in ans

    def test_counts_elements(self):
        p = MockProvider()
        prompt = "Nodi: 5\nElementi: 4\nQuanti elementi?"
        ans = p.generate(prompt)
        assert "4" in ans

    def test_verifica_suggestion(self):
        p = MockProvider()
        ans = p.generate("Come faccio la verifica EC3?")
        assert "verify/ec3" in ans

    def test_sismica_suggestion(self):
        p = MockProvider()
        ans = p.generate("come faccio analisi sismica?")
        assert "response-spectrum" in ans

    def test_max_displacement_with_value(self):
        p = MockProvider()
        prompt = "max_displacement: 0.005\nQual è la freccia massima?"
        ans = p.generate(prompt)
        assert "5.000e-03" in ans

    def test_fallback(self):
        p = MockProvider()
        ans = p.generate("blah blah")
        assert "MockProvider" in ans


class TestGeminiProviderOffline:
    def test_missing_key_raises(self):
        p = GeminiProvider(api_key="")
        with pytest.raises(AIError) as ei:
            p.generate("hello")
        assert "GEMINI_API_KEY" in str(ei.value)


class TestProviderSelection:
    def test_force_mock_via_env(self, monkeypatch):
        monkeypatch.setenv("FEAPRO_AI_PROVIDER", "mock")
        # Anche se GEMINI_API_KEY è impostata
        monkeypatch.setenv("GEMINI_API_KEY", "fake")
        p = get_default_provider()
        assert isinstance(p, MockProvider)

    def test_default_no_key_returns_mock(self, monkeypatch):
        monkeypatch.delenv("FEAPRO_AI_PROVIDER", raising=False)
        monkeypatch.delenv("GEMINI_API_KEY", raising=False)
        p = get_default_provider()
        assert isinstance(p, MockProvider)

    def test_default_with_key_returns_gemini(self, monkeypatch):
        monkeypatch.delenv("FEAPRO_AI_PROVIDER", raising=False)
        monkeypatch.setenv("GEMINI_API_KEY", "fake_key")
        p = get_default_provider()
        assert isinstance(p, GeminiProvider)


class TestCopilot:
    def test_ask_with_mock_provider(self):
        c = FEAProCopilot(MockProvider())
        m = _sample_model()
        ans = c.ask(m, "Quanti nodi ha il modello?")
        assert "3" in ans.answer
        assert ans.provider == "MockProvider"
        assert ans.elapsed_ms >= 0
        assert ans.prompt_tokens_approx > 0

    def test_ask_with_static_results(self):
        from schemas.results import StaticResults
        c = FEAProCopilot(MockProvider())
        m = _sample_model()
        sr = StaticResults(model_id="aitest", max_displacement=0.005,
                            max_stress=1e8, n_dofs=18, solve_time_ms=15.0)
        ans = c.ask(m, "Qual è la freccia massima?", static_results=sr)
        # MockProvider con max_displacement nel prompt ritorna il valore
        assert "5.000e-03" in ans.answer

    def test_empty_question_raises(self):
        c = FEAProCopilot(MockProvider())
        with pytest.raises(ValueError):
            c.ask(_sample_model(), "")


class TestAIEndpoint:
    def test_ask_via_api(self, monkeypatch):
        monkeypatch.setenv("FEAPRO_AI_PROVIDER", "mock")
        from fastapi.testclient import TestClient
        from main import app
        import storage
        m = _sample_model(); m.id = storage.new_id(); storage.save_model(m)
        client = TestClient(app)
        try:
            r = client.post(
                "/api/ai/ask",
                json={"model_id": m.id, "question": "Quanti elementi ha questo modello?"},
            )
            assert r.status_code == 200, r.text
            data = r.json()
            assert "answer" in data
            assert data["provider"] == "MockProvider"
            # Il modello ha 2 elementi
            assert "2" in data["answer"]
        finally:
            storage.delete_model(m.id)

    def test_404_missing_model(self, monkeypatch):
        monkeypatch.setenv("FEAPRO_AI_PROVIDER", "mock")
        from fastapi.testclient import TestClient
        from main import app
        client = TestClient(app)
        r = client.post(
            "/api/ai/ask",
            json={"model_id": "nope", "question": "hello"},
        )
        assert r.status_code == 404

    def test_empty_question_400(self, monkeypatch):
        monkeypatch.setenv("FEAPRO_AI_PROVIDER", "mock")
        from fastapi.testclient import TestClient
        from main import app
        import storage
        m = _sample_model(); m.id = storage.new_id(); storage.save_model(m)
        client = TestClient(app)
        try:
            r = client.post(
                "/api/ai/ask",
                json={"model_id": m.id, "question": "   "},
            )
            assert r.status_code == 400
        finally:
            storage.delete_model(m.id)
