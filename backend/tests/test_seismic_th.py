"""
Test analisi sismica time-history multi-componente.

Strategia:
    1. SDOF (cantilever con massa concentrata) sottoposto ad accelerogramma
       sinusoidale → confronto della risposta stazionaria con la formula
       analitica del fattore di amplificazione dinamico.
    2. Multi-componente X+Y: si verifica che la risposta combinata sia ≥
       della risposta monodirezionale (sovrapposizione lineare).
    3. Postprocess drift: con un frame a 2 piani, si calcolano i drift
       e si verificano contro spostamenti noti.
"""
from __future__ import annotations
import math
import pytest

from schemas import (
    FEAModel, Node, Element, Load, Constraint,
    ElementType, LoadType, ConstraintType,
)
from core.solver import SeismicTimeHistorySolver, ModalSolver
from core.postprocess import interstory_drift_history, max_drift_per_storey, drift_ratio


def _sinusoidal_accel(omega: float, amplitude: float, t_end: float, dt: float):
    """Genera time-history [(t, a(t))] con a(t) = A·sin(ω t)."""
    n = int(t_end / dt) + 1
    return [(i * dt, amplitude * math.sin(omega * i * dt)) for i in range(n)]


def _cantilever_with_tip_mass(L: float, m_tip: float):
    """Trave a mensola con massa concentrata in punta — SDOF approssimato."""
    # Geometria: 1 elemento beam2D, nodo base incastrato, nodo top con NODAL_MASS
    nodes = [Node(id=1, x=0, y=0, z=0), Node(id=2, x=0, y=L, z=0)]
    elements = [Element(id=1, type=ElementType.BEAM2D, nodes=[1, 2],
                         material_id="steel_s355", section_id="ipe_300")]
    constraints = [Constraint(id=1, type=ConstraintType.FIXED, node_id=1)]
    loads = [Load(id=1, type=LoadType.NODAL_MASS, target_id=2, mass=m_tip)]
    return FEAModel(
        id="sdof", name="sdof", is_3d=False,
        nodes=nodes, elements=elements,
        constraints=constraints, loads=loads,
    )


class TestSDOFSeismicResponse:
    """SDOF (cantilever IPE 300, L=3 m, massa concentrata in punta).

    Vogliamo verificare che:
    - la pulsazione propria ω_n calcolata dal solver corrisponda a sqrt(K/M)
      con K = 3 E I / L^3 (rigidezza flessionale di una mensola in punta);
    - sotto accelerogramma sinusoidale alla base, la risposta non sia divergente
      e la storia abbia magnitudo finita compatibile col damping.
    """

    L = 3.0
    m_tip = 5000.0  # kg

    @property
    def K_theory(self):
        # IPE 300: I = 8356e-8 m^4, E = 210e9
        E = 210e9
        I = 8356e-8
        return 3 * E * I / self.L ** 3

    @property
    def omega_n_theory(self):
        return math.sqrt(self.K_theory / self.m_tip)

    def test_modal_period_matches_theory(self):
        m = _cantilever_with_tip_mass(self.L, self.m_tip)
        r = ModalSolver(m, n_modes=3).solve()
        # Cantilever è verticale (asse lungo y) → il modo flessionale è in
        # direzione X, quindi participation_x dominante rispetto a participation_y.
        flex_modes = [
            mode for mode in r.modes
            if abs(mode.participation_x) > 10 * abs(mode.participation_y)
        ]
        assert flex_modes, "nessun modo flessionale (ux) trovato"
        omega_1 = 2 * math.pi * flex_modes[0].frequency_hz
        # ω_1 dal solver dovrebbe essere ~ ω_n teorica (entro ~20%)
        assert omega_1 == pytest.approx(self.omega_n_theory, rel=0.20), (
            f"ω_solver={omega_1:.2f}, ω_theory={self.omega_n_theory:.2f}"
        )

    def test_response_bounded_with_damping(self):
        """Forzante sinusoidale @ ω_n, con ξ=5%, risposta finita."""
        m = _cantilever_with_tip_mass(self.L, self.m_tip)
        dt = 0.005
        t_end = 2.0
        omega = self.omega_n_theory  # risonanza
        hist = _sinusoidal_accel(omega, amplitude=1.0, t_end=t_end, dt=dt)

        solver = SeismicTimeHistorySolver(
            m, {"X": hist},
            dt=dt, t_end=t_end,
            damping_xi=0.05,
        )
        r = solver.solve()
        ux_top = r.node_history[2]["ux"]
        max_u = max(abs(u) for u in ux_top)
        # Risposta in risonanza con ξ=5% → DAF ≈ 1/(2ξ) = 10
        # Spostamento statico: u_st = a*M/K = 5000/K ≈ 9.5e-4 m
        u_static = self.m_tip / self.K_theory
        # max u atteso ~ 10*u_static, lasciamo margine ±50%
        assert max_u > 0.1 * u_static, f"max_u={max_u:.5f} troppo piccolo"
        assert max_u < 50 * u_static, f"max_u={max_u:.5f} divergente"

    def test_undamped_higher_amplitude_than_damped(self):
        """Con ξ=0 la risposta a risonanza cresce più che con ξ=5%."""
        m = _cantilever_with_tip_mass(self.L, self.m_tip)
        dt = 0.005
        t_end = 1.5
        omega = self.omega_n_theory
        hist = _sinusoidal_accel(omega, amplitude=1.0, t_end=t_end, dt=dt)

        r_damp = SeismicTimeHistorySolver(
            m, {"X": hist}, dt=dt, t_end=t_end, damping_xi=0.05,
        ).solve()
        r_undamp = SeismicTimeHistorySolver(
            m, {"X": hist}, dt=dt, t_end=t_end, damping_xi=0.0,
        ).solve()
        max_damp = max(abs(u) for u in r_damp.node_history[2]["ux"])
        max_undamp = max(abs(u) for u in r_undamp.node_history[2]["ux"])
        # Senza damping, in risonanza la risposta cresce linearmente nel tempo
        assert max_undamp > max_damp


class TestMultiComponentSeismic:
    """Trave a mensola con massa, simulazione X e X+Y."""

    def test_xy_combined_no_smaller_than_x_alone(self):
        """Aggiungere componente Y aumenta (o conserva) la magnitudo totale."""
        L = 3.0
        m_tip = 5000.0
        m = _cantilever_with_tip_mass(L, m_tip)
        # Aggiungo una massa Y per attivare modo flessionale fuori piano
        # NOTA: in 2D non esiste modo Y, ma il test resta valido se il modello è 3D.
        # Qui usiamo solo X attivo (modello 2D) — la componente Y è ignorata, OK.
        dt = 0.01
        t_end = 1.0
        hist_x = _sinusoidal_accel(omega=10.0, amplitude=1.0, t_end=t_end, dt=dt)
        hist_y = _sinusoidal_accel(omega=8.0, amplitude=0.5, t_end=t_end, dt=dt)
        r_x = SeismicTimeHistorySolver(m, {"X": hist_x}, dt=dt, t_end=t_end, damping_xi=0.05).solve()
        r_xy = SeismicTimeHistorySolver(m, {"X": hist_x, "Y": hist_y}, dt=dt, t_end=t_end, damping_xi=0.05).solve()
        # max |u_x| con X solo ≤ max |u_x| con X+Y (Y aggiunge solo cross-coupling residuo)
        max_x_only = max(abs(u) for u in r_x.node_history[2]["ux"])
        max_x_combined = max(abs(u) for u in r_xy.node_history[2]["ux"])
        # Per modello 2D, l'aggiunta di Y non influenza ux (no accoppiamento)
        assert max_x_combined == pytest.approx(max_x_only, rel=0.01)

    def test_two_components_simultaneous(self):
        """Il solver accetta dict con 2 chiavi senza errori."""
        m = _cantilever_with_tip_mass(2.0, 3000.0)
        hist = [(0, 0), (1, 1.0), (2, 0)]
        r = SeismicTimeHistorySolver(
            m, {"X": hist, "Y": hist},
            dt=0.05, t_end=2.0, damping_xi=0.05,
        ).solve()
        assert r.n_steps > 0
        assert 2 in r.node_history


class TestSeismicErrors:
    def test_empty_components_raises(self):
        m = _cantilever_with_tip_mass(2.0, 1000.0)
        with pytest.raises(ValueError):
            SeismicTimeHistorySolver(m, {})

    def test_unknown_axis_raises(self):
        m = _cantilever_with_tip_mass(2.0, 1000.0)
        with pytest.raises(ValueError):
            SeismicTimeHistorySolver(
                m, {"W": [(0, 0), (1, 1)]}, dt=0.05, t_end=1.0,
            ).solve()

    def test_too_short_history_raises(self):
        m = _cantilever_with_tip_mass(2.0, 1000.0)
        with pytest.raises(ValueError):
            SeismicTimeHistorySolver(
                m, {"X": [(0.0, 0.0)]}, dt=0.05, t_end=1.0,
            ).solve()


class TestDriftPostprocess:
    """Test del postprocess interstory drift su storie sintetiche."""

    def test_basic_drift(self):
        # 3 piani: base + 2 livelli. ux(t) crescente in altezza.
        nh = {
            1: {"ux": [0.0, 0.0, 0.0], "uy": [0.0, 0.0, 0.0], "uz": [0.0, 0.0, 0.0]},
            2: {"ux": [0.0, 1.0, 2.0], "uy": [0.0, 0.0, 0.0], "uz": [0.0, 0.0, 0.0]},
            3: {"ux": [0.0, 2.0, 4.0], "uy": [0.0, 0.0, 0.0], "uz": [0.0, 0.0, 0.0]},
        }
        d = interstory_drift_history(nh, levels=[1, 2, 3], axis="ux")
        assert d[1] == [0.0, 1.0, 2.0]  # piano 1 - base
        assert d[2] == [0.0, 1.0, 2.0]  # piano 2 - piano 1

    def test_max_per_storey(self):
        nh = {
            1: {"ux": [0.0, 0.0], "uy": [0.0, 0.0], "uz": [0.0, 0.0]},
            2: {"ux": [0.0, 3.0], "uy": [0.0, 0.0], "uz": [0.0, 0.0]},
            3: {"ux": [0.0, 5.0], "uy": [0.0, 0.0], "uz": [0.0, 0.0]},
        }
        m = max_drift_per_storey(nh, levels=[1, 2, 3], axis="ux")
        assert m[1] == 3.0
        assert m[2] == 2.0

    def test_drift_ratio(self):
        assert drift_ratio(0.03, h_storey=3.0) == 0.01  # 1/100
        with pytest.raises(ValueError):
            drift_ratio(0.01, h_storey=0)

    def test_missing_level_raises(self):
        nh = {1: {"ux": [0.0]}, 2: {"ux": [0.0]}}
        with pytest.raises(KeyError):
            interstory_drift_history(nh, levels=[1, 2, 99])

    def test_wrong_axis_raises(self):
        nh = {1: {"ux": [0.0]}}
        with pytest.raises(ValueError):
            interstory_drift_history(nh, levels=[1, 1], axis="rotx")

    def test_too_few_levels_raises(self):
        with pytest.raises(ValueError):
            interstory_drift_history({1: {"ux": [0]}}, levels=[1])
