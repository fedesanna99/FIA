"""
Test report PDF.

Strategia: genera il PDF, poi verifica:
    - Il file esiste e ha dimensione > 0
    - Header binario %PDF presente
    - reportlab si è completato senza errori
    - Endpoint API ritorna content-type application/pdf
"""
from __future__ import annotations
import io
from pathlib import Path

import pytest

from schemas import (
    FEAModel, Node, Element, Load, Constraint,
    ElementType, LoadType, ConstraintType,
)
from schemas.results import (
    StaticResults, ModalResults, ModeShape, NodalDisplacement,
)
from core.io import export_pdf


def _sample_model() -> FEAModel:
    return FEAModel(
        id="pdf_test", name="PDFTest", description="Test report",
        is_3d=False,
        nodes=[Node(id=i + 1, x=i, y=0, z=0) for i in range(4)],
        elements=[
            Element(id=i + 1, type=ElementType.BEAM2D,
                     nodes=[i + 1, i + 2],
                     material_id="steel_s355", section_id="ipe_300")
            for i in range(3)
        ],
        constraints=[Constraint(id=1, type=ConstraintType.FIXED, node_id=1)],
        loads=[Load(id=1, type=LoadType.NODAL, target_id=4, fy=-1000.0)],
    )


class TestPDFExport:
    def test_creates_pdf_file(self, tmp_path: Path):
        p = tmp_path / "r.pdf"
        out = export_pdf(_sample_model(), p)
        assert out == p
        assert p.exists() and p.stat().st_size > 1000

    def test_pdf_header_correct(self, tmp_path: Path):
        p = tmp_path / "r.pdf"
        export_pdf(_sample_model(), p)
        with p.open("rb") as f:
            head = f.read(5)
        assert head == b"%PDF-"

    def test_with_static_results(self, tmp_path: Path):
        p = tmp_path / "r.pdf"
        sr = StaticResults(
            model_id="pdf_test",
            displacements=[
                NodalDisplacement(node_id=1, ux=0, uy=0),
                NodalDisplacement(node_id=4, ux=0, uy=-0.01),
            ],
            max_displacement=0.01, max_stress=2e8, n_dofs=12,
            solve_time_ms=8.3,
        )
        export_pdf(_sample_model(), p, static_results=sr)
        assert p.stat().st_size > 1500  # più contenuto

    def test_with_modal_results(self, tmp_path: Path):
        p = tmp_path / "r.pdf"
        mr = ModalResults(
            model_id="pdf_test", n_modes=2,
            modes=[
                ModeShape(mode=1, frequency_hz=2.5, period=0.4,
                           omega=15.7, participation_x=0.6),
                ModeShape(mode=2, frequency_hz=8.0, period=0.125,
                           omega=50.3, participation_x=0.2),
            ],
        )
        export_pdf(_sample_model(), p, modal_results=mr)
        assert p.stat().st_size > 1500

    def test_empty_loads_constraints_ok(self, tmp_path: Path):
        m = FEAModel(id="x", name="x", is_3d=False,
                      nodes=[Node(id=1, x=0, y=0, z=0)],
                      elements=[], loads=[], constraints=[])
        p = tmp_path / "x.pdf"
        export_pdf(m, p)
        assert p.exists()


class TestPDFEndpoint:
    def test_endpoint_returns_pdf(self):
        from fastapi.testclient import TestClient
        from main import app
        import storage
        m = _sample_model(); m.id = storage.new_id()
        storage.save_model(m)
        client = TestClient(app)
        try:
            r = client.get(f"/api/io/export/{m.id}/pdf")
            assert r.status_code == 200, r.text
            assert r.headers["content-type"] == "application/pdf"
            assert r.content[:5] == b"%PDF-"
            assert len(r.content) > 1000
        finally:
            storage.delete_model(m.id)

    def test_endpoint_with_static_results(self):
        from fastapi.testclient import TestClient
        from main import app
        import storage
        m = _sample_model(); m.id = storage.new_id()
        storage.save_model(m)
        client = TestClient(app)
        try:
            r = client.get(f"/api/io/export/{m.id}/pdf?include_static=true")
            assert r.status_code == 200
            assert r.content[:5] == b"%PDF-"
        finally:
            storage.delete_model(m.id)

    def test_endpoint_404(self):
        from fastapi.testclient import TestClient
        from main import app
        r = TestClient(app).get("/api/io/export/no_such/pdf")
        assert r.status_code == 404
