"""
Benchmark analitico — Frequenze proprie di trave a sbalzo (cantilever beam).

Riferimento simile a NAFEMS FV4 (Cantilever with thin web).

Soluzione di riferimento (Eulero-Bernoulli, cross-section costante):
    f_n = (β_n L)² / (2π L²) · √(E I / (ρ A))

con β_n L (radici dell'equazione caratteristica cos(βL) cosh(βL) + 1 = 0):
    β_1 L = 1.875104
    β_2 L = 4.694091
    β_3 L = 7.854757
    β_4 L = 10.995541

Riferimento: Blevins, "Formulas for Natural Frequency and Mode Shape",
Krieger, 2001, Tab. 8-1.
"""
import math
import pytest

from schemas import (
    FEAModel, Node, Element, Constraint,
    ElementType, ConstraintType,
)
from core.solver import ModalSolver


pytestmark = pytest.mark.benchmark


BETA_L = [1.875104, 4.694091, 7.854757, 10.995541]


def _build_cantilever(n_div: int, L: float) -> FEAModel:
    nodes = [Node(id=i + 1, x=L * i / n_div, y=0, z=0) for i in range(n_div + 1)]
    elements = [
        Element(
            id=i + 1, type=ElementType.BEAM2D, nodes=[i + 1, i + 2],
            material_id="steel_s355", section_id="ipe_300",
        ) for i in range(n_div)
    ]
    constraints = [Constraint(id=1, type=ConstraintType.FIXED, node_id=1)]
    return FEAModel(
        id="cantilever_modal", name="cantilever modal", is_3d=False,
        nodes=nodes, elements=elements,
        constraints=constraints, loads=[],
    )


def _analytical_freq(mode: int, L: float) -> float:
    """f_n per beam IPE 300 in acciaio S355."""
    E = 210e9
    I = 8356e-8  # IPE 300
    A = 5.38e-3
    rho = 7850
    bL = BETA_L[mode - 1]
    return (bL ** 2) / (2.0 * math.pi * L ** 2) * math.sqrt(E * I / (rho * A))


def _flexural_modes(modes):
    """Filtra i modi flessionali (uy dominante, ux trascurabile).

    Il solver restituisce anche i modi assiali interlacciati: per il cantilever
    beam2D il 1° modo assiale ricade tra il 2° e il 3° flessionale.
    """
    return [
        m for m in modes
        if abs(m.participation_y) > 10 * abs(m.participation_x)
    ]


@pytest.mark.parametrize("mode", [1, 2, 3])
def test_cantilever_flexural_freq_mode(mode):
    """Confronto delle prime 3 frequenze FLESSIONALI con la soluzione analitica.

    Tolleranza più stretta sui modi bassi, più larga sui modi alti
    (i modi alti richiedono mesh più fitta).
    """
    L = 2.0
    model = _build_cantilever(n_div=30, L=L)
    # Richiedo abbastanza modi per essere sicuro di averne 3 flessionali
    r = ModalSolver(model, n_modes=8).solve()
    flex = _flexural_modes(r.modes)
    assert len(flex) >= mode, f"Trovati solo {len(flex)} modi flessionali"
    expected = _analytical_freq(mode=mode, L=L)
    obtained = flex[mode - 1].frequency_hz
    rel_tol = {1: 0.02, 2: 0.05, 3: 0.05}[mode]
    assert obtained == pytest.approx(expected, rel=rel_tol), (
        f"flexural mode={mode}: ottenuto {obtained:.4f} Hz, atteso "
        f"{expected:.4f} Hz (toll {rel_tol*100:.0f}%)"
    )


def test_frequencies_ordered_increasing():
    """f_1 < f_2 < f_3 < ..."""
    model = _build_cantilever(n_div=20, L=2.0)
    r = ModalSolver(model, n_modes=4).solve()
    freqs = [m.frequency_hz for m in r.modes]
    assert freqs == sorted(freqs)
    assert all(f > 0 for f in freqs)


def test_frequency_ratio_first_two_flexural_modes():
    """f_2 / f_1 ≈ (4.694/1.875)² ≈ 6.267 (proprietà universale del cantilever)."""
    model = _build_cantilever(n_div=30, L=2.0)
    r = ModalSolver(model, n_modes=5).solve()
    flex = _flexural_modes(r.modes)
    assert len(flex) >= 2
    ratio = flex[1].frequency_hz / flex[0].frequency_hz
    expected_ratio = (4.694091 / 1.875104) ** 2
    assert ratio == pytest.approx(expected_ratio, rel=0.05)


def test_flexural_frequencies_scale_with_inverse_L_squared():
    """f_1 (flessionale) ∝ 1/L²: raddoppiando L si divide per 4."""
    model1 = _build_cantilever(n_div=20, L=2.0)
    model2 = _build_cantilever(n_div=20, L=4.0)
    f1_short = _flexural_modes(ModalSolver(model1, n_modes=3).solve().modes)[0].frequency_hz
    f1_long = _flexural_modes(ModalSolver(model2, n_modes=3).solve().modes)[0].frequency_hz
    assert (f1_short / f1_long) == pytest.approx(4.0, rel=0.05)
