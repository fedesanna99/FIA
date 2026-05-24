# v2.4.3c.1-followup-sign-verification · Report

**Data**: 2026-05-24
**Tipo**: verification-only (no production code changes)
**Branch**: test

## Sintesi
Verifica empirica del sign error LE10 σ_y_top: **Scenario B confermato**.
Il bug NEW-4-followup-segno NON è chiuso dallo stress recovery nodale
(v2.4.3c). Resta aperto come bug separato in B_b matrix (Q4) e in
formulation MITC (NEW-3-followup, magnitude).

## Risultato

### Q4 standard (`SHELL_Q4`, mesh 8×8)
```
Target NAFEMS:                  -5.380e+06 Pa  (compressione)
Method centroid (legacy):       +2.032e+07 Pa  (+)
Method nodal @ D (v2.4.3c):     +2.203e+07 Pa  (+)  ← segno SBAGLIATO
Errore vs NAFEMS:               509%
SEGNO MATCHA TARGET: NO ✗
```

### MITC (`SHELL_Q4_MITC`, mesh 8×8)
```
Target NAFEMS:                  -5.380e+06 Pa
Method nodal @ D (v2.4.3c):     -7.528e+07 Pa  (-)  ← segno OK
Errore vs NAFEMS:               1299% (magnitude impossibile)
SEGNO MATCHA TARGET: YES ✓ (ma magnitude inaffidabile per NEW-3-followup)
```

## Punto D rilevato
- Nodo 37 @ (0.354, 0.354), distanza dal centro = 0.5 m
- Geometricamente: bordo del foro interno (raggio r=0.5) della variante
  semplificata `_build_le10` (a_i = b_i = 0.5)
- Fisicamente: zona libera dove la piastra può flettersi sotto pressione

## Diagnosi

**Sprint 3 (v2.4.3c) ha migliorato la magnitude** dell'errore:
- Pre-sprint-2: σ_y_top = +0.221 MPa (bug NEW-4, calcolato come zero+bending~0)
- Post-sprint-2: σ_y_top = +2.21 MPa (sintomo originale segnalato)
- Post-sprint-3: σ_y_top = +22.03 MPa al nodo D (ordine di grandezza fisico)

**Ma il segno resta sbagliato per Q4**.

Causa primaria sospetta: **convenzione segno B_b matrix Kirchhoff/Mindlin**.

Il codice attuale lega curvature a rotazioni con:
```python
Bb[0, 3*i + 1] = dN[0]   # κ_x da θ_x (riga ∂/∂x di θ_x ?)
Bb[1, 3*i + 2] = dN[1]   # κ_y da θ_y
Bb[2, 3*i + 1] = dN[1]   # κ_xy da θ_x ∂/∂y
Bb[2, 3*i + 2] = dN[0]   # κ_xy da θ_y ∂/∂x
```

Convenzione standard Kirchhoff: `κ_x = -∂θ_y/∂x`, `κ_y = +∂θ_x/∂y` o
varianti (dipende dall'orientazione θ). Il codice attuale ha (+,+) senza
segni meno → probabile sign mismatch nella riga di κ_x o nella convenzione
θ_x/θ_y.

## Scenario: B (segno SBAGLIATO per Q4, MAGNITUDE OK per MITC)

→ **NEW-4-followup-segno resta APERTO** come bug separato in B_b matrix.

→ Brief candidato: `v2.4.x-shell-bending-sign-fix` (~half day):
1. Testare 4 combinazioni segno B_b (++, +-, -+, --) su LE10
2. Validare che LE1 (membrana puro) resti PASS NAFEMS
3. Cross-check con cantilever shell soluzione analitica

→ Dipendenza preferenziale da `v2.4.x-mitc-shear-calibration`: la
combinazione `sign × shear-scale` di MITC va fixata coerentemente per
evitare doppio fix.

## File creati
- `backend/scripts/le10_sign_verification.py` (verifica permanente,
  ri-eseguibile post fix futuri)
- `docs/v2_4_3c_1_sign_verification_report.md` (questo)

## Quality gate
- ✅ Zero modifiche a codice produzione
- ✅ Verification script eseguito su entrambi Q4 e MITC
- ✅ BACKLOG.md aggiornato con voce `NEW-4-followup-segno` APERTA

## Prossimo passo

Cluster shell **parzialmente stabilizzato**:
- ✅ NEW-1 (anti-convergenza) — chiuso v2.4.3c
- ✅ NEW-3 (MITC dispatch) — chiuso v2.4.3a
- ✅ NEW-4 (postprocess no bending) — chiuso v2.4.3b
- ⚠ **NEW-3-followup** (MITC magnitude) — aperto
- ⚠ **NEW-4-followup-segno** (Q4 sign B_b) — aperto, confermato qui

Sequenza fix raccomandata:
1. `v2.4.x-mitc-shear-calibration` (NEW-3-followup, ~1 giorno)
2. `v2.4.x-shell-bending-sign-fix` (NEW-4-followup-segno, ~half day)

Oppure parallelo se più tempo. Entrambi devono passare LE1 NAFEMS PASS
come pre-condition (back-compat).
