"""Test smoke per FastAPI usando TestClient."""
import pytest
from fastapi.testclient import TestClient

from main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_root(client):
    # `/` now serves the SPA when the bundled frontend is present (production
    # image), and is unmounted in dev/tests. The JSON info endpoint moved to
    # `/api` so it's always available.
    r = client.get("/api")
    assert r.status_code == 200
    assert r.json()["app"] == "FEA Pro"


def test_list_materials(client):
    r = client.get("/api/materials")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert any(m["id"] == "steel_s355" for m in data)


def test_list_sections(client):
    r = client.get("/api/sections")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert any(s["id"] == "ipe_300" for s in data)


def test_examples_seeded(client):
    r = client.get("/api/models/")
    assert r.status_code == 200
    data = r.json()
    assert len(data) >= 5
    ids = {m["id"] for m in data}
    assert "ex_simple_beam_2d" in ids


def test_static_analysis_on_example(client):
    r = client.post("/api/analysis/static/ex_simple_beam_2d", json={})
    assert r.status_code == 200
    data = r.json()
    assert data["analysis_type"] == "static"
    assert data["max_displacement"] > 0
    assert len(data["displacements"]) > 0


def test_create_and_delete_model(client):
    r = client.post("/api/models/", json={"name": "Pytest model", "is_3d": True})
    assert r.status_code == 200
    mid = r.json()["id"]

    r = client.get(f"/api/models/{mid}")
    assert r.status_code == 200
    assert r.json()["name"] == "Pytest model"

    r = client.delete(f"/api/models/{mid}")
    assert r.status_code == 200

    r = client.get(f"/api/models/{mid}")
    assert r.status_code == 404
