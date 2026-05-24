# v2.4.0-singular-matrix-fix · Report

**Data**: 2026-05-24
**Branch**: test
**Tipo**: bugfix solver (1° fix tecnico post audit v2.3.5)

## Sintesi
Chiuso bug #30 (P0 safety) dall'audit `v2.3.5-nafems-truth-audit`. Il solver
ora solleva `SingularMatrixError` invece di restituire NaN o spostamenti
di 17.6 miliardi di metri silenti.

## Task completati
- **T1** · nuove eccezioni `SingularMatrixError` + `NumericalInstabilityError`
  con messaggio italiano e suggerimenti operativi
- **T2** · wrap `spsolve` in `static_solver.py` con catch `MatrixRankWarning` +
  check NaN/Inf + check magnitude > 10⁶ m
- **T3** · 4 test regressione (4/4 verdi in 3.69s)
- **T4** · BACKLOG aggiornato, #30 spostato in Chiuso

## File toccati
- `backend/core/solver/errors.py` (nuovo, 79 righe)
- `backend/core/solver/static_solver.py` (+55/-1 righe)
- `backend/tests/test_solver_singular_matrix.py` (nuovo, 151 righe)
- `BACKLOG.md` (#30 spostato in Chiuso con dettaglio + scope futuri solver)
- `docs/v2_4_0_singular_matrix_fix_report.md` (nuovo)

## Quality gates
- **pytest backend totale**: 1394 PASS / 14 FAIL — tutti i FAIL **pre-esistenti**
  (verificato con run pre-fix prima del commit):
  - 7× `test_pushover.py` (bug pushover_solver, non correlato a #30)
  - 6× `services/providers/meteo/elevation integration` (richiedono rete)
  - 1× `billing/test_estimator_calibration ex_cable_bridge_2d-nonlinear`
- **4 nuovi test** `test_solver_singular_matrix.py`: **4/4 verdi**
- **Sanity check** `test_valid_model_still_solves`: modello `example_simple_beam_2d`
  continua a girare senza eccezioni e con spostamenti finiti

### Quality gates NON eseguiti
- `tsc --noEmit` frontend: non eseguito (nessun frontend touched, no regression possibile)
- `vitest run`: non eseguito (nessun frontend touched)

## Commit (4 + report)
- `0d89c1d` feat(solver): SingularMatrixError + NumericalInstabilityError (T1)
- `a7abb0e` fix(solver): wrap spsolve with singular matrix detection (T2)
- `ac68075` test(solver): regression tests for #30 singular matrix (T3)
- (questo report + BACKLOG update in commit T4)

## Comportamento prima vs dopo

### Prima (audit v2.3.5)

```python
# Caso 1: 2 nodi senza vincoli
m = FEAModel(nodes=[n1,n2], elements=[beam], constraints=[], loads=[...])
result = StaticSolver(m).solve()
# → result.displacements[*].uy == NaN  (silent!)
# → MatrixRankWarning su stderr (non visibile dal frontend)
```

```python
# Caso 2: 5 nodi sottovincolati
m = FEAModel(nodes=[5 nodi], elements=[4 beam], constraints=[1 pinned], loads=[...])
result = StaticSolver(m).solve()
# → max|uy| == 1.76e+10 m   (17.6 miliardi di metri, silent)
# → frontend disegna la deformata come fosse normale
```

### Dopo (v2.4.0)

```python
# Caso 1
result = StaticSolver(m).solve()
# → raise SingularMatrixError(cause='rank_deficient', n_free_dofs=6)
# → e.message_it == "Sistema non risolvibile: rank_deficient.
#                    Suggerimenti: Verifica che la struttura abbia vincoli
#                    sufficienti · Controlla che non ci siano corpi rigidi liberi"

# Caso 2
result = StaticSolver(m).solve()
# → raise SingularMatrixError(cause='huge_displacement', condition_estimate=1.76e10)
# → messaggio italiano con suggerimento "aggiungi vincoli"
```

## Scope deliberatamente limitato

Solo `static_solver.py` è stato protetto. Stesso pattern di `spsolve`
unprotected esiste in:
- `arclength_solver.py` (3 chiamate)
- `dynamic_solver.py` (1 chiamata)
- `nonlinear_solver.py` (1 chiamata)

Brief successivo `v2.4.0.x-safe-spsolve-extend` potrebbe estrarre un helper
`safe_spsolve(K, F, n_dofs)` riutilizzabile e applicarlo agli altri solver.
Out-of-scope per questo brief atomico (1 file solver alla volta).

## Prossimo passo
`v2.4.1-ec2-stirrups-fix` (~mezza giornata): correggere `needs_stirrups` in
`backend/core/verification/ec2/shear.py` per confrontare `V_Ed` con `V_Rd_c`.

Bug #6 dell'audit `v2.3.5`. Diagnosi completa (file:riga 138-146), fix breve.
