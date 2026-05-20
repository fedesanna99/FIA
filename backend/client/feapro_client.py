"""
Client Python sincrono per le API REST di FEA Pro.

Design:
    - Wrapper attorno a httpx.Client (incluso nei requirements esistenti).
    - Iniettabile: si può passare un client esterno (es. TestClient FastAPI
      per i test) tramite l'argomento `transport`.
    - Tutte le chiamate sollevano FEAProError su HTTP non-200.

Esempi:
    c = FEAProClient("http://localhost:8000")
    m = c.create_model(name="MyModel", is_3d=False)
    c.add_node(m["id"], 1, 0, 0, 0)
    c.add_node(m["id"], 2, 4, 0, 0)
    c.add_element(m["id"], 1, "beam2d", [1, 2], "steel_s355", "ipe_300")
    c.add_constraint(m["id"], 1, "fixed", 1)
    c.add_load(m["id"], 1, "nodal", 2, fy=-1000)
    r = c.run_static(m["id"])
    print("max_displacement:", r["max_displacement"])
"""
from __future__ import annotations
from typing import Any, Optional
from pathlib import Path

import httpx


class FEAProError(RuntimeError):
    """Errore generico dell'API FEA Pro."""
    def __init__(self, status: int, message: str):
        super().__init__(f"HTTP {status}: {message}")
        self.status = status
        self.message = message


class FEAProClient:
    """Client sincrono per FEA Pro REST API."""

    def __init__(
        self,
        base_url: str = "http://localhost:8000",
        *,
        timeout: float = 30.0,
        transport: Optional[httpx.BaseTransport] = None,
        http_client: Optional[httpx.Client] = None,
    ):
        """Args:
            base_url     : URL del server FEA Pro
            timeout      : timeout per ogni richiesta [s]
            transport    : transport httpx custom (per test offline)
            http_client  : client httpx già configurato (es. TestClient di
                           FastAPI). Se passato, base_url/transport sono
                           ignorati. Il client è considerato "non-owned"
                           — close() non lo chiude.
        """
        self.base_url = base_url.rstrip("/")
        self._owns_http = http_client is None
        if http_client is not None:
            self._http = http_client
        elif transport is not None:
            self._http = httpx.Client(base_url=self.base_url,
                                       transport=transport, timeout=timeout)
        else:
            self._http = httpx.Client(base_url=self.base_url, timeout=timeout)

    def close(self) -> None:
        if self._owns_http:
            self._http.close()

    def __enter__(self) -> "FEAProClient":
        return self

    def __exit__(self, *a) -> None:
        self.close()

    # ───────────────────── interni ─────────────────────

    def _request(self, method: str, path: str, **kwargs: Any) -> Any:
        r = self._http.request(method, path, **kwargs)
        if r.status_code >= 400:
            try:
                detail = r.json().get("detail", r.text)
            except Exception:
                detail = r.text
            raise FEAProError(r.status_code, str(detail))
        # Risposte binarie
        ct = r.headers.get("content-type", "")
        if ("application/json" not in ct
                and "application/xml" not in ct):
            return r.content
        try:
            return r.json()
        except Exception:
            return r.text

    # ───────────────────── modelli ─────────────────────

    def list_models(self) -> list[dict]:
        return self._request("GET", "/api/models/")

    def create_model(self, *, name: str = "Untitled", is_3d: bool = True,
                     description: Optional[str] = None) -> dict:
        return self._request(
            "POST", "/api/models/",
            json={"name": name, "is_3d": is_3d, "description": description},
        )

    def get_model(self, model_id: str) -> dict:
        return self._request("GET", f"/api/models/{model_id}")

    def delete_model(self, model_id: str) -> dict:
        return self._request("DELETE", f"/api/models/{model_id}")

    def duplicate_model(self, model_id: str) -> dict:
        return self._request("POST", f"/api/models/{model_id}/duplicate")

    # ───────────────────── elementi del modello ─────────────────────

    def add_node(self, model_id: str, node_id: int,
                 x: float, y: float, z: float = 0.0,
                 label: Optional[str] = None) -> dict:
        return self._request(
            "POST", f"/api/models/{model_id}/nodes",
            json={"id": node_id, "x": x, "y": y, "z": z, "label": label},
        )

    def add_element(self, model_id: str, element_id: int,
                    type_: str, nodes: list[int],
                    material_id: str, section_id: Optional[str] = None,
                    winkler_k: Optional[float] = None) -> dict:
        return self._request(
            "POST", f"/api/models/{model_id}/elements",
            json={"id": element_id, "type": type_, "nodes": nodes,
                  "material_id": material_id, "section_id": section_id,
                  "winkler_k": winkler_k},
        )

    def add_constraint(self, model_id: str, constraint_id: int,
                       type_: str, node_id: int,
                       dofs: Optional[list[bool]] = None,
                       spring_k: Optional[list[float]] = None,
                       compression_only: bool = False) -> dict:
        return self._request(
            "POST", f"/api/models/{model_id}/constraints",
            json={"id": constraint_id, "type": type_, "node_id": node_id,
                  "dofs": dofs, "spring_k": spring_k,
                  "compression_only": compression_only},
        )

    def add_load(self, model_id: str, load_id: int,
                 type_: str, target_id: int, **components: float) -> dict:
        body = {"id": load_id, "type": type_, "target_id": target_id}
        body.update(components)
        return self._request(
            "POST", f"/api/models/{model_id}/loads",
            json=body,
        )

    # ───────────────────── solver ─────────────────────

    def run_static(self, model_id: str) -> dict:
        return self._request("POST", f"/api/analysis/static/{model_id}")

    def run_modal(self, model_id: str, n_modes: int = 5) -> dict:
        return self._request(
            "POST", f"/api/analysis/modal/{model_id}",
            json={"n_modes": n_modes},
        )

    # ───────────────────── I/O ─────────────────────

    def import_dxf(self, file_path: str | Path) -> dict:
        """Importa DXF e ritorna il FEAModel come dict.

        Note: dal BL-8 il backend ritorna `{"model": ..., "warnings": [...]}`.
        Questo wrapper restituisce direttamente il `model` per backward-compat.
        Per ottenere anche i warnings usa `import_dxf_full()`.
        """
        body = self.import_dxf_full(file_path)
        return body.get("model", body)

    def import_dxf_full(self, file_path: str | Path) -> dict:
        """Versione completa: ritorna `{"model": ..., "warnings": [...]}`."""
        p = Path(file_path)
        with p.open("rb") as f:
            return self._request(
                "POST", "/api/io/import/dxf",
                files={"file": (p.name, f, "application/dxf")},
            )

    def export_dxf(self, model_id: str, out_path: str | Path) -> Path:
        out_path = Path(out_path)
        content = self._request("GET", f"/api/io/export/{model_id}/dxf")
        out_path.parent.mkdir(parents=True, exist_ok=True)
        if isinstance(content, bytes):
            out_path.write_bytes(content)
        else:
            out_path.write_text(str(content), encoding="utf-8")
        return out_path

    def export_xlsx(self, model_id: str, out_path: str | Path,
                    include_static: bool = False) -> Path:
        out_path = Path(out_path)
        params: dict[str, Any] = {}
        if include_static:
            params["include_static"] = "true"
        content = self._request(
            "GET", f"/api/io/export/{model_id}/xlsx", params=params,
        )
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_bytes(content if isinstance(content, bytes) else b"")
        return out_path

    def list_accelerograms(self) -> list[dict]:
        data = self._request("GET", "/api/io/accelerograms")
        return data.get("items", []) if isinstance(data, dict) else []

    # ───────────────────── verifiche ─────────────────────

    def verify_ec3(self, model_id: str) -> dict:
        return self._request("POST", f"/api/verify/ec3/{model_id}")
