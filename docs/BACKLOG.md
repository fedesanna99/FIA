# BACKLOG · post v3.3.0

> Bug residui dai 4 audit (L3.1, L3.2, L3.3, L4-L5-L6) scoperti il 2026-05-28.
> ~117 deferred a v3.4+. Ordinati per ROI.

---

## 🔴 P0 deferred (1)

### L4-P0-2 · `_dead_dofs` M-aware
**File**: `backend/core/solver/assembler.py:362`
**Bug**: senza considerare M, DOF con massa concentrata su nodi connessi solo a beam2D (fuori-piano) vengono bloccati, eliminando modi inerziali fisici reali.
**Fix tentato in v3.3.0** → revert: rompeva SDOF cantilever modal test (modes[0] period spurio invece di quello strutturale).
**Fix corretto**: gating per element type + nuova logic filtering modi spuri + test suite regression per ogni element type. Stima: 3-4h.

---

## 🟡 P1 critici (~40)

### Three.js / Viewport
- **L3.3-P0-1 residuo** `ElementRenderer.tsx` (file massivo ~466 righe) dispose Three.js. Refactor 1h+ separato.
- **L3.3-P0-1 residuo** `EngineElementRenderer.tsx`, `NodeRenderer.tsx`, `LoadRenderer.tsx`, `BCRenderer.tsx` applicare dispose hook.
- **L3.3-P1-9** Three.js `linewidth` ignorato (deformate sottili 1px su tutti i browser). Switch a drei `<Line>` o `MeshLine`.
- **L3.3-P1-10** `document.body.style.cursor` mutation leak (cursore "pointer" persiste).
- **L3.3-P1-11** `DynamicAnimation` needsUpdate ogni frame anche in pausa (GPU 100%).
- **L3.3-P1-8** Canvas remount distruttivo su cambio theme (rimuovere theme dal key).

### Shell / State
- **L3.1-P0-2** `ShellPanel.Tabs.Content` mancante (tab decorativi cliccano ma non cambiano). Refactor ~3h.
- **L3.1-P0-3** `currentLeftTab` shared tra 3 panel → split in 4 campi (Make/Solve/Verify/Inspect). ~2h.
- **L3.1-P1-3** InspectPanel "Apri Verifiche live" cambia tab statica invece di workspace verifiche (cross-store).
- **L3.1-P1-6** Legend stress 0/44.6/89.1/133/178 MPa HARDCODED → derivare da `staticResults.max_stress`.
- **L3.1-P1-7** ViewportHudSelection bind a `useSelectionStore`.
- **L3.1-P1-8** ViewportHudZoom 6 bottoni decorativi → bind a `viewportCameraStore`.
- **L3.1-P1-9** Trust badge popover non renderizzato (toggle aria-expanded ma no dropdown).
- **L3.1-P1-10** StatusBar `wsConnected=true` + `syncStatus="OK"` hardcoded.

### Dialogs / Wizards
- **L3.2-P1-1** Mutation senza onError → errore FastAPI grezzo/invisibile (5 dialog).
- **L3.2-P1-3** PercorsiBeamWizard race close mid-flow + riapri → doppio run analisi.
- **L3.2-P1-4** MeshWizard `beam3d` su modello 2D → 422 senza feedback preventivo.
- **L3.2-P1-5** ImportWizard MIME/size validation + JSON.parse blocca main thread.
- **L3.2-P1-8** SismicaTHWizard preview costo "0 crediti" (billing inganno) → buildSolveParams reali.
- **L3.2-P1-9** PercorsiBeamWizard "salva e esci" mid-flow assente.

### Backend FEM
- **L4-P0-3** BucklingSolver no validation statica preliminare → 500 generico (deve essere 422 italiano).
- **L4-P0-5** `_make_progress_cb` loop closed con client disconnesso (WS leak).
- **L4-P1-1** GlobalAssembler `build_load_vector` O(N×M) → O(N+M) con dict cache.
- **L4-P1-2** ModalSolver eigsh fallback dense OOM su modelli grandi (limit 5000 DOF).
- **L4-P1-3** DynamicSolver `node_history` cap (5k nodi × 10k step = 2.4GB).
- **L4-P1-4** `safe_spsolve` post-iter magnitude check sempre.
- **L4-P1-5** JobWorker retry counter incrementa in `dequeue` invece di validare contro max_retries.
- **L4-P1-6** JobStore SELECT-FOR-UPDATE transactional contro race cancel.
- **L4-P1-7** `seed_examples` race multi-worker (Fly single-machine attuale OK).
- **L4-P1-9** `export_pdf`/`export_xlsx` ri-esegue solver senza quota check (bypass).
- **L4-P1-11** `gmsh_session` patch `signal.signal` non thread-safe.

### Infrastructure
- **L6-P0-1** ErrorBoundary non catcha async errors (30% surface coverage) → react-error-boundary.
- **L6-P1-1** axios interceptor `localStorage.getItem` ogni request → cache module-level.
- **L6-P1-2** Toaster dedup level+message exact-match (perde dedup parametrizzati).
- **L6-P1-3** Toaster STACK_LIMIT preserve error level prioritariamente.
- **L6-P1-4** `vite.config.ts` proxy 8765 → 8000 (dev fix banale).
- **L6-P1-5** `index.html` PWA service-worker.js mancante (manifest dichiarato).
- **L6-P1-7** Fly cold-start 10-22s con `min_machines_running=0` + self_ping fragile.
- **L6-P1-9** `_make_progress_cb` sync handler edge case.

### Integrations
- **L5-P0-1** Provider live tests senza skip flag (flaky CI USGS).
- **L5-P1-1** Cache `default=str` perde tipo Pydantic.
- **L5-P1-3** Orchestrator NotImplementedError chain provider.
- **L5-P1-4** seismic_loads baseline 4.5 noted ma frontend non parse.

---

## 🟢 P2 (52)

### UI polish
- L3.1-P2-1..P2-8 (focus trap, currentLeftTab default, Tab attrs)
- L3.2-P2-1..P2-13 (focus trap Dialog custom, validation pre-submit, edge cases)
- L3.3-P2-1..P2-17 (camera tracker race, range slider units, ColorLegend min, font hardcoded)

### Backend
- L4-P2-1..P2-14 (SeismicTH deepcopy, validazione carichi tipo elemento, J torsionale strip thin, ecc.)
- L5-P1-5/6 (self_ping health, NominatimProvider env runtime)

### Infrastructure
- L6-P2-1..P2-8 (Dockerfile healthcheck, CORS, theme-color, Toaster z-index, ecc.)

---

## 🔵 P3 (27)

Polish minor: type cast `any`, hardcoded labels, plurali, accenti, cleanup dead code, doc comments. Vedi audit detail per dettaglio per-file.

---

## 📋 Sprint suggeriti

### Sprint v3.4 · Three.js + Shell (~8h)
- ElementRenderer + Engine* dispose refactor
- ShellPanel.Tabs.Content fix
- currentLeftTab split 4 campi
- HUD floating wire stores (Legend/Selection/Zoom)
- Trust badge popover

### Sprint v3.5 · Backend FEM hardening (~8h)
- _dead_dofs M-aware con gating + test regression
- GlobalAssembler dict cache O(N+M)
- ModalSolver dense fallback limit + warning
- BucklingSolver static validation 422
- JobStore transactional + worker retry fix
- safe_spsolve check sempre

### Sprint v3.6 · Wizards + Dialogs robustness (~6h)
- Migrate 5 dialog a zod+react-hook-form
- Radix focus trap Dialog
- SismicaTH preview costo reale
- PercorsiBeam wizard state persistence
- ImportWizard MIME/size + abort

### Sprint v3.7 · Infrastructure + PWA (~5h)
- ErrorBoundary async aware
- Toaster dedup title-only + priority
- Vite proxy fix + PWA service worker
- axios token cache module-level
- Fly self_ping health monitoring

### Sprint v3.8 · Commerciale (~3-5gg)
- Stripe billing live
- Test alpha Paolo
- WCAG 2.1 AA audit completo
- Catalogo tubolari custom
- Pushover/Seismic UI wiring

---

**Total backlog stima**: ~30-40h sviluppo per chiudere TUTTO il backlog (esclusi commerciali Stripe + WCAG full).
