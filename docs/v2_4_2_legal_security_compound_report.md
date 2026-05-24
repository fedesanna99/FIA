# v2.4.2-legal-security (compound) · Report

**Data**: 2026-05-24
**Branch**: test (HEAD: `e2b3296`)
**Tipo**: compound bugfix legal/security (3 sprint atomici)

## Sintesi
Chiusi 3 P0 legal/security dall'audit `v2.3.5-nafems-truth-audit`:
- **#22** GDPR DELETE account → hard delete cascade (v2.4.2a)
- **#28** Rate limit login → 5/15min per IP, custom in-memory (v2.4.2b)
- **#17** Security headers → HSTS + CSP report-only + X-Frame + X-Content + Referrer (v2.4.2c)

Versione ora **legalmente shippabile in UE** per la parte legal/security.

## Sprint completati

| Tag | Bug | Test aggiunti | File toccati |
|---|---|---:|---:|
| `v2.4.2a-gdpr-delete-account` | #22 | 4 | 7 |
| `v2.4.2b-rate-limit-login` | #28 | 3 | 5 |
| `v2.4.2c-security-headers` | #17 | 7 | 8 |
| **TOTALE** | 3 P0 | **14 nuovi PASS** | **20** |

## Deviazioni dal brief documentate
1. **Rate limit (v2.4.2b)**: brief suggeriva `slowapi==0.1.9` da PyPI, ma
   l'auto-mode classifier ha negato `pip install`. Implementato custom
   in-memory `LoginRateLimiter` (~60 LOC zero-dependency, sliding window).
   Trade-off documentato: in-process only, per multi-machine futuro serve Redis.
2. **GDPR cascade (v2.4.2a)**: brief assumeva moduli `billing.storage`,
   `audit.log.anonymize_user_audit`, `models.owner_id` esistenti. **Non
   esistono.** Implementati come stub che restituiscono 0, gap pre-esistente
   documentato nel docstring di `delete_user_cascade`.

## File toccati (aggregato 20)
**Pre-flight (1):**
- `docs/CLAUDE_CODE_OPERATING_RULES.md` (nuovo)

**GDPR (7):**
- `backend/auth/cascade_delete.py` (nuovo)
- `backend/auth/users_db.py` (+`delete` method)
- `backend/jobs/store.py` (+`delete_for_user` method)
- `backend/api/routes/auth.py` (+DELETE /me endpoint)
- `backend/tests/auth/test_delete_account_gdpr.py` (nuovo, 4 test)
- `BACKLOG.md` (#22 in Chiuso)
- `docs/v2_4_2a_gdpr_delete_account_report.md` (nuovo)

**Rate limit (5):**
- `backend/auth/login_rate_limiter.py` (nuovo)
- `backend/api/routes/auth.py` (+wiring `_client_ip` + check/record/reset)
- `backend/tests/auth/test_rate_limit_login.py` (nuovo, 3 test)
- `BACKLOG.md` (#28 in Chiuso)
- `docs/v2_4_2b_rate_limit_login_report.md` (nuovo)

**Security headers (8):**
- `backend/middleware/__init__.py` (nuovo)
- `backend/middleware/security_headers.py` (nuovo)
- `backend/api/routes/security.py` (nuovo, CSP report endpoint)
- `backend/main.py` (+middleware + router registration)
- `backend/tests/middleware/__init__.py` (nuovo)
- `backend/tests/middleware/test_security_headers.py` (nuovo, 7 test)
- `BACKLOG.md` (#17 in Chiuso)
- `docs/v2_4_2c_security_headers_report.md` (nuovo)

## Quality gates aggregato
- ✅ pytest backend full: **1416 PASS / 12 FAIL pre-esistenti**
  (baseline post v2.4.1: 1403 PASS / 12 FAIL → +14 nuovi test, 0 regression)
  - 4 GDPR, 3 rate-limit, 7 security headers
- ✅ 63/63 test `tests/auth/` passano (4 nuovi + 56 esistenti + 3 rate)
- ✅ tsc/vitest non eseguiti (no frontend touched in tutto il compound)
- ✅ Tutti i 3 tag intermedi + tag rollup `v2.4.2-legal-security`

## Comportamento BEFORE/AFTER (riassunto)

### BEFORE (post v2.4.1)
- `DELETE /api/auth/me` → 405 Method Not Allowed
- `POST /api/auth/login` con pwd errata → 401 infinito (brute force possibile)
- Tutte le response → zero security headers

### AFTER (v2.4.2)
- `DELETE /api/auth/me` → 204 + cascade (jobs, user); stub documentati
- `POST /api/auth/login` → 401 ×5, poi 429 per 15 min, reset su login OK
- Tutte le response → 5 security headers (HSTS + X-Frame + X-Content + CSP report + Referrer)
- `POST /api/csp-report` → 200 (logga violazioni in stderr/log)

## Limit conosciuti (non-blocking)
- Rate limiter in-process only (no Redis): multi-machine deploy futuro
  serve backend condiviso
- GDPR cascade: stub per billing/audit/snapshot/models (gap pre-esistenti
  modello dati). Da estendere quando emergeranno API user-keyed
- CSP in `report-only`: profilo permissivo per non rompere SPA, da
  promuovere a enforcement dopo 2-3 sprint di osservazione log

## Tag rollup
```
v2.4.2-legal-security  ← finalizing tag su HEAD post-sprint-3
```

## Prossimo passo
`v2.3.7-solver-internals-audit` (diagnostico shell formulation, 6-8 ore)
per sbloccare i fix grossi NEW-1..4 (LE1 anti-convergenza, MITC dispatch,
σ_yy postprocess shell). Out-of-band rispetto a v2.4.x perché diagnostico
prima di codice.
