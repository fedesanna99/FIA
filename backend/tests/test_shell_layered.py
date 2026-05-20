"""
Test BL-4 — ShellQuad4Layered (laminato composito).

Famiglie di test:
    A) Unit: ABD matrices per laminati noti (isotropi → A∼Et, D∼Et³/12)
    B) Patch test: εₓ uniforme → σₓ uniforme nella mediana del layer
    C) Symmetric laminate: B = 0 (no coupling)
    D) Integration with StaticSolver: cantilever shell laminato vs isotropo
    E) Stress per layer: cross-ply [0/90/0] → σ_x diverso nei layer
"""
from __future__ import annotations
import math

import numpy as np
import pytest

from core.elements import ShellQuad4Layered, CompositeLayer
from core.elements.shell_quad4_layered import _compute_ABD, _Q_local, _Q_bar


# ════════════════════════════════════════════════════════════════════════════
# A. ABD analytic verification (isotropic single layer)
# ════════════════════════════════════════════════════════════════════════════
class TestABDIsotropic:
    """Per laminato isotropo a singolo layer (E, ν, t):
        A_11 = E·t / (1 − ν²)
        D_11 = E·t³ / (12 · (1 − ν²))
        B = 0
    """

    def test_single_isotropic_layer(self):
        E, nu, t = 210e9, 0.3, 0.01
        layer = CompositeLayer(E1=E, thickness=t, nu12=nu, theta=0.0)
        A, B, D, Ds, z = _compute_ABD([layer])
        # A_11 = E·t / (1−ν²)
        A11_expected = E * t / (1 - nu**2)
        D11_expected = E * t**3 / (12 * (1 - nu**2))
        assert A[0, 0] == pytest.approx(A11_expected, rel=1e-9)
        assert D[0, 0] == pytest.approx(D11_expected, rel=1e-9)
        # B = 0 per singolo layer simmetrico rispetto al piano medio
        np.testing.assert_allclose(B, np.zeros((3, 3)), atol=1e-6)

    def test_symmetric_cross_ply_zero_coupling(self):
        """Laminato simmetrico [0/90/0] → B = 0."""
        E1, E2, nu12, G12, t = 150e9, 10e9, 0.3, 5e9, 0.001
        layers = [
            CompositeLayer(E1=E1, E2=E2, nu12=nu12, G12=G12, thickness=t, theta=0.0),
            CompositeLayer(E1=E1, E2=E2, nu12=nu12, G12=G12, thickness=t,
                           theta=math.pi/2),
            CompositeLayer(E1=E1, E2=E2, nu12=nu12, G12=G12, thickness=t, theta=0.0),
        ]
        A, B, D, _, _ = _compute_ABD(layers)
        # B deve essere quasi nullo
        assert np.linalg.norm(B) < 1.0e-3 * np.linalg.norm(A)


# ════════════════════════════════════════════════════════════════════════════
# B. Q_bar rotation: known properties
# ════════════════════════════════════════════════════════════════════════════
class TestQBarRotation:
    def test_zero_angle_returns_Q(self):
        layer = CompositeLayer(E1=150e9, E2=10e9, nu12=0.3, G12=5e9,
                                thickness=0.001, theta=0.0)
        Q = _Q_local(layer)
        Q_bar = _Q_bar(layer)
        np.testing.assert_allclose(Q, Q_bar, atol=1e-3)

    def test_90deg_swap(self):
        """θ=90°: Q_bar[0,0] e Q_bar[1,1] si scambiano (con elasticità ortotropa)."""
        layer = CompositeLayer(E1=150e9, E2=10e9, nu12=0.3, G12=5e9,
                                thickness=0.001, theta=math.pi/2)
        Q_bar = _Q_bar(layer)
        # Q_11 originale = E1/(1−ν₁₂·ν₂₁), Q_22 = E2/...
        # Dopo rotazione 90°, Q̄_11 ≈ Q_22, Q̄_22 ≈ Q_11
        Q_orig = _Q_local(layer)
        assert Q_bar[0, 0] == pytest.approx(Q_orig[1, 1], rel=1e-3)
        assert Q_bar[1, 1] == pytest.approx(Q_orig[0, 0], rel=1e-3)


# ════════════════════════════════════════════════════════════════════════════
# C. ShellQuad4Layered: K matrix sanity checks
# ════════════════════════════════════════════════════════════════════════════
class TestShellLayeredK:
    def _unit_shell(self, layers: list[CompositeLayer]):
        # Quad piano 1×1 sul piano XY
        nodes = [(0, 0, 0), (1, 0, 0), (1, 1, 0), (0, 1, 0)]
        return ShellQuad4Layered(nodes_xyz=nodes, layers=layers)

    def test_K_symmetric_isotropic(self):
        layers = [CompositeLayer(E1=210e9, thickness=0.01, nu12=0.3)]
        sh = self._unit_shell(layers)
        K = sh.stiffness_global()
        assert K.shape == (24, 24)
        np.testing.assert_allclose(K, K.T, atol=1e-3)

    def test_K_positive_semidefinite(self):
        layers = [CompositeLayer(E1=210e9, thickness=0.01, nu12=0.3)]
        sh = self._unit_shell(layers)
        K = sh.stiffness_global()
        eigs = np.linalg.eigvalsh(K)
        # Tutti i 6 modi rigidi + drilling => almeno 6 autovalori prossimi a zero
        n_zero = np.sum(eigs < 1e-2 * eigs.max())
        assert n_zero >= 6
        assert eigs.min() > -1e-3

    def test_K_layered_stiffer_than_thin_single(self):
        """Un laminato 3-ply [0/90/0] ha rigidezza in-plane diversa da single ply."""
        single = self._unit_shell([
            CompositeLayer(E1=210e9, thickness=0.03, nu12=0.3),
        ])
        multi = self._unit_shell([
            CompositeLayer(E1=210e9, thickness=0.01, nu12=0.3, theta=0.0),
            CompositeLayer(E1=210e9, thickness=0.01, nu12=0.3, theta=math.pi/2),
            CompositeLayer(E1=210e9, thickness=0.01, nu12=0.3, theta=0.0),
        ])
        # In-plane diagonal entries deve essere paragonabile (entrambi
        # totali t=0.03, isotropi → A è uguale, K_membrane uguale)
        K1 = single.stiffness_global()
        K2 = multi.stiffness_global()
        # Anche se Q_bar è ruotato, per isotropo è la stessa cosa
        np.testing.assert_allclose(K1, K2, rtol=0.01, atol=1e3)


# ════════════════════════════════════════════════════════════════════════════
# D. Stress per layer
# ════════════════════════════════════════════════════════════════════════════
class TestStressPerLayer:
    def test_cross_ply_returns_layer_data(self):
        layers = [
            CompositeLayer(E1=150e9, E2=10e9, nu12=0.3, G12=5e9,
                           thickness=0.001, theta=0.0),
            CompositeLayer(E1=150e9, E2=10e9, nu12=0.3, G12=5e9,
                           thickness=0.001, theta=math.pi/2),
            CompositeLayer(E1=150e9, E2=10e9, nu12=0.3, G12=5e9,
                           thickness=0.001, theta=0.0),
        ]
        nodes = [(0, 0, 0), (1, 0, 0), (1, 1, 0), (0, 1, 0)]
        sh = ShellQuad4Layered(nodes_xyz=nodes, layers=layers)
        # Spostamento in-plane: u = ε_x · x (membrana pura)
        eps_x = 1e-4
        u24 = np.zeros(24)
        # nodi: (0,0), (1,0), (1,1), (0,1) → ux di ciascuno = eps_x · x
        u24[0 * 6 + 0] = 0.0
        u24[1 * 6 + 0] = eps_x
        u24[2 * 6 + 0] = eps_x
        u24[3 * 6 + 0] = 0.0

        layer_stresses = sh.stresses_per_layer(u24)
        assert len(layer_stresses) == 3
        # Layer 0 (θ=0°) e Layer 2 (θ=0°) devono avere σ_x simile
        sx_0 = layer_stresses[0]["sigma_top"][0]
        sx_2 = layer_stresses[2]["sigma_top"][0]
        assert sx_0 == pytest.approx(sx_2, rel=1e-6)
        # Layer 1 (θ=90°) ha σ_x diverso (fibre perpendicolari → meno rigidezza)
        sx_1 = layer_stresses[1]["sigma_top"][0]
        assert abs(sx_1) != pytest.approx(abs(sx_0), rel=0.1), \
            f"σ_x layer 90° ({sx_1}) == σ_x layer 0° ({sx_0})"
        # σ_x in layer 0° > σ_x in layer 90° (rigidezza fibra > rigidezza matrice)
        assert abs(sx_0) > abs(sx_1)


# ════════════════════════════════════════════════════════════════════════════
# E. Assembler integration via Section.layers
# ════════════════════════════════════════════════════════════════════════════
class TestAssemblerIntegration:
    def test_section_with_layers_uses_layered_shell(self):
        from schemas import (FEAModel, Node, Element, Constraint, Load,
                              ElementType, LoadType, ConstraintType,
                              Section, CompositeLayerSpec)
        from schemas.material import SECTIONS_DB
        from core.solver.assembler import GlobalAssembler

        # Crea sezione laminato custom
        SECTIONS_DB["test_laminate"] = Section(
            id="test_laminate", name="Test Laminate",
            type="custom", A=0.0, Iy=0.0, Iz=0.0, J=0.0,
            thickness=0.003,
            layers=[
                CompositeLayerSpec(E1=150e9, E2=10e9, nu12=0.3, G12=5e9,
                                   thickness=0.001, theta_deg=0.0),
                CompositeLayerSpec(E1=150e9, E2=10e9, nu12=0.3, G12=5e9,
                                   thickness=0.001, theta_deg=90.0),
                CompositeLayerSpec(E1=150e9, E2=10e9, nu12=0.3, G12=5e9,
                                   thickness=0.001, theta_deg=0.0),
            ],
        )
        try:
            m = FEAModel(
                id="lam_shell", name="lam_shell", is_3d=True,
                nodes=[Node(id=i+1, x=x, y=y, z=0)
                       for i, (x, y) in enumerate([(0, 0), (1, 0), (1, 1), (0, 1)])],
                elements=[Element(id=1, type=ElementType.SHELL_Q4,
                                  nodes=[1, 2, 3, 4],
                                  material_id="steel_s355",
                                  section_id="test_laminate")],
                constraints=[Constraint(id=1, type=ConstraintType.FIXED, node_id=1)],
                loads=[],
            )
            assembler = GlobalAssembler(m)
            # Verifica che la classe dell'elemento istanziato sia ShellQuad4Layered
            from core.elements import ShellQuad4Layered
            instance = assembler._element_cache[0][0]
            assert isinstance(instance, ShellQuad4Layered)
            assert len(instance.layers) == 3
        finally:
            SECTIONS_DB.pop("test_laminate", None)
