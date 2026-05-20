"""Test sull'analisi sismica con accelerogramma alla base (ground_accel)."""
import math
import numpy as np
import pytest

from schemas import FEAModel, Node, Element, Load, Constraint, ElementType, LoadType, ConstraintType
from core.solver import DynamicSolver, ModalSolver


def make_sdof_with_mass(L: float = 1.0, mass: float = 500.0) -> FEAModel:
    n_div = 5
    nodes = [Node(id=i + 1, x=L * i / n_div, y=0, z=0) for i in range(n_div + 1)]
    elements = [Element(
        id=i + 1, type=ElementType.BEAM2D, nodes=[i + 1, i + 2],
        material_id="steel_s355", section_id="ipe_300",
    ) for i in range(n_div)]
    constraints = [Constraint(id=1, type=ConstraintType.FIXED, node_id=1)]
    loads = [Load(id=1, type=LoadType.NODAL_MASS, target_id=n_div + 1, mass=mass)]
    return FEAModel(id="seis", name="seis", is_3d=False,
                    nodes=nodes, elements=elements, constraints=constraints, loads=loads)


def test_ground_accel_runs():
    """Smoke: impulso sismico verticale alla base produce risposta finita."""
    model = make_sdof_with_mass()
    model.loads.append(Load(
        id=2, type=LoadType.GROUND_ACCEL, target_id=0,
        direction=[0.0, -1.0, 0.0],
        time_history=[(0.0, 0.0), (0.05, 9.81), (0.10, 0.0), (1.0, 0.0)],
    ))
    r = DynamicSolver(model, dt=0.005, t_end=0.6).solve()
    assert r.n_steps > 0
    assert r.max_displacement > 0
    for h in r.node_history.values():
        for vals in h.values():
            assert all(math.isfinite(v) for v in vals)


def test_ground_accel_resonance():
    """Forzante sismica armonica al periodo T1 → risposta significativa per risonanza."""
    model = make_sdof_with_mass()
    T1 = ModalSolver(model, n_modes=1).solve().modes[0].period
    f1 = 1.0 / T1
    dt = T1 / 80.0
    times = np.arange(0, 10 * T1, dt)
    ag = 0.5 * np.sin(2 * np.pi * f1 * times)
    model.loads.append(Load(
        id=99, type=LoadType.GROUND_ACCEL, target_id=0,
        direction=[0.0, -1.0, 0.0],
        time_history=[(float(t), float(a)) for t, a in zip(times, ag)],
    ))
    r = DynamicSolver(model, dt=dt, t_end=float(times[-1]),
                      rayleigh_alpha=0.05, rayleigh_beta=0.0001).solve()
    no_seismic = DynamicSolver(make_sdof_with_mass(), dt=dt, t_end=float(times[-1])).solve()
    assert r.max_displacement > no_seismic.max_displacement
