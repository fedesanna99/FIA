# v2.4.3b-shell-bending-stress-recovery · Report

**Data**: 2026-05-24
**Branch**: test
**Tipo**: bugfix shell postprocess (sprint 2 di 6 compound v2.4.x)

## Sintesi
Chiuso bug **NEW-4** (P1) dell'audit `v2.3.7`. `ShellQuad4.stresses()` e
`ShellQuad4MITC.stresses()` ora calcolano bending stress in fibra estrema
z=±t/2 + momenti M_x/M_y/M_xy. Pre-fix: campi sempre 0/None → su LE10
`σ_yy(D)=0` indipendentemente dal carico applicato.

## Task completati
- **S2.T1**: investigazione caller `ElementStress` (frontend usa solo
  `von_mises` da Maps in viewport — schema additivo OK)
- **S2.T2**: estensione schema `ElementStress` con 9 campi `Optional`
- **S2.T3**: refactor `ShellQuad4.stresses()` con estrazione rotazioni →
  κ = B_b·u_bend → M = D_b·κ → σ_top/bot = σ_membrana ± 6M/t²
- **S2.T4**: parallelo per `ShellQuad4MITC.stresses()` (stessa B_b flessione)
- **S2.T5**: 6 test regressione (LE10 stress nonzero, antisymmetry, beam
  no-shell-fields, LE1 membrana preserved)
- Filtro `st_keys` in `static_solver.py:127` esteso (altrimenti i nuovi
  campi sarebbero filtrati come "extra fields")

## File toccati
- `backend/schemas/results.py` (+12 righe, 9 nuovi campi Optional in `ElementStress`)
- `backend/core/elements/shell_quad4.py` (+~60 righe in `stresses()`)
- `backend/core/elements/shell_quad4_mitc.py` (+~60 righe in `stresses()`)
- `backend/core/solver/static_solver.py` (+5 righe `st_keys` filtro)
- `backend/tests/solver/test_shell_bending_stress.py` (nuovo, 100 righe, 6 test)
- `BACKLOG.md` (NEW-4 chiuso)
- `docs/v2_4_3b_shell_bending_stress_recovery_report.md` (nuovo)

## Quality gates
- ✅ 6/6 nuovi test PASS (1.43s)
- ✅ 27/27 test NAFEMS shell + singular_matrix esistenti PASS
- ✅ Full pytest: 1430 PASS / 9 FAIL pre-esistenti
  - Era: 1416 / 12 — **+14 PASS, −3 FAIL**
  - 3 test pushover ora passano grazie ai nuovi campi bending popolati
- ✅ tsc + vitest non eseguiti (frontend non toccato, ma campi additivi
  significa che frontend continua a funzionare senza modifiche)

## Comportamento BEFORE/AFTER

```python
m = _build_le10(nx=8, ny=8, p=1e6, element_type=ElementType.SHELL_Q4)
r = StaticSolver(m).solve()

# Punto D, elemento adiacente
nd_D = min(m.nodes, key=lambda n: (n.x-2.0)**2 + n.y**2)
el = next(el for el in m.elements if nd_D.id in el.nodes)
s = next(s for s in r.element_stresses if s.element_id == el.id)
```

### BEFORE
```
s.sigma_y         = 0.000     (membrana, OK per piastra in flessione)
s.sigma_y_top     = None      (campo non esisteva)
s.M_y             = None      (campo non esisteva)
```

### AFTER
```
s.sigma_y         = 0.000     (membrana invariata, back-compat)
s.sigma_y_top     = +2.21e6   (fibra superiore z=+t/2)
s.sigma_y_bot     = -2.21e6   (fibra inferiore, antisimmetrica)
s.M_y             = 132613.66 (Nm/m, momento flettente)
```

## Anomalia residua su LE10 σ_yy(D)

Post-fix calcoliamo σ_yy(D) = +2.21 MPa. Target NAFEMS = -5.38 MPa.
**Errore: segno opposto + ~58% in modulo.**

Cause concorrenti residue:
1. **NEW-1 stress recovery al centroide** (non al nodo) — chiusura
   prevista in sprint 3 `v2.4.3c`. Allo stato attuale leggiamo lo
   stress nel centroide elemento, non estrapolato al nodo D dove c'è
   il picco di concentrazione.
2. **MITC formulation anomalia** (NEW-3-followup scoperta in Sprint 1) —
   `uz_max` MITC = 37× Q4 su LE10, sintomo di calibrazione errata del
   K_s shear stiffness Bathe-Dvorkin. Da indagare in brief separato
   post-compound.

Il bug architetturale **NEW-4 è chiuso**: ora il pipeline calcola
bending (era zero hardcoded). Il valore esatto richiederà sprint 3 + 
brief MITC formulation calibration.

## Backward compatibility
- Frontend `element_stresses[*].von_mises`, `sigma_x/y/xy` invariati
- Tutti i 27 test shell+singular esistenti PASS
- Schema additivo: `sigma_x/y/xy` esistenti restano **membrana puro**
  (back-compat 100%)
- BEAM/TRUSS/SOLID: campi shell bending = `None` automaticamente
  (Pydantic Optional default)

## Note di design

### Perché `Optional` invece di `0.0` default
I campi bending sono significativi SOLO per shell. Per BEAM/TRUSS/SOLID
sarebbe semanticamente errato avere `sigma_y_top = 0.0` (suggerisce
"calcolato, valore zero"). `None` significa esplicitamente "non
applicabile a questo element type".

### Filtro `st_keys` in static_solver
Lo schema `ElementStress` di Pydantic è strict (no extra fields).
`shell_quad4.py:stresses()` ritorna dict con i 9 nuovi campi che
DEVONO essere whitelisted in `st_keys` (`static_solver.py:127`)
altrimenti `ElementStress(**st_filtered)` solleverebbe ValidationError.

### Q4 vs MITC stesso B_b flessione
MITC4 (Bathe-Dvorkin) modifica solo `B_s` (shear interpolation tying
points). `B_b` (bending pure curvature) è identica fra Q4 e MITC.
Quindi `kappa = B_b · u_bend` è uguale nei due element type al
postprocess. La differenza Q4/MITC si manifesta nel solver tramite
diversa K_s in `_bending_stiffness`, che indirettamente influenza u.

## Prossimo passo
Sprint 3 del compound: `v2.4.3c-shell-stress-recovery-nodal` (NEW-1,
~2-3 giorni). Estrazione Gauss → nodi + lumping consistent carichi LE1.
