"""Migration idempotente v2.4.6: aggiunge `owner_id: null` ai modelli esistenti.

Uso:
    python backend/scripts/migrate_models_add_owner_id.py            # dry-run
    python backend/scripts/migrate_models_add_owner_id.py --apply    # scrive

Scansiona `backend/data/models/*.json` ricorsivamente. Per ogni file che
NON contiene `owner_id` come campo top-level (nuovo schema FEAModel
v2.4.6 #22bis), aggiunge `"owner_id": null`. Idempotente: file già
migrati vengono saltati.

NOTA: i modelli pre-esistenti sono esempi pubblici senza proprietario;
`owner_id=null` significa "modello demo/condiviso", non rompe GDPR
cascade (che cerca per `owner_id == <user>`).
"""
from __future__ import annotations

import json
import sys
from pathlib import Path


def migrate(dry_run: bool = True, models_dir: Path | None = None) -> tuple[int, int]:
    """Esegue (o simula con dry-run) la migration.

    Returns:
        (migrated_count, already_ok_count)
    """
    if models_dir is None:
        models_dir = Path(__file__).resolve().parent.parent / "data" / "models"

    if not models_dir.exists():
        print(f"Directory {models_dir} non esiste — niente da migrare.")
        return 0, 0

    migrated = 0
    skipped = 0

    for f in models_dir.rglob("*.json"):
        try:
            with open(f, encoding="utf-8") as fp:
                data = json.load(fp)
        except (json.JSONDecodeError, OSError) as e:
            print(f"SKIP {f}: {e}")
            continue

        if "owner_id" in data:
            skipped += 1
            continue

        data["owner_id"] = None

        if not dry_run:
            with open(f, "w", encoding="utf-8") as fp:
                json.dump(data, fp, indent=2)

        migrated += 1
        print(f"{'MIGRATE' if not dry_run else 'WOULD-MIGRATE'} {f.name}")

    print(f"\nMigrati: {migrated}, già OK: {skipped}")
    if dry_run:
        print("(dry-run — esegui con --apply per scrivere)")
    return migrated, skipped


if __name__ == "__main__":
    is_apply = "--apply" in sys.argv
    migrate(dry_run=not is_apply)
