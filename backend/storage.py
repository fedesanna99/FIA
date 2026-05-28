"""Storage per modelli FEA + risultati analisi.

Modelli serializzati in JSON nella cartella `data/models/` (uno per file).
I risultati restano in memoria (sono ricomputabili).

Disattivare la persistenza esportando FEA_NO_PERSIST=1.
"""
from __future__ import annotations
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from uuid import uuid4

from schemas import FEAModel
from examples import build_example_models


_PERSIST_ENABLED = os.environ.get("FEA_NO_PERSIST", "").lower() not in ("1", "true", "yes")
_DATA_DIR = Path(os.environ.get("FEA_DATA_DIR", Path(__file__).parent / "data" / "models"))

_MODELS: dict[str, FEAModel] = {}
_RESULTS: dict[str, dict[str, Any]] = {}


def _ensure_dir() -> None:
    if _PERSIST_ENABLED:
        _DATA_DIR.mkdir(parents=True, exist_ok=True)


def _model_path(model_id: str) -> Path:
    return _DATA_DIR / f"{model_id}.json"


def _write_to_disk(model: FEAModel) -> None:
    if not _PERSIST_ENABLED:
        return
    _ensure_dir()
    _model_path(model.id).write_text(model.model_dump_json(indent=2), encoding="utf-8")


def _delete_from_disk(model_id: str) -> None:
    if not _PERSIST_ENABLED:
        return
    p = _model_path(model_id)
    if p.exists():
        try: p.unlink()
        except OSError: pass


def _load_from_disk() -> list[FEAModel]:
    if not _PERSIST_ENABLED or not _DATA_DIR.exists():
        return []
    out: list[FEAModel] = []
    for f in sorted(_DATA_DIR.glob("*.json")):
        try:
            data = json.loads(f.read_text(encoding="utf-8"))
            out.append(FEAModel.model_validate(data))
        except Exception as e:
            print(f"[storage] errore caricando {f.name}: {e}")
    return out


def new_id() -> str:
    return str(uuid4())[:8]


def list_models() -> list[FEAModel]:
    return list(_MODELS.values())


def get_model(model_id: str) -> FEAModel | None:
    return _MODELS.get(model_id)


def _utcnow_iso() -> str:
    """ISO-8601 UTC con offset `+00:00` (es. `2026-05-28T18:42:11.123456+00:00`).

    Lex-ordinabile come `Z` per le query desc su `updated_at`. v3.1.2
    audit-fix L2-12: docstring corretto (prima dichiarava suffisso `Z`).
    """
    return datetime.now(timezone.utc).isoformat()


def save_model(model: FEAModel) -> FEAModel:
    """v3.1.1 audit-fix L2-4: aggiorna `updated_at` ad ogni save, e popola
    `created_at` se mancante (modello nuovo o pre-migration). Permette al
    frontend Dashboard di ordinare la lista "recenti" reale."""
    now = _utcnow_iso()
    if not model.created_at:
        model.created_at = now
    model.updated_at = now
    _MODELS[model.id] = model
    _write_to_disk(model)
    return model


def delete_model(model_id: str) -> bool:
    if model_id in _MODELS:
        del _MODELS[model_id]
        _RESULTS.pop(model_id, None)
        _delete_from_disk(model_id)
        return True
    return False


def save_results(model_id: str, analysis_type: str, results: Any) -> None:
    if model_id not in _RESULTS:
        _RESULTS[model_id] = {}
    _RESULTS[model_id][analysis_type] = results


def get_results(model_id: str, analysis_type: str) -> Any | None:
    return _RESULTS.get(model_id, {}).get(analysis_type)


def seed_examples() -> None:
    """All'avvio:
       1. carica i modelli persistiti su disco
       2. se mancano gli esempi precaricati, li aggiunge

    In questo modo i modelli salvati dall'utente sopravvivono al riavvio
    ma gli esempi vengono sempre inseriti.
    """
    if _MODELS:
        return
    for m in _load_from_disk():
        _MODELS[m.id] = m
    for m in build_example_models():
        if m.id not in _MODELS:
            _MODELS[m.id] = m
            _write_to_disk(m)


def reset_for_tests() -> None:
    """Cancella tutto e ricarica solo gli esempi (per i test)."""
    _MODELS.clear()
    _RESULTS.clear()
    for m in build_example_models():
        _MODELS[m.id] = m
