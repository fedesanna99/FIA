# v1.8.3 Micro-affordance · Report

**Data chiusura:** 2026-05-23
**Branch:** `test`
**Tag:** `v1.8.3-microaffordance`
**Live:** https://fea-pro.fly.dev/ (deploy a richiesta)

---

## Scopo

Pass 3 — solo micro-interazioni e affordance visivi sopra
`v1.8.2-pass2`. Nessun cambio di funzionalità: hover stati, hint
keyboard, animazioni d'entrata, color hint informativo.

## Task chiusi

### T1 · Hover lift sulle CTA Studio Pro / Percorsi
- Aggiunto `hover:-translate-y-0.5 hover:shadow-lg transition-all duration-150`
  alle 2 CTA hero della Dashboard.
- Effetto "lift": al passaggio del mouse, la card si solleva leggermente
  (1px) e l'ombra cresce → segnala chiaramente che è cliccabile.
- Disabled state preserva `translate-y-0` (`disabled:hover:translate-y-0`).
- File: `frontend/src/components/shell/Dashboard.tsx`

### T2 · EmptyModelOverlay keyboard hint
- Aggiunta riga sotto le CTA: `oppure premi [Ctrl] + [K] per cercare azioni`
- Stile `<kbd>`: bg-hover, border, font-mono, 9px.
- Visibile solo desktop (`hidden sm:flex`), su mobile poco utile.
- File: `frontend/src/components/viewport/EmptyModelOverlay.tsx`

### T3 · Save status chip animazione d'entrata
- Sostituito comparsa brusca con `animate-slide-down` (definita in
  `tailwind.config.js` keyframes → 220ms slide -8px → 0 con opacity).
- Quando il modello viene salvato, il chip "✔ Salvato HH:MM" entra dolce
  dall'alto invece di sbocciare.
- File: `frontend/src/components/shell/TopBar.tsx`

### T4 · ResultsOverviewCard tonale safety hint
- `Max σ` ora colorato tonale in base al rapporto con soglia statica
  235 MPa (S235 standard):
  - **verde** (`text-ink-success`) — σ < 165 MPa (ratio < 0.7)
  - **giallo** (`text-ink-warn`) — 165 ≤ σ < 235 MPa (ratio 0.7-1.0)
  - **rosso** (`text-ink-coral`) — σ ≥ 235 MPa (ratio ≥ 1.0)
- `title=` tooltip esplicito che chiarisce "solo visivo, non normativo".
- File: `frontend/src/components/shell/ResultsOverviewCard.tsx`

> Disclaimer: il rapporto S235 NON sostituisce la verifica strutturale.
> È solo un hint cromatico a colpo d'occhio per orientare l'ingegnere.

---

## Metriche chiusura

| Voce | Stato |
|---|---|
| TypeScript noEmit | ✔ no errors |
| Vitest | **460 passed** (invariato) |
| Test Files | 57 passed |
| Vincoli scope | rispettati |
| Files modificati | 4 (.tsx) |

## Prossimo

Backlog v1.9 Demo Slice resta candidato principale. In alternativa:
v1.8.4 con focus su a11y (focus rings, aria-labels su icon-buttons,
contrast check WCAG AA).
