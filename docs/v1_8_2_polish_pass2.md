# v1.8.2 Polish Pass 2 · Report

**Data chiusura:** 2026-05-23
**Branch:** `test`
**Tag:** `v1.8.2-pass2`
**Live:** https://fea-pro.fly.dev/

---

## Scopo

Pass 2 di rifiniture sopra `v1.8.1-polish`. Tre micro-miglioramenti
focalizzati sul "dove l'app sembra ancora secca" — statusbar densa,
tooltip con info reali, feedback durante operazioni lunghe. Nessun
backend, nessun viewport 3D, nessun refactor architetturale.

## Task chiusi

### T1 · Footer status bar arricchita
- **Prima:** `[● Pronto]  N: 12 · E: 8 · DoF: 72`
- **Dopo:** `[● Pronto]  N: 12 · E: 8 · DoF: 72 · 3D · SI`
- Aggiunti `2D/3D` + `units` allineati al chip `ViewportHud` per
  coerenza visiva (mockup 08).
- Aggiunto `data-testid="statusbar-counts"` per future E2E.
- File: `frontend/src/components/layout/StatusBar.tsx`

### T2 · TopBar tier badge tooltip ricco
- Sostituito attributo `title=` semplice con `<Tooltip>` JSX che mostra:
  - Tier corrente
  - Crediti usati `X / Y` (used + bonus vs cap)
  - Mini progress bar tonale: accent < 70%, warn 70-90%, coral ≥ 90%
  - Mese corrente
  - Hint upgrade per tier `free`
- File: `frontend/src/components/shell/TopBar.tsx`

### T3 · Skeleton sidebar destra durante solve
- `AnalysisSummaryCard` + `ResultsOverviewCard` mostrano skeleton
  pulse (`animate-pulse` su bg-bg-hover) quando `isRunning === true`
  e `staticResults === null`.
- Evita "card vuota → card piena" jarring: ora "card placeholder
  → card piena" smooth.
- File: `frontend/src/components/shell/AnalysisSummaryCard.tsx`,
  `frontend/src/components/shell/ResultsOverviewCard.tsx`

---

## Metriche chiusura

| Voce | Stato |
|---|---|
| TypeScript noEmit | ✔ no errors |
| Vitest | **460 passed** (invariato) |
| Test Files | 57 passed |
| Vincoli scope | rispettati (no backend, no viewport, no refactor) |
| Files modificati | 4 (.tsx) |
| File doc nuovo | 1 (questo report) |

## Prossimo

Vedi `docs/v1_8_1_polish_report.md` §"Prossimo sprint" — v1.9 Demo Slice
GPS Strutturale è il candidato naturale ma richiede scelte di scope.
