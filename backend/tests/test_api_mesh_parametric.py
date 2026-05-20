"""
Test endpoint /api/models/{id}/mesh/parametric.
"""
from __future__ import annotations
import pytest
from fastapi.testclient import TestClient

from main import app
import storage
from schemas import FEAModel


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def empty_model_id():
    m = FEAModel(id=storage.new_id(), name="mp", is_3d=False,
                 nodes=[], elements=[], constraints=[], loads=[])
    storage.save_model(m)
    yield m.id
    storage.delete_model(m.id)


class TestMeshParametricEndpoint:
    def test_rectangle_via_api(self, client: TestClient, empty_model_id: str):
        r = client.post(
            f"/api/models/{empty_model_id}/mesh/parametric",
            json={"shape": "rectangle",
                  "params": {"w": 4.0, "h": 2.0},
                  "h": 0.5,
                  "mesher": "delaunay"},
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["added_nodes"] > 5
        assert data["added_elements"] > 5

    def test_ring_via_api(self, client: TestClient, empty_model_id: str):
        r = client.post(
            f"/api/models/{empty_model_id}/mesh/parametric",
            json={"shape": "ring",
                  "params": {"radius_outer": 2.0, "radius_inner": 1.0,
                              "n_segments": 24},
                  "h": 0.3,
                  "mesher": "delaunay"},
        )
        assert r.status_code == 200, r.text
        data = r.json()
        # Anello → meno triangoli che cerchio pieno
        assert data["added_elements"] > 0

    def test_circle_gmsh(self, client: TestClient, empty_model_id: str):
        r = client.post(
            f"/api/models/{empty_model_id}/mesh/parametric",
            json={"shape": "circle",
                  "params": {"radius": 1.5},
                  "h": 0.2,
                  "mesher": "gmsh"},
        )
        assert r.status_code == 200, r.text

    def test_invalid_shape_400(self, client: TestClient, empty_model_id: str):
        r = client.post(
            f"/api/models/{empty_model_id}/mesh/parametric",
            json={"shape": "nope", "params": {}},
        )
        assert r.status_code == 400

    def test_missing_param_400(self, client: TestClient, empty_model_id: str):
        # Manca 'h' (height) per rectangle
        r = client.post(
            f"/api/models/{empty_model_id}/mesh/parametric",
            json={"shape": "rectangle", "params": {"w": 1.0}},
        )
        assert r.status_code == 400

    def test_gmsh_rejects_holes(self, client: TestClient, empty_model_id: str):
        r = client.post(
            f"/api/models/{empty_model_id}/mesh/parametric",
            json={"shape": "ring",
                  "params": {"radius_outer": 2.0, "radius_inner": 1.0},
                  "mesher": "gmsh"},
        )
        assert r.status_code == 400
        assert "holes" in r.text.lower()
