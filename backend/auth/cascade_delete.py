"""GDPR cascade delete: hard removal di tutti i dati personali utente.

NON usare salvo richiesta esplicita dell'utente (endpoint DELETE /me).
Irreversibile. Per compliance, mantiene un hash anonimo dell'avvenuta
cancellazione per dimostrarne l'effettività se richiesto.

Bug #22 (v2.3.5 audit, P0 legal GDPR Art. 17).
Bug #22bis (v2.4.6, completion dei 4 stub originari).
"""
from __future__ import annotations

import hashlib
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def _user_id_hash(user_id: str) -> str:
    """Hash anonimo SHA-256 troncato del user_id (per audit log post-delete)."""
    return hashlib.sha256(user_id.encode()).hexdigest()[:16]


def _delete_user_models(user_id: str) -> int:
    """v2.4.6 #22bis: elimina tutti i modelli con `owner_id == user_id`.

    Scansiona ``backend/data/models/*.json`` ricorsivamente, parsa il JSON
    (FEAModel top-level con campo `owner_id`), elimina i file di proprietà
    dell'utente. I modelli demo pubblici (`owner_id=null`) restano intatti.

    Tollera JSON corrotti e errori IO (li salta senza interrompere il
    cascade complessivo).
    """
    # Path consistente con backend/storage.py
    models_dir = Path(
        os.environ.get(
            "FEA_DATA_DIR",
            str(Path(__file__).resolve().parent.parent / "data" / "models"),
        )
    )
    if not models_dir.exists():
        return 0

    # Anche il singleton in-memory `_MODELS` di storage va aggiornato
    try:
        import storage  # type: ignore
        in_memory_index: dict[str, Any] = storage._MODELS  # noqa: SLF001
    except Exception:
        in_memory_index = {}

    deleted = 0
    for f in models_dir.rglob("*.json"):
        try:
            with open(f, encoding="utf-8") as fp:
                data = json.load(fp)
        except (json.JSONDecodeError, OSError):
            continue

        if data.get("owner_id") != user_id:
            continue

        try:
            f.unlink()
            deleted += 1
            mid = data.get("id")
            if mid and mid in in_memory_index:
                in_memory_index.pop(mid, None)
        except OSError:
            pass

    return deleted


def _delete_user_snapshots(user_id: str) -> int:
    """v2.4.6 #22bis: snapshot stub.

    Feature snapshot server-side **non implementata** nel codebase corrente
    (no `backend/snapshots/`, no schema Snapshot, no persistenza). Quando
    sarà introdotta, questa funzione va estesa a sweepare il relativo
    storage by `owner_id`.

    Per ora ritorna 0 in modo esplicito (semanticamente: l'utente non ha
    snapshot server-side da eliminare).
    """
    _ = user_id  # noqa: F841 — riservato per implementazione futura
    return 0


def delete_user_cascade(user_id: str) -> dict[str, Any]:
    """GDPR Art. 17 hard delete cascade. Irreversibile.

    Ordine deliberato (v2.4.6 #22bis):
        1. Modelli (filesystem sweep by owner_id) — NEW v2.4.6
        2. Snapshot (stub, feature non implementata) — NEW v2.4.6
        3. Jobs (JobStore SQLite)
        4. Billing records (file JSON) — NEW v2.4.6
        5. User auth record
        6. Audit log: anonimizzazione hash (ULTIMO, no cancellazione) — NEW v2.4.6

    Args:
        user_id: identifier dell'utente da eliminare.

    Returns:
        Statistiche dell'operazione: vedi keys nel dizionario `stats`.

    Raises:
        Nessuna eccezione catturata: errori in sotto-step bloccano l'intera
        operazione (DELETE /me ritorna 500), così l'utente sa che il cascade
        non è andato a buon fine.
    """
    stats: dict[str, Any] = {
        "user_id_hash": _user_id_hash(user_id),
        "deleted_at": datetime.now(timezone.utc).isoformat(),
        "models_deleted": 0,
        "snapshots_deleted": 0,
        "jobs_deleted": 0,
        "billing_records_deleted": 0,
        "audit_entries_anonymized": 0,
        "user_deleted": False,
    }

    # 1. Modelli (cerca per owner_id) — v2.4.6
    stats["models_deleted"] = _delete_user_models(user_id)

    # 2. Snapshot stub — v2.4.6
    stats["snapshots_deleted"] = _delete_user_snapshots(user_id)

    # 3. Jobs
    from jobs.store import job_store
    stats["jobs_deleted"] = job_store.delete_for_user(user_id)

    # 4. Billing — v2.4.6 (era stub hard-coded 0)
    from billing.storage import delete_user_billing
    stats["billing_records_deleted"] = delete_user_billing(user_id)

    # 5. User auth record (PER ULTIMO fra i dati derivati)
    from auth.users_db import get_users_db
    if get_users_db().delete(user_id):
        stats["user_deleted"] = True

    # 6. Audit log anonimizzazione (ULTIMO) — v2.4.6 (era stub hard-coded 0)
    from audit.log import anonymize_user_audit
    stats["audit_entries_anonymized"] = anonymize_user_audit(
        user_id=user_id,
        replacement_hash=stats["user_id_hash"],
    )

    return stats
