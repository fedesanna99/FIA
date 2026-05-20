"""
FEA Pro — Python client library + CLI.

Uso programmatico:
    from client import FEAProClient
    c = FEAProClient("http://localhost:8000")
    model = c.create_model(name="My Frame")
    c.add_node(model["id"], 1, 0, 0, 0)
    ...
    results = c.run_static(model["id"])

CLI:
    python -m client.cli list-models --url http://localhost:8000
    python -m client.cli run-static <model-id>
    python -m client.cli import-dxf path/to/file.dxf
"""
from .feapro_client import FEAProClient, FEAProError

__all__ = ["FEAProClient", "FEAProError"]
