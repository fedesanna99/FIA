"""
Test combinazioni NTC 2018 §2.5.

Casi di riferimento (calcoli manuali):

Esempio 1 — Telaio residenziale con neve e vento:
    G1 = 10 kN/m  (peso proprio)
    G2 = 8 kN/m   (finiture)
    Q_uso  = 5 kN/m   (residenziale A: ψ_0=0.7, ψ_1=0.5, ψ_2=0.3)
    Q_neve = 4 kN/m   (neve_low: ψ_0=0.5, ψ_1=0.2, ψ_2=0.0)
    Q_vento= 3 kN/m   (vento: ψ_0=0.6, ψ_1=0.2, ψ_2=0.0)

SLU (Q_uso principale):
    1.3·10 + 1.5·8 + 1.5·5 + 1.5·0.5·4 + 1.5·0.6·3 = 13+12+7.5+3+2.7 = 38.20

SLE caratteristica (Q_uso principale):
    10 + 8 + 5 + 0.5·4 + 0.6·3 = 23 + 2 + 1.8 = 26.80

SLE frequente (Q_uso principale):
    10 + 8 + 0.5·5 + 0.0·4 + 0.0·3 = 18 + 2.5 = 20.50

SLE quasi-permanente:
    10 + 8 + 0.3·5 + 0·4 + 0·3 = 19.50

SLU sismica (E=15):
    10 + 8 + 15 + 0.3·5 + 0·4 + 0·3 = 34.50
"""
import pytest
from hypothesis import given, strategies as st, settings

from core.combinations import (
    Action, combine_value, enumerate_combinations,
    envelope_scalar,
    GAMMA, PSI_0, PSI_1, PSI_2,
)
from core.combinations.actions import LoadCategory


def _sample_actions():
    return [
        Action(name="G1", type="G1", value=10),
        Action(name="G2", type="G2", value=8),
        Action(name="Q_uso",  type="Q", value=5, category="A_residential"),
        Action(name="Q_neve", type="Q", value=4, category="snow_low"),
        Action(name="Q_vento", type="Q", value=3, category="wind"),
    ]


# ─────────────────────── Tabelle coefficienti ───────────────────────

class TestPSITables:
    def test_psi_0_residential(self):
        assert PSI_0["A_residential"] == 0.70

    def test_psi_0_storage_is_one(self):
        """Deposito: ψ_0 = 1.0 (categoria più severa)."""
        assert PSI_0["E_storage"] == 1.00

    def test_psi_0_geq_psi_1_geq_psi_2_for_all_categories(self):
        """Per ogni categoria: ψ_0 ≥ ψ_1 ≥ ψ_2."""
        for cat in PSI_0.keys():
            assert PSI_0[cat] >= PSI_1[cat], f"{cat}: ψ_0 < ψ_1"
            assert PSI_1[cat] >= PSI_2[cat], f"{cat}: ψ_1 < ψ_2"

    def test_gamma_G1_NTC(self):
        assert GAMMA["G1_unfav"] == 1.30

    def test_gamma_Q_NTC(self):
        assert GAMMA["Q_unfav"] == 1.50

    def test_roof_psi_all_zero(self):
        assert PSI_0["H_roof"] == 0
        assert PSI_1["H_roof"] == 0
        assert PSI_2["H_roof"] == 0


# ─────────────────────── combine_value ───────────────────────

class TestSLUFundamental:
    def test_basic_example(self):
        """SLU con Q_uso principale → 38.20 (calcolo manuale)."""
        acts = _sample_actions()
        c = combine_value(acts, "SLU_fundamental", main_Q=acts[2])  # Q_uso
        assert c.value == pytest.approx(38.20, rel=1e-3)

    def test_main_q_neve(self):
        """SLU con Q_neve principale: 1.3·10+1.5·8+1.5·0.7·5+1.5·4+1.5·0.6·3
                                    = 13+12+5.25+6+2.7 = 38.95"""
        acts = _sample_actions()
        c = combine_value(acts, "SLU_fundamental", main_Q=acts[3])  # Q_neve
        assert c.value == pytest.approx(38.95, rel=1e-3)

    def test_main_q_wind(self):
        """SLU con Q_vento principale: 1.3·10+1.5·8+1.5·0.7·5+1.5·0.5·4+1.5·3
                                    = 13+12+5.25+3+4.5 = 37.75"""
        acts = _sample_actions()
        c = combine_value(acts, "SLU_fundamental", main_Q=acts[4])  # Q_vento
        assert c.value == pytest.approx(37.75, rel=1e-3)

    def test_factors_recorded(self):
        acts = _sample_actions()
        c = combine_value(acts, "SLU_fundamental", main_Q=acts[2])
        assert c.factors["G1"] == 1.30
        assert c.factors["G2"] == 1.50
        assert c.factors["Q_uso"] == 1.50
        # Q_neve come secondaria: γ_Q · ψ_0 = 1.5·0.5 = 0.75
        assert c.factors["Q_neve"] == pytest.approx(0.75)

    def test_only_permanent_loads(self):
        """G1=10, G2=8 → 1.3·10 + 1.5·8 = 25."""
        acts = [Action("G1", "G1", 10), Action("G2", "G2", 8)]
        c = combine_value(acts, "SLU_fundamental")
        assert c.value == pytest.approx(25.0)

    def test_missing_main_with_Q_raises(self):
        acts = _sample_actions()
        with pytest.raises(ValueError):
            combine_value(acts, "SLU_fundamental", main_Q=None)


class TestSLECharacteristic:
    def test_example(self):
        """SLE rara Q_uso main = 10+8+5+0.5·4+0.6·3 = 26.80"""
        acts = _sample_actions()
        c = combine_value(acts, "SLE_characteristic", main_Q=acts[2])
        assert c.value == pytest.approx(26.80, rel=1e-3)


class TestSLEFrequent:
    def test_example(self):
        """SLE frequente Q_uso main = 10+8+0.5·5+0.0·4+0.0·3 = 20.50"""
        acts = _sample_actions()
        c = combine_value(acts, "SLE_frequent", main_Q=acts[2])
        assert c.value == pytest.approx(20.50, rel=1e-3)


class TestSLEQuasiPermanent:
    def test_example(self):
        """qp = 10+8+0.3·5+0·4+0·3 = 19.50"""
        acts = _sample_actions()
        c = combine_value(acts, "SLE_quasi_permanent")
        assert c.value == pytest.approx(19.50, rel=1e-3)

    def test_qp_does_not_need_main(self):
        """qp non richiede main_Q (tutte ψ_2)."""
        acts = _sample_actions()
        c1 = combine_value(acts, "SLE_quasi_permanent", main_Q=None)
        c2 = combine_value(acts, "SLE_quasi_permanent", main_Q=acts[2])
        assert c1.value == c2.value


class TestSLUSeismic:
    def test_example(self):
        """Sismica: G1+G2+E+ψ_2·Q
        Con E=15: 10+8+15+0.3·5+0·4+0·3 = 34.50
        """
        acts = _sample_actions() + [Action("E", "E", 15)]
        c = combine_value(acts, "SLU_seismic")
        assert c.value == pytest.approx(34.50, rel=1e-3)

    def test_E_factor_one(self):
        acts = [Action("G1", "G1", 10), Action("E", "E", 20)]
        c = combine_value(acts, "SLU_seismic")
        assert c.factors["E"] == 1.0
        assert c.value == pytest.approx(30.0)


class TestSLUAccidental:
    def test_accidental_with_main_Q(self):
        """Eccezionale: G1+G2+A+ψ_1·Q_main+Σψ_2·Q_i
        A=20, Q_uso main: 10+8+20+0.5·5+0·4+0·3 = 40.50
        """
        acts = _sample_actions() + [Action("A", "A", 20)]
        # rendi Q_uso main
        q_main = next(a for a in acts if a.name == "Q_uso")
        c = combine_value(acts, "SLU_accidental", main_Q=q_main)
        assert c.value == pytest.approx(40.50, rel=1e-3)


# ─────────────────────── enumerate_combinations ───────────────────────

class TestEnumerateCombinations:
    def test_slu_enumerates_each_Q_as_main(self):
        acts = _sample_actions()
        combos = enumerate_combinations(acts, "SLU_fundamental")
        # 3 Q → 3 combinazioni
        assert len(combos) == 3
        names = [c.name for c in combos]
        assert "SLU_fundamental:Q_main=Q_uso" in names
        assert "SLU_fundamental:Q_main=Q_neve" in names
        assert "SLU_fundamental:Q_main=Q_vento" in names

    def test_qp_single_combination(self):
        acts = _sample_actions()
        combos = enumerate_combinations(acts, "SLE_quasi_permanent")
        assert len(combos) == 1

    def test_seismic_single_combination(self):
        acts = _sample_actions() + [Action("E", "E", 15)]
        combos = enumerate_combinations(acts, "SLU_seismic")
        assert len(combos) == 1

    def test_no_Q_returns_single(self):
        acts = [Action("G1", "G1", 10), Action("G2", "G2", 8)]
        combos = enumerate_combinations(acts, "SLU_fundamental")
        assert len(combos) == 1


# ─────────────────────── Envelope ───────────────────────

class TestEnvelope:
    def test_envelope_basic(self):
        env = envelope_scalar({"c1": 10.0, "c2": 25.0, "c3": -5.0})
        assert env.max_value == 25.0
        assert env.min_value == -5.0
        assert env.governing_combination_max == "c2"
        assert env.governing_combination_min == "c3"

    def test_envelope_empty_raises(self):
        with pytest.raises(ValueError):
            envelope_scalar({})

    def test_envelope_single_value(self):
        env = envelope_scalar({"only": 7.0})
        assert env.max_value == env.min_value == 7.0


# ─────────────────────── Property-based tests ───────────────────────

@st.composite
def actions_strategy(draw):
    """Genera un set di azioni valide per i test property-based."""
    g1 = draw(st.floats(min_value=0.0, max_value=100.0, allow_nan=False))
    g2 = draw(st.floats(min_value=0.0, max_value=100.0, allow_nan=False))
    n_q = draw(st.integers(min_value=1, max_value=4))
    categories: list[LoadCategory] = [
        "A_residential", "B_office", "snow_low", "wind",
    ]
    cats = draw(st.lists(st.sampled_from(categories),
                          min_size=n_q, max_size=n_q, unique=True))
    q_values = draw(st.lists(
        st.floats(min_value=0.0, max_value=50.0, allow_nan=False),
        min_size=n_q, max_size=n_q,
    ))
    acts: list[Action] = [
        Action("G1", "G1", g1),
        Action("G2", "G2", g2),
    ]
    for i, (cat, v) in enumerate(zip(cats, q_values)):
        acts.append(Action(name=f"Q_{i}", type="Q", value=v, category=cat))
    return acts


class TestPropertyBased:
    @given(actions=actions_strategy())
    @settings(max_examples=50, deadline=None)
    def test_slu_geq_sle_quasi_permanent(self, actions):
        """SLU max (su tutte le Q come main) ≥ SLE quasi-permanente (su stesso set).

        Motivazione: SLU usa γ ≥ 1 e ψ_0 ≥ ψ_2. Per valori non negativi delle
        azioni, SLU dovrebbe dominare.
        """
        combos_slu = enumerate_combinations(actions, "SLU_fundamental")
        if not combos_slu:
            return
        max_slu = max(c.value for c in combos_slu)
        qp = combine_value(actions, "SLE_quasi_permanent").value
        assert max_slu >= qp - 1e-9

    @given(actions=actions_strategy())
    @settings(max_examples=50, deadline=None)
    def test_slu_geq_sle_characteristic(self, actions):
        """SLU max ≥ SLE caratteristica max (per stesso main_Q)."""
        for main_Q in [a for a in actions if a.type == "Q"]:
            slu = combine_value(actions, "SLU_fundamental", main_Q=main_Q).value
            sle = combine_value(actions, "SLE_characteristic", main_Q=main_Q).value
            assert slu >= sle - 1e-9

    @given(actions=actions_strategy())
    @settings(max_examples=50, deadline=None)
    def test_sle_characteristic_geq_frequent(self, actions):
        """ψ_0 ≥ ψ_1 → SLE caratt. ≥ SLE freq. (per stesso main_Q)."""
        for main_Q in [a for a in actions if a.type == "Q"]:
            ch = combine_value(actions, "SLE_characteristic", main_Q=main_Q).value
            fr = combine_value(actions, "SLE_frequent", main_Q=main_Q).value
            assert ch >= fr - 1e-9

    @given(actions=actions_strategy())
    @settings(max_examples=50, deadline=None)
    def test_envelope_max_geq_each_combination(self, actions):
        """L'inviluppo del massimo è ≥ di ogni singola combinazione."""
        combos = enumerate_combinations(actions, "SLU_fundamental")
        if not combos:
            return
        values = {c.name: c.value for c in combos}
        env = envelope_scalar(values)
        for v in values.values():
            assert env.max_value >= v - 1e-9
            assert env.min_value <= v + 1e-9
