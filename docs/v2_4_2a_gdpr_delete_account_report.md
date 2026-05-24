# v2.4.2a-gdpr-delete-account · Report

**Data**: 2026-05-24
**Branch**: test
**Tipo**: bugfix legal (sprint 1 di 3 del compound v2.4.2-legal-security)

## Sintesi
Chiuso bug #22 (P0 legal, GDPR Art. 17). Endpoint `DELETE /api/auth/me`
con cascade deliberato (jobs → billing stub → audit anonymize stub → user).

## Task completati
- **S1.T1**: investigazione strutture dati utente. Findings:
  - `UsersDB` SQLite, no metodo `delete`
  - `JobStore` SQLite, no metodo `delete_for_user`
  - `backend/data/models/*.json` NO `owner_id` (gap pre-esistente)
  - Snapshot persistiti client-side localStorage (no server)
  - Billing/audit nessuna API user-keyed
- **S1.T2**: endpoint `DELETE /api/auth/me` → 204 No Content (require auth)
- **S1.T3**: `cascade_delete.delete_user_cascade(user_id)` con stats dict
- **S1.T4**: 4 test regressione (`test_delete_account_gdpr.py`)

## File toccati
- `backend/auth/users_db.py` (+10 righe: metodo `delete`)
- `backend/jobs/store.py` (+9 righe: metodo `delete_for_user`)
- `backend/auth/cascade_delete.py` (nuovo, 92 righe)
- `backend/api/routes/auth.py` (+18 righe: endpoint DELETE /me)
- `backend/tests/auth/test_delete_account_gdpr.py` (nuovo, 110 righe)
- `BACKLOG.md` (#22 in Chiuso)

## Quality gates
- ✅ 4/4 nuovi test PASS (5.06s)
- ✅ Baseline pytest invariata (verificato non-regression)
- ✅ tsc + vitest non eseguiti (no frontend touched, NA)

## Comportamento BEFORE/AFTER

### BEFORE
```
DELETE /api/auth/me  →  405 Method Not Allowed
GDPR Art. 17: NO compliance, utente non può cancellare proprio account.
```

### AFTER
```
DELETE /api/auth/me  →  204 No Content
Cascade:
  1. jobs.store.delete_for_user(user_id)        → N job eliminati
  2. billing: stub (modulo user-keyed non esiste ancora)
  3. audit log: stub (sostituibile quando API anonymize esisterà)
  4. users_db.delete(user_id)                   → user eliminato

Login successivo con stesse credentials → 401.
```

## Backward compatibility
- Nuovo endpoint, no breaking change su API esistente
- `UsersDB.delete()` e `JobStore.delete_for_user()` sono additivi
- Nessuna modifica a contract endpoint `GET /me`, `POST /login`, `POST /register`

## Gap pre-esistenti documentati (NON in scope sprint corrente)
- `backend/data/models/*.json` non ha mapping user → modelli condivisi a livello filesystem
- Snapshot persistenza solo `localStorage` browser (no server-side)
- Billing: no modulo `delete_user_billing` (stub: 0)
- Audit: no API `anonymize_user_audit` (stub: 0)

Quando un futuro brief introdurrà `models.owner_id` o billing user-keyed,
`cascade_delete.delete_user_cascade` dovrà essere esteso per chiudere
completamente la cascade.

## Prossimo passo
Sprint 2 del compound: `v2.4.2b-rate-limit-login` (#28, ~2-3 ore).
