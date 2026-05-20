"""
Test confronto modelli + risultati.
"""
from __future__ import annotations
import copy

import pytest

from schemas import (
    FEAModel, Node, Element, Load, Constraint,
    ElementType, LoadType, ConstraintType,
)
from schemas.results import StaticResults, NodalDisplacement, ElementForces
from core.postprocess import diff_models, diff_static_results, ModelDiff


def _base_model() -> FEAModel:
    return FEAModel(
        id="A", name="A", is_3d=False,
        nodes=[Node(id=1, x=0, y=0, z=0), Node(id=2, x=4, y=0, z=0)],
        elements=[Element(id=1, type=ElementType.BEAM2D, nodes=[1, 2],
                           material_id="steel_s355", section_id="ipe_300")],
        constraints=[Constraint(id=1, type=ConstraintType.FIXED, node_id=1)],
        loads=[Load(id=1, type=LoadType.NODAL, target_id=2, fy=-1000)],
    )


class TestDiffModels:
    def test_identical_models_no_changes(self):
        A = _base_model(); B = copy.deepcopy(A)
        d = diff_models(A, B)
        assert d.is_identical()
        assert d.total_changes() == 0

    def test_node_added(self):
        A = _base_model()
        B = copy.deepcopy(A)
        B.nodes.append(Node(id=3, x=8, y=0, z=0))
        d = diff_models(A, B)
        assert d.nodes_added == [3]
        assert d.nodes_removed == []

    def test_node_removed(self):
        A = _base_model()
        B = copy.deepcopy(A)
        B.nodes.pop()
        d = diff_models(A, B)
        assert d.nodes_removed == [2]
        assert d.nodes_added == []

    def test_node_moved(self):
        A = _base_model()
        B = copy.deepcopy(A)
        B.nodes[1].x = 5.0
        d = diff_models(A, B)
        assert len(d.nodes_moved) == 1
        nid, p1, p2 = d.nodes_moved[0]
        assert nid == 2
        assert p1 == (4.0, 0.0, 0.0)
        assert p2 == (5.0, 0.0, 0.0)

    def test_element_modified_material_change(self):
        A = _base_model()
        B = copy.deepcopy(A)
        B.elements[0].material_id = "steel_s275"
        d = diff_models(A, B)
        assert len(d.elements_modified) == 1
        eid, fields = d.elements_modified[0]
        assert eid == 1
        assert "material" in fields

    def test_element_modified_multiple_fields(self):
        A = _base_model()
        B = copy.deepcopy(A)
        B.elements[0].section_id = "ipe_200"
        B.elements[0].winkler_k = 1e5
        d = diff_models(A, B)
        assert len(d.elements_modified) == 1
        _, fields = d.elements_modified[0]
        assert set(fields) == {"section", "winkler_k"}

    def test_element_added(self):
        A = _base_model()
        B = copy.deepcopy(A)
        B.nodes.append(Node(id=3, x=8, y=0, z=0))
        B.elements.append(Element(id=2, type=ElementType.BEAM2D, nodes=[2, 3],
                                    material_id="steel_s355", section_id="ipe_300"))
        d = diff_models(A, B)
        assert d.elements_added == [2]
        assert d.nodes_added == [3]

    def test_load_modified(self):
        A = _base_model()
        B = copy.deepcopy(A)
        B.loads[0].fy = -2000.0
        d = diff_models(A, B)
        assert d.loads_modified == [1]

    def test_constraint_added(self):
        A = _base_model()
        B = copy.deepcopy(A)
        B.constraints.append(Constraint(id=2, type=ConstraintType.PINNED, node_id=2))
        d = diff_models(A, B)
        assert d.constraints_added == [2]

    def test_position_tolerance_respected(self):
        A = _base_model()
        B = copy.deepcopy(A)
        B.nodes[1].x = 4.0 + 1e-9  # micro-spostamento
        d = diff_models(A, B, pos_tol=1e-6)
        assert d.nodes_moved == []

    def test_total_changes_counts_all(self):
        A = _base_model()
        B = copy.deepcopy(A)
        B.nodes[1].x = 5.0
        B.loads[0].fy = -2000.0
        d = diff_models(A, B)
        assert d.total_changes() == 2
        assert not d.is_identical()


class TestDiffStaticResults:
    def _results(self, ux=0.0) -> StaticResults:
        return StaticResults(
            model_id="x",
            displacements=[
                NodalDisplacement(node_id=1, ux=0, uy=0),
                NodalDisplacement(node_id=2, ux=ux, uy=-0.01),
            ],
            element_forces=[
                ElementForces(element_id=1, N_i=0, Vy_i=1000, Mz_j=4000),
            ],
        )

    def test_identical_results_no_delta(self):
        rA = self._results(0.01)
        rB = self._results(0.01)
        d = diff_static_results(rA, rB)
        assert d.max_delta_mag == pytest.approx(0.0)

    def test_max_delta_magnitude(self):
        rA = self._results(0.01)
        rB = self._results(0.02)  # Δux = 0.01 al nodo 2
        d = diff_static_results(rA, rB)
        assert d.max_delta_ux == pytest.approx(0.01)
        assert d.node_with_max_delta == 2

    def test_max_delta_pct(self):
        rA = self._results(0.01)
        rB = self._results(0.02)
        d = diff_static_results(rA, rB)
        # maxA = max(|0.01|, |-0.01|) = 0.01
        # delta_mag ~ 0.01
        # → pct ≈ 100%
        assert d.max_delta_pct == pytest.approx(100.0, rel=0.1)

    def test_element_force_delta(self):
        rA = self._results(0.01)
        rB = self._results(0.01)
        # Modifica i forces in rB
        rB.element_forces[0].N_j = 500.0
        rB.element_forces[0].Mz_j = 5000.0
        d = diff_static_results(rA, rB)
        assert d.max_delta_N == pytest.approx(500)
        assert d.max_delta_M == pytest.approx(1000)


class TestCompareEndpoint:
    def test_compare_via_api(self):
        from fastapi.testclient import TestClient
        from main import app
        import storage
        a = _base_model(); a.id = storage.new_id(); storage.save_model(a)
        b = copy.deepcopy(a); b.id = storage.new_id(); b.nodes[1].x = 6.0
        storage.save_model(b)
        client = TestClient(app)
        try:
            r = client.post("/api/models/compare",
                              json={"model_a": a.id, "model_b": b.id})
            assert r.status_code == 200, r.text
            data = r.json()["model_diff"]
            assert data["total_changes"] >= 1
            assert any(m["id"] == 2 for m in data["nodes_moved"])
            assert data["is_identical"] is False
        finally:
            storage.delete_model(a.id); storage.delete_model(b.id)

    def test_compare_with_static_diff(self):
        from fastapi.testclient import TestClient
        from main import app
        import storage
        a = _base_model(); a.id = storage.new_id(); storage.save_model(a)
        b = copy.deepcopy(a); b.id = storage.new_id()
        b.loads[0].fy = -2000.0
        storage.save_model(b)
        client = TestClient(app)
        try:
            r = client.post("/api/models/compare",
                              json={"model_a": a.id, "model_b": b.id,
                                     "include_static_diff": True})
            assert r.status_code == 200, r.text
            data = r.json()
            assert "static_diff" in data
            assert data["static_diff"]["max_delta_magnitude"] > 0
        finally:
            storage.delete_model(a.id); storage.delete_model(b.id)

    def test_compare_404_missing(self):
        from fastapi.testclient import TestClient
        from main import app
        client = TestClient(app)
        r = client.post("/api/models/compare",
                          json={"model_a": "nope", "model_b": "nope2"})
        assert r.status_code == 404
