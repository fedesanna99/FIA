"""
Test del solver pushover (analisi limite con cerniere plastiche).

Riferimenti analitici:
- Cantilever con P in punta: meccanismo a 1 cerniera al vincolo, P_pl = M_pl/L
- Trave appoggiata con UDL: meccanismo a 1 cerniera al centro, w_pl = 8·M_pl/L²
- Trave incastro-appoggio con UDL: meccanismo a 2 cerniere
- Trave bi-incastrata con UDL: meccanismo a 3 cerniere, w_pl = 16·M_pl/L²
"""
import pytest

from schemas import (
    FEAModel, Node, Element, Load, Constraint,
    ElementType, LoadType, ConstraintType,
    MATERIALS_DB, SECTIONS_DB,
)
from core.solver import PushoverSolver


def _M_pl(material_id: str, section_id: str) -> float:
    return MATERIALS_DB[material_id].fy * SECTIONS_DB[section_id].Wply


def _cantilever(L: float, P_ref: float, n_div: int = 5,
                material_id: str = "steel_s355",
                section_id: str = "ipe_300") -> FEAModel:
    nodes = [Node(id=i + 1, x=L * i / n_div, y=0, z=0) for i in range(n_div + 1)]
    elements = [
        Element(id=i + 1, type=ElementType.BEAM2D, nodes=[i + 1, i + 2],
                material_id=material_id, section_id=section_id)
        for i in range(n_div)
    ]
    constraints = [Constraint(id=1, type=ConstraintType.FIXED, node_id=1)]
    loads = [Load(id=1, type=LoadType.NODAL, target_id=n_div + 1, fy=P_ref)]
    return FEAModel(id="po_ct", name="ct", is_3d=False,
                    nodes=nodes, elements=elements,
                    constraints=constraints, loads=loads)


class TestCantileverPlastic:
    """Cantilever IPE 300 S355: M_pl = 628.4e-6 · 355e6 = 223.08 kN·m.

    Con P_ref = -10 kN, L = 3 m → P_pl = M_pl/L = 74.36 kN → λ_pl = 7.436.
    """

    def test_first_hinge_at_clamp(self):
        m = _cantilever(L=3.0, P_ref=-10e3, n_div=5)
        r = PushoverSolver(m, lambda_step=0.05, lambda_max=15.0).solve()
        assert len(r.hinge_events) >= 1
        first = r.hinge_events[0]
        # La prima cerniera si forma sull'elemento incastrato (id=1) al nodo i
        assert first.element_id == 1
        assert first.end == "i"

    def test_collapse_lambda_matches_analytical(self):
        L = 3.0
        P_ref = -10e3
        m = _cantilever(L=L, P_ref=P_ref, n_div=5)
        r = PushoverSolver(m, lambda_step=0.05, lambda_max=15.0).solve()
        # λ_pl atteso = M_pl / (|P_ref|·L)
        M_pl = _M_pl("steel_s355", "ipe_300")
        lam_pl_expected = M_pl / (abs(P_ref) * L)
        first = r.hinge_events[0]
        # Errore tipico ≈ lambda_step / 2; con lambda_step=0.05 e λ≈7.4, err ≈ 0.7%
        assert first.lambda_value == pytest.approx(lam_pl_expected, rel=0.02)

    def test_collapse_reason_set(self):
        m = _cantilever(L=3.0, P_ref=-10e3, n_div=5)
        r = PushoverSolver(m, lambda_step=0.1, lambda_max=15.0).solve()
        # Cantilever 1 cerniera → meccanismo → δ esplode → "Spostamento eccede..."
        assert r.collapse_lambda is not None
        assert "spostamento" in r.collapse_reason.lower() or \
               "meccanismo" in r.collapse_reason.lower() or \
               "singolare" in r.collapse_reason.lower()

    def test_steps_curve_monotonic_until_hinge(self):
        """Prima della cerniera la δ cresce linearmente con λ."""
        m = _cantilever(L=3.0, P_ref=-10e3, n_div=5)
        r = PushoverSolver(m, lambda_step=0.05, lambda_max=15.0).solve()
        # δ degli step deve essere monotonicamente crescente
        deltas = [s.delta_control for s in r.steps]
        for i in range(1, len(deltas)):
            assert deltas[i] >= deltas[i - 1] - 1e-9


class TestParametricMaterials:
    """Materiali diversi → λ_pl diverso. M_pl scala con f_y."""

    def test_s355_vs_s235(self):
        """Stesso modello, λ_pl(S355) / λ_pl(S235) ≈ 355/235."""
        L = 3.0; P_ref = -10e3
        m1 = _cantilever(L=L, P_ref=P_ref, material_id="steel_s355")
        m2 = _cantilever(L=L, P_ref=P_ref, material_id="steel_s235")
        r1 = PushoverSolver(m1, lambda_step=0.05, lambda_max=20.0).solve()
        r2 = PushoverSolver(m2, lambda_step=0.05, lambda_max=20.0).solve()
        ratio = r1.hinge_events[0].lambda_value / r2.hinge_events[0].lambda_value
        assert ratio == pytest.approx(355.0 / 235.0, rel=0.05)

    def test_ipe300_vs_ipe200(self):
        """Sezione minore → M_pl minore → λ_pl minore."""
        m1 = _cantilever(L=3.0, P_ref=-10e3, section_id="ipe_300")
        m2 = _cantilever(L=3.0, P_ref=-10e3, section_id="ipe_200")
        r1 = PushoverSolver(m1, lambda_step=0.05, lambda_max=15.0).solve()
        r2 = PushoverSolver(m2, lambda_step=0.05, lambda_max=15.0).solve()
        assert r2.hinge_events[0].lambda_value < r1.hinge_events[0].lambda_value


class TestEdgeCases:
    def test_zero_lambda_step_raises(self):
        m = _cantilever(L=3.0, P_ref=-10e3)
        with pytest.raises(ValueError):
            PushoverSolver(m, lambda_step=0)

    def test_no_load_no_hinges(self):
        """P_ref=0 → nessuna cerniera, completa lambda_max."""
        m = _cantilever(L=3.0, P_ref=0.0)
        r = PushoverSolver(m, lambda_step=0.5, lambda_max=2.0).solve()
        assert len(r.hinge_events) == 0
        # Nessun collasso "fisico", lambda_max raggiunto
        assert r.collapse_lambda is None or r.collapse_reason.startswith("λ_max")

    def test_non_steel_material_no_hinges(self):
        """Materiale senza f_y (es. legno) → M_pl indefinito → no hinges."""
        m = _cantilever(L=3.0, P_ref=-10e3, material_id="timber_c24",
                        section_id="rect_300x500")
        r = PushoverSolver(m, lambda_step=0.5, lambda_max=2.0).solve()
        assert len(r.hinge_events) == 0


class TestResultsStructure:
    def test_results_contain_required_fields(self):
        m = _cantilever(L=3.0, P_ref=-10e3)
        r = PushoverSolver(m, lambda_step=0.1, lambda_max=15.0).solve()
        assert r.analysis_type == "pushover"
        assert r.model_id == "po_ct"
        assert r.solve_time_ms > 0
        assert all(s.lambda_value > 0 for s in r.steps)
        assert all(s.delta_control >= 0 for s in r.steps)
        assert all(h.step >= 1 for h in r.hinge_events)
