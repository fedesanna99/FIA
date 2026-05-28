"""Test backend per i fix audit v3.1.1/v3.1.2 sui /api/models.

Copre:
  - L2-1 + L2-4: POST /api/models/from-template/{id} con auth, deep copy,
                  owner_id corretto, no mutazione del template
  - L2-4:        list_all ordering desc per updated_at
  - L2-4:        save_model touch automatico di created_at/updated_at
  - L2-13:       regex strict ^ex_[a-z0-9_]+$ contro path traversal

v3.1.2 audit-fix L2-5: zero test backend per i nuovi endpoint era un
P1 dell'audit. Questo file lo chiude.
"""
from __future__ import annotations

import time

import pytest
from fastapi.testclient import TestClient

from main import app
from auth import create_access_token
from auth.users_db import get_users_db
import storage


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture
def auth_token() -> str:
    """Crea un utente test al volo e ritorna un JWT bearer valido."""
    db = get_users_db()
    email = f"audit_test_{int(time.time()*1000)}@example.com"
    # hash bcrypt costoso ma siamo in test, ok
    from auth import hash_password
    user = db.register(email, hash_password("Password123!"))
    return create_access_token(user.id, extra_claims={"email": user.email})


def test_from_template_requires_auth(client):
    """v3.1.2 L2-4: senza Bearer token → 401/403 (no anonymous clone)."""
    r = client.post("/api/models/from-template/ex_simple_beam_2d")
    assert r.status_code in (401, 403)


def test_from_template_rejects_non_ex_prefix(client, auth_token):
    """v3.1.1 L2-1: solo ID `ex_*` accettati (regex strict v3.1.2 L2-13)."""
    r = client.post(
        "/api/models/from-template/random_user_model_id",
        headers={"Authorization": f"Bearer {auth_token}"},
    )
    assert r.status_code == 400


def test_from_template_rejects_path_traversal(client, auth_token):
    """v3.1.2 L2-13: regex blocca attacchi di tipo `ex_../etc`."""
    r = client.post(
        "/api/models/from-template/ex_..%2Fetc",
        headers={"Authorization": f"Bearer {auth_token}"},
    )
    # Può essere 400 (regex fail) o 404 (id non esistente dopo url-decode)
    assert r.status_code in (400, 404)


def test_from_template_404_on_unknown_id(client, auth_token):
    """Template inesistente → 404 (no silent fallback)."""
    r = client.post(
        "/api/models/from-template/ex_does_not_exist_xyz",
        headers={"Authorization": f"Bearer {auth_token}"},
    )
    assert r.status_code == 404


def test_from_template_deep_copy_no_mutation(client, auth_token):
    """v3.1.1 L2-1 (P0): edit del clone NON tocca il template originale."""
    tpl_id = "ex_simple_beam_2d"
    # 1. snapshot del template
    tpl_before = client.get(f"/api/models/{tpl_id}")
    assert tpl_before.status_code == 200
    n_nodes_before = len(tpl_before.json()["nodes"])

    # 2. clona via from-template
    r = client.post(
        f"/api/models/from-template/{tpl_id}",
        headers={"Authorization": f"Bearer {auth_token}"},
    )
    assert r.status_code == 200
    clone = r.json()
    assert clone["id"] != tpl_id, "Clone deve avere ID nuovo"
    assert clone["owner_id"], "Clone deve avere owner_id valorizzato"

    # 3. modifica il clone (aggiunge un nodo)
    new_node = {"id": 999, "x": 99.0, "y": 99.0, "z": 0.0}
    rn = client.post(
        f"/api/models/{clone['id']}/nodes",
        json=new_node,
        headers={"Authorization": f"Bearer {auth_token}"},
    )
    assert rn.status_code == 200

    # 4. verifica che il template NON sia stato mutato (cross-user safety)
    tpl_after = client.get(f"/api/models/{tpl_id}")
    assert tpl_after.status_code == 200
    n_nodes_after = len(tpl_after.json()["nodes"])
    assert n_nodes_after == n_nodes_before, (
        f"Template {tpl_id} mutato! nodi prima={n_nodes_before}, dopo={n_nodes_after}. "
        "Cross-user contamination — bug P0 L2-1."
    )


def test_save_model_touches_timestamps():
    """v3.1.1 L2-4: storage.save_model popola created_at + updated_at."""
    from schemas import FEAModel

    m = FEAModel(id=storage.new_id(), name="audit-fix-ts-test")
    saved = storage.save_model(m)
    assert saved.created_at is not None
    assert saved.updated_at is not None
    # ISO 8601 con timezone
    assert "T" in saved.created_at
    # Cleanup
    storage.delete_model(saved.id)


def test_save_model_updated_at_advances():
    """v3.1.1 L2-4: ogni save successivo aggiorna updated_at, preserva created_at."""
    from schemas import FEAModel

    m = FEAModel(id=storage.new_id(), name="audit-fix-ts-advance")
    saved1 = storage.save_model(m)
    created = saved1.created_at
    updated1 = saved1.updated_at

    # Sleep minimal per cambio timestamp (datetime.now ha sub-microsecond
    # granularity ma per sicurezza forziamo)
    time.sleep(0.01)
    saved1.name = "renamed"
    saved2 = storage.save_model(saved1)

    assert saved2.created_at == created, "created_at deve restare invariato"
    assert saved2.updated_at > updated1, "updated_at deve crescere su ogni save"

    storage.delete_model(saved2.id)


def test_list_all_orders_by_updated_at_desc(client):
    """v3.1.1 L2-4: GET /api/models/ ritorna lista ordinata desc."""
    r = client.get("/api/models/")
    assert r.status_code == 200
    data = r.json()
    # Estrai i timestamps non-null in ordine
    ts = [m.get("updated_at") for m in data if m.get("updated_at")]
    assert ts == sorted(ts, reverse=True), (
        "Lista modelli NON ordinata per updated_at desc. "
        "Audit L2-4: ordering broken."
    )
