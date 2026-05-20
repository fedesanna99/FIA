"""
Test Python client + CLI.

Strategia: il client accetta un `transport` httpx custom. Usiamo
httpx.WSGITransport sul wrapper TestClient per intercettare le richieste
direttamente sull'app FastAPI senza avviare un server reale.
"""
from __future__ import annotations
from pathlib import Path
import io
import sys

import pytest
import httpx
from fastapi.testclient import TestClient

from main import app
import storage
from client import FEAProClient, FEAProError
from client.cli import main as cli_main


@pytest.fixture
def feapro_client():
    """Client puntato all'app FastAPI via TestClient (sync, no server reale)."""
    tc = TestClient(app)
    c = FEAProClient("http://testserver", http_client=tc)
    yield c
    tc.close()
    c.close()


@pytest.fixture
def cli_client():
    """Stessa cosa per i test CLI: client iniettato."""
    tc = TestClient(app)
    return FEAProClient("http://testserver", http_client=tc)


class TestClientCRUD:
    def test_create_and_get_model(self, feapro_client: FEAProClient):
        m = feapro_client.create_model(name="TestModel", is_3d=False)
        assert m["name"] == "TestModel"
        assert m["is_3d"] is False
        got = feapro_client.get_model(m["id"])
        assert got["id"] == m["id"]
        feapro_client.delete_model(m["id"])

    def test_404_raises_feapro_error(self, feapro_client: FEAProClient):
        with pytest.raises(FEAProError) as ei:
            feapro_client.get_model("nonexistent")
        assert ei.value.status == 404

    def test_list_models(self, feapro_client: FEAProClient):
        m = feapro_client.create_model(name="X")
        try:
            ms = feapro_client.list_models()
            assert any(x["id"] == m["id"] for x in ms)
        finally:
            feapro_client.delete_model(m["id"])

    def test_add_node_element_constraint_load(self, feapro_client: FEAProClient):
        m = feapro_client.create_model(name="full", is_3d=False)
        try:
            feapro_client.add_node(m["id"], 1, 0, 0, 0)
            feapro_client.add_node(m["id"], 2, 4, 0, 0)
            feapro_client.add_element(m["id"], 1, "beam2d", [1, 2],
                                       "steel_s355", "ipe_300")
            feapro_client.add_constraint(m["id"], 1, "fixed", 1)
            feapro_client.add_load(m["id"], 1, "nodal", 2, fy=-1000)
            r = feapro_client.run_static(m["id"])
            assert "max_displacement" in r
            assert r["max_displacement"] > 0
        finally:
            feapro_client.delete_model(m["id"])

    def test_run_modal(self, feapro_client: FEAProClient):
        """Modello con più nodi (multi-DOF) per consentire più di un modo."""
        m = feapro_client.create_model(name="modal", is_3d=False)
        try:
            for i, x in enumerate([0, 1, 2, 3, 4]):
                feapro_client.add_node(m["id"], i + 1, x, 0, 0)
            for i in range(4):
                feapro_client.add_element(m["id"], i + 1, "beam2d",
                                           [i + 1, i + 2],
                                           "steel_s355", "ipe_300")
            feapro_client.add_constraint(m["id"], 1, "fixed", 1)
            # Masse distribuite sui nodi liberi
            for nid in (2, 3, 4, 5):
                feapro_client.add_load(m["id"], nid,
                                        "nodal_mass", nid, mass=500)
            r = feapro_client.run_modal(m["id"], n_modes=3)
            # Almeno 2 modi devono essere disponibili
            assert r["n_modes"] >= 2
            assert len(r["modes"]) >= 2
        finally:
            feapro_client.delete_model(m["id"])

    def test_list_accelerograms(self, feapro_client: FEAProClient):
        items = feapro_client.list_accelerograms()
        assert isinstance(items, list)
        # Almeno i 2 file embedded
        assert len(items) >= 2


class TestClientImportExport:
    def test_import_export_dxf(self, feapro_client: FEAProClient, tmp_path: Path):
        # 1. Crea modello, esporta DXF
        m = feapro_client.create_model(name="dxftest", is_3d=False)
        try:
            feapro_client.add_node(m["id"], 1, 0, 0, 0)
            feapro_client.add_node(m["id"], 2, 4, 0, 0)
            feapro_client.add_element(m["id"], 1, "beam2d", [1, 2],
                                       "steel_s355", "ipe_300")
            out = tmp_path / "exp.dxf"
            feapro_client.export_dxf(m["id"], out)
            assert out.exists() and out.stat().st_size > 0
            # 2. Re-importa
            m2 = feapro_client.import_dxf(out)
            assert len(m2["nodes"]) == 2
            assert len(m2["elements"]) == 1
            feapro_client.delete_model(m2["id"])
        finally:
            feapro_client.delete_model(m["id"])

    def test_export_xlsx(self, feapro_client: FEAProClient, tmp_path: Path):
        m = feapro_client.create_model(name="xls", is_3d=False)
        try:
            feapro_client.add_node(m["id"], 1, 0, 0, 0)
            out = tmp_path / "exp.xlsx"
            feapro_client.export_xlsx(m["id"], out)
            assert out.exists() and out.stat().st_size > 1000
        finally:
            feapro_client.delete_model(m["id"])


class TestCLI:
    def test_list_models_command(self, capsys, cli_client: FEAProClient):
        m = cli_client.create_model(name="cli")
        try:
            ret = cli_main(["list-models"], client=cli_client)
            assert ret == 0
            captured = capsys.readouterr()
            assert m["id"] in captured.out
        finally:
            cli_client.delete_model(m["id"])
            cli_client.close()

    def test_run_static_command(self, capsys, cli_client: FEAProClient):
        m = cli_client.create_model(name="rs", is_3d=False)
        try:
            cli_client.add_node(m["id"], 1, 0, 0, 0)
            cli_client.add_node(m["id"], 2, 3, 0, 0)
            cli_client.add_element(m["id"], 1, "beam2d", [1, 2],
                                    "steel_s355", "ipe_300")
            cli_client.add_constraint(m["id"], 1, "fixed", 1)
            cli_client.add_load(m["id"], 1, "nodal", 2, fy=-500)
            ret = cli_main(["run-static", m["id"]], client=cli_client)
            assert ret == 0
            out = capsys.readouterr().out
            assert "max_displacement" in out
        finally:
            cli_client.delete_model(m["id"])
            cli_client.close()

    def test_cli_404_returns_2(self, capsys, cli_client: FEAProClient):
        ret = cli_main(["get-model", "nope"], client=cli_client)
        assert ret == 2
        cli_client.close()

    def test_export_xlsx_command(self, tmp_path: Path, capsys, cli_client: FEAProClient):
        m = cli_client.create_model(name="cliexp")
        try:
            out = tmp_path / "cli.xlsx"
            ret = cli_main(["export-xlsx", m["id"], str(out)],
                            client=cli_client)
            assert ret == 0
            assert out.exists()
        finally:
            cli_client.delete_model(m["id"])
            cli_client.close()

    def test_cli_help_works(self, capsys):
        with pytest.raises(SystemExit) as ei:
            cli_main(["--help"])
        assert ei.value.code == 0
