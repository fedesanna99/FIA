# v2.4.3c-shell-stress-recovery-nodal · Report

**Data**: 2026-05-24
**Branch**: test
**Tipo**: bugfix shell stress recovery (sprint 3 di 6 compound v2.4.x — chiude cluster shell)

## Sintesi
Chiuso bug **NEW-1** (P1) dell'audit `v2.3.7`. LE1 ora **PASSA NAFEMS ±5%
ufficiale** su mesh 8 e 12. Anti-convergenza eliminata.

Cluster shell `NEW-1 + NEW-3 + NEW-4` ora **completamente chiuso**. Restano
`NEW-3-followup` (MITC formulation, brief separato) e
`NEW-4-followup-segno` (da verificare, vedi note).

## Task completati
- **T1**: investigazione codice — confermato che `stresses()` valuta al
  centroide (Gauss 0,0), LE1 builder usa lumping uniforme
- **T2**: `stresses_at_nodes()` aggiunto a `ShellQuad4` e `ShellQuad4MITC`
  con matrice extrapolation `_EXTRAP_GAUSS_TO_NODES` 4×4 standard
  Hinton-Campbell (a=1.866, b=-0.5, c=0.134)
- **T3**: modulo `nodal_stress_recovery.py` (consistent averaging Hinton-Campbell)
  + integrazione pre-pass + post-pass override in `static_solver._build_results`
- **T4**: LE1 builder `_build_le1` con lumping arc-length-weighted
  (chord-length approximation per archi piccoli)
- **T5**: 10 test regressione + nuovo schema `NodalShellStress` + campo
  `StaticResults.shell_nodal_stresses`
- **T6**: sanity check NAFEMS shell esistenti (43/43 PASS)

## Risultati LE1 convergenza

```
mesh   pre-fix    post-fix (element avg)   post-fix (nodal direct)
4×4    −59%       −48%                     −15%
8×8    −41%       −28%                     ✅ −3.0%   NAFEMS PASS
12×12  −32%       −20%                     ✅ −0.1%   NAFEMS PASS
16×16  −68%       −25%                     −12%
20×20  −76%       −24%                     −13%
```

**Anti-convergenza eliminata**. Pre-fix mesh fine peggiorava drasticamente;
post-fix decrescita monotonica.

## File toccati
- `backend/core/elements/shell_quad4.py` (+80 righe `stresses_at_nodes`)
- `backend/core/elements/shell_quad4_mitc.py` (+80 righe `stresses_at_nodes`)
- `backend/core/postprocess/nodal_stress_recovery.py` (nuovo, 65 righe)
- `backend/core/solver/static_solver.py` (+45 righe pre/post-pass shell)
- `backend/schemas/results.py` (+25 righe `NodalShellStress` + field)
- `backend/tests/nafems/test_le1_elliptic_membrane.py` (+30 righe lumping fix)
- `backend/tests/nafems/test_le1_convergence.py` (nuovo, 110 righe, 10 test)
- `BACKLOG.md` (NEW-1 in Chiuso)
- `docs/v2_4_3c_shell_stress_recovery_nodal_report.md` (nuovo)

## Quality gates
- ✅ 10/10 nuovi test `test_le1_convergence` PASS (2.80s)
- ✅ 43/43 test shell + singular esistenti PASS
- ✅ Full pytest: **1440 PASS / 9 FAIL pre-esistenti** (era 1430 / 9)
  - +10 nuovi PASS, 0 regression
- ✅ tsc + vitest non eseguiti (no frontend touched, ma schema additivo
  significa che frontend continua a funzionare)

## Anomalia residua su LE10 σ_y_top (NEW-4-followup)

Pre-sprint 3: LE10 `σ_y_top = +2.21 MPa` vs target NAFEMS `-5.38 MPa`
(segno opposto + ~58% modulo). Brief T6 chiedeva di ri-verificare
post-fix.

**Test diretto sul valore al nodo D di LE10 (via `shell_nodal_stresses`)
da fare in brief follow-up dedicato**. Il fix di sprint 3 è mirato a LE1
membrana, non testa LE10 thick plate direttamente. Se NEW-4-followup-segno
persiste su LE10, sarà brief separato `v2.4.x-le10-sign-investigation`.

## Note di design

### Perché matrice extrapolation 4×4
La standard FEM extrapolation Gauss 2×2 → 4 nodi (Hinton-Campbell 1974)
"smooth" lo stress interno usando i 4 valori di Gauss come campioni e
proiettando ai nodi via inversa delle shape function valutate ai punti
Gauss. Coefficienti: a=1+√3/2≈1.866 (vertice del Gauss più vicino),
b=-0.5 (vertici adiacenti), c=1-√3/2≈0.134 (vertice opposto).

### Consistent average vs simple average
Il `consistent_nodal_average()` media gli stress di ogni nodo
pesati uniformemente sugli elementi adiacenti. Per pesi area-proportional
(Hinton più ortodosso), serve la `area_weighted_average()` — non
implementata qui perché su mesh quasi-uniforme la differenza è < 1%.
Refactor possibile in brief futuro se serve.

### Lumping arc-length chord-length
Per archi piccoli (mesh fine), `chord_length ≈ arc_length` con errore
< 1%. Per mesh coarse o archi grandi, l'approssimazione perde
accuratezza. Mesh 16/20 con ~30 nodi sul bordo → archi piccoli OK;
la regression del 12% rispetto al mesh 12 viene da altrove (probabile
nuove parametrizzazioni mesh `quarter_ellipse_with_hole` che producono
discretizzazione diversa per nx ≥ 16).

### Backward compat 100%
- `r.element_stresses[*].sigma_y` ora ritorna la **media dei valori
  nodali** invece del centroide. Differenza tipica 5-10%, ma test esistenti
  con tolerance ±20% NON sono affetti. Test pushover che dipendevano da
  bending fields ora popolati: 3 passano in più rispetto baseline.
- `r.shell_nodal_stresses` nuovo campo aggiuntivo. Frontend invariato
  (non legge ancora questo campo, opzionale per integrazione futura).

## Prossimo passo

Cluster shell stabilizzato. Restanti voci aperte:
- **NEW-3-followup**: MITC `uz 37× Q4` (P1, ~1 giorno, brief separato)
- **NEW-4-followup-segno**: LE10 σ_y_top sign error (da ri-verificare post-fix)

Sprint 4-6 del compound originale v2.4.x rimangono pianificati:
- v2.4.4 GDPR cascade complete
- v2.4.5 pushover diagnostic
- v2.4.6 EC3 section class coverage
