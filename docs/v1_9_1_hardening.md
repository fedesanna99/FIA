# v1.9.1 Hardening · Report

**Data chiusura:** 2026-05-23
**Branch:** `test`
**Tag:** `v1.9.1-hardening`
**Live:** https://fea-pro.fly.dev/

---

## Scopo

Consolidamento del Demo Slice GPS Strutturale (v1.9.0) con:
1. estrazione helper deterministici testabili
2. component test sui 2 nuovi dialog (Wizard + ReportExport)
3. capture screenshot live aggiornati con 3 scene (Home, Wizard step 1, Wizard step 2)

Nessuna feature nuova — solo regression guard. Pre-condizione necessaria
prima di passare a v1.10.0 tech debt closure.

## Task chiusi

### T1 · Estrazione helper deterministici `lib/gpsTrust.ts`
- File nuovo: `frontend/src/lib/gpsTrust.ts` (66 righe).
  - `inferTrustOrigin(id: string): TrustOrigin` — pure function, 4 branches.
  - `toneFromUc(uc: number): CheckTone` — pure function, 3 branches.
  - `GPS_FYD` — costanti soglie (S275 / EC3 / NTC).
  - Tutte esportate + type aliases.
- Refactor:
  - `ModelInfoCard.tsx`: importa `inferTrustOrigin` + `TrustOrigin` (rimosso inline).
  - `ResultsOverviewCard.tsx`: importa `toneFromUc` + `GPS_FYD` + `CheckTone` (rimosso inline, hardcoded 235/261/275 ora referenziano GPS_FYD).
- 17 nuovi vitest in `gpsTrust.test.ts`:
  - 8 test su `inferTrustOrigin` (4 prefix riconosciuti + 3 edge case)
  - 7 test su `toneFromUc` (soglie 0/0.69/0.7/0.99/1.0/>1/negativo)
  - 2 test su `GPS_FYD` (valori + ordinamento ntc<s275)

### T2 · Component test `PercorsiBeamWizard.test.tsx`
- 8 test (mock vi):
  - `open=false` → nulla in DOM
  - step 1 → 3 card visibili (3 testid)
  - click card → step 2 con riepilogo specifico
  - "Cambia percorso" torna a step 1
  - "Avanti" avanza a step 3
  - "Conferma" chiama `onLoadTemplate(templateId)` + `onClose`
  - "Indietro" da step 3 → step 2
  - mapping templateId verificato per 2 percorsi (trave-bi-appoggiata → ex_simple_beam_2d, telaio-portale → ex_portal_frame_2d)

### T3 · Component test `ReportExportDialog.test.tsx`
- 8 test (mock jsPDF):
  - `open=false` → nulla in DOM
  - render con 5 sezioni + counter `4 attive`
  - toggle sezioni aggiorna counter (4→3→4)
  - download disabled senza staticResults (anche con modello)
  - download disabled senza modello (anche con staticResults)
  - download abilitato con entrambi
  - "Annulla" chiama `onClose`
  - nome file output: `{modello.name}.pdf`

### T4 · Capture screenshot live aggiornato
- `.codex-temp/final-state.spec.ts` esteso da 1 scena a 3:
  - `01-home-empty` (invariato)
  - `02-percorsi-wizard-step1` — click su CTA Percorsi → wizard step 1 aperto
  - `03-percorsi-wizard-step2` — click su card trave-bi-appoggiata → step 2 riepilogo
- 2 viewport: mobile 390×844 + desktop 1440×900 = **6 capture totali**.
- Eseguito contro live `https://fea-pro.fly.dev/`: **6 passed in 27.5s**.
- Output: `.codex-temp/final-{mobile,desktop}-{01,02,03}-*.png` (6 file).

---

## Metriche chiusura

| Voce | Stato |
|---|---|
| TypeScript noEmit | ✔ no errors |
| Vitest | **498 passed** (+33 da v1.9.0) |
| Test Files | 61 passed (+3) |
| Playwright capture | 6 passed (era 2 in v1.8.1 P4) |
| Vincoli scope | rispettati (no backend, no viewport, no refactor) |
| Files nuovi | 4 (gpsTrust.ts + .test.ts + PercorsiBeamWizard.test.tsx + ReportExportDialog.test.tsx) |
| Files modificati | 3 (ModelInfoCard.tsx, ResultsOverviewCard.tsx, final-state.spec.ts) |

## Coverage del Demo Slice (post-v1.9.1)

| Componente | Test | Note |
|---|---|---|
| `PercorsiBeamWizard` | ✔ 8 component test | 3-step navigation + callback |
| `ReportExportDialog` | ✔ 8 component test | Toggle + disabled state |
| `ModelInfoCard` (Trust Layer) | ✔ via `gpsTrust.test.ts` | Helper pure testato |
| `ResultsOverviewCard` (GPS UC) | ✔ via `gpsTrust.test.ts` | Helper pure testato |
| Live capture | ✔ 6 screenshot live | 3 scene × 2 viewport |

## Prossimo

`v1.10.0 — Tech debt closure` (jobsStore reale multi-job + History push wiring auto + bundle split aggressivo) — vedi roadmap §"Roadmap futura".
