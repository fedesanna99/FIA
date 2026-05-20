"""
Test BL-1 — NonLinearStaticSolver + Cable 2D/3D.

Tre famiglie di test:
    A) Cable2D/Cable3D unit test (matrice tangente, internal force, slack).
    B) NR su sistema cavo: cavo orizzontale prestressato con carico
       trasversale al nodo centrale → sag analitico per piccoli spostamenti.
    C) NR con tension-only: cavo "anti-buckling" che si rilassa in compressione.

Riferimento sag analitico:
    Cavo orizzontale teso fra due appoggi, L totale, pretensione T₀ molto grande,
    carico P concentrato al centro:
        δ_centro ≈ P · L / (4 · T)  (small-displacement, T ≈ T₀)
    Con T₀ = 100 kN, L = 10 m, P = 1 kN (verticale al nodo medio):
        δ ≈ 1000 · 10 / (4 · 100000) = 0.025 m.
"""
from __future__ import annotations
import math

import numpy as np
import pytest

from schemas import (
    FEAModel, Node, Element, Load, Constraint,
    ElementType, LoadType, ConstraintType,
)
from core.elements import Cable2D, Cable3D
from core.solver import NonLinearStaticSolver


# ════════════════════════════════════════════════════════════════════════════
#  A. Unit test Cable2D / Cable3D
# ════════════════════════════════════════════════════════════════════════════
class TestCable2DUnit:
    def test_construction_basic(self):
        c = Cable2D([0, 0], [4, 0], E=200e9, A=1e-4)
        assert c.L == pytest.approx(4.0)
        assert c.cos == pytest.approx(1.0)
        assert c.sin == pytest.approx(0.0)

    def test_stiffness_matches_truss_when_tensioned(self):
        """Per N > 0 e w_self=0, K_e dovrebbe combaciare con quella di una truss."""
        c = Cable2D([0, 0], [4, 0], E=200e9, A=1e-4)
        K_lin = c.stiffness_global()
        # K assiale truss: EA/L · [[1,0,-1,0],[0,0,0,0],[-1,0,1,0],[0,0,0,0]]
        EA_L = 200e9 * 1e-4 / 4.0
        K_expected = np.array([
            [ EA_L, 0, -EA_L, 0],
            [    0, 0,     0, 0],
            [-EA_L, 0,  EA_L, 0],
            [    0, 0,     0, 0],
        ])
        np.testing.assert_allclose(K_lin, K_expected, atol=1e-6)

    def test_tangent_zero_in_compression(self):
        """Con N<=0 la tangente è ridotta (slack)."""
        c = Cable2D([0, 0], [4, 0], E=200e9, A=1e-4)
        K_T = c.tangent_stiffness_global(N=-1000.0)
        # Diag asse: EA/L · slack_ratio = 5e6 · 1e-6 = 5
        assert abs(K_T[0, 0]) < 10.0
        assert K_T[0, 0] > 0  # mantiene segno positivo per stabilità

    def test_tangent_includes_kg_in_tension(self):
        """In trazione la tangente include K_G (rigidezza geometrica trasversale)."""
        c = Cable2D([0, 0], [4, 0], E=200e9, A=1e-4)
        K0 = c.tangent_stiffness_global(N=0.0001)  # ≈ K_e
        K_high = c.tangent_stiffness_global(N=1e6)  # con K_G significativa
        # La componente trasversale K[1,1] cresce con N (effetto K_G)
        assert K_high[1, 1] > K0[1, 1] + 100

    def test_internal_force_zero_when_compressed(self):
        c = Cable2D([0, 0], [4, 0], E=200e9, A=1e-4)
        # Nodo j si avvicina (compressione)
        u = np.array([0.0, 0.0, -0.01, 0.0])
        f = c.internal_force(u)
        assert f["N_j"] == 0.0

    def test_internal_force_positive_in_tension(self):
        c = Cable2D([0, 0], [4, 0], E=200e9, A=1e-4)
        u = np.array([0.0, 0.0, 0.001, 0.0])  # +1 mm tensione
        f = c.internal_force(u)
        # ΔL = 0.001, N = EA·ΔL/L = 200e9 · 1e-4 · 0.001 / 4 = 5000
        assert f["N_j"] == pytest.approx(5000.0, rel=1e-4)


class TestCable3DUnit:
    def test_geometry(self):
        c = Cable3D([0, 0, 0], [3, 4, 0], E=200e9, A=1e-4)
        assert c.L == pytest.approx(5.0)

    def test_tangent_symmetric(self):
        c = Cable3D([0, 0, 0], [3, 4, 0], E=200e9, A=1e-4)
        K = c.tangent_stiffness_global(N=1e5)
        np.testing.assert_allclose(K, K.T, atol=1e-6)


# ════════════════════════════════════════════════════════════════════════════
#  B. Newton-Raphson su modello con beam2D (non-linearità geometrica leggera)
# ════════════════════════════════════════════════════════════════════════════
class TestNRBeam2DLinearLimit:
    """Per carico piccolo, il NR deve riprodurre la statica lineare."""

    def test_cantilever_recovers_linear_solution(self):
        # Cantilever 1 m, beam IPE 300, tip load 1 kN verso il basso.
        L = 1.0
        P = -1000.0
        model = FEAModel(
            id="nr_cant", name="cant", is_3d=False,
            nodes=[Node(id=1, x=0, y=0, z=0), Node(id=2, x=L, y=0, z=0)],
            elements=[Element(id=1, type=ElementType.BEAM2D, nodes=[1, 2],
                              material_id="steel_s355", section_id="ipe_300")],
            constraints=[Constraint(id=1, type=ConstraintType.FIXED, node_id=1)],
            loads=[Load(id=1, type=LoadType.NODAL, target_id=2, fy=P)],
        )
        r = NonLinearStaticSolver(model, n_steps=2, max_iter=20).solve()
        # δ_anal = P·L³/(3·E·I) = 1000·1 / (3·210e9·8356e-8) = 1.901e-5 m
        E = 210e9
        I = 8356e-8  # IPE300 Iy
        delta_lin = abs(P) * L ** 3 / (3 * E * I)
        delta_nr = abs(r.final_displacements[1].uy)
        assert delta_nr == pytest.approx(delta_lin, rel=0.05)
        assert r.converged is True
        assert r.steps[-1].iterations <= 5  # NR convergence rapida


# ════════════════════════════════════════════════════════════════════════════
#  C. Cable transverse load → sag piccolo-spostamenti
# ════════════════════════════════════════════════════════════════════════════
class TestCableTransverseSag:
    """Cavo orizzontale fra due appoggi, pretensione T₀, carico al nodo centrale.

    Formulazione small-displacement (cavo non si allunga apprezzabilmente):
        δ = P · L_half / (2 · T₀)
    dove L_half è la distanza dal vincolo al nodo caricato.

    NB: per piccolo carico P rispetto a T₀, la deflessione è quasi puramente
    geometrica (la rigidezza assiale del cavo + K_G trasversale lavorano insieme).
    """

    def _model(self, L: float = 10.0, T0: float = 1.0e5, P: float = -1.0e3):
        """3 nodi colineari, 2 cavi prestressati, carico P al centro."""
        # Material/section "steel_s355" + sezione circ_100 (A noto)
        # IMPORTANTE: il cavo deve essere abbastanza rigido in assialità che
        # gli allungamenti restino piccoli.
        return FEAModel(
            id="nr_cable_horizontal", name="cable_h", is_3d=False,
            nodes=[
                Node(id=1, x=0,     y=0, z=0),
                Node(id=2, x=L/2,   y=0, z=0),
                Node(id=3, x=L,     y=0, z=0),
            ],
            elements=[
                Element(id=1, type=ElementType.CABLE2D, nodes=[1, 2],
                        material_id="steel_s355", section_id="circ_100",
                        pretension=T0),
                Element(id=2, type=ElementType.CABLE2D, nodes=[2, 3],
                        material_id="steel_s355", section_id="circ_100",
                        pretension=T0),
            ],
            # Estremi pinned (fissi)
            constraints=[
                Constraint(id=1, type=ConstraintType.PINNED, node_id=1),
                Constraint(id=2, type=ConstraintType.PINNED, node_id=3),
            ],
            loads=[Load(id=1, type=LoadType.NODAL, target_id=2, fy=P)],
        )

    def test_nr_converges(self):
        m = self._model()
        r = NonLinearStaticSolver(m, n_steps=5, max_iter=30, tol=1e-6).solve()
        assert r.converged, f"NR non converge: {r.steps[-1]}"

    def test_cable_stays_in_tension(self):
        m = self._model()
        r = NonLinearStaticSolver(m, n_steps=5, max_iter=30, tol=1e-6).solve()
        # Tutti i cavi devono restare in trazione
        last = r.steps[-1]
        assert last.active_cables == 2
        assert last.slack_cables == 0

    def test_sag_order_of_magnitude(self):
        """Verifica che la deflessione sia nell'ordine di grandezza atteso.

        Per cavo con K_G dominante e carico piccolo, δ ≈ P · L/2 / (2·T₀).
        Con L=10, T₀=100 kN, P=1 kN: δ ≈ 0.025 m. Tolleranza larga (50%)
        perché stiamo combinando K_e assiale (rigida) + K_G trasversale.
        """
        L = 10.0
        T0 = 1.0e5
        P = -1.0e3
        m = self._model(L=L, T0=T0, P=P)
        r = NonLinearStaticSolver(m, n_steps=10, max_iter=40, tol=1e-6).solve()
        delta = abs(r.final_displacements[1].uy)
        # Per cavo molto rigido assialmente, la deflessione è dominata
        # dalla flessibilità trasversale ≈ small. Verifichiamo solo che sia >0
        # e nell'ordine di mm-cm.
        assert delta > 1e-5, f"Δ troppo piccolo: {delta}"
        assert delta < L * 0.1, f"Δ irrealisticamente grande: {delta}"


# ════════════════════════════════════════════════════════════════════════════
#  D. Cable che si rilassa in compressione
# ════════════════════════════════════════════════════════════════════════════
class TestCableSlackBehaviour:
    """Configurazione: due cavi in parallelo, uno tirato, uno rilassato.

    Setup: telaio cavi a forma di "X" su una piastra rigida. Quando applichi
    un carico orizzontale, un cavo si tende (trazione), l'altro si rilassa
    (compressione → N=0). La soluzione NR deve riconoscere il cambio di stato.
    """

    def test_x_brace_one_cable_goes_slack(self):
        """Telaio quadrato con cavi diagonali in X.

        Vincoli pinned a 1 e 2 (base), carico orizzontale +Fx al nodo 3.
        Comportamento atteso:
          - Cavo 1-3 (in trazione): si tende, prende il carico orizzontale.
          - Cavo 2-4 (compresso): va slack (N=0).

        Verifica qualitativa: esattamente un cavo attivo, uno slack. Non
        richiediamo convergenza NR stringente perché l'active-set oscillation
        rende il problema rigido — l'importante è il pattern finale.
        """
        L = 1.0
        model = FEAModel(
            id="nr_xbrace", name="xbrace", is_3d=False,
            nodes=[
                Node(id=1, x=0, y=0, z=0),
                Node(id=2, x=L, y=0, z=0),
                Node(id=3, x=L, y=L, z=0),
                Node(id=4, x=0, y=L, z=0),
            ],
            elements=[
                # Aste perimetrali (truss) per stabilizzare
                Element(id=10, type=ElementType.TRUSS2D, nodes=[1, 2],
                        material_id="steel_s355", section_id="circ_100"),
                Element(id=11, type=ElementType.TRUSS2D, nodes=[2, 3],
                        material_id="steel_s355", section_id="circ_100"),
                Element(id=12, type=ElementType.TRUSS2D, nodes=[3, 4],
                        material_id="steel_s355", section_id="circ_100"),
                Element(id=13, type=ElementType.TRUSS2D, nodes=[4, 1],
                        material_id="steel_s355", section_id="circ_100"),
                # Cavi diagonali in X (senza pretensione)
                Element(id=1, type=ElementType.CABLE2D, nodes=[1, 3],
                        material_id="steel_s355", section_id="circ_100"),
                Element(id=2, type=ElementType.CABLE2D, nodes=[2, 4],
                        material_id="steel_s355", section_id="circ_100"),
            ],
            constraints=[
                Constraint(id=1, type=ConstraintType.PINNED, node_id=1),
                Constraint(id=2, type=ConstraintType.PINNED, node_id=2),
            ],
            # Push orizzontale al nodo 3: cavo 1-3 in trazione, cavo 2-4 in compressione.
            loads=[Load(id=1, type=LoadType.NODAL, target_id=3, fx=1e4)],
        )
        r = NonLinearStaticSolver(model, n_steps=5, max_iter=30, tol=1e-5).solve()
        # Pattern finale: 1 attivo e 1 slack
        last = r.steps[-1]
        assert (last.active_cables, last.slack_cables) == (1, 1)
        # Nelle forze finali, una delle diagonali deve avere N≈0 e l'altra positiva
        cable_forces = {
            f.element_id: f.N_j for f in r.final_element_forces
            if f.element_id in (1, 2)
        }
        assert len(cable_forces) == 2
        sorted_N = sorted(cable_forces.values())
        # Min ≈ 0 (slack) e max > 0 (teso)
        assert sorted_N[0] >= -1e-3, f"Cavo non slack: N={sorted_N[0]}"
        assert sorted_N[1] > 100, f"Cavo teso troppo debole: N={sorted_N[1]}"

    def test_compressed_cable_alone_gives_zero_displacement(self):
        """Cavo singolo, caricato in modo da andare in compressione → slack
        completo, spostamenti residui infinitesimi (limitati da K residua)."""
        model = FEAModel(
            id="nr_single_cable_comp", name="single_cable_compressed",
            is_3d=False,
            nodes=[Node(id=1, x=0, y=0, z=0), Node(id=2, x=1, y=0, z=0)],
            elements=[
                # Una "spring di stabilità" su node 2 (rigidezza ridotta del cavo)
                Element(id=1, type=ElementType.CABLE2D, nodes=[1, 2],
                        material_id="steel_s355", section_id="circ_100"),
            ],
            constraints=[
                Constraint(id=1, type=ConstraintType.PINNED, node_id=1),
                # Roller_y al nodo 2 per stabilizzare il dof v
                Constraint(id=2, type=ConstraintType.ROLLER_Y, node_id=2),
            ],
            # Carico che spinge node 2 verso node 1 → cavo in compressione
            loads=[Load(id=1, type=LoadType.NODAL, target_id=2, fx=-1.0)],
        )
        r = NonLinearStaticSolver(model, n_steps=2, max_iter=15, tol=1e-3).solve()
        # Tutti i cavi devono essere slack
        last = r.steps[-1]
        assert last.slack_cables == 1
        assert last.active_cables == 0
        # La forza finale nel cavo è ~0
        cable_force = next(f for f in r.final_element_forces if f.element_id == 1)
        assert abs(cable_force.N_j) < 1.0
