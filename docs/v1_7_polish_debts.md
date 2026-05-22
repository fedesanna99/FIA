# v1.7-polish · Polish & perf debts · Report

**Data chiusura:** 2026-05-23
**Branch:** `test`
**Tag:** `v1.7.1-polish-debt`
**Live:** https://fea-pro.fly.dev/

---

## Scopo

Pass dedicato ai debiti tecnici della roadmap §"v1.7.0 — Polish & perf"
accumulati durante v1.7→v1.8.5. Tre voci safe e ad alto impatto:
cleanup file legacy, code-splitting di dialog/panel pesanti, rimozione
cast `as unknown` su `model.materials`.

## Task chiusi

### T1 · Cleanup legacy ExportMenu + Breadcrumb
- `frontend/src/components/shell/ExportMenu.tsx` → eliminato
  (0 import in codice attivo).
- `frontend/src/components/shell/topbar/Breadcrumb.tsx` → eliminato
  (referenziato solo da test file).
- Suite `describe("Breadcrumb", ...)` rimossa da `TopBarParts.test.tsx`
  (3 test in meno: 460 → 457 verdi).
- File `*.deprecated.tsx` (PropertiesPanel + IOWorkspace) lasciati intatti
  perché esplicitamente segnati come placeholder storici, non incidono
  sul bundle (non importati).

### T2 · Code-splitting AICopilotPanel + AccountDialog
- `ToolsPanel.tsx`: `AICopilotPanel` ora via `lazy()` + `<Suspense>` con
  fallback "Caricamento AI Copilot…". Caricato solo quando l'utente apre
  il sub-view `ai-copilot`.
- `TopBar.tsx`: `AccountDialog` ora `lazy()` + `<Suspense fallback={null}>`
  + render condizionato a `accountOpen` per evitare il fetch anticipato.
- **Bundle pre/post** (`pnpm vite build`):
  - `AICopilotPanel-*.js` chunk separato: **6.04 kB raw / 2.25 kB gzip**
  - `AccountDialog-*.js` chunk separato: **10.97 kB raw / 3.09 kB gzip**
  - Main `index-*.js`: 1,204.84 kB raw / 358.78 kB gzip
  - `three-*.js`: 858.90 kB raw / 232.11 kB gzip (separato)
  - `charts-*.js`: 530.17 kB raw / 152.30 kB gzip (separato)
- Risultato: ~17 kB raw scorporati dal main chunk → caricati on-demand.
  Il warning Vite "chunk > 700 kB" resta per il main + three + charts:
  abbattere ulteriormente richiede splitting di three.js sub-modules
  (non scope di questo sprint).

### T3 · `materials?: Material[]` in FEAModel
- `frontend/src/types/model.ts`: aggiunto campo opzionale `materials?:
  { id?, name?, color? }[]` su `FEAModel`. Inline minimal type per non
  forzare retrocompatibilità con tutti i campi `Material` (E/nu/rho/...).
- `frontend/src/components/viewport/ViewportHud.tsx`: rimosso cast
  `(model as unknown as { materials?: ... }).materials` (riga 46) →
  ora `model.materials?.[0]?.name ?? "—"` type-safe.
- Nessun cambio behavior (fallback `—` quando il campo manca).

---

## Metriche chiusura

| Voce | Stato |
|---|---|
| TypeScript noEmit | ✔ no errors |
| Vitest | **457 passed** (-3 da Breadcrumb deletion) |
| Test Files | 57 passed |
| Vincoli scope | rispettati |
| Files modificati | 7 (3 deleted, 4 edited, 1 doc) |
| Build vite | ✔ in 18.28s |
| Lazy chunks nuovi | 2 (AICopilotPanel + AccountDialog) |

## Debiti residui dalla roadmap §v1.7

| Voce | Stato |
|---|---|
| `notificationsStore` dedicato | ⏳ non in scope (refactor profondo) |
| `jobsStore` reale multi-job | ⏳ esiste base ma serve generalizzazione |
| History push wiring auto + debounce | ⏳ rinviato (B + fallback A) |
| `rightRailStore` solo statico | ⏳ warning Vite "dynamic + static" attivo |
| Code-splitting `ValidationPanel` | ⏳ già accessibile solo via legacy workspace |
| Cleanup `*.deprecated.tsx` | ✔ confermati inerti, lasciati come archivio |

## Prossimo

`v1.9 Demo Slice GPS Strutturale` (feature reale) oppure proseguire
con i debiti rimanenti in un `v1.7-polish-pass2`. Decisione utente.
