"""Test sul modulo mesh (generator + validator)."""
import math

from schemas import FEAModel, Node, Element, Constraint, ElementType, ConstraintType
from core.mesh import (
    mesh_line, mesh_rectangle_shell, mesh_box_solid,
    validate_model, IssueLevel,
)


class TestGenerator:
    def test_mesh_line_count(self):
        nodes, els = mesh_line((0, 0, 0), (6, 0, 0), 10,
                               material_id="steel_s355", section_id="ipe_300")
        assert len(nodes) == 11
        assert len(els) == 10
        assert nodes[0].x == 0 and nodes[-1].x == 6
        for e in els:
            assert e.type == ElementType.BEAM2D

    def test_mesh_line_uniform_spacing(self):
        nodes, _ = mesh_line((0, 0, 0), (10, 0, 0), 5,
                             material_id="steel_s355", section_id="ipe_300")
        spacings = [nodes[i + 1].x - nodes[i].x for i in range(len(nodes) - 1)]
        assert all(math.isclose(s, 2.0) for s in spacings)

    def test_mesh_rectangle_shell(self):
        nodes, els = mesh_rectangle_shell(
            (0, 0, 0), (2, 0, 0), (2, 1, 0), (0, 1, 0),
            nx=4, ny=2, material_id="steel_s355", section_id="shell_t100",
        )
        assert len(nodes) == (4 + 1) * (2 + 1)
        assert len(els) == 4 * 2
        for el in els:
            assert el.type == ElementType.SHELL_Q4
            assert len(el.nodes) == 4

    def test_mesh_box_solid(self):
        nodes, els = mesh_box_solid(
            (0, 0, 0), (2, 1, 1), nx=2, ny=1, nz=1,
            material_id="concrete_c30",
        )
        assert len(nodes) == 3 * 2 * 2
        assert len(els) == 2
        for el in els:
            assert el.type == ElementType.SOLID_H8
            assert len(el.nodes) == 8


class TestValidator:
    def _base_model(self) -> FEAModel:
        nodes, els = mesh_line((0, 0, 0), (2, 0, 0), 3,
                               material_id="steel_s355", section_id="ipe_300")
        return FEAModel(
            id="t", name="t", is_3d=False,
            nodes=nodes, elements=els,
            constraints=[Constraint(id=1, type=ConstraintType.FIXED, node_id=1)],
        )

    def test_clean_model_no_errors(self):
        m = self._base_model()
        issues = validate_model(m)
        errors = [i for i in issues if i.level == IssueLevel.ERROR]
        assert errors == [], f"Modello pulito ha errori: {[i.message for i in errors]}"

    def test_missing_constraints(self):
        m = self._base_model()
        m.constraints = []
        issues = validate_model(m)
        assert any(i.level == IssueLevel.ERROR and "vincol" in i.message.lower() for i in issues)

    def test_duplicate_node_ids(self):
        m = self._base_model()
        m.nodes.append(Node(id=m.nodes[0].id, x=99, y=99, z=99))
        issues = validate_model(m)
        assert any("duplicat" in i.message.lower() and i.entity_type == "node" for i in issues)

    def test_dangling_element_reference(self):
        m = self._base_model()
        m.elements.append(Element(
            id=99, type=ElementType.BEAM2D, nodes=[999, 1000],
            material_id="steel_s355", section_id="ipe_300",
        ))
        issues = validate_model(m)
        assert any("inesistenti" in i.message for i in issues)

    def test_zero_length_beam(self):
        m = self._base_model()
        m.nodes.append(Node(id=100, x=0, y=0, z=0))
        m.elements.append(Element(
            id=100, type=ElementType.BEAM2D, nodes=[1, 100],
            material_id="steel_s355", section_id="ipe_300",
        ))
        issues = validate_model(m)
        assert any("lunghezza nulla" in i.message for i in issues)

    def test_unknown_material(self):
        m = self._base_model()
        m.elements[0].material_id = "unobtanium"
        issues = validate_model(m)
        assert any("non in libreria" in i.message for i in issues)

    def test_warning_no_loads(self):
        m = self._base_model()
        issues = validate_model(m)
        assert any(i.level == IssueLevel.WARNING and "carico" in i.message.lower() for i in issues)
