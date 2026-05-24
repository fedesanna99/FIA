# v2.4.x-debt-and-coverage (compound) · Report aggregato

**Data**: 2026-05-24
**Branch**: test (SHA finale: `7b1f02c`)
**Tipo**: compound 3 sprint backend (debt + diagnostic + coverage)
**Tag rollup**: `v2.4.x-debt-and-coverage`

---

## Sintesi

Chiusi 3 sprint backend post cluster-shell. Compound atomico eseguito in
sequenza senza pause utente, secondo policy "1 sola pausa a fine catena
o al primo STOP". Nessun STOP è scattato — tutti e 3 gli sprint chiusi
secondo specifiche del brief.

| # | Sprint | Esito |
|---|---|---|
| 1 | `v2.4.6-debt-22bis-gdpr-cascade` | ✅ #22bis CHIUSO |
| 2 | `v2.4.7-pushover-diagnostic` | ✅ 7 FAIL diagnosticati, brief `v2.4.7.1` raccomandato |
| 3 | `v2.4.8-ec3-section-class-coverage` | ✅ #14 PARZIALMENTE CHIUSO (38 test parametrici) |

**Compound finale**: tag rollup `v2.4.x-debt-and-coverage`.

---

## Sprint 1 · `v2.4.6-debt-22bis-gdpr-cascade` (commit `304cb30`)

### Risultato
- **#22bis CHIUSO**: GDPR Art. 17 cascade complete per i 4 stub
- Modelli per `owner_id`, billing, audit anonymize implementati reali
- Snapshot stub esplicito (feature server-side non implementata, documentato)

### File
- `backend/billing/storage.py` (nuovo, ~50 righe)
- `backend/audit/__init__.py` + `audit/log.py` (nuovi, ~75 righe)
- `backend/schemas/model.py::FEAModel.owner_id` (additivo)
- `backend/scripts/migrate_models_add_owner_id.py` (nuovo)
- `backend/api/routes/models.py` (POST/PUT/import/duplicate)
- `backend/auth/cascade_delete.py` (refactor 4 stub → reali)
- `backend/tests/auth/test_cascade_delete_complete.py` (3 nuovi test)
- `.gitignore` (rifattorizzato per consentire `backend/audit/` package)

### Quality gate Sprint 1
- pytest: 1452 PASS (+3 nuovi), 9 FAIL pre-esistenti invariati
- 4 test GDPR base esistenti: invariati
- Migration 10 modelli applicata, idempotente

### Tag: `v2.4.6-debt-22bis-gdpr-cascade`

---

## Sprint 2 · `v2.4.7-pushover-diagnostic` (commit `1feb5c7`)

### Risultato
- **7 test pushover FAIL diagnosticati** (brief stimava 4 — discrepanza documentata)
- **Una sola root cause comune**: `PushoverSolver.solve()` non cattura `SingularMatrixError` introdotta dal refactor `safe_spsolve` (v2.4.0bis commit `2dc4498`)
- Categoria: **(d) regressione mascherata** — fix banale (~3 righe)
- Zero modifiche al codice produzione (come da brief)

### File
- `docs/pushover_diagnostic.md` (nuovo, diagnostic report completo)
- `BACKLOG.md` (entry `#pushover-7fail` con brief `v2.4.7.1` raccomandato)

### Brief raccomandato
- **`v2.4.7.1-pushover-fixes`**: ~30 minuti, ~3 righe in `pushover_solver.py:165`
- Atteso post-fix: 7 FAIL → 0 FAIL, baseline 1452 → 1459 PASS

### Tag: `v2.4.7-pushover-diagnostic`

---

## Sprint 3 · `v2.4.8-ec3-section-class-coverage` (commit `7b1f02c`)

### Risultato
- **#14 PARZIALMENTE CHIUSO**: coverage sistematica EC3 §5.5 IPE/HEA/HEB
- 38 test parametrici (32 parametrici + 6 sanity) **PASS al primo run**
- Catalogo reale: 8 IPE + 4 HEA + 4 HEB (brief stimava 18+19, discrepanza documentata)
- `classify_section()` validato su tutto il catalogo S235 + S355
- Zero modifiche a codice produzione (`core/verification/ec3/`)

### File
- `backend/tests/verification/_ec3_section_class_expected.py` (nuovo)
- `backend/tests/verification/test_ec3_section_classification.py` (nuovo, 38 test)
- `docs/v2_4_8_ec3_section_class_coverage_report.md` (nuovo)
- `BACKLOG.md` (entry `#14` parzialmente chiuso)

### Quality gate Sprint 3
- pytest: 1490 PASS (+38 nuovi vs 1452 baseline post-Sprint-1), 9 FAIL pre-esistenti invariati

### Tag: `v2.4.8-ec3-section-class-coverage`

---

## Quality gates aggregati (post compound completo)

- **pytest backend**: **1490 PASS** (+41 nuovi: 3 cascade + 38 EC3), **9 FAIL pre-esistenti invariati**
- **FAIL break-down**: 1 estimator (`test_estimate_within_tolerance_of_actual`) + 1 elevation (`test_real_usgs_outside_us_raises`) + 7 pushover (singola root cause → brief `v2.4.7.1`)
- **Frontend**: zero modifiche (`tsc`/`vitest` non eseguiti, fuori scope compound)
- **3 tag intermedi**: `v2.4.6` / `v2.4.7` / `v2.4.8` — tutti su `origin`
- **3 commit principali** + **1 tag rollup**

---

## Modifiche UI extra-scope (Policy C)

Nessuna. Il compound era backend-only.

---

## STOP rules monitoring

Nessuna STOP rule è scattata durante i 3 sprint:

| STOP rule | Risultato monitoraggio |
|---|---|
| Sprint 1: > 10 file `user_id` ignoti | 0 — cascade già mappato in v2.4.2 |
| Sprint 1: > 100 modelli migrati | 10 — sotto soglia |
| Sprint 1→2: regression test GDPR | 4/4 PASS invariati |
| Sprint 2: TUTTI 4 test bug P1 gravi | Unica root cause, fix da 30 min (P1 contenuta) — proseguito |
| Sprint 3: > 5 profili classificati male | 0/16 — tutti expected match |

---

## File toccati (compound completo)

### Nuovi (~10 file)
- `backend/billing/storage.py`
- `backend/audit/__init__.py`
- `backend/audit/log.py`
- `backend/scripts/migrate_models_add_owner_id.py`
- `backend/tests/auth/test_cascade_delete_complete.py`
- `backend/tests/verification/_ec3_section_class_expected.py`
- `backend/tests/verification/test_ec3_section_classification.py`
- `docs/v2_4_6_phase1_investigation.md`
- `docs/v2_4_6_debt_22bis_gdpr_cascade_report.md`
- `docs/pushover_diagnostic.md`
- `docs/v2_4_8_ec3_section_class_coverage_report.md`
- `docs/v2_4_x_debt_and_coverage_report.md` (questo)

### Modificati (~5 file)
- `backend/schemas/model.py` (additivo: `FEAModel.owner_id`)
- `backend/api/routes/models.py` (auth opzionale 4 endpoint)
- `backend/auth/cascade_delete.py` (refactor 4 stub)
- `.gitignore` (rifattorizzato pattern `audit/`)
- `BACKLOG.md` (entry `#14`, `#22bis`, `#pushover-7fail`)

---

## Brief candidati post-compound

Pipeline residua identificata durante il compound:

| Brief | Scope | Stima |
|---|---|---|
| `v2.4.7.1-pushover-fixes` | 3 righe in `pushover_solver.py` per riconoscere `SingularMatrixError` | ~30 min |
| `v2.4.8.1-catalog-expansion-ipe-hea` | estensione `_IPE_DATA` / `_HEA_DATA` / `_HEM_DATA` per Annex F completa | ~half day |
| `v2.4.9-ec3-combined-loading` | classificazione `loading="combined"` con α corretto (oggi usa pattern conservativo "compression") | ~1 giorno |

Tutto il resto del backend è stabile. Filone UX redesign Claude Design
può procedere in parallelo quando i handoff bundle saranno pronti.

---

## Cluster shell + cluster debt + cluster coverage · STATO FINALE 🏁

Dopo questo compound, il backend di FEA Pro ha chiusi:

### Cluster Shell (closure 100% precedente, v2.4.3a..v2.4.5)
- NEW-1 LE1 anti-convergenza — v2.4.3c
- NEW-3 MITC pressure dispatch — v2.4.3a
- NEW-4 postprocess no bending — v2.4.3b
- NEW-4-followup-segno Q4 sign — v2.4.4
- NEW-3-followup esteso MITC magnitude+sign — v2.4.5

### Cluster Debt (closure compound v2.4.x)
- **#22bis GDPR cascade delete** — v2.4.6 ✅

### Cluster Diagnostic
- **#pushover-7fail** — v2.4.7 (diagnosticato, brief `v2.4.7.1` pronto)

### Cluster Coverage
- **#14 EC3 section class** — v2.4.8 (parzialmente chiuso)

---

## Successivo

1. **`v2.4.7.1-pushover-fixes`**: brief breve (~30 min) — alza baseline da 1490/9 a 1497/2
2. Filone Claude Design (UX redesign) quando handoff bundle disponibili
3. **`v2.4.8.1-catalog-expansion`** quando serve coverage Annex F completa

Backend in larga parte consolidato. Filone UX redesign ora prioritario.
