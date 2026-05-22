# v1.7-polish pass 2 · Report

**Data chiusura:** 2026-05-23
**Branch:** `test`
**Tag:** `v1.7.2-polish-pass2`
**Live:** https://fea-pro.fly.dev/

---

## Scopo

Continua i debiti tecnici della roadmap §v1.7 iniziati in `v1.7.1-polish-debt`.
Focus su: rimozione dei dynamic import "double" (warning Vite),
introduzione di `notificationsStore` dedicato per le notifiche
persistenti, wire del bell badge al nuovo store.

## Task chiusi

### T1 · `rightRailStore` static-only
- Sostituiti tutti i `void import("...rightRailStore").then(...)` con
  chiamate dirette `useRightRailStore.getState().close()`.
- File toccati: `App.tsx` (2 punti), `CommandPalette.tsx`, `MakePanel.tsx`.
- `MakePanel.tsx`: aggiunto import statico mancante.

### T2 · `notificationsStore` dedicato
- Nuovo store `frontend/src/store/notificationsStore.ts`:
  - `Notification { id, level, title, message?, ts, read }`.
  - API: `push`, `markRead`, `markAllRead`, `dismiss`, `clear`.
  - Cap a 50 items (drop il più vecchio).
  - Helper `notify(level, title, message?)` imperativo.
- `TopBar.tsx`: `unreadCount` ora deriva da `useNotificationsStore`
  (`items.filter(n => !n.read).length`) invece di `useToastStore`
  filtrato per error/warning.
- Bell click → `markAllRead()` + toast informativo placeholder centro
  notifiche.
- `useAnalysis.ts`: wire di `notify("success", ...)` e
  `notify("error", ...)` ai completamenti analisi.
- 8 nuovi test in `notificationsStore.test.ts` (push, notify, ordine,
  markRead, markAllRead, dismiss, cap 50, clear).

### T3 · `toastStore` static-only
- Sostituiti `void import("./toastStore").then(({toast}) => ...)` con
  import statico + chiamata diretta `toast(...)`.
- File toccati: `App.tsx` (2 punti), `LibraryPicker.tsx` (1 punto).
- Risolve il warning Vite "toastStore is dynamically + statically
  imported".

---

## Metriche chiusura

| Voce | Stato |
|---|---|
| TypeScript noEmit | ✔ no errors |
| Vitest | **465 passed** (+8 da notificationsStore.test.ts) |
| Test Files | 58 passed (+1) |
| Build Vite | ✔ 15.98s |
| Warning Vite "dynamic+static" | ✔ risolti tutti |
| Warning Vite chunk-size | ⏳ resta (three.js + main, non scope) |
| File nuovi | 2 (notificationsStore.ts + .test.ts) |
| File modificati | 6 (App.tsx, TopBar.tsx, CommandPalette.tsx, MakePanel.tsx, LibraryPicker.tsx, useAnalysis.ts) |

## Debiti residui v1.7

| Voce | Stato |
|---|---|
| `jobsStore` reale multi-job | ⏳ rinviato (roadmap: serve `>1 job concorrente reale`) |
| History push wiring auto + debounce | ⏳ rinviato (preferenza B + fallback A) |
| Code-split `ValidationPanel` | ⏳ non importato attivamente, skip |

## Behavior change visibile

- **Bell badge in TopBar**: prima contava i toast `error|warning`
  attualmente nello stack (3-6s). Ora conta le notifiche **persistenti
  non lette**. Più stabile: il badge non scompare dopo 5s.
- **Click sul bell**: ora marca tutte come lette (azzera il counter).
- **Analisi completata**: oltre al toast "Analisi statica completata",
  l'utente ora ha anche una notifica persistente "Risultati
  disponibili in Inspect" nel centro notifiche futuro.

## Prossimo

`v1.9 Demo Slice GPS Strutturale` (feature reale) oppure
`v1.7-polish-pass3` per finire i 2 debiti rimasti (jobsStore + History).
