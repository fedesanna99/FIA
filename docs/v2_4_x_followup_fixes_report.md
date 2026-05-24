# v2.4.x-followup-fixes (compound) · Report

**Data**: 2026-05-24
**Branch**: test (SHA finale: `f5bb0a1`)
**Tipo**: compound 3 sprint follow-up quick (~1 giorno backend)
**Tag rollup**: `v2.4.x-followup-fixes`

---

## Sintesi

Chiusi tutti i quick win pendenti del compound precedente `v2.4.x-debt-and-coverage`:

| # | Sprint | Esito |
|---|---|---|
| 1 | `v2.4.7.1-pushover-fixes` | ✅ **7 FAIL chiusi** in 2 righe |
| 2 | `v2.4.8.1-catalog-expansion-ipe-hea-heb-hem` | ✅ **+74 profili** EN Annex F |
| 3 | `v2.4.8.2-catalog-materials-extension` | ✅ **+5 cls grades + materials facade** |

**Risolti direttamente 2 Paoletto findings P0 UX**: #5 (catalogo sezioni) e #7 (catalogo materiali).

---

## Sprint 1 · `v2.4.7.1-pushover-fixes` (commit `4bfbcba`)

### Risultato
- **7 FAIL pushover risolti**, baseline 1490 → 1497 PASS, 9 → 2 FAIL
- Root cause da diagnostic v2.4.7: `PushoverSolver.solve()` non catturava `SingularMatrixError` (custom exception introdotta dal refactor v2.4.0bis `safe_spsolve`)

### Fix · 2 righe in `pushover_solver.py`
```python
from .errors import SingularMatrixError                  # +1 riga import
except (RuntimeError, SingularMatrixError,               # +1 riga al tuple
        spla.MatrixRankWarning, np.linalg.LinAlgError) as e:
```

Sotto il limite STOP rule (max 5 righe).

### Tag: `v2.4.7.1-pushover-fixes`

---

## Sprint 2 · `v2.4.8.1-catalog-expansion-ipe-hea-heb-hem` (commit `135a05d`)

### Risultato
- **+74 profili I-section** (catalogo 16 → 90, ~100% EN Annex F)
- **Test parametrico EC3 esteso 38 → 186** (90 profili × 2 acciai + sanity), tutti PASS al primo run
- Source: EN 10365:2017 + Arcelor Mittal European Sections handbook

### Coverage profili

| Serie | Pre | Post | Aggiunti |
|---|---|---|---|
| IPE | 8 | 18 | +10 (80, 120, 140, 160, 180, 220, 330, 450, 550, 600) |
| HEA | 4 | 24 | +20 (120..1000) |
| HEB | 4 | 24 | +20 (120..1000) |
| HEM | 0 | 24 | +24 (intera serie 100..1000, prima assente) |
| **Totale** | **16** | **90** | **+74** |

### Classificazione EC3 risultante
- Sezioni compatte (IPE small, HEA fino a 500, HEB fino a 600, HEM fino a 800): **Cl 1**
- Sezioni con web borderline 33ε..38ε (IPE 270-360 S235, HEA 550-700, HEB 650-700): **Cl 2-3**
- Sezioni snelle (IPE 550+, HEA 800+, HEB 1000, HEM 900+): **Cl 4** comp (web slender)

### Tag: `v2.4.8.1-catalog-expansion-ipe-hea-heb-hem`

---

## Sprint 3 · `v2.4.8.2-catalog-materials-extension` (commit `f5bb0a1`)

### Risultato

Scoperto durante S3.T1 che il catalogo materiali era **già più completo del previsto dal brief**:
- Acciai EN 10025-2: **5/5 già presenti** (S235/S275/S355/S420/S460 — niente da aggiungere)
- Calcestruzzi: 6 grades preesistenti (C20/25..C45/55), mancavano solo C50/60 e estensioni

Lavoro effettivo:
- **+5 calcestruzzi**: C12/15, C16/20 (low-end) + **C50/60**, C55/67, C60/75 (high-end)
- Catalogo calcestruzzi: 6 → **11 grades** (coverage range EC2 Tab. 3.1 dal C12 al C60)
- Modulo nuovo `backend/materials/__init__.py` (facade API canonica EN)
- 30 nuovi test in `tests/materials/test_catalog_extension.py`

### Modulo facade `materials/`

```python
from materials import get_steel_grade, get_concrete_grade, get_timber_grade
from materials import list_steel_grades, list_concrete_grades, list_timber_grades
from materials import MaterialNotFoundError, get_material_by_id

get_steel_grade("S420")    # -> Material (era backend/MATERIALS_DB["steel_s420"])
get_concrete_grade("C50/60")
get_timber_grade("GL28h")
```

### ⚠ Tag remoto Sprint 3 misplaced (da fixare)

`v2.4.8.2-catalog-materials-extension` su `origin` è stato pushato troppo
presto a causa di un errore di parsing PowerShell sul commit message
multi-line del compound chain. Punta a SHA `135a05d` (Sprint 2 commit)
invece che a `f5bb0a1` (Sprint 3 effettivo).

**Stato attuale**:
- Tag locale `v2.4.8.2-catalog-materials-extension` corretto a `f5bb0a1` ✓
- Tag remoto su origin a `135a05d` (Sprint 2 commit) ❌
- Auto-mode classifier ha bloccato sia delete del tag remoto sia force-push

**Azione richiesta utente** (manuale):
```bash
git push origin --force v2.4.8.2-catalog-materials-extension
```

Oppure: lascia il tag remoto come-is e considera il commit `f5bb0a1` come
la vera "v2.4.8.2" (è leggibile dal log e nel rollup tag `v2.4.x-followup-fixes`).

### Tag locale: `v2.4.8.2-catalog-materials-extension` → `f5bb0a1` (remoto: `135a05d` ✗)

---

## Quality gates aggregati

| Metric | Pre compound | Post compound | Δ |
|---|---|---|---|
| pytest PASS | 1490 | **1675** | +185 |
| pytest FAIL pre-esistenti | 9 | **2** | −7 (pushover chiusi) |
| Total tests | 1499 | **1677** | +178 |

Frontend non toccato (tsc/vitest non eseguiti, fuori scope compound).

**FAIL residui**: 2 pre-esistenti fuori scope:
- `tests/billing/test_estimator_calibration.py::test_estimate_within_tolerance_of_actual[ex_cable_bridge_2d-nonlinear-params6]`
- `tests/services/providers/elevation/test_elevation_integration.py::test_real_usgs_outside_us_raises`

---

## Catalogo FEA Pro post-compound 🏁

### I-sections (EN 10365 / Annex F)
- IPE: **18/18** ✓
- HEA: **24/24** ✓
- HEB: **24/24** ✓
- HEM: **24/24** ✓
- **Totale: 90/90 ≈ 100% EN Annex F**

### Materiali (EN 10025 + EC2 + EN 338)
- Acciai EN 10025-2: **5/5** ✓ (S235, S275, S355, S420, S460)
- Calcestruzzi EC2 Tab. 3.1: **11/14** (C12-C60, mancano C70-C90 alta resistenza)
- Legni EC5: 4 grades (gap noto #15, brief futuro `v2.4.x-timber-coverage`)
- Altri: rebar B450C, aluminum 6061-T6, cable Y1860, carbon UD

### Coverage normativa
- EC3 §5.5 section class: 186 test parametrici, copertura 100% catalogo I-section
- GDPR Art. 17 cascade: complete (v2.4.6)
- Pushover collapse detection: completo (v2.4.7.1)

---

## Modifiche UI extra-scope (Policy C)

Nessuna. Il compound era backend-only (catalog data + facade module + test).

---

## STOP rules monitoring

| STOP rule | Esito |
|---|---|
| Sprint 1 fix > 5 righe | 2 righe — sotto soglia ✓ |
| Sprint 2 > 10 profili classificati male in modo grave | 0 / 90 — tutti corretti ✓ |
| Sprint 2 > 15 dati EN non univoci | 0 — dati EN 10365 + Arcelor riproducibili ✓ |
| Sprint 3 schema materials no de-rating spessori | scoperto ma fuori scope (TODO documentato in catalogo: per t > 16 mm bisognerebbe ridurre fy, schema attuale memorizza solo `fy` base — segnalato per brief futuro) |

---

## File toccati (compound completo)

### Nuovi (~7 file)
- `backend/materials/__init__.py` (~115 righe — facade catalogo)
- `backend/tests/materials/__init__.py`
- `backend/tests/materials/test_catalog_extension.py` (~140 righe — 30 test)
- `docs/v2_4_8_1_catalog_expansion_investigation.md`
- `docs/v2_4_x_followup_fixes_report.md` (questo)

### Modificati (~4 file)
- `backend/core/solver/pushover_solver.py` (+2 righe Sprint 1)
- `backend/schemas/material.py` (+~80 righe IPE/HEA/HEB/HEM + 5 calcestruzzi)
- `backend/tests/verification/_ec3_section_class_expected.py` (+~140 righe nuovi profili)
- `backend/tests/verification/test_ec3_section_classification.py` (+2 test funzioni HEM)
- `BACKLOG.md` (3 entry: pushover chiuso, #14 esteso, materials esteso)

---

## Brief candidati post-compound

| Brief | Scope | Stima |
|---|---|---|
| `v2.4.8.3-timber-coverage` | espandere catalogo legni EN 338 da 4 a 20+ grades | ~half day |
| `v2.4.9-ec2-extensions` | EC2 punching/crack/deflection (#16) | ~2-3 giorni |
| `v2.4.10-materials-derating-thickness` | fy de-rating per t > 16 mm (EN 10025) | ~1 giorno |
| (UX) | filone redesign Claude Design quando handoff bundle pronti | TBD |

---

## Cluster completi post compound v2.4.x-followup-fixes

| Cluster | Stato | Sprint chiusura finale |
|---|---|---|
| Cluster Shell | ✅ 100% | v2.4.5 |
| Cluster Debt (GDPR + tracking) | ✅ 100% | v2.4.6 |
| Cluster Pushover (solver tangent) | ✅ 100% | v2.4.7.1 |
| Cluster Coverage (EC3 sections) | ✅ 100% | v2.4.8.1 |
| Cluster Materials (steel + concrete) | ✅ 100% (timber resta #15) | v2.4.8.2 |

**Backend FEA Pro: production-ready per filone UX.**
