# NAFEMS Truth Audit · v2.3.5 diagnostic

**Data**: 2026-05-24
**Branch**: test (SHA `bab8c5c` post `v2.3.4-quality-checkpoint`)
**Tipo**: diagnostic only — **zero modifiche** a solver, verifiche o test esistenti.
**Output script**: [`backend/scripts/nafems_truth_measurement.py`](../backend/scripts/nafems_truth_measurement.py) — log completo in `C:\Users\fedes\AppData\Local\Temp\nafems_measurement.log`.

> **Verdetto sintetico**: i sospetti dell'utente sono **confermati e peggiori del previsto**.
> LE1 errore reale **−32%** (target ±5%), LE10 σ_yy(D) misurato **0.000 MPa** (target −5.38 MPa = errore **−100%**), bug #30 matrice singolare **NON è gestito** (max|uy| = 1.76 × 10¹⁰ m su modello sottovincolato), bug #6 EC2 staffe **non determinato da V_Ed**. Cantilever + Euler buckling sono invece **OK a 0.000–0.001%**.

---

## Sezione 1 · Inventario suite NAFEMS

Cartelle test scoperte:

```
backend/tests/nafems/
├── conftest.py                              # helper assert_within_nafems_tolerance (esiste ma NON usato)
├── test_le1_elliptic_membrane.py            # 3 test
├── test_le2_cylindrical_cantilever.py       # 3 test
└── test_le10_thick_plate.py                 # 3 test

backend/tests/benchmarks/
├── test_nafems_elliptic.py                  # 6 test (TestNAFEMS_LE1, LE2, LE10) — versione "fixture"
├── test_cantilever_tip_load.py              # 5 test (Euler-Bernoulli)
├── test_cantilever_modal.py                 # 4 test (frequenze flessionali)
└── test_euler_buckling.py                   # 7 test (carico critico Eulero)
```

### Tabella inventory

| File | Test | Target dichiarato | Cosa misura davvero | Tolerance enforced | Classificazione |
|---|---|---|---|---|---|
| `nafems/test_le1_elliptic_membrane.py` | `test_le1_with_q4_mesh_8x8` | σ_y(D) = 92.7 MPa ±5% | σ_y(D) | `SIGMA_TARGET/5 ≤ ≤ SIGMA_TARGET*5` = **±400%** | ⚠ **LOOSE** |
| `nafems/test_le1_elliptic_membrane.py` | `test_le1_with_tri3_mesh_8x8` | σ_y(D) = 92.7 MPa ±5% | σ_y(D) | **±400%** | ⚠ **LOOSE** |
| `nafems/test_le1_elliptic_membrane.py` | `test_le1_convergence_h_refinement` | errore diminuisce raffinando | errore relativo | `err_fine ≤ err_coarse × 1.5` — permette **DEGRADO +50%** | ⚠ **ANTI-CONVERGENZA** |
| `nafems/test_le2_cylindrical_cantilever.py` | `test_le2_beam3d_20_elements` | δ_tip Euler-Bernoulli | δ_tip | ±2% | ✅ **STRICT** |
| `nafems/test_le2_cylindrical_cantilever.py` | `test_le2_convergence_n_elements` | err diminuisce | err relativo | tutti `< 5%` + `e[-1] ≤ e[0] × 1.2` | ✅ **STRICT** |
| `nafems/test_le2_cylindrical_cantilever.py` | `test_le2_reaction_at_clamp` | R_y = −F | R_y | `abs(R+F) < 1e-9` | ✅ **STRICT** |
| `nafems/test_le10_thick_plate.py` | `test_le10_with_shell_q4_standard` | σ_yy(D) = −5.38 MPa ±10% | **max\|uz\|** | `0 < max_uz < w_est × 10` (ordine di grandezza) | ❌ **NOT MEASURED** (misura cosa diversa dal target NAFEMS) |
| `nafems/test_le10_thick_plate.py` | `test_le10_h_refinement_decreases_displacement_error` | benchmark σ_yy | max\|uz\| varia ≤ 3× | `mx/mn < 3.0` | ❌ **NOT MEASURED** |
| `nafems/test_le10_thick_plate.py` | `test_le10_deflection_scales_linearly_with_pressure` | benchmark σ_yy | linearità elastica (`w(2p) ≈ 2 w(p)`) | `±5%` sul ratio | ❌ **NOT MEASURED** (testa una tautologia algebrica) |
| `benchmarks/test_nafems_elliptic.py` | `TestNAFEMS_LE1::test_le1_stress_at_point_D` | σ_y(D) = 92.7 MPa | σ_y(D) | `±400%` (`/5 .. *5`) | ⚠ **LOOSE** (duplicato di `nafems/`) |
| `benchmarks/test_nafems_elliptic.py` | `TestNAFEMS_LE10::test_le10_deflection_positive` | σ_yy(D) target | `max\|uz\|` | `< w_estimate × 10` | ❌ **NOT MEASURED** |
| `benchmarks/test_cantilever_tip_load.py` | `test_cantilever_tip_deflection_convergence` | δ = PL³/3EI | δ_tip | `rel=0.02` (±2%) | ✅ **STRICT** |
| `benchmarks/test_cantilever_modal.py` | `test_cantilever_flexural_freq_mode` | f_n analitica | f_n | `rel=0.02` (modo 1), `0.05` (2-3) | ✅ **STRICT** |
| `benchmarks/test_euler_buckling.py` | `test_pinned_pinned_column_K1` | N_cr = π²EI/L² | N_cr | `rel=0.02` (±2%) | ✅ **STRICT** |

**Conteggio**:
- ✅ STRICT: **11 test** (cantilever, Euler, LE2)
- ⚠ LOOSE: **4 test** (LE1 × 3 + LE1 nel benchmarks duplicato)
- ❌ NOT MEASURED: **4 test** (LE10 × 3 + LE10 nel benchmarks duplicato)

### Helper inutilizzato

`backend/tests/nafems/conftest.py` definisce `assert_within_nafems_tolerance(value, target, tol_pct, name)` con la logica corretta:
```python
err = abs(value - target) / abs(target)
assert err * 100 <= tol_pct + 1e-9
```

Ma **non è invocato in nessuno dei test LE1/LE10** (`grep` su `tests/nafems/` ↦ 0 occorrenze). Helper morto.

---

## Sezione 2 · Misurazione vera vs target NAFEMS

Eseguito `python backend/scripts/nafems_truth_measurement.py` (output completo in
log file).

### LE1 — Elliptic Membrane (target σ_y(D) = 92.7 MPa ±5%)

```
Element       Mesh    σ_y meas (MPa)   Err %    NAFEMS ±5%   NAFEMS ±10%
shell_q4      4x4         38.84       −58.1%       FAIL ✗       FAIL ✗
shell_q4      6x6         48.68       −47.5%       FAIL ✗       FAIL ✗
shell_q4      8x8         55.02       −40.6%       FAIL ✗       FAIL ✗
shell_q4      10x10       59.39       −35.9%       FAIL ✗       FAIL ✗
shell_q4      12x12       62.56       −32.5%       FAIL ✗       FAIL ✗    ← BEST
shell_q4      16x16       30.05       −67.6%       FAIL ✗       FAIL ✗    ← REGRESSION
shell_q4      20x20       22.37       −75.9%       FAIL ✗       FAIL ✗    ← REGRESSION
shell_q4_mitc 4x4         38.84       −58.1%   <-- IDENTICO a shell_q4
shell_q4_mitc 6x6         48.68       −47.5%   <-- IDENTICO a shell_q4
shell_q4_mitc 12x12       62.56       −32.5%   <-- IDENTICO a shell_q4
shell_q4_mitc 20x20       22.37       −75.9%   <-- IDENTICO a shell_q4
tri3          12x12       62.03       −33.1%   (best per tri3)
```

**Diagnosi LE1**:

1. **Errore minimo realizzato = −32.5%** (q4 mesh 12×12). Target NAFEMS ufficiale è ±5%.
   → Il solver è **6.5× fuori tolleranza NAFEMS** anche col mesh più favorevole.
2. **Anti-convergenza grave**: errore aumenta da 12×12 (−32.5%) a 16×16 (−67.6%) a 20×20 (−75.9%).
   Mesh più fine → risultato PEGGIO. Sintomo di mesh degenere o assemblaggio carichi nodali sbagliato (forse `quarter_ellipse_with_hole` non genera elementi coerenti per `nx ≥ 16`).
3. **SHELL_Q4_MITC dà ESATTAMENTE gli stessi valori di SHELL_Q4** per ogni mesh.
   → Il dispatch su MITC non sta cambiando la formulazione, oppure SHELL_Q4 già usa MITC internamente, oppure MITC non è attivo nell'assembler. **Da indagare**.

### LE2 — Cylindrical Cantilever (target Euler-Bernoulli δ_tip = 2.021 nm ±2%)

```
n_div    δ_tip (m)       Err %    ±2%
   2    2.021015e-09    -0.000%   PASS ✓
   4    2.021015e-09    -0.000%   PASS ✓
  10    2.021015e-09    +0.000%   PASS ✓
  20    2.021015e-09    +0.000%   PASS ✓
  40    2.021015e-09    +0.000%   PASS ✓
 100    2.021015e-09    -0.000%   PASS ✓
```

**Diagnosi LE2**: ✅ **PASS** perfetto a tutte le mesh. BEAM3D è essenzialmente esatto su problema Euler-Bernoulli. Le claim del README sono onorate.

### LE10 — Thick Plate (target σ_yy(D) = −5.38 MPa ±10%)

```
Element           Mesh    σ_yy@D (MPa)    max|uz| (mm)    σ-err %    ±10% NAFEMS
shell_q4          4x4         0.000           5.032       +100.0%       FAIL ✗
shell_q4          6x6         0.000           5.913       +100.0%       FAIL ✗
shell_q4          8x8         0.000           6.386       +100.0%       FAIL ✗
shell_q4          10x10       0.000           6.662       +100.0%       FAIL ✗
shell_q4          16x16       0.000           7.030       +100.0%       FAIL ✗
shell_q4_mitc     4x4         0.000           0.000       +100.0%       FAIL ✗  ← MITC ROTTO
shell_q4_mitc     6x6         0.000           0.000       +100.0%       FAIL ✗
shell_q4_mitc     16x16       0.000           0.000       +100.0%       FAIL ✗
```

**Diagnosi LE10**:

1. **σ_yy(D) misurato = 0.000 MPa per OGNI mesh, OGNI element type**.
   Target NAFEMS = −5.38 MPa.
   Errore: **−100%** (cioè il solver scrive zero quando dovrebbe leggere −5.38).
   → O lo stress σ_y in punto D è davvero zero (impossibile per piastra in flessione), o il punto D è interno alla mesh e gli elementi che lo toccano non hanno σ_y assegnato, o c'è un bug nel postprocess `element_stresses` per shell.
2. **SHELL_Q4_MITC su LE10**: `max|uz| = 0.000 mm` per OGNI mesh!
   Cioè la piastra MITC sotto pressione **non si flette affatto**. Bug critico in MITC dispatch su LE10.
3. Per SHELL_Q4 normale, `max|uz|` cresce con mesh fine (5.0 → 7.0 mm) — sembra ragionevole come fisica ma il σ_yy non viene letto.

**Conclusione LE10**: i test attuali misurano `max|uz|` invece di `σ_yy(D)` *perché altrimenti fallirebbero al 100%*. La copertura LE10 è completamente cosmetic.

### Cantilever tip (target δ = PL³/3EI ±2%)

```
n_div    δ_tip (m)           Err %     ±2%
   1    -5.128907e-04        -0.000%   PASS
   2..100  identici          ±0.000%   PASS
```

**Diagnosi**: ✅ **PASS** perfetto. Solver BEAM2D esatto su Euler-Bernoulli.

### Euler buckling (target N_cr = π²EI/(KL)²)

```
Case                       K     n_div  N_cr meas (N)   N_cr teor   Err %
pinned-pinned              1.0    10     269875.63     269872.00   +0.001%
pinned-pinned              1.0    20     269872.22     269872.00   +0.000%
pinned-pinned              1.0    40     269872.01     269872.00   +0.000%
fixed-free (cantilever)    2.0   10..40   67468.00      67468.00   +0.000%
```

**Diagnosi**: ✅ **PASS** perfetto. K_G beam con interpolazione cubica (Bathe FEM
Procedures §6.6.3) funziona come dichiarato.

---

## Sezione 3 · Audit verifiche normative

### EC2 (calcestruzzo)

| File test | Assertions | Tolerance pattern dominante | Stato |
|---|---:|---|---|
| `tests/verification/test_ec2_bending.py` | 16 | `pytest.approx(value, rel=0.01..0.02)` (1-2%) | ✅ STRICT |
| `tests/verification/test_ec2_shear.py` | 18 | `pytest.approx(value, rel=0.02..0.05)` (2-5%) | ✅ STRICT |

**Bug #6 — "Staffe non nec." quando UR>1** — **CONFERMATO LATO CODICE**:

`backend/core/verification/ec2/shear.py` riga 138-146:
```python
if A_sw > 0:
    Vs = V_Rd_s(b_w=b_w, d=d, A_sw=A_sw, s=s, fywk=fywk, cot_theta=cot_theta)
    V_Rd = min(Vs, Vmax)
    needs = True
else:
    Vs = 0.0
    V_Rd = Vc
    needs = False  # ← needs_stirrups = False indipendentemente da V_Ed!
```

Il campo `needs_stirrups` viene messo a `False` **solo perché l'utente NON ha
fornito staffe in input** (A_sw=0). Non si confronta affatto `V_Ed` con `V_Rd_c`
per decidere se servono. Significa:

- Utente fornisce A_sw=0 + V_Ed grande → la funzione restituisce
  `V_Rd = V_Rd_c`, `needs_stirrups=False` (← bugged) e UR = V_Ed / V_Rd_c > 1.0.
- Sul frontend questa combinazione "needs_stirrups=False + UR > 1" appare come
  "Staffe non necessarie" anche in casi dove sono **obbligatorie** per equilibrio.

**Severity reale**: P0 (safety — il falso "non servono staffe" può portare a
collassi a taglio). Fix tipico: ricalcolare `needs` come `V_Ed > V_Rd_c` e
sollevare warning se A_sw insufficiente.

**Test attuali non coprono questa casistica** — `test_ec2_shear.py` testa solo
combinazioni con A_sw>0 o V_Ed<V_Rd_c, mai V_Ed>V_Rd_c con A_sw=0.

### EC3 (acciaio)

| File test | Assertions | Tolerance | Stato |
|---|---:|---|---|
| `test_ec3_api.py` | 19 | (nessun approx — più structural assertions) | ✅ |
| `test_ec3_classification.py` | 14 | `rel=1e-9` e `rel=0.02` | ✅ STRICT |
| `test_ec3_combined.py` | 19 | `rel=1e-9` e `rel=0.05` | ✅ STRICT |
| `test_ec3_ltb.py` | 14 | `rel=1e-9` per N_cr, soft per chi_LT | ✅ STRICT |
| `test_ec3_resistance.py` | 25 | `rel=1e-9` e `rel=0.005` (0.5%) | ✅ VERY STRICT |
| `test_ec3_stability.py` | 22 | `abs=0.005` per chi/Phi | ✅ STRICT |

**Bug #14 — EC3 section classification sistematico (HEA/IPE → C4 errato)**:
audit interno v2.3.2 (file `frontend/public/audit/report.md`) cita "EC3 section
class pattern" come bug critico — l'errore non risulta nei test perché
**i test verificano singole sezioni mirate** (es. IPE 220) che funzionano,
ma **non c'è un test parametrico esaustivo** che giri sui 40+ profili IPE/HEA/HEB
con S275/S355/S460. Confermo: **bug non rilevato dai test attuali**.

### EC5 (legno)

`backend/tests/verification/test_ec5_resistance.py` — 27 assertions, `rel=0.005`
(0.5%). **STRICT** sui valori che testa.

**Bug #15 — Solo 2 timber classes funzionano**: confermato indirettamente:
- Test coprono solo C24, C30, GL24h, GL28h (4 classi)
- Codice (`backend/core/verification/ec5/timber.py`) supporta in teoria tutte
  le classi EN 338 (C14...C50, D18...D70, GL24h/c...GL36h/c = 25+ classi)
- L'audit interno v2.3.2 ha provato `audit_BUG_RC.mjs` su 27 classi e solo
  **C24/C30/GL24h/GL28h** restituiscono UR_m valido — le altre o sono
  hard-codate come "not supported" o restituiscono ValueError.

**Severity reale**: P1 (gap di copertura — non collassa nulla, ma chi prova
ad usare C18 o D40 non riesce). Test NON copre il caso "classe non supportata".

### EC8 (sismica)

`backend/tests/verification/test_ec8.py` — 33 assertions, `rel=1e-3` e `rel=1e-9`.
**VERY STRICT** sui valori dello spettro.

**Bug #29 — NTC18 soil_class ignorato**:
- Codice (`backend/services/providers/seismic/usgs_proxy.py` o equivalente)
  forza sempre `soil_category='A'` indipendentemente dall'input `soil_class`.
- L'audit v2.3.2 (file `audit_BUG_RC.mjs`) ha testato 3 siti (Roma, Catania,
  Milano) con `soil_class='C'` forzato e il backend ha sempre restituito
  `site_params.soil_category='A'`.
- Test EC8 attuali NON simulano una chiamata API end-to-end con soil_class
  variabile — testano solo le formule pure dello spettro Sd(T,S,η).

**Severity reale**: P1 (gap di feature — l'input utente è silently ignorato).
NTC18 cap. 3 richiede soil-specific amplification, quindi è un errore
significativo per uso professionale.

### NTC18 (combinazioni carichi)

`backend/tests/combinations/test_ntc2018.py` — 42 assertions, `rel=1e-3`. STRICT.
Coverage dei coefficienti ψ₀/ψ₁/ψ₂ e combinazioni SLE/SLU. Probabilmente OK.

---

## Sezione 4 · Check matrice singolare nel solver

### Stato attuale

`backend/core/solver/static_solver.py` riga 25-50, metodo `solve()`:

```python
K = assembler.assemble_stiffness()                                           # riga 29
F = assembler.build_load_vector(...)                                          # riga 31
K_ff, _, F_f, free_dofs, fixed_dofs = assembler.apply_boundary_conditions(...)  # riga 33
u_full = np.zeros(assembler.n_dofs)
if K_ff.shape[0] == 0:
    ...
else:
    u_free = spla.spsolve(K_ff.tocsc(), F_f)        # ← riga 41
    u_full[free_dofs] = u_free
F_internal = K @ u_full
```

**Check esistenti**:
- **NO** try/except attorno a `spla.spsolve`
- **NO** calcolo del numero di condizionamento κ(K_ff)
- **NO** check sul rank di K_ff
- **NO** check su NaN/Inf nel risultato `u_free`
- Scipy emette `MatrixRankWarning: Matrix is exactly singular` ma è solo
  warning (non bloccante) e non viene catturato.

### Test case riproducibile (eseguito da `nafems_truth_measurement.py`)

**CASO 1 · 2 nodi beam2D, ZERO vincoli** (rigid body free):
```
→ solver gira a buon fine
→ MatrixRankWarning emesso ma NON bloccante
→ max|uy| = NaN  (silent NaN nei displacements!)
```
**Risultato**: utente riceve un oggetto `StaticResults` con `displacements` =
NaN, senza alcuna indicazione che qualcosa è andato storto. **Bug critico**:
silent failure produce dati invalidi.

**CASO 2 · 5 nodi beam2D, SOLO 1 PINNED a x=0** (sottovincolato — meccanismo):
```
→ solver gira a buon fine, no warning, no error
→ max|uy| = 1.760e+10 m
         = 17.6 MILIARDI di metri (assurdo fisicamente)
```
**Risultato**: utente riceve `displacements` con valori ENORMI ma plausibili
come "numero" — l'app può anche disegnare la deformata, ZERO indicazione
di meccanismo. **Bug critico**: silent corruption.

**CASO 3 · 2 nodi sovrapposti (L=0)**:
```
→ ValueError: Beam2D ha lunghezza nulla.
```
**Risultato**: ✓ correttamente bloccato in fase di costruzione element
stiffness. L'unico controllo difensivo presente.

### Conclusione T4

**Bug #30 CONFERMATO con severità superiore al previsto**:
- Solver non blocca i due casi più comuni di matrice singolare/sottovincolata
  (no constraints, single pinned su mensola 5-nodi)
- Restituisce NaN o spostamenti assurdi senza warning all'utente finale
- Lo `MatrixRankWarning` di scipy è emesso ma rimane in stderr/log file e non
  arriva mai al frontend né al `StaticResults`.

**Severity reale**: P0 (safety — l'ingegnere può salvare un modello "risolto"
con NaN/valori folli e usarlo per verifiche normative). Fix tipico: wrap
`spsolve` con try/except + check NaN/Inf finale + raise eccezione
`SingularMatrixError("Sistema sottovincolato o struttura labile")`.

---

## Sezione 5 · Audit v2.3.2 — Document trace

### File trovati

| Path | Contenuto |
|---|---|
| `frontend/public/audit/report.md` (229 righe) | Executive report, 18 bug confermati, verdetto €2000/mese: NO, equo €200-300/mese. ⭐ Pubblicato online: https://fea-pro.fly.dev/audit/ |
| `frontend/public/audit/checklist.md` (418 righe) | Checklist completa 280 test con stato PASS/FAIL/TODO |
| `.codex-temp/AUDIT_EXEC_REPORT.md` | Copia identica del report (workspace temp Codex) |
| `.codex-temp/audit_checklist.md` | Copia identica della checklist |
| `docs/v2_3_4_quality_checkpoint/consolidated_bug_list.md` | Output brief precedente (15 nuovi finding + 16 bug noti pre-audit) |
| `docs/v2_3_4_quality_checkpoint/L1_dead_clicks_report.md` | L1 crawler results |
| `docs/v2_3_4_quality_checkpoint/L2_functional_flows_report.md` | L2 flow results |

L'audit v2.3.2 **esiste** ed è già pubblicato online. Lista 16 bug noti è
documentata in `frontend/public/audit/report.md` sezione 4.

### Bug noti pre-audit (confermati)

Estratti dal tasks list + audit doc + verificati in questo brief:

| Bug | Severity originale | File:riga sospetto | Stato post-T4 |
|---|---|---|---|
| #2 export PDF/XLSX broken | P0 | `frontend/src/utils/exportXlsx.ts` + reportlab | non investigato in T4 (UI) |
| #6 EC2 staffe non nec. quando UR>1 | P0 | `backend/core/verification/ec2/shear.py:138-146` | **CONFERMATO** T3 |
| #9 Undo/Redo v2.3.0 broken | P0 | `frontend/src/store/historyStore.ts` | non investigato in T4 (UI) |
| #12 NAFEMS LE1 fake PASS | P0 etico | `backend/tests/nafems/test_le1_*.py` | **CONFERMATO** T1+T2 (errore reale −32%, tolerance test ±400%) |
| #14 EC3 section class sistematico | P1 | `backend/core/verification/ec3/classification.py` | gap-test confermato T3 (test mirati, mancano parametrici) |
| #15 EC5 solo 2 timber classes | P1 | `backend/core/verification/ec5/timber.py` | confermato T3 (4 classi vs 25+ nominali) |
| #16 EC2 punching/crack/deflection MISSING | P1 | `backend/core/verification/ec2/` | confermato (no punching.py, crack.py, deflection.py) |
| #17 SEC: 4 security headers mancanti | P0 | `backend/main.py` (no HSTS/CSP/X-Frame/X-Content-Type) | non in scope T4 |
| #19 EC4/EC6/EC7/EC9 mancano | P1 | `backend/core/verification/` (no ec4/, ec6/, ec7/, ec9/) | confermato by `ls` |
| #22 GDPR no DELETE /api/auth/me | P0 | `backend/api/routes/auth.py` | non in scope T4 |
| #28 NO rate limiting login brute force | P0 | `backend/api/routes/auth.py` (no `Depends(ratelimit)`) | non in scope T4 |
| #29 NTC18 soil_class ignorato | P1 | `backend/services/providers/seismic/` | **CONFERMATO** T3 (audit v2.3.2 audit_BUG_RC.mjs) |
| #30 Engine non ferma su matrice singolare | P0 | `backend/core/solver/static_solver.py:41` | **CONFERMATO** T4 (NaN + spostamenti folli senza warning) |

**Bug aggiuntivi emersi da questo T1-T4 (non in lista precedente)**:

| ID | Descrizione | Severity | Evidenza |
|---|---|---|---|
| **NEW-1** | LE1 anti-convergenza: mesh 20×20 errore −76% vs mesh 12×12 errore −32% | P0 (correctness) | T2 LE1 misure |
| **NEW-2** | SHELL_Q4 e SHELL_Q4_MITC danno valori IDENTICI su LE1 — MITC dispatch o non attivo o coincide con Q4 | P1 | T2 LE1 misure |
| **NEW-3** | SHELL_Q4_MITC su LE10 produce max\|uz\| = 0 esatto per ogni mesh — completamente broken | P0 | T2 LE10 misure |
| **NEW-4** | LE10 `element_stresses[*].sigma_y` = 0 ovunque, ma `max\|uz\|` è non-zero → postprocess stress shell broken | P0 | T2 LE10 misure |
| **NEW-5** | Helper `assert_within_nafems_tolerance` definito in `conftest.py` ma mai chiamato da nessun test NAFEMS | P2 (code smell) | T1 |
| **NEW-6** | Test `test_le10_deflection_scales_linearly_with_pressure` testa una identità algebrica (linearità in p) — passerebbe anche se il solver restituisse sempre zero o sempre 42 | P1 (dead test) | T1 |

---

## Sezione 6 · Sintesi diagnostica

### Severity reale (dopo investigazione)

| Bug | Severity originale | Severity reale dopo investigazione | Conferma |
|---|---|---|---|
| #12 NAFEMS LE1 fake PASS | P0 etico | **P0 etico CONFERMATO + peggiore** — errore reale −32% (target ±5%) | T1+T2 |
| #12bis NAFEMS LE10 fake PASS | non in lista | **P0 etico NUOVO** — σ_yy(D) misurato 0 vs target −5.38 MPa (errore −100%), test misura cosa diversa dal target | T1+T2 |
| NEW-1 LE1 anti-convergenza | non in lista | **P0 correctness NUOVO** — mesh fine produce risultato PEGGIORE → bug nella mesh generation o nei carichi nodali equivalenti | T2 |
| NEW-3 LE10 MITC `max\|uz\|`=0 | non in lista | **P0 NUOVO** — dispatch MITC su LE10 è completamente rotto | T2 |
| #30 Matrice singolare | P0 safety | **P0 safety CONFERMATO + peggiore** — NaN/spostamenti folli senza warning, frontend riceve dati invalidi come "risultato risolto" | T4 |
| #6 EC2 staffe non nec. | P0 safety | **P0 safety CONFERMATO** — `needs_stirrups` non dipende da V_Ed, può dire "non servono" quando UR > 1.0 | T3 |
| #14 EC3 section class | P1 | **P1 CONFERMATO come test gap** — bug nel solver presente ma test mirati non lo scoprono (mancano parametrici 40+ profili × 3 acciai) | T3 |
| #15 EC5 solo 4 classes | P1 | **P1 CONFERMATO** — 4/27 classi supportate, ma SILENT (no error message a utente) | T3 |
| #29 NTC18 soil_class ignorato | P1 | **P1 CONFERMATO** — input utente silently ignored | T3 |
| Altri (#2, #9, #17, #22, #28) | vari | non in scope di T1-T4, restano come da audit v2.3.2 | — |

### Raccomandazioni per Brief sprint v2.4.x

#### PRIORITY 1 · Honesty fix (~2-4 ore)

**Obiettivo**: rimuovere claim "NAFEMS PASS" non verificate prima di accettare
qualsiasi feature nuova.

- README.md: rimuovere badge "NAFEMS 5/5 PASS" e sezione "δ_static err < 6%" finché non c'è
  prova. Sostituire con tabella stato reale:
  - LE1: errore −32% (non ±5%)
  - LE10: σ_yy non misurato dai test
  - LE2 cantilever: ✓ PASS 0%
  - Euler buckling: ✓ PASS 0.001%
- CHANGELOG.md: aggiungere v2.3.5-nafems-truth-audit con questo report linkato.
- BACKLOG.md: spostare BL-6 (NAFEMS LE1/LE2/LE10) da "chiuso v1.3 (D1)" a
  "parzialmente chiuso (LE2 + Euler + Cantilever OK, LE1 e LE10 da rifare)".
- Trust Layer: aggiungere badge "DRAFT — NAFEMS LE1/LE10 non passa target ufficiale"
  per tutti i report che usano shell.

#### PRIORITY 2 · Solver safety (~5-7 giorni)

Sulla base di T2/T3/T4:

**A. Bug #30 Singular Matrix Check** (~1 giorno):
- Wrap `spsolve` con try/except + check NaN/Inf
- Calcolare κ(K_ff) preventivo con `scipy.sparse.linalg.norm` se piccolo, o
  estimator dedicato se grande
- Raise `SingularMatrixError` con messaggio italiano + suggerimento vincoli

**B. LE1 anti-convergenza + SHELL_Q4_MITC dispatch** (~3-4 giorni):
- Investigare `backend/core/mesh/quarter_ellipse_with_hole` per nx ≥ 16
- Verificare assemblaggio K shell Q4 vs Q4_MITC (forse stesso codepath?)
- Test parametrico esaustivo solver shell prima/dopo fix
- Aggiungere LE1 mesh validation come unit test al solver, non al benchmark

**C. LE10 σ_yy(D) postprocess** (~1-2 giorni):
- `element_stresses` shell: indagare perché `sigma_y` è 0 quando `uz` non lo è
- Probabilmente postprocess shell prende solo membrana, non bending → ricalcolare
  σ_yy come membrana + bending stress in fibra estrema

**D. Bug #6 EC2 staffe** (~half day):
- `shear_check`: ricalcolare `needs_stirrups = V_Ed > V_Rd_c`
- Aggiungere parametro `V_Ed` obbligatorio
- Test case dedicato per UR>1 senza staffe → deve raise warning

**E. Bug #14 EC3 section class** (~1-2 giorni):
- Test parametrico 40+ profili × {S275, S355, S460} → tabella attesa
- Investigare codepath classification

**F. Bug #15 EC5 timber classes** (~1 giorno):
- Coverage matrice classe × resistance/stability/connection
- Se classe non supportata: raise `NotImplementedError` chiaro

**G. Bug #29 NTC18 soil_class** (~half day):
- Verificare propagazione soil_class da API → spectrum → site_params
- Test E2E: POST seismic con soil_class='C' deve restituire S=1.15+

#### PRIORITY 3 · Legal/security (~1-2 giorni)

(Da audit v2.3.2, fuori scope diretto di T1-T4)
- GDPR DELETE /api/auth/me
- Rate limit login
- Security headers (HSTS / CSP / X-Frame-Options / X-Content-Type-Options)

#### PRIORITY 4 · UI bugs (~3-5 giorni)

I 10 P1 di `docs/v2_3_4_quality_checkpoint/consolidated_bug_list.md`.

### Stima totale sforzo fix

| Scenario | Sforzo | Note |
|---|---|---|
| **Ottimistico** | 1-2 settimane | Se LE1 anti-convergenza è solo problema di mesh gen (1 file) e MITC dispatch è 2-3 righe + LE10 σ_yy è solo postprocess |
| **Realistico** | **2-3 settimane** | Più probabile: LE1 richiede investigazione element + assembly, LE10 richiede ripasso postprocess shell |
| **Pessimistico** | 4-5 settimane | Se emergono bug a cascata in elements + assembler + integration (es. Gauss points stress recovery rotto su tutti gli shell) |

### Cosa chiede l'utente upstream

1. **STOP ship feature nuove** finché brief honesty fix non chiuso (~24-48 ore).
2. **Sprint v2.4.0-honesty-fix PRIMA di v2.4.1-safety-critical** — il primo è
   solo documenti, il secondo è codice solver.
3. **Pattern check da introdurre**: ad ogni inizio sprint feature, verifica
   BACKLOG-P0 ancora presente. Se presente, NO nuove feature.
4. **NAFEMS truth check** come unit test permanente: il nuovo
   `backend/scripts/nafems_truth_measurement.py` può diventare un test
   `backend/tests/benchmarks/test_nafems_truth.py` chiamato nel CI con
   `pytest.skip` finché LE1/LE10 non passano davvero, e poi attivato.

---

## Allegati

- **Log measurement completo**: `C:\Users\fedes\AppData\Local\Temp\nafems_measurement.log`
- **Script measurement** (riproducibile): `backend/scripts/nafems_truth_measurement.py`
- **Audit pre-esistente v2.3.2**: `frontend/public/audit/report.md` e
  `checklist.md`, pubblicato online su https://fea-pro.fly.dev/audit/

---

**Output finale**: diagnosi completa. Da qui si possono scrivere brief di fix
mirati (`v2.4.0-honesty-fix`, `v2.4.1-safety-critical`, `v2.4.2-legal-security`,
`v2.4.3-ui-bugs`). Nessuna modifica al codice produzione è stata effettuata.
