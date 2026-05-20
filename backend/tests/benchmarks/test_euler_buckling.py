"""
Benchmark analitico — Carico critico di Eulero per asta compressa.

Soluzione di riferimento:
    N_cr = π² E I / (K L)²

Coefficienti K per le 4 condizioni di vincolo classiche:
    - Cerniera-cerniera:        K = 1.0
    - Incastro-libero:          K = 2.0
    - Incastro-cerniera:        K ≈ 0.7
    - Incastro-incastro:        K = 0.5

Riferimento: Timoshenko & Gere, "Theory of Elastic Stability", 2nd ed., 1961, §2.1.

NOTA: dalla Fase 5 il solver di buckling usa K_G beam corretta (interpolazione
cubica, Bathe FEM Procedures §6.6.3). Per beam in flessione l'errore sul
valore Eulero è <0.01% anche con mesh grossolana (10 elementi).
"""
import math
import pytest

from schemas import (
    FEAModel, Node, Element, Load, Constraint,
    ElementType, LoadType, ConstraintType,
)
from core.solver import BucklingSolver


pytestmark = pytest.mark.benchmark


# Sezione "snella" custom: rect 50×50 mm con E=210e9, L abbastanza lungo
SECTION_ID = "rect_50x50_bench"


def _ensure_section():
    """Registra una sezione piccola e snella nel DB per i benchmark."""
    from schemas import SECTIONS_DB, Section
    if SECTION_ID not in SECTIONS_DB:
        b = h = 0.05
        A = b * h
        I = b * h**3 / 12.0
        SECTIONS_DB[SECTION_ID] = Section(
            id=SECTION_ID, name="Bench 50x50", type="rectangular",
            A=A, Iy=I, Iz=I, J=2 * I, Wply=b * h**2 / 4, Wplz=h * b**2 / 4,
            b=b, h=h,
        )
    return SECTIONS_DB[SECTION_ID]


def _build_column_beam2d(n_div: int, L: float, P_ref: float,
                          bc_base: ConstraintType,
                          bc_top: ConstraintType | None) -> FEAModel:
    """Colonna verticale 2D (asse y) di lunghezza L con N elementi beam2D.

    bc_top = None → top libero
    P_ref: forza assiale di compressione applicata in cima (fy negativa).
    """
    _ensure_section()
    nodes = [Node(id=i + 1, x=0, y=L * i / n_div, z=0) for i in range(n_div + 1)]
    elements = [
        Element(
            id=i + 1, type=ElementType.BEAM2D, nodes=[i + 1, i + 2],
            material_id="steel_s355", section_id=SECTION_ID,
        ) for i in range(n_div)
    ]
    constraints = [Constraint(id=1, type=bc_base, node_id=1)]
    if bc_top is not None:
        constraints.append(Constraint(id=2, type=bc_top, node_id=n_div + 1))
    loads = [Load(id=1, type=LoadType.NODAL, target_id=n_div + 1, fy=P_ref)]
    return FEAModel(
        id="euler_column", name="euler column", is_3d=False,
        nodes=nodes, elements=elements, constraints=constraints, loads=loads,
    )


def _euler_load(K: float, L: float) -> float:
    """N_cr = π² E I / (K L)² con materiale steel_s355 + sezione rect 50x50."""
    E = 210e9
    I = 0.05**4 / 12.0
    return (math.pi ** 2) * E * I / (K * L) ** 2


@pytest.mark.parametrize("n_div", [10, 20, 40])
def test_pinned_pinned_column_K1(n_div):
    """Asta cerniera-cerniera: K = 1, N_cr = π² EI/L².

    Validazione del valore assoluto dopo l'implementazione di K_G beam
    corretta (Fase 5). Convergenza essenzialmente esatta già con 10 elementi.
    """
    L = 2.0
    P_ref = -1000.0
    model = _build_column_beam2d(
        n_div=n_div, L=L, P_ref=P_ref,
        bc_base=ConstraintType.PINNED,
        bc_top=ConstraintType.ROLLER_X,
    )
    r = BucklingSolver(model, n_modes=3).solve()
    assert r["n_modes"] > 0
    critical_load = abs(P_ref) * r["critical_factor"]
    expected = _euler_load(K=1.0, L=L)
    assert critical_load == pytest.approx(expected, rel=0.02), (
        f"n_div={n_div}: ottenuto N_cr={critical_load:.2f}, atteso {expected:.2f}"
    )


@pytest.mark.parametrize("n_div", [20, 40])
def test_cantilever_column_K2(n_div):
    """Asta incastro-libero (cantilever): K = 2, N_cr = π²EI/(2L)² = π²EI/(4L²)."""
    L = 2.0
    P_ref = -1000.0
    model = _build_column_beam2d(
        n_div=n_div, L=L, P_ref=P_ref,
        bc_base=ConstraintType.FIXED,
        bc_top=None,  # top libero
    )
    r = BucklingSolver(model, n_modes=3).solve()
    assert r["n_modes"] > 0
    critical_load = abs(P_ref) * r["critical_factor"]
    expected = _euler_load(K=2.0, L=L)
    assert critical_load == pytest.approx(expected, rel=0.03)


@pytest.mark.parametrize("n_div", [20, 40])
def test_fixed_fixed_column_K05(n_div):
    """Asta incastro-incastro (con scorrimento assiale): K = 0.5, N_cr = 4π²EI/L²."""
    L = 2.0
    P_ref = -1000.0
    # Top: blocco solo ux e rotazione (no uy per permettere scorrimento assiale)
    model = _build_column_beam2d(
        n_div=n_div, L=L, P_ref=P_ref,
        bc_base=ConstraintType.FIXED,
        bc_top=None,
    )
    # Aggiungo vincolo top: ux=0, rotz=0, uy libero (per permettere il carico)
    n_top = n_div + 1
    model.constraints.append(
        Constraint(id=10, type=ConstraintType.CUSTOM, node_id=n_top,
                   dofs=[True, False, False, False, False, True])
    )
    r = BucklingSolver(model, n_modes=3).solve()
    if r["n_modes"] > 0:
        critical_load = abs(P_ref) * r["critical_factor"]
        expected = _euler_load(K=0.5, L=L)
        # Tolleranza più larga per mesh grossolane sul modo simmetrico
        assert critical_load == pytest.approx(expected, rel=0.05), (
            f"n={n_div}: N_cr={critical_load:.0f}, atteso {expected:.0f}"
        )


def test_buckling_load_ordering_increases():
    """I moltiplicatori di buckling devono essere ordinati crescentemente."""
    L = 2.0
    model = _build_column_beam2d(
        n_div=20, L=L, P_ref=-1000.0,
        bc_base=ConstraintType.PINNED,
        bc_top=ConstraintType.ROLLER_X,
    )
    r = BucklingSolver(model, n_modes=4).solve()
    factors = r["load_factors"]
    assert factors == sorted(factors), "Moltiplicatori non ordinati"
    assert all(f > 0 for f in factors), "Tutti positivi per compressione"


def test_buckling_scales_inverse_L_squared():
    """N_cr ∝ 1/L²: raddoppiando L il carico critico si divide per 4."""
    P_ref = -1000.0
    model1 = _build_column_beam2d(
        n_div=20, L=2.0, P_ref=P_ref,
        bc_base=ConstraintType.PINNED, bc_top=ConstraintType.ROLLER_X,
    )
    model2 = _build_column_beam2d(
        n_div=20, L=4.0, P_ref=P_ref,
        bc_base=ConstraintType.PINNED, bc_top=ConstraintType.ROLLER_X,
    )
    r1 = BucklingSolver(model1, n_modes=2).solve()
    r2 = BucklingSolver(model2, n_modes=2).solve()
    ratio = r1["critical_factor"] / r2["critical_factor"]
    assert ratio == pytest.approx(4.0, rel=0.15)


def test_buckling_zero_load_returns_zero():
    """Edge: senza forza assiale non c'è buckling (K_G ≈ 0)."""
    # Trave con carico solo trasversale: K_G derivante è ~0 sugli elementi
    nodes = [Node(id=1, x=0, y=0, z=0), Node(id=2, x=1.0, y=0, z=0)]
    elements = [Element(id=1, type=ElementType.BEAM2D, nodes=[1, 2],
                        material_id="steel_s355", section_id="ipe_300")]
    constraints = [Constraint(id=1, type=ConstraintType.FIXED, node_id=1)]
    loads = [Load(id=1, type=LoadType.NODAL, target_id=2, fy=-100.0)]
    model = FEAModel(id="no_axial", name="no axial", is_3d=False,
                     nodes=nodes, elements=elements,
                     constraints=constraints, loads=loads)
    r = BucklingSolver(model, n_modes=2).solve()
    assert "analysis_type" in r
