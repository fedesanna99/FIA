# v2.4.3a-shell-pressure-mitc-fix · Report

**Data**: 2026-05-24
**Branch**: test
**Tipo**: bugfix shell formulation (sprint 1 di 6 del compound v2.4.x)

## Sintesi
Chiuso bug NEW-3 (P1) dell'audit `v2.3.7`. Branch `pressure_load` dispatch
in `assembler.py:244` esteso da `SHELL_Q4` only a `(SHELL_Q4, SHELL_Q4_MITC)`.
LE10 con MITC ora ha `max|uz| ≠ 0` (era 0 silente).

## Task completati
- **S1.T1**: identificata riga esatta `assembler.py:244` + verificata che
  `ShellQuad4MITC` espone stessa signature di `ShellQuad4` (`_area()` + `R`)
- **S1.T2**: fix di 1 riga (condition esteso a tuple) + commento docstring
- **S1.T3**: 4 test regressione

## File toccati
- `backend/core/solver/assembler.py` (+7 righe: condition + docstring)
- `backend/tests/solver/__init__.py` (nuovo, package marker)
- `backend/tests/solver/test_shell_mitc_pressure_load.py` (nuovo, 70 righe)
- `BACKLOG.md` (NEW-3 in Chiuso)
- `docs/v2_4_3a_shell_pressure_mitc_fix_report.md` (nuovo)

## Quality gates
- ✅ 4/4 nuovi test PASS (1.57s)
- ✅ 8/8 `test_solver_singular_matrix.py` esistenti PASS (no regression v2.4.0/0bis)
- ✅ 15/15 `tests/nafems/` + `tests/benchmarks/test_nafems_elliptic.py` PASS
- ✅ tsc + vitest non eseguiti (no frontend touched)

## Comportamento BEFORE/AFTER

```python
m = _build_le10(nx=8, ny=8, p=1e6, element_type=ElementType.SHELL_Q4_MITC)
r = StaticSolver(m).solve()
max(abs(d.uz) for d in r.displacements)

# BEFORE v2.4.3a: 0.000 m (silent — carico mai applicato)
# AFTER  v2.4.3a: 0.237 m
```

## ⚠ Anomalia inattesa scoperta — NEW-3-followup

Post-fix, MITC produce `uz ≈ 0.237 m` mentre Q4 dà `uz ≈ 6.4e-3 m` su
stesso problema LE10 (`p=1MPa, t=0.6m, mesh 8×8`). Rapporto **~37×**.

Per piastra di spessore t=0.6 m (ratio t/a ≈ 0.18, non particolarmente
sottile), ci si aspetterebbe MITC ~ Q4 entro ±20%. Lo scostamento
massiccio suggerisce **secondo bug nella formulation MITC**:

- `ShellQuad4MITC._bending_stiffness` (shell_quad4_mitc.py:133) usa tying
  points Bathe-Dvorkin per `B_s` shear interpolation
- O i tying points sono scalati male, o la `K_s` MITC è troppo flessibile,
  o `D_s` ha coefficiente di shear correction `5/6` sbagliato

**Decisione**: il bug NEW-3 originario (dispatch) è chiuso. La calibrazione
MITC è un bug separato che richiede analisi dedicata (formulation review +
test contro NAFEMS LE10 thin plate analytical). Da indagare in **brief
separato** post-compound. Aggiunto come finding in BACKLOG sezione "Chiuso".

Non è bloccante per Sprint 2-6 perché:
- Q4 baseline è invariato (LE10 Q4 uz = 6.4e-3 m, prevedibile)
- MITC è opzionale (utenti possono usare Q4 finché MITC non viene calibrato)
- I test esistenti che usano MITC verificavano `max|uz|=0` o ordine di grandezza,
  non valore esatto → restano significativi

## Backward compatibility
- API contract invariato (`StaticSolver.solve()` stessa firma)
- Schema `ElementStress` invariato (no nuovi campi in questo sprint)
- Frontend invariato (nessun campo aggiunto)

## Prossimo passo
Sprint 2 del compound: `v2.4.3b-shell-bending-stress-recovery` (NEW-4,
~2-3 giorni).
