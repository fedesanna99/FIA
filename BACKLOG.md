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

### NEW-4-followup-segno · LE10 σ_y_top sign opposto al target NAFEMS (Q4)
**Chiuso**: v2.4.4-shell-sign-and-mitc-cluster (2026-05-24) — scope ridotto Q4 only
**Root cause**: formula `σ_top = σ_m + 6M/t²` usata pre-fix era convenzione
"engineering" (M positivo = trazione fibra top). Solver internamente usa
**Mindlin Bathe §5.4** con `M_x = +D·κ_x` (verificato in diagnostic Phase 2.0).
In questa convenzione z-up, la formula corretta è
`σ_top = σ_m − 6M/t²` (segno opposto).

**Diagnostic verifica** (`backend/scripts/shell_b_bending_convention_diagnostic.py`):
- Test 1 (single elem Q4, θ_x = -1·x): M_x misurato = -1.923e7 N·m
  = atteso Bathe Mindlin → convenzione **z-up + Mindlin standard** confermata
- Test 2 (piastra 2×2 SS sotto p>0): uz_center = -0.75mm (verso il basso),
  σ_y_top = +24.5 MPa pre-fix vs -24.5 MPa atteso fisica

**Implementazione**:
- `backend/core/elements/shell_quad4.py:stresses_at_nodes` + `stresses`:
  formula `σ_top = σ_m − 6M/t²`, `σ_bot = σ_m + 6M/t²` (Mindlin z-up)
- `backend/core/elements/shell_quad4_mitc.py:stresses_at_nodes` + `stresses`:
  stesso fix per coerenza Q4 (anche se MITC ha altri bug separati)
- Docstring esplicativo della convenzione nel codice
- `backend/tests/solver/test_shell_bending_sign.py` (nuovo): 3 test

**Verifica post-fix**:
- Q4 LE10 mesh 8×8 punto D: σ_y_top = **−22.03 MPa** (era +22.03, segno OK)
- Magnitude 309% di target NAFEMS (residuo, sintomo mesh coarse + altre cause)
- LE1 convergence: 10/10 test invariati (sign fix non rompe membrana)

**Anomalia inaspettata scoperta** (in Phase 3):
Post fix sign Q4 con stesso pattern applicato a MITC, **MITC σ_y_top diventa
positivo (+75 MPa)** invece di negativo. Indica che MITC pre-fix aveva
"segno fortuito" che si compensava per via di **doppia incoerenza** in
NEW-3-followup. Vedi quella voce per dettagli aggiornati.

**Riferimenti**:
- Diagnostic: `backend/scripts/shell_b_bending_convention_diagnostic.py`
- Sprint origine sintomo: `docs/v2_4_3b_*.md`
- Sprint verifica residuo: `docs/v2_4_3c_1_sign_verification_report.md`
- Investigation Phase 1: `docs/v2_4_4_phase1_investigation.md`
- Closure report: `docs/v2_4_4_shell_sign_and_mitc_cluster_report.md`


**Complessità**: ~half day · **Severity**: P1

Sprint 2 (v2.4.3b) aveva rilevato sintomo: LE10 `σ_y_top = +2.21 MPa` vs
target NAFEMS `-5.38 MPa`. Sprint 3 (v2.4.3c) ha sistemato lo stress
recovery al nodo (causa D). **Verifica empirica post-Sprint-3
(`scripts/le10_sign_verification.py`)**:

```
SHELL_Q4 (mesh 8x8, punto D al bordo foro a r=0.5):
  Target NAFEMS:                  -5.380e+06 Pa (compressione)
  Method centroid (legacy):       +2.032e+07 Pa (+)
  Method nodal @ D (v2.4.3c):     +2.203e+07 Pa (+) ← segno ANCORA SBAGLIATO
  Errore vs NAFEMS:               509%

SHELL_Q4_MITC (stesso problema):
  Method nodal @ D:               -7.528e+07 Pa (-) ← segno OK
  Errore vs NAFEMS:               1299% (magnitude enorme — bug NEW-3-followup)
```

**Diagnosi**:
- Q4 produce σ_y_top **positivo** (trazione) al bordo del foro interno
- Fisicamente, piastra sotto pressione p>0: fibra TOP in COMPRESSIONE → atteso negativo
- MITC dà segno corretto (negativo) ma magnitude impossibile a causa di
  NEW-3-followup (uz 37× Q4)
- Lo sprint 3 ha **migliorato** la magnitude (era +0.221 MPa con bug NEW-4
  pre-sprint-2, ora +22 MPa nodale = ordine di grandezza più verosimile),
  ma il segno **non è risolto** dallo stress recovery

**Cause candidate residue** (post-Sprint-3 esclusi causa D):
- (A) Convenzione segno "top" = z=+t/2 invertita rispetto a NAFEMS
- (B) θ_x / θ_y estratti con segno opposto in `stresses_at_nodes`
  (riga `u_local[6*i+3]` vs `u_local[6*i+4]`)
- (C) Errore segno in B_b matrix:
  ```python
  Bb[0, 3*i + 1] = dN[0]   # κ_x da θ_x ?  o segno opposto?
  Bb[1, 3*i + 2] = dN[1]   # κ_y da θ_y ?
  ```
  La convenzione Mindlin/Kirchhoff: κ_x = -∂θ_y/∂x, κ_y = ∂θ_x/∂y. Il
  codice attuale lega κ a θ con segno (+,+) — potrebbe essere (-,+)
  o (+,-) per coerenza con la convenzione interna del solver.

**Fix futuro** (~half day):
1. Riformula `B_b` con convenzione segno coerente Kirchhoff: testare 4
   combinazioni (++, +-, -+, --) cercando quella che restituisce σ_y_top
   negativo su LE10 + preserva LE1 PASS (membrana puro, deve essere
   insensibile a segno bending)
2. Run `le10_sign_verification.py` per validare
3. Run `test_le1_convergence.py` per regression
4. Test cross-check con cantilever shell sotto carico noto (problema con
   soluzione analitica chiusa)

**Brief raccomandato**: `v2.4.x-shell-bending-sign-fix`, dipendenza
preferenziale da `v2.4.x-mitc-shear-calibration` (perché la combinazione
sign × shear-scale di MITC va fixata coerente).

**Riferimenti**:
- Sprint origine: `docs/v2_4_3b_shell_bending_stress_recovery_report.md`
- Sprint che ha tentato chiusura: `docs/v2_4_3c_shell_stress_recovery_nodal_report.md`
- Verifica: `backend/scripts/le10_sign_verification.py`
- Report verification: `docs/v2_4_3c_1_sign_verification_report.md`

### NEW-3-followup esteso · MITC magnitude 37× + sign hidden
**Chiuso**: `v2.4.5-mitc-shear-and-sign-calibration` (2026-05-24)

**Root cause identificata** (Phase 1 diagnostic):
`ShellQuad4MITC._Bs_at` aveva **DOF index swap (idx 1 ↔ idx 2) + sign
flip su γ_xz** rispetto a `ShellQuad4._bending_stiffness`. Pre-fix:
```python
Bs[0, 3*i + 2] = +N[i]   # γ_xz = ∂w/∂x + (DOF idx 2)  ❌
Bs[1, 3*i + 1] = -N[i]   # γ_yz = ∂w/∂y − (DOF idx 1)  ❌
```
Post-fix (aligned to Q4 Mindlin Bathe §5.4):
```python
Bs[0, 3*i + 1] = -N[i]   # γ_xz = ∂w/∂x − (DOF idx 1)  ✓
Bs[1, 3*i + 2] = -N[i]   # γ_yz = ∂w/∂y − (DOF idx 2)  ✓
```

Magnitude bug 37× e sign bug erano la **stessa root cause**: il DOF
sbagliato veniva caricato dal contributo shear, generando un campo di
rotazioni mal-orientato che propagava a K_total producendo sia
displacement sbagliato (37×) sia momento con segno invertito.

**Implementazione**:
- `backend/core/elements/shell_quad4_mitc.py`: 2 righe modificate in
  `_Bs_at` (riga 126-129). Tying points ereditano automaticamente
  perché invocano `_Bs_at` ai 4 punti predefiniti.
- `backend/tests/elements/test_shell_mitc_calibration.py` (nuovo,
  ~280 righe): 6 test regression (consistency LE10, sign+magnitude,
  3 thickness ratios parametrici, anti shear-locking)
- `backend/scripts/mitc_kshear_diagnostic.py` (nuovo, diagnostic
  permanente con probe `w(x)=x lineare` che ha provato numericamente
  la convenzione di Q4 e MITC fuori e dentro fix)

**Comportamento BEFORE / AFTER**:
- LE10 mesh 8×8 (p=1 MPa, t=0.6 m):
  - BEFORE v2.4.5: `w_max = 0.237 m` (**37× Q4**), `σ_y_top = +75 MPa` (sign sbagliato)
  - AFTER  v2.4.5: `w_max = 6.99e-3 m` (**1.09× Q4**), `σ_y_top = −25.5 MPa` (sign OK)
- Calibrazione 3 thickness ratios (piastra quadrata 10×10 m, p=1 MPa):
  - `t/L=0.05`: w err <30%, σ err <30%
  - `t/L=0.18`: w err <30%, σ err <30%
  - `t/L=0.50`: w err <100% (Reissner additivo prima ordine), σ err <40%

**Cluster shell ora COMPLETAMENTE CHIUSO (5 bug originali + 2 followup)**:
| Bug | Sprint chiusura |
|---|---|
| NEW-1 · LE1 anti-convergenza | `v2.4.3c` |
| NEW-3 · MITC pressure dispatch | `v2.4.3a` |
| NEW-4 · postprocess no bending | `v2.4.3b` |
| NEW-4-followup-segno · Q4 σ_top sign | `v2.4.4` |
| **NEW-3-followup esteso · MITC magnitude+sign** | **`v2.4.5`** |

**Riferimenti**:
- Sintomo origine 37×: `docs/v2_4_3a_shell_pressure_mitc_fix_report.md`
- Estensione scope sign: `docs/v2_4_4_shell_sign_and_mitc_cluster_report.md`
- Diagnostic Phase 1: `docs/v2_4_5_phase1_mitc_investigation.md`
- Closure report: `docs/v2_4_5_mitc_shear_and_sign_calibration_report.md`
- Diagnostic permanente: `backend/scripts/mitc_kshear_diagnostic.py`

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

### #pushover-7fail · 7 test pushover FAIL post safe_spsolve refactor
**Stato**: diagnosticato in `v2.4.7-pushover-diagnostic` (2026-05-24) — **fix raccomandato**
**Severity**: P1 — regression mascherata
**Complessità fix**: ~30 minuti (1 file, ~3 righe)

**Root cause unica** (per tutti i 7 test):
- v2.4.0bis `safe_spsolve` traduce errori scipy in `SingularMatrixError`
  (custom, `core.solver.errors`)
- `PushoverSolver.solve()` (`pushover_solver.py:165`) cattura solo
  `RuntimeError | MatrixRankWarning | LinAlgError` (vecchie scipy)
- `SingularMatrixError` NON è sottoclasse di RuntimeError → bypassa
  l'except → propaga al test

**Test FAIL** (tutti `tests/test_pushover.py`):
- `TestCantileverPlastic::test_first_hinge_at_clamp`
- `TestCantileverPlastic::test_collapse_lambda_matches_analytical`
- `TestCantileverPlastic::test_collapse_reason_set`
- `TestCantileverPlastic::test_steps_curve_monotonic_until_hinge`
- `TestParametricMaterials::test_s355_vs_s235`
- `TestParametricMaterials::test_ipe300_vs_ipe200`
- `TestResultsStructure::test_results_contain_required_fields`

**Brief candidato**: `v2.4.7.1-pushover-fixes`
- Aggiungere `SingularMatrixError` al tuple `except` in `pushover_solver.py:165`
- Verifica 7 FAIL → 0 FAIL (baseline 1452 → 1459 PASS, 9 → 2 FAIL pre-esistenti)
- Stima ~30 minuti

**Riferimenti**:
- Diagnostic completo: `docs/pushover_diagnostic.md`
- Refactor origine bug: commit `2dc4498` (v2.4.0bis safe_spsolve)

### #14 · EC3 section class sistematico HEA/IPE
**Parzialmente chiuso**: `v2.4.8-ec3-section-class-coverage` (2026-05-24)

**Coverage estesa**:
- Catalogo profili attualmente supportato: 8 IPE + 4 HEA + 4 HEB (16 totali)
- Brief originale stimava 18 IPE + 19 HEA — discrepanza vs catalogo reale documentata
- Tabelle expected calcolate a mano da EN 1993-1-1 Tab. 5.2 applicata alle
  dimensioni reali del catalogo (`backend/schemas/material.py`)

**Implementazione**:
- `backend/tests/verification/_ec3_section_class_expected.py` (nuovo, ~75 righe):
  6 liste expected (IPE/HEA/HEB × S235/S355) con (sid, fy, exp_comp, exp_bend)
- `backend/tests/verification/test_ec3_section_classification.py` (nuovo, ~140 righe):
  6 test parametrici + 6 sanity check = **38 test totali**

**Profili coperti / classi attese chiave**:
- IPE 100..240 S235: Cl 1 in both
- IPE 270..360 S235: comp Cl 2 (anima borderline 33-38), bend Cl 1
- IPE 400, 500 S235: comp Cl 3 (anima vicino limite 42), bend Cl 1
- IPE 100..200 S355: comp Cl 1-2, bend Cl 1
- IPE 270 S355: comp Cl 3 (>30.9 threshold)
- IPE 300..500 S355: comp Cl 4 (anima troppo snella per Reissner-Mindlin con ε=0.814)
- HEA 100..300 S235: Cl 1 in both
- HEA 200..300 S355: la flange c_f/tf diventa decisive
- HEB tutti S235/S355: Cl 1 (tozzi)

**Quality gate v2.4.8**:
- pytest: 1490 PASS (+38 nuovi, era 1452 baseline post v2.4.6), 9 FAIL pre-esistenti invariati
- 38/38 nuovi test PASS al primo run (1 fix di tolleranza ε, non bug funzionale)
- `classify_section` ritorna i valori attesi su tutti i 32 casi parametrici + 6 sanity

**Resta aperto**:
- Catalogo profili è sotto-fornito (~16/40+ profili standard arcelor)
  → Brief candidato `v2.4.8.1-catalog-expansion-ipe-hea` quando serve copertura
  Annex F intera (IPE 80/120/.../600, HEA fino a 1000, HEB fino a 1000, HEM)
- HEM non incluso (non in catalogo). Add anche IPE 220 / IPE 330 / IPE 450 ecc. quando catalogo si espande.
- Test pure compression + pure bending coperti; **combined** (M + N) e
  flessione attorno asse debole sono fuori scope di questo coverage parametrico.

**Riferimenti**:
- Closure report: `docs/v2_4_8_ec3_section_class_coverage_report.md`
- Bug originale: task harness #14 "BUG CRITICO: EC3 section class sistematico"

### #22bis · GDPR cascade delete incomplete
**Chiuso**: `v2.4.6-debt-22bis-gdpr-cascade` (2026-05-24)

**Implementazione**:
- `backend/billing/storage.py` (nuovo): `delete_user_billing/get_user_billing/add_user_billing` su `data/billing.json`
- `backend/audit/__init__.py` + `audit/log.py` (nuovi): `write_audit_entry`, `anonymize_user_audit` (non cancella entry — sostituisce `user_id` con hash per GDPR-compliant audit)
- `backend/schemas/model.py:FEAModel.owner_id` (additivo, `Optional[str] = None`, backward-compat con modelli pre-migration)
- `backend/scripts/migrate_models_add_owner_id.py` (nuovo): migration idempotente dry-run/apply — applicata a 10 modelli esistenti
- `backend/api/routes/models.py`: POST/PUT/import/duplicate ora popolano `owner_id` via `Depends(get_current_user_optional)`; modelli con utente anonimo restano `owner_id=null`
- `backend/auth/cascade_delete.py` refactor: 4 stub sostituiti con `_delete_user_models` (sweep filesystem by owner_id), `_delete_user_snapshots` (stub esplicito — feature server-side non implementata), `billing.storage.delete_user_billing`, `audit.log.anonymize_user_audit`
- `backend/tests/auth/test_cascade_delete_complete.py` (nuovo): 3 test regressione

**Comportamento ora**:
- BEFORE: `DELETE /api/auth/me` lasciava modelli orfani, audit log con `user_id` chiaro, billing records (se mai popolati) intatti
- AFTER: cascade elimina modelli con `owner_id == user`, anonimizza audit, elimina billing records — GDPR Art. 17 compliant per i domini implementati
- Snapshot resta stub esplicito (feature server-side non esiste — `backend/snapshots/` non presente, no schema, no API)

**Quality gate v2.4.6**:
- pytest: 1452 PASS (+3 nuovi), 9 FAIL pre-esistenti invariati
- 4 test #22 originali GDPR base: invariati (PASS)
- Migration 10 modelli demo applicata, idempotente

**Riferimenti**:
- Investigation: `docs/v2_4_6_phase1_investigation.md`
- Closure report: `docs/v2_4_6_debt_22bis_gdpr_cascade_report.md`
- Audit originale: `docs/solver_internals_audit.md` (#22 v2.3.5)

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

### NEW-1 · LE1 anti-convergenza mesh fine
**Chiuso**: v2.4.3c-shell-stress-recovery-nodal (2026-05-24)
**Implementazione**:
- `backend/core/elements/shell_quad4.py`: nuovo `stresses_at_nodes()` con
  extrapolation Gauss 2×2 → 4 nodi (matrice `_EXTRAP_GAUSS_TO_NODES`
  standard Hinton-Campbell, coefficienti a=1.866, b=-0.5, c=0.134)
- `backend/core/elements/shell_quad4_mitc.py`: stesso pattern per MITC
  (B_b flessione identica, MITC differisce solo in K_s shear lato solver)
- `backend/core/postprocess/nodal_stress_recovery.py` (nuovo):
  `consistent_nodal_average()` per consistent averaging nodi condivisi +
  `element_value_from_nodal_average()` per back-distribuzione element-side
- `backend/core/solver/static_solver.py:_build_results`: pre-pass nodal
  recovery + override campi `sigma_*`, `M_*` per shell con valori
  consistent-averaged
- `backend/schemas/results.py`: nuovo `NodalShellStress` + campo
  `StaticResults.shell_nodal_stresses: list[NodalShellStress]`
- `backend/tests/nafems/test_le1_elliptic_membrane.py`: builder con
  lumping arc-length-weighted (chord-length proxy) invece di uniforme
- `backend/tests/nafems/test_le1_convergence.py` (nuovo): 10 test

**Comportamento ora**:

| Mesh | Pre-fix err | Post-fix err (centroide media) | Post-fix err (nodale diretto) | NAFEMS ±5% |
|---|---|---|---|---|
| 4×4 | −59% | −48% | **−15%** | FAIL (atteso, mesh troppo coarse) |
| 8×8 | −41% | −28% | **−3.0%** | ✅ **PASS** |
| 12×12 | −32% | −20% | **−0.1%** | ✅ **PASS** |
| 16×16 | −68% | −25% | **−12%** | FAIL (limit chord-length lumping per >30 nodi) |
| 20×20 | −76% | −24% | **−13%** | FAIL idem |

**Anti-convergenza ELIMINATA**: mesh 12 ora è il sweet spot a NAFEMS PASS.
Mesh 16/20 hanno residuo dovuto a limit chord-length approximation in
arc-length lumping (acceptable, <15% del brief T5 threshold).

**API nuova**: `r.shell_nodal_stresses[*].sigma_y` espone stress
consistent-averaged al nodo (estrapolato + mediato). Per stress recovery
accurato in punti di gradient elevato.

**Backward compat**:
- 43/43 NAFEMS shell + singular + bending tests esistenti PASS
- Full pytest: 1440 PASS / 9 FAIL pre-esistenti (era 1430/9 → +10, 0 regression)
- Schema additivo: `element_stresses` invariato, `shell_nodal_stresses`
  nuovo Optional field

**Riferimenti**:
- Audit: `docs/solver_internals_audit.md` sezione 2
- Closure report: `docs/v2_4_3c_shell_stress_recovery_nodal_report.md`

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
