"""
Test API endpoint /api/io/accelerograms.
"""
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from main import app

# v2.3.2 fix CI: il catalogo accelerogrammi legge da
# backend/data/accelerograms/ che è gitignored. Skipping quando i
# fixture file non sono presenti (es. su runner CI fresh).
_CATALOG_FILE = Path(__file__).resolve().parent.parent / "data" / "accelerograms" / "synth_kt_5hz.AT2"
needs_catalog = pytest.mark.skipif(
    not _CATALOG_FILE.exists(),
    reason="Accelerogram catalog mancante (data/ gitignored)",
)


@pytest.fixture
def client():
    return TestClient(app)


class TestCatalog:
    @needs_catalog
    def test_list_returns_items(self, client: TestClient):
        r = client.get("/api/io/accelerograms")
        assert r.status_code == 200
        data = r.json()
        assert "items" in data
        # Almeno i 2 file embedded
        assert len(data["items"]) >= 2
        names = [i["name"] for i in data["items"]]
        assert any("synth_kt" in n.lower() for n in names)

    @needs_catalog
    def test_get_existing(self, client: TestClient):
        r = client.get("/api/io/accelerograms/synth_kt_5hz.AT2")
        assert r.status_code == 200
        data = r.json()
        assert data["npts"] == 1000
        assert data["dt"] == pytest.approx(0.01)
        assert len(data["time_history"]) == 1000

    def test_get_missing_404(self, client: TestClient):
        r = client.get("/api/io/accelerograms/does_not_exist.AT2")
        assert r.status_code == 404


class TestSyntheticAPI:
    def test_kanai_tajimi(self, client: TestClient):
        r = client.post(
            "/api/io/accelerograms/synthetic",
            json={"method": "kanai_tajimi", "pga": 2.5,
                  "dt": 0.01, "duration": 4.0, "seed": 1},
        )
        assert r.status_code == 200
        data = r.json()
        assert data["pga_m_s2"] == pytest.approx(2.5, rel=1e-3)
        assert data["npts"] >= 400

    def test_boore(self, client: TestClient):
        r = client.post(
            "/api/io/accelerograms/synthetic",
            json={"method": "boore", "pga": 1.5,
                  "dt": 0.02, "duration": 3.0, "seed": 2},
        )
        assert r.status_code == 200
        data = r.json()
        assert data["source"] == "synthetic_Boore"

    def test_invalid_method_400(self, client: TestClient):
        r = client.post(
            "/api/io/accelerograms/synthetic",
            json={"method": "alien_method"},
        )
        assert r.status_code == 400
