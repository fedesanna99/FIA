"""Test sulla persistenza dei modelli su disco."""
import os
import shutil
from pathlib import Path
import pytest


@pytest.fixture
def tmp_storage(monkeypatch, tmp_path):
    """Punta lo storage a una directory temporanea fresca."""
    monkeypatch.setenv("FEA_DATA_DIR", str(tmp_path / "models"))
    monkeypatch.delenv("FEA_NO_PERSIST", raising=False)
    import importlib
    import storage
    importlib.reload(storage)
    yield storage
    if (tmp_path / "models").exists():
        shutil.rmtree(tmp_path / "models")


def test_save_writes_file(tmp_storage):
    from schemas import FEAModel
    m = FEAModel(id="t1", name="Test", is_3d=False, nodes=[], elements=[])
    tmp_storage.save_model(m)
    f = Path(os.environ["FEA_DATA_DIR"]) / "t1.json"
    assert f.exists(), "Il file JSON deve essere stato scritto"


def test_load_from_disk_restores(tmp_storage):
    from schemas import FEAModel, Node
    m = FEAModel(id="t2", name="Persist", is_3d=False,
                 nodes=[Node(id=1, x=1, y=2, z=3)], elements=[])
    tmp_storage.save_model(m)
    tmp_storage._MODELS.clear()
    assert tmp_storage.get_model("t2") is None
    tmp_storage.seed_examples()
    restored = tmp_storage.get_model("t2")
    assert restored is not None
    assert restored.nodes[0].x == 1


def test_delete_removes_file(tmp_storage):
    from schemas import FEAModel
    m = FEAModel(id="t3", name="Del", is_3d=False, nodes=[], elements=[])
    tmp_storage.save_model(m)
    f = Path(os.environ["FEA_DATA_DIR"]) / "t3.json"
    assert f.exists()
    assert tmp_storage.delete_model("t3") is True
    assert not f.exists()


def test_no_persist_env_disables(monkeypatch, tmp_path):
    monkeypatch.setenv("FEA_DATA_DIR", str(tmp_path / "models"))
    monkeypatch.setenv("FEA_NO_PERSIST", "1")
    import importlib
    import storage
    importlib.reload(storage)
    from schemas import FEAModel
    m = FEAModel(id="t4", name="NoPersist", is_3d=False, nodes=[], elements=[])
    storage.save_model(m)
    assert not (tmp_path / "models" / "t4.json").exists()
