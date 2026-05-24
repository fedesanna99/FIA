# v2.4.6-debt-22bis-gdpr-cascade · Closure report

**Data**: 2026-05-24
**Branch**: test
**Tipo**: bugfix legal completion (Sprint 1 di compound `v2.4.x-debt-and-coverage`)
**Bug chiuso**: #22bis (GDPR Art. 17 cascade incomplete)

---

## Sintesi

Sostituiti i 4 stub di `auth/cascade_delete.py` con implementazione reale:
- **Models**: cascade per `FEAModel.owner_id` (schema additivo + migration retroattiva 10 modelli)
- **Billing**: nuovo modulo `billing/storage.py` JSON file-based
- **Audit log**: nuovo modulo `audit/log.py` con anonimizzazione (no cancellazione, sostituisce `user_id` con hash SHA-256 troncato)
- **Snapshots**: stub esplicito (feature server-side non implementata, documentato)

`DELETE /api/auth/me` ora è GDPR Art. 17 compliant per tutti i domini implementati.

---

## Task completati

| Task | Output | Esito |
|---|---|---|
| S1.T1 · Investigation | `docs/v2_4_6_phase1_investigation.md` | ✅ |
| S1.T2 · `billing/storage.py` | nuovo modulo, ~50 righe sync | ✅ |
| S1.T3 · `audit/log.py` + `__init__.py` | nuovi moduli, ~70 righe sync | ✅ |
| S1.T4 · `FEAModel.owner_id` schema | additivo `Optional[str] = None` | ✅ |
| S1.T5 · Migration retroattiva | `scripts/migrate_models_add_owner_id.py`, 10 modelli migrati | ✅ |
| S1.T6 · Populate `owner_id` POST/PUT | `Depends(get_current_user_optional)` su 4 endpoint | ✅ |
| S1.T7 · `_delete_user_models` sweep | filesystem-based by `owner_id` | ✅ |
| S1.T8 · Snapshot stub esplicito | `_delete_user_snapshots` documenta limite | ✅ |
| S1.T9 · Refactor `delete_user_cascade` | 4 stub sostituiti, ordine deliberato | ✅ |
| S1.T10 · 3 test regressione | 7/7 PASS (3 nuovi + 4 esistenti) | ✅ |

---

## File toccati

| File | Stato | Righe (+/-) |
|---|---|---|
| `backend/billing/storage.py` | nuovo | +59 |
| `backend/audit/__init__.py` | nuovo | +3 |
| `backend/audit/log.py` | nuovo | +75 |
| `backend/schemas/model.py` | modified | +4 / -0 (campo additivo) |
| `backend/scripts/migrate_models_add_owner_id.py` | nuovo | +69 |
| `backend/api/routes/models.py` | modified | +24 / -7 |
| `backend/auth/cascade_delete.py` | refactor | +130 / -45 |
| `backend/tests/auth/test_cascade_delete_complete.py` | nuovo | +172 |
| `docs/v2_4_6_phase1_investigation.md` | nuovo | report |
| `docs/v2_4_6_debt_22bis_gdpr_cascade_report.md` | nuovo | questo report |
| `BACKLOG.md` | modified | #22bis → CHIUSO |

---

## Quality gates

- **pytest backend**: 1452 PASS (era 1449 baseline v2.4.5, **+3 nuovi**)
- **FAIL pre-esistenti**: 9 invariati (1 estimator + 1 elevation + 7 pushover)
- **4 test #22 originali GDPR base**: invariati (PASS)
- **3 nuovi test #22bis cascade complete**: 3/3 PASS
- **Migration dry-run → apply**: 10 modelli demo migrati, idempotente (re-run dry-run dà 0/10)

Frontend non toccato in questo sprint (no `.ts`/`.tsx`).

---

## Comportamento BEFORE / AFTER

### Endpoint `DELETE /api/auth/me`

| Step | Pre v2.4.6 | Post v2.4.6 |
|---|---|---|
| Models | non scansionati (no `owner_id`) | sweep filesystem by `owner_id` |
| Snapshots | stub `=0` opaco | stub `=0` esplicito (feature non implementata, documentato in funzione) |
| Jobs | OK (`job_store.delete_for_user`) | invariato |
| Billing | hard-coded `=0` | `billing.storage.delete_user_billing` reale |
| Audit log | hard-coded `=0` | `audit.log.anonymize_user_audit` reale (no cancellazione, sostituisce `user_id` con hash) |
| User auth | `users_db.delete()` | invariato |

### Schema FEAModel

Pre: nessun `owner_id`. Post: `owner_id: Optional[str] = None` (default `None` per modelli demo pubblici).

Migration retroattiva applicata a 10 file `data/models/ex_*.json` + `7432fbbb.json` (tutti `owner_id=null` perché sono demo pre-popolati senza proprietario reale).

---

## Backward compatibility

- **API endpoints `POST /api/models/`, `PUT /api/models/{id}`, `POST /api/models/import`, `POST /api/models/{id}/duplicate`**: header `Authorization` ora **opzionale**. Se presente e valido → `owner_id` popolato. Se assente → `owner_id=null` (modello "anonimo/demo"). Nessuna richiesta esistente fallisce.
- **Schema `FEAModel`**: campo `owner_id` `Optional`, default `None`. JSON serializzati pre-v2.4.6 deserializzano correttamente (pydantic accetta campi mancanti con default).
- **Cascade `stats` dictionary keys**: invariate (`models_deleted`, `snapshots_deleted`, `jobs_deleted`, `billing_records_deleted`, `audit_entries_anonymized`, `user_deleted`, `user_id_hash`, `deleted_at`).
- **Frontend**: zero modifiche (campo `owner_id` opzionale lato API, nessun client lo richiedeva).

---

## Modifiche UI extra-scope (Policy C)

Nessuna. Sprint 1 è puramente backend.

---

## Discrepanze brief → realtà del codebase

(Documentate in `docs/v2_4_6_phase1_investigation.md` sezione "Discrepanze".)

- Cascade è SYNC nel codebase corrente, non async. Adottato sync per coerenza.
- `UsersDB.delete` è `get_users_db().delete()` instance method, non classmethod async.
- Schema FEAModel è flat (no `metadata` sub-dict). `owner_id` aggiunto direttamente al FEAModel.
- Feature snapshot server-side non esiste — stub mantenuto esplicito.

---

## Prossimo passo (Compound Sprint 2)

`v2.4.7-pushover-diagnostic`: investigation only sui 7 test pushover pre-esistenti FAIL nei 9 baseline.
