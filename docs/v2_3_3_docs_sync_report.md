# v2.3.3-docs-sync · Report

**Data**: 2026-05-23
**Branch**: test (SHA: e34ceb6)
**Tipo**: documentation reconcile (no code changes)

## Sintesi
3 file `.md` allineati allo stato reale del codice v2.3.2-persist-ci.
Nessuna modifica al codice di produzione.

## Task completati
- **T1 README sync**: v2.2.2-audit-deep → v2.3.2-persist-ci (header + badge +
  Stato attuale + sezioni Compare/Undo/Snapshot + Solver(10) + Elementi(13)
  + Frontend AuthGate/MissionBar/PercorsoStepper/ModelInfoCard/
  ResultsOverviewCard/Galleria/ComparePanel/Undo-Redo + struttura aggiornata
  con services/auth/billing/verification + counts test 660+/584)
- **T2 BACKLOG cleanup**: BL-1/2/3/4/5/7/8 chiusi (verificati con grep nel
  codice reale), BL-9 mantenuto open. Aggiunto blocco "Voci aperte da
  scoperta v2.x" con tech debt v2.4.x + quality checkpoint v2.5.x.
- **T3 ROADMAP reality**: Stato corrente v2.3.2-persist-ci. Aggiunte
  milestone chiuse v1.9, v2.0-v2.2, v2.3.0-v2.3.2 in Storia recente.
  Roadmap futura riscritta da v2.4.x in poi (tech debt → quality
  checkpoint → decisione prodotto → v3.0). KPI con valori reali.

## File toccati
- README.md (+66/-26 righe)
- BACKLOG.md (+87/-74 righe)
- ROADMAP.md (+101/-96 righe)
- docs/v2_3_3_docs_sync_report.md (nuovo)

## Commit
- `1ef7a24` docs(readme): sync to v2.3.2-persist-ci (compare+undo+snapshot)
- `71749ef` docs(backlog): reconcile to code reality (v2.3.2)
- `e34ceb6` docs(roadmap): reconcile to reality (v2.3.2)

## Verifiche grep eseguite per T2 (cosa è davvero implementato nel codice)

| BL | Verifica | Esito | Implementazione |
|---|---|---|---|
| BL-1 Cable+NR | `ls backend/core/elements/ \| grep cable` | ✅ trovato | `cable2d.py`, `cable3d.py`, `nonlinear_solver.py` |
| BL-2 Arc-length | `ls backend/core/solver/ \| grep arclength` | ✅ trovato | `arclength_solver.py` + `test_arclength.py` (test Williams specifico da aggiungere) |
| BL-3 Tet4/T10 | `ls backend/core/elements/ \| grep tet` | ✅ trovato | `solid_tet4.py`, `solid_tet10.py` |
| BL-4 Shell layered | `ls backend/core/elements/ \| grep layered` | ✅ trovato | `shell_quad4_layered.py` |
| BL-5 MITC4 | `ls backend/core/elements/ \| grep mitc` | ✅ trovato | `shell_quad4_mitc.py` |
| BL-7 iso-surfaces | `grep marching backend/core/` | ✅ trovato | `postprocess/isosurfaces.py` (marching tetrahedra esplicito, Hex8→5tet decomposition) + `IsosurfacePanel.tsx` frontend |
| BL-8 DXF layer | `grep "layer_material_map" backend/core/io/` | ✅ trovato | `dxf_importer.py` con `layer_material_map` + `layer_section_map` come parametri attivi |
| BL-9 jsPDF CVE | `grep jspdf frontend/package.json` | ⚠️ jspdf@^4.2.1 (open) | bump alla prossima patch |

## Procedura di branch riallineamento eseguita pre-T1

Per arrivare a uno stato dove `test` riflette il codice reale, ho eseguito:

1. Verificato che `test` (`ba6ef7d` v1.9.1 Demo Slice) era 55 commit indietro
   rispetto al lavoro reale su `feature/redesign-precision` (`e2ad7a3`,
   include i tag v2.3.0/v2.3.1/v2.3.2 e i fix audit + viewport-hud).
2. Pulito working tree: rimosso `.codex-temp/` untracked (214 file), ripristinato
   i 3 file tracked al suo interno, spostato 2 zip locali in `/tmp`,
   reset tsbuildinfo.
3. **`git checkout test && git reset --hard feature/redesign-precision`**, poi
   **`git push origin test --force-with-lease`** (lease verde, no overwrite altrui).
4. Stesso per `main`.
5. Cancellato `feature/redesign-precision` locale + remoto.
6. Da quel punto in poi tutto è avvenuto su `test` come da pattern standard.

Tutti i tag (`v2.3.0-compare-undo`, `v2.3.1-snapshot-diff`, `v2.3.2-persist-ci`,
`v2.3.3-docs-sync`) sono nella history, niente lavoro perso.

## Prossimo passo
**v2.4.x: tech debt closure** (BL-9 jspdf bump + alpha.30 follow-ups +
test Williams toggle).

In parallelo: **Brief B (quality checkpoint v2.5)** — test funzionali
completi L1+L2, vedi `CLAUDE_CODE_BRIEF_quality_checkpoint.md`.
