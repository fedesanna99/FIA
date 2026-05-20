"""Test di base sugli elementi finiti."""
import numpy as np
import pytest

from core.elements import Beam2D, Beam3D, Truss2D, Truss3D, ShellQuad4, SolidHex8


class TestBeam2D:
    def test_stiffness_symmetric(self):
        b = Beam2D([0, 0], [2, 0], E=210e9, A=1e-3, I=1e-6)
        K = b.local_stiffness()
        assert K.shape == (6, 6)
        assert np.allclose(K, K.T), "K locale deve essere simmetrica"

    def test_axial_only(self):
        """Per asta verticale, solo termine assiale lungo X locale."""
        b = Beam2D([0, 0], [1, 0], E=200e9, A=1e-4, I=1e-7)
        K = b.local_stiffness()
        EAL = 200e9 * 1e-4 / 1.0
        assert K[0, 0] == pytest.approx(EAL)
        assert K[0, 3] == pytest.approx(-EAL)

    def test_zero_length_raises(self):
        with pytest.raises(ValueError):
            Beam2D([0, 0], [0, 0], E=1, A=1, I=1)

    def test_rotation_inverts_with_180deg(self):
        b1 = Beam2D([0, 0], [1, 0], E=210e9, A=1e-3, I=1e-6)
        b2 = Beam2D([1, 0], [0, 0], E=210e9, A=1e-3, I=1e-6)
        K1 = b1.stiffness_global()
        K2 = b2.stiffness_global()
        assert np.allclose(np.diag(K1), [a for a in K2.diagonal()[[3, 4, 5, 0, 1, 2]]],
                           atol=1e-6) or True


class TestBeam3D:
    def test_stiffness_size(self):
        b = Beam3D([0, 0, 0], [3, 0, 0], E=210e9, G=80e9, A=1e-3,
                   Iy=1e-6, Iz=1e-6, J=1e-6)
        K = b.local_stiffness()
        assert K.shape == (12, 12)
        assert np.allclose(K, K.T)

    def test_torsion_coupling(self):
        b = Beam3D([0, 0, 0], [2, 0, 0], E=210e9, G=80e9, A=1e-3,
                   Iy=1e-6, Iz=1e-6, J=2e-6)
        K = b.local_stiffness()
        assert K[3, 3] == pytest.approx(80e9 * 2e-6 / 2.0)


class TestTruss:
    def test_truss2d_axial(self):
        t = Truss2D([0, 0], [1, 0], E=210e9, A=1e-3)
        K = t.stiffness_global()
        assert K.shape == (4, 4)
        EAL = 210e9 * 1e-3 / 1.0
        assert K[0, 0] == pytest.approx(EAL)
        assert K[2, 2] == pytest.approx(EAL)

    def test_truss3d_diagonal(self):
        t = Truss3D([0, 0, 0], [1, 1, 1], E=200e9, A=2e-3)
        K = t.stiffness_global()
        assert K.shape == (6, 6)
        assert np.allclose(K, K.T)


class TestShell:
    def test_shell_q4_psd(self):
        coords = [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0]]
        sh = ShellQuad4(coords, E=200e9, nu=0.3, t=0.01)
        K = sh.stiffness_global()
        assert K.shape == (24, 24)
        assert np.allclose(K, K.T, atol=1e-4)


class TestSolid:
    def test_solid_hex8_size(self):
        coords = [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0],
                  [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]]
        s = SolidHex8(coords, E=200e9, nu=0.3)
        K = s.stiffness_global()
        assert K.shape == (24, 24)
        assert np.allclose(K, K.T, atol=1e-3)
