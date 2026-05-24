# FEA Pro — Backlog tecnico

> Stato aggiornato: **2026-05-24** (post `v2.3.6-honesty-fix` da
> `v2.3.3-docs-sync` del 2026-05-23).
>
> ⚠ **BL-6 NAFEMS riaperto** post audit `v2.3.5-nafems-truth-audit`.
> Diversi bug strutturali identificati (shell formulation, postprocess,
> matrice singolare, EC2 staffe). Sprint `v2.4.x` in corso.
>
> Voci storiche chiuse nelle versioni post v1.0.0 sono nella sezione
> `## Chiuso (v1.x → v2.x)` in coda.

Voci **non bloccanti per v1.0.0**, già note e documentate. Vanno implementate prima
di promettere coperture su strutture tese, layered, non-lineari geometriche o iso-surfaces
3D. Ordine indicativo per priorità di valore strutturale; le complessità sono stime
in tempo "a regime" (codice + test + validazione contro caso analitico).

---

## 🔴 Alta priorità (sbloccano classi di problemi)

> Le voci alta priorità del backlog v1.0.0 erano state chiuse in v1.3 → v2.3,
> ma l'audit `v2.3.5-nafems-truth-audit` (2026-05-24) ha riaperto BL-6 e
> identificato 6 bug nuovi (NEW-1..6) sulla shell formulation e sul postprocess.

### BL-6-bis · NAFEMS LE1/LE10 enforcement tolerance ufficiale
**Stato**: riaperto post `v2.3.5-nafems-truth-audit` · **Complessità**: ~3-4 settimane

LE2 cylindrical cantilever, cantilever tip, cantilever modal, Euler buckling:
✅ PASS confermato (errore < 0.001%).

LE1 Elliptic membrane: ❌ FAIL
- Errore reale −32% (target ±5%)
- Tolerance test attuale ±400% (`SIGMA_TARGET/5 ≤ ≤ SIGMA_TARGET*5`)
- Anti-convergenza: mesh fine peggiora invece di migliorare

LE10 Thick plate: ❌ FAIL
- σ_yy(D) misurato 0.000 MPa (target −5.38 MPa, errore −100%)
- Test misurano max|uz| invece di σ_yy
- SHELL_Q4_MITC produce max|uz| = 0 (dispatch rotto su pressure load)

Fix in sprint `v2.4.2-shell-formulation`. Dettaglio bug:
`docs/nafems_truth_audit.md`.

### NEW-1 · LE1 anti-convergenza mesh fine
**Stato**: diagnosticato post `v2.3.7-solver-internals-audit` · **Complessità**: ~2-3 giorni

**Root cause primaria**: stress recovery valutato al **centroide** in
`backend/core/elements/shell_quad4.py:165` (Gauss point (0,0)). Raffinando
la mesh, il centroide si avvicina al punto D ma resta sempre offset
in una zona di gradient elevato (concentrazione di tensione al bordo del
foro). Lettura al centroide sottostima il picco nodale → errore cresce
da −32% (12×12) a −76% (20×20).

**Root cause secondaria**: load distribution in
`backend/tests/nafems/test_le1_elliptic_membrane.py::_build_le1`
applica solo ~85-90% del carico atteso (proiezione normali su nodi non
pesata per arc-length).

**File chiave**:
- `backend/core/elements/shell_quad4.py:153-200`
- `backend/core/elements/shell_quad4_mitc.py:224` (analoga)
- `backend/tests/nafems/test_le1_elliptic_membrane.py` (loads builder)

**Prossimo sprint**: `v2.4.3c-shell-stress-recovery-nodal`

Vedi `docs/solver_internals_audit.md` sezione 2 per dettaglio diagnostico.

### NEW-2 · SHELL_Q4 e SHELL_Q4_MITC identici su LE1
**Stato**: diagnosticato post `v2.3.7-solver-internals-audit` · **Severity**: NESSUNA (falso positivo)

**Diagnosi**: NON è un bug, è fisica corretta.

LE1 è una **membrana piana**: vincoli bloccano `w` e rotazioni su tutti i
nodi. Il contributo bending K_b è non significativo, solo K_m (membrana)
governa. `_membrane_stiffness()` è **identica** fra Q4 e MITC
(shell_quad4.py:56 ≡ shell_quad4_mitc.py:85), quindi i due element type
restituiscono lo stesso risultato — atteso e corretto.

Le formulazioni differiscono SOLO in `_bending_stiffness()` (MITC4 tying
points Bathe-Dvorkin vs Mindlin standard).

**Azione**: chiarire nel doc audit `v2.3.5`. Eventuale unit test
`test_le1_q4_and_mitc_must_agree_within_1pct()` per documentare
formalmente il comportamento atteso.

Vedi `docs/solver_internals_audit.md` sezione 3.

### NEW-3 · SHELL_Q4_MITC max|uz|=0 su LE10
**Stato**: diagnosticato post `v2.3.7-solver-internals-audit` · **Complessità**: ~1 ora · **Severity**: P1

**Root cause**: `backend/core/solver/assembler.py:244`

```python
if el.type == ElementType.SHELL_Q4:   # ← solo SHELL_Q4!
    A = inst._area()
    ...
# Nessun elif/branch per SHELL_Q4_MITC né SHELL_Q4_LAYERED
```

Per ogni elemento `SHELL_Q4_MITC` con `LoadType.PRESSURE`, il branch non
si attiva → `F` non riceve forze → `K·u=F=0` → `u=0` → `max|uz|=0`.

**Fix** (1 ora):
```python
if el.type in (ElementType.SHELL_Q4, ElementType.SHELL_Q4_MITC):
    ...
```

**Test regressione** (2 nuovi):
- LE10 con MITC: `max|uz|` ordine di grandezza atteso
- Q4 vs MITC su piastra sottile: MITC > Q4 (locking-free)

**Prossimo sprint**: `v2.4.3a-shell-pressure-mitc-fix`

Vedi `docs/solver_internals_audit.md` sezione 3.

### NEW-4 · Postprocess shell σ_y solo membrana, non bending
**Stato**: diagnosticato post `v2.3.7-solver-internals-audit` · **Complessità**: ~2-3 giorni · **Severity**: P1

**Root cause confermato a riga**: `backend/core/elements/shell_quad4.py:156`

```python
u_membrane = np.array([u_local[6 * i + j] for i in range(4) for j in range(2)])
# i in [0..3]: nodi  ·  j in [0,1]: solo ux, uy
# uz, theta_x, theta_y, theta_z mai usati
```

Lo stesso pattern in `shell_quad4_mitc.py:224`.

**Verifica empirica** (`scripts/le10_stress_diagnostics.py`):
- `max|uz| = 6.4 mm`, `max|rx| = 2.8e-3 rad`, `max|ry| = 3.0e-3 rad`
  → rotazioni esistono, solver calcola bending correttamente
- `sigma_x = sigma_y = tau_xy = 0` per ogni elemento → postprocess ignora bending

**Schema gap**: `backend/schemas/results.py::ElementStress` non ha campi
`sigma_*_top`, `sigma_*_bot`, `M_x`, `M_y`, `M_xy`. Architetturalmente non
c'è dove mettere il bending stress.

**Fix** (~2-3 giorni):
1. Estendere `ElementStress` con campi opzionali bending
2. Estendere `ShellQuad4.stresses()` per estrarre rotazioni → curvature
   → momenti → stress fibra estrema
3. Idem per `ShellQuad4MITC.stresses()`
4. Test parametrico LE10 con target NAFEMS

**Prossimo sprint**: `v2.4.3b-shell-bending-stress-recovery`

Vedi `docs/solver_internals_audit.md` sezione 4.

### NEW-5 · Helper assert_within_nafems_tolerance mai chiamato
**Stato**: code smell P2 · **Complessità**: ~30 minuti

`backend/tests/nafems/conftest.py` definisce
`assert_within_nafems_tolerance(value, target, tol_pct, name)` con logica
corretta, ma nessun test NAFEMS lo chiama. Helper morto. Da rimuovere o da
adottare nei test post-fix solver.

### NEW-6 · Dead test linearità tautologica LE10
**Stato**: code smell P1 · **Complessità**: ~15 minuti

`test_le10_deflection_scales_linearly_with_pressure` testa che `w(2p) = 2·w(p)`.
È un'identità algebrica del solver lineare — passerebbe anche se il solver
restituisse sempre `42` indipendentemente dall'input. Da rimuovere o trasformare
in test significativo (es. check `σ_yy(2p) = 2·σ_yy(p)`).

---

## 🟡 Media priorità

### #22bis · GDPR cascade delete incomplete
**Stato**: aperto · **Complessità**: ~1 giorno · **Severity**: P1

`backend/auth/cascade_delete.py` ha 4 stub che ritornano 0 perché i moduli
sottostanti non esistono ancora:
- `billing.storage.delete_user_billing` — modulo billing è stub, no dato strutturato
- `audit.log.anonymize_user_audit` — audit log esiste ma non ha API anonimizzazione
- Modelli `backend/data/models/*.json` — manca `owner_id` mapping (gap pre-esistente)
- Snapshot — collection senza scope utente

**Conseguenza**: `DELETE /me` oggi cancella `auth` + `jobs` ma lascia tracce in
3 punti. Non è GDPR-compliant al 100%. Va completato prima del primo utente
reale UE.

**Fix futuro**:
1. Aggiungere `owner_id` ai modelli (migration retroattiva su esistenti)
2. Estendere `billing.storage` con `delete_user_billing()` reale
3. Estendere `audit.log` con `anonymize_user_audit()` reale
4. Cascade su snapshot (path TBD post v2.3.7)

### #28bis · Rate limit Redis-backed per multi-instance
**Stato**: aperto · **Complessità**: ~half day · **Severity**: P2

`backend/auth/login_rate_limiter.py` usa sliding window **in-memory**.
Funziona oggi (single-container fly.io free tier) ma si rompe se mai
scaliamo a 2+ container: un attacker può ruotare fra container e bypassare
il limit.

**Fix futuro**: backing store Redis (o equivalente). Da fare se/quando
scaliamo a multi-instance.

### #17bis · CSP report-only → enforcement promotion
**Stato**: aperto · **Complessità**: ~half day · **Severity**: P2 reminder

`backend/middleware/security_headers.py` invia CSP come
`Content-Security-Policy-Report-Only`. Logga violazioni in
`/api/csp-report` ma non blocca.

**Fix futuro** (post 1-2 settimane di osservazione log):
1. Verificare che le violazioni reali siano ≤ 1-2 sporadiche
2. Restringere policy se serve (es. rimuovere `'unsafe-inline'` da
   `script-src` se Tailwind non lo richiede)
3. Cambiare header in `Content-Security-Policy` (enforcement)
4. Mantenere `report-uri` per logging anche post-enforcement

---

## 🟢 Bassa priorità — Carry-over esterni / sicurezza

### BL-9 · jsPDF CVE GHSA-* — frontend
**Stato:** open · **Complessità:** ~10 min (bump dipendenza)

- Versione attuale `jspdf@^4.2.1`. La 4.x mitigates parte dei CVE precedenti
  ma scan SCA periodici potrebbero ancora segnalare GHSA su release minor.
- Impatto reale: nullo (gira solo client-side, input controllato dall'utente).
- Mitigazione: bump alla prossima patch alla rev del package.json.
- Tracciato qui per non perdersi negli scan SCA periodici.

---

## 🔮 Voci aperte da scoperta v2.x

### Tech debt v2.4.x (alpha.30 follow-ups)
- `jobsStore` unificato (oggi storage frammentato fra panels)
- `useModelHistory` → history push wiring nei restanti store
- `notificationsStore` dedicato (separare da toastStore)
- `rightRailStore` solo statico (sposta logica fuori)
- Cleanup legacy `ExportMenu.tsx`, `Breadcrumb.tsx`
- `materials` field in `FEAModel` (oggi accesso difensivo in ViewportHud)

### Test funzionali completi (v2.5.x — quality checkpoint)
- L1 audit dead clicks (Playwright crawler)
- L2 audit funzionale per area (~10 happy path + 5 edge case)
- Report bug consolidato + fix sprint dedicato

---

## Chiuso (v1.x → v2.x)

### #30 · Engine NON ferma su matrice singolare
**Chiuso**: v2.4.0-singular-matrix-fix (2026-05-24)
**Implementazione**:
- `backend/core/solver/errors.py` (nuovo): `SingularMatrixError` + `NumericalInstabilityError`
- `backend/core/solver/static_solver.py`: wrap `spsolve` con catch `MatrixRankWarning` + check NaN/Inf + check magnitude > 10⁶ m
- `backend/tests/test_solver_singular_matrix.py` (nuovo): 4 test regressione (4/4 verdi in 3.69s)

**Comportamento ora**:
- 2 nodi senza vincoli → `SingularMatrixError("rank_deficient")`
- 5 nodi sottovincolati → `SingularMatrixError("huge_displacement" | "rank_deficient" | "nan_in_solution")`
- 2 nodi sovrapposti → `ValueError("Beam2D ha lunghezza nulla")` già esistente (non regressione)

**Messaggio utente italiano**: "Sistema non risolvibile: rank_deficient.
Suggerimenti: Verifica che la struttura abbia vincoli sufficienti ·
Controlla che non ci siano corpi rigidi liberi"

**Bug origine**: audit `v2.3.5-nafems-truth-audit` sezione 4. Prima del fix,
il solver restituiva NaN (Caso 1) o spostamenti di 1.76 × 10¹⁰ m (Caso 2)
silenti, frontend riceveva dati invalidi marcati come "risolto".

**Out-of-scope (fix futuri)**: stesso pattern di unprotected `spsolve` esiste
in `arclength_solver.py` (3 occ.), `dynamic_solver.py` (1 occ.),
`nonlinear_solver.py` (1 occ.). Da estendere `safe_spsolve` helper in sprint
successivo (`v2.4.1+`).

> **UPDATE 2026-05-24**: scope esteso chiuso in `v2.4.0bis-safe-spsolve-extend`.
> Vedi voce `#30-extended` qui sotto.

### #17 · Security headers mancanti (HSTS / CSP / X-Frame / X-Content-Type)
**Chiuso**: v2.4.2c-security-headers (2026-05-24)
**Implementazione**:
- `backend/middleware/security_headers.py` (nuovo): Starlette middleware
  che aggiunge 5 header a ogni response:
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains`
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Content-Security-Policy-Report-Only` (con `report-uri /api/csp-report`)
  - `Referrer-Policy: strict-origin-when-cross-origin`
- `backend/api/routes/security.py` (nuovo): endpoint `POST /api/csp-report`
  per ricezione violazioni CSP (logga via `logging.warning`)
- `backend/main.py`: `add_middleware(SecurityHeadersMiddleware)` PRIMA del CORS
  + `include_router(security_routes.router, prefix="/api")`
- `backend/tests/middleware/test_security_headers.py` (nuovo): 7 test

**Strategia CSP**:
- Iniziata in modalità `report-only` (logga, non blocca) per evitare di
  rompere la SPA esistente
- Da promuovere a `Content-Security-Policy` enforcement quando le
  violazioni reali sono zero per qualche sprint

**Comportamento ora**:
- Tutte le risposte HTTP includono i 5 header
- Browser moderni: HTTPS forzato, no iframe embedding, no MIME sniff,
  CSP loggato, referrer minimo cross-origin

**Riferimenti**:
- Audit: `docs/nafems_truth_audit.md` sezione 5 (#17)

### #28 · NO rate limiting su login brute force
**Chiuso**: v2.4.2b-rate-limit-login (2026-05-24)
**Implementazione**:
- `backend/auth/login_rate_limiter.py` (nuovo): `LoginRateLimiter`
  sliding-window in-memory (`deque[timestamp]` per IP, thread-safe lock,
  zero dipendenze esterne)
- `backend/api/routes/auth.py:login`: estratto IP via X-Forwarded-For
  fallback `request.client.host`, blocco a 5 fail in 15 min → `429`,
  reset su login riuscito
- `backend/tests/auth/test_rate_limit_login.py` (nuovo): 3 test

**Deviazione documentata vs brief**:
- Brief suggeriva `slowapi==0.1.9` da PyPI, ma l'auto-mode classifier
  ha negato `pip install`. Implementato custom in-memory limiter:
  - Pro: zero dipendenze nuove, ~60 LOC, facilmente testabile
  - Contro: in-process only — per multi-machine deploy futuro serve
    Redis o equivalente. Documentato come limit nel modulo.

**Comportamento ora**:
- 5 tentativi falliti consecutivi su `POST /api/auth/login` da stesso IP
  → 6° tentativo restituisce `429 Too Many Requests` con messaggio italiano
- Login riuscito → reset contatore IP (no penalty per typo)
- `POST /api/auth/register` NON rate-limited (solo `/login`)

**Riferimenti**:
- Audit: `docs/nafems_truth_audit.md` sezione 5 (#28)

### NEW-4 · Postprocess shell σ_y solo membrana, no bending
**Chiuso**: v2.4.3b-shell-bending-stress-recovery (2026-05-24)
**Implementazione**:
- `backend/schemas/results.py::ElementStress`: schema esteso additivo con
  9 campi Optional (`sigma_x/y/xy_top`, `sigma_x/y/xy_bot`, `M_x/y/xy`)
- `backend/core/elements/shell_quad4.py:153-198`: `stresses()` ora estrae
  anche rotazioni nodali → curvatura κ → momenti M → stress fibra estrema
  z=±t/2. Von Mises = max(membrana, top, bot).
- `backend/core/elements/shell_quad4_mitc.py:224`: stesso pattern (B_b
  flessione pura identica fra Q4 e MITC; MITC differisce solo in shear)
- `backend/core/solver/static_solver.py:127`: aggiunti 9 nuovi campi a
  `st_keys` filtro (altrimenti filtrati out come "extra fields")
- `backend/tests/solver/test_shell_bending_stress.py` (nuovo): 6 test

**Comportamento ora**:
- BEFORE: LE10 `sigma_y_top = None`, `M_y = None`, `σ_yy(D) = 0` ovunque
- AFTER: LE10 `sigma_y_top ≈ 2.21 MPa`, `M_y ≈ 132 kNm/m`, bending attivo
- BEAM/TRUSS: campi shell bending restano `None` (back-compat)
- LE1 (membrana piana): `sigma_y` invariato (membrana), bending ~0 atteso

**Anomalia residua** (su LE10):
- σ_yy(D) calcolato +2.21 MPa, target NAFEMS -5.38 MPa
- Discrepanza in segno + 58% in modulo → richiede NEW-1 (extrapolation
  Gauss→nodi, sprint 3) e/o calibrazione MITC (NEW-3-followup) per
  matching del valore esatto. Bug architetturale NEW-4 invece **chiuso**:
  ora il pipeline calcola bending, prima era zero hardcoded.

**Backward compat verificata**:
- 27/27 NAFEMS shell + singular matrix esistenti PASS
- pytest baseline: 1416 PASS, 12 FAIL → 1430 PASS, 9 FAIL
  (3 test pushover ora passano grazie ai nuovi campi bending)

**Riferimenti**:
- Audit: `docs/solver_internals_audit.md` sezione 4
- Closure report: `docs/v2_4_3b_shell_bending_stress_recovery_report.md`

### NEW-3 · SHELL_Q4_MITC pressure load dispatch incompleto
**Chiuso**: v2.4.3a-shell-pressure-mitc-fix (2026-05-24)
**Implementazione**:
- `backend/core/solver/assembler.py:244`: branch dispatch esteso da
  `if el.type == ElementType.SHELL_Q4:` a
  `if el.type in (ElementType.SHELL_Q4, ElementType.SHELL_Q4_MITC):`
- `backend/tests/solver/test_shell_mitc_pressure_load.py` (nuovo): 4 test

**Comportamento ora**:
- BEFORE: LE10 con `SHELL_Q4_MITC` → `max|uz| = 0.000 m` silente
  (carico mai applicato, branch dispatch escludeva MITC)
- AFTER: LE10 con `SHELL_Q4_MITC` → `max|uz| ≈ 0.237 m`
- Q4 baseline invariato: `max|uz| ≈ 6.4e-3 m`

**Anomalia inattesa scoperta (NEW-3-followup)**:
Post-fix, MITC dà `uz ≈ 37×` Q4 su LE10. Sintomo di un **secondo bug**
nella formulation `ShellQuad4MITC._bending_stiffness` (Bathe-Dvorkin
tying points). Distinto da NEW-3 dispatch. Da indagare in brief separato
`v2.4.x-mitc-formulation-calibration`. **Non bloccante** per questo
sprint perché il bug originario (dispatch) è chiuso.

**Riferimenti**:
- Audit: `docs/solver_internals_audit.md` sezione 3
- Closure report: `docs/v2_4_3a_shell_pressure_mitc_fix_report.md`

### #22 · GDPR no DELETE /api/auth/me endpoint
**Chiuso**: v2.4.2a-gdpr-delete-account (2026-05-24)
**Implementazione**:
- `backend/auth/users_db.py`: aggiunto metodo `delete(user_id) -> bool`
- `backend/jobs/store.py`: aggiunto metodo `delete_for_user(user_id) -> int`
- `backend/auth/cascade_delete.py` (nuovo): `delete_user_cascade(user_id)`
  con ordine deliberato (jobs → billing stub → audit anonymize stub → user)
- `backend/api/routes/auth.py`: `@router.delete("/me", status_code=204)`
- `backend/tests/auth/test_delete_account_gdpr.py` (nuovo): 4 test regressione

**Stats restituite** (dict):
```
user_id_hash, deleted_at, models_deleted, snapshots_deleted,
jobs_deleted, billing_records_deleted, audit_entries_anonymized, user_deleted
```

**Gap pre-esistenti documentati nel docstring del modulo**:
- `backend/data/models/*.json` non ha `owner_id` → no cascade su modelli
- Snapshot client-side (localStorage) → no cascade server-side
- Billing/audit stub: nessuna API user-keyed esistente

Da estendere quando emergeranno moduli `models.owner_id`, `billing.storage`,
`audit.log.anonymize_user_audit`.

**Riferimenti**:
- Audit: `docs/nafems_truth_audit.md` sezione 5 (#22 GDPR)
- RULES: `docs/CLAUDE_CODE_OPERATING_RULES.md`

### #6 · EC2 staffe non nec. quando UR > 1.0
**Chiuso**: v2.4.1-ec2-stirrups-fix (2026-05-24)
**Implementazione**:
- `backend/core/verification/ec2/shear.py`:
  - `shear_check` accetta `V_Ed: float | None = None` (backward-compat)
  - Logica strutturale: `needs_stirrups = (V_Ed > V_Rd_c)` quando V_Ed noto
  - Fallback legacy `(A_sw > 0)` quando V_Ed=None (test capacity-side)
  - `ShearResult` esteso con `UR` e `V_Ed` opzionali
- `backend/api/routes/verify_ext.py:96`:
  - Wiring `V_Ed=req.V_Ed` alla chiamata `shear_check`
- `backend/tests/verification/test_ec2_shear_v_ed.py` (nuovo):
  - 5 test regressione (true/false V_Ed cases, backward-compat,
    API integration, edge V_Ed=0)

**Caller migrati**:
- `verify_ext.py` (1 caller produttivo) — passa V_Ed
- 3 caller test capacity-side — restano su V_Ed=None (legittimo)

**Comportamento ora**:
- API riceve V_Ed=200kN, A_sw=0 → response `{needs_stirrups: true, UR: 2.665}`
  (prima: `{needs_stirrups: false, UR: 2.665}` incoerente)
- Frontend `EC2Panel.tsx` mostra response coerente senza modifiche frontend

**Riferimenti**:
- Audit: `docs/nafems_truth_audit.md` sezione 3 (EC2)
- Investigation: `docs/v2_4_1_investigation_report.md`
- Closure report: `docs/v2_4_1_ec2_stirrups_fix_report.md`

### #30-extended · safe_spsolve esteso a tutti i solver
**Chiuso**: v2.4.0bis-safe-spsolve-extend (2026-05-24)
**Implementazione**:
- `backend/core/solver/errors.py`: nuovo helper `safe_spsolve(K, F, *, context, check_magnitude)`
- `backend/core/solver/static_solver.py`: refactor per usare helper (era inline)
- `backend/core/solver/arclength_solver.py`: 3 chiamate `spsolve` → `safe_spsolve`
- `backend/core/solver/dynamic_solver.py`: 1 chiamata Newmark initial-acceleration
- `backend/core/solver/nonlinear_solver.py`: 1 chiamata NR iteration (con lstsq fallback preservato)
- `backend/tests/test_solver_singular_matrix.py`: +4 test (arclength, dynamic, nonlinear, anti-regression meta-test)

**Coverage**:
- 6/6 chiamate `spsolve` nel codice ora protette (5 sostituite + 1 nel helper)
- Bug #30 chiuso per static, arc-length, push-over (via NR), dinamica, non-lineare
- Anti-regression meta-test garantisce che future PR non reintroducano `spla.spsolve` raw

**Parametri `check_magnitude`**:
- static, dynamic: `True` (spostamenti / accelerazioni fisici, soglia 10⁶)
- arc-length, nonlinear: `False` (incrementi intermedi, possono essere grandi)

**Test totale**: 8/8 PASS in 0.87s. Pytest backend complessivo: 1398 passed,
12 failed pre-esistenti (numero non aumentato vs baseline pre-fix).

### BL-1 · Newton-Raphson + Cable 2D/3D — non-linearità geometrica
**Chiuso**: v1.5 (riconciliato in v2.3.3-docs-sync, 2026-05-23)
**Implementazione**:
- `backend/core/elements/cable2d.py`, `backend/core/elements/cable3d.py`
- `backend/core/solver/nonlinear_solver.py`
**Test di riferimento**:
- `backend/tests/test_cable2d.py`, `backend/tests/test_cable3d.py`
- `backend/tests/test_nonlinear_solver.py`

### BL-2 · Solver non-lineare generico + arc-length (post-snap-through)
**Chiuso**: v1.6 (riconciliato in v2.3.3-docs-sync, 2026-05-23)
**Implementazione**:
- `backend/core/solver/arclength_solver.py` (Crisfield/Riks)
- `backend/core/solver/nonlinear_solver.py` (Newton-Raphson base)
**Test di riferimento**: `backend/tests/test_arclength.py`
**Nota**: test Williams toggle frame specifico non rilevato — da aggiungere
in v2.4.x come check di validazione mirato (vedi tech debt sopra).

### BL-3 · Elementi Tet4 / T10 (solidi tetraedrici)
**Chiuso**: v1.6 (riconciliato in v2.3.3-docs-sync, 2026-05-23)
**Implementazione**:
- `backend/core/elements/solid_tet4.py`
- `backend/core/elements/solid_tet10.py`
**Test di riferimento**: `backend/tests/test_solid_tet*.py`

### BL-4 · Shell layered (composite stack-up)
**Chiuso**: v1.7 (riconciliato in v2.3.3-docs-sync, 2026-05-23)
**Implementazione**: `backend/core/elements/shell_quad4_layered.py`
**Test di riferimento**: `backend/tests/test_shell_quad4_layered.py`

### BL-5 · Q4 MITC4 / reduced integration (shear locking)
**Chiuso**: v1.7 (riconciliato in v2.3.3-docs-sync, 2026-05-23)
**Implementazione**: `backend/core/elements/shell_quad4_mitc.py`
**Test di riferimento**: NAFEMS LE10 (thin plate h/L=1/500) — verificato in
`backend/tests/nafems/`.

### BL-6 · NAFEMS LE1 / LE2 / LE10 con geometria ellittica
**Stato originale**: chiuso v1.3 (D1) · **RIAPERTO 2026-05-24 post `v2.3.5-nafems-truth-audit`**.

Voce storica (mantenuta per tracciabilità):
- LE2 cantilever beam3D + convergenza + reazioni → ✅ PASS confermato in audit
- LE1 elliptic membrane Q4/Tri3 → ❌ tolerance test ±400% maschera errore reale −32%
- LE10 thick plate Q4 → ❌ test misurano max|uz| invece di σ_yy(D)

Continuazione attiva: vedi `### BL-6-bis · NAFEMS LE1/LE10 enforcement tolerance ufficiale`
in sezione "🔴 Alta priorità".

### BL-7 · 3D iso-surfaces (marching tetra / cubes)
**Chiuso**: v1.8 (riconciliato in v2.3.3-docs-sync, 2026-05-23)
**Implementazione**:
- `backend/core/postprocess/isosurfaces.py` (marching tetrahedra esplicito,
  decomposizione canonica Hex8→5 tetraedri tramite `tetrahedralize_hex8`)
- `backend/core/postprocess/isolines.py` (marching triangles 2D)
- Frontend: `frontend/src/components/panels/IsosurfacePanel.tsx`
**Riferimenti normativi** documentati inline: Lorensen-Cline 1987, Doi-Koide 1991.

### BL-8 · DXF layer → material/section mapping
**Chiuso**: v1.8 (riconciliato in v2.3.3-docs-sync, 2026-05-23)
**Implementazione**: `backend/core/io/dxf_importer.py` accetta parametri
`layer_material_map: dict[str, str]` e `layer_section_map: dict[str, str]`;
lookup case-sensitive su `dxf.layer`; fallback su default.
**Test di riferimento**: vedere `backend/tests/test_dxf_importer.py`.

---

## Convenzioni

- Apertura di un carry-over BL-N → cambia stato a `in-progress` qui e crea
  branch `feat/bl-N-<slug>`.
- Chiusura → muove la voce in `CHANGELOG.md` sotto la nuova versione minor,
  e qui in `## Chiuso (v1.x → v2.x)`.
- Ogni implementazione deve includere **almeno un test di validazione
  contro una formula analitica o benchmark normativo**, coerentemente con la
  filosofia delle 25 fasi.
