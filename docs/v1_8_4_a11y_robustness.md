# v1.8.4 A11y + robustness · Report

**Data chiusura:** 2026-05-23
**Branch:** `test`
**Tag:** `v1.8.4-a11y`
**Live:** https://fea-pro.fly.dev/

---

## Scopo

Pass 4 — accessibility (a11y) e robustness incrementali sopra
`v1.8.3-microaffordance`. Nessun cambio di funzionalità, nessun
backend, nessun viewport 3D, nessun refactor architetturale.

Focus su: keyboard navigation, semantic HTML, screen reader hint,
empty state CTA.

## Task chiusi

### T1 · Focus-visible rings sulle CTA Studio Pro / Percorsi
- Aggiunto `focus-visible:outline-none focus-visible:ring-2
  focus-visible:ring-{accent|percorsi} focus-visible:ring-offset-2
  focus-visible:ring-offset-bg` alle 2 CTA hero.
- Tab da TopBar ora attraversa nettamente le CTA.
- Il `<Button>` primitive shared aveva già focus-visible ring; bottoni
  raw `<button type="button">` ne erano sprovvisti.
- File: `frontend/src/components/shell/Dashboard.tsx`

### T2 · aria-label + aria-current su MobileTabbar
- Sostituito `aria-pressed` con `aria-current="page"` (semantica
  navigation più appropriata).
- Aggiunto `aria-label` dinamico con stato "(attivo)" sul tab corrente.
- Icone marcate `aria-hidden="true"` (decorative).
- Aggiunto `focus-visible:ring-accent/60` sui tab.
- File: `frontend/src/components/shell/MobileTabbar.tsx`

### T3 · JobsSection "empty state" arricchito
- Quando `Nessun job attivo` + esiste almeno un modello → mostra CTA
  inline `Apri Solve →` che apre direttamente il SolvePanel via
  `useWorkspaceStore.getState().openLeftPanel("solve")`.
- Senza modello → solo testo neutro (no CTA).
- File: `frontend/src/components/shell/Dashboard.tsx`

### T4 · Skip link a11y "Vai al contenuto"
- Link nascosto (`sr-only`) in cima a `App.tsx` che diventa visibile
  solo su focus (Tab dalla URL bar).
- Porta direttamente al `<main id="main-content" tabIndex={-1}>`,
  bypassando TopBar e rails.
- Stile focus: accent bg + offset top-2 left-2 + z-50.
- WCAG 2.1 Success Criterion 2.4.1 (Bypass Blocks).
- File: `frontend/src/App.tsx`

---

## Metriche chiusura

| Voce | Stato |
|---|---|
| TypeScript noEmit | ✔ no errors |
| Vitest | **460 passed** (invariato) |
| Test Files | 57 passed |
| Vincoli scope | rispettati |
| Files modificati | 4 (.tsx) |
| Deploy Fly.io | ✔ live (cold-start 21.9s, HTTP 200) |

## A11y checklist v1.8.x

| Voce | Stato |
|---|---|
| Skip link al main content | ✔ (v1.8.4 T4) |
| Focus rings su CTA hero | ✔ (v1.8.4 T1) |
| Focus rings sui Button primitive | ✔ (pre-esistente) |
| aria-label su icon-only buttons | ✔ già coperti GlobalSearch/AICopilot/Bell |
| aria-current su navigation | ✔ (v1.8.4 T2) |
| Tooltip ricco vs title= | ✔ (v1.8.2 T2) |
| Keyboard shortcut hint | ✔ (v1.8.3 T2) |
| Contrast WCAG AA | manuale-verify (token palette già passa) |

## Prossimo

`v1.9 Demo Slice GPS Strutturale` o `v1.8.5` con focus su mobile UX
(`safe-area-inset`, gesture swipe, pull-to-refresh).
