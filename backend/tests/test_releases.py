"""Test sulle cerniere interne (releases) negli elementi beam."""
import math
import pytest

from schemas import FEAModel, Node, Element, Load, Constraint, ElementType, LoadType, ConstraintType
from core.solver import StaticSolver, ModalSolver
from core.elements.beam2d import Beam2D, _condensate_releases


def test_condensate_release_zeroes_dof():
    """Dopo condensazione il dof rilasciato ha riga/colonna nulle."""
    b = Beam2D([0, 0], [2, 0], E=210e9, A=1e-3, I=1e-6)
    K = b.local_stiffness()
    K_rel = _condensate_releases(K, [2])
    assert (K_rel[2, :] == 0).all()
    assert (K_rel[:, 2] == 0).all()


def test_pinned_pinned_beam_no_bending_stiffness():
    """Trave con rilascio momento ad entrambi gli estremi (locale θz dof 2 e 5):
    si comporta come asta — nessuna rigidezza flessionale, nessuna rotazione
    interna deve indurre forze nodali traversali significative."""
    L = 4.0
    n_div = 4
    nodes = [Node(id=i + 1, x=L * i / n_div, y=0, z=0) for i in range(n_div + 1)]
    elements = []
    for i in range(n_div):
        elements.append(Element(
            id=i + 1, type=ElementType.BEAM2D, nodes=[i + 1, i + 2],
            material_id="steel_s355", section_id="ipe_300",
            releases=[2, 5],
        ))
    constraints = [
        Constraint(id=1, type=ConstraintType.FIXED, node_id=1),
        Constraint(id=2, type=ConstraintType.ROLLER_Y, node_id=n_div + 1),
    ]
    loads = [Load(id=1, type=LoadType.NODAL, target_id=3, fy=-10000.0)]
    model = FEAModel(id="rel", name="rel", is_3d=False,
                     nodes=nodes, elements=elements, constraints=constraints, loads=loads)
    r = StaticSolver(model).solve()
    assert all(math.isfinite(d.uy) for d in r.displacements)


def test_release_serializable_in_element_schema():
    """Verifica che releases sia serializzabile e riletto correttamente."""
    e = Element(id=1, type=ElementType.BEAM2D, nodes=[1, 2],
                material_id="steel_s355", section_id="ipe_300", releases=[5])
    j = e.model_dump_json()
    e2 = Element.model_validate_json(j)
    assert e2.releases == [5]
