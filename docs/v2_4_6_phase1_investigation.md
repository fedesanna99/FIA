# v2.4.6 · Phase 1 — Investigation 4 stub GDPR cascade

**Data**: 2026-05-24
**Sprint**: `v2.4.6-debt-22bis-gdpr-cascade` (Sprint 1 di compound v2.4.x)
**Phase**: 1 di 4 — investigation only

## Stato attuale di `backend/auth/cascade_delete.py`

I 4 stub esistenti che ritornano 0:

| Step | File / chiamata attuale | Stato | Fix Phase 2 |
|---|---|---|---|
| 1 · Modelli per `owner_id` | non implementato (modelli senza ownership) | STUB | Schema `FEAModel.owner_id` (additivo) + sweep filesystem |
| 2 · Snapshot | non implementato (`backend/snapshots/` non esiste) | STUB → resta 0 | Stub esplicito (feature non implementata server-side) |
| 3 · Jobs | `job_store.delete_for_user(user_id)` SYNC, funzionante | OK | NESSUNO (già funzionante) |
| 4 · Billing | `stats["billing_records_deleted"] = 0` hard-coded | STUB | Creare `backend/billing/storage.py` |
| 5 · Account auth | `get_users_db().delete(user_id)` SYNC, funzionante | OK | NESSUNO |
| 6 · Audit log | `stats["audit_entries_anonymized"] = 0` hard-coded | STUB | Creare `backend/audit/log.py` |

## Moduli da creare

- **`backend/billing/storage.py`** (nuovo, ~50 righe): file JSON-based, `delete_user_billing/get_user_billing/add_user_billing`.
  - `backend/billing/__init__.py` esiste già (modulo billing presente con altri file).
- **`backend/audit/log.py`** (nuovo, ~70 righe): JSONL append-only + `anonymize_user_audit(user_id, replacement_hash)`. Per GDPR Art. 17 non eliminiamo, sostituiamo con hash.
  - `backend/audit/__init__.py` NON esiste — va creato per rendere pacchetto importabile.

## Schema FEAModel

`backend/schemas/model.py:109-118` `FEAModel`:
- Campi attuali: `id`, `name`, `description`, `units`, `is_3d`, `nodes`, `elements`, `loads`, `constraints`.
- **No `owner_id`**. Aggiungerlo come `Optional[str] = None` mantiene backward compat (deserializza JSON esistenti senza il campo).

Brief originale parla di `ModelMetadata` ma nel codebase reale il modello è
flat (no sub-dict `metadata`). Il campo `owner_id` va direttamente in
`FEAModel`. Lo `storage.save_model` serializza l'intero modello come JSON.

## Storage modelli

`backend/storage.py` salva `FEAModel.model_dump_json()` in `backend/data/models/<id>.json`. **Nessun campo `metadata` intermedio** nei JSON esistenti.

## Migration

10 modelli esistenti in `backend/data/models/`:
- `ex_*.json` (9 esempi pre-popolati senza owner)
- `7432fbbb.json` (1 modello demo)

Migration retroattiva: aggiungere `owner_id: null` a tutti (sono demo
pubblici, no proprietario reale). Sotto la soglia STOP rule 100 modelli.

## Snapshot

Cercato in:
- `backend/snapshots/`: **non esiste**
- `backend/schemas/`: nessun riferimento a Snapshot
- Solo riferimenti in:
  - `core/solver/nonlinear_solver.py` (snapshot iterativi, in-memory)
  - `services/self_ping.py`, `meteo/types.py` (snapshot dati esterni, no user data)

→ Feature snapshot non è implementata server-side. Lo stub `snapshots_deleted=0` è semanticamente corretto. Lo manteniamo esplicito nel codice con commento di rinvio futuro.

## Endpoint che producono modelli

`backend/api/routes/models.py`:
- `POST /` (create), `POST /import`, `POST /{id}/duplicate`, `PUT /{id}`, `PATCH /{id}`
- `_append_mesh()` chiamato da vari mesh endpoint
- Tutti chiamano `storage.save_model(...)`

Per popolare `owner_id` al create/update, il pattern minimo è:
- Identificare il `current_user` via dependency (se l'endpoint ha auth)
- Popolare `payload.owner_id = current_user.id` prima del save

**Realtà del codebase**: gli endpoint models attuali **non hanno dependency
auth**. Pattern auth in altri router (es. `backend/api/routes/auth.py`):
usano `Depends(get_current_user)`. Per non rompere endpoint pubblici demo,
**rendiamo l'auth opzionale**: se l'utente è autenticato, popola
`owner_id`; altrimenti resta `None` (modello "anonimo/condiviso").

## Risk/scope

- **Schema additivo `owner_id: Optional[str] = None`** → no rottura backward.
- Migration 10 file → ben sotto soglia STOP (100).
- Snapshot stub permane (feature non esiste).
- Test esistente `tests/auth/test_delete_account_gdpr.py` asserta `snapshots_deleted == 0` → resta valido.
- Jobs + user_delete già funzionanti → non toccare.

## Strategia fix

1. **S1.T2**: `backend/billing/storage.py` (sync, no async — coerente con cascade attuale)
2. **S1.T3**: `backend/audit/__init__.py` + `backend/audit/log.py` (sync)
3. **S1.T4**: Schema `FEAModel.owner_id: Optional[str] = None`
4. **S1.T5**: Script migration dry-run/apply
5. **S1.T6**: Auth opzionale negli endpoint `POST /models`, `PUT /models/{id}` (Depends opzionale, popola owner_id se autenticato)
6. **S1.T7**: `_delete_user_models(user_id)` sweep filesystem
7. **S1.T8**: snapshot stub esplicito con comment
8. **S1.T9**: refactor `delete_user_cascade` con i nuovi moduli
9. **S1.T10**: test regressione (3 nuovi)

## Discrepanze brief → realtà del codebase (documentate)

| Brief | Codebase reale | Adottato |
|---|---|---|
| `await ... delete_user_billing` | Cascade è SYNC | Implemento sync per coerenza |
| `await UsersDB.delete(user_id)` | `get_users_db().delete(user_id)` sync | Mantengo pattern esistente |
| `ModelMetadata` con `owner_id` | Schema flat, no `metadata` | `FEAModel.owner_id` direttamente |
| Snapshot esiste come feature | Non implementata server-side | Stub esplicito `=0` con TODO |
| Test `monkeypatch.setattr("backend.audit.log...")` | Modulo importato come `audit.log` (no `backend.` prefisso, `backend` è sul `sys.path`) | Patch con stringa corretta |
