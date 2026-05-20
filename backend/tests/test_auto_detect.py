"""
Test auto-detection problemi modello.
"""
from __future__ import annotations
import pytest

from schemas import (
    FEAModel, Node, Element, Load, Constraint,
    ElementType, LoadType, ConstraintType,
)
from core.mesh import (
    auto_detect, detect_duplicate_elements, detect_coincident_nodes,
    detect_orphan_loads, detect_missing_section_for_beam,
    detect_oversized_winkler_jump,
)


def _build(nodes, elements, loads=None, constraints=None) -> FEAModel:
    return FEAModel(
        id="t", name="t", is_3d=False,
        nodes=nodes, elements=elements,
        loads=loads or [], constraints=constraints or [],
    )


class TestDuplicateElements:
    def test_finds_pair(self):
        m = _build(
            [Node(id=1, x=0, y=0, z=0), Node(id=2, x=1, y=0, z=0)],
            [Element(id=1, type=ElementType.BEAM2D, nodes=[1, 2],
                      material_id="steel_s355", section_id="ipe_300"),
              Element(id=2, type=ElementType.BEAM2D, nodes=[1, 2],
                      material_id="steel_s355", section_id="ipe_300")],
        )
        out = detect_duplicate_elements(m)
        assert len(out) == 1
        assert out[0].code == "DUPLICATE_ELEMENT"
        assert set(out[0].entity_ids) == {1, 2}

    def test_no_duplicates(self):
        m = _build(
            [Node(id=1, x=0, y=0, z=0), Node(id=2, x=1, y=0, z=0),
              Node(id=3, x=2, y=0, z=0)],
            [Element(id=1, type=ElementType.BEAM2D, nodes=[1, 2],
                      material_id="steel_s355", section_id="ipe_300"),
              Element(id=2, type=ElementType.BEAM2D, nodes=[2, 3],
                      material_id="steel_s355", section_id="ipe_300")],
        )
        assert detect_duplicate_elements(m) == []

    def test_permuted_nodes_still_duplicate(self):
        m = _build(
            [Node(id=1, x=0, y=0, z=0), Node(id=2, x=1, y=0, z=0)],
            [Element(id=1, type=ElementType.BEAM2D, nodes=[1, 2],
                      material_id="steel_s355", section_id="ipe_300"),
              Element(id=2, type=ElementType.BEAM2D, nodes=[2, 1],
                      material_id="steel_s355", section_id="ipe_300")],
        )
        assert len(detect_duplicate_elements(m)) == 1


class TestCoincidentNodes:
    def test_finds_pair_within_tol(self):
        m = _build(
            [Node(id=1, x=0.0, y=0, z=0),
              Node(id=2, x=1e-9, y=0, z=0),
              Node(id=3, x=2.0, y=0, z=0)],
            [],
        )
        out = detect_coincident_nodes(m, tol=1e-6)
        assert len(out) == 1
        assert set(out[0].entity_ids) == {1, 2}

    def test_no_coincident_above_tol(self):
        m = _build(
            [Node(id=1, x=0.0, y=0, z=0),
              Node(id=2, x=0.01, y=0, z=0)],
            [],
        )
        assert detect_coincident_nodes(m, tol=1e-6) == []


class TestOrphanLoads:
    def test_load_on_unconnected_node(self):
        m = _build(
            [Node(id=1, x=0, y=0, z=0),
              Node(id=2, x=1, y=0, z=0),
              Node(id=99, x=10, y=0, z=0)],  # orphan
            [Element(id=1, type=ElementType.BEAM2D, nodes=[1, 2],
                      material_id="steel_s355", section_id="ipe_300")],
            loads=[Load(id=1, type=LoadType.NODAL, target_id=99, fy=-1000)],
        )
        out = detect_orphan_loads(m)
        assert len(out) == 1
        assert out[0].entity_ids == [1]

    def test_load_on_connected_node_ok(self):
        m = _build(
            [Node(id=1, x=0, y=0, z=0), Node(id=2, x=1, y=0, z=0)],
            [Element(id=1, type=ElementType.BEAM2D, nodes=[1, 2],
                      material_id="steel_s355", section_id="ipe_300")],
            loads=[Load(id=1, type=LoadType.NODAL, target_id=2, fy=-1000)],
        )
        assert detect_orphan_loads(m) == []


class TestMissingSection:
    def test_beam_without_section(self):
        m = _build(
            [Node(id=1, x=0, y=0, z=0), Node(id=2, x=1, y=0, z=0)],
            [Element(id=1, type=ElementType.BEAM2D, nodes=[1, 2],
                      material_id="steel_s355", section_id=None)],
        )
        out = detect_missing_section_for_beam(m)
        assert len(out) == 1
        assert out[0].code == "MISSING_SECTION"
        assert out[0].level == "error"

    def test_beam_with_section_ok(self):
        m = _build(
            [Node(id=1, x=0, y=0, z=0), Node(id=2, x=1, y=0, z=0)],
            [Element(id=1, type=ElementType.BEAM2D, nodes=[1, 2],
                      material_id="steel_s355", section_id="ipe_300")],
        )
        assert detect_missing_section_for_beam(m) == []


class TestWinklerJump:
    def test_large_jump_flagged(self):
        m = _build(
            [Node(id=i + 1, x=i, y=0, z=0) for i in range(3)],
            [Element(id=1, type=ElementType.BEAM2D, nodes=[1, 2],
                      material_id="steel_s355", section_id="ipe_300",
                      winkler_k=1e3),
              Element(id=2, type=ElementType.BEAM2D, nodes=[2, 3],
                      material_id="steel_s355", section_id="ipe_300",
                      winkler_k=1e6)],  # ratio = 1000
        )
        out = detect_oversized_winkler_jump(m, ratio_threshold=100.0)
        assert len(out) >= 1
        assert out[0].code == "WINKLER_JUMP"

    def test_small_jump_ok(self):
        m = _build(
            [Node(id=i + 1, x=i, y=0, z=0) for i in range(3)],
            [Element(id=1, type=ElementType.BEAM2D, nodes=[1, 2],
                      material_id="steel_s355", section_id="ipe_300",
                      winkler_k=1e6),
              Element(id=2, type=ElementType.BEAM2D, nodes=[2, 3],
                      material_id="steel_s355", section_id="ipe_300",
                      winkler_k=2e6)],  # ratio = 2
        )
        assert detect_oversized_winkler_jump(m) == []


class TestAutoDetectAggregator:
    def test_runs_all_checks(self):
        # Modello con multipli problemi
        m = _build(
            [Node(id=1, x=0, y=0, z=0),
              Node(id=2, x=0, y=0, z=0),  # coincident with 1
              Node(id=3, x=1, y=0, z=0)],
            [Element(id=1, type=ElementType.BEAM2D, nodes=[1, 3],
                      material_id="steel_s355", section_id="ipe_300"),
              Element(id=2, type=ElementType.BEAM2D, nodes=[1, 3],
                      material_id="steel_s355", section_id="ipe_300"),  # dup
              Element(id=3, type=ElementType.BEAM2D, nodes=[2, 3],
                      material_id="steel_s355", section_id=None)],   # no section
        )
        issues = auto_detect(m)
        codes = {i.code for i in issues}
        assert "DUPLICATE_ELEMENT" in codes
        assert "COINCIDENT_NODES" in codes
        assert "MISSING_SECTION" in codes


class TestAutoDetectEndpoint:
    def test_endpoint_returns_issues(self):
        from fastapi.testclient import TestClient
        from main import app
        import storage
        m = FEAModel(
            id=storage.new_id(), name="bad", is_3d=False,
            nodes=[Node(id=1, x=0, y=0, z=0), Node(id=2, x=1, y=0, z=0)],
            elements=[
                Element(id=1, type=ElementType.BEAM2D, nodes=[1, 2],
                         material_id="steel_s355", section_id="ipe_300"),
                Element(id=2, type=ElementType.BEAM2D, nodes=[1, 2],
                         material_id="steel_s355", section_id="ipe_300"),
            ],
            constraints=[],
            loads=[],
        )
        storage.save_model(m)
        client = TestClient(app)
        try:
            r = client.get(f"/api/models/{m.id}/auto-detect")
            assert r.status_code == 200, r.text
            data = r.json()
            assert data["n_issues"] >= 1
            assert any(i["code"] == "DUPLICATE_ELEMENT"
                        for i in data["issues"])
        finally:
            storage.delete_model(m.id)

    def test_endpoint_404_missing_model(self):
        from fastapi.testclient import TestClient
        from main import app
        r = TestClient(app).get("/api/models/nope/auto-detect")
        assert r.status_code == 404
