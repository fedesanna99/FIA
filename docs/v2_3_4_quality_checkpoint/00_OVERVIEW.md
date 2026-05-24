# v2.3.4 Quality Checkpoint · Overview

**Data**: 2026-05-24
**Versione testata**: v2.3.2-persist-ci (SHA `19f960b` post v2.3.3-docs-sync)
**Branch**: test
**Scope**: L1 crawler dead clicks + L2 functional flow per area
**Approach**: zero modifiche a `src/` o `backend/`, tutto in `frontend/e2e/` + `docs/`.

## Composizione

```
docs/v2_3_4_quality_checkpoint/
├── 00_OVERVIEW.md                    # questo file
├── L1_dead_clicks_report.md          # report crawler
├── L2_functional_flows_report.md     # report flow
├── consolidated_bug_list.md          # output finale ordinato per severity
└── screenshots/                      # cartella (popolata da test-results/ on demand)

frontend/e2e/quality-checkpoint/
├── L1_dead_clicks/
│   ├── crawler.spec.ts               # 4 schermate, 84 click esaminati
│   ├── exclusions.ts
│   └── fixtures/
│       ├── home_empty_results.json
│       ├── beam_loaded_results.json
│       ├── portal_loaded_results.json
│       └── truss3d_loaded_results.json
├── L2_functional_flows/
│   ├── flow_dashboard.spec.ts        # T2
│   ├── flow_make.spec.ts             # T3
│   ├── flow_solve.spec.ts            # T4
│   ├── flow_verify.spec.ts           # T5
│   ├── flow_inspect.spec.ts          # T6
│   ├── flow_wizard_import.spec.ts    # T7
│   ├── flow_command_palette.spec.ts  # T8
│   ├── flow_compare_undo.spec.ts     # T9
│   ├── flow_percorsi_beam.spec.ts    # T10
│   ├── flow_mobile.spec.ts           # T11
│   └── edge_cases.spec.ts            # T12
└── shared/
    ├── helpers.ts                    # auth via API, seed localStorage
    └── selectors.ts                  # data-testid canonici
```

## Risultati high-level

| Layer | Test | PASS | FAIL/finding |
|---|---:|---:|---:|
| L1 crawler (4 schermate) | 84 click | 76 alive | 4 dead (1 unico) |
| L2 functional flows | 25 test | 13 | 12 |
| **TOTALE** | 109 | 89 | 20 |

Gate utente "max 30 dead clicks da L1" → **PASS** (4 < 30). ✓

## Esecuzione locale

```bash
# 1. Backend (uvicorn, no persist su disco)
cd backend
FEA_NO_PERSIST=1 python -m uvicorn main:app --port 8765 --host 127.0.0.1

# 2. Frontend dev (in altro terminale)
cd frontend
npm run dev -- --port 5173 --host 127.0.0.1

# 3. Run quality checkpoint
cd frontend
./node_modules/.bin/playwright test e2e/quality-checkpoint/ --reporter=list
```

Tempo totale ~5 minuti.

## File di reference

- [L1 dead clicks report](L1_dead_clicks_report.md)
- [L2 functional flows report](L2_functional_flows_report.md)
- [Consolidated bug list (output)](consolidated_bug_list.md)
