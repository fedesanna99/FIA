# v1.8.5 Mobile polish · Report

**Data chiusura:** 2026-05-23
**Branch:** `test`
**Tag:** `v1.8.5-mobile`
**Live:** https://fea-pro.fly.dev/

---

## Scopo

Pass 5 — mobile UX robustness sopra `v1.8.4-a11y`. Recupero del
fallback ROADMAP (saltato durante v1.7-v1.8.4) + 3 fix mobile mirati.
Nessun backend, nessun viewport 3D, nessun refactor architetturale.

## Task chiusi

### R0 · Recupero ROADMAP.md (saltato in v1.7+)
- `ROADMAP.md` aggiornato: "Stato corrente" → `v1.8.4-a11y`.
- "Storia recente" estesa con 5 entries (v1.7.0-ui-coerence,
  v1.8.0-product-alignment, v1.8.1-polish, v1.8.2-pass2, v1.8.3,
  v1.8.4) ciascuna con i task atomici elencati.
- Mantenuta v1.6.1 entry esistente come transizione.

### T1 · safe-area-inset audit
- `index.html` ha già `viewport-fit=cover` (✔).
- `.app-shell` applica `env(safe-area-inset-{top,right,bottom,left})` (✔).
- Utility classes `.safe-area-{bottom,top,x}` già definite (✔).
- `MobileTabbar` usa `safe-area-bottom safe-area-x` (✔).
- **Conclusione**: niente fix necessari, solo documentato in report.

### T2 · Swipe-back gesture su MobilePanel
- `MobilePanel.tsx` riscritto con:
  - `useRef` per memorizzare touchstart (x, y, t).
  - `handleTouchStart` accetta solo gesture entro 40px dal bordo
    sinistro (`EDGE_THRESHOLD`).
  - `handleTouchEnd` verifica `dx ≥ 80 && dy < 60 && elapsed < 600ms`
    → chiama `onBack()` (iOS-style edge-swipe).
- Aggiunto `focus-visible:ring-accent/60` al bottone back per a11y.
- File: `frontend/src/components/shell/MobilePanel.tsx`

### T3 · `overscroll-behavior: contain` + `touch-action: manipulation`
- `body` ora ha:
  - `overscroll-behavior: contain` → impedisce rubber-band scrolling
    iOS che fa "rimbalzare" l'intera app quando si raggiunge top/bottom.
    Critico per stabilità mobile panel slide-in.
  - `touch-action: manipulation` → disabilita double-tap-to-zoom Safari,
    elimina il ritardo 300ms sui click rapidi (LeftRail, MobileTabbar,
    hub-card).
- File: `frontend/src/index.css`

---

## Metriche chiusura

| Voce | Stato |
|---|---|
| TypeScript noEmit | ✔ no errors |
| Vitest | **460 passed** (invariato) |
| Test Files | 57 passed |
| Vincoli scope | rispettati |
| Files modificati | 3 (2 .tsx/.css + 1 .md) |
| Roadmap | recuperato (was: v1.6.1 → now: v1.8.4) |

## Mobile UX checklist v1.8.x

| Voce | Stato |
|---|---|
| viewport-fit=cover | ✔ pre-esistente |
| .app-shell safe-area-inset 4-side | ✔ pre-esistente |
| MobileTabbar safe-area-bottom | ✔ pre-esistente |
| Mobile panel full-width | ✔ (hotfix v1.8) |
| Tab bar 5 voci con aria-current | ✔ (v1.8.4 T2) |
| Edge-swipe per chiudere panel | ✔ (v1.8.5 T2) |
| Rubber-band scrolling bloccato | ✔ (v1.8.5 T3) |
| Double-tap zoom disabled | ✔ (v1.8.5 T3) |
| Empty state CTA mobile-friendly | ✔ (v1.8.3 T2) |

## Prossimo candidato

- **v1.7 polish & perf debiti** (da roadmap §):
  - `notificationsStore` dedicato (sostituisce `useToastStore` count)
  - `jobsStore` reale multi-job (oggi è solo `analysisStore.isRunning`)
  - Code-splitting Validation/Settings/AICopilot (bundle 1.1MB → target 250kB gzip)
  - History push wiring auto su modelStore subscribe + debounce
  - Cleanup legacy `ExportMenu.tsx`, `Breadcrumb.tsx`
- **v1.9 Demo Slice GPS Strutturale** (feature reale)
