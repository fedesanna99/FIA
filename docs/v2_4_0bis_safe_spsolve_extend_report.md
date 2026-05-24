# v2.4.0bis-safe-spsolve-extend · Report

**Data**: 2026-05-24
**Branch**: test
**Tipo**: scope extension del fix `v2.4.0` ai 5 solver vulnerabili rimanenti

## Sintesi
Esteso il fix di bug #30 (matrice singolare) ai 5 punti del codice che
chiamavano `spsolve` senza protezione: arc-length (3), dynamic (1),
nonlinear (1). Chiusa la classe di bug #30 al 100%.

Estratto helper `safe_spsolve` come singolo punto di applicazione del check,
con anti-regression meta-test che impedisce reintroduzione di chiamate raw.

## Task completati
- **T1**: estratto helper `safe_spsolve(K, F, *, context, check_magnitude)`
  in `errors.py` con normalizzazione CSC, edge case shape(0,0), `np.atleast_1d`,
  distinzione NaN→SingularMatrixError vs Inf→NumericalInstabilityError
- **T2**: refactor `static_solver.py` per usare l'helper (DRY) — net negativo
  (-31 LOC)
- **T3**: `arclength_solver.py` — 3 chiamate sostituite, rimosso `try/except Exception`
  generico che ingoiava errori in `diagnostics`
- **T4**: `dynamic_solver.py` (1 chiamata initial-acceleration) + `nonlinear_solver.py`
  (1 chiamata NR iter, con lstsq fallback preservato)
- **T5**: +4 test (8/8 totale PASS in 0.87s) inclusi anti-regression meta-test
- **T6**: BACKLOG aggiornato + questo report

## File toccati
- `backend/core/solver/errors.py` (+120 righe — helper aggiunto)
- `backend/core/solver/static_solver.py` (refactor net −31 righe)
- `backend/core/solver/arclength_solver.py` (3 sostituzioni, +29/-10)
- `backend/core/solver/dynamic_solver.py` (1 sostituzione)
- `backend/core/solver/nonlinear_solver.py` (1 sostituzione, fallback preservato)
- `backend/tests/test_solver_singular_matrix.py` (+125 righe, +4 test)
- `BACKLOG.md` (`#30-extended` aggiunto in Chiuso)
- `docs/v2_4_0bis_safe_spsolve_extend_report.md` (nuovo)

## Coverage spsolve dopo questo brief

| Solver | Chiamate `spsolve` raw prima | Dopo |
|---|---:|---:|
| `static_solver.py` | 1 (già protetta in v2.4.0) | 0 (via helper) |
| `arclength_solver.py` | 3 | 0 |
| `dynamic_solver.py` | 1 | 0 |
| `nonlinear_solver.py` | 1 (con lstsq fallback) | 0 (helper + lstsq fallback) |
| `errors.py` (helper) | 0 | **1** (definizione del helper) |
| **TOTALE** | 6 raw | 1 (solo nel helper) |

Anti-regression meta-test `test_no_spsolve_raw_remaining_in_solver_module`
scansiona `backend/core/solver/*.py` (escluso `errors.py`) e fallisce se
una futura PR reintroduce `spla.spsolve` raw.

## Quality gates
- ✅ 8/8 test in `test_solver_singular_matrix.py` (4 v2.4.0 + 4 v2.4.0bis)
- ✅ Pytest backend full: **1398 passed, 12 failed pre-esistenti**
  (baseline pre-v2.4.0bis: 1394 passed, 14 failed → +4 nuovi test, -2 fail
  flake/coincidenza, NESSUNA regression)
- ✅ Anti-regression: `grep "spla.spsolve" backend/core/solver/` → solo
  `errors.py:156` (definizione helper)
- ✅ Test esistenti dei solver toccati: 7/7 arclength PASS,
  22/23 dynamic+nonlinear PASS (1 FAIL `cable_bridge_2d-nonlinear` pre-esistente)

### Quality gates NON eseguiti
- `tsc --noEmit` frontend: non necessario (nessun frontend touched)
- `vitest run`: non necessario (nessun frontend touched)

## Commit (6 + report)
- `2dc4498` feat(solver): extract safe_spsolve helper (T1)
- `4d9caa7` refactor(solver): static_solver use safe_spsolve helper (T2)
- `6712be8` fix(solver): arclength use safe_spsolve (T3)
- `ff164a8` fix(solver): dynamic + nonlinear use safe_spsolve (T4)
- `8263c6c` test(solver): regression tests for arclength + dynamic + nonlinear (T5)
- (T6 BACKLOG + report in commit corrente)

## Note di design

### `check_magnitude` flag rationale

| Contesto | `check_magnitude` | Perché |
|---|:---:|---|
| `static` | `True` | Spostamenti fisici diretti; `1000 km` è soglia largamente conservativa |
| `dynamic` initial acceleration | `True` | Accelerazioni reali < 10⁵ g (1000 km/s² = limite assurdo) |
| `arclength_predictor` | `False` | δu_t è un *modo tangente* non normalizzato, riscalato da Δλ |
| `arclength_corrector` | `False` | δu_bar/δu_t intermedi, normalizzati dal vincolo arc-length |
| `nonlinear` NR iter | `False` | Δu Newton intermedio può essere grande pre-damping/line-search |

### Nonlinear lstsq fallback preservato

`nonlinear_solver.py` aveva un fallback con `np.linalg.lstsq` (pseudo-inversa
densa) per K_T near-singular durante transizioni plastiche legittime
(snap-through limitato, primo step plasticità). Preservato perché è un
design choice legittimo. Il bug #30 è chiuso aggiungendo:
1. `safe_spsolve` come tentativo primario (raise se K severamente singolare)
2. `lstsq` come fallback
3. Check NaN/Inf sul risultato `lstsq` → se anch'esso fallisce, raise
   `SingularMatrixError`

Quindi il fallback non maschera più la corruzione silente, ma continua a
salvare gli step difficili che lstsq risolve correttamente.

### Dynamic auto-regolarizzato via M

Newmark calcola `K_eff = K + a₀·M + a₁·C` dove `a₀ ≈ 40000` con `dt=0.01`,
`beta=0.25`. Anche se K è singolare, l'inerzia diagonale rende `K_eff`
positiva definita per qualsiasi modello con massa propria > 0. Quindi il
Newmark loop principale non si rompe — la nostra protezione `safe_spsolve`
copre solo l'accelerazione iniziale (calcolata via M_ff direttamente).

Test `test_dynamic_solver_no_constraints_no_silent_corruption` riconosce
questo: accetta sia `SingularMatrixError` sia output finito senza NaN.

## Prossimo passo
`v2.4.1-ec2-stirrups-fix` (~mezza giornata): correggere `needs_stirrups`
in `backend/core/verification/ec2/shear.py:138-146` per confrontare V_Ed
con V_Rd_c.

Bug #6 dell'audit `v2.3.5`. Diagnosi completa, fix breve, test parametrico nuovo.
