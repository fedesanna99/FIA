"""Test sul solver dinamico Newmark-β."""
import math
import pytest

from schemas import FEAModel, Node, Element, Load, Constraint, ElementType, LoadType, ConstraintType
from core.solver import DynamicSolver, ModalSolver


def make_sdof_cantilever() -> FEAModel:
    """Mensola con massa concentrata in punta — oscillatore a 1 GdL.

    Frequenza propria attesa: f₁ = 1/(2π) √(k/m) con k = 3EI/L³.
    """
    L = 1.0
    n_div = 6
    nodes = [Node(id=i + 1, x=L * i / n_div, y=0, z=0) for i in range(n_div + 1)]
    elements = [Element(
        id=i + 1, type=ElementType.BEAM2D, nodes=[i + 1, i + 2],
        material_id="steel_s355", section_id="ipe_300",
    ) for i in range(n_div)]
    constraints = [Constraint(id=1, type=ConstraintType.FIXED, node_id=1)]
    loads = [Load(id=1, type=LoadType.NODAL_MASS, target_id=n_div + 1, mass=500.0)]
    return FEAModel(
        id="dyn_sdof", name="sdof cantilever", is_3d=False,
        nodes=nodes, elements=elements, constraints=constraints, loads=loads,
    )


def test_dynamic_solver_runs():
    """Smoke test: solver dinamico produce storia temporale finita."""
    model = make_sdof_cantilever()
    model.loads.append(Load(
        id=2, type=LoadType.DYNAMIC, target_id=7,
        direction=[0.0, -1.0, 0.0],
        time_history=[(0.0, 0.0), (0.01, 1000.0), (0.05, 0.0), (1.0, 0.0)],
    ))
    r = DynamicSolver(model, dt=0.01, t_end=0.5).solve()
    assert r.n_steps > 0
    assert len(r.times) > 0
    assert r.max_displacement > 0
    for nid, h in r.node_history.items():
        for vals in h.values():
            assert all(math.isfinite(v) for v in vals)


def test_dynamic_free_vibration_matches_modal():
    """Vibrazione libera: il periodo della risposta deve corrispondere a T₁."""
    model = make_sdof_cantilever()
    modal = ModalSolver(model, n_modes=2).solve()
    T1 = modal.modes[0].period
    model_dyn = make_sdof_cantilever()
    model_dyn.loads.append(Load(
        id=99, type=LoadType.DYNAMIC, target_id=7,
        direction=[0.0, -1.0, 0.0],
        time_history=[(0.0, 0.0), (0.001, 5000.0), (0.005, 0.0), (5.0, 0.0)],
    ))
    dt = T1 / 50.0
    t_end = 4 * T1
    r = DynamicSolver(model_dyn, dt=dt, t_end=t_end,
                      rayleigh_alpha=0.0, rayleigh_beta=0.0).solve()
    h = r.node_history[7]["uy"]
    times = r.times
    zero_crossings: list[float] = []
    for i in range(1, len(h)):
        if h[i - 1] * h[i] < 0:
            t_cross = times[i - 1] + (times[i] - times[i - 1]) * (-h[i - 1]) / (h[i] - h[i - 1])
            zero_crossings.append(t_cross)
    assert len(zero_crossings) >= 2, "almeno 2 attraversamenti dello zero"
    half_period = zero_crossings[1] - zero_crossings[0]
    T_measured = 2 * half_period
    assert T_measured == pytest.approx(T1, rel=0.10), (
        f"T misurato={T_measured:.4f}s vs T modale={T1:.4f}s"
    )
