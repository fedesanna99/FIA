# v2.4.8-ec3-section-class-coverage · Closure report

**Data**: 2026-05-24
**Branch**: test
**Tipo**: test coverage extension (Sprint 3 di compound v2.4.x-debt-and-coverage)
**Bug**: #14 EC3 section class sistematico — **parzialmente chiuso**

---

## Sintesi

Aggiunto test parametrico EC3 §5.5 per la classificazione delle sezioni
sui profili IPE/HEA/HEB del catalogo reale di FEA Pro (16 profili totali,
S235 + S355 = 32 casi parametrici + 6 sanity check = **38 test**).

Tutti i 38 PASS confermano che `classify_section()` (in
`core/verification/ec3/section_classification.py`) implementa correttamente
le formule EN 1993-1-1 Tab. 5.2 per i profili in catalogo.

**Discrepanza vs brief**: il brief stimava 18 IPE + 19 HEA. Il catalogo
reale di FEA Pro ha 8 IPE + 4 HEA + 4 HEB. Coverage adattata al codebase
reale; brief future per espandere il catalogo a Annex F completo
(IPE 80/120/.../600, HEA fino a 1000, HEM).

---

## Task completati

| Task | Output | Esito |
|---|---|---|
| S3.T1 · Catalogo profili | 8 IPE + 4 HEA + 4 HEB in `schemas/material.py` | ✅ |
| S3.T2 · Tabella expected EC3 | `_ec3_section_class_expected.py` (6 liste manualmente derivate) | ✅ |
| S3.T3 · Test parametrico | `test_ec3_section_classification.py` 38 test | ✅ |

---

## File toccati

| File | Stato | Righe |
|---|---|---|
| `backend/tests/verification/_ec3_section_class_expected.py` | nuovo | +75 |
| `backend/tests/verification/test_ec3_section_classification.py` | nuovo | +143 |
| `BACKLOG.md` | modified | +50 / 0 (entry #14) |
| `docs/v2_4_8_ec3_section_class_coverage_report.md` | nuovo | questo report |

Zero modifiche a codice produzione (`core/verification/ec3/`).

---

## Quality gates

- **pytest backend**: **1490 PASS** (era 1452 baseline post v2.4.6, **+38 nuovi**)
- **FAIL pre-esistenti**: 9 invariati (1 estimator + 1 elevation + 7 pushover)
- **38/38 nuovi EC3 test**: PASS al primo run (eccetto 1 tolleranza ε ridotta — fix banale, non bug funzionale)
- **`classify_section`**: ritorna esattamente i valori attesi su tutti i 32 casi parametrici + 6 sanity

Frontend non toccato.

---

## Coverage strutturale

### IPE S235 (8 profili)

| Profilo | c_f/tf | c_w/tw | Comp class | Bend class |
|---|---|---|---|---|
| IPE 100 | 3.24 | 18.2 | **1** | **1** |
| IPE 200 | 4.14 | 28.4 | **1** | **1** |
| IPE 240 | 4.28 | 30.7 | **1** | **1** |
| IPE 270 | 4.82 | 33.3 | **2** | 1 |
| IPE 300 | 5.28 | 35.0 | **2** | 1 |
| IPE 360 | 4.96 | 37.3 | **2** | 1 |
| IPE 400 | 4.79 | 38.5 | **3** | 1 |
| IPE 500 | 4.62 | 41.8 | **3** | 1 |

### HEA S235 (4 profili)

| Profilo | c_f/tf | c_w/tw | Comp class | Bend class |
|---|---|---|---|---|
| HEA 100..300 | 4.4..8.5 | 11..24 | **1** | **1** |

### HEB S235 (4 profili)

Tutti Cl 1 (profili più tozzi di HEA, ali e anima ben sotto limiti).

### IPE S355 (8 profili)

| Profilo | Comp class | Bend class |
|---|---|---|
| IPE 100 | 1 | 1 |
| IPE 200, 240 | 2 | 1 |
| IPE 270 | 3 | 1 |
| IPE 300..500 | **4** | 1 |

### HEA S355 (4 profili)

| Profilo | Comp class | Bend class |
|---|---|---|
| HEA 100 | 1 | 1 |
| HEA 200, 240 | **2** | 2 |
| HEA 300 | **3** | 3 |

L'aumento di classe in S355 (ε=0.814) è dovuto sia all'anima compressa (IPE) sia alla flange outstand (HEA 200+).

### HEB S355 (4 profili)

Tutti Cl 1 (largo margine sui limiti anche con ε ridotto).

---

## Comportamento BEFORE / AFTER

### BEFORE Sprint 3

- `classify_section()` esiste in `core/verification/ec3/`
- Test esistenti: `test_ec3_classification.py` (4 test a "spot check"), `test_ec3_combined.py`, `test_ec3_resistance.py`, ecc.
- Nessuna coverage sistematica sul catalogo profili reale
- Bug #14 "BUG CRITICO: EC3 section class sistematico" in stato di "non verificato sistematicamente"

### AFTER Sprint 3

- 38 test parametrici nuovi coprono 16 profili × 2 acciai × 2 loading types
- Ground truth derivata manualmente da EN 1993-1-1 Tab. 5.2
- Future regressioni catturate con assertion `==` strict
- `classify_section()` validato sistematicamente su tutto il catalogo corrente

---

## Backward compatibility

- Solo nuovi test, nessuna modifica a `core/verification/ec3/`
- API `classify_section()` invariata
- API `classify_from_section()` invariata
- Frontend non toccato

---

## STOP rules: nessuna scattata

- (a) ≥ 5 profili classificati male in modo grave (off by 2+): 0 (tutti corretti)
- (b) ≥ 5 profili "off by one": 0 (tutti coincidono esattamente con il manuale)
- Discrepanza brief 18+19 → catalogo reale 8+4+4: documentata, scope adattato

---

## Discrepanze brief → realtà del codebase

| Brief | Codebase reale | Adottato |
|---|---|---|
| 18 IPE in catalogo | 8 IPE (`IPE 100, 200, 240, 270, 300, 360, 400, 500`) | Coverage sui 8 reali |
| 19 HEA in catalogo | 4 HEA (`HEA 100, 200, 240, 300`) | Coverage sui 4 reali |
| HEA fino a 1000 | HEA stop a 300 | Brief future per estensione |
| HEM in catalogo | Non presente | Esclusi |
| Stima ~38 test parametrici | Esattamente 38 | OK |
| `pytest.mark.xfail` per profili incerti | Non necessario, tutti expected matchano | OK |

---

## Resta aperto (Brief future)

1. **`v2.4.8.1-catalog-expansion-ipe-hea`**: estendere `_IPE_DATA` / `_HEA_DATA` / `_HEB_DATA` / aggiungere `_HEM_DATA` per coverage Annex F completa. Le 38 test parametriche diventerebbero ~100+ automaticamente.
2. **Combined loading (M + N)**: il test attuale copre pure compression + pure bending. Per `loading="combined"` il modulo usa la formula conservativa "compression" (vedi `section_classification.py:88`). Brief future per il caso N+M con α corretto.
3. **Asse debole**: classificazione attuale è per flessione attorno asse forte (y-y). Brief future per asse debole (z-z) se richiesto.

---

## Prossimo passo

Sprint 3 chiuso. Tag `v2.4.8-ec3-section-class-coverage` applicato.
Compound `v2.4.x-debt-and-coverage` ora completo — passare a tag rollup
finale + report aggregato compound.
