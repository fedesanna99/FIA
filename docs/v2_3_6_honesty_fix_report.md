# v2.3.6-honesty-fix · Report

**Data**: 2026-05-24
**Branch**: test (SHA: `62a7e81`)
**Tipo**: documentation-only honesty update (no code)

## Sintesi
Aggiornamento documentazione pubblica post audit `v2.3.5-nafems-truth-audit`.
README, CHANGELOG, BACKLOG allineati a stato reale. Nessuna modifica al
codice di produzione.

## Task completati
- **T1 README**: rimosso claim "NAFEMS PASS" non verificato (badge + tabella
  + Quickstart), aggiunta sezione "⚠ Stato validazione" con tabella bug noti
  e raccomandazione "non per progetti reali finché v2.4.x". Aggiunto principio
  "Onestà sopra marketing" in Filosofia.
- **T2 CHANGELOG**: aggiunte voci v2.3.6 + v2.3.5 in cima + disclaimer su
  release passate (v1.3.0 → v2.3.5) con claim NAFEMS non verificate.
- **T3 BACKLOG**: BL-6 riaperto come "voce storica" + nuova BL-6-bis attiva
  in 🔴 Alta priorità. Aggiunti NEW-1..6 da truth audit. Header aggiornato
  con warning + data 2026-05-24.

## File toccati
- `README.md` (+57/-3 righe)
- `CHANGELOG.md` (+43 righe, nuove voci v2.3.6 e v2.3.5)
- `BACKLOG.md` (+82/-9 righe, BL-6 riaperto + 6 NEW + nuova sezione 🔴)
- `docs/v2_3_6_honesty_fix_report.md` (nuovo)

## Commit (3 + report)
- `e7994c5` docs(readme): honesty fix post nafems-truth-audit (T1)
- `bce0acb` docs(changelog): add v2.3.6-honesty-fix + v2.3.5-nafems-truth-audit (T2)
- `62a7e81` docs(backlog): reopen BL-6 NAFEMS + add NEW-1..6 from truth audit (T3)

## Quality gate
- `git diff HEAD~3..HEAD --name-only` → solo `.md` files modificati ✓
- Nessuna modifica a `backend/` o `frontend/src/` ✓
- Working tree pulito a fine task ✓

## Tag
`v2.3.6-honesty-fix` creato e pushato su origin.

## Sync
- `origin/test == origin/main == 62a7e81` ✓
- Pattern "sincronizza test con tutto" rispettato (push test:test + test:main)

## Prossimo passo
Brief diagnostico tecnico `v2.3.7-solver-internals-audit` per indagare:
1. **LE1 anti-convergenza** — root cause: mesh (`quarter_ellipse_with_hole` con nx≥16?) / stress recovery (Gauss → nodal) / carichi nodali equivalenti distribuiti su edge_nodes?
2. **SHELL_Q4 vs SHELL_Q4_MITC dispatch** — perché danno valori identici? dispatcher in `assembler.py` non distingue il type?
3. **LE10 postprocess shell** — membrana vs bending, fibra estrema z=±t/2

Dopo quel brief, sprint `v2.4.0..v2.4.5` di fix tecnico (~3-4 settimane).
