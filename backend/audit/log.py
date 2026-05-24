"""Audit log con anonimizzazione GDPR (v2.4.6).

File-based JSONL append-only. Per GDPR Art. 17 right-to-erasure
NON cancelliamo le entry (audit compliance), sostituiamo `user_id`
con hash anonimo (`anonymize_user_audit`).
"""
from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


# Default path. Overridable via monkeypatch per testing.
AUDIT_LOG_FILE: str = str(Path(__file__).resolve().parent.parent / "data" / "audit.jsonl")


def _ensure_dir() -> None:
    os.makedirs(os.path.dirname(AUDIT_LOG_FILE), exist_ok=True)


def write_audit_entry(
    user_id: str,
    action: str,
    ip: str | None = None,
    details: dict[str, Any] | None = None,
) -> None:
    """Append una singola entry al log (sync)."""
    _ensure_dir()
    entry: dict[str, Any] = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "user_id": user_id,
        "action": action,
        "ip": ip,
        "details": details,
    }
    with open(AUDIT_LOG_FILE, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry) + "\n")


def anonymize_user_audit(user_id: str, replacement_hash: str) -> int:
    """Anonimizza le entry dove `user_id` appare.

    Sostituisce `user_id` con `replacement_hash` e aggiunge il flag
    `"anonymized": true`. NON cancella le entry (audit log compliance).

    Returns:
        Numero di entry anonimizzate. 0 se il log non esiste o nessuna
        entry corrisponde a `user_id`.
    """
    if not os.path.exists(AUDIT_LOG_FILE):
        return 0

    count = 0
    lines_out: list[str] = []

    with open(AUDIT_LOG_FILE, encoding="utf-8") as f:
        for line in f:
            line = line.rstrip("\n")
            if not line:
                continue
            try:
                entry = json.loads(line)
                if entry.get("user_id") == user_id:
                    entry["user_id"] = replacement_hash
                    entry["anonymized"] = True
                    count += 1
                lines_out.append(json.dumps(entry))
            except json.JSONDecodeError:
                # Linea malformata: la preserviamo as-is per non perdere dati
                lines_out.append(line)

    if count > 0:
        with open(AUDIT_LOG_FILE, "w", encoding="utf-8") as f:
            f.write("\n".join(lines_out) + ("\n" if lines_out else ""))

    return count
