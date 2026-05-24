# v2.4.1-ec2-stirrups-fix · Report

**Data**: 2026-05-24
**Branch**: test
**Tipo**: bugfix verifica normativa (2° fix tecnico post audit v2.3.5)

## Sintesi
Chiuso bug #6 (P0 safety) dall'audit `v2.3.5-nafems-truth-audit`. Funzione
`shear_check` ora calcola `needs_stirrups` dalla domanda strutturale
(V_Ed vs V_Rd_c) invece che dalla presenza di armatura modellata.

Prima del fix l'API restituiva `needs_stirrups=False` (= "non ho modellato
staffe") anche con `UR > 1.0` (= "il taglio supera la resistenza") — output
**logicamente incoerente** che poteva indurre l'ingegnere a non progettare
staffe nonostante il fallimento a taglio.

## Task completati
- **T1**: estesa firma `shear_check` con `V_Ed: float | None = None` +
  `ShearResult.UR / V_Ed` opzionali; nuova logica `needs_stirrups`
- **T2**: API `verify_ext.py:96` wiring `V_Ed=req.V_Ed` alla chiamata
- **T3**: 5 test regressione (4 unit + 1 API integration end-to-end)
- **T4**: BACKLOG `#6` in Chiuso + questo report

## File toccati
- `backend/core/verification/ec2/shear.py` (+44/-4 righe)
- `backend/api/routes/verify_ext.py` (+6 righe)
- `backend/tests/verification/test_ec2_shear_v_ed.py` (nuovo, 140 righe)
- `BACKLOG.md` (`#6` aggiunto in Chiuso con dettaglio)
- `docs/v2_4_1_ec2_stirrups_fix_report.md` (nuovo)

## Quality gates
- ✅ 5/5 test in `test_ec2_shear_v_ed.py` (3.54s)
- ✅ Full backend pytest: **1403 PASS, 12 FAIL pre-esistenti**
  (baseline post v2.4.0bis: 1398 PASS, 12 FAIL → +5 nuovi test, 0 regression)
- ✅ Test EC2 esistenti `test_ec2_shear.py` continuano a passare
  (V_Ed=None backward-compat preservata)
- ✅ Esempio bug riprodotto e verificato fixato:

  ```bash
  # Smoke test diretto
  $ python -c "from core.verification.ec2.shear import shear_check; \
    r=shear_check(b_w=0.3, d=0.5, A_sl=10e-4, fck=25e6, A_sw=0.0, V_Ed=200e3); \
    print(f'needs={r.needs_stirrups}, UR={r.UR:.3f}')"

  # BEFORE v2.4.1: needs=False, UR=N/A  (incoerente)
  # AFTER  v2.4.1: needs=True,  UR=2.665 (coerente: serve fix strutturale)
  ```

### Quality gates NON eseguiti
- `tsc --noEmit` frontend: non necessario (nessun frontend touched)
- `vitest run`: non necessario (nessun frontend touched)

## Commit (4 + report)
- `44fa836` fix(ec2): shear_check needs_stirrups uses V_Ed (T1)
- `0b5dac6` fix(api): verify_ext wires V_Ed to shear_check (T2)
- `772a51e` test(ec2): regression tests for #6 stirrups V_Ed (T3)
- (T4 in commit corrente: BACKLOG + report)

## Comportamento prima vs dopo

### Prima (audit v2.3.5)

```python
# API request
POST /api/verify/ec2/shear
{ "b_w": 0.30, "d": 0.50, "A_sl": 10e-4, "fck": 25e6,
  "A_sw": 0.0, "V_Ed": 200e3 }

# Response
{
  "V_Rd": 75100, "V_Rd_c": 75100, "V_Rd_s": 0, "V_Rd_max": 328000,
  "needs_stirrups": false,    # <-- BUG: dice "non servono"...
  "V_Ed": 200000, "UR": 2.665, # <-- ...ma UR=2.665 dice "FAIL"!
  "status": "FAIL", "notes": "cot(θ)=2.5"
}
```

Frontend `EC2Panel.tsx` mostra: `[ UR 2.665 (rosso) ]  [ staffe Non nec. ]`

### Dopo (v2.4.1)

```json
{
  "V_Rd": 75100, "V_Rd_c": 75100, "V_Rd_s": 0, "V_Rd_max": 328000,
  "needs_stirrups": true,     // <-- FIX: servono strutturalmente
  "V_Ed": 200000, "UR": 2.665,
  "status": "FAIL", "notes": "cot(θ)=2.5"
}
```

Frontend `EC2Panel.tsx`: `[ UR 2.665 (rosso) ]  [ staffe Necessarie ]` — coerente.

## Backward compatibility

| Caller | V_Ed passato? | needs_stirrups dopo v2.4.1 |
|---|---|---|
| `verify_ext.py:96` (API) | sì (`req.V_Ed`) | `V_Ed > V_Rd_c` (strutturale) |
| `test_ec2_shear.py:126` (no_stirrups capacity) | no | `A_sw > 0` = False (legacy OK) |
| `test_ec2_shear.py:132` (with_stirrups) | no | `A_sw > 0` = True (legacy OK) |
| `test_ec2_shear.py:143` (stirrups_capped) | no | `A_sw > 0` = True (legacy OK) |

3/3 test esistenti continuano a passare senza modifiche. Frontend `EC2Panel.tsx`
legge stesso campo `needs_stirrups: boolean` — zero modifiche frontend.

## Note di design

### `V_Ed: float | None = None` non `V_Ed: float = 0.0`

Default `None` invece di `0.0` per distinguere semanticamente "non ho V_Ed
da passare" (legacy capacity-side) da "V_Ed=0 nessuna sollecitazione". Il
caso V_Ed=0 con la firma attuale produce `needs=False` correttamente,
distinto dal fallback A_sw>0 legacy.

### Niente deprecation warning

Il codepath `V_Ed=None` è ancora legittimo (test capacity-side che testano
solo V_Rd_c/V_Rd_s/V_Rd_max). NON deprecato a livello tecnico, solo
documentato come "informativo, non strutturalmente conclusivo".

### Campi additivi `UR` e `V_Ed` in `ShearResult`

Restano opzionali (`None`) quando V_Ed non è passato. Il dict di response
API serializza esplicitamente — i nuovi campi NON appaiono automaticamente
nella response se non richiesti. Per ora l'API restituisce ancora il suo
`UR` calcolato lato endpoint (riga 103), che coincide con `res.UR` ma è
mantenuto per stabilità contratto pre-v2.4.1.

## Prossimo passo

In base a priorità safety vs deliverable:

**Raccomandazione**: `v2.3.7-solver-internals-audit` (diagnostico tecnico shell)
— sblocca i fix più grossi del backlog:
1. LE1 anti-convergenza (NEW-1)
2. SHELL_Q4 vs SHELL_Q4_MITC dispatch (NEW-2)
3. SHELL_Q4_MITC LE10 deflessione zero (NEW-3)
4. LE10 postprocess σ_yy (NEW-4)

Alternative parallele (non bloccate da audit):
- `v2.4.2-legal-security`: GDPR DELETE /api/auth/me + rate limit login +
  4 security headers (~1-2 giorni)
- `v2.4.3-ec3-15-29-coverage`: gap EC3 section class parametric, EC5 timber
  classes, EC8 NTC18 soil_class (~3-5 giorni)
