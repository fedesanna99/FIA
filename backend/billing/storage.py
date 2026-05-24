"""Billing records storage (v2.4.6 — minimal, file-based).

Persistenza JSON in `backend/data/billing.json`. Single-machine.
Multi-machine: porting a DB futuro (vedi #28bis debt).

Usato da `auth.cascade_delete` per soddisfare GDPR Art. 17.
"""
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any


# Path overridable per testing (monkeypatch). Default: backend/data/billing.json
BILLING_FILE: str = str(Path(__file__).resolve().parent.parent / "data" / "billing.json")


def _load_billing() -> dict[str, list[Any]]:
    if not os.path.exists(BILLING_FILE):
        return {}
    try:
        with open(BILLING_FILE, encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return {}


def _save_billing(data: dict[str, list[Any]]) -> None:
    os.makedirs(os.path.dirname(BILLING_FILE), exist_ok=True)
    with open(BILLING_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def delete_user_billing(user_id: str) -> int:
    """Elimina hard tutti i billing records dell'utente.

    Returns:
        Numero di records eliminati. 0 se l'utente non aveva records.
    """
    data = _load_billing()
    user_records = data.pop(user_id, [])
    if user_records:
        _save_billing(data)
    return len(user_records)


def get_user_billing(user_id: str) -> list[Any]:
    """Recupera billing records dell'utente. Lista vuota se assente."""
    return _load_billing().get(user_id, [])


def add_user_billing(user_id: str, record: dict[str, Any]) -> None:
    """Aggiunge un record billing per `user_id`."""
    data = _load_billing()
    data.setdefault(user_id, []).append(record)
    _save_billing(data)
