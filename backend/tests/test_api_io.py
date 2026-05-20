"""
Test endpoint /api/io — import (upload multipart) ed export (download).

Strategia:
    - Export DXF/IFC di un modello in storage → 200 + content_type giusto.
    - Re-upload del file scaricato come import → modello creato nuovo.
    - 400 su file con estensione errata.
"""
from __future__ import annotations
import io
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from main import app
import storage
from schemas import FEAModel, Node, Element, ElementType


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def sample_model_id():
    """Crea direttamente in storage un modello noto e ritorna il suo id."""
    m = FEAModel(
        id=storage.new_id(), name="ioapi_sample", is_3d=False,
        nodes=[Node(id=1, x=0, y=0, z=0), Node(id=2, x=2, y=0, z=0), Node(id=3, x=4, y=0, z=0)],
        elements=[
            Element(id=1, type=ElementType.BEAM2D, nodes=[1, 2],
                    material_id="steel_s355", section_id="ipe_300"),
            Element(id=2, type=ElementType.BEAM2D, nodes=[2, 3],
                    material_id="steel_s355", section_id="ipe_300"),
        ],
        constraints=[], loads=[],
    )
    storage.save_model(m)
    yield m.id
    storage.delete_model(m.id)


class TestExportEndpoints:
    def test_export_dxf_returns_file(self, client: TestClient, sample_model_id: str):
        r = client.get(f"/api/io/export/{sample_model_id}/dxf")
        assert r.status_code == 200, r.text
        assert r.headers["content-type"].startswith("application/dxf") or \
               r.headers["content-type"].startswith("application/octet-stream")
        assert len(r.content) > 0
        # Il file deve iniziare con marker DXF (commento iniziale "0\nSECTION")
        assert b"SECTION" in r.content[:200]

    def test_export_ifc_returns_file(self, client: TestClient, sample_model_id: str):
        r = client.get(f"/api/io/export/{sample_model_id}/ifc")
        assert r.status_code == 200, r.text
        # File IFC inizia con "ISO-10303-21;"
        assert r.content[:13] == b"ISO-10303-21;"

    def test_export_unknown_model_404(self, client: TestClient):
        r = client.get("/api/io/export/does_not_exist/dxf")
        assert r.status_code == 404


class TestImportEndpoints:
    def test_import_dxf_round_trip_via_api(
        self, client: TestClient, sample_model_id: str, tmp_path: Path
    ):
        # 1) Export → bytes
        r_export = client.get(f"/api/io/export/{sample_model_id}/dxf")
        assert r_export.status_code == 200
        dxf_bytes = r_export.content
        # 2) Upload come nuovo modello
        files = {"file": ("test.dxf", io.BytesIO(dxf_bytes), "application/dxf")}
        r_import = client.post("/api/io/import/dxf", files=files)
        assert r_import.status_code == 200, r_import.text
        # BL-8: la response ora è {"model": FEAModel, "warnings": [...]}
        body = r_import.json()
        assert "model" in body and "warnings" in body
        m = body["model"]
        assert m["id"] != sample_model_id
        assert len(m["nodes"]) == 3
        assert len(m["elements"]) == 2
        # cleanup
        storage.delete_model(m["id"])

    def test_import_ifc_round_trip_via_api(
        self, client: TestClient, sample_model_id: str
    ):
        r_export = client.get(f"/api/io/export/{sample_model_id}/ifc")
        assert r_export.status_code == 200
        ifc_bytes = r_export.content
        files = {"file": ("test.ifc", io.BytesIO(ifc_bytes), "application/ifc")}
        r_import = client.post("/api/io/import/ifc", files=files)
        assert r_import.status_code == 200, r_import.text
        body = r_import.json()
        m = body.get("model", body)  # backward-compat fallback se body è bare
        # In IFC i beam re-importati sono sempre BEAM3D
        assert all(e["type"] == "beam3d" for e in m["elements"])
        storage.delete_model(m["id"])

    def test_import_rejects_wrong_extension(self, client: TestClient):
        files = {"file": ("notdxf.txt", io.BytesIO(b"hello"), "text/plain")}
        r = client.post("/api/io/import/dxf", files=files)
        assert r.status_code == 400
        r = client.post("/api/io/import/ifc", files=files)
        assert r.status_code == 400

    def test_import_invalid_dxf_returns_400(self, client: TestClient):
        files = {"file": ("bad.dxf", io.BytesIO(b"this is not DXF"), "application/dxf")}
        r = client.post("/api/io/import/dxf", files=files)
        assert r.status_code == 400
