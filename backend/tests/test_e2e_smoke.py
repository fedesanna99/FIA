"""
Smoke test end-to-end FASE 25: copre l'API surface di FEA Pro in un workflow
realistico di un utente che modella, risolve, verifica, esporta.

NON è un test di profondità (quello è negli altri file); serve a garantire
che la composizione delle API non rompa il flusso normale.
"""
from __future__ import annotations
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from main import app
import storage


@pytest.fixture
def client():
    return TestClient(app)


def test_full_workflow_static_verify_export(client: TestClient, tmp_path: Path):
    """Crea cantilever → solve → verifica EC3 → export PDF + xlsx."""
    # 1. Crea modello
    r = client.post("/api/models/",
                      json={"name": "smoke", "is_3d": False})
    assert r.status_code == 200
    mid = r.json()["id"]

    try:
        # 2. Mesh line per 4 elementi
        r = client.post(
            f"/api/models/{mid}/mesh/line",
            json={"p0": [0, 0, 0], "p1": [4, 0, 0], "n_div": 4,
                  "material_id": "steel_s355",
                  "section_id": "ipe_300",
                  "element_type": "beam2d"},
        )
        assert r.status_code == 200
        added = r.json()
        assert added["added_nodes"] == 5
        assert added["added_elements"] == 4

        # 3. Vincolo + carico
        r = client.post(f"/api/models/{mid}/constraints",
                          json={"id": 1, "type": "fixed", "node_id": 1})
        assert r.status_code == 200
        r = client.post(f"/api/models/{mid}/loads",
                          json={"id": 1, "type": "nodal",
                                "target_id": 5, "fy": -1000})
        assert r.status_code == 200

        # 4. Validate
        r = client.get(f"/api/models/{mid}/validate")
        assert r.status_code == 200
        # Possono esserci warning (es. nodi non referenziati), ma nessun errore
        assert r.json()["errors"] == 0

        # 5. Auto-detect
        r = client.get(f"/api/models/{mid}/auto-detect")
        assert r.status_code == 200

        # 6. Static solve
        r = client.post(f"/api/analysis/static/{mid}")
        assert r.status_code == 200
        sr = r.json()
        assert sr["max_displacement"] > 0

        # 7. Verifica EC3
        r = client.post(f"/api/verify/ec3/{mid}")
        assert r.status_code == 200

        # 8. Export PDF
        r = client.get(f"/api/io/export/{mid}/pdf?include_static=true")
        assert r.status_code == 200
        assert r.content[:5] == b"%PDF-"

        # 9. Export XLSX
        r = client.get(f"/api/io/export/{mid}/xlsx?include_static=true")
        assert r.status_code == 200

        # 10. Export DXF
        r = client.get(f"/api/io/export/{mid}/dxf")
        assert r.status_code == 200

    finally:
        storage.delete_model(mid)


def test_compare_workflow(client: TestClient):
    """Crea 2 modelli (A e B con load 2x) → confronta → verifica diff."""
    a = client.post("/api/models/", json={"name": "A", "is_3d": False}).json()
    b = client.post("/api/models/", json={"name": "B", "is_3d": False}).json()
    try:
        # A
        client.post(
            f"/api/models/{a['id']}/mesh/line",
            json={"p0": [0, 0, 0], "p1": [3, 0, 0], "n_div": 3,
                  "material_id": "steel_s355", "section_id": "ipe_300",
                  "element_type": "beam2d"},
        )
        client.post(f"/api/models/{a['id']}/constraints",
                      json={"id": 1, "type": "fixed", "node_id": 1})
        client.post(f"/api/models/{a['id']}/loads",
                      json={"id": 1, "type": "nodal", "target_id": 4,
                            "fy": -1000})

        # B (load 2x)
        client.post(
            f"/api/models/{b['id']}/mesh/line",
            json={"p0": [0, 0, 0], "p1": [3, 0, 0], "n_div": 3,
                  "material_id": "steel_s355", "section_id": "ipe_300",
                  "element_type": "beam2d"},
        )
        client.post(f"/api/models/{b['id']}/constraints",
                      json={"id": 1, "type": "fixed", "node_id": 1})
        client.post(f"/api/models/{b['id']}/loads",
                      json={"id": 1, "type": "nodal", "target_id": 4,
                            "fy": -2000})

        # Compare con static diff
        r = client.post("/api/models/compare",
                         json={"model_a": a["id"], "model_b": b["id"],
                                "include_static_diff": True})
        assert r.status_code == 200
        data = r.json()
        # I modelli differiscono per il carico
        assert data["model_diff"]["loads_modified"] == [1]
        # Carico 2x → freccia 2x → delta significativo
        assert data["static_diff"]["max_delta_magnitude"] > 0
    finally:
        storage.delete_model(a["id"])
        storage.delete_model(b["id"])


def test_health_and_root_endpoints(client: TestClient):
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"

    r = client.get("/api")
    assert r.status_code == 200
    data = r.json()
    assert "app" in data
    assert "endpoints" in data


def test_ai_workflow_with_mock(client: TestClient, monkeypatch):
    """Crea modello → chiedi al copilot."""
    monkeypatch.setenv("FEAPRO_AI_PROVIDER", "mock")
    m = client.post("/api/models/", json={"name": "AI"}).json()
    try:
        client.post(f"/api/models/{m['id']}/nodes",
                     json={"id": 1, "x": 0, "y": 0, "z": 0})
        r = client.post("/api/ai/ask", json={
            "model_id": m["id"],
            "question": "Quanti nodi ci sono?",
        })
        assert r.status_code == 200
        # MockProvider risponde con il numero
        assert "1" in r.json()["answer"]
    finally:
        storage.delete_model(m["id"])


def test_accelerograms_catalog_listed(client: TestClient):
    r = client.get("/api/io/accelerograms")
    assert r.status_code == 200
    items = r.json()["items"]
    # I 2 file embedded sono sempre presenti
    assert len(items) >= 2
    assert all("name" in i for i in items)
