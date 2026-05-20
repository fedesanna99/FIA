"""
Benchmark — Massa partecipante modale del cantilever.

Riferimento teorico (Blevins 2001, Tab. 8-1):
    Per cantilever beam Euler-Bernoulli, le frazioni di massa partecipante
    sui primi modi flessionali sono:
        Modo 1: 61.3%
        Modo 2: 18.8%
        Modo 3:  6.5%
        Modo 4:  3.3%
        ...
    (Somma asintotica → 100%)

Le percentuali non dipendono da E, I, L, ρ, A — sono proprietà universali
della shape modale del cantilever uniforme.

Riferimento: Chopra, "Dynamics of Structures", 5th ed., Tab. 17.10.1
"""
import math
import pytest

from schemas import (
    FEAModel, Node, Element, Constraint,
    ElementType, ConstraintType,
)
from core.solver import ModalSolver
from core.postprocess import participating_mass_ratio, cumulative_mass_ratio


pytestmark = pytest.mark.benchmark


def _build_cantilever(n_div: int, L: float) -> FEAModel:
    nodes = [Node(id=i + 1, x=L * i / n_div, y=0, z=0) for i in range(n_div + 1)]
    elements = [
        Element(id=i + 1, type=ElementType.BEAM2D, nodes=[i + 1, i + 2],
                material_id="steel_s355", section_id="ipe_300")
        for i in range(n_div)
    ]
    constraints = [Constraint(id=1, type=ConstraintType.FIXED, node_id=1)]
    return FEAModel(id="ct_modal", name="ct", is_3d=False,
                    nodes=nodes, elements=elements,
                    constraints=constraints, loads=[])


def _flexural_modes(modes):
    """Filtra i modi flessionali (py >> px)."""
    return [m for m in modes
            if abs(m.participation_y) > 10 * abs(m.participation_x)]


def _physical_mass(material_id: str, section_id: str, L_total: float) -> float:
    """Massa fisica ρ·A·L_total."""
    from schemas import MATERIALS_DB, SECTIONS_DB
    mat = MATERIALS_DB[material_id]
    sec = SECTIONS_DB[section_id]
    return mat.rho * sec.A * L_total


class TestCantileverModalMass:
    """Le percentuali di massa partecipante sono universali per cantilever.

    NOTA: si normalizza rispetto alla MASSA FISICA traslazionale (ρ·A·L) e
    non rispetto a `r.total_mass` perché quest'ultimo nel solver attuale
    include anche i contributi rotazionali della matrice di massa consistent.
    """

    def test_first_mode_participation_613_pct(self):
        """Modo 1 flessionale: M_1* ≈ 61.3% della massa fisica."""
        L = 2.0
        m = _build_cantilever(n_div=30, L=L)
        r = ModalSolver(m, n_modes=6).solve()
        flex = _flexural_modes(r.modes)
        assert len(flex) >= 1
        M_phys = _physical_mass("steel_s355", "ipe_300", L)
        ratio_1 = flex[0].effective_mass_y / M_phys
        assert ratio_1 == pytest.approx(0.613, abs=0.02), (
            f"Modo 1 massa partec.: {ratio_1*100:.1f}% (atteso 61.3%)"
        )

    def test_second_mode_participation_188_pct(self):
        """Modo 2 flessionale: M_2* ≈ 18.8%."""
        L = 2.0
        m = _build_cantilever(n_div=30, L=L)
        r = ModalSolver(m, n_modes=6).solve()
        flex = _flexural_modes(r.modes)
        assert len(flex) >= 2
        M_phys = _physical_mass("steel_s355", "ipe_300", L)
        ratio_2 = flex[1].effective_mass_y / M_phys
        assert ratio_2 == pytest.approx(0.188, abs=0.02)

    def test_first_three_modes_at_least_85pct(self):
        """I primi 3 modi flessionali coprono ≥ 85% (criterio NTC §7.3.3.1)."""
        L = 2.0
        m = _build_cantilever(n_div=30, L=L)
        r = ModalSolver(m, n_modes=8).solve()
        flex = _flexural_modes(r.modes)
        assert len(flex) >= 3
        M_phys = _physical_mass("steel_s355", "ipe_300", L)
        ratios = [f.effective_mass_y / M_phys for f in flex[:3]]
        cum = sum(ratios)
        # 61.3 + 18.8 + 6.5 ≈ 86.6%
        assert cum >= 0.85

    def test_participation_independent_of_L(self):
        """La frazione di massa partec. non dipende da L (proprietà universale)."""
        L1, L2 = 1.0, 4.0
        m1 = _build_cantilever(n_div=30, L=L1)
        m2 = _build_cantilever(n_div=30, L=L2)
        r1 = ModalSolver(m1, n_modes=4).solve()
        r2 = ModalSolver(m2, n_modes=4).solve()
        flex1 = _flexural_modes(r1.modes)
        flex2 = _flexural_modes(r2.modes)
        M_phys_1 = _physical_mass("steel_s355", "ipe_300", L1)
        M_phys_2 = _physical_mass("steel_s355", "ipe_300", L2)
        ratio1 = flex1[0].effective_mass_y / M_phys_1
        ratio2 = flex2[0].effective_mass_y / M_phys_2
        assert ratio1 == pytest.approx(ratio2, rel=0.05)
