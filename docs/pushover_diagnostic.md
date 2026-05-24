# Pushover solver · Diagnostic v2.4.7

**Sprint**: `v2.4.7-pushover-diagnostic` (Sprint 2 di compound v2.4.x)
**Tipo**: investigation only, **zero modifiche al codice produzione**
**Data**: 2026-05-24

> **Output**: i 7 test pushover FAIL (non 4 come stimato dal brief) hanno
> **una sola root cause comune** — clausola `except` di `PushoverSolver`
> obsoleta rispetto al refactor `safe_spsolve` v2.4.0bis. Fix banale (~3
> righe). Brief raccomandato: `v2.4.7.1-pushover-fixes`.

---

## Test FAIL identificati

7 test in `backend/tests/test_pushover.py`:

| # | Test | Errore esatto |
|---|---|---|
| 1 | `TestCantileverPlastic::test_first_hinge_at_clamp` | `SingularMatrixError: huge_displacement` |
| 2 | `TestCantileverPlastic::test_collapse_lambda_matches_analytical` | idem |
| 3 | `TestCantileverPlastic::test_collapse_reason_set` | idem |
| 4 | `TestCantileverPlastic::test_steps_curve_monotonic_until_hinge` | idem |
| 5 | `TestParametricMaterials::test_s355_vs_s235` | idem |
| 6 | `TestParametricMaterials::test_ipe300_vs_ipe200` | idem |
| 7 | `TestResultsStructure::test_results_contain_required_fields` | idem |

3 test passano (`TestEdgeCases`): non spingono la struttura al meccanismo,
quindi non scattano huge_displacement.

**Discrepanza dal brief**: il brief stimava 4 test FAIL, in realtà sono 7.
Tutti dovuti alla stessa root cause (1 punto di fix), quindi l'impatto è
gestibile senza espansione di scope.

---

## Root cause

### Origine storica

- `0d89c1d`: introdotti `SingularMatrixError` + `NumericalInstabilityError` (v2.4.0 T1)
- `2dc4498`: estratto helper `safe_spsolve` che wrappa scipy spsolve con i nuovi exception types (v2.4.0bis T1)

Effetto del refactor:
- Prima: `spla.spsolve` poteva sollevare `RuntimeError`, `MatrixRankWarning`, `LinAlgError` (eccezioni scipy nativo)
- Dopo: `safe_spsolve` traduce tutte le condizioni di errore in `SingularMatrixError` (custom, `core.solver.errors.SingularMatrixError`)

### Punto di rottura

`backend/core/solver/pushover_solver.py:165` cattura le eccezioni del solver statico interno:

```python
try:
    static = StaticSolver(m_step).solve()
except (RuntimeError, spla.MatrixRankWarning, np.linalg.LinAlgError) as e:
    results.collapse_lambda = lam - self.lambda_step
    results.collapse_reason = f"K singolare (meccanismo): {e}"
    break
```

La clausola `except` cattura le **vecchie** eccezioni scipy ma **NON** `SingularMatrixError` (che è `core.solver.errors.SingularMatrixError`, eredita da `SolverError` → `Exception` ma non da `RuntimeError`).

→ Dopo v2.4.0bis, quando il cantilever forma la prima cerniera plastica
e la step successiva risulta in meccanismo (uz → ∞), `safe_spsolve` solleva
`SingularMatrixError`. PushoverSolver NON la cattura. L'eccezione si
propaga al test, che fallisce con assertion non eseguibile.

### Conferma

`core/solver/errors.py:17,21`:
```python
class SolverError(Exception): ...
class SingularMatrixError(SolverError): ...
```

NON è sottoclasse di `RuntimeError`/`LinAlgError`/`MatrixRankWarning` →
non viene catturata dall'except esistente.

---

## Categoria per ogni test FAIL

Schema brief:
- (a) bug solver reale
- (b) test obsoleto (assertion errata)
- (c) dipendenza esterna
- (d) regressione mascherata

| Test | Categoria | Severity |
|---|---|---|
| Tutti i 7 sopra | **(d) regressione mascherata** | P1 — corretti in test, rotti da refactor downstream non aggiornato |

I test sono semanticamente corretti (cantilever sotto carico crescente
DEVE collassare con plastic hinge → mechanism, e pushover DEVE
gracefully riconoscerlo come collapse_lambda).

Il bug è in `PushoverSolver.solve()` che non sa più riconoscere il
segnale di collapse perché l'exception type è cambiato dopo il refactor
`safe_spsolve`.

---

## Fix raccomandato (Brief `v2.4.7.1-pushover-fixes`)

### Scope

Singolo file `backend/core/solver/pushover_solver.py`, ~3 righe.

### Dettaglio fix

```python
# Aggiungere import in alto:
from core.solver.errors import SingularMatrixError

# Estendere except (riga 165 attuale):
except (
    RuntimeError,
    SingularMatrixError,                  # ← NEW v2.4.7.1
    spla.MatrixRankWarning,
    np.linalg.LinAlgError,
) as e:
    results.collapse_lambda = lam - self.lambda_step
    results.collapse_reason = f"K singolare (meccanismo): {e}"
    break
```

### Test verifica

Riesecuzione `pytest backend/tests/test_pushover.py` deve dare 10/10 PASS
(o, se 2-3 test hanno assertion ancora calibrate sul comportamento
pre-`safe_spsolve`, aggiornare il messaggio `collapse_reason` atteso che
potrebbe contenere "huge_displacement" invece del vecchio).

### Stima

~30 minuti (incluso reading test assertion + commit + sync + tag).

### Quality gate atteso post-fix

- 7 FAIL pushover → 0 FAIL
- Baseline post-fix: 1452 → 1459 PASS, 9 → 2 FAIL pre-esistenti
- I 2 FAIL residui (estimator + elevation) non sono shell/pushover, fuori scope

---

## Backward compat

Il fix è **strettamente additivo** sulla clausola except:
- Nessun comportamento esistente cambia
- Nessuna API cambia (`PushoverResults.collapse_reason` è già un free-form string)
- Nessun frontend impact (pushover non era esposto via UI in v2.4.x corrente, oppure se lo era usa `collapse_reason` solo per visualizzazione)

---

## Brief candidato

**Nome**: `v2.4.7.1-pushover-fixes`
**Tipo**: bugfix puntuale (1 file, ~3 righe)
**Scope**: aggiungere `SingularMatrixError` al `except` clause di `pushover_solver.py:165`
**Stima**: ~30 minuti
**Esito atteso**: 7 test pushover FAIL → PASS, baseline 1459/2

---

## Note operative

Sprint 2 chiuso senza modifiche al codice produzione (come da brief).
Solo questo documento + aggiornamento BACKLOG con raccomandazione brief
successivo. Codice rimane esattamente quello al SHA `304cb30`.
