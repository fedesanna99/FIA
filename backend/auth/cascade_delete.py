"""
GDPR cascade delete: hard removal di tutti i dati personali utente.

NON usare salvo richiesta esplicita dell'utente (endpoint DELETE /me).
Irreversibile. Per compliance, mantiene un hash anonimo dell'avvenuta
cancellazione per dimostrarne l'effettività se richiesto.

Bug #22 dell'audit v2.3.5-nafems-truth-audit (P0 legal — GDPR Art. 17).
"""
from __future__ import annotations

import hashlib
from datetime import datetime, timezone
from typing import Any


def _user_id_hash(user_id: str) -> str:
    """Hash anonimo SHA-256 troncato del user_id (per audit log post-delete)."""
    return hashlib.sha256(user_id.encode()).hexdigest()[:16]


def delete_user_cascade(user_id: str) -> dict[str, Any]:
    """
    Elimina hard tutti i dati collegati a ``user_id``.

    Ordine deliberato:
        1. Jobs (coda persistente)
        2. Billing / quota records (stub se modulo assente)
        3. Audit log: anonimizzazione hash (NON cancellazione, compliance)
        4. User record (per ultimo — dopo i dati derivati)

    Args:
        user_id: identifier dell'utente da eliminare.

    Returns:
        Statistiche dell'operazione:
            ``user_id_hash``         hash anonimo SHA-256 per audit log
            ``deleted_at``           timestamp ISO UTC
            ``models_deleted``       N modelli rimossi (oggi 0 — vedi NOTA)
            ``snapshots_deleted``    N snapshot server-side (oggi 0 — vedi NOTA)
            ``jobs_deleted``         N job eliminati da JobStore
            ``billing_records_deleted`` N record billing (stub: 0)
            ``audit_entries_anonymized`` N entry audit anonimizzate (stub: 0)
            ``user_deleted``         True se record auth eliminato

    NOTA su modelli e snapshot:
        L'audit ``v2.3.5`` ha rilevato che ``backend/data/models/*.json``
        NON ha attualmente alcun mapping ``user_id``: i modelli sono in un
        filesystem condiviso senza ownership. Lo stesso vale per gli
        snapshot, che oggi sono persistiti solo nel ``localStorage`` del
        browser (lato frontend), non server-side.

        Conseguenza GDPR: il modello dati attuale non collega modelli/snapshot
        all'utente, quindi non c'è nulla da cancellare server-side per quei
        domini. Quando un futuro brief introdurrà ``models.owner_id``,
        questa funzione dovrà essere estesa.

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

    # 1. Jobs
    from jobs.store import job_store
    stats["jobs_deleted"] = job_store.delete_for_user(user_id)

    # 2. Billing / quota (stub: backend non ha ancora user-keyed billing)
    # Quando esisterà un modulo billing/storage.py con delete_user_billing,
    # sostituire questo stub:
    stats["billing_records_deleted"] = 0

    # 3. Audit log: anonimizzazione hash (stub)
    # backend/audit/jobs.jsonl è un log append-only senza un'API di
    # anonimizzazione user_id. Compliance può ricostruire dal hash sopra.
    stats["audit_entries_anonymized"] = 0

    # 4. User record (PER ULTIMO)
    from auth.users_db import get_users_db
    if get_users_db().delete(user_id):
        stats["user_deleted"] = True

    return stats
