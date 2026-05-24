"""Regression test #22bis (v2.4.6) — GDPR cascade delete COMPLETE.

I 4 stub originali di `auth.cascade_delete` (models / snapshots / billing /
audit) ritornavano 0 hard-coded. v2.4.6 li sostituisce con implementazione
reale, eccetto snapshot (feature non implementata server-side, stub esplicito).

Questo file aggiunge 3 nuovi test:
- cascade ELIMINA modelli con `owner_id` corrispondente (lascia gli altri)
- cascade ANONIMIZZA audit log (sostituisce user_id con hash, non cancella)
- cascade ELIMINA billing records dell'utente (lascia gli altri)
"""
from __future__ import annotations

import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

import auth.users_db as users_db_module
from main import app


@pytest.fixture
def client(tmp_path: Path, monkeypatch):
    """SQLite users isolato + FEA_DATA_DIR isolato (modelli)."""
    test_db = tmp_path / "test_users.sqlite"
    monkeypatch.setenv("FEAPRO_USERS_DB", str(test_db))
    monkeypatch.setenv("FEAPRO_JWT_SECRET", "test-secret-22bis-1234567890abcd")
    monkeypatch.setenv("FEAPRO_JWT_TTL_HOURS", "1")

    models_dir = tmp_path / "models"
    models_dir.mkdir()
    monkeypatch.setenv("FEA_DATA_DIR", str(models_dir))

    users_db_module._reset_singleton_for_tests()
    with TestClient(app) as c:
        yield c
    users_db_module._reset_singleton_for_tests()


@pytest.fixture
def auth_token(client: TestClient) -> tuple[str, str]:
    """Registra utente test e ritorna (token, user_id)."""
    r = client.post(
        "/api/auth/register",
        json={"email": "cascade-22bis@example.com",
              "password": "longerThan8Char"},
    )
    assert r.status_code == 201, r.text
    return r.json()["token"], r.json()["user"]["id"]


# ── Test 1 · Modelli per owner_id ─────────────────────────────────────────


def test_cascade_deletes_user_models_by_owner_id(
    client: TestClient, auth_token: tuple[str, str], tmp_path: Path,
):
    """Cascade elimina solo i modelli con `owner_id == user_id`."""
    from auth.cascade_delete import delete_user_cascade

    _, user_id = auth_token
    models_dir = Path(tmp_path / "models")

    # 1. Modello dell'utente target
    model_user = models_dir / "m_user.json"
    with open(model_user, "w", encoding="utf-8") as f:
        json.dump({"id": "m_user", "name": "user model",
                   "owner_id": user_id, "nodes": [], "elements": [],
                   "loads": [], "constraints": []}, f)

    # 2. Modello di altro utente
    model_other = models_dir / "m_other.json"
    with open(model_other, "w", encoding="utf-8") as f:
        json.dump({"id": "m_other", "name": "other model",
                   "owner_id": "other_uid", "nodes": [], "elements": [],
                   "loads": [], "constraints": []}, f)

    # 3. Modello demo pubblico (owner_id null)
    model_demo = models_dir / "m_demo.json"
    with open(model_demo, "w", encoding="utf-8") as f:
        json.dump({"id": "m_demo", "name": "demo",
                   "owner_id": None, "nodes": [], "elements": [],
                   "loads": [], "constraints": []}, f)

    stats = delete_user_cascade(user_id=user_id)

    assert stats["models_deleted"] == 1, (
        f"atteso 1 modello (utente target), stats: {stats}"
    )
    assert not model_user.exists()
    assert model_other.exists()
    assert model_demo.exists()


# ── Test 2 · Audit log anonymize ──────────────────────────────────────────


def test_cascade_anonymizes_audit_log(
    client: TestClient, auth_token: tuple[str, str], tmp_path: Path, monkeypatch,
):
    """Cascade sostituisce user_id con hash nell'audit log, NON elimina entry."""
    import audit.log as audit_log_module
    from auth.cascade_delete import delete_user_cascade

    _, user_id = auth_token
    audit_file = tmp_path / "audit.jsonl"
    monkeypatch.setattr(audit_log_module, "AUDIT_LOG_FILE", str(audit_file))

    # Scrivi 3 entry: 2 dell'utente target + 1 di altro
    with open(audit_file, "w", encoding="utf-8") as f:
        f.write(json.dumps({"user_id": user_id, "action": "login"}) + "\n")
        f.write(json.dumps({"user_id": user_id, "action": "create_model"}) + "\n")
        f.write(json.dumps({"user_id": "other_uid", "action": "login"}) + "\n")

    stats = delete_user_cascade(user_id=user_id)

    assert stats["audit_entries_anonymized"] == 2

    # Verifica contenuto post-anonymize
    with open(audit_file, encoding="utf-8") as f:
        lines = [json.loads(line) for line in f if line.strip()]

    # Tutte e 3 le entry esistono ancora (no cancellazione)
    assert len(lines) == 3
    # user_id originale non appare più
    raw = "\n".join(json.dumps(e) for e in lines)
    assert user_id not in raw
    # other_uid è preservato
    assert "other_uid" in raw
    # Le 2 entry anonymized hanno il flag e replacement hash
    anonymized = [e for e in lines if e.get("anonymized")]
    assert len(anonymized) == 2
    assert anonymized[0]["user_id"] == stats["user_id_hash"]


# ── Test 3 · Billing records ──────────────────────────────────────────────


def test_cascade_deletes_billing_records(
    client: TestClient, auth_token: tuple[str, str], tmp_path: Path, monkeypatch,
):
    """Cascade elimina i billing records dell'utente, lascia gli altri."""
    import billing.storage as billing_storage_module
    from auth.cascade_delete import delete_user_cascade

    _, user_id = auth_token
    billing_file = tmp_path / "billing.json"
    monkeypatch.setattr(billing_storage_module, "BILLING_FILE", str(billing_file))

    # Pre-popola 2 record utente target + 1 record altro utente
    with open(billing_file, "w", encoding="utf-8") as f:
        json.dump({
            user_id: [
                {"amount": 100, "currency": "EUR", "ts": "2026-01-01"},
                {"amount": 50, "currency": "EUR", "ts": "2026-02-01"},
            ],
            "other_uid": [{"amount": 99, "currency": "USD"}],
        }, f)

    stats = delete_user_cascade(user_id=user_id)

    assert stats["billing_records_deleted"] == 2

    # Verifica contenuto post-delete
    with open(billing_file, encoding="utf-8") as f:
        data = json.load(f)

    assert user_id not in data
    assert "other_uid" in data
    assert data["other_uid"][0]["amount"] == 99
