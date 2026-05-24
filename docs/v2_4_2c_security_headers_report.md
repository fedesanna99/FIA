# v2.4.2c-security-headers · Report

**Data**: 2026-05-24
**Branch**: test
**Tipo**: bugfix security (sprint 3 di 3 del compound v2.4.2-legal-security)

## Sintesi
Chiuso bug #17 (P0 security). Tutte le risposte HTTP ora includono 5
security headers (HSTS + X-Frame + X-Content-Type + CSP report-only +
Referrer-Policy). Endpoint CSP report registra violazioni.

## Task completati
- **S3.T1**: middleware `SecurityHeadersMiddleware` (Starlette-based,
  zero dependency aggiuntive)
- **S3.T2**: endpoint `POST /api/csp-report` per ricezione violazioni
  CSP, logging via `logging.warning("csp-violations")`
- **S3.T3**: 7 test regressione (5 header + 2 endpoint CSP report)

## File toccati
- `backend/middleware/__init__.py` (nuovo, package marker)
- `backend/middleware/security_headers.py` (nuovo, 55 righe)
- `backend/api/routes/security.py` (nuovo, 30 righe)
- `backend/main.py` (+5 righe: import + middleware + router)
- `backend/tests/middleware/__init__.py` (nuovo)
- `backend/tests/middleware/test_security_headers.py` (nuovo, 67 righe)
- `BACKLOG.md` (#17 in Chiuso)

## Quality gates
- ✅ 7/7 nuovi test PASS (3.30s)
- ✅ Baseline pytest invariata (12 FAIL pre-esistenti, count uguale)
- ✅ tsc + vitest non eseguiti (no frontend touched)

## Comportamento BEFORE/AFTER

### BEFORE
```
GET /api/health  →  200
Headers di sicurezza nelle risposte: nessuno
```

### AFTER
```
GET /api/health  →  200
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Content-Security-Policy-Report-Only: default-src 'self'; ... report-uri /api/csp-report
Referrer-Policy: strict-origin-when-cross-origin
```

## Note di design

### CSP report-only first
Profilo CSP relativamente permissivo (`'unsafe-inline'` + `'unsafe-eval'`
necessari per la SPA Vite + Tailwind inline). Modalità `report-only` per
2-3 sprint: raccoglie violazioni reali via `POST /api/csp-report`,
permette di restringere il profilo poi passare a enforcement.

### Ordine middleware
`SecurityHeadersMiddleware` aggiunto PRIMA di CORS in `main.py`. Starlette
esegue i middleware LIFO (ultimo aggiunto = più esterno), quindi gli
header arrivano al client dopo che CORS ha già processato le richieste.

### Frame-ancestors 'none'
Più stretto di `X-Frame-Options: DENY` (CSP-level), entrambi presenti
per max compatibility (alcuni browser legacy non supportano CSP).

## Prossimo passo (chiusura compound)
Tag rollup `v2.4.2-legal-security` + report aggregato compound.
