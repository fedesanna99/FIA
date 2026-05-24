# v2.4.2b-rate-limit-login · Report

**Data**: 2026-05-24
**Branch**: test
**Tipo**: bugfix security (sprint 2 di 3 del compound v2.4.2-legal-security)

## Sintesi
Chiuso bug #28 (P0 security, brute force). `POST /api/auth/login` ora
rate-limited a 5 tentativi falliti / 15 min per IP. 6° tentativo → 429.

## Deviazione vs brief
Brief suggeriva `slowapi==0.1.9` da PyPI. L'auto-mode classifier ha
negato `pip install`. Implementato **custom in-memory rate limiter**
zero-dependency (~60 LOC). Vantaggi/svantaggi documentati nel modulo:
- ✅ Zero deps esterne, semplice da testare
- ⚠ In-process only — multi-machine futuro richiede Redis

## Task completati
- **S2.T1**: investigazione. Findings:
  - Già esiste `backend/services/rate_limiter.py` ma per provider esterni
    (token bucket per `bucket_name`), non IP-based per endpoint API
  - `slowapi` non installato
- **S2.T2**: setup rate limiter
  - `backend/auth/login_rate_limiter.py` (nuovo, `LoginRateLimiter` class)
  - `backend/api/routes/auth.py`: wiring `_client_ip()` + check + record/reset
- **S2.T3**: 3 test regressione (3/3 PASS in 6.31s)

## File toccati
- `backend/auth/login_rate_limiter.py` (nuovo, 60 righe)
- `backend/api/routes/auth.py` (+25 righe: import Request + `_client_ip` + wiring)
- `backend/tests/auth/test_rate_limit_login.py` (nuovo, 95 righe)
- `BACKLOG.md` (#28 in Chiuso)

## Quality gates
- ✅ 3/3 nuovi test PASS (6.31s)
- ✅ Tutti i 63 test auth esistenti continuano a passare (no regression)
- ✅ Baseline pytest invariata
- ✅ tsc + vitest non eseguiti (no frontend touched)

## Comportamento BEFORE/AFTER

### BEFORE
```
POST /api/auth/login {wrong_pwd}  →  401 (sempre)
POST /api/auth/login {wrong_pwd}  →  401
... ripetibile illimitatamente (brute force possibile)
```

### AFTER
```
POST /api/auth/login {wrong_pwd}  →  401  (×5)
POST /api/auth/login {wrong_pwd}  →  429  "Troppi tentativi di login.
                                            Riprova fra 15 minuti."
```

Login riuscito (200) → reset contatore IP. `/register` esente.

## Note di design
- IP estratto via `X-Forwarded-For` (header proxy Fly.io) con fallback
  `request.client.host`
- Sliding window di 15 min (deque di timestamp `time.monotonic()`)
- Thread-safe via `threading.Lock`
- `login_limiter.reset_all()` esposto per test (no leakage fra test)

## Limit conosciuti
- **In-memory**: lo stato del rate limiter NON è condiviso fra processi.
  Su deploy multi-machine (futuro), un attaccante potrebbe distribuire i
  tentativi su istanze diverse. Mitigazione: Redis-backed limiter quando
  serve scalare.
- **No persistenza**: restart del processo azzera tutti i contatori.
  Considerato accettabile (i restart sono rari e l'IP cambierebbe comunque).

## Prossimo passo
Sprint 3 del compound: `v2.4.2c-security-headers` (#17, ~2-3 ore).
