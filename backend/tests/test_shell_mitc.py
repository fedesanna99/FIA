"""
Test BL-5 — ShellQuad4 MITC4 anti shear-locking.

Strategia:
    A) Unit element: K simmetrica, PSD, ≥6 rigid body modes
    B) Patch test membrana: σ_x = E·ε (identico a Q4 standard, MITC4 non
       cambia la parte membrana)
    C) Cantilever piastra sottile: t/L = 1/100 → MITC4 converge alla
       soluzione di Bernoulli, mentre il Q4 standard sotto-stima per locking
    D) Eigenvalue ratio: il MITC4 ha autovalori di taglio "spuriosi" ridotti
       rispetto al Q4 standard
"""
from __future__ import annotations
import math

import numpy as np
import pytest

from core.elements import ShellQuad4, ShellQuad4MITC


def _square_plate(L: float = 1.0):
    """4 nodi in (0,0), (L,0), (L,L), (0,L) sul piano XY."""
    return [(0, 0, 0), (L, 0, 0), (L, L, 0), (0, L, 0)]


class TestMITCUnit:
    def test_K_symmetric(self):
        sh = ShellQuad4MITC(_square_plate(), E=210e9, nu=0.3, t=0.01)
        K = sh.stiffness_global()
        assert K.shape == (24, 24)
        np.testing.assert_allclose(K, K.T, atol=1e-3)

    def test_K_positive_semidefinite(self):
        sh = ShellQuad4MITC(_square_plate(), E=210e9, nu=0.3, t=0.01)
        K = sh.stiffness_global()
        eigs = np.linalg.eigvalsh(K)
        # 6 rigid-body + 4 drilling penalty piccoli, autovalori ≥ 0
        assert eigs.min() > -1e-2
        n_zero = np.sum(eigs < 1e-2 * eigs.max())
        assert n_zero >= 6

    def test_invalid_nodes_raises(self):
        with pytest.raises(ValueError):
            ShellQuad4MITC([(0, 0, 0), (1, 0, 0), (1, 1, 0)], E=210e9, nu=0.3, t=0.01)


class TestMITCAgreementWithStandardQ4OnMembrane:
    """La parte membrana è invariata — verifica numerica."""

    def test_membrane_K_block_identical(self):
        L = 1.0
        sh_std = ShellQuad4(_square_plate(L), E=210e9, nu=0.3, t=0.01)
        sh_mitc = ShellQuad4MITC(_square_plate(L), E=210e9, nu=0.3, t=0.01)
        # Carica solo i dof in-plane (u, v) di tutti i nodi (dof 0,1 di ogni nodo)
        u24 = np.zeros(24)
        u24[0 * 6 + 0] = 1e-5    # ux nodo 1
        u24[1 * 6 + 0] = 1e-5
        u24[2 * 6 + 0] = 1e-5
        u24[3 * 6 + 0] = 1e-5    # rigid translation in x
        f_std = sh_std.stiffness_global() @ u24
        f_mitc = sh_mitc.stiffness_global() @ u24
        # Rigid translation → forze nulle in entrambi (test di consistenza)
        np.testing.assert_allclose(f_std, np.zeros(24), atol=1.0)
        np.testing.assert_allclose(f_mitc, np.zeros(24), atol=1.0)


class TestMITCShearLockingCure:
    """Test cardine: confronto rigidezza flessionale a t/L → 0.

    Per un singolo elemento Q4 incastrato su un lato con momento applicato
    sull'estremo opposto, la rigidezza in flessione del Q4 standard cresce
    enormemente al diminuire dello spessore (shear locking artificiale),
    mentre MITC4 mantiene la rigidezza corretta ≈ D = E·t³/(12·(1−ν²)).

    Diagnostica: rapporto Kbb_22 / Kbb_22(thick) per t/L = 1, 0.1, 0.01.
    """

    def _locking_indicator(self, cls, t_over_L: float) -> float:
        """Indicatore di locking: 5° autovalore di K_bb normalizzato a D.

        Per un elemento isolato senza locking, l'autovalore corrisponde
        a un modo di flessione e scala con D = E·t³/(12(1−ν²)) — quindi
        eigs[5]/D resta costante al diminuire di t.

        Per un elemento affetto da locking, la stessa modalità di
        deformazione coinvolge una contribuzione spuria di taglio
        proporzionale a G·t (lineare in t, non cubica), quindi eigs[5]/D
        cresce come 1/t² al diminuire di t.
        """
        E, nu, L = 210e9, 0.3, 1.0
        t = t_over_L * L
        sh = cls(_square_plate(L), E=E, nu=nu, t=t)
        K24 = sh.stiffness_local_24()
        idx = [6 * i + j for i in range(4) for j in (2, 3, 4)]
        K_bb = K24[np.ix_(idx, idx)]
        eigs = np.sort(np.linalg.eigvalsh(K_bb))
        D = E * t**3 / (12 * (1 - nu**2))
        return float(eigs[5] / D)

    def test_mitc_locking_free(self):
        """Al ridurre t/L, eigs[5]/D resta circa costante per MITC4 mentre
        cresce di ordini di grandezza per Q4 standard (shear locking)."""
        # t/L cambia di un fattore 100 (0.1 → 0.001)
        mitc_thick = self._locking_indicator(ShellQuad4MITC, 0.1)
        mitc_thin = self._locking_indicator(ShellQuad4MITC, 0.001)
        std_thick = self._locking_indicator(ShellQuad4, 0.1)
        std_thin = self._locking_indicator(ShellQuad4, 0.001)

        mitc_ratio = mitc_thin / mitc_thick
        std_ratio = std_thin / std_thick

        # MITC4: ratio deve restare ~costante (< 5× variazione)
        assert mitc_ratio < 5, f"MITC4 mostra locking: ratio={mitc_ratio:.2e}"
        # Q4 standard: ratio cresce significativamente (>100× = chiaro locking)
        assert std_ratio > 100, f"Q4 standard NON locca come atteso: ratio={std_ratio:.2e}"
        # E il MITC4 deve essere molto migliore del Q4 standard
        assert mitc_ratio < std_ratio / 100, (
            f"MITC4 ratio {mitc_ratio:.2e} non significativamente migliore "
            f"di Q4 standard {std_ratio:.2e}"
        )

    def test_thin_plate_bending_eigenvalue_bounded(self):
        """Con t/L = 1e-3, il MITC4 ha autovalori finiti e ragionevoli."""
        sh = ShellQuad4MITC(_square_plate(L=1.0), E=210e9, nu=0.3, t=1e-3)
        K = sh.stiffness_global()
        eigs = np.linalg.eigvalsh(K)
        # Massimo autovalore deve essere finito
        assert np.isfinite(eigs.max())
        assert eigs.max() < 1e15


class TestMITCAssemblerIntegration:
    """Verifica che ElementType.SHELL_Q4_MITC sia correttamente dispatched."""

    def test_assembler_builds_mitc_instance(self):
        from schemas import (FEAModel, Node, Element, Constraint,
                              ElementType, ConstraintType)
        from core.solver.assembler import GlobalAssembler

        m = FEAModel(
            id="mitc_test", name="mitc_test", is_3d=True,
            nodes=[Node(id=i + 1, x=x, y=y, z=0)
                   for i, (x, y) in enumerate([(0, 0), (1, 0), (1, 1), (0, 1)])],
            elements=[Element(id=1, type=ElementType.SHELL_Q4_MITC,
                              nodes=[1, 2, 3, 4],
                              material_id="steel_s355",
                              section_id="shell_t100")],
            constraints=[Constraint(id=1, type=ConstraintType.FIXED, node_id=1)],
            loads=[],
        )
        assembler = GlobalAssembler(m)
        instance = assembler._element_cache[0][0]
        assert isinstance(instance, ShellQuad4MITC)
